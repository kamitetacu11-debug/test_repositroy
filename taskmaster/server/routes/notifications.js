/**
 * Notifications Routes
 * User notifications management
 */

const express = require('express');
const router = express.Router();
const { db, statements } = require('../models/database');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authenticate, (req, res) => {
    try {
        const { limit = 20, unreadOnly = false } = req.query;

        let sql = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [req.user.id];

        if (unreadOnly === 'true') {
            sql += ' AND is_read = 0';
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const notifications = db.prepare(sql).all(...params);

        // Get unread count
        const { unread } = db.prepare('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0')
            .get(req.user.id);

        res.json({
            success: true,
            data: {
                notifications: notifications.map(n => ({
                    ...n,
                    data: JSON.parse(n.data || '{}')
                })),
                unreadCount: unread
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get notifications'
        });
    }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, (req, res) => {
    try {
        const { id } = req.params;

        const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
            .get(id, req.user.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        statements.markNotificationRead.run(id);

        res.json({
            success: true,
            message: 'Marked as read'
        });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark as read'
        });
    }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticate, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all as read'
        });
    }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const { id } = req.params;

        db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, req.user.id);

        res.json({
            success: true,
            message: 'Notification deleted'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
});

module.exports = router;
