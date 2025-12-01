import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { getClientIp } from '../security/index.js';

const cookieConsentSchema = z.object({
  visitorId: z.string().min(1),
  preferences: z.object({
    necessary: z.boolean().default(true),
    functional: z.boolean().default(false),
    analytics: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }),
});

const getConsentSchema = z.object({
  visitorId: z.string().min(1),
});

export const consentRoutes: FastifyPluginAsync = async (app) => {
  // Save or update cookie consent
  app.post('/cookies', {
    schema: {
      tags: ['Consent'],
      summary: 'Save cookie consent preferences',
      body: {
        type: 'object',
        required: ['visitorId', 'preferences'],
        properties: {
          visitorId: { type: 'string', minLength: 1 },
          preferences: {
            type: 'object',
            properties: {
              necessary: { type: 'boolean' },
              functional: { type: 'boolean' },
              analytics: { type: 'boolean' },
              marketing: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = cookieConsentSchema.parse(request.body);
      const ip = getClientIp(request);
      const userAgent = request.headers['user-agent'] || '';

      // Get user ID if authenticated
      let userId: string | null = null;
      try {
        await request.jwtVerify();
        userId = (request.user as { userId: string })?.userId || null;
      } catch {
        // Not authenticated, that's fine
      }

      const consent = await prisma.cookieConsent.upsert({
        where: { visitorId: body.visitorId },
        update: {
          hasConsented: true,
          consentDate: new Date(),
          necessary: true, // Always true
          functional: body.preferences.functional,
          analytics: body.preferences.analytics,
          marketing: body.preferences.marketing,
          ipAddress: ip,
          userAgent: userAgent.substring(0, 500), // Limit length
          userId: userId,
        },
        create: {
          visitorId: body.visitorId,
          userId: userId,
          hasConsented: true,
          consentDate: new Date(),
          necessary: true,
          functional: body.preferences.functional,
          analytics: body.preferences.analytics,
          marketing: body.preferences.marketing,
          ipAddress: ip,
          userAgent: userAgent.substring(0, 500),
        },
      });

      logger.info({ visitorId: body.visitorId, userId }, 'Cookie consent saved');

      return {
        success: true,
        data: {
          id: consent.id,
          hasConsented: consent.hasConsented,
          consentDate: consent.consentDate?.toISOString(),
          preferences: {
            necessary: consent.necessary,
            functional: consent.functional,
            analytics: consent.analytics,
            marketing: consent.marketing,
          },
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to save cookie consent');
      return reply.status(500).send({
        success: false,
        error: { code: 'CONSENT_SAVE_ERROR', message: 'Failed to save cookie consent' },
      });
    }
  });

  // Get cookie consent by visitor ID
  app.get('/cookies/:visitorId', {
    schema: {
      tags: ['Consent'],
      summary: 'Get cookie consent preferences',
      params: {
        type: 'object',
        properties: {
          visitorId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { visitorId } = request.params as { visitorId: string };

      if (!visitorId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_VISITOR_ID', message: 'Visitor ID is required' },
        });
      }

      const consent = await prisma.cookieConsent.findUnique({
        where: { visitorId },
      });

      if (!consent) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CONSENT_NOT_FOUND', message: 'Cookie consent not found' },
        });
      }

      return {
        success: true,
        data: {
          id: consent.id,
          hasConsented: consent.hasConsented,
          consentDate: consent.consentDate?.toISOString(),
          preferences: {
            necessary: consent.necessary,
            functional: consent.functional,
            analytics: consent.analytics,
            marketing: consent.marketing,
          },
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get cookie consent');
      return reply.status(500).send({
        success: false,
        error: { code: 'CONSENT_GET_ERROR', message: 'Failed to get cookie consent' },
      });
    }
  });

  // Delete cookie consent (for GDPR compliance)
  app.delete('/cookies/:visitorId', {
    schema: {
      tags: ['Consent'],
      summary: 'Delete cookie consent (GDPR compliance)',
      params: {
        type: 'object',
        properties: {
          visitorId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { visitorId } = request.params as { visitorId: string };

      if (!visitorId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_VISITOR_ID', message: 'Visitor ID is required' },
        });
      }

      await prisma.cookieConsent.delete({
        where: { visitorId },
      });

      logger.info({ visitorId }, 'Cookie consent deleted');

      return {
        success: true,
        message: 'Cookie consent deleted successfully',
      };
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          error: { code: 'CONSENT_NOT_FOUND', message: 'Cookie consent not found' },
        });
      }
      logger.error({ error }, 'Failed to delete cookie consent');
      return reply.status(500).send({
        success: false,
        error: { code: 'CONSENT_DELETE_ERROR', message: 'Failed to delete cookie consent' },
      });
    }
  });
};
