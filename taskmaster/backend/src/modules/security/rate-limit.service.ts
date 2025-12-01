import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  blockDurationMs?: number;
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  blocked?: boolean;
}

export interface SlidingWindowEntry {
  timestamp: number;
  count: number;
}

// ============================================================================
// Predefined Rate Limit Configurations
// ============================================================================

export const RATE_LIMIT_CONFIGS = {
  // Global rate limit - applies to all requests
  global: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:global',
    message: 'Too many requests, please try again later',
  },

  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'ratelimit:auth',
    blockDurationMs: 15 * 60 * 1000, // 15 minute block
    message: 'Too many login attempts, please try again later',
  },

  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyPrefix: 'ratelimit:password-reset',
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    message: 'Too many password reset attempts',
  },

  // API endpoints - standard limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'ratelimit:api',
    message: 'API rate limit exceeded',
  },

  // Heavy operations (AI analysis, reports)
  heavy: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ratelimit:heavy',
    message: 'Too many resource-intensive requests',
  },

  // File uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyPrefix: 'ratelimit:upload',
    message: 'Upload rate limit exceeded',
  },

  // WebSocket connections
  websocket: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ratelimit:ws',
    message: 'Too many WebSocket connection attempts',
  },
} as const;

// ============================================================================
// Rate Limit Service
// ============================================================================

export class RateLimitService {
  /**
   * Check if a request is allowed under the rate limit using sliding window algorithm
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `${config.keyPrefix}:${identifier}`;
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;

    try {
      // Check if identifier is blocked
      const isBlocked = await redis.get(blockKey);
      if (isBlocked) {
        const ttl = await redis.ttl(blockKey);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(now + ttl * 1000),
          retryAfter: ttl,
          blocked: true,
        };
      }

      // Use Redis sorted set for sliding window
      const pipeline = redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);

      // Count requests in window
      pipeline.zcard(key);

      // Set expiry on the key
      pipeline.expire(key, Math.ceil(config.windowMs / 1000) + 1);

      const results = await pipeline.exec();

      if (!results) {
        logger.error('Rate limit pipeline returned null');
        return this.createAllowedResult(config);
      }

      const requestCount = results[2]?.[1] as number || 0;
      const remaining = Math.max(0, config.maxRequests - requestCount);
      const resetAt = new Date(now + config.windowMs);

      if (requestCount > config.maxRequests) {
        // Rate limit exceeded
        if (config.blockDurationMs) {
          // Block the identifier for extended period
          await redis.setex(
            blockKey,
            Math.ceil(config.blockDurationMs / 1000),
            '1'
          );
        }

        logger.warn({
          event: 'RATE_LIMIT_EXCEEDED',
          identifier,
          requestCount,
          maxRequests: config.maxRequests,
          keyPrefix: config.keyPrefix,
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter: Math.ceil(config.windowMs / 1000),
          blocked: !!config.blockDurationMs,
        };
      }

      return {
        allowed: true,
        remaining,
        resetAt,
      };
    } catch (error) {
      logger.error({ error, identifier }, 'Rate limit check failed');
      // Fail open - allow request if Redis fails
      return this.createAllowedResult(config);
    }
  }

  /**
   * Increment failure counter for brute-force protection
   */
  async recordFailure(
    identifier: string,
    config: RateLimitConfig
  ): Promise<number> {
    const key = `${config.keyPrefix}:failures:${identifier}`;
    const now = Date.now();

    try {
      const pipeline = redis.pipeline();
      pipeline.zadd(key, now, `${now}:${Math.random()}`);
      pipeline.zremrangebyscore(key, 0, now - config.windowMs);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(config.windowMs / 1000) + 1);

      const results = await pipeline.exec();
      return results?.[2]?.[1] as number || 0;
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to record failure');
      return 0;
    }
  }

  /**
   * Clear failures for an identifier (e.g., after successful login)
   */
  async clearFailures(identifier: string, keyPrefix: string): Promise<void> {
    const key = `${keyPrefix}:failures:${identifier}`;
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to clear failures');
    }
  }

  /**
   * Manually block an identifier
   */
  async blockIdentifier(
    identifier: string,
    keyPrefix: string,
    durationSeconds: number,
    reason: string
  ): Promise<void> {
    const blockKey = `${keyPrefix}:blocked:${identifier}`;
    try {
      await redis.setex(blockKey, durationSeconds, reason);
      logger.warn({
        event: 'IDENTIFIER_BLOCKED',
        identifier,
        durationSeconds,
        reason,
      });
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to block identifier');
    }
  }

  /**
   * Unblock an identifier
   */
  async unblockIdentifier(identifier: string, keyPrefix: string): Promise<void> {
    const blockKey = `${keyPrefix}:blocked:${identifier}`;
    try {
      await redis.del(blockKey);
      logger.info({ event: 'IDENTIFIER_UNBLOCKED', identifier });
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to unblock identifier');
    }
  }

  /**
   * Check if an identifier is blocked
   */
  async isBlocked(identifier: string, keyPrefix: string): Promise<boolean> {
    const blockKey = `${keyPrefix}:blocked:${identifier}`;
    try {
      return (await redis.exists(blockKey)) === 1;
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to check block status');
      return false;
    }
  }

  /**
   * Get current request count for an identifier
   */
  async getCurrentCount(identifier: string, config: RateLimitConfig): Promise<number> {
    const key = `${config.keyPrefix}:${identifier}`;
    const windowStart = Date.now() - config.windowMs;

    try {
      await redis.zremrangebyscore(key, 0, windowStart);
      return await redis.zcard(key);
    } catch (error) {
      logger.error({ error, identifier }, 'Failed to get current count');
      return 0;
    }
  }

  private createAllowedResult(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract client IP from request, handling proxies
 */
export function getClientIp(request: FastifyRequest): string {
  // Check various headers for proxied requests
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  return request.ip;
}

/**
 * Generate a fingerprint for the device/browser
 */
export function generateDeviceFingerprint(request: FastifyRequest): string {
  const userAgent = request.headers['user-agent'] || '';
  const acceptLanguage = request.headers['accept-language'] || '';
  const acceptEncoding = request.headers['accept-encoding'] || '';

  const components = [
    userAgent,
    acceptLanguage,
    acceptEncoding,
    request.headers['sec-ch-ua'] || '',
    request.headers['sec-ch-ua-platform'] || '',
  ];

  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
