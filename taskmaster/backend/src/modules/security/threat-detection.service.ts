import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { getClientIp, generateDeviceFingerprint } from './rate-limit.service.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum ProtectionLevel {
  NORMAL = 0,      // Normal operations
  ELEVATED = 1,    // Increased monitoring
  HIGH = 2,        // Tightened rate limits
  CRITICAL = 3,    // CAPTCHA for all
  LOCKDOWN = 4,    // Whitelist only
}

export interface TrafficMetrics {
  requestsPerSecond: number;
  uniqueIpsPerMinute: number;
  errorRate: number;
  avgResponseTime: number;
  failedLoginsPerMinute: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  types: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction: string;
}

export interface ThreatDetectionConfig {
  enabled: boolean;
  baselineWindowMs: number;
  checkIntervalMs: number;
  requestsThresholdMultiplier: number;
  errorRateThreshold: number;
  uniqueIpsThresholdMultiplier: number;
  autoProtectionEnabled: boolean;
  protectionLevelDurations: Record<ProtectionLevel, number>;
}

export interface IpReputation {
  ip: string;
  score: number;          // 0-100, lower is worse
  totalRequests: number;
  failedRequests: number;
  blockedCount: number;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  country?: string;
}

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip: string;
  userId?: string;
  path: string;
  method: string;
  userAgent: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export enum SecurityEventType {
  FAILED_LOGIN = 'FAILED_LOGIN',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  DIRECTORY_FUZZING = 'DIRECTORY_FUZZING',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  IP_BLOCKED = 'IP_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  DDOS_SUSPECTED = 'DDOS_SUSPECTED',
  CAPTCHA_FAILED = 'CAPTCHA_FAILED',
  INJECTION_ATTEMPT = 'INJECTION_ATTEMPT',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  PROTECTION_LEVEL_CHANGED = 'PROTECTION_LEVEL_CHANGED',
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ThreatDetectionConfig = {
  enabled: true,
  baselineWindowMs: 60 * 60 * 1000,  // 1 hour baseline
  checkIntervalMs: 10 * 1000,         // Check every 10 seconds
  requestsThresholdMultiplier: 3,     // 3x baseline triggers alert
  errorRateThreshold: 0.3,            // 30% error rate
  uniqueIpsThresholdMultiplier: 5,    // 5x unique IPs
  autoProtectionEnabled: true,
  protectionLevelDurations: {
    [ProtectionLevel.NORMAL]: 0,
    [ProtectionLevel.ELEVATED]: 5 * 60,     // 5 minutes
    [ProtectionLevel.HIGH]: 15 * 60,        // 15 minutes
    [ProtectionLevel.CRITICAL]: 30 * 60,    // 30 minutes
    [ProtectionLevel.LOCKDOWN]: 60 * 60,    // 1 hour
  },
};

// ============================================================================
// Redis Keys
// ============================================================================

const REDIS_KEYS = {
  // Traffic metrics
  requestsCounter: 'threat:metrics:requests',
  uniqueIps: 'threat:metrics:unique-ips',
  errorCounter: 'threat:metrics:errors',
  responseTimeSum: 'threat:metrics:response-time',

  // Baseline
  baselineRequests: 'threat:baseline:requests',
  baselineUniqueIps: 'threat:baseline:unique-ips',
  baselineErrorRate: 'threat:baseline:error-rate',

  // Protection state
  protectionLevel: 'threat:protection:level',
  protectionExpires: 'threat:protection:expires',

  // IP reputation
  ipReputation: (ip: string) => `threat:reputation:${ip}`,
  ipBlacklist: 'threat:blacklist',
  ipWhitelist: 'threat:whitelist',

  // Events
  securityEvents: 'threat:events',

  // Rate limiting multipliers
  rateLimitMultiplier: 'threat:ratelimit:multiplier',
};

// ============================================================================
// Threat Detection Service
// ============================================================================

export class ThreatDetectionService {
  private config: ThreatDetectionConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private currentProtectionLevel: ProtectionLevel = ProtectionLevel.NORMAL;

  constructor(config: Partial<ThreatDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the threat detection monitoring
   */
  start(): void {
    if (!this.config.enabled) return;

    // Initial baseline calculation
    this.calculateBaseline();

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performThreatCheck();
    }, this.config.checkIntervalMs);

    logger.info('Threat detection service started');
  }

  /**
   * Stop the threat detection monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Threat detection service stopped');
  }

  /**
   * Record a request for metrics
   */
  async recordRequest(
    ip: string,
    path: string,
    statusCode: number,
    responseTimeMs: number
  ): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    try {
      const pipeline = redis.pipeline();

      // Increment request counter
      pipeline.hincrby(REDIS_KEYS.requestsCounter, minute.toString(), 1);
      pipeline.expire(REDIS_KEYS.requestsCounter, 3600);

      // Add unique IP
      pipeline.pfadd(`${REDIS_KEYS.uniqueIps}:${minute}`, ip);
      pipeline.expire(`${REDIS_KEYS.uniqueIps}:${minute}`, 3600);

      // Track errors (4xx and 5xx)
      if (statusCode >= 400) {
        pipeline.hincrby(REDIS_KEYS.errorCounter, minute.toString(), 1);
        pipeline.expire(REDIS_KEYS.errorCounter, 3600);
      }

      // Track response time
      pipeline.hincrbyfloat(REDIS_KEYS.responseTimeSum, minute.toString(), responseTimeMs);

      // Update IP reputation
      await this.updateIpReputation(ip, statusCode >= 400);

      await pipeline.exec();
    } catch (error) {
      logger.error({ error }, 'Failed to record request metrics');
    }
  }

  /**
   * Get current traffic metrics
   */
  async getCurrentMetrics(): Promise<TrafficMetrics> {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const lastMinute = currentMinute - 1;

    try {
      const [requestsStr, uniqueIpsCount, errorsStr, responseTimeStr] = await Promise.all([
        redis.hget(REDIS_KEYS.requestsCounter, currentMinute.toString()),
        redis.pfcount(`${REDIS_KEYS.uniqueIps}:${currentMinute}`),
        redis.hget(REDIS_KEYS.errorCounter, currentMinute.toString()),
        redis.hget(REDIS_KEYS.responseTimeSum, currentMinute.toString()),
      ]);

      const requests = parseInt(requestsStr || '0', 10);
      const errors = parseInt(errorsStr || '0', 10);
      const responseTime = parseFloat(responseTimeStr || '0');

      return {
        requestsPerSecond: requests / 60,
        uniqueIpsPerMinute: uniqueIpsCount,
        errorRate: requests > 0 ? errors / requests : 0,
        avgResponseTime: requests > 0 ? responseTime / requests : 0,
        failedLoginsPerMinute: 0, // Updated separately
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get current metrics');
      return {
        requestsPerSecond: 0,
        uniqueIpsPerMinute: 0,
        errorRate: 0,
        avgResponseTime: 0,
        failedLoginsPerMinute: 0,
      };
    }
  }

  /**
   * Detect anomalies in current traffic
   */
  async detectAnomaly(): Promise<AnomalyResult> {
    const [currentMetrics, baseline] = await Promise.all([
      this.getCurrentMetrics(),
      this.getBaseline(),
    ]);

    const anomalies: string[] = [];

    // Check request rate
    if (
      baseline.requestsPerSecond > 0 &&
      currentMetrics.requestsPerSecond > baseline.requestsPerSecond * this.config.requestsThresholdMultiplier
    ) {
      anomalies.push('HIGH_REQUEST_RATE');
    }

    // Check error rate
    if (currentMetrics.errorRate > this.config.errorRateThreshold) {
      anomalies.push('HIGH_ERROR_RATE');
    }

    // Check unique IPs (potential DDoS)
    if (
      baseline.uniqueIpsPerMinute > 0 &&
      currentMetrics.uniqueIpsPerMinute > baseline.uniqueIpsPerMinute * this.config.uniqueIpsThresholdMultiplier
    ) {
      anomalies.push('IP_FLOOD');
    }

    // Check response time degradation
    if (
      baseline.avgResponseTime > 0 &&
      currentMetrics.avgResponseTime > baseline.avgResponseTime * 3
    ) {
      anomalies.push('RESPONSE_TIME_DEGRADATION');
    }

    const severity = this.calculateSeverity(anomalies);

    return {
      isAnomaly: anomalies.length > 0,
      types: anomalies,
      severity,
      suggestedAction: this.getSuggestedAction(anomalies, severity),
    };
  }

  /**
   * Get current protection level
   */
  async getProtectionLevel(): Promise<ProtectionLevel> {
    try {
      const level = await redis.get(REDIS_KEYS.protectionLevel);
      return level ? parseInt(level, 10) as ProtectionLevel : ProtectionLevel.NORMAL;
    } catch {
      return ProtectionLevel.NORMAL;
    }
  }

  /**
   * Set protection level
   */
  async setProtectionLevel(level: ProtectionLevel, reason: string): Promise<void> {
    const previousLevel = this.currentProtectionLevel;

    try {
      const duration = this.config.protectionLevelDurations[level];

      if (duration > 0) {
        await redis.setex(REDIS_KEYS.protectionLevel, duration, level.toString());
      } else {
        await redis.set(REDIS_KEYS.protectionLevel, level.toString());
      }

      this.currentProtectionLevel = level;

      // Log protection level change
      await this.logSecurityEvent({
        type: SecurityEventType.PROTECTION_LEVEL_CHANGED,
        severity: level >= ProtectionLevel.CRITICAL ? 'CRITICAL' : level >= ProtectionLevel.HIGH ? 'HIGH' : 'MEDIUM',
        ip: 'SYSTEM',
        path: '',
        method: '',
        userAgent: '',
        details: {
          previousLevel,
          newLevel: level,
          reason,
        },
        timestamp: new Date(),
      });

      logger.warn({
        event: 'PROTECTION_LEVEL_CHANGED',
        previousLevel,
        newLevel: level,
        reason,
      });

      // Apply protection measures
      await this.applyProtectionMeasures(level);
    } catch (error) {
      logger.error({ error, level }, 'Failed to set protection level');
    }
  }

  /**
   * Add IP to blacklist
   */
  async blacklistIp(ip: string, reason: string, durationSeconds?: number): Promise<void> {
    try {
      if (durationSeconds) {
        await redis.setex(`${REDIS_KEYS.ipBlacklist}:${ip}`, durationSeconds, reason);
      } else {
        await redis.hset(REDIS_KEYS.ipBlacklist, ip, reason);
      }

      logger.warn({ event: 'IP_BLACKLISTED', ip, reason, durationSeconds });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to blacklist IP');
    }
  }

  /**
   * Remove IP from blacklist
   */
  async unblacklistIp(ip: string): Promise<void> {
    try {
      await Promise.all([
        redis.hdel(REDIS_KEYS.ipBlacklist, ip),
        redis.del(`${REDIS_KEYS.ipBlacklist}:${ip}`),
      ]);
      logger.info({ event: 'IP_UNBLACKLISTED', ip });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to unblacklist IP');
    }
  }

  /**
   * Check if IP is blacklisted
   */
  async isBlacklisted(ip: string): Promise<boolean> {
    try {
      const [permanent, temporary] = await Promise.all([
        redis.hexists(REDIS_KEYS.ipBlacklist, ip),
        redis.exists(`${REDIS_KEYS.ipBlacklist}:${ip}`),
      ]);
      return permanent === 1 || temporary === 1;
    } catch {
      return false;
    }
  }

  /**
   * Add IP to whitelist
   */
  async whitelistIp(ip: string): Promise<void> {
    try {
      await redis.sadd(REDIS_KEYS.ipWhitelist, ip);
      logger.info({ event: 'IP_WHITELISTED', ip });
    } catch (error) {
      logger.error({ error, ip }, 'Failed to whitelist IP');
    }
  }

  /**
   * Check if IP is whitelisted
   */
  async isWhitelisted(ip: string): Promise<boolean> {
    try {
      return (await redis.sismember(REDIS_KEYS.ipWhitelist, ip)) === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get IP reputation
   */
  async getIpReputation(ip: string): Promise<IpReputation | null> {
    try {
      const data = await redis.hgetall(REDIS_KEYS.ipReputation(ip));
      if (!data || Object.keys(data).length === 0) return null;

      return {
        ip,
        score: parseInt(data.score || '100', 10),
        totalRequests: parseInt(data.totalRequests || '0', 10),
        failedRequests: parseInt(data.failedRequests || '0', 10),
        blockedCount: parseInt(data.blockedCount || '0', 10),
        firstSeen: new Date(parseInt(data.firstSeen || Date.now().toString(), 10)),
        lastSeen: new Date(parseInt(data.lastSeen || Date.now().toString(), 10)),
        tags: data.tags ? JSON.parse(data.tags) : [],
        country: data.country,
      };
    } catch (error) {
      logger.error({ error, ip }, 'Failed to get IP reputation');
      return null;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const eventJson = JSON.stringify({
        ...event,
        timestamp: event.timestamp.toISOString(),
      });

      // Add to Redis list (keep last 10000 events)
      await redis.lpush(REDIS_KEYS.securityEvents, eventJson);
      await redis.ltrim(REDIS_KEYS.securityEvents, 0, 9999);

      // Log to application logger
      const logMethod = event.severity === 'CRITICAL' || event.severity === 'HIGH'
        ? 'warn'
        : 'info';

      logger[logMethod]({
        event: 'SECURITY_EVENT',
        ...event,
      });
    } catch (error) {
      logger.error({ error, event }, 'Failed to log security event');
    }
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(count = 100): Promise<SecurityEvent[]> {
    try {
      const events = await redis.lrange(REDIS_KEYS.securityEvents, 0, count - 1);
      return events.map((e) => {
        const parsed = JSON.parse(e);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get recent events');
      return [];
    }
  }

  /**
   * Get rate limit multiplier based on protection level
   */
  async getRateLimitMultiplier(): Promise<number> {
    const level = await this.getProtectionLevel();

    switch (level) {
      case ProtectionLevel.LOCKDOWN:
        return 0.1;  // 10% of normal limits
      case ProtectionLevel.CRITICAL:
        return 0.25; // 25% of normal limits
      case ProtectionLevel.HIGH:
        return 0.5;  // 50% of normal limits
      case ProtectionLevel.ELEVATED:
        return 0.75; // 75% of normal limits
      default:
        return 1;    // Normal limits
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async calculateBaseline(): Promise<void> {
    // In production, calculate from historical data
    // For now, set reasonable defaults
    try {
      const pipeline = redis.pipeline();
      pipeline.setnx(REDIS_KEYS.baselineRequests, '10');    // 10 req/sec baseline
      pipeline.setnx(REDIS_KEYS.baselineUniqueIps, '100');  // 100 unique IPs/min
      pipeline.setnx(REDIS_KEYS.baselineErrorRate, '0.05'); // 5% error rate
      await pipeline.exec();
    } catch (error) {
      logger.error({ error }, 'Failed to calculate baseline');
    }
  }

  private async getBaseline(): Promise<TrafficMetrics> {
    try {
      const [requests, ips, errorRate] = await Promise.all([
        redis.get(REDIS_KEYS.baselineRequests),
        redis.get(REDIS_KEYS.baselineUniqueIps),
        redis.get(REDIS_KEYS.baselineErrorRate),
      ]);

      return {
        requestsPerSecond: parseFloat(requests || '10'),
        uniqueIpsPerMinute: parseInt(ips || '100', 10),
        errorRate: parseFloat(errorRate || '0.05'),
        avgResponseTime: 100, // 100ms baseline
        failedLoginsPerMinute: 5,
      };
    } catch {
      return {
        requestsPerSecond: 10,
        uniqueIpsPerMinute: 100,
        errorRate: 0.05,
        avgResponseTime: 100,
        failedLoginsPerMinute: 5,
      };
    }
  }

  private async performThreatCheck(): Promise<void> {
    try {
      const anomaly = await this.detectAnomaly();

      if (anomaly.isAnomaly && this.config.autoProtectionEnabled) {
        const newLevel = this.severityToProtectionLevel(anomaly.severity);
        const currentLevel = await this.getProtectionLevel();

        if (newLevel > currentLevel) {
          await this.setProtectionLevel(newLevel, anomaly.types.join(', '));
        }
      }
    } catch (error) {
      logger.error({ error }, 'Threat check failed');
    }
  }

  private async updateIpReputation(ip: string, isError: boolean): Promise<void> {
    try {
      const key = REDIS_KEYS.ipReputation(ip);
      const now = Date.now().toString();

      const pipeline = redis.pipeline();
      pipeline.hincrby(key, 'totalRequests', 1);
      pipeline.hset(key, 'lastSeen', now);
      pipeline.hsetnx(key, 'firstSeen', now);
      pipeline.hsetnx(key, 'score', '100');

      if (isError) {
        pipeline.hincrby(key, 'failedRequests', 1);
        pipeline.hincrby(key, 'score', -1);
      }

      pipeline.expire(key, 86400 * 7); // 7 days

      await pipeline.exec();
    } catch (error) {
      logger.error({ error, ip }, 'Failed to update IP reputation');
    }
  }

  private calculateSeverity(anomalies: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (anomalies.length >= 3) return 'CRITICAL';
    if (anomalies.includes('IP_FLOOD') || anomalies.includes('HIGH_REQUEST_RATE')) return 'HIGH';
    if (anomalies.length >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private getSuggestedAction(anomalies: string[], severity: string): string {
    if (severity === 'CRITICAL') return 'Enable lockdown mode immediately';
    if (anomalies.includes('IP_FLOOD')) return 'Enable CAPTCHA for all requests';
    if (anomalies.includes('HIGH_REQUEST_RATE')) return 'Tighten rate limits';
    if (anomalies.includes('HIGH_ERROR_RATE')) return 'Investigate error sources';
    return 'Monitor situation';
  }

  private severityToProtectionLevel(severity: string): ProtectionLevel {
    switch (severity) {
      case 'CRITICAL':
        return ProtectionLevel.CRITICAL;
      case 'HIGH':
        return ProtectionLevel.HIGH;
      case 'MEDIUM':
        return ProtectionLevel.ELEVATED;
      default:
        return ProtectionLevel.NORMAL;
    }
  }

  private async applyProtectionMeasures(level: ProtectionLevel): Promise<void> {
    const multiplier = await this.getRateLimitMultiplier();
    await redis.set(REDIS_KEYS.rateLimitMultiplier, multiplier.toString());

    // Additional measures based on level
    if (level >= ProtectionLevel.CRITICAL) {
      // Enable global CAPTCHA
      await redis.setex('security:global:captcha-mode', 1800, '1');
    }
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

export function createThreatDetectionMiddleware(service: ThreatDetectionService) {
  return async function threatDetectionMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    const ip = getClientIp(request);

    // Check whitelist first
    if (await service.isWhitelisted(ip)) {
      return done();
    }

    // Check blacklist
    if (await service.isBlacklisted(ip)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: 'Access denied',
        },
      });
    }

    // Check protection level for lockdown
    const protectionLevel = await service.getProtectionLevel();
    if (protectionLevel === ProtectionLevel.LOCKDOWN) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
        },
      });
    }

    return done();
  };
}

// Export singleton instance
export const threatDetectionService = new ThreatDetectionService();
