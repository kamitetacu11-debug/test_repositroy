import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { cache } from '../../config/redis.js';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatar: z.string().url().optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // List users (with pagination)
  app.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'Get all users with pagination',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          teamId: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { page = 1, limit = 20, teamId, search } = request.query as {
      page?: number;
      limit?: number;
      teamId?: string;
      search?: string;
    };

    const where = {
      ...(teamId && { teamId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          totalPoints: true,
          currentLevel: true,
          currentRank: true,
          team: { select: { id: true, name: true } },
          lastActiveAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { totalPoints: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // Get user by ID
  app.get('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Get user by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Try cache first
    const cached = await cache.get<typeof user>(`user:${id}`);
    if (cached) {
      return { success: true, data: cached };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        totalPoints: true,
        currentLevel: true,
        currentRank: true,
        experiencePoints: true,
        streak: true,
        team: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        lastActiveAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Cache for 5 minutes
    await cache.set(`user:${id}`, user, 300);

    return { success: true, data: user };
  });

  // Update user profile
  app.patch('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Update user profile',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId, role } = request.user as { userId: string; role: string };

    // Users can only update themselves, admins can update anyone
    if (userId !== id && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    const body = updateUserSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    });

    // Invalidate cache
    await cache.del(`user:${id}`);

    return { success: true, data: user };
  });

  // Get user stats
  app.get('/:id/stats', {
    schema: {
      tags: ['Users'],
      summary: 'Get user statistics',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const [
      user,
      tasksCompleted,
      tasksInProgress,
      totalTasks,
      recentPoints,
      achievements,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          totalPoints: true,
          currentLevel: true,
          currentRank: true,
          streak: true,
        },
      }),
      prisma.task.count({
        where: { assigneeId: id, status: 'COMPLETED' },
      }),
      prisma.task.count({
        where: { assigneeId: id, status: 'IN_PROGRESS' },
      }),
      prisma.task.count({
        where: { assigneeId: id },
      }),
      prisma.pointTransaction.aggregate({
        where: {
          userId: id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { points: true },
      }),
      prisma.userAchievement.count({
        where: { userId: id },
      }),
    ]);

    return {
      success: true,
      data: {
        ...user,
        tasksCompleted,
        tasksInProgress,
        totalTasks,
        weeklyPoints: recentPoints._sum.points || 0,
        achievementsCount: achievements,
        completionRate: totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0,
      },
    };
  });

  // Get user activity feed
  app.get('/:id/activity', {
    schema: {
      tags: ['Users'],
      summary: 'Get user activity feed',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { limit = 20 } = request.query as { limit?: number };

    const activities = await prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: activities,
    };
  });
};
