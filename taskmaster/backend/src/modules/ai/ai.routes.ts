import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../config/database.js';
import { analyzeTask, predictWorkload, detectAnomalies, getRecommendations } from './ai.service.js';

export const aiRoutes: FastifyPluginAsync = async (app) => {
  // Analyze task
  app.post('/analyze-task', {
    schema: {
      tags: ['AI'],
      summary: 'Get AI analysis for a task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { title, description } = request.body as { title: string; description?: string };

    const analysis = await analyzeTask(title, description);

    return {
      success: true,
      data: analysis,
    };
  });

  // Predict workload
  app.get('/predict-workload/:userId', {
    schema: {
      tags: ['AI'],
      summary: 'Predict user workload for next week',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.params as { userId: string };

    const prediction = await predictWorkload(userId);

    return {
      success: true,
      data: prediction,
    };
  });

  // Detect anomalies
  app.get('/anomalies', {
    schema: {
      tags: ['AI'],
      summary: 'Detect productivity anomalies',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { teamId } = request.query as { teamId?: string };

    const anomalies = await detectAnomalies(teamId);

    return {
      success: true,
      data: anomalies,
    };
  });

  // Get task recommendations
  app.get('/recommendations', {
    schema: {
      tags: ['AI'],
      summary: 'Get personalized task recommendations',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const recommendations = await getRecommendations(userId);

    return {
      success: true,
      data: recommendations,
    };
  });

  // Get AI insights dashboard
  app.get('/insights', {
    schema: {
      tags: ['AI'],
      summary: 'Get AI-generated insights',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const [user, recentTasks, weeklyProgress] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true, currentLevel: true, streak: true },
      }),
      prisma.task.findMany({
        where: { assigneeId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { points: true },
      }),
    ]);

    const completedThisWeek = recentTasks.filter(t => t.status === 'COMPLETED').length;
    const avgCompletionTime = recentTasks
      .filter(t => t.completedAt && t.startedAt)
      .map(t => (t.completedAt!.getTime() - t.startedAt!.getTime()) / (1000 * 60 * 60));

    const insights = {
      productivity: {
        score: Math.min(100, (completedThisWeek * 10) + (user?.streak || 0) * 2),
        trend: weeklyProgress._sum.points && weeklyProgress._sum.points > 100 ? 'up' : 'stable',
        message: completedThisWeek > 5
          ? 'Great productivity this week!'
          : 'Try to complete more tasks to boost your score.',
      },
      recommendations: [
        user?.streak && user.streak > 0
          ? `Keep your ${user.streak}-day streak going!`
          : 'Start a streak by completing tasks daily.',
        recentTasks.some(t => t.status === 'BLOCKED')
          ? 'You have blocked tasks. Consider reaching out for help.'
          : null,
        avgCompletionTime.length > 0 && (avgCompletionTime.reduce((a, b) => a + b, 0) / avgCompletionTime.length) > 24
          ? 'Your average task completion time is high. Try breaking tasks into smaller pieces.'
          : null,
      ].filter(Boolean),
      weeklyStats: {
        tasksCompleted: completedThisWeek,
        pointsEarned: weeklyProgress._sum.points || 0,
        avgCompletionHours: avgCompletionTime.length > 0
          ? Math.round(avgCompletionTime.reduce((a, b) => a + b, 0) / avgCompletionTime.length)
          : null,
      },
    };

    return {
      success: true,
      data: insights,
    };
  });
};
