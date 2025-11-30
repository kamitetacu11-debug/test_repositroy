/**
 * TaskMaster Security Module
 *
 * Comprehensive security layer providing protection against:
 * - Brute-force attacks
 * - DDoS attacks
 * - Directory fuzzing
 * - XSS, CSRF, SQL/NoSQL injection
 * - Path traversal
 *
 * @module security
 */

// ============================================================================
// Services
// ============================================================================

export {
  RateLimitService,
  rateLimitService,
  RATE_LIMIT_CONFIGS,
  getClientIp,
  generateDeviceFingerprint,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limit.service.js';

export {
  BruteForceProtectionService,
  bruteForceService,
  type BruteForceConfig,
  type LoginAttemptResult,
  type AccountStatus,
} from './brute-force.service.js';

export {
  ThreatDetectionService,
  threatDetectionService,
  createThreatDetectionMiddleware,
  ProtectionLevel,
  SecurityEventType,
  type ThreatDetectionConfig,
  type TrafficMetrics,
  type AnomalyResult,
  type IpReputation,
  type SecurityEvent,
} from './threat-detection.service.js';

export {
  DirectoryProtectionService,
  directoryProtectionService,
  createDirectoryProtectionMiddleware,
  createSecureNotFoundHandler,
  type DirectoryProtectionConfig,
  type ThreatScore,
} from './directory-protection.middleware.js';

export {
  CaptchaService,
  captchaService,
  createCaptchaService,
  createCaptchaMiddleware,
  requireCaptcha,
  type CaptchaConfig,
  type CaptchaProvider,
  type CaptchaVerifyResult,
  type CaptchaChallenge,
} from './captcha.service.js';

export {
  TwoFactorService,
  twoFactorService,
  generateTwoFactorSetup,
  verifyTwoFactorToken,
  verifyTwoFactorTokenOrBackup,
  hashBackupCodes,
  type TwoFactorSecret,
  type TwoFactorVerifyResult,
  type TwoFactorConfig,
} from './two-factor.service.js';

// ============================================================================
// Middleware
// ============================================================================

export {
  createInputValidationMiddleware,
  createContentTypeMiddleware,
  createRequestSizeMiddleware,
  escapeHtml,
  sanitizeObject,
  containsXss,
  containsSqlInjection,
  containsNoSqlInjection,
  containsPathTraversal,
  generateCsrfToken,
  createCsrfToken,
  validateCsrfToken,
  type SecurityValidationOptions,
  type RequestSizeLimits,
} from './input-validation.middleware.js';

// ============================================================================
// Metrics
// ============================================================================

export {
  securityMetricsCollector,
  recordMetric,
  generatePrometheusMetrics,
  registerMetricsEndpoint,
  type SecurityMetrics,
} from './metrics.js';

// ============================================================================
// Combined Security Middleware
// ============================================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger.js';
import { rateLimitService, RATE_LIMIT_CONFIGS, getClientIp } from './rate-limit.service.js';
import { bruteForceService } from './brute-force.service.js';
import { threatDetectionService, createThreatDetectionMiddleware } from './threat-detection.service.js';
import { createDirectoryProtectionMiddleware, createSecureNotFoundHandler } from './directory-protection.middleware.js';
import { createInputValidationMiddleware, createContentTypeMiddleware, createRequestSizeMiddleware } from './input-validation.middleware.js';
import { captchaService, createCaptchaMiddleware } from './captcha.service.js';

export interface SecurityPluginOptions {
  enableRateLimit?: boolean;
  enableBruteForceProtection?: boolean;
  enableThreatDetection?: boolean;
  enableDirectoryProtection?: boolean;
  enableInputValidation?: boolean;
  enableCaptcha?: boolean;
  captchaConfig?: {
    provider: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'disabled';
    siteKey: string;
    secretKey: string;
  };
}

const DEFAULT_OPTIONS: SecurityPluginOptions = {
  enableRateLimit: true,
  enableBruteForceProtection: true,
  enableThreatDetection: true,
  enableDirectoryProtection: true,
  enableInputValidation: true,
  enableCaptcha: false,
};

/**
 * Register all security middleware on a Fastify instance
 */
export async function registerSecurityMiddleware(
  app: FastifyInstance,
  options: SecurityPluginOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  logger.info('Registering security middleware...');

  // ========================================
  // Request Tracking (for metrics)
  // ========================================
  const requestStart = new Map<string, number>();

  app.addHook('onRequest', async (request) => {
    requestStart.set(request.id, Date.now());
  });

  app.addHook('onResponse', async (request, reply) => {
    const start = requestStart.get(request.id);
    if (start) {
      const duration = Date.now() - start;
      requestStart.delete(request.id);

      // Record metrics for threat detection
      if (opts.enableThreatDetection) {
        const ip = getClientIp(request);
        await threatDetectionService.recordRequest(
          ip,
          request.url,
          reply.statusCode,
          duration
        );
      }
    }
  });

  // ========================================
  // Threat Detection (blacklist/whitelist check)
  // ========================================
  if (opts.enableThreatDetection) {
    app.addHook('preHandler', createThreatDetectionMiddleware(threatDetectionService));
    threatDetectionService.start();

    // Graceful shutdown
    app.addHook('onClose', async () => {
      threatDetectionService.stop();
    });
  }

  // ========================================
  // Directory Protection
  // ========================================
  if (opts.enableDirectoryProtection) {
    app.addHook('preHandler', createDirectoryProtectionMiddleware());
  }

  // ========================================
  // Input Validation (XSS, Injection, etc.)
  // ========================================
  if (opts.enableInputValidation) {
    app.addHook('preHandler', createInputValidationMiddleware());
    app.addHook('preHandler', createContentTypeMiddleware(['application/json', 'multipart/form-data']));
    app.addHook('preHandler', createRequestSizeMiddleware());
  }

  // ========================================
  // CAPTCHA (if enabled)
  // ========================================
  if (opts.enableCaptcha && opts.captchaConfig) {
    const captcha = new (await import('./captcha.service.js')).CaptchaService(opts.captchaConfig);
    app.addHook('preHandler', createCaptchaMiddleware(captcha, opts.captchaConfig));
  }

  // ========================================
  // Enhanced Rate Limiting
  // ========================================
  if (opts.enableRateLimit) {
    app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = getClientIp(request);
      const path = request.url.split('?')[0];

      // Determine which rate limit config to use
      let config = RATE_LIMIT_CONFIGS.global;

      if (path.startsWith('/api/v1/auth')) {
        config = RATE_LIMIT_CONFIGS.auth;
      } else if (path.startsWith('/api/v1/ai') || path.includes('/analyze')) {
        config = RATE_LIMIT_CONFIGS.heavy;
      } else if (path.startsWith('/api/')) {
        config = RATE_LIMIT_CONFIGS.api;
      }

      // Apply rate limit multiplier if under attack
      const multiplier = await threatDetectionService.getRateLimitMultiplier();
      const adjustedConfig = {
        ...config,
        maxRequests: Math.floor(config.maxRequests * multiplier),
      };

      const result = await rateLimitService.checkLimit(ip, adjustedConfig);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', adjustedConfig.maxRequests);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        reply.header('Retry-After', result.retryAfter || 60);

        logger.warn({
          event: 'RATE_LIMIT_EXCEEDED',
          ip,
          path,
          config: config.keyPrefix,
        });

        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message || 'Too many requests',
            retryAfter: result.retryAfter,
          },
        });
      }
    });
  }

  // ========================================
  // Secure 404 Handler
  // ========================================
  if (opts.enableDirectoryProtection) {
    app.setNotFoundHandler(createSecureNotFoundHandler());
  }

  logger.info('Security middleware registered successfully');
}

// ============================================================================
// Security Decorators for Routes
// ============================================================================

/**
 * Decorator to protect login routes with brute-force protection
 */
export function withBruteForceProtection() {
  return async function(
    request: FastifyRequest<{ Body: { email: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const ip = getClientIp(request);
    const email = request.body?.email;

    if (!email) return;

    const result = await bruteForceService.checkLoginAttempt(ip, email);

    if (!result.allowed) {
      reply.status(429).send({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many login attempts. Please try again later.',
          lockoutUntil: result.lockoutUntil?.toISOString(),
          requiresCaptcha: result.requiresCaptcha,
        },
      });
      return;
    }

    if (result.requiresCaptcha) {
      const token = request.headers['x-captcha-token'] as string;
      if (!token) {
        reply.status(428).send({
          success: false,
          error: {
            code: 'CAPTCHA_REQUIRED',
            message: 'CAPTCHA verification required',
            attemptsRemaining: result.attemptsRemaining,
          },
        });
        return;
      }
    }
  };
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(
  request: FastifyRequest<{ Body: { email: string } }>
): Promise<void> {
  const ip = getClientIp(request);
  const email = request.body?.email;

  if (email) {
    await bruteForceService.recordFailedAttempt(ip, email);
  }
}

/**
 * Record successful login
 */
export async function recordSuccessfulLogin(
  request: FastifyRequest<{ Body: { email: string } }>
): Promise<void> {
  const ip = getClientIp(request);
  const email = request.body?.email;

  if (email) {
    await bruteForceService.recordSuccessfulLogin(ip, email);
  }
}
