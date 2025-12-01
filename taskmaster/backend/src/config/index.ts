import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/taskmaster'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('taskmaster-super-secret-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:8081'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OPENAI_API_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  // Security settings
  CAPTCHA_PROVIDER: z.enum(['recaptcha', 'hcaptcha', 'turnstile', 'disabled']).default('disabled'),
  CAPTCHA_SITE_KEY: z.string().optional(),
  CAPTCHA_SECRET_KEY: z.string().optional(),
  CAPTCHA_SCORE_THRESHOLD: z.string().default('0.5'),
  // Rate limiting
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  // Brute force protection
  BRUTE_FORCE_MAX_ATTEMPTS: z.string().default('5'),
  BRUTE_FORCE_LOCKOUT_MINUTES: z.string().default('15'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  port: parseInt(env.PORT, 10),
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  corsOrigins: env.CORS_ORIGINS.split(','),
  logLevel: env.LOG_LEVEL,
  openaiApiKey: env.OPENAI_API_KEY,
  s3: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
  },
  // Security configuration
  security: {
    captcha: {
      provider: env.CAPTCHA_PROVIDER as 'recaptcha' | 'hcaptcha' | 'turnstile' | 'disabled',
      siteKey: env.CAPTCHA_SITE_KEY || '',
      secretKey: env.CAPTCHA_SECRET_KEY || '',
      scoreThreshold: parseFloat(env.CAPTCHA_SCORE_THRESHOLD),
    },
    rateLimit: {
      max: parseInt(env.RATE_LIMIT_MAX, 10),
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    },
    bruteForce: {
      maxAttempts: parseInt(env.BRUTE_FORCE_MAX_ATTEMPTS, 10),
      lockoutMinutes: parseInt(env.BRUTE_FORCE_LOCKOUT_MINUTES, 10),
    },
  },
};

export type Config = typeof config;
