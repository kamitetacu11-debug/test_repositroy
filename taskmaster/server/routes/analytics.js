/**
 * TaskMaster - Analytics Routes (SAP-style)
 * KPI Dashboard, Workflow Analytics, Business Intelligence
 */

const express = require('express');
const router = express.Router();
const { db, statements } = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * Get KPI Dashboard Data
 * GET /api/analytics/kpi
 */
router.get('/kpi', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const orgId = req.user.organizationId;

        // Calculate date range
        let daysBack = 30;
        if (period === '7d') daysBack = 7;
        else if (period === '90d') daysBack = 90;
        else if (period === '365d') daysBack = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Task KPIs
        const taskStats = db.prepare(`
            SELECT
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review_tasks,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_tasks,
                SUM(CASE WHEN status = 'completed' AND completed_at <= deadline THEN 1 ELSE 0 END) as on_time_completions,
                AVG(CASE WHEN status = 'completed' AND estimated_hours > 0 AND actual_hours > 0
                    THEN (actual_hours / estimated_hours) * 100 ELSE NULL END) as efficiency_rate,
                SUM(points_reward) as total_points_available,
                SUM(CASE WHEN status = 'completed' THEN points_reward ELSE 0 END) as total_points_earned
            FROM tasks
            WHERE organization_id = ? AND created_at >= ?
        `).get(orgId, startDateStr);

        // User Performance KPIs
        const userStats = db.prepare(`
            SELECT
                COUNT(DISTINCT id) as total_users,
                AVG(total_points) as avg_points_per_user,
                AVG(level) as avg_level,
                AVG(streak_days) as avg_streak,
                SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online_users
            FROM users
            WHERE organization_id = ? AND is_active = 1
        `).get(orgId);

        // Daily task completion trend
        const dailyTrend = db.prepare(`
            SELECT
                DATE(completed_at) as date,
                COUNT(*) as completed_count,
                SUM(points_reward) as points_earned
            FROM tasks
            WHERE organization_id = ?
                AND status = 'completed'
                AND completed_at >= ?
            GROUP BY DATE(completed_at)
            ORDER BY date DESC
            LIMIT 30
        `).all(orgId, startDateStr);

        // Department performance
        const deptPerformance = db.prepare(`
            SELECT
                u.department,
                COUNT(DISTINCT u.id) as user_count,
                SUM(u.total_points) as total_points,
                AVG(u.total_points) as avg_points,
                COUNT(t.id) as tasks_assigned,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed
            FROM users u
            LEFT JOIN tasks t ON u.id = t.assignee_id AND t.created_at >= ?
            WHERE u.organization_id = ? AND u.is_active = 1 AND u.department IS NOT NULL
            GROUP BY u.department
            ORDER BY total_points DESC
        `).all(startDateStr, orgId);

        // Calculate KPI metrics
        const completionRate = taskStats.total_tasks > 0
            ? ((taskStats.completed_tasks / taskStats.total_tasks) * 100).toFixed(1)
            : 0;

        const onTimeRate = taskStats.completed_tasks > 0
            ? ((taskStats.on_time_completions / taskStats.completed_tasks) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            data: {
                summary: {
                    totalTasks: taskStats.total_tasks || 0,
                    completedTasks: taskStats.completed_tasks || 0,
                    inProgressTasks: taskStats.in_progress_tasks || 0,
                    pendingTasks: taskStats.pending_tasks || 0,
                    reviewTasks: taskStats.review_tasks || 0,
                    urgentTasks: taskStats.urgent_tasks || 0,
                    completionRate: parseFloat(completionRate),
                    onTimeRate: parseFloat(onTimeRate),
                    efficiencyRate: taskStats.efficiency_rate ? parseFloat(taskStats.efficiency_rate.toFixed(1)) : 100,
                    totalPointsAvailable: taskStats.total_points_available || 0,
                    totalPointsEarned: taskStats.total_points_earned || 0
                },
                users: {
                    totalUsers: userStats.total_users || 0,
                    onlineUsers: userStats.online_users || 0,
                    avgPointsPerUser: Math.round(userStats.avg_points_per_user || 0),
                    avgLevel: parseFloat((userStats.avg_level || 1).toFixed(1)),
                    avgStreak: parseFloat((userStats.avg_streak || 0).toFixed(1))
                },
                dailyTrend: dailyTrend.reverse(),
                departmentPerformance: deptPerformance,
                period
            }
        });

    } catch (error) {
        console.error('KPI Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load KPI data'
        });
    }
});

/**
 * Get Workflow Status
 * GET /api/analytics/workflow
 */
router.get('/workflow', async (req, res) => {
    try {
        const orgId = req.user.organizationId;

        // Task pipeline stages
        const pipeline = db.prepare(`
            SELECT
                status,
                COUNT(*) as count,
                SUM(points_reward) as total_points,
                AVG(julianday('now') - julianday(created_at)) as avg_age_days
            FROM tasks
            WHERE organization_id = ?
            GROUP BY status
        `).all(orgId);

        // Bottleneck detection (tasks stuck in a stage)
        const bottlenecks = db.prepare(`
            SELECT
                id, title, status, priority,
                julianday('now') - julianday(updated_at) as days_since_update,
                assignee_id
            FROM tasks
            WHERE organization_id = ?
                AND status NOT IN ('completed', 'cancelled')
                AND julianday('now') - julianday(updated_at) > 3
            ORDER BY days_since_update DESC
            LIMIT 10
        `).all(orgId);

        // Task flow (transitions)
        const recentTransitions = db.prepare(`
            SELECT
                status,
                COUNT(*) as count,
                DATE(updated_at) as date
            FROM tasks
            WHERE organization_id = ?
                AND updated_at >= datetime('now', '-7 days')
            GROUP BY status, DATE(updated_at)
            ORDER BY date DESC
        `).all(orgId);

        // Workload distribution
        const workloadDist = db.prepare(`
            SELECT
                u.id, u.full_name, u.department,
                COUNT(t.id) as assigned_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.priority = 'urgent' OR t.priority = 'high' THEN 1 ELSE 0 END) as high_priority_tasks
            FROM users u
            LEFT JOIN tasks t ON u.id = t.assignee_id AND t.status NOT IN ('completed', 'cancelled')
            WHERE u.organization_id = ? AND u.is_active = 1
            GROUP BY u.id
            ORDER BY assigned_tasks DESC
        `).all(orgId);

        res.json({
            success: true,
            data: {
                pipeline: pipeline.map(p => ({
                    status: p.status,
                    count: p.count,
                    totalPoints: p.total_points || 0,
                    avgAgeDays: parseFloat((p.avg_age_days || 0).toFixed(1))
                })),
                bottlenecks: bottlenecks.map(b => ({
                    id: b.id,
                    title: b.title,
                    status: b.status,
                    priority: b.priority,
                    daysSinceUpdate: parseFloat(b.days_since_update.toFixed(1)),
                    assigneeId: b.assignee_id
                })),
                recentTransitions,
                workloadDistribution: workloadDist
            }
        });

    } catch (error) {
        console.error('Workflow analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load workflow data'
        });
    }
});

/**
 * Get User Performance Analytics
 * GET /api/analytics/performance
 */
router.get('/performance', async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30d' } = req.query;

        let daysBack = 30;
        if (period === '7d') daysBack = 7;
        else if (period === '90d') daysBack = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Personal performance
        const personalStats = db.prepare(`
            SELECT
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'completed' THEN points_reward ELSE 0 END) as points_earned,
                AVG(CASE WHEN status = 'completed' AND estimated_hours > 0 AND actual_hours > 0
                    THEN (actual_hours / estimated_hours) * 100 ELSE NULL END) as efficiency,
                SUM(CASE WHEN status = 'completed' AND completed_at <= deadline THEN 1 ELSE 0 END) as on_time
            FROM tasks
            WHERE assignee_id = ? AND created_at >= ?
        `).get(userId, startDateStr);

        // Daily productivity
        const dailyProductivity = db.prepare(`
            SELECT
                DATE(completed_at) as date,
                COUNT(*) as tasks_completed,
                SUM(points_reward) as points_earned
            FROM tasks
            WHERE assignee_id = ? AND status = 'completed' AND completed_at >= ?
            GROUP BY DATE(completed_at)
            ORDER BY date
        `).all(userId, startDateStr);

        // Task breakdown by difficulty
        const difficultyBreakdown = db.prepare(`
            SELECT
                difficulty,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM tasks
            WHERE assignee_id = ? AND created_at >= ?
            GROUP BY difficulty
        `).all(userId, startDateStr);

        // Rank in organization
        const rank = db.prepare(`
            SELECT COUNT(*) + 1 as rank
            FROM users
            WHERE organization_id = ? AND total_points > (
                SELECT total_points FROM users WHERE id = ?
            )
        `).get(req.user.organizationId, userId);

        // Recent achievements
        const recentBadges = db.prepare(`
            SELECT b.name, b.icon, b.tier, ub.earned_at
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = ?
            ORDER BY ub.earned_at DESC
            LIMIT 5
        `).all(userId);

        res.json({
            success: true,
            data: {
                summary: {
                    totalTasks: personalStats.total_tasks || 0,
                    completedTasks: personalStats.completed_tasks || 0,
                    pointsEarned: personalStats.points_earned || 0,
                    efficiency: personalStats.efficiency ? parseFloat(personalStats.efficiency.toFixed(1)) : 100,
                    onTimeCompletions: personalStats.on_time || 0,
                    rank: rank.rank
                },
                dailyProductivity,
                difficultyBreakdown,
                recentBadges,
                period
            }
        });

    } catch (error) {
        console.error('Performance analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load performance data'
        });
    }
});

/**
 * Get Organization Overview (Admin/Manager only)
 * GET /api/analytics/organization
 */
router.get('/organization', authorize('admin', 'manager'), async (req, res) => {
    try {
        const orgId = req.user.organizationId;

        // Organization summary
        const orgSummary = db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE organization_id = ? AND is_active = 1) as total_employees,
                (SELECT COUNT(*) FROM tasks WHERE organization_id = ?) as total_tasks,
                (SELECT SUM(total_points) FROM users WHERE organization_id = ?) as total_points_earned,
                (SELECT COUNT(DISTINCT department) FROM users WHERE organization_id = ? AND department IS NOT NULL) as department_count
        `).get(orgId, orgId, orgId, orgId);

        // Top performers
        const topPerformers = db.prepare(`
            SELECT id, full_name, department, total_points, level, streak_days, avatar_url
            FROM users
            WHERE organization_id = ? AND is_active = 1
            ORDER BY total_points DESC
            LIMIT 10
        `).all(orgId);

        // Task completion by department
        const deptCompletion = db.prepare(`
            SELECT
                u.department,
                COUNT(t.id) as total_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                ROUND(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0 END) / COUNT(t.id) * 100, 1) as completion_rate
            FROM users u
            JOIN tasks t ON u.id = t.assignee_id
            WHERE u.organization_id = ? AND u.department IS NOT NULL
            GROUP BY u.department
            ORDER BY completion_rate DESC
        `).all(orgId);

        // Activity heatmap (last 30 days)
        const activityHeatmap = db.prepare(`
            SELECT
                strftime('%w', completed_at) as day_of_week,
                strftime('%H', completed_at) as hour,
                COUNT(*) as count
            FROM tasks
            WHERE organization_id = ?
                AND status = 'completed'
                AND completed_at >= datetime('now', '-30 days')
            GROUP BY day_of_week, hour
        `).all(orgId);

        res.json({
            success: true,
            data: {
                summary: {
                    totalEmployees: orgSummary.total_employees || 0,
                    totalTasks: orgSummary.total_tasks || 0,
                    totalPointsEarned: orgSummary.total_points_earned || 0,
                    departmentCount: orgSummary.department_count || 0
                },
                topPerformers,
                departmentCompletion: deptCompletion,
                activityHeatmap
            }
        });

    } catch (error) {
        console.error('Organization analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load organization data'
        });
    }
});

/**
 * Export analytics data (CSV)
 * GET /api/analytics/export
 */
router.get('/export', authorize('admin', 'manager'), async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { type = 'tasks', format = 'csv' } = req.query;

        let data = [];
        let filename = '';

        if (type === 'tasks') {
            data = db.prepare(`
                SELECT
                    t.id, t.title, t.status, t.priority, t.difficulty,
                    t.points_reward, t.deadline, t.completed_at, t.created_at,
                    u.full_name as assignee_name, u.department
                FROM tasks t
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE t.organization_id = ?
                ORDER BY t.created_at DESC
            `).all(orgId);
            filename = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (type === 'users') {
            data = db.prepare(`
                SELECT
                    full_name, email, department, role,
                    total_points, level, streak_days, created_at
                FROM users
                WHERE organization_id = ? AND is_active = 1
                ORDER BY total_points DESC
            `).all(orgId);
            filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        }

        if (format === 'csv') {
            // Convert to CSV
            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No data to export'
                });
            }

            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row =>
                Object.values(row).map(v =>
                    typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
                ).join(',')
            );
            const csv = [headers, ...rows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data
            });
        }

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data'
        });
    }
});

module.exports = router;
