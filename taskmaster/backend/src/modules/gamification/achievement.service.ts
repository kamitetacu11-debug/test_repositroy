import { prisma } from '../../config/database.js';
import { addPoints } from '../points/points.service.js';
import { notifyUser } from '../notifications/notification.service.js';
import { logger } from '../../config/logger.js';

interface AchievementCondition {
  type: string;
  value: number;
}

export async function checkAchievements(userId: string): Promise<void> {
  try {
    // Get all achievements user doesn't have
    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedSet = new Set(unlockedIds.map(u => u.achievementId));

    const allAchievements = await prisma.achievement.findMany();
    const lockedAchievements = allAchievements.filter(a => !unlockedSet.has(a.id));

    // Get user stats for checking conditions
    const [tasksCompleted, totalPoints, streak, level] = await Promise.all([
      prisma.task.count({ where: { assigneeId: userId, status: 'COMPLETED' } }),
      prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true, streak: true, currentLevel: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { streak: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } }),
    ]);

    const stats = {
      tasks_completed: tasksCompleted,
      total_points: totalPoints?.totalPoints || 0,
      streak: streak?.streak || 0,
      level: level?.currentLevel || 1,
    };

    // Check each locked achievement
    for (const achievement of lockedAchievements) {
      const condition = achievement.condition as AchievementCondition;

      if (checkCondition(condition, stats)) {
        await unlockAchievement(userId, achievement.id, achievement.name, achievement.points);
      }
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to check achievements');
  }
}

function checkCondition(
  condition: AchievementCondition,
  stats: Record<string, number>
): boolean {
  const { type, value } = condition;

  switch (type) {
    case 'tasks_completed':
      return stats.tasks_completed >= value;
    case 'total_points':
      return stats.total_points >= value;
    case 'streak':
      return stats.streak >= value;
    case 'level':
      return stats.level >= value;
    default:
      return false;
  }
}

async function unlockAchievement(
  userId: string,
  achievementId: string,
  achievementName: string,
  points: number
): Promise<void> {
  // Create user achievement record
  await prisma.userAchievement.create({
    data: {
      userId,
      achievementId,
    },
  });

  // Award points
  await addPoints(userId, points, 'ACHIEVEMENT', `Unlocked: ${achievementName}`);

  // Notify user
  await notifyUser(userId, {
    type: 'ACHIEVEMENT_UNLOCKED',
    title: 'Achievement Unlocked!',
    message: `You've earned "${achievementName}"!`,
    data: { achievementId, achievementName, points },
  });

  logger.info({ userId, achievementId, achievementName }, 'Achievement unlocked');
}

// Seed default achievements
export async function seedAchievements(): Promise<void> {
  const achievements = [
    // Task achievements
    { name: 'First Steps', description: 'Complete your first task', icon: '🎯', rarity: 'COMMON', points: 50, condition: { type: 'tasks_completed', value: 1 } },
    { name: 'Getting Started', description: 'Complete 10 tasks', icon: '📋', rarity: 'COMMON', points: 100, condition: { type: 'tasks_completed', value: 10 } },
    { name: 'Task Master', description: 'Complete 50 tasks', icon: '✅', rarity: 'UNCOMMON', points: 250, condition: { type: 'tasks_completed', value: 50 } },
    { name: 'Productivity Pro', description: 'Complete 100 tasks', icon: '🚀', rarity: 'RARE', points: 500, condition: { type: 'tasks_completed', value: 100 } },
    { name: 'Task Legend', description: 'Complete 500 tasks', icon: '🏆', rarity: 'EPIC', points: 1000, condition: { type: 'tasks_completed', value: 500 } },
    { name: 'Task God', description: 'Complete 1000 tasks', icon: '👑', rarity: 'LEGENDARY', points: 2500, condition: { type: 'tasks_completed', value: 1000 } },

    // Streak achievements
    { name: 'Consistent', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'COMMON', points: 100, condition: { type: 'streak', value: 7 } },
    { name: 'Dedicated', description: 'Maintain a 30-day streak', icon: '💪', rarity: 'RARE', points: 500, condition: { type: 'streak', value: 30 } },
    { name: 'Unstoppable', description: 'Maintain a 100-day streak', icon: '⚡', rarity: 'LEGENDARY', points: 2000, condition: { type: 'streak', value: 100 } },

    // Level achievements
    { name: 'Novice', description: 'Reach level 5', icon: '⭐', rarity: 'COMMON', points: 100, condition: { type: 'level', value: 5 } },
    { name: 'Intermediate', description: 'Reach level 10', icon: '🌟', rarity: 'UNCOMMON', points: 250, condition: { type: 'level', value: 10 } },
    { name: 'Advanced', description: 'Reach level 15', icon: '💫', rarity: 'RARE', points: 500, condition: { type: 'level', value: 15 } },
    { name: 'Expert', description: 'Reach level 20', icon: '✨', rarity: 'EPIC', points: 1000, condition: { type: 'level', value: 20 } },

    // Points achievements
    { name: 'Point Collector', description: 'Earn 1,000 total points', icon: '💰', rarity: 'COMMON', points: 100, condition: { type: 'total_points', value: 1000 } },
    { name: 'Point Hoarder', description: 'Earn 10,000 total points', icon: '💎', rarity: 'RARE', points: 500, condition: { type: 'total_points', value: 10000 } },
    { name: 'Point Mogul', description: 'Earn 100,000 total points', icon: '🏅', rarity: 'LEGENDARY', points: 2000, condition: { type: 'total_points', value: 100000 } },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      create: achievement as any,
      update: {},
    });
  }

  logger.info('Default achievements seeded');
}
