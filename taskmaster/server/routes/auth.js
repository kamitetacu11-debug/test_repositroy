/**
 * Authentication Routes
 * Handles user registration, login, logout, and token refresh
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const config = require('../config/config');
const { db, statements } = require('../models/database');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        config.jwt.secret,
        {
            expiresIn: config.jwt.expiresIn,
            algorithm: config.jwt.algorithm
        }
    );

    const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        config.jwt.secret,
        {
            expiresIn: config.jwt.refreshExpiresIn,
            algorithm: config.jwt.algorithm
        }
    );

    return { accessToken, refreshToken };
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain uppercase, lowercase, and number'),
        body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name is required'),
        body('department').optional().trim()
    ],
    async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { email, password, fullName, department, organizationId } = req.body;

            // Check if user exists
            const existingUser = statements.getUserByEmail.get(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already registered',
                    code: 'EMAIL_EXISTS'
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);

            // Create user
            const userId = uuidv4();
            const orgId = organizationId || 'default-org';

            // Ensure default organization exists
            const defaultOrg = db.prepare('SELECT id FROM organizations WHERE id = ?').get(orgId);
            if (!defaultOrg) {
                db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'Default Organization');
            }

            statements.createUser.run(
                userId,
                orgId,
                email,
                passwordHash,
                fullName,
                'employee',
                department || null
            );

            // Create default chat channel membership
            const generalChannel = db.prepare('SELECT id FROM chat_channels WHERE name = ? AND organization_id = ?').get('general', orgId);
            if (generalChannel) {
                db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(generalChannel.id, userId);
            }

            // Generate tokens
            const tokens = generateTokens(userId);

            // Get created user
            const user = statements.getUserById.get(userId);

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        role: user.role,
                        level: user.level,
                        totalPoints: user.total_points,
                        starsBalance: user.stars_balance
                    },
                    tokens
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Registration failed',
                code: 'REGISTRATION_ERROR'
            });
        }
    }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = statements.getUserByEmail.get(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Check if account is active
            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    error: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Update streak
            const today = new Date().toISOString().split('T')[0];
            const lastActivity = user.last_activity_date;
            let newStreak = user.streak_days;

            if (lastActivity) {
                const lastDate = new Date(lastActivity);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    newStreak += 1;
                } else if (diffDays > 1) {
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            statements.updateUserStreak.run(newStreak, today, user.id);
            statements.updateUserOnline.run(1, user.id);

            // Generate tokens
            const tokens = generateTokens(user.id);

            // Set HTTP-only cookie for refresh token
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: config.env === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        role: user.role,
                        department: user.department,
                        level: user.level,
                        totalPoints: user.total_points,
                        starsBalance: user.stars_balance,
                        streakDays: newStreak,
                        avatarConfig: JSON.parse(user.avatar_config || '{}')
                    },
                    tokens
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed',
                code: 'LOGIN_ERROR'
            });
        }
    }
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token required',
                code: 'NO_REFRESH_TOKEN'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.jwt.secret);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        // Generate new tokens
        const tokens = generateTokens(decoded.userId);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: config.env === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            data: { tokens }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, (req, res) => {
    try {
        // Update user online status
        statements.updateUserOnline.run(0, req.user.id);

        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, (req, res) => {
    try {
        const user = statements.getUserById.get(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user badges
        const badges = statements.getUserBadges.all(user.id);

        // Get inventory
        const inventory = statements.getUserInventory.all(user.id);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    department: user.department,
                    level: user.level,
                    totalPoints: user.total_points,
                    starsBalance: user.stars_balance,
                    streakDays: user.streak_days,
                    avatarUrl: user.avatar_url,
                    avatarConfig: JSON.parse(user.avatar_config || '{}'),
                    createdAt: user.created_at
                },
                badges,
                inventory
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
    authenticate,
    [
        body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
        body('department').optional().trim()
    ],
    (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { fullName, department } = req.body;
            const updates = [];
            const values = [];

            if (fullName) {
                updates.push('full_name = ?');
                values.push(fullName);
            }
            if (department !== undefined) {
                updates.push('department = ?');
                values.push(department);
            }

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                values.push(req.user.id);

                db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }

            const user = statements.getUserById.get(req.user.id);

            res.json({
                success: true,
                message: 'Profile updated',
                data: {
                    user: {
                        id: user.id,
                        fullName: user.full_name,
                        department: user.department
                    }
                }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    }
);

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password',
    authenticate,
    [
        body('currentPassword').notEmpty(),
        body('newPassword')
            .isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;
            const user = statements.getUserById.get(req.user.id);

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect',
                    code: 'INVALID_PASSWORD'
                });
            }

            // Hash new password
            const newHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

            // Update password
            db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(newHash, req.user.id);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change password'
            });
        }
    }
);

module.exports = router;
