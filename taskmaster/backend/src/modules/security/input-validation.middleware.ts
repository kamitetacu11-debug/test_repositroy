import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

// ============================================================================
// XSS Protection
// ============================================================================

/**
 * Dangerous patterns that could indicate XSS attempts
 */
const XSS_PATTERNS = [
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,  // onclick=, onerror=, etc.
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /data:/gi,
  /vbscript:/gi,
  /<svg\b[^>]*onload/gi,
  /<img\b[^>]*onerror/gi,
];

/**
 * HTML entities for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Check if string contains potential XSS
 */
export function containsXss(value: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Recursively sanitize object values
 */
export function sanitizeObject(obj: unknown, depth = 0): unknown {
  const MAX_DEPTH = 10;

  if (depth > MAX_DEPTH) {
    return obj;
  }

  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[escapeHtml(key)] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }

  return obj;
}

// ============================================================================
// SQL Injection Protection
// ============================================================================

/**
 * SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g,
  /'(\s)*(OR|AND)(\s)+/gi,
  /(\b(1|0)\s*=\s*(1|0)\b)/gi,
  /(;|\||`)/g,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  /SLEEP\s*\(/gi,
  /BENCHMARK\s*\(/gi,
  /WAITFOR\s+DELAY/gi,
];

/**
 * Check if string contains potential SQL injection
 */
export function containsSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// ============================================================================
// NoSQL Injection Protection
// ============================================================================

/**
 * NoSQL injection patterns (MongoDB, etc.)
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$gte/gi,
  /\$lte/gi,
  /\$ne/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$or/gi,
  /\$and/gi,
  /\$not/gi,
  /\$regex/gi,
  /\$exists/gi,
  /\$type/gi,
  /\$mod/gi,
  /\$text/gi,
  /\$expr/gi,
];

/**
 * Check if string contains potential NoSQL injection
 */
export function containsNoSqlInjection(value: string): boolean {
  return NOSQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// ============================================================================
// Path Traversal Protection
// ============================================================================

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.%2[fF]/g,
  /\.\.%5[cC]/g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.%2e\//gi,
  /%2e\.\//gi,
];

/**
 * Check if string contains path traversal attempt
 */
export function containsPathTraversal(value: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(value));
}

// ============================================================================
// CSRF Protection
// ============================================================================

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF token storage (should be in Redis for production)
 */
const csrfTokens = new Map<string, { token: string; expires: number }>();

/**
 * Create CSRF token for session
 */
export function createCsrfToken(sessionId: string): string {
  const token = generateCsrfToken();
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  csrfTokens.set(sessionId, { token, expires });

  // Cleanup old tokens
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < Date.now()) {
      csrfTokens.delete(key);
    }
  }

  return token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);

  if (!stored) return false;
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

// ============================================================================
// Security Middleware
// ============================================================================

export interface SecurityValidationOptions {
  validateXss?: boolean;
  validateSqlInjection?: boolean;
  validateNoSqlInjection?: boolean;
  validatePathTraversal?: boolean;
  sanitizeInput?: boolean;
  validateCsrf?: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
}

const DEFAULT_OPTIONS: SecurityValidationOptions = {
  validateXss: true,
  validateSqlInjection: true,
  validateNoSqlInjection: true,
  validatePathTraversal: true,
  sanitizeInput: false, // Set to true to auto-sanitize
  validateCsrf: true,
  excludePaths: ['/health', '/docs', '/api/v1/auth/login', '/api/v1/auth/register'],
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
};

/**
 * Recursively check object for injection patterns
 */
function checkObjectForInjection(
  obj: unknown,
  options: SecurityValidationOptions,
  path = ''
): { valid: boolean; reason?: string; path?: string } {
  if (typeof obj === 'string') {
    if (options.validateXss && containsXss(obj)) {
      return { valid: false, reason: 'XSS_DETECTED', path };
    }
    if (options.validateSqlInjection && containsSqlInjection(obj)) {
      return { valid: false, reason: 'SQL_INJECTION_DETECTED', path };
    }
    if (options.validateNoSqlInjection && containsNoSqlInjection(obj)) {
      return { valid: false, reason: 'NOSQL_INJECTION_DETECTED', path };
    }
    if (options.validatePathTraversal && containsPathTraversal(obj)) {
      return { valid: false, reason: 'PATH_TRAVERSAL_DETECTED', path };
    }
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = checkObjectForInjection(obj[i], options, `${path}[${i}]`);
      if (!result.valid) return result;
    }
  }

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Check key itself
      const keyResult = checkObjectForInjection(key, options, `${path}.${key}(key)`);
      if (!keyResult.valid) return keyResult;

      // Check value
      const valueResult = checkObjectForInjection(value, options, `${path}.${key}`);
      if (!valueResult.valid) return valueResult;
    }
  }

  return { valid: true };
}

/**
 * Create input validation middleware
 */
export function createInputValidationMiddleware(
  options: SecurityValidationOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async function inputValidationMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    // Skip excluded paths
    if (opts.excludePaths?.some((path) => request.url.startsWith(path))) {
      return done();
    }

    // Check URL for path traversal
    if (opts.validatePathTraversal && containsPathTraversal(request.url)) {
      logger.warn({
        event: 'PATH_TRAVERSAL_BLOCKED',
        ip: request.ip,
        url: request.url,
      });

      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request path',
        },
      });
    }

    // Check query parameters
    if (request.query && typeof request.query === 'object') {
      const queryResult = checkObjectForInjection(request.query, opts, 'query');
      if (!queryResult.valid) {
        logger.warn({
          event: 'INJECTION_BLOCKED',
          type: queryResult.reason,
          ip: request.ip,
          path: queryResult.path,
          url: request.url,
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid characters in request',
          },
        });
      }
    }

    // Check body for non-GET requests
    if (!opts.excludeMethods?.includes(request.method) && request.body) {
      const bodyResult = checkObjectForInjection(request.body, opts, 'body');
      if (!bodyResult.valid) {
        logger.warn({
          event: 'INJECTION_BLOCKED',
          type: bodyResult.reason,
          ip: request.ip,
          path: bodyResult.path,
          url: request.url,
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid characters in request body',
          },
        });
      }

      // Sanitize input if enabled
      if (opts.sanitizeInput) {
        request.body = sanitizeObject(request.body);
      }
    }

    // CSRF validation for state-changing requests
    if (
      opts.validateCsrf &&
      !opts.excludeMethods?.includes(request.method) &&
      !opts.excludePaths?.some((path) => request.url.startsWith(path))
    ) {
      const csrfToken = request.headers['x-csrf-token'] as string;
      const sessionId = (request as any).user?.id || request.ip;

      if (csrfToken && !validateCsrfToken(sessionId, csrfToken)) {
        logger.warn({
          event: 'CSRF_VALIDATION_FAILED',
          ip: request.ip,
          url: request.url,
        });

        // Don't block, just log for now - CSRF is tricky with APIs
        // In production, you might want to enforce this
      }
    }

    return done();
  };
}

// ============================================================================
// Content Type Validation
// ============================================================================

/**
 * Validate Content-Type header
 */
export function createContentTypeMiddleware(allowedTypes: string[] = ['application/json']) {
  return async function contentTypeMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return done();
    }

    const contentType = request.headers['content-type'];

    if (!contentType) {
      // No body expected
      return done();
    }

    const isAllowed = allowedTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      logger.warn({
        event: 'INVALID_CONTENT_TYPE',
        ip: request.ip,
        contentType,
        url: request.url,
      });

      return reply.status(415).send({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
        },
      });
    }

    return done();
  };
}

// ============================================================================
// Request Size Validation
// ============================================================================

export interface RequestSizeLimits {
  maxBodySize: number;
  maxUrlLength: number;
  maxHeaderSize: number;
  maxQueryLength: number;
}

const DEFAULT_SIZE_LIMITS: RequestSizeLimits = {
  maxBodySize: 1024 * 1024, // 1MB
  maxUrlLength: 2048,
  maxHeaderSize: 8192,
  maxQueryLength: 2048,
};

export function createRequestSizeMiddleware(limits: Partial<RequestSizeLimits> = {}) {
  const opts = { ...DEFAULT_SIZE_LIMITS, ...limits };

  return async function requestSizeMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) {
    // Check URL length
    if (request.url.length > opts.maxUrlLength) {
      logger.warn({
        event: 'URL_TOO_LONG',
        ip: request.ip,
        urlLength: request.url.length,
      });

      return reply.status(414).send({
        success: false,
        error: {
          code: 'URI_TOO_LONG',
          message: 'Request URL is too long',
        },
      });
    }

    // Check query string length
    const queryString = request.url.split('?')[1];
    if (queryString && queryString.length > opts.maxQueryLength) {
      return reply.status(414).send({
        success: false,
        error: {
          code: 'QUERY_TOO_LONG',
          message: 'Query string is too long',
        },
      });
    }

    return done();
  };
}
