/**
 * TaskMaster - Profile Routes
 * Avatar, banner, and character customization
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, statements } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${req.user.id}_${file.fieldname}_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * Upload avatar image
 */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const avatarUrl = `/uploads/profiles/${req.file.filename}`;

        // Update user profile
        const stmt = db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?');
        stmt.run(avatarUrl, req.user.id);

        res.json({
            success: true,
            data: {
                avatarUrl,
                message: 'Avatar uploaded successfully'
            }
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload avatar'
        });
    }
});

/**
 * Upload banner image
 */
router.post('/banner', upload.single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const bannerUrl = `/uploads/profiles/${req.file.filename}`;

        // Update user profile
        const stmt = db.prepare('UPDATE users SET banner_url = ? WHERE id = ?');
        stmt.run(bannerUrl, req.user.id);

        res.json({
            success: true,
            data: {
                bannerUrl,
                message: 'Banner uploaded successfully'
            }
        });

    } catch (error) {
        console.error('Banner upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload banner'
        });
    }
});

/**
 * Get character data
 */
router.get('/character', async (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

        // Get equipped items
        const equippedItems = db.prepare(`
            SELECT ai.* FROM avatar_items ai
            JOIN user_inventory ui ON ai.id = ui.item_id
            WHERE ui.user_id = ? AND ui.is_equipped = 1
        `).all(req.user.id);

        res.json({
            success: true,
            data: {
                character: {
                    level: user.level,
                    experience: user.total_points,
                    skin_color: user.skin_color || '#FFD5B8',
                    hair_color: user.hair_color || '#4A3C2A',
                    eye_color: user.eye_color || '#2196F3',
                    outfit_color: user.outfit_color || '#6C63FF'
                },
                equippedItems
            }
        });

    } catch (error) {
        console.error('Get character error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get character data'
        });
    }
});

/**
 * Update character customization
 */
router.put('/character', async (req, res) => {
    try {
        const { skinColor, hairColor, eyeColor, outfitColor } = req.body;

        const stmt = db.prepare(`
            UPDATE users SET
                skin_color = COALESCE(?, skin_color),
                hair_color = COALESCE(?, hair_color),
                eye_color = COALESCE(?, eye_color),
                outfit_color = COALESCE(?, outfit_color)
            WHERE id = ?
        `);

        stmt.run(skinColor, hairColor, eyeColor, outfitColor, req.user.id);

        res.json({
            success: true,
            message: 'Character updated successfully'
        });

    } catch (error) {
        console.error('Update character error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update character'
        });
    }
});

/**
 * Get profile with all customizations
 */
router.get('/', async (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, name, email, department, role, level, total_points, stars,
                   streak_days, avatar_url, banner_url, skin_color, hair_color,
                   eye_color, outfit_color, created_at
            FROM users WHERE id = ?
        `).get(req.user.id);

        const equippedItems = db.prepare(`
            SELECT ai.* FROM avatar_items ai
            JOIN user_inventory ui ON ai.id = ui.item_id
            WHERE ui.user_id = ? AND ui.is_equipped = 1
        `).all(req.user.id);

        const badges = db.prepare(`
            SELECT b.* FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ?
        `).all(req.user.id);

        const stats = db.prepare(`
            SELECT
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks WHERE assigned_to = ?
        `).get(req.user.id);

        res.json({
            success: true,
            data: {
                user,
                equippedItems,
                badges,
                stats
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

module.exports = router;
