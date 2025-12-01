/**
 * Two-Factor Authentication (2FA) Service
 *
 * Provides TOTP-based two-factor authentication using:
 * - Time-based One-Time Passwords (TOTP)
 * - Backup codes for recovery
 * - QR code generation for authenticator apps
 *
 * @module security/two-factor
 */

import crypto from 'crypto';
import { logger } from '../../config/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface TwoFactorSecret {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl?: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResult {
  valid: boolean;
  usedBackupCode?: boolean;
}

export interface TwoFactorConfig {
  issuer: string;
  digits: number;
  period: number;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  backupCodeCount: number;
  backupCodeLength: number;
  window: number; // Time window tolerance (in periods)
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: TwoFactorConfig = {
  issuer: 'TaskMaster',
  digits: 6,
  period: 30,
  algorithm: 'sha1',
  backupCodeCount: 10,
  backupCodeLength: 8,
  window: 1, // Accept codes from -1 to +1 period
};

// ============================================================================
// Two-Factor Service
// ============================================================================

export class TwoFactorService {
  private config: TwoFactorConfig;

  constructor(config: Partial<TwoFactorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a new 2FA secret for a user
   */
  generateSecret(accountName: string): TwoFactorSecret {
    // Generate random secret (20 bytes = 160 bits, base32 encoded)
    const secretBuffer = crypto.randomBytes(20);
    const secret = this.base32Encode(secretBuffer);

    // Generate otpauth URL for authenticator apps
    const otpauthUrl = this.generateOtpauthUrl(accountName, secret);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    logger.info({
      event: '2FA_SECRET_GENERATED',
      accountName,
    });

    return {
      secret,
      otpauthUrl,
      backupCodes,
    };
  }

  /**
   * Generate OTPAuth URL for authenticator apps
   */
  private generateOtpauthUrl(accountName: string, secret: string): string {
    const params = new URLSearchParams({
      secret,
      issuer: this.config.issuer,
      algorithm: this.config.algorithm.toUpperCase(),
      digits: this.config.digits.toString(),
      period: this.config.period.toString(),
    });

    const encodedIssuer = encodeURIComponent(this.config.issuer);
    const encodedAccount = encodeURIComponent(accountName);

    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?${params.toString()}`;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodeCount; i++) {
      const code = crypto
        .randomBytes(Math.ceil(this.config.backupCodeLength / 2))
        .toString('hex')
        .slice(0, this.config.backupCodeLength)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify a TOTP code
   */
  verifyToken(token: string, secret: string): boolean {
    if (!token || !secret) return false;

    // Clean up token (remove spaces/dashes)
    const cleanToken = token.replace(/[\s-]/g, '');

    // Check token length
    if (cleanToken.length !== this.config.digits) return false;

    // Get current time period
    const currentTime = Math.floor(Date.now() / 1000);
    const counter = Math.floor(currentTime / this.config.period);

    // Check within time window
    for (let i = -this.config.window; i <= this.config.window; i++) {
      const expectedToken = this.generateToken(secret, counter + i);
      if (this.timingSafeEqual(cleanToken, expectedToken)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verify a token or backup code
   */
  verifyTokenOrBackup(
    token: string,
    secret: string,
    hashedBackupCodes: string[]
  ): TwoFactorVerifyResult {
    // First try TOTP
    if (this.verifyToken(token, secret)) {
      return { valid: true, usedBackupCode: false };
    }

    // Then try backup codes
    const cleanToken = token.replace(/[\s-]/g, '').toUpperCase();
    const tokenHash = this.hashBackupCode(cleanToken);

    for (const hashedCode of hashedBackupCodes) {
      if (this.timingSafeEqual(tokenHash, hashedCode)) {
        return { valid: true, usedBackupCode: true };
      }
    }

    return { valid: false };
  }

  /**
   * Generate a TOTP token for a given counter
   */
  private generateToken(secret: string, counter: number): string {
    // Decode base32 secret
    const secretBuffer = this.base32Decode(secret);

    // Convert counter to 8-byte buffer (big-endian)
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    // Calculate HMAC
    const hmac = crypto.createHmac(this.config.algorithm, secretBuffer);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    // Dynamic truncation (RFC 4226)
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    // Generate token
    const otp = binary % Math.pow(10, this.config.digits);
    return otp.toString().padStart(this.config.digits, '0');
  }

  /**
   * Hash a backup code for storage
   */
  hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Hash all backup codes for storage
   */
  hashBackupCodes(codes: string[]): string[] {
    return codes.map((code) => this.hashBackupCode(code));
  }

  /**
   * Base32 encode
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 0x1f];
    }

    return result;
  }

  /**
   * Base32 decode
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanEncoded = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of cleanEncoded) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Get remaining seconds until next token
   */
  getRemainingSeconds(): number {
    const currentTime = Math.floor(Date.now() / 1000);
    return this.config.period - (currentTime % this.config.period);
  }

  /**
   * Generate a QR code data URL (requires external library)
   * This is a placeholder - actual implementation would use a QR code library
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    // In production, use a library like 'qrcode' to generate the QR code
    // For now, return the URL that can be used with any QR code generator
    logger.info({
      event: '2FA_QR_REQUESTED',
      url: otpauthUrl,
    });

    // Placeholder: Return a data URL format indicator
    // The frontend can use this URL with a QR code library
    return `data:text/plain;base64,${Buffer.from(otpauthUrl).toString('base64')}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const twoFactorService = new TwoFactorService({
  issuer: process.env.TWO_FACTOR_ISSUER || 'TaskMaster',
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a new 2FA setup for a user
 */
export async function generateTwoFactorSetup(
  email: string
): Promise<TwoFactorSecret> {
  return twoFactorService.generateSecret(email);
}

/**
 * Verify a 2FA token
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  return twoFactorService.verifyToken(token, secret);
}

/**
 * Verify a 2FA token or backup code
 */
export function verifyTwoFactorTokenOrBackup(
  token: string,
  secret: string,
  hashedBackupCodes: string[]
): TwoFactorVerifyResult {
  return twoFactorService.verifyTokenOrBackup(token, secret, hashedBackupCodes);
}

/**
 * Hash backup codes for secure storage
 */
export function hashBackupCodes(codes: string[]): string[] {
  return twoFactorService.hashBackupCodes(codes);
}

export default twoFactorService;
