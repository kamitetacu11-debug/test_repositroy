import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../config/database.js';

export const pointsRoutes: FastifyPluginAsync = async (app) => {
  // Get user points history
  app.get('/history', {
    schema: {
      tags: ['Points'],
      summary: 'Get current user points history',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          type: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };
    const { page = 1, limit = 20, type } = request.query as {
      page?: number;
      limit?: number;
      type?: string;
    };

    const where = {
      userId,
      ...(type && { type: type as any }),
    };

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pointTransaction.count({ where }),
    ]);

    return {
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // Get points summary
  app.get('/summary', {
    schema: {
      tags: ['Points'],
      summary: 'Get current user points summary',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [user, daily, weekly, monthly, byType] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true, currentLevel: true, currentRank: true, experiencePoints: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId, createdAt: { gte: startOfDay } },
        _sum: { points: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId, createdAt: { gte: startOfWeek } },
        _sum: { points: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { points: true },
      }),
      prisma.pointTransaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { points: true },
      }),
    ]);

    return {
      success: true,
      data: {
        total: user?.totalPoints || 0,
        level: user?.currentLevel || 1,
        rank: user?.currentRank || 'ROOKIE',
        experience: user?.experiencePoints || 0,
        daily: daily._sum.points || 0,
        weekly: weekly._sum.points || 0,
        monthly: monthly._sum.points || 0,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._sum.points || 0;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  });

  // Admin: Award bonus points
  app.post('/award', {
    schema: {
      tags: ['Points'],
      summary: 'Award bonus points to user (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { role } = request.user as { role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    const { targetUserId, points, reason } = request.body as {
      targetUserId: string;
      points: number;
      reason: string;
    };

    const { addPoints } = await import('./points.service.js');
    await addPoints(targetUserId, points, 'BONUS', reason);

    return {
      success: true,
      message: `Awarded ${points} points to user`,
    };
  });
};
