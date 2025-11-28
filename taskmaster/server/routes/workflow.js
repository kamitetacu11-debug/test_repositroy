/**
 * TaskMaster - Workflow Routes (SAP-style)
 * Task approval chains, workflow management
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, statements } = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * Get pending approvals for current user (managers)
 * GET /api/workflow/approvals
 */
router.get('/approvals', authorize('admin', 'manager'), async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organizationId;

        // Get tasks in review status that this manager can approve
        const pendingApprovals = db.prepare(`
            SELECT
                t.id, t.title, t.description, t.status, t.priority, t.difficulty,
                t.points_reward, t.deadline, t.created_at,
                u.id as assignee_id, u.full_name as assignee_name,
                u.department, u.avatar_url,
                ts.content as submission_content, ts.file_path as submission_file,
                ts.created_at as submitted_at
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            LEFT JOIN task_submissions ts ON t.id = ts.task_id AND ts.status = 'submitted'
            WHERE t.organization_id = ?
                AND t.status = 'review'
            ORDER BY t.deadline ASC, t.priority DESC
        `).all(orgId);

        res.json({
            success: true,
            data: {
                pendingCount: pendingApprovals.length,
                approvals: pendingApprovals
            }
        });

    } catch (error) {
        console.error('Get approvals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending approvals'
        });
    }
});

/**
 * Approve a task
 * POST /api/workflow/approve/:taskId
 */
router.post('/approve/:taskId', authorize('admin', 'manager'), async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment, bonusPoints = 0 } = req.body;
        const approverId = req.user.id;

        // Get task
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.status !== 'review') {
            return res.status(400).json({
                success: false,
                message: 'Task is not in review status'
            });
        }

        // Update task status
        db.prepare(`
            UPDATE tasks SET
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(taskId);

        // Update submission status
        db.prepare(`
            UPDATE task_submissions SET
                status = 'approved',
                reviewer_id = ?,
                reviewer_comment = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE task_id = ? AND status = 'submitted'
        `).run(approverId, comment, taskId);

        // Award points to assignee
        const totalPoints = task.points_reward + bonusPoints;
        statements.updateUserPoints.run(totalPoints, task.assignee_id);

        // Award stars (10% of points)
        const starsEarned = Math.floor(totalPoints / 10);
        statements.updateUserStars.run(starsEarned, task.assignee_id);

        // Record points transaction
        statements.addPointsTransaction.run(
            uuidv4(),
            task.assignee_id,
            totalPoints,
            'task_complete',
            'task',
            taskId,
            `Task "${task.title}" approved by ${req.user.fullName}`
        );

        // Create notification for assignee
        statements.createNotification.run(
            uuidv4(),
            task.assignee_id,
            'task_approved',
            'Task Approved!',
            `Your task "${task.title}" has been approved. You earned ${totalPoints} points!`,
            JSON.stringify({ taskId, points: totalPoints, stars: starsEarned, approver: req.user.fullName })
        );

        // Emit socket event
        const io = req.app.get('io');
        io?.to(`org:${req.user.organizationId}`).emit('task:approved', {
            taskId,
            assigneeId: task.assignee_id,
            points: totalPoints,
            approvedBy: req.user.fullName
        });

        res.json({
            success: true,
            data: {
                taskId,
                status: 'completed',
                pointsAwarded: totalPoints,
                starsAwarded: starsEarned
            },
            message: 'Task approved successfully'
        });

    } catch (error) {
        console.error('Approve task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve task'
        });
    }
});

/**
 * Reject/Request revision for a task
 * POST /api/workflow/reject/:taskId
 */
router.post('/reject/:taskId', authorize('admin', 'manager'), async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment, action = 'revision' } = req.body;
        const reviewerId = req.user.id;

        if (!comment) {
            return res.status(400).json({
                success: false,
                message: 'Comment is required when rejecting'
            });
        }

        // Get task
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.status !== 'review') {
            return res.status(400).json({
                success: false,
                message: 'Task is not in review status'
            });
        }

        const newStatus = action === 'reject' ? 'cancelled' : 'in_progress';
        const submissionStatus = action === 'reject' ? 'rejected' : 'revision_requested';

        // Update task status
        db.prepare(`
            UPDATE tasks SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newStatus, taskId);

        // Update submission status
        db.prepare(`
            UPDATE task_submissions SET
                status = ?,
                reviewer_id = ?,
                reviewer_comment = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE task_id = ? AND status = 'submitted'
        `).run(submissionStatus, reviewerId, comment, taskId);

        // Create notification for assignee
        const notificationType = action === 'reject' ? 'task_rejected' : 'revision_requested';
        const notificationTitle = action === 'reject' ? 'Task Rejected' : 'Revision Requested';

        statements.createNotification.run(
            uuidv4(),
            task.assignee_id,
            notificationType,
            notificationTitle,
            `Your task "${task.title}" requires attention: ${comment}`,
            JSON.stringify({ taskId, reviewer: req.user.fullName, comment })
        );

        // Emit socket event
        const io = req.app.get('io');
        io?.to(`org:${req.user.organizationId}`).emit('task:reviewed', {
            taskId,
            assigneeId: task.assignee_id,
            action,
            reviewedBy: req.user.fullName
        });

        res.json({
            success: true,
            data: {
                taskId,
                status: newStatus,
                action
            },
            message: action === 'reject' ? 'Task rejected' : 'Revision requested'
        });

    } catch (error) {
        console.error('Reject task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject task'
        });
    }
});

/**
 * Submit task for review
 * POST /api/workflow/submit/:taskId
 */
router.post('/submit/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content, actualHours } = req.body;
        const userId = req.user.id;

        // Get task
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.assignee_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this task'
            });
        }

        if (task.status === 'completed' || task.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Task is already completed or cancelled'
            });
        }

        // Update task status to review
        db.prepare(`
            UPDATE tasks SET
                status = 'review',
                actual_hours = COALESCE(?, actual_hours),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(actualHours, taskId);

        // Create submission record
        const submissionId = uuidv4();
        db.prepare(`
            INSERT INTO task_submissions (id, task_id, user_id, content, status)
            VALUES (?, ?, ?, ?, 'submitted')
        `).run(submissionId, taskId, userId, content);

        // Notify managers
        const managers = db.prepare(`
            SELECT id FROM users
            WHERE organization_id = ?
                AND role IN ('admin', 'manager')
                AND is_active = 1
        `).all(req.user.organizationId);

        managers.forEach(manager => {
            statements.createNotification.run(
                uuidv4(),
                manager.id,
                'task_submitted',
                'Task Submitted for Review',
                `${req.user.fullName} submitted "${task.title}" for review`,
                JSON.stringify({ taskId, submissionId, submitter: req.user.fullName })
            );
        });

        // Emit socket event
        const io = req.app.get('io');
        io?.to(`org:${req.user.organizationId}`).emit('task:submitted', {
            taskId,
            submitterId: userId,
            submitterName: req.user.fullName,
            taskTitle: task.title
        });

        res.json({
            success: true,
            data: {
                taskId,
                submissionId,
                status: 'review'
            },
            message: 'Task submitted for review'
        });

    } catch (error) {
        console.error('Submit task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit task'
        });
    }
});

/**
 * Get workflow statistics
 * GET /api/workflow/stats
 */
router.get('/stats', authorize('admin', 'manager'), async (req, res) => {
    try {
        const orgId = req.user.organizationId;

        // Get workflow metrics
        const stats = db.prepare(`
            SELECT
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as pending_review,
                AVG(CASE WHEN status = 'completed'
                    THEN julianday(completed_at) - julianday(created_at)
                    ELSE NULL END) as avg_completion_days,
                SUM(CASE WHEN status = 'completed' AND completed_at <= deadline THEN 1 ELSE 0 END) as on_time_count,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
            FROM tasks
            WHERE organization_id = ?
        `).get(orgId);

        // Recent approvals
        const recentApprovals = db.prepare(`
            SELECT
                t.id, t.title, t.completed_at,
                u.full_name as assignee_name,
                r.full_name as approver_name,
                ts.reviewer_comment
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            LEFT JOIN task_submissions ts ON t.id = ts.task_id AND ts.status = 'approved'
            LEFT JOIN users r ON ts.reviewer_id = r.id
            WHERE t.organization_id = ?
                AND t.status = 'completed'
            ORDER BY t.completed_at DESC
            LIMIT 10
        `).all(orgId);

        res.json({
            success: true,
            data: {
                pendingReview: stats.pending_review || 0,
                avgCompletionDays: stats.avg_completion_days ? parseFloat(stats.avg_completion_days.toFixed(1)) : 0,
                onTimeRate: stats.completed_count > 0
                    ? parseFloat(((stats.on_time_count / stats.completed_count) * 100).toFixed(1))
                    : 0,
                totalCompleted: stats.completed_count || 0,
                recentApprovals
            }
        });

    } catch (error) {
        console.error('Workflow stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get workflow stats'
        });
    }
});

/**
 * Bulk approve tasks
 * POST /api/workflow/bulk-approve
 */
router.post('/bulk-approve', authorize('admin', 'manager'), async (req, res) => {
    try {
        const { taskIds, comment } = req.body;
        const approverId = req.user.id;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Task IDs are required'
            });
        }

        const results = {
            approved: [],
            failed: []
        };

        for (const taskId of taskIds) {
            try {
                const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

                if (!task || task.status !== 'review') {
                    results.failed.push({ taskId, reason: 'Not found or not in review' });
                    continue;
                }

                // Update task
                db.prepare(`
                    UPDATE tasks SET
                        status = 'completed',
                        completed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(taskId);

                // Update submission
                db.prepare(`
                    UPDATE task_submissions SET
                        status = 'approved',
                        reviewer_id = ?,
                        reviewer_comment = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE task_id = ? AND status = 'submitted'
                `).run(approverId, comment || 'Bulk approved', taskId);

                // Award points
                statements.updateUserPoints.run(task.points_reward, task.assignee_id);
                statements.updateUserStars.run(Math.floor(task.points_reward / 10), task.assignee_id);

                // Record transaction
                statements.addPointsTransaction.run(
                    uuidv4(),
                    task.assignee_id,
                    task.points_reward,
                    'task_complete',
                    'task',
                    taskId,
                    `Task "${task.title}" bulk approved`
                );

                results.approved.push(taskId);
            } catch (err) {
                results.failed.push({ taskId, reason: err.message });
            }
        }

        // Emit socket event
        const io = req.app.get('io');
        io?.to(`org:${req.user.organizationId}`).emit('tasks:bulk-approved', {
            count: results.approved.length,
            approvedBy: req.user.fullName
        });

        res.json({
            success: true,
            data: results,
            message: `${results.approved.length} tasks approved, ${results.failed.length} failed`
        });

    } catch (error) {
        console.error('Bulk approve error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk approve tasks'
        });
    }
});

module.exports = router;
