import { prisma } from '../../config/database.js';
import { leaderboard, cache } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { notifyUser } from '../notifications/notification.service.js';

// Level thresholds
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000,
  15000, 20000, 27000, 35000, 45000, 57000, 71000, 87000, 105000, 125000,
];

// Rank thresholds
const RANK_THRESHOLDS: Record<string, number> = {
  ROOKIE: 0,
  APPRENTICE: 1000,
  SPECIALIST: 5000,
  EXPERT: 15000,
  MASTER: 35000,
  GRANDMASTER: 70000,
  LEGEND: 120000,
  MYTHIC: 200000,
};

export async function addPoints(
  userId: string,
  points: number,
  type: 'TASK_COMPLETED' | 'BONUS' | 'STREAK' | 'ACHIEVEMENT' | 'QUEST' | 'COMPETITION' | 'REFERRAL' | 'PENALTY',
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Create transaction record
    await prisma.pointTransaction.create({
      data: {
        userId,
        points,
        type,
        reason,
        metadata,
      },
    });

    // Update user totals
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: { increment: points },
        experiencePoints: { increment: points },
      },
    });

    // Check for level up
    const newLevel = calculateLevel(user.experiencePoints);
    if (newLevel > user.currentLevel) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentLevel: newLevel },
      });

      await notifyUser(userId, {
        type: 'LEVEL_UP',
        title: 'Level Up!',
        message: `You've reached level ${newLevel}!`,
        data: { level: newLevel },
      });

      logger.info({ userId, newLevel }, 'User leveled up');
    }

    // Check for rank up
    const newRank = calculateRank(user.totalPoints + points);
    if (newRank !== user.currentRank) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentRank: newRank },
      });

      await notifyUser(userId, {
        type: 'RANK_UP',
        title: 'Rank Up!',
        message: `You've achieved the rank of ${newRank}!`,
        data: { rank: newRank },
      });

      logger.info({ userId, newRank }, 'User ranked up');
    }

    // Update leaderboards in Redis
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${getWeekNumber(now)}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await Promise.all([
      leaderboard.updateScore('leaderboard:users:all', userId, user.totalPoints + points),
      leaderboard.updateScore(`leaderboard:users:weekly:${weekKey}`, userId, points),
      leaderboard.updateScore(`leaderboard:users:monthly:${monthKey}`, userId, points),
    ]);

    // Update team leaderboard if user belongs to a team
    if (user.teamId) {
      const teamPoints = await prisma.user.aggregate({
        where: { teamId: user.teamId },
        _sum: { totalPoints: true },
      });

      await Promise.all([
        leaderboard.updateScore('leaderboard:teams:all', user.teamId, teamPoints._sum.totalPoints || 0),
        prisma.team.update({
          where: { id: user.teamId },
          data: {
            totalPoints: teamPoints._sum.totalPoints || 0,
          },
        }),
      ]);
    }

    // Invalidate caches
    await cache.del(`user:${userId}`);

    logger.info({ userId, points, type, reason }, 'Points added');
  } catch (error) {
    logger.error({ error, userId, points }, 'Failed to add points');
    throw error;
  }
}

export async function deductPoints(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  await addPoints(userId, -points, 'PENALTY', reason);
}

function calculateLevel(experiencePoints: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (experiencePoints >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

function calculateRank(totalPoints: number): string {
  const ranks = Object.entries(RANK_THRESHOLDS).sort((a, b) => b[1] - a[1]);
  for (const [rank, threshold] of ranks) {
    if (totalPoints >= threshold) {
      return rank;
    }
  }
  return 'ROOKIE';
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function updateStreak(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true, streak: true },
  });

  if (!user) return;

  const now = new Date();
  const lastActive = user.lastActiveAt;

  if (lastActive) {
    const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day - increase streak
      const newStreak = user.streak + 1;
      await prisma.user.update({
        where: { id: userId },
        data: { streak: newStreak, lastActiveAt: now },
      });

      // Award streak bonus every 7 days
      if (newStreak % 7 === 0) {
        await addPoints(userId, newStreak * 5, 'STREAK', `${newStreak}-day streak bonus!`);
      }
    } else if (diffDays > 1) {
      // Streak broken
      await prisma.user.update({
        where: { id: userId },
        data: { streak: 1, lastActiveAt: now },
      });
    }
  } else {
    // First activity
    await prisma.user.update({
      where: { id: userId },
      data: { streak: 1, lastActiveAt: now },
    });
  }
}
