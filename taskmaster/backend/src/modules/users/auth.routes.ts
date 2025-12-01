import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import {
  bruteForceService,
  captchaService,
  getClientIp,
  generateDeviceFingerprint,
  threatDetectionService,
  SecurityEventType,
} from '../security/index.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Register
  app.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register new user',
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(409).send({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User already exists' },
      });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        totalPoints: true,
        currentLevel: true,
        currentRank: true,
      },
    });

    const token = app.jwt.sign({ userId: user.id, role: user.role });

    logger.info({ userId: user.id }, 'User registered');

    return reply.status(201).send({
      success: true,
      data: { user, token },
    });
  });

  // Login
  app.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login user',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          captchaToken: { type: 'string', description: 'CAPTCHA token if required' },
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const ip = getClientIp(request);
    const deviceFingerprint = generateDeviceFingerprint(request);
    const captchaToken = (request.body as any).captchaToken;

    // Check brute-force protection
    const bruteForceCheck = await bruteForceService.checkLoginAttempt(
      ip,
      body.email,
      deviceFingerprint
    );

    if (!bruteForceCheck.allowed) {
      // Log security event
      await threatDetectionService.logSecurityEvent({
        type: SecurityEventType.BRUTE_FORCE_DETECTED,
        severity: 'HIGH',
        ip,
        path: '/api/v1/auth/login',
        method: 'POST',
        userAgent: request.headers['user-agent'] || '',
        details: {
          email: body.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
          lockoutLevel: bruteForceCheck.lockoutLevel,
          lockoutUntil: bruteForceCheck.lockoutUntil,
        },
        timestamp: new Date(),
      });

      return reply.status(429).send({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many login attempts. Please try again later.',
          lockoutUntil: bruteForceCheck.lockoutUntil?.toISOString(),
          requiresCaptcha: bruteForceCheck.requiresCaptcha,
          captcha: bruteForceCheck.requiresCaptcha ? captchaService.getClientConfig() : undefined,
        },
      });
    }

    // Check CAPTCHA if required
    if (bruteForceCheck.requiresCaptcha) {
      if (!captchaToken) {
        return reply.status(428).send({
          success: false,
          error: {
            code: 'CAPTCHA_REQUIRED',
            message: 'CAPTCHA verification required',
            attemptsRemaining: bruteForceCheck.attemptsRemaining,
            captcha: captchaService.getClientConfig(),
          },
        });
      }

      const captchaResult = await captchaService.verify(captchaToken, ip);
      if (!captchaResult.success) {
        await threatDetectionService.logSecurityEvent({
          type: SecurityEventType.CAPTCHA_FAILED,
          severity: 'MEDIUM',
          ip,
          path: '/api/v1/auth/login',
          method: 'POST',
          userAgent: request.headers['user-agent'] || '',
          details: { errors: captchaResult.errorCodes },
          timestamp: new Date(),
        });

        return reply.status(403).send({
          success: false,
          error: {
            code: 'CAPTCHA_FAILED',
            message: 'CAPTCHA verification failed',
            captcha: captchaService.getClientConfig(),
          },
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      // Record failed attempt
      await bruteForceService.recordFailedAttempt(ip, body.email, deviceFingerprint);

      await threatDetectionService.logSecurityEvent({
        type: SecurityEventType.FAILED_LOGIN,
        severity: 'LOW',
        ip,
        path: '/api/v1/auth/login',
        method: 'POST',
        userAgent: request.headers['user-agent'] || '',
        details: {
          email: body.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          reason: 'USER_NOT_FOUND',
        },
        timestamp: new Date(),
      });

      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }

    const isValidPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!isValidPassword) {
      // Record failed attempt
      await bruteForceService.recordFailedAttempt(ip, body.email, deviceFingerprint);

      await threatDetectionService.logSecurityEvent({
        type: SecurityEventType.FAILED_LOGIN,
        severity: 'LOW',
        ip,
        userId: user.id,
        path: '/api/v1/auth/login',
        method: 'POST',
        userAgent: request.headers['user-agent'] || '',
        details: {
          email: body.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          reason: 'INVALID_PASSWORD',
        },
        timestamp: new Date(),
      });

      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }

    // Clear brute-force counters on successful login
    await bruteForceService.recordSuccessfulLogin(ip, body.email, deviceFingerprint);

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = app.jwt.sign({ userId: user.id, role: user.role });

    logger.info({ userId: user.id, ip }, 'User logged in');

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          totalPoints: user.totalPoints,
          currentLevel: user.currentLevel,
          currentRank: user.currentRank,
          avatar: user.avatar,
        },
        token,
      },
    };
  });

  // Get current user
  app.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        department: true,
        achievements: {
          include: { achievement: true },
          take: 5,
          orderBy: { unlockedAt: 'desc' },
        },
      },
    });

    return {
      success: true,
      data: user,
    };
  });

  // Refresh token
  app.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Refresh JWT token',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId, role } = request.user as { userId: string; role: string };
    const token = app.jwt.sign({ userId, role });

    return {
      success: true,
      data: { token },
    };
  });

  // Logout (client-side, but log it)
  app.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };
    logger.info({ userId }, 'User logged out');

    return {
      success: true,
      message: 'Logged out successfully',
    };
  });

  // Development-only endpoint to reset brute-force protection
  // Only available for localhost requests
  app.post('/dev/reset-lockout', {
    schema: {
      tags: ['Auth'],
      summary: 'Reset brute-force lockout (localhost only)',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request, reply) => {
    const ip = getClientIp(request);

    // Only allow from localhost
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';
    if (!isLocalhost) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'This endpoint is only available from localhost' },
      });
    }

    const { email } = (request.body as { email?: string }) || {};

    // Reset IP lockout
    await bruteForceService.unlockIp(ip);

    // Reset account lockout if email provided
    if (email) {
      await bruteForceService.unlockAccount(email);
    }

    logger.info({ ip, email }, 'Brute-force lockout reset via dev endpoint');

    return {
      success: true,
      message: 'Lockout has been reset',
    };
  });
};

// JWT verification decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

import { FastifyRequest, FastifyReply } from 'fastify';

// Wrap with fastify-plugin to break encapsulation and make decorator available globally
export const authPlugin = fp(async (app) => {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  });
}, { name: 'auth-plugin' });
