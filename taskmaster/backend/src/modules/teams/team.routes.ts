import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { cache, leaderboard } from '../../config/redis.js';

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  departmentId: z.string().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

export const teamRoutes: FastifyPluginAsync = async (app) => {
  // Create team
  app.post('/', {
    schema: {
      tags: ['Teams'],
      summary: 'Create new team',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { role } = request.user as { role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only admins and managers can create teams' },
      });
    }

    const body = createTeamSchema.parse(request.body);

    const team = await prisma.team.create({
      data: body,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });

    return reply.status(201).send({
      success: true,
      data: team,
    });
  });

  // List teams
  app.get('/', {
    schema: {
      tags: ['Teams'],
      summary: 'Get all teams',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { departmentId } = request.query as { departmentId?: string };

    const teams = await prisma.team.findMany({
      where: departmentId ? { departmentId } : {},
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { members: true, tasks: true } },
      },
      orderBy: { totalPoints: 'desc' },
    });

    return { success: true, data: teams };
  });

  // Get team by ID
  app.get('/:id', {
    schema: {
      tags: ['Teams'],
      summary: 'Get team by ID',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            totalPoints: true,
            currentLevel: true,
            currentRank: true,
          },
          orderBy: { totalPoints: 'desc' },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!team) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
    }

    return { success: true, data: team };
  });

  // Update team
  app.patch('/:id', {
    schema: {
      tags: ['Teams'],
      summary: 'Update team',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.user as { role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    const body = updateTeamSchema.parse(request.body);

    const team = await prisma.team.update({
      where: { id },
      data: body,
    });

    return { success: true, data: team };
  });

  // Add member to team
  app.post('/:id/members', {
    schema: {
      tags: ['Teams'],
      summary: 'Add member to team',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    const { role } = request.user as { role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TEAM_LEAD'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { teamId: id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Invalidate team cache
    await cache.del(`team:${id}`);

    return { success: true, data: user };
  });

  // Remove member from team
  app.delete('/:id/members/:userId', {
    schema: {
      tags: ['Teams'],
      summary: 'Remove member from team',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const { role } = request.user as { role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TEAM_LEAD'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
    });

    await cache.del(`team:${id}`);

    return { success: true, message: 'Member removed' };
  });

  // Get team stats
  app.get('/:id/stats', {
    schema: {
      tags: ['Teams'],
      summary: 'Get team statistics',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };

    const [
      team,
      tasksCompleted,
      tasksInProgress,
      totalTasks,
      membersCount,
    ] = await Promise.all([
      prisma.team.findUnique({
        where: { id },
        select: { totalPoints: true, weeklyPoints: true, monthlyPoints: true },
      }),
      prisma.task.count({
        where: { teamId: id, status: 'COMPLETED' },
      }),
      prisma.task.count({
        where: { teamId: id, status: 'IN_PROGRESS' },
      }),
      prisma.task.count({
        where: { teamId: id },
      }),
      prisma.user.count({
        where: { teamId: id },
      }),
    ]);

    // Get team rank
    const rank = await leaderboard.getRank('leaderboard:teams:weekly', id);

    return {
      success: true,
      data: {
        ...team,
        tasksCompleted,
        tasksInProgress,
        totalTasks,
        membersCount,
        weeklyRank: rank,
        completionRate: totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0,
      },
    };
  });

  // Get team activity feed
  app.get('/:id/activity', {
    schema: {
      tags: ['Teams'],
      summary: 'Get team activity feed',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { limit = 20 } = request.query as { limit?: number };

    const members = await prisma.user.findMany({
      where: { teamId: id },
      select: { id: true },
    });

    const memberIds = members.map(m => m.id);

    const activities = await prisma.activityLog.findMany({
      where: { userId: { in: memberIds } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, data: activities };
  });
};
