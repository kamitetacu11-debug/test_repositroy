/**
 * Security Middleware
 * Comprehensive security measures for production deployment
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const sanitizeHtml = require('sanitize-html');
const config = require('../config/config');

/**
 * Helmet configuration for HTTP headers security
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * Rate limiter for API endpoints
 */
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    }
});

/**
 * Stricter rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        error: 'Too many login attempts, please try again after 15 minutes',
        code: 'AUTH_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

/**
 * Rate limiter for file uploads
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: {
        success: false,
        error: 'Upload limit exceeded, please try again later',
        code: 'UPLOAD_LIMIT_EXCEEDED'
    }
});

/**
 * Sanitize user input
 */
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return sanitizeHtml(obj, {
                allowedTags: [],
                allowedAttributes: {}
            });
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitize(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    if (req.params) {
        req.params = sanitize(req.params);
    }

    next();
};

/**
 * Validate Content-Type for POST/PUT requests
 */
const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
            return res.status(415).json({
                success: false,
                error: 'Unsupported Media Type',
                code: 'INVALID_CONTENT_TYPE'
            });
        }
    }
    next();
};

/**
 * Request logging for security audit
 */
const auditLog = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userId: req.user?.id || 'anonymous',
            userAgent: req.headers['user-agent']
        };

        // Log security-relevant events
        if (res.statusCode >= 400) {
            console.warn('Security Event:', JSON.stringify(log));
        }
    });

    next();
};

/**
 * Prevent NoSQL injection (for query params)
 */
const preventInjection = (req, res, next) => {
    const checkInjection = (obj) => {
        if (typeof obj === 'string') {
            // Check for common injection patterns
            const dangerous = ['$', '{', '}', 'eval', 'exec', '__proto__', 'constructor'];
            return !dangerous.some(pattern => obj.toLowerCase().includes(pattern));
        }
        if (Array.isArray(obj)) {
            return obj.every(checkInjection);
        }
        if (obj && typeof obj === 'object') {
            return Object.values(obj).every(checkInjection);
        }
        return true;
    };

    if (!checkInjection(req.query) || !checkInjection(req.body)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid request',
            code: 'INJECTION_DETECTED'
        });
    }

    next();
};

module.exports = {
    helmetConfig,
    apiLimiter,
    authLimiter,
    uploadLimiter,
    sanitizeInput,
    validateContentType,
    auditLog,
    preventInjection,
    hpp: hpp()
};
