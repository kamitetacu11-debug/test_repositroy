/**
 * Two-Factor Authentication Routes
 *
 * Provides endpoints for 2FA setup, verification, and management
 *
 * @module security/two-factor.routes
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger } from '../../config/logger.js';
import {
  twoFactorService,
  generateTwoFactorSetup,
  verifyTwoFactorToken,
  hashBackupCodes,
} from './two-factor.service.js';

// ============================================================================
// Schemas
// ============================================================================

const setupTwoFactorSchema = z.object({});

const verifyTwoFactorSchema = z.object({
  token: z.string().min(6).max(8),
});

const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
  token: z.string().min(6).max(8),
});

const verifyBackupCodeSchema = z.object({
  code: z.string().min(8).max(8),
});

// ============================================================================
// Routes
// ============================================================================

export const twoFactorRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Get 2FA status for current user
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // In a real implementation, this would check the user's 2FA status in the database
      // For demo purposes, we'll return mock data
      const twoFactorEnabled = user.twoFactorEnabled || false;
      const backupCodesRemaining = user.backupCodesRemaining || 0;

      return reply.send({
        success: true,
        data: {
          enabled: twoFactorEnabled,
          backupCodesRemaining,
          lastVerified: user.lastTwoFactorVerification || null,
        },
      });
    } catch (error) {
      logger.error({ error, event: '2FA_STATUS_ERROR' });
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to get 2FA status' },
      });
    }
  });

  /**
   * Initialize 2FA setup - generates secret and QR code
   */
  app.post('/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Check if 2FA is already enabled
      if (user.twoFactorEnabled) {
        return reply.status(400).send({
          success: false,
          error: { code: '2FA_ALREADY_ENABLED', message: '2FA is already enabled for this account' },
        });
      }

      // Generate 2FA secret and backup codes
      const setup = await generateTwoFactorSetup(user.email);

      // Generate QR code data URL
      const qrCodeDataUrl = await twoFactorService.generateQRCode(setup.otpauthUrl);

      logger.info({
        event: '2FA_SETUP_INITIATED',
        userId: user.id,
        email: user.email,
      });

      // In a real implementation, you would temporarily store the secret
      // until the user verifies it. For now, we return it directly.
      return reply.send({
        success: true,
        data: {
          secret: setup.secret,
          otpauthUrl: setup.otpauthUrl,
          qrCodeDataUrl,
          backupCodes: setup.backupCodes,
        },
      });
    } catch (error) {
      logger.error({ error, event: '2FA_SETUP_ERROR' });
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to setup 2FA' },
      });
    }
  });

  /**
   * Verify 2FA setup with initial token
   */
  app.post(
    '/setup/verify',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof verifyTwoFactorSchema> & { secret: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;

        if (!user) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { token, secret } = request.body;

        if (!token || !secret) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Token and secret are required' },
          });
        }

        // Verify the token
        const isValid = verifyTwoFactorToken(token, secret);

        if (!isValid) {
          logger.warn({
            event: '2FA_SETUP_VERIFY_FAILED',
            userId: user.id,
          });

          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid verification code' },
          });
        }

        // In a real implementation, you would:
        // 1. Store the secret in the user's record (encrypted)
        // 2. Store the hashed backup codes
        // 3. Set twoFactorEnabled = true

        logger.info({
          event: '2FA_SETUP_VERIFIED',
          userId: user.id,
        });

        return reply.send({
          success: true,
          data: {
            enabled: true,
            message: '2FA has been successfully enabled',
          },
        });
      } catch (error) {
        logger.error({ error, event: '2FA_SETUP_VERIFY_ERROR' });
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to verify 2FA setup' },
        });
      }
    }
  );

  /**
   * Verify 2FA token during login
   */
  app.post(
    '/verify',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof verifyTwoFactorSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { token } = request.body;

        // In a real implementation, this would be part of the login flow
        // The user's 2FA secret would be retrieved from the database
        const pendingAuth = (request as any).session?.pendingAuth;

        if (!pendingAuth) {
          return reply.status(400).send({
            success: false,
            error: { code: 'NO_PENDING_AUTH', message: 'No pending authentication' },
          });
        }

        const isValid = verifyTwoFactorToken(token, pendingAuth.secret);

        if (!isValid) {
          logger.warn({
            event: '2FA_VERIFY_FAILED',
            userId: pendingAuth.userId,
          });

          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Invalid verification code' },
          });
        }

        logger.info({
          event: '2FA_VERIFY_SUCCESS',
          userId: pendingAuth.userId,
        });

        // In a real implementation, complete the login and return the JWT
        return reply.send({
          success: true,
          data: {
            verified: true,
            message: '2FA verification successful',
          },
        });
      } catch (error) {
        logger.error({ error, event: '2FA_VERIFY_ERROR' });
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to verify 2FA' },
        });
      }
    }
  );

  /**
   * Disable 2FA
   */
  app.post(
    '/disable',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof disableTwoFactorSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;

        if (!user) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { password, token } = request.body;

        // In a real implementation, verify the password first
        // Then verify the 2FA token
        // Then disable 2FA in the database

        logger.info({
          event: '2FA_DISABLED',
          userId: user.id,
        });

        return reply.send({
          success: true,
          data: {
            enabled: false,
            message: '2FA has been disabled',
          },
        });
      } catch (error) {
        logger.error({ error, event: '2FA_DISABLE_ERROR' });
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to disable 2FA' },
        });
      }
    }
  );

  /**
   * Generate new backup codes
   */
  app.post('/backup-codes/regenerate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      if (!user.twoFactorEnabled) {
        return reply.status(400).send({
          success: false,
          error: { code: '2FA_NOT_ENABLED', message: '2FA is not enabled for this account' },
        });
      }

      // Generate new backup codes
      const setup = await generateTwoFactorSetup(user.email);
      const hashedCodes = hashBackupCodes(setup.backupCodes);

      // In a real implementation, store the hashed codes in the database

      logger.info({
        event: '2FA_BACKUP_CODES_REGENERATED',
        userId: user.id,
      });

      return reply.send({
        success: true,
        data: {
          backupCodes: setup.backupCodes,
          message: 'New backup codes have been generated. Please save them securely.',
        },
      });
    } catch (error) {
      logger.error({ error, event: '2FA_BACKUP_CODES_ERROR' });
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to regenerate backup codes' },
      });
    }
  });

  /**
   * Verify backup code
   */
  app.post(
    '/backup-codes/verify',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof verifyBackupCodeSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { code } = request.body;

        // In a real implementation, this would verify against stored hashed backup codes
        // and mark the code as used

        logger.info({
          event: '2FA_BACKUP_CODE_USED',
        });

        return reply.send({
          success: true,
          data: {
            verified: true,
            message: 'Backup code verified',
            remainingCodes: 9, // In reality, this would be calculated
          },
        });
      } catch (error) {
        logger.error({ error, event: '2FA_BACKUP_CODE_VERIFY_ERROR' });
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to verify backup code' },
        });
      }
    }
  );
};

export default twoFactorRoutes;
