import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface BruteForceConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutDurations: number[]; // Progressive lockout in seconds
  notifyOnLockout: boolean;
}

export interface LoginAttemptResult {
  allowed: boolean;
  attemptsRemaining: number;
  lockoutUntil?: Date;
  requiresCaptcha: boolean;
  lockoutLevel: number;
}

export interface AccountStatus {
  isLocked: boolean;
  lockoutUntil?: Date;
  failedAttempts: number;
  lastAttempt?: Date;
  lockoutLevel: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: BruteForceConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutDurations: [
    30,           // 30 seconds after 5 attempts
    60,           // 1 minute after 10 attempts
    2 * 60,       // 2 minutes after 15 attempts
    5 * 60,       // 5 minutes after 20 attempts
    10 * 60,      // 10 minutes after 25+ attempts
  ],
  notifyOnLockout: true,
};

// ============================================================================
// Redis Key Helpers
// ============================================================================

const REDIS_KEYS = {
  // Per-IP tracking
  ipAttempts: (ip: string) => `bruteforce:ip:${ip}:attempts`,
  ipBlocked: (ip: string) => `bruteforce:ip:${ip}:blocked`,
  ipLockoutLevel: (ip: string) => `bruteforce:ip:${ip}:level`,

  // Per-account tracking (hashed for privacy)
  accountAttempts: (emailHash: string) => `bruteforce:account:${emailHash}:attempts`,
  accountBlocked: (emailHash: string) => `bruteforce:account:${emailHash}:blocked`,
  accountLockoutLevel: (emailHash: string) => `bruteforce:account:${emailHash}:level`,

  // Global tracking
  globalFailedLogins: 'bruteforce:global:failed',
  globalCaptchaMode: 'bruteforce:global:captcha-mode',

  // Device fingerprint tracking
  deviceAttempts: (fingerprint: string) => `bruteforce:device:${fingerprint}:attempts`,
  deviceBlocked: (fingerprint: string) => `bruteforce:device:${fingerprint}:blocked`,

  // CAPTCHA requirement
  requiresCaptcha: (identifier: string) => `bruteforce:captcha:${identifier}`,
};

// ============================================================================
// Brute Force Protection Service
// ============================================================================

export class BruteForceProtectionService {
  private config: BruteForceConfig;

  constructor(config: Partial<BruteForceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Hash email for privacy-preserving storage
   */
  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  /**
   * Check if a login attempt should be allowed
   */
  async checkLoginAttempt(
    ip: string,
    email: string,
    deviceFingerprint?: string
  ): Promise<LoginAttemptResult> {
    const emailHash = this.hashEmail(email);

    try {
      // Check all blocking conditions in parallel
      const [ipBlocked, accountBlocked, deviceBlocked] = await Promise.all([
        this.isIpBlocked(ip),
        this.isAccountBlocked(emailHash),
        deviceFingerprint ? this.isDeviceBlocked(deviceFingerprint) : Promise.resolve(false),
      ]);

      // If any is blocked, return blocked result
      if (ipBlocked.blocked || accountBlocked.blocked || deviceBlocked) {
        const lockoutUntil = ipBlocked.blocked
          ? ipBlocked.until
          : accountBlocked.blocked
          ? accountBlocked.until
          : undefined;

        return {
          allowed: false,
          attemptsRemaining: 0,
          lockoutUntil,
          requiresCaptcha: true,
          lockoutLevel: Math.max(
            await this.getLockoutLevel(REDIS_KEYS.ipLockoutLevel(ip)),
            await this.getLockoutLevel(REDIS_KEYS.accountLockoutLevel(emailHash))
          ),
        };
      }

      // Get current attempt counts
      const [ipAttempts, accountAttempts] = await Promise.all([
        this.getAttemptCount(REDIS_KEYS.ipAttempts(ip)),
        this.getAttemptCount(REDIS_KEYS.accountAttempts(emailHash)),
      ]);

      const maxAttempts = Math.max(ipAttempts, accountAttempts);
      const attemptsRemaining = Math.max(0, this.config.maxAttempts - maxAttempts);

      // Check if CAPTCHA is required
      const requiresCaptcha = await this.isCaptchaRequired(ip, emailHash);

      return {
        allowed: true,
        attemptsRemaining,
        requiresCaptcha,
        lockoutLevel: 0,
      };
    } catch (error) {
      logger.error({ error, ip, emailHash }, 'Brute force check failed');
      // Fail open but require CAPTCHA for safety
      return {
        allowed: true,
        attemptsRemaining: this.config.maxAttempts,
        requiresCaptcha: true,
        lockoutLevel: 0,
      };
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(
    ip: string,
    email: string,
    deviceFingerprint?: string
  ): Promise<void> {
    const emailHash = this.hashEmail(email);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const pipeline = redis.pipeline();

      // Record IP attempt
      const ipKey = REDIS_KEYS.ipAttempts(ip);
      pipeline.zadd(ipKey, now, `${now}:${Math.random()}`);
      pipeline.zremrangebyscore(ipKey, 0, windowStart);
      pipeline.expire(ipKey, Math.ceil(this.config.windowMs / 1000) + 1);

      // Record account attempt
      const accountKey = REDIS_KEYS.accountAttempts(emailHash);
      pipeline.zadd(accountKey, now, `${now}:${Math.random()}`);
      pipeline.zremrangebyscore(accountKey, 0, windowStart);
      pipeline.expire(accountKey, Math.ceil(this.config.windowMs / 1000) + 1);

      // Record device attempt if fingerprint provided
      if (deviceFingerprint) {
        const deviceKey = REDIS_KEYS.deviceAttempts(deviceFingerprint);
        pipeline.zadd(deviceKey, now, `${now}:${Math.random()}`);
        pipeline.zremrangebyscore(deviceKey, 0, windowStart);
        pipeline.expire(deviceKey, Math.ceil(this.config.windowMs / 1000) + 1);
      }

      // Increment global counter
      pipeline.incr(REDIS_KEYS.globalFailedLogins);
      pipeline.expire(REDIS_KEYS.globalFailedLogins, 60); // Reset every minute

      await pipeline.exec();

      // Check if lockout should be applied
      await this.checkAndApplyLockout(ip, emailHash, deviceFingerprint);

      // Check global anomaly
      await this.checkGlobalAnomaly();

      logger.info({
        event: 'FAILED_LOGIN_RECORDED',
        ip,
        emailHash,
        deviceFingerprint: deviceFingerprint?.substring(0, 8),
      });
    } catch (error) {
      logger.error({ error, ip, emailHash }, 'Failed to record login attempt');
    }
  }

  /**
   * Record a successful login
   */
  async recordSuccessfulLogin(
    ip: string,
    email: string,
    deviceFingerprint?: string
  ): Promise<void> {
    const emailHash = this.hashEmail(email);

    try {
      const pipeline = redis.pipeline();

      // Clear IP attempts
      pipeline.del(REDIS_KEYS.ipAttempts(ip));
      pipeline.del(REDIS_KEYS.ipBlocked(ip));
      pipeline.del(REDIS_KEYS.ipLockoutLevel(ip));

      // Clear account attempts
      pipeline.del(REDIS_KEYS.accountAttempts(emailHash));
      pipeline.del(REDIS_KEYS.accountBlocked(emailHash));
      pipeline.del(REDIS_KEYS.accountLockoutLevel(emailHash));

      // Clear device attempts if fingerprint provided
      if (deviceFingerprint) {
        pipeline.del(REDIS_KEYS.deviceAttempts(deviceFingerprint));
        pipeline.del(REDIS_KEYS.deviceBlocked(deviceFingerprint));
      }

      // Clear CAPTCHA requirement
      pipeline.del(REDIS_KEYS.requiresCaptcha(ip));
      pipeline.del(REDIS_KEYS.requiresCaptcha(emailHash));

      await pipeline.exec();

      logger.info({
        event: 'SUCCESSFUL_LOGIN_RECORDED',
        ip,
        emailHash,
      });
    } catch (error) {
      logger.error({ error, ip, emailHash }, 'Failed to record successful login');
    }
  }

  /**
   * Get account status
   */
  async getAccountStatus(email: string): Promise<AccountStatus> {
    const emailHash = this.hashEmail(email);

    try {
      const [blocked, attempts, level] = await Promise.all([
        this.isAccountBlocked(emailHash),
        this.getAttemptCount(REDIS_KEYS.accountAttempts(emailHash)),
        this.getLockoutLevel(REDIS_KEYS.accountLockoutLevel(emailHash)),
      ]);

      return {
        isLocked: blocked.blocked,
        lockoutUntil: blocked.until,
        failedAttempts: attempts,
        lockoutLevel: level,
      };
    } catch (error) {
      logger.error({ error, emailHash }, 'Failed to get account status');
      return {
        isLocked: false,
        failedAttempts: 0,
        lockoutLevel: 0,
      };
    }
  }

  /**
   * Manually unlock an account
   */
  async unlockAccount(email: string): Promise<void> {
    const emailHash = this.hashEmail(email);

    try {
      const pipeline = redis.pipeline();
      pipeline.del(REDIS_KEYS.accountAttempts(emailHash));
      pipeline.del(REDIS_KEYS.accountBlocked(emailHash));
      pipeline.del(REDIS_KEYS.accountLockoutLevel(emailHash));
      pipeline.del(REDIS_KEYS.requiresCaptcha(emailHash));
      await pipeline.exec();

      logger.info({ event: 'ACCOUNT_UNLOCKED', emailHash });
    } catch (error) {
      logger.error({ error, emailHash }, 'Failed to unlock account');
    }
  }

  /**
   * Manually unlock an IP
   */
  async unlockIp(ip: string): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      pipeline.del(REDIS_KEYS.ipAttempts(ip));
      pipeline.del(REDIS_KEYS.ipBlocked(ip));
      pipeline.del(REDIS_KEYS.ipLockoutLevel(ip));
      pipeline.del(REDIS_KEYS.requiresCaptcha(ip));
      await pipeline.exec();

      logger.info({ event: 'IP_UNLOCKED', ip });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to unlock IP');
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async isIpBlocked(ip: string): Promise<{ blocked: boolean; until?: Date }> {
    const blocked = await redis.get(REDIS_KEYS.ipBlocked(ip));
    if (!blocked) return { blocked: false };

    const ttl = await redis.ttl(REDIS_KEYS.ipBlocked(ip));
    return {
      blocked: true,
      until: new Date(Date.now() + ttl * 1000),
    };
  }

  private async isAccountBlocked(emailHash: string): Promise<{ blocked: boolean; until?: Date }> {
    const blocked = await redis.get(REDIS_KEYS.accountBlocked(emailHash));
    if (!blocked) return { blocked: false };

    const ttl = await redis.ttl(REDIS_KEYS.accountBlocked(emailHash));
    return {
      blocked: true,
      until: new Date(Date.now() + ttl * 1000),
    };
  }

  private async isDeviceBlocked(fingerprint: string): Promise<boolean> {
    return (await redis.exists(REDIS_KEYS.deviceBlocked(fingerprint))) === 1;
  }

  private async getAttemptCount(key: string): Promise<number> {
    const windowStart = Date.now() - this.config.windowMs;
    await redis.zremrangebyscore(key, 0, windowStart);
    return await redis.zcard(key);
  }

  private async getLockoutLevel(key: string): Promise<number> {
    const level = await redis.get(key);
    return level ? parseInt(level, 10) : 0;
  }

  private async isCaptchaRequired(ip: string, emailHash: string): Promise<boolean> {
    const [ipRequired, accountRequired, globalMode] = await Promise.all([
      redis.exists(REDIS_KEYS.requiresCaptcha(ip)),
      redis.exists(REDIS_KEYS.requiresCaptcha(emailHash)),
      redis.exists(REDIS_KEYS.globalCaptchaMode),
    ]);

    return ipRequired === 1 || accountRequired === 1 || globalMode === 1;
  }

  private async checkAndApplyLockout(
    ip: string,
    emailHash: string,
    deviceFingerprint?: string
  ): Promise<void> {
    const [ipAttempts, accountAttempts] = await Promise.all([
      this.getAttemptCount(REDIS_KEYS.ipAttempts(ip)),
      this.getAttemptCount(REDIS_KEYS.accountAttempts(emailHash)),
    ]);

    // Check IP lockout
    if (ipAttempts >= this.config.maxAttempts) {
      await this.applyLockout(ip, 'ip', ipAttempts);
    }

    // Check account lockout
    if (accountAttempts >= this.config.maxAttempts) {
      await this.applyLockout(emailHash, 'account', accountAttempts);
    }

    // Check device lockout
    if (deviceFingerprint) {
      const deviceAttempts = await this.getAttemptCount(
        REDIS_KEYS.deviceAttempts(deviceFingerprint)
      );
      if (deviceAttempts >= this.config.maxAttempts * 2) {
        await this.applyDeviceBlock(deviceFingerprint);
      }
    }

    // Require CAPTCHA after 3 attempts
    if (ipAttempts >= 3 || accountAttempts >= 3) {
      await Promise.all([
        redis.setex(REDIS_KEYS.requiresCaptcha(ip), 3600, '1'),
        redis.setex(REDIS_KEYS.requiresCaptcha(emailHash), 3600, '1'),
      ]);
    }
  }

  private async applyLockout(
    identifier: string,
    type: 'ip' | 'account',
    attempts: number
  ): Promise<void> {
    const levelKey = type === 'ip'
      ? REDIS_KEYS.ipLockoutLevel(identifier)
      : REDIS_KEYS.accountLockoutLevel(identifier);

    const blockedKey = type === 'ip'
      ? REDIS_KEYS.ipBlocked(identifier)
      : REDIS_KEYS.accountBlocked(identifier);

    // Get current level
    let level = await this.getLockoutLevel(levelKey);

    // Calculate lockout level based on attempts
    const newLevel = Math.min(
      Math.floor(attempts / this.config.maxAttempts) - 1,
      this.config.lockoutDurations.length - 1
    );

    if (newLevel > level) {
      level = newLevel;
      await redis.set(levelKey, level.toString());
    }

    const lockoutDuration = this.config.lockoutDurations[level];
    await redis.setex(blockedKey, lockoutDuration, 'locked');

    logger.warn({
      event: 'LOCKOUT_APPLIED',
      type,
      identifier: type === 'ip' ? identifier : identifier.substring(0, 8),
      level,
      duration: lockoutDuration,
      attempts,
    });
  }

  private async applyDeviceBlock(fingerprint: string): Promise<void> {
    await redis.setex(
      REDIS_KEYS.deviceBlocked(fingerprint),
      24 * 60 * 60, // 24 hours
      'blocked'
    );

    logger.warn({
      event: 'DEVICE_BLOCKED',
      fingerprint: fingerprint.substring(0, 8),
    });
  }

  private async checkGlobalAnomaly(): Promise<void> {
    const count = await redis.get(REDIS_KEYS.globalFailedLogins);
    const failedCount = count ? parseInt(count, 10) : 0;

    // If more than 100 failed logins in a minute, enable global CAPTCHA
    if (failedCount > 100) {
      await redis.setex(REDIS_KEYS.globalCaptchaMode, 300, '1'); // 5 minutes

      logger.warn({
        event: 'GLOBAL_CAPTCHA_MODE_ENABLED',
        failedCount,
      });
    }
  }
}

// Export singleton instance
export const bruteForceService = new BruteForceProtectionService();
