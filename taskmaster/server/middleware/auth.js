/**
 * Authentication Middleware
 * JWT-based authentication with security best practices
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { statements } = require('../models/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from header or cookie
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.accessToken;

        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (cookieToken) {
            token = cookieToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret, {
            algorithms: [config.jwt.algorithm]
        });

        // Get user from database
        const user = statements.getUserById.get(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Attach user to request (exclude sensitive data)
        req.user = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            organizationId: user.organization_id,
            department: user.department,
            totalPoints: user.total_points,
            level: user.level,
            starsBalance: user.stars_balance,
            streakDays: user.streak_days,
            avatarConfig: JSON.parse(user.avatar_config || '{}')
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Check if user has required role
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_AUTH'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Admin-only middleware (localhost access)
 */
const adminOnly = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // Check if IP is in allowed list
    const isLocalAccess = config.admin.allowedIPs.some(allowed => {
        if (allowed.includes('/')) {
            // CIDR notation - simplified check
            const [network] = allowed.split('/');
            return clientIP.startsWith(network.split('.').slice(0, 2).join('.'));
        }
        return clientIP === allowed || clientIP === `::ffff:${allowed}`;
    });

    if (!isLocalAccess) {
        console.warn(`Blocked admin access attempt from IP: ${clientIP}`);
        return res.status(403).json({
            success: false,
            error: 'Admin panel is only accessible from local network',
            code: 'ADMIN_ACCESS_DENIED'
        });
    }

    // Also require admin role
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin role required',
            code: 'ADMIN_ROLE_REQUIRED'
        });
    }

    next();
};

/**
 * Optional authentication (user attached if token valid, but not required)
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (cookieToken) {
        token = cookieToken;
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = statements.getUserById.get(decoded.userId);

        if (user && user.is_active) {
            req.user = {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                organizationId: user.organization_id
            };
        }
    } catch (error) {
        // Ignore invalid tokens for optional auth
    }

    next();
};

module.exports = {
    authenticate,
    authorize,
    adminOnly,
    optionalAuth
};
