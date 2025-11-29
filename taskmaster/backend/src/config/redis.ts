import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from './logger.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error({ error }, 'Redis error');
});

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Leaderboard helpers using Redis Sorted Sets
export const leaderboard = {
  async updateScore(key: string, memberId: string, score: number): Promise<void> {
    await redis.zadd(key, score, memberId);
  },

  async getTop(key: string, limit = 10): Promise<Array<{ id: string; score: number; rank: number }>> {
    const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    const leaderboard: Array<{ id: string; score: number; rank: number }> = [];

    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        id: results[i],
        score: parseInt(results[i + 1], 10),
        rank: Math.floor(i / 2) + 1,
      });
    }

    return leaderboard;
  },

  async getRank(key: string, memberId: string): Promise<number | null> {
    const rank = await redis.zrevrank(key, memberId);
    return rank !== null ? rank + 1 : null;
  },

  async getScore(key: string, memberId: string): Promise<number | null> {
    const score = await redis.zscore(key, memberId);
    return score !== null ? parseInt(score, 10) : null;
  },
};
