import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../config/database.js';

export const gamificationRoutes: FastifyPluginAsync = async (app) => {
  // Get all achievements
  app.get('/achievements', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get all achievements',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const [achievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: [{ rarity: 'asc' }, { points: 'desc' }],
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      }),
    ]);

    const unlockedMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua.unlockedAt])
    );

    const achievementsWithStatus = achievements.map(a => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id),
    }));

    return {
      success: true,
      data: achievementsWithStatus,
    };
  });

  // Get user achievements
  app.get('/achievements/my', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get current user achievements',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    return {
      success: true,
      data: achievements,
    };
  });

  // Get active quests
  app.get('/quests', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get active quests',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };
    const now = new Date();

    const quests = await prisma.quest.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        progress: {
          where: { userId },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    const questsWithProgress = quests.map(quest => ({
      id: quest.id,
      name: quest.name,
      description: quest.description,
      type: quest.type,
      target: quest.target,
      reward: quest.reward,
      endDate: quest.endDate,
      progress: quest.progress[0]?.progress || 0,
      completed: quest.progress[0]?.completed || false,
      percentage: Math.min(100, Math.round(((quest.progress[0]?.progress || 0) / quest.target) * 100)),
    }));

    return {
      success: true,
      data: questsWithProgress,
    };
  });

  // Get competitions
  app.get('/competitions', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get active team competitions',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async () => {
    const now = new Date();

    const competitions = await prisma.teamCompetition.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            avatar: true,
            weeklyPoints: true,
          },
          orderBy: { weeklyPoints: 'desc' },
        },
      },
    });

    return {
      success: true,
      data: competitions,
    };
  });

  // Get level info
  app.get('/levels', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get level progression info',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true, experiencePoints: true },
    });

    const LEVEL_THRESHOLDS = [
      0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000,
      15000, 20000, 27000, 35000, 45000, 57000, 71000, 87000, 105000, 125000,
    ];

    const currentLevel = user?.currentLevel || 1;
    const currentXP = user?.experiencePoints || 0;
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

    return {
      success: true,
      data: {
        currentLevel,
        currentXP,
        xpForCurrentLevel: currentThreshold,
        xpForNextLevel: nextThreshold,
        xpProgress: currentXP - currentThreshold,
        xpNeeded: nextThreshold - currentThreshold,
        progressPercentage: Math.round(((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100),
        levels: LEVEL_THRESHOLDS.map((threshold, i) => ({
          level: i + 1,
          threshold,
          unlocked: currentXP >= threshold,
        })),
      },
    };
  });

  // Get ranks info
  app.get('/ranks', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get rank progression info',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentRank: true, totalPoints: true },
    });

    const RANKS = [
      { name: 'ROOKIE', threshold: 0, icon: '🌱', color: '#9CA3AF' },
      { name: 'APPRENTICE', threshold: 1000, icon: '⚡', color: '#60A5FA' },
      { name: 'SPECIALIST', threshold: 5000, icon: '🎯', color: '#34D399' },
      { name: 'EXPERT', threshold: 15000, icon: '💎', color: '#A78BFA' },
      { name: 'MASTER', threshold: 35000, icon: '👑', color: '#FBBF24' },
      { name: 'GRANDMASTER', threshold: 70000, icon: '🏆', color: '#F97316' },
      { name: 'LEGEND', threshold: 120000, icon: '⭐', color: '#EF4444' },
      { name: 'MYTHIC', threshold: 200000, icon: '🔥', color: '#EC4899' },
    ];

    const currentPoints = user?.totalPoints || 0;
    const currentRankIndex = RANKS.findIndex(r => r.name === user?.currentRank) || 0;
    const nextRank = RANKS[currentRankIndex + 1];

    return {
      success: true,
      data: {
        currentRank: user?.currentRank || 'ROOKIE',
        currentPoints,
        nextRank: nextRank?.name,
        pointsForNextRank: nextRank?.threshold,
        pointsNeeded: nextRank ? nextRank.threshold - currentPoints : 0,
        ranks: RANKS.map(rank => ({
          ...rank,
          unlocked: currentPoints >= rank.threshold,
          current: rank.name === user?.currentRank,
        })),
      },
    };
  });
};
