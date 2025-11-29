import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../config/database.js';

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // Get user notifications
  app.get('/', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get user notifications',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          unreadOnly: { type: 'boolean', default: false },
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };
    const { unreadOnly = false, limit = 20 } = request.query as {
      unreadOnly?: boolean;
      limit?: number;
    };

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    };
  });

  // Mark notification as read
  app.patch('/:id/read', {
    schema: {
      tags: ['Notifications'],
      summary: 'Mark notification as read',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user as { userId: string };

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { success: true };
  });

  // Mark all as read
  app.patch('/read-all', {
    schema: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request) => {
    const { userId } = request.user as { userId: string };

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  });

  // Delete notification
  app.delete('/:id', {
    schema: {
      tags: ['Notifications'],
      summary: 'Delete notification',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user as { userId: string };

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    await prisma.notification.delete({ where: { id } });

    return { success: true };
  });

  // Get notification preferences (placeholder for future)
  app.get('/preferences', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification preferences',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  }, async () => {
    return {
      success: true,
      data: {
        email: {
          taskAssigned: true,
          taskCompleted: true,
          achievementUnlocked: true,
          weeklyDigest: true,
        },
        push: {
          taskAssigned: true,
          taskDueSoon: true,
          achievementUnlocked: true,
          teamUpdates: true,
        },
        inApp: {
          all: true,
        },
      },
    };
  });
};
