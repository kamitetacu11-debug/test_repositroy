/**
 * Chat Routes
 * Real-time messaging with file and code sharing
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { db, statements } = require('../models/database');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/security');
const config = require('../config/config');

// File upload for chat
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(config.upload.path, 'chat'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: config.upload.maxSize }
});

/**
 * @route   GET /api/chat/channels
 * @desc    Get user's chat channels
 * @access  Private
 */
router.get('/channels', authenticate, (req, res) => {
    try {
        const channels = db.prepare(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id) as message_count,
                   (SELECT content FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
            FROM chat_channels c
            INNER JOIN channel_members cm ON c.id = cm.channel_id
            WHERE cm.user_id = ?
            ORDER BY last_message_at DESC NULLS LAST
        `).all(req.user.id);

        // Get member counts and online status
        const channelsWithMembers = channels.map(channel => {
            const members = db.prepare(`
                SELECT u.id, u.full_name, u.avatar_url, u.is_online
                FROM channel_members cm
                JOIN users u ON cm.user_id = u.id
                WHERE cm.channel_id = ?
            `).all(channel.id);

            return {
                ...channel,
                members,
                memberCount: members.length,
                onlineCount: members.filter(m => m.is_online).length
            };
        });

        res.json({
            success: true,
            data: { channels: channelsWithMembers }
        });

    } catch (error) {
        console.error('Get channels error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get channels'
        });
    }
});

/**
 * @route   POST /api/chat/channels
 * @desc    Create a new channel
 * @access  Private
 */
router.post('/channels',
    authenticate,
    [
        body('name').trim().isLength({ min: 2, max: 100 }),
        body('type').optional().isIn(['public', 'private']),
        body('memberIds').optional().isArray()
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

            const { name, type = 'public', memberIds = [] } = req.body;
            const channelId = uuidv4();

            // Create channel
            db.prepare(`
                INSERT INTO chat_channels (id, organization_id, name, type, created_by)
                VALUES (?, ?, ?, ?, ?)
            `).run(channelId, req.user.organizationId, name, type, req.user.id);

            // Add creator as admin
            db.prepare(`
                INSERT INTO channel_members (channel_id, user_id, role)
                VALUES (?, ?, 'admin')
            `).run(channelId, req.user.id);

            // Add other members
            const addMember = db.prepare(`
                INSERT OR IGNORE INTO channel_members (channel_id, user_id)
                VALUES (?, ?)
            `);

            memberIds.forEach(memberId => {
                if (memberId !== req.user.id) {
                    addMember.run(channelId, memberId);
                }
            });

            // Send system message
            const messageId = uuidv4();
            statements.createMessage.run(
                messageId,
                channelId,
                req.user.id,
                `${req.user.fullName} created the channel`,
                'system',
                null,
                null,
                null
            );

            const channel = db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(channelId);

            res.status(201).json({
                success: true,
                data: { channel }
            });

        } catch (error) {
            console.error('Create channel error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create channel'
            });
        }
    }
);

/**
 * @route   POST /api/chat/channels/direct
 * @desc    Create or get direct message channel
 * @access  Private
 */
router.post('/channels/direct',
    authenticate,
    [body('userId').isUUID()],
    (req, res) => {
        try {
            const { userId } = req.body;

            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot create DM with yourself'
                });
            }

            // Check if DM channel already exists
            const existing = db.prepare(`
                SELECT c.* FROM chat_channels c
                WHERE c.type = 'direct'
                AND c.id IN (
                    SELECT channel_id FROM channel_members WHERE user_id = ?
                )
                AND c.id IN (
                    SELECT channel_id FROM channel_members WHERE user_id = ?
                )
                AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
            `).get(req.user.id, userId);

            if (existing) {
                return res.json({
                    success: true,
                    data: { channel: existing, existing: true }
                });
            }

            // Get other user info
            const otherUser = statements.getUserById.get(userId);
            if (!otherUser) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Create new DM channel
            const channelId = uuidv4();

            db.prepare(`
                INSERT INTO chat_channels (id, organization_id, name, type, created_by)
                VALUES (?, ?, ?, 'direct', ?)
            `).run(channelId, req.user.organizationId, `DM: ${req.user.fullName} & ${otherUser.full_name}`, req.user.id);

            // Add both users
            db.prepare('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(channelId, req.user.id);
            db.prepare('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(channelId, userId);

            const channel = db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(channelId);

            res.status(201).json({
                success: true,
                data: { channel, existing: false }
            });

        } catch (error) {
            console.error('Create DM error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create direct message'
            });
        }
    }
);

/**
 * @route   GET /api/chat/channels/:channelId/messages
 * @desc    Get messages from a channel
 * @access  Private
 */
router.get('/channels/:channelId/messages',
    authenticate,
    [
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    (req, res) => {
        try {
            const { channelId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            // Check membership
            const membership = db.prepare(`
                SELECT * FROM channel_members
                WHERE channel_id = ? AND user_id = ?
            `).get(channelId, req.user.id);

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this channel'
                });
            }

            const messages = statements.getChannelMessages.all(channelId, parseInt(limit), parseInt(offset));

            // Get total count
            const { count } = db.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE channel_id = ?').get(channelId);

            res.json({
                success: true,
                data: {
                    messages: messages.reverse(), // Return in chronological order
                    pagination: {
                        total: count,
                        limit: parseInt(limit),
                        offset: parseInt(offset)
                    }
                }
            });

        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get messages'
            });
        }
    }
);

/**
 * @route   POST /api/chat/channels/:channelId/messages
 * @desc    Send a message
 * @access  Private
 */
router.post('/channels/:channelId/messages',
    authenticate,
    [
        body('content').optional().trim().isLength({ min: 1, max: 5000 }),
        body('messageType').optional().isIn(['text', 'code', 'file']),
        body('codeLanguage').optional().trim()
    ],
    (req, res) => {
        try {
            const { channelId } = req.params;
            const { content, messageType = 'text', codeLanguage, replyToId } = req.body;

            // Check membership
            const membership = db.prepare(`
                SELECT * FROM channel_members
                WHERE channel_id = ? AND user_id = ?
            `).get(channelId, req.user.id);

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this channel'
                });
            }

            if (!content) {
                return res.status(400).json({
                    success: false,
                    error: 'Message content is required'
                });
            }

            const messageId = uuidv4();

            statements.createMessage.run(
                messageId,
                channelId,
                req.user.id,
                content,
                messageType,
                null,
                null,
                codeLanguage || null
            );

            // Update reply_to if provided
            if (replyToId) {
                db.prepare('UPDATE chat_messages SET reply_to_id = ? WHERE id = ?').run(replyToId, messageId);
            }

            const message = db.prepare(`
                SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
                FROM chat_messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = ?
            `).get(messageId);

            res.status(201).json({
                success: true,
                data: { message }
            });

        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send message'
            });
        }
    }
);

/**
 * @route   POST /api/chat/channels/:channelId/upload
 * @desc    Upload file to chat
 * @access  Private
 */
router.post('/channels/:channelId/upload',
    authenticate,
    uploadLimiter,
    upload.single('file'),
    (req, res) => {
        try {
            const { channelId } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'File is required'
                });
            }

            // Check membership
            const membership = db.prepare(`
                SELECT * FROM channel_members
                WHERE channel_id = ? AND user_id = ?
            `).get(channelId, req.user.id);

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this channel'
                });
            }

            // Detect code language if applicable
            const ext = path.extname(file.originalname).toLowerCase();
            const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rb', '.php', '.html', '.css', '.json', '.xml'];
            const isCode = codeExtensions.includes(ext);

            const langMap = {
                '.js': 'javascript',
                '.ts': 'typescript',
                '.py': 'python',
                '.java': 'java',
                '.cpp': 'cpp',
                '.go': 'go',
                '.html': 'html',
                '.css': 'css',
                '.json': 'json'
            };

            const messageId = uuidv4();

            statements.createMessage.run(
                messageId,
                channelId,
                req.user.id,
                `Shared file: ${file.originalname}`,
                'file',
                file.filename,
                file.originalname,
                isCode ? langMap[ext] || 'plaintext' : null
            );

            const message = db.prepare(`
                SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
                FROM chat_messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = ?
            `).get(messageId);

            res.status(201).json({
                success: true,
                data: {
                    message,
                    file: {
                        name: file.originalname,
                        path: `/uploads/chat/${file.filename}`,
                        type: file.mimetype,
                        size: file.size
                    }
                }
            });

        } catch (error) {
            console.error('Upload file error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload file'
            });
        }
    }
);

/**
 * @route   GET /api/chat/users
 * @desc    Get users for DM
 * @access  Private
 */
router.get('/users', authenticate, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, full_name, email, avatar_url, avatar_config, is_online, department
            FROM users
            WHERE organization_id = ? AND id != ? AND is_active = 1
            ORDER BY is_online DESC, full_name
        `).all(req.user.organizationId, req.user.id);

        res.json({
            success: true,
            data: {
                users: users.map(u => ({
                    ...u,
                    avatarConfig: JSON.parse(u.avatar_config || '{}')
                }))
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get users'
        });
    }
});

module.exports = router;
