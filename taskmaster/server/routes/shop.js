/**
 * Shop Routes
 * Avatar items store and inventory management
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { db, statements } = require('../models/database');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/shop/items
 * @desc    Get all available shop items
 * @access  Private
 */
router.get('/items', authenticate, (req, res) => {
    try {
        const { category, rarity } = req.query;

        let sql = 'SELECT * FROM avatar_items WHERE is_available = 1';
        const params = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (rarity) {
            sql += ' AND rarity = ?';
            params.push(rarity);
        }

        sql += ' ORDER BY category, rarity DESC, price_stars';

        const items = db.prepare(sql).all(...params);

        // Get user's inventory to mark owned items
        const owned = new Set(
            statements.getUserInventory.all(req.user.id).map(i => i.item_id)
        );

        res.json({
            success: true,
            data: {
                items: items.map(item => ({
                    ...item,
                    animationData: item.animation_data ? JSON.parse(item.animation_data) : null,
                    owned: owned.has(item.id)
                })),
                userStars: req.user.starsBalance
            }
        });

    } catch (error) {
        console.error('Get shop items error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get shop items'
        });
    }
});

/**
 * @route   POST /api/shop/purchase/:itemId
 * @desc    Purchase an item
 * @access  Private
 */
router.post('/purchase/:itemId', authenticate, (req, res) => {
    try {
        const { itemId } = req.params;

        // Get item
        const item = db.prepare('SELECT * FROM avatar_items WHERE id = ? AND is_available = 1').get(itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        // Check if already owned
        const existing = db.prepare('SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?')
            .get(req.user.id, itemId);

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'You already own this item',
                code: 'ALREADY_OWNED'
            });
        }

        // Check balance
        const user = statements.getUserById.get(req.user.id);

        if (user.stars_balance < item.price_stars) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient stars',
                code: 'INSUFFICIENT_BALANCE',
                data: {
                    required: item.price_stars,
                    current: user.stars_balance
                }
            });
        }

        // Process purchase (transaction)
        const inventoryId = uuidv4();
        const transactionId = uuidv4();

        db.transaction(() => {
            // Deduct stars
            statements.updateUserStars.run(-item.price_stars, req.user.id);

            // Add to inventory
            statements.purchaseItem.run(inventoryId, req.user.id, itemId);

            // Log transaction
            statements.addPointsTransaction.run(
                transactionId,
                req.user.id,
                -item.price_stars,
                'purchase',
                'avatar_item',
                itemId,
                `Purchased: ${item.name}`
            );
        })();

        // Create notification
        const notifId = uuidv4();
        statements.createNotification.run(
            notifId,
            req.user.id,
            'purchase',
            'Item Purchased!',
            `You bought: ${item.name}`,
            JSON.stringify({ itemId, itemName: item.name })
        );

        res.json({
            success: true,
            message: 'Purchase successful!',
            data: {
                item: {
                    ...item,
                    animationData: item.animation_data ? JSON.parse(item.animation_data) : null
                },
                newBalance: user.stars_balance - item.price_stars
            }
        });

    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({
            success: false,
            error: 'Purchase failed'
        });
    }
});

/**
 * @route   GET /api/shop/inventory
 * @desc    Get user's inventory
 * @access  Private
 */
router.get('/inventory', authenticate, (req, res) => {
    try {
        const inventory = statements.getUserInventory.all(req.user.id);

        res.json({
            success: true,
            data: {
                inventory: inventory.map(item => ({
                    ...item,
                    animationData: item.animation_data ? JSON.parse(item.animation_data) : null
                }))
            }
        });

    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get inventory'
        });
    }
});

/**
 * @route   POST /api/shop/equip/:itemId
 * @desc    Equip/unequip an item
 * @access  Private
 */
router.post('/equip/:itemId', authenticate, (req, res) => {
    try {
        const { itemId } = req.params;
        const { equip = true } = req.body;

        // Check ownership
        const inventoryItem = db.prepare(`
            SELECT i.*, ai.category
            FROM user_inventory i
            JOIN avatar_items ai ON i.item_id = ai.id
            WHERE i.user_id = ? AND i.item_id = ?
        `).get(req.user.id, itemId);

        if (!inventoryItem) {
            return res.status(404).json({
                success: false,
                error: 'Item not found in inventory'
            });
        }

        // Unequip other items in same category if equipping
        if (equip) {
            db.prepare(`
                UPDATE user_inventory
                SET is_equipped = 0
                WHERE user_id = ? AND item_id IN (
                    SELECT id FROM avatar_items WHERE category = ?
                )
            `).run(req.user.id, inventoryItem.category);
        }

        // Update equip status
        statements.equipItem.run(equip ? 1 : 0, req.user.id, itemId);

        // Update avatar config
        const equipped = db.prepare(`
            SELECT ai.id, ai.category, ai.image_url, ai.animation_data
            FROM user_inventory ui
            JOIN avatar_items ai ON ui.item_id = ai.id
            WHERE ui.user_id = ? AND ui.is_equipped = 1
        `).all(req.user.id);

        const avatarConfig = {};
        equipped.forEach(item => {
            avatarConfig[item.category] = {
                id: item.id,
                imageUrl: item.image_url,
                animationData: item.animation_data ? JSON.parse(item.animation_data) : null
            };
        });

        statements.updateUserAvatar.run(JSON.stringify(avatarConfig), req.user.id);

        res.json({
            success: true,
            message: equip ? 'Item equipped' : 'Item unequipped',
            data: { avatarConfig }
        });

    } catch (error) {
        console.error('Equip error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to equip item'
        });
    }
});

/**
 * @route   GET /api/shop/categories
 * @desc    Get item categories with counts
 * @access  Private
 */
router.get('/categories', authenticate, (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT category, COUNT(*) as count, MIN(price_stars) as min_price, MAX(price_stars) as max_price
            FROM avatar_items
            WHERE is_available = 1
            GROUP BY category
            ORDER BY category
        `).all();

        res.json({
            success: true,
            data: { categories }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get categories'
        });
    }
});

module.exports = router;
