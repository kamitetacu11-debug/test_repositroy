import OpenAI from 'openai';
import { prisma } from '../../config/database.js';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

interface TaskAnalysis {
  priority: number; // 0-1
  estimatedMinutes: number;
  suggestedTags: string[];
  suggestions: {
    breakdown?: string[];
    dependencies?: string[];
    tips?: string[];
  };
}

export async function analyzeTask(title: string, description?: string): Promise<TaskAnalysis | null> {
  // Fallback if no OpenAI key
  if (!openai) {
    return getFallbackAnalysis(title, description);
  }

  try {
    const prompt = `Analyze this task and provide JSON response:
Title: ${title}
Description: ${description || 'No description'}

Respond with JSON only:
{
  "priority": <0-1 float, 1 being highest priority>,
  "estimatedMinutes": <estimated completion time in minutes>,
  "suggestedTags": [<relevant tags>],
  "suggestions": {
    "breakdown": [<subtask suggestions if complex>],
    "dependencies": [<potential blockers>],
    "tips": [<productivity tips>]
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Store analysis
    await prisma.aIAnalysis.create({
      data: {
        type: 'TASK_PRIORITY',
        entityType: 'Task',
        entityId: 'new',
        result,
        confidence: result.priority,
        modelVersion: 'gpt-3.5-turbo',
        processingTime: 0,
      },
    });

    return result as TaskAnalysis;
  } catch (error) {
    logger.error({ error }, 'AI task analysis failed');
    return getFallbackAnalysis(title, description);
  }
}

function getFallbackAnalysis(title: string, description?: string): TaskAnalysis {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Simple heuristics
  let priority = 0.5;
  let estimatedMinutes = 60;

  if (text.includes('urgent') || text.includes('asap') || text.includes('critical')) {
    priority = 0.9;
  } else if (text.includes('bug') || text.includes('fix') || text.includes('error')) {
    priority = 0.7;
  } else if (text.includes('nice to have') || text.includes('low priority')) {
    priority = 0.3;
  }

  if (text.includes('quick') || text.includes('small') || text.includes('minor')) {
    estimatedMinutes = 30;
  } else if (text.includes('large') || text.includes('complex') || text.includes('refactor')) {
    estimatedMinutes = 240;
  }

  const tags: string[] = [];
  if (text.includes('bug') || text.includes('fix')) tags.push('bug');
  if (text.includes('feature')) tags.push('feature');
  if (text.includes('docs') || text.includes('documentation')) tags.push('docs');
  if (text.includes('test')) tags.push('testing');
  if (text.includes('design') || text.includes('ui')) tags.push('design');

  return {
    priority,
    estimatedMinutes,
    suggestedTags: tags,
    suggestions: {
      tips: ['Break down large tasks into smaller subtasks', 'Set clear acceptance criteria'],
    },
  };
}

export async function predictWorkload(userId: string): Promise<{
  currentLoad: number;
  predictedLoad: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}> {
  const [pendingTasks, avgCompletionRate] = await Promise.all([
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: 'COMPLETED',
        completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const dailyAvg = avgCompletionRate / 7;
  const daysToComplete = dailyAvg > 0 ? pendingTasks / dailyAvg : pendingTasks;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const recommendations: string[] = [];

  if (daysToComplete > 14) {
    riskLevel = 'high';
    recommendations.push('Consider delegating some tasks');
    recommendations.push('Review task priorities and drop low-value items');
  } else if (daysToComplete > 7) {
    riskLevel = 'medium';
    recommendations.push('Focus on high-priority tasks first');
  }

  return {
    currentLoad: pendingTasks,
    predictedLoad: Math.round(daysToComplete),
    riskLevel,
    recommendations,
  };
}

export async function detectAnomalies(teamId?: string): Promise<{
  anomalies: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    userId?: string;
    teamId?: string;
  }>;
}> {
  const anomalies: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    userId?: string;
    teamId?: string;
  }> = [];

  // Find users with sudden productivity drops
  const users = await prisma.user.findMany({
    where: teamId ? { teamId } : {},
    select: {
      id: true,
      firstName: true,
      lastName: true,
      streak: true,
      lastActiveAt: true,
    },
  });

  for (const user of users) {
    // Check for inactivity
    if (user.lastActiveAt) {
      const daysSinceActive = Math.floor(
        (Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActive > 7) {
        anomalies.push({
          type: 'INACTIVITY',
          severity: 'warning',
          message: `${user.firstName} ${user.lastName} has been inactive for ${daysSinceActive} days`,
          userId: user.id,
        });
      }
    }

    // Check for broken streaks (had streak > 7, now 0)
    if (user.streak === 0) {
      const hadStreak = await prisma.pointTransaction.findFirst({
        where: {
          userId: user.id,
          type: 'STREAK',
          createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      });

      if (hadStreak) {
        anomalies.push({
          type: 'STREAK_BROKEN',
          severity: 'info',
          message: `${user.firstName} ${user.lastName}'s streak was recently broken`,
          userId: user.id,
        });
      }
    }
  }

  // Check for tasks stuck in progress too long
  const stuckTasks = await prisma.task.findMany({
    where: {
      status: 'IN_PROGRESS',
      startedAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      ...(teamId && { teamId }),
    },
    include: {
      assignee: { select: { firstName: true, lastName: true } },
    },
  });

  for (const task of stuckTasks) {
    anomalies.push({
      type: 'STUCK_TASK',
      severity: 'warning',
      message: `Task "${task.title}" has been in progress for over a week`,
      userId: task.assigneeId || undefined,
    });
  }

  return { anomalies };
}

export async function getRecommendations(userId: string): Promise<{
  nextTasks: Array<{ taskId: string; title: string; reason: string }>;
  skillGaps: string[];
  growthAreas: string[];
}> {
  // Get user's pending tasks
  const pendingTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    take: 5,
  });

  const nextTasks = pendingTasks.map((task, index) => ({
    taskId: task.id,
    title: task.title,
    reason: index === 0
      ? 'Highest priority task'
      : task.dueDate && task.dueDate < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        ? 'Due soon'
        : 'In your queue',
  }));

  // Analyze completed tasks for patterns
  const completedTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: 'COMPLETED',
    },
    select: { aiTags: true },
    take: 50,
  });

  const tagCounts: Record<string, number> = {};
  for (const task of completedTasks) {
    for (const tag of task.aiTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return {
    nextTasks,
    skillGaps: ['Consider taking on more diverse task types'],
    growthAreas: topTags.length > 0
      ? [`Strong in: ${topTags.join(', ')}`]
      : ['Complete more tasks to identify your strengths'],
  };
}
