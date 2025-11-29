import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { cache } from '../../config/redis.js';
import { addPoints } from '../points/points.service.js';
import { checkAchievements } from '../gamification/achievement.service.js';
import { notifyUser } from '../notifications/notification.service.js';
import { analyzeTask } from '../ai/ai.service.js';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  parentTaskId: z.string().optional(),
  basePoints: z.number().min(1).max(1000).default(10),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const taskRoutes: FastifyPluginAsync = async (app) => {
  // Create task
  app.post('/', {
    schema: {
      tags: ['Tasks'],
      summary: 'Create new task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user as { userId: string };
    const body = createTaskSchema.parse(request.body);

    // AI analysis for priority and time estimation
    const aiAnalysis = await analyzeTask(body.title, body.description);

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        creatorId: userId,
        assigneeId: body.assigneeId,
        teamId: body.teamId,
        projectId: body.projectId,
        parentTaskId: body.parentTaskId,
        basePoints: body.basePoints,
        aiPriority: aiAnalysis?.priority,
        aiEstimatedTime: aiAnalysis?.estimatedMinutes,
        aiTags: aiAnalysis?.suggestedTags || [],
        aiSuggestions: aiAnalysis?.suggestions,
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Notify assignee
    if (body.assigneeId && body.assigneeId !== userId) {
      await notifyUser(body.assigneeId, {
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You've been assigned: ${task.title}`,
        data: { taskId: task.id },
      });
    }

    return reply.status(201).send({
      success: true,
      data: task,
    });
  });

  // List tasks
  app.get('/', {
    schema: {
      tags: ['Tasks'],
      summary: 'Get all tasks with filters',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          status: { type: 'string' },
          priority: { type: 'string' },
          assigneeId: { type: 'string' },
          teamId: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assigneeId,
      teamId,
      search
    } = request.query as {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      assigneeId?: string;
      teamId?: string;
      search?: string;
    };

    const where = {
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any }),
      ...(assigneeId && { assigneeId }),
      ...(teamId && { teamId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          team: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          _count: { select: { subTasks: true, comments: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.task.count({ where }),
    ]);

    return {
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // Get task by ID
  app.get('/:id', {
    schema: {
      tags: ['Tasks'],
      summary: 'Get task by ID',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        parentTask: { select: { id: true, title: true } },
        subTasks: {
          select: { id: true, title: true, status: true, priority: true },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tags: { include: { tag: true } },
        attachments: true,
      },
    });

    if (!task) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    return { success: true, data: task };
  });

  // Update task
  app.patch('/:id', {
    schema: {
      tags: ['Tasks'],
      summary: 'Update task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user as { userId: string };
    const body = updateTaskSchema.parse(request.body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { status: true, assigneeId: true, basePoints: true, bonusPoints: true },
    });

    if (!existingTask) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Handle status changes
    const updateData: any = { ...body };

    if (body.status === 'IN_PROGRESS' && existingTask.status === 'TODO') {
      updateData.startedAt = new Date();
    }

    if (body.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      updateData.completedAt = new Date();

      // Award points to assignee
      if (existingTask.assigneeId) {
        const totalPoints = existingTask.basePoints + existingTask.bonusPoints;
        await addPoints(existingTask.assigneeId, totalPoints, 'TASK_COMPLETED', `Completed task: ${id}`);
        await checkAchievements(existingTask.assigneeId);
      }
    }

    if (body.dueDate) {
      updateData.dueDate = new Date(body.dueDate);
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'TASK_UPDATED',
        entity: 'Task',
        entityId: id,
        metadata: { changes: body },
      },
    });

    return { success: true, data: task };
  });

  // Delete task
  app.delete('/:id', {
    schema: {
      tags: ['Tasks'],
      summary: 'Delete task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId, role } = request.user as { userId: string; role: string };

    const task = await prisma.task.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!task) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Only creator or admin can delete
    if (task.creatorId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    await prisma.task.delete({ where: { id } });

    return { success: true, message: 'Task deleted' };
  });

  // Add comment
  app.post('/:id/comments', {
    schema: {
      tags: ['Tasks'],
      summary: 'Add comment to task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user as { userId: string };
    const { content } = request.body as { content: string };

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        authorId: userId,
      },
    });

    return { success: true, data: comment };
  });

  // Get my tasks
  app.get('/my/assigned', {
    schema: {
      tags: ['Tasks'],
      summary: 'Get tasks assigned to current user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    const tasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        team: { select: { id: true, name: true } },
        _count: { select: { subTasks: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    return { success: true, data: tasks };
  });
};
