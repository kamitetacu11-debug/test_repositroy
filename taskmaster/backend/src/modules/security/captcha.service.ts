import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { getClientIp } from './rate-limit.service.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type CaptchaProvider = 'recaptcha' | 'hcaptcha' | 'turnstile' | 'disabled';

export interface CaptchaConfig {
  provider: CaptchaProvider;
  siteKey: string;
  secretKey: string;
  scoreThreshold: number;        // Minimum score to pass (0-1 for reCAPTCHA v3)
  tokenHeaderName: string;       // Header name for CAPTCHA token
  requireForPaths: string[];     // Paths that always require CAPTCHA
  excludePaths: string[];        // Paths that never require CAPTCHA
}

export interface CaptchaVerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  challengeTimestamp?: string;
  hostname?: string;
  errorCodes?: string[];
}

export interface CaptchaChallenge {
  required: boolean;
  provider: CaptchaProvider;
  siteKey: string;
  reason?: string;
}

// ============================================================================
// Provider URLs
// ============================================================================

const VERIFY_URLS: Record<CaptchaProvider, string> = {
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
  hcaptcha: 'https://hcaptcha.com/siteverify',
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  disabled: '',
};

// ============================================================================
// Redis Keys
// ============================================================================

const REDIS_KEYS = {
  // CAPTCHA requirement by IP
  captchaRequired: (ip: string) => `captcha:required:${ip}`,

  // Global CAPTCHA mode
  globalCaptchaMode: 'captcha:global:enabled',

  // CAPTCHA verification cache
  verificationCache: (token: string) => `captcha:verified:${token.substring(0, 32)}`,

  // Failed CAPTCHA attempts
  failedAttempts: (ip: string) => `captcha:failed:${ip}`,

  // Stats
  statsVerified: 'captcha:stats:verified',
  statsFailed: 'captcha:stats:failed',
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CaptchaConfig = {
  provider: 'disabled',
  siteKey: '',
  secretKey: '',
  scoreThreshold: 0.5,
  tokenHeaderName: 'x-captcha-token',
  requireForPaths: ['/api/v1/auth/login', '/api/v1/auth/register'],
  excludePaths: ['/health', '/docs'],
};

// ============================================================================
// CAPTCHA Service
// ============================================================================

export class CaptchaService {
  private config: CaptchaConfig;

  constructor(config: Partial<CaptchaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if CAPTCHA is required for an IP
   */
  async isRequired(ip: string): Promise<CaptchaChallenge> {
    if (this.config.provider === 'disabled') {
      return { required: false, provider: 'disabled', siteKey: '' };
    }

    try {
      // Check global CAPTCHA mode
      const globalMode = await redis.exists(REDIS_KEYS.globalCaptchaMode);
      if (globalMode === 1) {
        return {
          required: true,
          provider: this.config.provider,
          siteKey: this.config.siteKey,
          reason: 'GLOBAL_CAPTCHA_MODE',
        };
      }

      // Check IP-specific requirement
      const ipRequired = await redis.get(REDIS_KEYS.captchaRequired(ip));
      if (ipRequired) {
        return {
          required: true,
          provider: this.config.provider,
          siteKey: this.config.siteKey,
          reason: ipRequired,
        };
      }

      return { required: false, provider: this.config.provider, siteKey: this.config.siteKey };
    } catch (error) {
      logger.error({ error, ip }, 'Failed to check CAPTCHA requirement');
      return { required: false, provider: this.config.provider, siteKey: this.config.siteKey };
    }
  }

  /**
   * Require CAPTCHA for an IP
   */
  async requireForIp(ip: string, reason: string, durationSeconds = 3600): Promise<void> {
    if (this.config.provider === 'disabled') return;

    try {
      await redis.setex(REDIS_KEYS.captchaRequired(ip), durationSeconds, reason);
      logger.info({ event: 'CAPTCHA_REQUIRED', ip, reason, duration: durationSeconds });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to require CAPTCHA');
    }
  }

  /**
   * Remove CAPTCHA requirement for an IP
   */
  async clearRequirement(ip: string): Promise<void> {
    try {
      await redis.del(REDIS_KEYS.captchaRequired(ip));
      await redis.del(REDIS_KEYS.failedAttempts(ip));
    } catch (error) {
      logger.error({ error, ip }, 'Failed to clear CAPTCHA requirement');
    }
  }

  /**
   * Enable global CAPTCHA mode
   */
  async enableGlobalMode(durationSeconds = 1800): Promise<void> {
    if (this.config.provider === 'disabled') return;

    try {
      await redis.setex(REDIS_KEYS.globalCaptchaMode, durationSeconds, '1');
      logger.warn({ event: 'GLOBAL_CAPTCHA_ENABLED', duration: durationSeconds });
    } catch (error) {
      logger.error({ error }, 'Failed to enable global CAPTCHA mode');
    }
  }

  /**
   * Disable global CAPTCHA mode
   */
  async disableGlobalMode(): Promise<void> {
    try {
      await redis.del(REDIS_KEYS.globalCaptchaMode);
      logger.info({ event: 'GLOBAL_CAPTCHA_DISABLED' });
    } catch (error) {
      logger.error({ error }, 'Failed to disable global CAPTCHA mode');
    }
  }

  /**
   * Verify CAPTCHA token
   */
  async verify(token: string, ip: string): Promise<CaptchaVerifyResult> {
    if (this.config.provider === 'disabled') {
      return { success: true };
    }

    if (!token) {
      return { success: false, errorCodes: ['MISSING_TOKEN'] };
    }

    // Check verification cache
    const cached = await this.getCachedVerification(token);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await this.callVerifyApi(token, ip);

      // Cache successful verifications briefly
      if (result.success) {
        await this.cacheVerification(token, result);
        await redis.incr(REDIS_KEYS.statsVerified);
      } else {
        await this.recordFailedAttempt(ip);
        await redis.incr(REDIS_KEYS.statsFailed);
      }

      logger.info({
        event: result.success ? 'CAPTCHA_VERIFIED' : 'CAPTCHA_FAILED',
        ip,
        score: result.score,
        provider: this.config.provider,
      });

      return result;
    } catch (error) {
      logger.error({ error, ip }, 'CAPTCHA verification failed');
      // Fail open in case of API errors
      return { success: true, errorCodes: ['VERIFICATION_ERROR'] };
    }
  }

  /**
   * Get CAPTCHA configuration for client
   */
  getClientConfig(): { provider: CaptchaProvider; siteKey: string } {
    return {
      provider: this.config.provider,
      siteKey: this.config.siteKey,
    };
  }

  /**
   * Get verification statistics
   */
  async getStats(): Promise<{ verified: number; failed: number }> {
    try {
      const [verified, failed] = await Promise.all([
        redis.get(REDIS_KEYS.statsVerified),
        redis.get(REDIS_KEYS.statsFailed),
      ]);

      return {
        verified: parseInt(verified || '0', 10),
        failed: parseInt(failed || '0', 10),
      };
    } catch {
      return { verified: 0, failed: 0 };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async callVerifyApi(token: string, ip: string): Promise<CaptchaVerifyResult> {
    const url = VERIFY_URLS[this.config.provider];
    if (!url) {
      return { success: false, errorCodes: ['INVALID_PROVIDER'] };
    }

    const body = new URLSearchParams({
      secret: this.config.secretKey,
      response: token,
      remoteip: ip,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return { success: false, errorCodes: ['API_ERROR'] };
    }

    const data = await response.json();

    // Handle different provider response formats
    switch (this.config.provider) {
      case 'recaptcha':
        return this.parseRecaptchaResponse(data);
      case 'hcaptcha':
        return this.parseHcaptchaResponse(data);
      case 'turnstile':
        return this.parseTurnstileResponse(data);
      default:
        return { success: false, errorCodes: ['UNKNOWN_PROVIDER'] };
    }
  }

  private parseRecaptchaResponse(data: any): CaptchaVerifyResult {
    const success = data.success && (data.score === undefined || data.score >= this.config.scoreThreshold);

    return {
      success,
      score: data.score,
      action: data.action,
      challengeTimestamp: data.challenge_ts,
      hostname: data.hostname,
      errorCodes: data['error-codes'],
    };
  }

  private parseHcaptchaResponse(data: any): CaptchaVerifyResult {
    return {
      success: data.success,
      challengeTimestamp: data.challenge_ts,
      hostname: data.hostname,
      errorCodes: data['error-codes'],
    };
  }

  private parseTurnstileResponse(data: any): CaptchaVerifyResult {
    return {
      success: data.success,
      challengeTimestamp: data.challenge_ts,
      hostname: data.hostname,
      errorCodes: data['error-codes'],
    };
  }

  private async getCachedVerification(token: string): Promise<CaptchaVerifyResult | null> {
    try {
      const cached = await redis.get(REDIS_KEYS.verificationCache(token));
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private async cacheVerification(token: string, result: CaptchaVerifyResult): Promise<void> {
    try {
      // Cache for 5 minutes
      await redis.setex(
        REDIS_KEYS.verificationCache(token),
        300,
        JSON.stringify(result)
      );
    } catch (error) {
      logger.error({ error }, 'Failed to cache CAPTCHA verification');
    }
  }

  private async recordFailedAttempt(ip: string): Promise<void> {
    try {
      const key = REDIS_KEYS.failedAttempts(ip);
      const attempts = await redis.incr(key);
      await redis.expire(key, 3600);

      // After 3 failed attempts, require CAPTCHA for longer
      if (attempts >= 3) {
        await this.requireForIp(ip, 'MULTIPLE_FAILED_CAPTCHA', 7200); // 2 hours
      }
    } catch (error) {
      logger.error({ error, ip }, 'Failed to record failed CAPTCHA attempt');
    }
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

export function createCaptchaMiddleware(service: CaptchaService, config: Partial<CaptchaConfig> = {}) {
  const opts = { ...DEFAULT_CONFIG, ...config };

  return async function captchaMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    const ip = getClientIp(request);
    const path = request.url.split('?')[0];

    // Skip excluded paths
    if (opts.excludePaths.some((p) => path.startsWith(p))) {
      return done();
    }

    // Check if CAPTCHA is required for this IP
    const challenge = await service.isRequired(ip);

    // Also check if path always requires CAPTCHA
    const pathRequiresCaptcha = opts.requireForPaths.some((p) => path.startsWith(p));

    if (!challenge.required && !pathRequiresCaptcha) {
      return done();
    }

    // Get token from request
    const token = request.headers[opts.tokenHeaderName] as string;

    if (!token) {
      return reply.status(428).send({
        success: false,
        error: {
          code: 'CAPTCHA_REQUIRED',
          message: 'CAPTCHA verification required',
          captcha: {
            provider: challenge.provider,
            siteKey: challenge.siteKey,
          },
        },
      });
    }

    // Verify token
    const result = await service.verify(token, ip);

    if (!result.success) {
      logger.warn({
        event: 'CAPTCHA_VERIFICATION_FAILED',
        ip,
        path,
        errors: result.errorCodes,
      });

      return reply.status(403).send({
        success: false,
        error: {
          code: 'CAPTCHA_FAILED',
          message: 'CAPTCHA verification failed',
          errors: result.errorCodes,
          captcha: {
            provider: challenge.provider,
            siteKey: challenge.siteKey,
          },
        },
      });
    }

    return done();
  };
}

// ============================================================================
// Express-style Middleware for specific routes
// ============================================================================

export function requireCaptcha(service: CaptchaService) {
  return async function(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    if (service['config'].provider === 'disabled') {
      return done();
    }

    const ip = getClientIp(request);
    const token = request.headers[service['config'].tokenHeaderName] as string;

    if (!token) {
      const clientConfig = service.getClientConfig();
      return reply.status(428).send({
        success: false,
        error: {
          code: 'CAPTCHA_REQUIRED',
          message: 'CAPTCHA verification required',
          captcha: clientConfig,
        },
      });
    }

    const result = await service.verify(token, ip);

    if (!result.success) {
      const clientConfig = service.getClientConfig();
      return reply.status(403).send({
        success: false,
        error: {
          code: 'CAPTCHA_FAILED',
          message: 'CAPTCHA verification failed',
          captcha: clientConfig,
        },
      });
    }

    return done();
  };
}

// Export singleton instance with default config
export const captchaService = new CaptchaService();

// Export factory for custom config
export function createCaptchaService(config: Partial<CaptchaConfig>): CaptchaService {
  return new CaptchaService(config);
}
