/**
 * Tasks Routes
 * CRUD operations for tasks with gamification integration
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { db, statements } = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/security');
const config = require('../config/config');

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.upload.path);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: config.upload.maxSize },
    fileFilter: (req, file, cb) => {
        if (config.upload.allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

/**
 * Calculate points with multipliers
 */
const calculatePoints = (task, user) => {
    let points = task.points_reward || 10;

    // Difficulty multiplier
    const difficultyMult = config.gamification.pointsMultiplier[task.difficulty] || 1;
    points *= difficultyMult;

    // Streak bonus
    const streakBonus = Object.entries(config.gamification.streakBonus)
        .filter(([days]) => user.streakDays >= parseInt(days))
        .pop();

    if (streakBonus) {
        points *= (1 + streakBonus[1]);
    }

    // Early completion bonus (before deadline)
    if (task.deadline) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        if (now < deadline) {
            const hoursEarly = (deadline - now) / (1000 * 60 * 60);
            if (hoursEarly > 24) {
                points *= 1.25; // 25% bonus for completing > 24h early
            } else if (hoursEarly > 12) {
                points *= 1.1; // 10% bonus for completing > 12h early
            }
        }
    }

    return Math.round(points);
};

/**
 * Calculate user level based on total points
 */
const calculateLevel = (totalPoints) => {
    const thresholds = config.gamification.levelThresholds;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (totalPoints >= thresholds[i]) {
            return i + 1;
        }
    }
    return 1;
};

/**
 * Detect code language from file extension or content
 */
const detectCodeLanguage = (filename, content) => {
    const ext = path.extname(filename).toLowerCase();
    const langMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.cs': 'csharp',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.html': 'html',
        '.css': 'css',
        '.sql': 'sql',
        '.json': 'json',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.md': 'markdown',
        '.sh': 'bash',
        '.rs': 'rust',
        '.swift': 'swift',
        '.kt': 'kotlin'
    };
    return langMap[ext] || 'plaintext';
};

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for user/organization
 * @access  Private
 */
router.get('/',
    authenticate,
    [
        query('status').optional().isIn(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
        query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
        query('assignee').optional().isUUID(),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    (req, res) => {
        try {
            const { status, priority, assignee, limit = 50, offset = 0 } = req.query;

            let sql = `
                SELECT t.*,
                       u1.full_name as assignee_name,
                       u2.full_name as creator_name
                FROM tasks t
                LEFT JOIN users u1 ON t.assignee_id = u1.id
                LEFT JOIN users u2 ON t.creator_id = u2.id
                WHERE t.organization_id = ?
            `;
            const params = [req.user.organizationId];

            // Role-based filtering
            if (req.user.role === 'employee') {
                sql += ' AND (t.assignee_id = ? OR t.creator_id = ?)';
                params.push(req.user.id, req.user.id);
            }

            if (status) {
                sql += ' AND t.status = ?';
                params.push(status);
            }

            if (priority) {
                sql += ' AND t.priority = ?';
                params.push(priority);
            }

            if (assignee) {
                sql += ' AND t.assignee_id = ?';
                params.push(assignee);
            }

            sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const tasks = db.prepare(sql).all(...params);

            // Get total count
            let countSql = 'SELECT COUNT(*) as count FROM tasks WHERE organization_id = ?';
            const countParams = [req.user.organizationId];

            if (req.user.role === 'employee') {
                countSql += ' AND (assignee_id = ? OR creator_id = ?)';
                countParams.push(req.user.id, req.user.id);
            }

            const { count } = db.prepare(countSql).get(...countParams);

            res.json({
                success: true,
                data: {
                    tasks: tasks.map(t => ({
                        ...t,
                        tags: JSON.parse(t.tags || '[]')
                    })),
                    pagination: {
                        total: count,
                        limit: parseInt(limit),
                        offset: parseInt(offset)
                    }
                }
            });

        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get tasks'
            });
        }
    }
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task with submissions
 * @access  Private
 */
router.get('/:id', authenticate, (req, res) => {
    try {
        const task = statements.getTaskById.get(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Check access
        if (req.user.role === 'employee' &&
            task.assignee_id !== req.user.id &&
            task.creator_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Get submissions
        const submissions = db.prepare(`
            SELECT s.*, u.full_name as user_name
            FROM task_submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.task_id = ?
            ORDER BY s.created_at DESC
        `).all(task.id);

        // Get assignee and creator info
        const assignee = task.assignee_id ? statements.getUserById.get(task.assignee_id) : null;
        const creator = statements.getUserById.get(task.creator_id);

        res.json({
            success: true,
            data: {
                task: {
                    ...task,
                    tags: JSON.parse(task.tags || '[]'),
                    assignee: assignee ? {
                        id: assignee.id,
                        fullName: assignee.full_name,
                        avatarUrl: assignee.avatar_url
                    } : null,
                    creator: {
                        id: creator.id,
                        fullName: creator.full_name,
                        avatarUrl: creator.avatar_url
                    }
                },
                submissions
            }
        });

    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get task'
        });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private (manager, admin)
 */
router.post('/',
    authenticate,
    authorize('admin', 'manager'),
    [
        body('title').trim().isLength({ min: 3, max: 500 }),
        body('description').optional().trim(),
        body('assigneeId').optional().isUUID(),
        body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
        body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'expert']),
        body('pointsReward').optional().isInt({ min: 1, max: 1000 }),
        body('deadline').optional().isISO8601(),
        body('tags').optional().isArray()
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

            const {
                title,
                description,
                assigneeId,
                priority = 'medium',
                difficulty = 'medium',
                pointsReward = 10,
                deadline,
                tags = []
            } = req.body;

            const taskId = uuidv4();

            statements.createTask.run(
                taskId,
                req.user.organizationId,
                title,
                description || null,
                assigneeId || null,
                req.user.id,
                priority,
                difficulty,
                pointsReward,
                deadline || null
            );

            // Update tags
            if (tags.length > 0) {
                db.prepare('UPDATE tasks SET tags = ? WHERE id = ?').run(JSON.stringify(tags), taskId);
            }

            // Create notification for assignee
            if (assigneeId) {
                const notifId = uuidv4();
                statements.createNotification.run(
                    notifId,
                    assigneeId,
                    'task_assigned',
                    'New Task Assigned',
                    `You have been assigned: ${title}`,
                    JSON.stringify({ taskId })
                );
            }

            const task = statements.getTaskById.get(taskId);

            res.status(201).json({
                success: true,
                message: 'Task created',
                data: { task }
            });

        } catch (error) {
            console.error('Create task error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create task'
            });
        }
    }
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id',
    authenticate,
    [
        body('title').optional().trim().isLength({ min: 3, max: 500 }),
        body('description').optional().trim(),
        body('status').optional().isIn(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
        body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
    ],
    (req, res) => {
        try {
            const task = statements.getTaskById.get(req.params.id);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            // Check permissions
            const canEdit = req.user.role === 'admin' ||
                          req.user.role === 'manager' ||
                          task.assignee_id === req.user.id;

            if (!canEdit) {
                return res.status(403).json({
                    success: false,
                    error: 'Permission denied'
                });
            }

            const { title, description, status, priority, actualHours } = req.body;
            const updates = [];
            const values = [];

            if (title) { updates.push('title = ?'); values.push(title); }
            if (description !== undefined) { updates.push('description = ?'); values.push(description); }
            if (status) { updates.push('status = ?'); values.push(status); }
            if (priority) { updates.push('priority = ?'); values.push(priority); }
            if (actualHours) { updates.push('actual_hours = ?'); values.push(actualHours); }

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                values.push(req.params.id);

                db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }

            const updatedTask = statements.getTaskById.get(req.params.id);

            res.json({
                success: true,
                data: { task: updatedTask }
            });

        } catch (error) {
            console.error('Update task error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update task'
            });
        }
    }
);

/**
 * @route   POST /api/tasks/:id/complete
 * @desc    Complete a task and award points
 * @access  Private
 */
router.post('/:id/complete', authenticate, (req, res) => {
    try {
        const task = statements.getTaskById.get(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        if (task.assignee_id !== req.user.id && req.user.role === 'employee') {
            return res.status(403).json({
                success: false,
                error: 'Only assignee can complete the task'
            });
        }

        if (task.status === 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Task already completed'
            });
        }

        // Calculate points
        const points = calculatePoints(task, req.user);
        const starsEarned = Math.round(points / 10); // 1 star per 10 points

        // Update task
        statements.completeTask.run(task.id);

        // Award points
        const transactionId = uuidv4();
        statements.addPointsTransaction.run(
            transactionId,
            req.user.id,
            points,
            'task_complete',
            'task',
            task.id,
            `Completed: ${task.title}`
        );

        // Update user points and stars
        statements.updateUserPoints.run(points, req.user.id);
        statements.updateUserStars.run(starsEarned, req.user.id);

        // Check for level up
        const user = statements.getUserById.get(req.user.id);
        const newLevel = calculateLevel(user.total_points);

        if (newLevel > user.level) {
            statements.updateUserLevel.run(newLevel, req.user.id);

            // Level up notification
            const notifId = uuidv4();
            statements.createNotification.run(
                notifId,
                req.user.id,
                'level_up',
                'Level Up!',
                `Congratulations! You've reached level ${newLevel}!`,
                JSON.stringify({ newLevel, oldLevel: user.level })
            );
        }

        // Notify creator
        if (task.creator_id !== req.user.id) {
            const notifId = uuidv4();
            statements.createNotification.run(
                notifId,
                task.creator_id,
                'task_completed',
                'Task Completed',
                `${req.user.fullName} completed: ${task.title}`,
                JSON.stringify({ taskId: task.id })
            );
        }

        res.json({
            success: true,
            message: 'Task completed!',
            data: {
                pointsEarned: points,
                starsEarned,
                newTotal: user.total_points + points,
                newLevel: newLevel > user.level ? newLevel : null
            }
        });

    } catch (error) {
        console.error('Complete task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete task'
        });
    }
});

/**
 * @route   POST /api/tasks/:id/submit
 * @desc    Submit solution for a task
 * @access  Private
 */
router.post('/:id/submit',
    authenticate,
    uploadLimiter,
    upload.single('file'),
    [
        body('content').optional().trim(),
        body('codeLanguage').optional().trim()
    ],
    (req, res) => {
        try {
            const task = statements.getTaskById.get(req.params.id);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            const { content, codeLanguage } = req.body;
            const file = req.file;

            if (!content && !file) {
                return res.status(400).json({
                    success: false,
                    error: 'Content or file is required'
                });
            }

            const submissionId = uuidv4();
            let fileType = null;
            let detectedLanguage = codeLanguage;

            if (file) {
                fileType = file.mimetype;
                if (!detectedLanguage && (fileType.startsWith('text/') || fileType === 'application/javascript')) {
                    detectedLanguage = detectCodeLanguage(file.originalname, '');
                }
            }

            db.prepare(`
                INSERT INTO task_submissions (id, task_id, user_id, content, file_path, file_type, file_name, code_language)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                submissionId,
                task.id,
                req.user.id,
                content || null,
                file ? file.filename : null,
                fileType,
                file ? file.originalname : null,
                detectedLanguage || null
            );

            // Update task status to review
            statements.updateTaskStatus.run('review', task.id);

            // Notify creator/manager
            if (task.creator_id !== req.user.id) {
                const notifId = uuidv4();
                statements.createNotification.run(
                    notifId,
                    task.creator_id,
                    'submission_received',
                    'New Submission',
                    `${req.user.fullName} submitted a solution for: ${task.title}`,
                    JSON.stringify({ taskId: task.id, submissionId })
                );
            }

            res.status(201).json({
                success: true,
                message: 'Submission received',
                data: {
                    submissionId,
                    status: 'submitted'
                }
            });

        } catch (error) {
            console.error('Submit task error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit'
            });
        }
    }
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private (admin, manager, creator)
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const task = statements.getTaskById.get(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        const canDelete = req.user.role === 'admin' ||
                         req.user.role === 'manager' ||
                         task.creator_id === req.user.id;

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                error: 'Permission denied'
            });
        }

        db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

        res.json({
            success: true,
            message: 'Task deleted'
        });

    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete task'
        });
    }
});

module.exports = router;
