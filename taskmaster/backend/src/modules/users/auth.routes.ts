import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

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
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }

    const isValidPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!isValidPassword) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = app.jwt.sign({ userId: user.id, role: user.role });

    logger.info({ userId: user.id }, 'User logged in');

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
};

// JWT verification decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

import { FastifyRequest, FastifyReply } from 'fastify';

export const authPlugin: FastifyPluginAsync = async (app) => {
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
};
