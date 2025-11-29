import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../config/database.js';
import { leaderboard, cache } from '../../config/redis.js';

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  // Get individual leaderboard
  app.get('/users', {
    schema: {
      tags: ['Leaderboard'],
      summary: 'Get user leaderboard',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['all', 'weekly', 'monthly'], default: 'weekly' },
          limit: { type: 'integer', default: 50 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };
    const { period = 'weekly', limit = 50 } = request.query as {
      period?: 'all' | 'weekly' | 'monthly';
      limit?: number;
    };

    const now = new Date();
    let leaderboardKey: string;

    if (period === 'all') {
      leaderboardKey = 'leaderboard:users:all';
    } else if (period === 'weekly') {
      const weekNum = getWeekNumber(now);
      leaderboardKey = `leaderboard:users:weekly:${now.getFullYear()}-W${weekNum}`;
    } else {
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      leaderboardKey = `leaderboard:users:monthly:${monthKey}`;
    }

    // Get top users from Redis
    const topUsers = await leaderboard.getTop(leaderboardKey, limit);

    // Get user details
    const userIds = topUsers.map(u => u.id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        currentLevel: true,
        currentRank: true,
        team: { select: { id: true, name: true } },
      },
    });

    const usersMap = new Map(users.map(u => [u.id, u]));

    const leaderboardData = topUsers.map(entry => ({
      ...usersMap.get(entry.id),
      points: entry.score,
      rank: entry.rank,
    }));

    // Get current user's rank
    const myRank = await leaderboard.getRank(leaderboardKey, userId);
    const myScore = await leaderboard.getScore(leaderboardKey, userId);

    return {
      success: true,
      data: {
        leaderboard: leaderboardData,
        myPosition: {
          rank: myRank,
          points: myScore,
        },
      },
    };
  });

  // Get team leaderboard
  app.get('/teams', {
    schema: {
      tags: ['Leaderboard'],
      summary: 'Get team leaderboard',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['all', 'weekly', 'monthly'], default: 'weekly' },
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { period = 'weekly', limit = 20 } = request.query as {
      period?: 'all' | 'weekly' | 'monthly';
      limit?: number;
    };

    // For simplicity, using DB query. In production, use Redis sorted sets
    const orderField = period === 'all' ? 'totalPoints' :
                       period === 'weekly' ? 'weeklyPoints' : 'monthlyPoints';

    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        totalPoints: true,
        weeklyPoints: true,
        monthlyPoints: true,
        _count: { select: { members: true } },
      },
      orderBy: { [orderField]: 'desc' },
      take: limit,
    });

    const leaderboardData = teams.map((team, index) => ({
      ...team,
      points: team[orderField as keyof typeof team],
      rank: index + 1,
      membersCount: team._count.members,
    }));

    return {
      success: true,
      data: leaderboardData,
    };
  });

  // Get department leaderboard
  app.get('/departments', {
    schema: {
      tags: ['Leaderboard'],
      summary: 'Get department leaderboard',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async () => {
    const departments = await prisma.department.findMany({
      include: {
        teams: {
          select: { totalPoints: true },
        },
        _count: { select: { users: true } },
      },
    });

    const leaderboardData = departments
      .map(dept => ({
        id: dept.id,
        name: dept.name,
        totalPoints: dept.teams.reduce((sum, t) => sum + t.totalPoints, 0),
        membersCount: dept._count.users,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((dept, index) => ({ ...dept, rank: index + 1 }));

    return {
      success: true,
      data: leaderboardData,
    };
  });

  // Get leaderboard history
  app.get('/history', {
    schema: {
      tags: ['Leaderboard'],
      summary: 'Get historical leaderboard snapshots',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', default: 'INDIVIDUAL_WEEKLY' },
          limit: { type: 'integer', default: 10 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { type = 'INDIVIDUAL_WEEKLY', limit = 10 } = request.query as {
      type?: string;
      limit?: number;
    };

    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { type: type as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: snapshots,
    };
  });
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
