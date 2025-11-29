import { FastifyInstance } from 'fastify';
import { addConnection, removeConnection, setupRedisSubscriptions } from './notification.service.js';
import { logger } from '../../config/logger.js';

export function setupWebSocket(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (connection, request) => {
    const ws = connection.socket;
    let userId: string | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.event) {
          case 'auth':
            // Verify JWT and extract userId
            try {
              const decoded = app.jwt.verify<{ userId: string }>(data.token);
              userId = decoded.userId;
              addConnection(userId, ws as unknown as WebSocket);

              ws.send(JSON.stringify({
                event: 'auth:success',
                data: { userId },
              }));

              logger.info({ userId }, 'WebSocket authenticated');
            } catch {
              ws.send(JSON.stringify({
                event: 'auth:error',
                data: { message: 'Invalid token' },
              }));
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ event: 'pong' }));
            break;

          case 'subscribe':
            // Subscribe to specific channels (e.g., team updates)
            if (userId && data.channel) {
              logger.debug({ userId, channel: data.channel }, 'Channel subscription');
            }
            break;

          default:
            logger.warn({ event: data.event }, 'Unknown WebSocket event');
        }
      } catch (error) {
        logger.error({ error }, 'WebSocket message error');
      }
    });

    ws.on('close', () => {
      if (userId) {
        removeConnection(userId, ws as unknown as WebSocket);
      }
    });

    ws.on('error', (error) => {
      logger.error({ error, userId }, 'WebSocket error');
    });
  });

  // Setup Redis subscriptions for multi-instance support
  setupRedisSubscriptions().catch(err => {
    logger.error({ err }, 'Failed to setup Redis subscriptions');
  });

  logger.info('WebSocket server initialized');
}

// WebSocket event types for clients
export const WS_EVENTS = {
  // Client -> Server
  AUTH: 'auth',
  PING: 'ping',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',

  // Server -> Client
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',
  PONG: 'pong',
  NOTIFICATION: 'notification',
  TASK_UPDATE: 'task:update',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  LEVEL_UP: 'level:up',
  TEAM_UPDATE: 'team:update',
} as const;
