import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { logger } from '../../config/logger.js';
import {
  bruteForceService,
  threatDetectionService,
  directoryProtectionService,
  captchaService,
  rateLimitService,
  ProtectionLevel,
  RATE_LIMIT_CONFIGS,
} from './index.js';

// ============================================================================
// Schemas
// ============================================================================

const blockIpSchema = z.object({
  ip: z.string().ip(),
  reason: z.string().min(1),
  durationSeconds: z.number().int().positive().optional(),
});

const unblockIpSchema = z.object({
  ip: z.string().ip(),
});

const unlockAccountSchema = z.object({
  email: z.string().email(),
});

const setProtectionLevelSchema = z.object({
  level: z.nativeEnum(ProtectionLevel),
  reason: z.string().min(1),
});

const ipQuerySchema = z.object({
  ip: z.string().ip(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

// ============================================================================
// Routes
// ============================================================================

export const securityRoutes: FastifyPluginAsync = async (app) => {
  // ========================================
  // Middleware: Admin only
  // ========================================
  app.addHook('preHandler', async (request, reply) => {
    const user = request.user as { userId: string; role: string } | undefined;

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }
  });

  // ========================================
  // Dashboard & Overview
  // ========================================

  /**
   * Get security dashboard overview
   */
  app.get('/dashboard', {
    schema: {
      tags: ['Security'],
      summary: 'Get security dashboard overview',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const [
      protectionLevel,
      recentEvents,
      directoryStats,
      captchaStats,
      rateLimitMultiplier,
    ] = await Promise.all([
      threatDetectionService.getProtectionLevel(),
      threatDetectionService.getRecentEvents(10),
      directoryProtectionService.getStats(),
      captchaService.getStats(),
      threatDetectionService.getRateLimitMultiplier(),
    ]);

    const currentMetrics = await threatDetectionService.getCurrentMetrics();

    return {
      success: true,
      data: {
        protectionLevel: {
          level: protectionLevel,
          name: ProtectionLevel[protectionLevel],
          rateLimitMultiplier,
        },
        metrics: currentMetrics,
        stats: {
          directory: directoryStats,
          captcha: captchaStats,
        },
        recentEvents: recentEvents.map((e) => ({
          type: e.type,
          severity: e.severity,
          ip: e.ip,
          path: e.path,
          timestamp: e.timestamp,
        })),
      },
    };
  });

  // ========================================
  // Protection Level Management
  // ========================================

  /**
   * Get current protection level
   */
  app.get('/protection-level', {
    schema: {
      tags: ['Security'],
      summary: 'Get current protection level',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const level = await threatDetectionService.getProtectionLevel();
    const multiplier = await threatDetectionService.getRateLimitMultiplier();

    return {
      success: true,
      data: {
        level,
        name: ProtectionLevel[level],
        rateLimitMultiplier: multiplier,
        description: getProtectionLevelDescription(level),
      },
    };
  });

  /**
   * Set protection level
   */
  app.post('/protection-level', {
    schema: {
      tags: ['Security'],
      summary: 'Set protection level',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['level', 'reason'],
        properties: {
          level: { type: 'number', minimum: 0, maximum: 4 },
          reason: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { level, reason } = setProtectionLevelSchema.parse(request.body);
    const user = request.user as { userId: string };

    await threatDetectionService.setProtectionLevel(level, reason);

    logger.info({
      event: 'PROTECTION_LEVEL_CHANGED_BY_ADMIN',
      userId: user.userId,
      newLevel: level,
      reason,
    });

    return {
      success: true,
      message: `Protection level set to ${ProtectionLevel[level]}`,
    };
  });

  // ========================================
  // IP Management
  // ========================================

  /**
   * Get IP reputation
   */
  app.get('/ip/:ip/reputation', {
    schema: {
      tags: ['Security'],
      summary: 'Get IP reputation and status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { ip } = request.params as { ip: string };

    const [reputation, isBlacklisted, isWhitelisted, directoryThreat] = await Promise.all([
      threatDetectionService.getIpReputation(ip),
      threatDetectionService.isBlacklisted(ip),
      threatDetectionService.isWhitelisted(ip),
      directoryProtectionService.getThreatScore(ip),
    ]);

    return {
      success: true,
      data: {
        ip,
        reputation,
        isBlacklisted,
        isWhitelisted,
        directoryThreatScore: directoryThreat,
      },
    };
  });

  /**
   * Blacklist an IP
   */
  app.post('/ip/blacklist', {
    schema: {
      tags: ['Security'],
      summary: 'Add IP to blacklist',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['ip', 'reason'],
        properties: {
          ip: { type: 'string' },
          reason: { type: 'string' },
          durationSeconds: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const { ip, reason, durationSeconds } = blockIpSchema.parse(request.body);
    const user = request.user as { userId: string };

    await threatDetectionService.blacklistIp(ip, reason, durationSeconds);

    logger.info({
      event: 'IP_BLACKLISTED_BY_ADMIN',
      userId: user.userId,
      ip,
      reason,
      durationSeconds,
    });

    return {
      success: true,
      message: `IP ${ip} has been blacklisted`,
    };
  });

  /**
   * Remove IP from blacklist
   */
  app.delete('/ip/blacklist/:ip', {
    schema: {
      tags: ['Security'],
      summary: 'Remove IP from blacklist',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { ip } = request.params as { ip: string };
    const user = request.user as { userId: string };

    await threatDetectionService.unblacklistIp(ip);

    logger.info({
      event: 'IP_UNBLACKLISTED_BY_ADMIN',
      userId: user.userId,
      ip,
    });

    return {
      success: true,
      message: `IP ${ip} has been removed from blacklist`,
    };
  });

  /**
   * Add IP to whitelist
   */
  app.post('/ip/whitelist', {
    schema: {
      tags: ['Security'],
      summary: 'Add IP to whitelist',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { ip } = unblockIpSchema.parse(request.body);
    const user = request.user as { userId: string };

    await threatDetectionService.whitelistIp(ip);

    logger.info({
      event: 'IP_WHITELISTED_BY_ADMIN',
      userId: user.userId,
      ip,
    });

    return {
      success: true,
      message: `IP ${ip} has been whitelisted`,
    };
  });

  /**
   * Unblock IP from directory protection
   */
  app.post('/ip/unblock-directory', {
    schema: {
      tags: ['Security'],
      summary: 'Unblock IP from directory fuzzing protection',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { ip } = unblockIpSchema.parse(request.body);
    const user = request.user as { userId: string };

    await directoryProtectionService.unblockIp(ip);

    logger.info({
      event: 'IP_UNBLOCKED_DIRECTORY_BY_ADMIN',
      userId: user.userId,
      ip,
    });

    return {
      success: true,
      message: `IP ${ip} has been unblocked from directory protection`,
    };
  });

  /**
   * Unblock IP from brute-force protection
   */
  app.post('/ip/unblock-bruteforce', {
    schema: {
      tags: ['Security'],
      summary: 'Unblock IP from brute-force protection',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { ip } = unblockIpSchema.parse(request.body);
    const user = request.user as { userId: string };

    await bruteForceService.unlockIp(ip);

    logger.info({
      event: 'IP_UNBLOCKED_BRUTEFORCE_BY_ADMIN',
      userId: user.userId,
      ip,
    });

    return {
      success: true,
      message: `IP ${ip} has been unblocked from brute-force protection`,
    };
  });

  // ========================================
  // Account Management
  // ========================================

  /**
   * Get account security status
   */
  app.get('/account/:email/status', {
    schema: {
      tags: ['Security'],
      summary: 'Get account security status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { email } = request.params as { email: string };

    const status = await bruteForceService.getAccountStatus(email);

    return {
      success: true,
      data: {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email in response
        ...status,
      },
    };
  });

  /**
   * Unlock account
   */
  app.post('/account/unlock', {
    schema: {
      tags: ['Security'],
      summary: 'Unlock a locked account',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request) => {
    const { email } = unlockAccountSchema.parse(request.body);
    const user = request.user as { userId: string };

    await bruteForceService.unlockAccount(email);

    logger.info({
      event: 'ACCOUNT_UNLOCKED_BY_ADMIN',
      userId: user.userId,
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    });

    return {
      success: true,
      message: 'Account has been unlocked',
    };
  });

  // ========================================
  // CAPTCHA Management
  // ========================================

  /**
   * Enable global CAPTCHA mode
   */
  app.post('/captcha/enable-global', {
    schema: {
      tags: ['Security'],
      summary: 'Enable global CAPTCHA mode',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          durationSeconds: { type: 'number', default: 1800 },
        },
      },
    },
  }, async (request) => {
    const { durationSeconds = 1800 } = (request.body as any) || {};
    const user = request.user as { userId: string };

    await captchaService.enableGlobalMode(durationSeconds);

    logger.info({
      event: 'GLOBAL_CAPTCHA_ENABLED_BY_ADMIN',
      userId: user.userId,
      durationSeconds,
    });

    return {
      success: true,
      message: `Global CAPTCHA mode enabled for ${durationSeconds} seconds`,
    };
  });

  /**
   * Disable global CAPTCHA mode
   */
  app.post('/captcha/disable-global', {
    schema: {
      tags: ['Security'],
      summary: 'Disable global CAPTCHA mode',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const user = request.user as { userId: string };

    await captchaService.disableGlobalMode();

    logger.info({
      event: 'GLOBAL_CAPTCHA_DISABLED_BY_ADMIN',
      userId: user.userId,
    });

    return {
      success: true,
      message: 'Global CAPTCHA mode disabled',
    };
  });

  /**
   * Require CAPTCHA for specific IP
   */
  app.post('/captcha/require', {
    schema: {
      tags: ['Security'],
      summary: 'Require CAPTCHA for specific IP',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['ip', 'reason'],
        properties: {
          ip: { type: 'string' },
          reason: { type: 'string' },
          durationSeconds: { type: 'number', default: 3600 },
        },
      },
    },
  }, async (request) => {
    const { ip, reason, durationSeconds = 3600 } = request.body as any;
    const user = request.user as { userId: string };

    await captchaService.requireForIp(ip, reason, durationSeconds);

    logger.info({
      event: 'CAPTCHA_REQUIRED_FOR_IP_BY_ADMIN',
      userId: user.userId,
      ip,
      reason,
      durationSeconds,
    });

    return {
      success: true,
      message: `CAPTCHA required for IP ${ip}`,
    };
  });

  // ========================================
  // Security Events
  // ========================================

  /**
   * Get security events
   */
  app.get('/events', {
    schema: {
      tags: ['Security'],
      summary: 'Get security events',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
  }, async (request) => {
    const { limit, offset } = paginationSchema.parse(request.query);

    const events = await threatDetectionService.getRecentEvents(limit + offset);
    const paginatedEvents = events.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        events: paginatedEvents,
        pagination: {
          limit,
          offset,
          total: events.length,
        },
      },
    };
  });

  // ========================================
  // Traffic Metrics
  // ========================================

  /**
   * Get current traffic metrics
   */
  app.get('/metrics/traffic', {
    schema: {
      tags: ['Security'],
      summary: 'Get current traffic metrics',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const metrics = await threatDetectionService.getCurrentMetrics();
    const anomaly = await threatDetectionService.detectAnomaly();

    return {
      success: true,
      data: {
        metrics,
        anomaly,
      },
    };
  });

  // ========================================
  // Rate Limit Configuration
  // ========================================

  /**
   * Get rate limit configurations
   */
  app.get('/rate-limits', {
    schema: {
      tags: ['Security'],
      summary: 'Get rate limit configurations',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const multiplier = await threatDetectionService.getRateLimitMultiplier();

    const configs = Object.entries(RATE_LIMIT_CONFIGS).map(([name, config]) => ({
      name,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      effectiveMaxRequests: Math.floor(config.maxRequests * multiplier),
      keyPrefix: config.keyPrefix,
    }));

    return {
      success: true,
      data: {
        multiplier,
        configs,
      },
    };
  });
};

// ============================================================================
// Helper Functions
// ============================================================================

function getProtectionLevelDescription(level: ProtectionLevel): string {
  switch (level) {
    case ProtectionLevel.NORMAL:
      return 'Normal operation. Standard rate limits and security measures active.';
    case ProtectionLevel.ELEVATED:
      return 'Elevated monitoring. Increased logging and attention to suspicious activity.';
    case ProtectionLevel.HIGH:
      return 'High alert. Rate limits tightened to 50% of normal. Stricter validation.';
    case ProtectionLevel.CRITICAL:
      return 'Critical. CAPTCHA required for all requests. Rate limits at 25%.';
    case ProtectionLevel.LOCKDOWN:
      return 'Lockdown mode. Only whitelisted IPs allowed. Rate limits at 10%.';
    default:
      return 'Unknown protection level';
  }
}
