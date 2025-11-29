import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

interface NotificationPayload {
  type: 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'TASK_DUE_SOON' | 'ACHIEVEMENT_UNLOCKED' |
        'LEVEL_UP' | 'RANK_UP' | 'QUEST_COMPLETED' | 'TEAM_COMPETITION' | 'MENTION' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, any>;
}

// Store WebSocket connections
const connections = new Map<string, Set<WebSocket>>();

export function addConnection(userId: string, ws: WebSocket): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);
  logger.debug({ userId }, 'WebSocket connected');
}

export function removeConnection(userId: string, ws: WebSocket): void {
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.delete(ws);
    if (userConnections.size === 0) {
      connections.delete(userId);
    }
  }
  logger.debug({ userId }, 'WebSocket disconnected');
}

export async function notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    // Save to database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
      },
    });

    // Send via WebSocket if connected
    const userConnections = connections.get(userId);
    if (userConnections && userConnections.size > 0) {
      const message = JSON.stringify({
        event: 'notification',
        data: notification,
      });

      for (const ws of userConnections) {
        if (ws.readyState === 1) { // OPEN
          ws.send(message);
        }
      }
    }

    // Publish to Redis for multi-instance support
    await redis.publish(`notifications:${userId}`, JSON.stringify(notification));

    logger.info({ userId, type: payload.type }, 'Notification sent');
  } catch (error) {
    logger.error({ error, userId, payload }, 'Failed to send notification');
  }
}

export async function notifyTeam(teamId: string, payload: NotificationPayload): Promise<void> {
  const members = await prisma.user.findMany({
    where: { teamId },
    select: { id: true },
  });

  await Promise.all(members.map(member => notifyUser(member.id, payload)));
}

export async function broadcastToUser(userId: string, event: string, data: any): Promise<void> {
  const userConnections = connections.get(userId);
  if (userConnections && userConnections.size > 0) {
    const message = JSON.stringify({ event, data });

    for (const ws of userConnections) {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    }
  }

  // Also publish to Redis
  await redis.publish(`broadcast:${userId}`, JSON.stringify({ event, data }));
}

// Subscribe to Redis channels for multi-instance support
export async function setupRedisSubscriptions(): Promise<void> {
  const subscriber = redis.duplicate();

  subscriber.psubscribe('notifications:*', 'broadcast:*');

  subscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const userId = channel.split(':')[1];
      const data = JSON.parse(message);
      const userConnections = connections.get(userId);

      if (userConnections) {
        const payload = JSON.stringify({
          event: pattern.startsWith('notifications') ? 'notification' : data.event,
          data: pattern.startsWith('notifications') ? data : data.data,
        });

        for (const ws of userConnections) {
          if (ws.readyState === 1) {
            ws.send(payload);
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to process Redis message');
    }
  });
}
