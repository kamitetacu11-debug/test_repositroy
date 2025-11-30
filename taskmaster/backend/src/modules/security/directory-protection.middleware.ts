import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { getClientIp } from './rate-limit.service.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface DirectoryProtectionConfig {
  enabled: boolean;
  suspiciousThreshold: number;      // Score threshold for suspicious activity
  blockThreshold: number;           // Score threshold for blocking
  captchaThreshold: number;         // Score threshold for requiring CAPTCHA
  decayIntervalMs: number;          // How often score decays
  decayAmount: number;              // How much score decays
  blockDurationSeconds: number;     // How long to block suspicious IPs
  responseDelayMs: number;          // Base delay for 404 responses
  maxResponseDelayMs: number;       // Maximum delay for suspicious requests
  logAllAttempts: boolean;          // Log all 404s (for analysis)
}

export interface ThreatScore {
  score: number;
  attempts: number;
  suspiciousPatterns: number;
  lastSeen: number;
  blocked: boolean;
}

// ============================================================================
// Suspicious Patterns
// ============================================================================

/**
 * Patterns commonly used in directory fuzzing/enumeration attacks
 */
const SUSPICIOUS_PATTERNS = {
  // Admin panels and dashboards
  adminPanels: [
    /^\/(admin|administrator|wp-admin|cpanel|phpmyadmin|adminer|manager)/i,
    /^\/(dashboard|control|panel|backend|backoffice)/i,
    /^\/(cms|console|portal|webmaster)/i,
  ],

  // Configuration files
  configFiles: [
    /\.(env|config|ini|yml|yaml|toml|conf|cfg)$/i,
    /^\/(config|configuration|settings)\//i,
    /\/(application|database|app)\.(yml|yaml|json|xml)$/i,
    /\/\.(htaccess|htpasswd|npmrc|gitconfig)/i,
  ],

  // Backup and temporary files
  backupFiles: [
    /\.(bak|backup|old|orig|save|swp|tmp|temp)$/i,
    /\.(sql|sqlite|db|mdb|accdb)$/i,
    /~$/,
    /\.copy$/i,
    /\.(tar|gz|zip|rar|7z)$/i,
  ],

  // Version control
  versionControl: [
    /^\/(\.git|\.svn|\.hg|\.bzr|CVS)\//i,
    /^\/(\.gitignore|\.gitattributes|\.gitmodules)/i,
    /\/HEAD$/i,
    /\/config$/i,
  ],

  // Package managers and dependencies
  packageManagers: [
    /^\/(vendor|node_modules|bower_components|packages)\//i,
    /^\/(composer|package|yarn)\.(json|lock)$/i,
    /^\/Gemfile(\.lock)?$/i,
    /^\/requirements\.txt$/i,
  ],

  // Source code and build artifacts
  sourceCode: [
    /\.(php|asp|aspx|jsp|cgi|pl)$/i,
    /^\/(src|source|sources|app|application)\//i,
    /^\/(build|dist|out|target)\//i,
    /\/\.?(webpack|babel|eslint|prettier)/i,
  ],

  // Logs and debug
  logsAndDebug: [
    /\.(log|logs)$/i,
    /^\/(log|logs|debug|trace|error)\//i,
    /\/access[_-]?log/i,
    /\/error[_-]?log/i,
  ],

  // Sensitive paths
  sensitivePaths: [
    /^\/(private|secret|hidden|internal)\//i,
    /^\/(api-?keys?|credentials|secrets)\//i,
    /^\/(uploads?|files?|media|assets)\/\.\./i,
    /\/\.aws\//i,
    /\/\.ssh\//i,
  ],

  // Common exploit paths
  exploitPaths: [
    /\/\.(bash|zsh|fish)_history/i,
    /\/etc\/passwd/i,
    /\/proc\/self/i,
    /\/windows\/system32/i,
    /\.pem$/i,
    /\.key$/i,
  ],

  // WordPress specific
  wordpress: [
    /^\/wp-content\/debug\.log/i,
    /^\/wp-config\.php/i,
    /^\/xmlrpc\.php/i,
    /^\/wp-includes\/version\.php/i,
  ],

  // Path traversal attempts
  pathTraversal: [
    /\.\.\//,
    /\.\.%2[fF]/,
    /%2e%2e%2f/i,
    /%252e%252e%252f/i,
    /\.\.%5[cC]/,
  ],

  // Encoded suspicious characters
  encodedAttacks: [
    /%00/,              // Null byte
    /%0[aAdD]/,         // CRLF
    /%3[cC].*%3[eE]/,   // Encoded < >
    /%27|%22/,          // Encoded quotes
  ],
};

/**
 * Score weights for different pattern types
 */
const PATTERN_WEIGHTS: Record<keyof typeof SUSPICIOUS_PATTERNS, number> = {
  adminPanels: 3,
  configFiles: 5,
  backupFiles: 4,
  versionControl: 5,
  packageManagers: 3,
  sourceCode: 2,
  logsAndDebug: 3,
  sensitivePaths: 5,
  exploitPaths: 10,
  wordpress: 2,
  pathTraversal: 10,
  encodedAttacks: 8,
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: DirectoryProtectionConfig = {
  enabled: true,
  suspiciousThreshold: 10,
  blockThreshold: 50,
  captchaThreshold: 25,
  decayIntervalMs: 60 * 1000,     // 1 minute
  decayAmount: 5,
  blockDurationSeconds: 3600,     // 1 hour
  responseDelayMs: 50,            // 50ms base delay
  maxResponseDelayMs: 5000,       // 5s max delay
  logAllAttempts: false,
};

// ============================================================================
// Redis Keys
// ============================================================================

const REDIS_KEYS = {
  threatScore: (ip: string) => `dirprotect:score:${ip}`,
  blocked: (ip: string) => `dirprotect:blocked:${ip}`,
  attempts: (ip: string) => `dirprotect:attempts:${ip}`,
  captchaRequired: (ip: string) => `dirprotect:captcha:${ip}`,
  globalStats: 'dirprotect:stats:global',
};

// ============================================================================
// Directory Protection Service
// ============================================================================

export class DirectoryProtectionService {
  private config: DirectoryProtectionConfig;

  constructor(config: Partial<DirectoryProtectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a URL path for suspicious patterns
   */
  analyzeUrl(url: string): { suspicious: boolean; score: number; matchedPatterns: string[] } {
    const matchedPatterns: string[] = [];
    let totalScore = 0;

    // Decode URL for analysis
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch {
      // If decoding fails, it might be an attack attempt
      return { suspicious: true, score: 10, matchedPatterns: ['DECODE_ERROR'] };
    }

    // Check each pattern category
    for (const [category, patterns] of Object.entries(SUSPICIOUS_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url) || pattern.test(decodedUrl)) {
          matchedPatterns.push(category);
          totalScore += PATTERN_WEIGHTS[category as keyof typeof SUSPICIOUS_PATTERNS];
          break; // Only count each category once
        }
      }
    }

    return {
      suspicious: matchedPatterns.length > 0,
      score: totalScore,
      matchedPatterns,
    };
  }

  /**
   * Get current threat score for an IP
   */
  async getThreatScore(ip: string): Promise<ThreatScore> {
    try {
      const [scoreStr, blocked, attemptsStr] = await Promise.all([
        redis.get(REDIS_KEYS.threatScore(ip)),
        redis.exists(REDIS_KEYS.blocked(ip)),
        redis.get(REDIS_KEYS.attempts(ip)),
      ]);

      return {
        score: scoreStr ? parseInt(scoreStr, 10) : 0,
        attempts: attemptsStr ? parseInt(attemptsStr, 10) : 0,
        suspiciousPatterns: 0,
        lastSeen: Date.now(),
        blocked: blocked === 1,
      };
    } catch (error) {
      logger.error({ error, ip }, 'Failed to get threat score');
      return { score: 0, attempts: 0, suspiciousPatterns: 0, lastSeen: Date.now(), blocked: false };
    }
  }

  /**
   * Update threat score for an IP
   */
  async updateThreatScore(
    ip: string,
    scoreIncrement: number,
    matchedPatterns: string[]
  ): Promise<ThreatScore> {
    try {
      const pipeline = redis.pipeline();

      // Increment score
      pipeline.incrby(REDIS_KEYS.threatScore(ip), scoreIncrement);
      pipeline.expire(REDIS_KEYS.threatScore(ip), 3600); // 1 hour TTL

      // Increment attempts
      pipeline.incr(REDIS_KEYS.attempts(ip));
      pipeline.expire(REDIS_KEYS.attempts(ip), 3600);

      // Update global stats
      pipeline.hincrby(REDIS_KEYS.globalStats, 'total_suspicious', 1);
      pipeline.hincrby(REDIS_KEYS.globalStats, 'total_score', scoreIncrement);

      const results = await pipeline.exec();
      const newScore = results?.[0]?.[1] as number || 0;
      const attempts = results?.[2]?.[1] as number || 0;

      // Check if should be blocked
      if (newScore >= this.config.blockThreshold) {
        await this.blockIp(ip, 'THREAT_SCORE_EXCEEDED');
      } else if (newScore >= this.config.captchaThreshold) {
        await this.requireCaptcha(ip);
      }

      logger.warn({
        event: 'THREAT_SCORE_UPDATED',
        ip,
        scoreIncrement,
        newScore,
        attempts,
        matchedPatterns,
      });

      return {
        score: newScore,
        attempts,
        suspiciousPatterns: matchedPatterns.length,
        lastSeen: Date.now(),
        blocked: newScore >= this.config.blockThreshold,
      };
    } catch (error) {
      logger.error({ error, ip }, 'Failed to update threat score');
      return { score: 0, attempts: 0, suspiciousPatterns: 0, lastSeen: Date.now(), blocked: false };
    }
  }

  /**
   * Block an IP address
   */
  async blockIp(ip: string, reason: string): Promise<void> {
    try {
      await redis.setex(
        REDIS_KEYS.blocked(ip),
        this.config.blockDurationSeconds,
        reason
      );

      logger.warn({
        event: 'IP_BLOCKED_DIRECTORY_FUZZING',
        ip,
        reason,
        duration: this.config.blockDurationSeconds,
      });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to block IP');
    }
  }

  /**
   * Check if IP is blocked
   */
  async isBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; ttl?: number }> {
    try {
      const [reason, ttl] = await Promise.all([
        redis.get(REDIS_KEYS.blocked(ip)),
        redis.ttl(REDIS_KEYS.blocked(ip)),
      ]);

      return {
        blocked: !!reason,
        reason: reason || undefined,
        ttl: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      logger.error({ error, ip }, 'Failed to check block status');
      return { blocked: false };
    }
  }

  /**
   * Unblock an IP address
   */
  async unblockIp(ip: string): Promise<void> {
    try {
      await Promise.all([
        redis.del(REDIS_KEYS.blocked(ip)),
        redis.del(REDIS_KEYS.threatScore(ip)),
        redis.del(REDIS_KEYS.attempts(ip)),
        redis.del(REDIS_KEYS.captchaRequired(ip)),
      ]);

      logger.info({ event: 'IP_UNBLOCKED', ip });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to unblock IP');
    }
  }

  /**
   * Require CAPTCHA for an IP
   */
  async requireCaptcha(ip: string): Promise<void> {
    try {
      await redis.setex(REDIS_KEYS.captchaRequired(ip), 1800, '1'); // 30 minutes
    } catch (error) {
      logger.error({ error, ip }, 'Failed to require CAPTCHA');
    }
  }

  /**
   * Check if CAPTCHA is required
   */
  async isCaptchaRequired(ip: string): Promise<boolean> {
    try {
      return (await redis.exists(REDIS_KEYS.captchaRequired(ip))) === 1;
    } catch {
      return false;
    }
  }

  /**
   * Calculate response delay based on threat score
   */
  calculateDelay(threatScore: number): number {
    if (threatScore <= 0) return this.config.responseDelayMs;

    // Exponential backoff based on score
    const delay = this.config.responseDelayMs * Math.pow(1.5, threatScore / 10);
    return Math.min(delay, this.config.maxResponseDelayMs);
  }

  /**
   * Get global statistics
   */
  async getStats(): Promise<Record<string, number>> {
    try {
      const stats = await redis.hgetall(REDIS_KEYS.globalStats);
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(stats)) {
        result[key] = parseInt(value, 10);
      }
      return result;
    } catch {
      return {};
    }
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create directory protection middleware
 */
export function createDirectoryProtectionMiddleware(
  config: Partial<DirectoryProtectionConfig> = {}
) {
  const service = new DirectoryProtectionService(config);
  const opts = { ...DEFAULT_CONFIG, ...config };

  return async function directoryProtectionMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    if (!opts.enabled) {
      return done();
    }

    const ip = getClientIp(request);
    const url = request.url;

    // Check if IP is blocked
    const blockStatus = await service.isBlocked(ip);
    if (blockStatus.blocked) {
      logger.info({
        event: 'BLOCKED_REQUEST',
        ip,
        url,
        reason: blockStatus.reason,
      });

      // Add delay before responding
      await delay(opts.maxResponseDelayMs);

      return reply.status(403).send({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied',
          retryAfter: blockStatus.ttl,
        },
      });
    }

    // Analyze the URL
    const analysis = service.analyzeUrl(url);

    if (analysis.suspicious) {
      // Update threat score
      const threatScore = await service.updateThreatScore(
        ip,
        analysis.score,
        analysis.matchedPatterns
      );

      // Add delay based on threat score
      const responseDelay = service.calculateDelay(threatScore.score);
      if (responseDelay > opts.responseDelayMs) {
        await delay(responseDelay);
      }

      // Check if now blocked
      if (threatScore.blocked) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied',
          },
        });
      }
    }

    return done();
  };
}

/**
 * Custom 404 handler with protection
 */
export function createSecureNotFoundHandler(
  config: Partial<DirectoryProtectionConfig> = {}
) {
  const service = new DirectoryProtectionService(config);
  const opts = { ...DEFAULT_CONFIG, ...config };

  return async function secureNotFoundHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const ip = getClientIp(request);
    const url = request.url;

    // Analyze the URL
    const analysis = service.analyzeUrl(url);

    if (analysis.suspicious) {
      // Update threat score
      await service.updateThreatScore(ip, analysis.score, analysis.matchedPatterns);
    }

    // Get current threat score for delay calculation
    const threatScore = await service.getThreatScore(ip);
    const responseDelay = service.calculateDelay(threatScore.score);

    // Add random jitter to prevent timing attacks
    const jitter = Math.random() * 50;
    await delay(responseDelay + jitter);

    // Log if configured
    if (opts.logAllAttempts || analysis.suspicious) {
      logger.info({
        event: '404_NOT_FOUND',
        ip,
        url,
        suspicious: analysis.suspicious,
        patterns: analysis.matchedPatterns,
        threatScore: threatScore.score,
      });
    }

    // Return consistent 404 response
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export singleton instance
export const directoryProtectionService = new DirectoryProtectionService();
