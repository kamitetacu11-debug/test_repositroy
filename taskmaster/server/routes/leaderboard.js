/**
 * Leaderboard Routes
 * Rankings, badges, and gamification stats
 */

const express = require('express');
const router = express.Router();
const { db, statements } = require('../models/database');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/leaderboard
 * @desc    Get leaderboard rankings
 * @access  Private
 */
router.get('/', authenticate, (req, res) => {
    try {
        const { period = 'all', limit = 50, department } = req.query;

        let sql = `
            SELECT
                u.id,
                u.full_name,
                u.avatar_url,
                u.avatar_config,
                u.total_points,
                u.level,
                u.streak_days,
                u.department,
                (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'completed') as tasks_completed,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_count
            FROM users u
            WHERE u.organization_id = ? AND u.is_active = 1
        `;
        const params = [req.user.organizationId];

        if (department) {
            sql += ' AND u.department = ?';
            params.push(department);
        }

        // Period filter for points
        if (period === 'weekly') {
            sql = `
                SELECT
                    u.id,
                    u.full_name,
                    u.avatar_url,
                    u.avatar_config,
                    COALESCE(SUM(pt.amount), 0) as period_points,
                    u.total_points,
                    u.level,
                    u.streak_days,
                    u.department,
                    (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'completed') as tasks_completed,
                    (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_count
                FROM users u
                LEFT JOIN points_transactions pt ON u.id = pt.user_id
                    AND pt.created_at >= datetime('now', '-7 days')
                    AND pt.amount > 0
                WHERE u.organization_id = ? AND u.is_active = 1
            `;
            if (department) {
                sql += ' AND u.department = ?';
            }
            sql += ' GROUP BY u.id ORDER BY period_points DESC';
        } else if (period === 'monthly') {
            sql = `
                SELECT
                    u.id,
                    u.full_name,
                    u.avatar_url,
                    u.avatar_config,
                    COALESCE(SUM(pt.amount), 0) as period_points,
                    u.total_points,
                    u.level,
                    u.streak_days,
                    u.department,
                    (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'completed') as tasks_completed,
                    (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_count
                FROM users u
                LEFT JOIN points_transactions pt ON u.id = pt.user_id
                    AND pt.created_at >= datetime('now', '-30 days')
                    AND pt.amount > 0
                WHERE u.organization_id = ? AND u.is_active = 1
            `;
            if (department) {
                sql += ' AND u.department = ?';
            }
            sql += ' GROUP BY u.id ORDER BY period_points DESC';
        } else {
            sql += ' ORDER BY u.total_points DESC';
        }

        sql += ` LIMIT ${parseInt(limit)}`;

        const rankings = db.prepare(sql).all(...params);

        // Find current user's rank
        const userRank = rankings.findIndex(r => r.id === req.user.id) + 1;

        res.json({
            success: true,
            data: {
                rankings: rankings.map((r, idx) => ({
                    rank: idx + 1,
                    ...r,
                    avatarConfig: JSON.parse(r.avatar_config || '{}'),
                    isCurrentUser: r.id === req.user.id
                })),
                currentUserRank: userRank || null,
                period
            }
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get leaderboard'
        });
    }
});

/**
 * @route   GET /api/leaderboard/badges
 * @desc    Get all available badges
 * @access  Private
 */
router.get('/badges', authenticate, (req, res) => {
    try {
        const allBadges = db.prepare('SELECT * FROM badges ORDER BY tier, points_required').all();

        // Get user's earned badges
        const userBadges = statements.getUserBadges.all(req.user.id);
        const earnedIds = new Set(userBadges.map(b => b.id));

        res.json({
            success: true,
            data: {
                badges: allBadges.map(badge => ({
                    ...badge,
                    conditionValue: badge.condition_value ? JSON.parse(badge.condition_value) : null,
                    earned: earnedIds.has(badge.id),
                    earnedAt: userBadges.find(ub => ub.id === badge.id)?.earned_at
                }))
            }
        });

    } catch (error) {
        console.error('Get badges error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get badges'
        });
    }
});

/**
 * @route   GET /api/leaderboard/stats
 * @desc    Get user's detailed stats
 * @access  Private
 */
router.get('/stats', authenticate, (req, res) => {
    try {
        const user = statements.getUserById.get(req.user.id);

        // Task stats
        const taskStats = db.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN deadline < datetime('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue
            FROM tasks
            WHERE assignee_id = ?
        `).get(req.user.id);

        // Points history (last 30 days)
        const pointsHistory = db.prepare(`
            SELECT
                date(created_at) as date,
                SUM(amount) as points
            FROM points_transactions
            WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY date
        `).all(req.user.id);

        // Weekly performance
        const weeklyPerformance = db.prepare(`
            SELECT
                strftime('%w', completed_at) as day_of_week,
                COUNT(*) as tasks_completed,
                SUM(points_reward) as points_earned
            FROM tasks
            WHERE assignee_id = ? AND status = 'completed' AND completed_at >= datetime('now', '-30 days')
            GROUP BY strftime('%w', completed_at)
        `).all(req.user.id);

        // Badges
        const badges = statements.getUserBadges.all(req.user.id);

        // Recent achievements
        const recentAchievements = db.prepare(`
            SELECT * FROM points_transactions
            WHERE user_id = ? AND type IN ('task_complete', 'badge', 'streak')
            ORDER BY created_at DESC
            LIMIT 10
        `).all(req.user.id);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    level: user.level,
                    totalPoints: user.total_points,
                    starsBalance: user.stars_balance,
                    streakDays: user.streak_days
                },
                taskStats,
                pointsHistory,
                weeklyPerformance,
                badges,
                recentAchievements
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

/**
 * @route   GET /api/leaderboard/departments
 * @desc    Get department rankings
 * @access  Private
 */
router.get('/departments', authenticate, (req, res) => {
    try {
        const departments = db.prepare(`
            SELECT
                u.department,
                COUNT(DISTINCT u.id) as member_count,
                SUM(u.total_points) as total_points,
                AVG(u.total_points) as avg_points,
                SUM(CASE WHEN u.is_online THEN 1 ELSE 0 END) as online_count
            FROM users u
            WHERE u.organization_id = ? AND u.is_active = 1 AND u.department IS NOT NULL
            GROUP BY u.department
            ORDER BY total_points DESC
        `).all(req.user.organizationId);

        res.json({
            success: true,
            data: { departments }
        });

    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get departments'
        });
    }
});

module.exports = router;
