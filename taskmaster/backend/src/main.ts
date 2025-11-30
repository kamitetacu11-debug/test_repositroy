import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/index.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { logger } from './config/logger.js';

// Routes
import { authRoutes } from './modules/users/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';
import { teamRoutes } from './modules/teams/team.routes.js';
import { pointsRoutes } from './modules/points/points.routes.js';
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes.js';
import { gamificationRoutes } from './modules/gamification/gamification.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { crmRoutes } from './modules/crm/crm.routes.js';

// WebSocket
import { setupWebSocket } from './modules/notifications/websocket.js';

// Security
import { registerSecurityMiddleware } from './modules/security/index.js';
import { securityRoutes } from './modules/security/security.routes.js';

// Consent
import { consentRoutes } from './modules/consent/consent.routes.js';

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  },
  // Increase body limit for base64 avatar uploads (5MB)
  bodyLimit: 5 * 1024 * 1024,
});

async function bootstrap() {
  try {
    // Security Headers (Helmet with enhanced CSP)
    await app.register(helmet, {
      contentSecurityPolicy: config.isProd ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      } : false,
      crossOriginEmbedderPolicy: false,
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: config.isProd ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
    });

    // CORS Configuration
    await app.register(cors, {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Captcha-Token',
        'X-Request-ID',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After',
      ],
    });

    // Basic rate limit (will be enhanced by security middleware)
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      skipOnError: true,
      keyGenerator: (request) => {
        // Use X-Forwarded-For for proxied requests
        const forwardedFor = request.headers['x-forwarded-for'];
        if (forwardedFor) {
          const ips = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0];
          return ips.trim();
        }
        return request.ip;
      },
    });

    // Register comprehensive security middleware
    await registerSecurityMiddleware(app, {
      enableRateLimit: true,
      enableBruteForceProtection: true,
      enableThreatDetection: true,
      enableDirectoryProtection: true,
      enableInputValidation: true,
      enableCaptcha: false, // Enable when CAPTCHA keys are configured
    });

    // JWT Auth
    await app.register(jwt, {
      secret: config.jwtSecret,
      sign: { expiresIn: '7d' }
    });

    // Auth decorator
    app.decorate('authenticate', async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
        });
      }
    });

    // WebSocket
    await app.register(websocket);
    setupWebSocket(app);

    // Swagger Documentation
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'TaskMaster API',
          description: 'AI-Powered Business Task Management with Gamification',
          version: '1.0.0'
        },
        servers: [{ url: `http://localhost:${config.port}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true
      }
    });

    // Health check
    app.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));

    // API Routes
    await app.register(authRoutes, { prefix: '/api/v1/auth' });
    await app.register(userRoutes, { prefix: '/api/v1/users' });
    await app.register(taskRoutes, { prefix: '/api/v1/tasks' });
    await app.register(teamRoutes, { prefix: '/api/v1/teams' });
    await app.register(pointsRoutes, { prefix: '/api/v1/points' });
    await app.register(leaderboardRoutes, { prefix: '/api/v1/leaderboard' });
    await app.register(gamificationRoutes, { prefix: '/api/v1/gamification' });
    await app.register(aiRoutes, { prefix: '/api/v1/ai' });
    await app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
    await app.register(crmRoutes, { prefix: '/api/v1/crm' });

    // Cookie Consent Routes (public - no auth required)
    await app.register(consentRoutes, { prefix: '/api/v1/consent' });

    // Security Admin Routes (requires authentication)
    await app.register(async (securityApp) => {
      securityApp.addHook('preHandler', app.authenticate);
      await securityApp.register(securityRoutes);
    }, { prefix: '/api/v1/security' });

    // Global error handler
    app.setErrorHandler((error, request, reply) => {
      logger.error({ err: error, req: request }, 'Request error');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal Server Error'
        }
      });
    });

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await app.close();
        await prisma.$disconnect();
        await redis.quit();
        process.exit(0);
      });
    });

    // Start server
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`🚀 TaskMaster API running on http://localhost:${config.port}`);
    logger.info(`📚 API Docs available at http://localhost:${config.port}/docs`);

  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

bootstrap();

export { app };
