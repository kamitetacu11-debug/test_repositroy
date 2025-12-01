/**
 * Security Metrics for Prometheus Monitoring
 *
 * This module provides security-related metrics for monitoring and alerting.
 * Metrics are exposed at /metrics endpoint for Prometheus scraping.
 */

import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface SecurityMetrics {
  // Rate limiting
  rateLimitHits: number;
  rateLimitBlocks: number;

  // Brute force
  failedLoginAttempts: number;
  accountLockouts: number;
  ipBlocks: number;

  // Directory protection
  suspiciousRequests: number;
  directoryFuzzingBlocks: number;

  // CAPTCHA
  captchaVerified: number;
  captchaFailed: number;

  // Threat detection
  protectionLevel: number;
  anomaliesDetected: number;
  blacklistedIps: number;

  // General
  totalSecurityEvents: number;
  highSeverityEvents: number;
  criticalSeverityEvents: number;
}

// ============================================================================
// Redis Keys for Metrics
// ============================================================================

const METRICS_KEYS = {
  rateLimitHits: 'metrics:security:rate-limit-hits',
  rateLimitBlocks: 'metrics:security:rate-limit-blocks',
  failedLoginAttempts: 'metrics:security:failed-logins',
  accountLockouts: 'metrics:security:account-lockouts',
  ipBlocks: 'metrics:security:ip-blocks',
  suspiciousRequests: 'metrics:security:suspicious-requests',
  directoryFuzzingBlocks: 'metrics:security:directory-blocks',
  captchaVerified: 'metrics:security:captcha-verified',
  captchaFailed: 'metrics:security:captcha-failed',
  anomaliesDetected: 'metrics:security:anomalies',
  totalSecurityEvents: 'metrics:security:total-events',
  highSeverityEvents: 'metrics:security:high-severity',
  criticalSeverityEvents: 'metrics:security:critical-severity',
};

// ============================================================================
// Metrics Collection
// ============================================================================

class SecurityMetricsCollector {
  /**
   * Increment a metric counter
   */
  async increment(metric: keyof typeof METRICS_KEYS, value = 1): Promise<void> {
    try {
      await redis.incrby(METRICS_KEYS[metric], value);
    } catch (error) {
      logger.error({ error, metric }, 'Failed to increment metric');
    }
  }

  /**
   * Get current value of a metric
   */
  async get(metric: keyof typeof METRICS_KEYS): Promise<number> {
    try {
      const value = await redis.get(METRICS_KEYS[metric]);
      return parseInt(value || '0', 10);
    } catch (error) {
      logger.error({ error, metric }, 'Failed to get metric');
      return 0;
    }
  }

  /**
   * Get all security metrics
   */
  async getAll(): Promise<SecurityMetrics> {
    try {
      const pipeline = redis.pipeline();

      Object.values(METRICS_KEYS).forEach((key) => {
        pipeline.get(key);
      });

      // Get additional runtime metrics
      pipeline.get('threat:protection:level');
      pipeline.scard('threat:blacklist');

      const results = await pipeline.exec();

      if (!results) {
        return this.getEmptyMetrics();
      }

      const keys = Object.keys(METRICS_KEYS);
      const metrics: Record<string, number> = {};

      keys.forEach((key, index) => {
        const value = results[index]?.[1];
        metrics[key] = parseInt((value as string) || '0', 10);
      });

      // Add runtime metrics
      const protectionLevel = parseInt((results[keys.length]?.[1] as string) || '0', 10);
      const blacklistedIps = (results[keys.length + 1]?.[1] as number) || 0;

      return {
        rateLimitHits: metrics.rateLimitHits,
        rateLimitBlocks: metrics.rateLimitBlocks,
        failedLoginAttempts: metrics.failedLoginAttempts,
        accountLockouts: metrics.accountLockouts,
        ipBlocks: metrics.ipBlocks,
        suspiciousRequests: metrics.suspiciousRequests,
        directoryFuzzingBlocks: metrics.directoryFuzzingBlocks,
        captchaVerified: metrics.captchaVerified,
        captchaFailed: metrics.captchaFailed,
        protectionLevel,
        anomaliesDetected: metrics.anomaliesDetected,
        blacklistedIps,
        totalSecurityEvents: metrics.totalSecurityEvents,
        highSeverityEvents: metrics.highSeverityEvents,
        criticalSeverityEvents: metrics.criticalSeverityEvents,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get all metrics');
      return this.getEmptyMetrics();
    }
  }

  /**
   * Reset all metrics (for testing or maintenance)
   */
  async reset(): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      Object.values(METRICS_KEYS).forEach((key) => {
        pipeline.del(key);
      });
      await pipeline.exec();
      logger.info('Security metrics reset');
    } catch (error) {
      logger.error({ error }, 'Failed to reset metrics');
    }
  }

  private getEmptyMetrics(): SecurityMetrics {
    return {
      rateLimitHits: 0,
      rateLimitBlocks: 0,
      failedLoginAttempts: 0,
      accountLockouts: 0,
      ipBlocks: 0,
      suspiciousRequests: 0,
      directoryFuzzingBlocks: 0,
      captchaVerified: 0,
      captchaFailed: 0,
      protectionLevel: 0,
      anomaliesDetected: 0,
      blacklistedIps: 0,
      totalSecurityEvents: 0,
      highSeverityEvents: 0,
      criticalSeverityEvents: 0,
    };
  }
}

// ============================================================================
// Prometheus Format Export
// ============================================================================

/**
 * Generate Prometheus-formatted metrics string
 */
export async function generatePrometheusMetrics(): Promise<string> {
  const metrics = await securityMetricsCollector.getAll();

  const lines: string[] = [
    '# HELP taskmaster_security_rate_limit_hits_total Total rate limit hits',
    '# TYPE taskmaster_security_rate_limit_hits_total counter',
    `taskmaster_security_rate_limit_hits_total ${metrics.rateLimitHits}`,

    '# HELP taskmaster_security_rate_limit_blocks_total Total rate limit blocks',
    '# TYPE taskmaster_security_rate_limit_blocks_total counter',
    `taskmaster_security_rate_limit_blocks_total ${metrics.rateLimitBlocks}`,

    '# HELP taskmaster_security_failed_login_attempts_total Total failed login attempts',
    '# TYPE taskmaster_security_failed_login_attempts_total counter',
    `taskmaster_security_failed_login_attempts_total ${metrics.failedLoginAttempts}`,

    '# HELP taskmaster_security_account_lockouts_total Total account lockouts',
    '# TYPE taskmaster_security_account_lockouts_total counter',
    `taskmaster_security_account_lockouts_total ${metrics.accountLockouts}`,

    '# HELP taskmaster_security_ip_blocks_total Total IP blocks',
    '# TYPE taskmaster_security_ip_blocks_total counter',
    `taskmaster_security_ip_blocks_total ${metrics.ipBlocks}`,

    '# HELP taskmaster_security_suspicious_requests_total Total suspicious requests',
    '# TYPE taskmaster_security_suspicious_requests_total counter',
    `taskmaster_security_suspicious_requests_total ${metrics.suspiciousRequests}`,

    '# HELP taskmaster_security_directory_fuzzing_blocks_total Total directory fuzzing blocks',
    '# TYPE taskmaster_security_directory_fuzzing_blocks_total counter',
    `taskmaster_security_directory_fuzzing_blocks_total ${metrics.directoryFuzzingBlocks}`,

    '# HELP taskmaster_security_captcha_verified_total Total CAPTCHA verifications',
    '# TYPE taskmaster_security_captcha_verified_total counter',
    `taskmaster_security_captcha_verified_total ${metrics.captchaVerified}`,

    '# HELP taskmaster_security_captcha_failed_total Total CAPTCHA failures',
    '# TYPE taskmaster_security_captcha_failed_total counter',
    `taskmaster_security_captcha_failed_total ${metrics.captchaFailed}`,

    '# HELP taskmaster_security_protection_level Current protection level (0-4)',
    '# TYPE taskmaster_security_protection_level gauge',
    `taskmaster_security_protection_level ${metrics.protectionLevel}`,

    '# HELP taskmaster_security_anomalies_detected_total Total anomalies detected',
    '# TYPE taskmaster_security_anomalies_detected_total counter',
    `taskmaster_security_anomalies_detected_total ${metrics.anomaliesDetected}`,

    '# HELP taskmaster_security_blacklisted_ips Current number of blacklisted IPs',
    '# TYPE taskmaster_security_blacklisted_ips gauge',
    `taskmaster_security_blacklisted_ips ${metrics.blacklistedIps}`,

    '# HELP taskmaster_security_events_total Total security events',
    '# TYPE taskmaster_security_events_total counter',
    `taskmaster_security_events_total ${metrics.totalSecurityEvents}`,

    '# HELP taskmaster_security_high_severity_events_total Total high severity events',
    '# TYPE taskmaster_security_high_severity_events_total counter',
    `taskmaster_security_high_severity_events_total ${metrics.highSeverityEvents}`,

    '# HELP taskmaster_security_critical_severity_events_total Total critical severity events',
    '# TYPE taskmaster_security_critical_severity_events_total counter',
    `taskmaster_security_critical_severity_events_total ${metrics.criticalSeverityEvents}`,
  ];

  return lines.join('\n');
}

// ============================================================================
// Fastify Plugin for Metrics Endpoint
// ============================================================================

export async function registerMetricsEndpoint(app: FastifyInstance): Promise<void> {
  // Prometheus metrics endpoint
  app.get('/metrics', {
    schema: {
      tags: ['Monitoring'],
      summary: 'Prometheus metrics endpoint',
      hide: true, // Hide from Swagger
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await generatePrometheusMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return metrics;
  });

  // JSON metrics endpoint (for internal use)
  app.get('/api/v1/metrics/security', {
    schema: {
      tags: ['Monitoring'],
      summary: 'Security metrics in JSON format',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role: string } | undefined;

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }

    const metrics = await securityMetricsCollector.getAll();

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  });
}

// ============================================================================
// Exports
// ============================================================================

export const securityMetricsCollector = new SecurityMetricsCollector();

// Convenience functions for recording metrics
export const recordMetric = {
  rateLimitHit: () => securityMetricsCollector.increment('rateLimitHits'),
  rateLimitBlock: () => securityMetricsCollector.increment('rateLimitBlocks'),
  failedLogin: () => securityMetricsCollector.increment('failedLoginAttempts'),
  accountLockout: () => securityMetricsCollector.increment('accountLockouts'),
  ipBlock: () => securityMetricsCollector.increment('ipBlocks'),
  suspiciousRequest: () => securityMetricsCollector.increment('suspiciousRequests'),
  directoryFuzzingBlock: () => securityMetricsCollector.increment('directoryFuzzingBlocks'),
  captchaVerified: () => securityMetricsCollector.increment('captchaVerified'),
  captchaFailed: () => securityMetricsCollector.increment('captchaFailed'),
  anomalyDetected: () => securityMetricsCollector.increment('anomaliesDetected'),
  securityEvent: (severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    securityMetricsCollector.increment('totalSecurityEvents');
    if (severity === 'HIGH') {
      securityMetricsCollector.increment('highSeverityEvents');
    } else if (severity === 'CRITICAL') {
      securityMetricsCollector.increment('criticalSeverityEvents');
    }
  },
};
