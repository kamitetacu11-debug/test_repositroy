/**
 * Seed Data
 * Initial data for badges, shop items, and demo content
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const config = require('../config/config');

const seedDatabase = () => {
    // Check if already seeded
    const existing = db.prepare('SELECT COUNT(*) as count FROM badges').get();
    if (existing.count > 0) {
        console.log('Database already seeded, skipping...');
        return;
    }

    console.log('Seeding database...');

    // ============================================
    // BADGES
    // ============================================
    const badges = [
        // Bronze tier
        { id: uuidv4(), name: 'First Steps', description: 'Complete your first task', icon: '🎯', category: 'tasks', tier: 'bronze', points_required: 0, condition_type: 'tasks_completed', condition_value: JSON.stringify({ count: 1 }), stars_reward: 10 },
        { id: uuidv4(), name: 'Getting Started', description: 'Complete 10 tasks', icon: '🚀', category: 'tasks', tier: 'bronze', points_required: 100, condition_type: 'tasks_completed', condition_value: JSON.stringify({ count: 10 }), stars_reward: 25 },
        { id: uuidv4(), name: 'Streak Starter', description: 'Maintain a 3-day streak', icon: '🔥', category: 'streak', tier: 'bronze', points_required: 0, condition_type: 'streak_days', condition_value: JSON.stringify({ days: 3 }), stars_reward: 15 },

        // Silver tier
        { id: uuidv4(), name: 'Task Master', description: 'Complete 50 tasks', icon: '⭐', category: 'tasks', tier: 'silver', points_required: 500, condition_type: 'tasks_completed', condition_value: JSON.stringify({ count: 50 }), stars_reward: 50 },
        { id: uuidv4(), name: 'Speedster', description: 'Complete 10 tasks before deadline', icon: '⚡', category: 'performance', tier: 'silver', points_required: 300, condition_type: 'early_completions', condition_value: JSON.stringify({ count: 10 }), stars_reward: 40 },
        { id: uuidv4(), name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '💪', category: 'streak', tier: 'silver', points_required: 0, condition_type: 'streak_days', condition_value: JSON.stringify({ days: 7 }), stars_reward: 35 },
        { id: uuidv4(), name: 'Helper', description: 'Help colleagues with 10 tasks', icon: '🤝', category: 'collaboration', tier: 'silver', points_required: 200, condition_type: 'helped_colleagues', condition_value: JSON.stringify({ count: 10 }), stars_reward: 30 },

        // Gold tier
        { id: uuidv4(), name: 'Centurion', description: 'Complete 100 tasks', icon: '🏆', category: 'tasks', tier: 'gold', points_required: 1000, condition_type: 'tasks_completed', condition_value: JSON.stringify({ count: 100 }), stars_reward: 100 },
        { id: uuidv4(), name: 'Month Master', description: 'Maintain a 30-day streak', icon: '🌟', category: 'streak', tier: 'gold', points_required: 0, condition_type: 'streak_days', condition_value: JSON.stringify({ days: 30 }), stars_reward: 75 },
        { id: uuidv4(), name: 'Expert', description: 'Complete 20 expert-level tasks', icon: '🎓', category: 'difficulty', tier: 'gold', points_required: 800, condition_type: 'expert_tasks', condition_value: JSON.stringify({ count: 20 }), stars_reward: 80 },

        // Platinum tier
        { id: uuidv4(), name: 'Legend', description: 'Reach 10,000 total points', icon: '👑', category: 'points', tier: 'platinum', points_required: 10000, condition_type: 'total_points', condition_value: JSON.stringify({ points: 10000 }), stars_reward: 200 },
        { id: uuidv4(), name: 'Unstoppable', description: 'Maintain a 100-day streak', icon: '🔱', category: 'streak', tier: 'platinum', points_required: 0, condition_type: 'streak_days', condition_value: JSON.stringify({ days: 100 }), stars_reward: 300 },
    ];

    const insertBadge = db.prepare(`
        INSERT INTO badges (id, name, description, icon, category, tier, points_required, condition_type, condition_value, stars_reward)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    badges.forEach(badge => {
        insertBadge.run(badge.id, badge.name, badge.description, badge.icon, badge.category, badge.tier, badge.points_required, badge.condition_type, badge.condition_value, badge.stars_reward);
    });

    // ============================================
    // AVATAR ITEMS (Shop)
    // ============================================
    const avatarItems = [
        // Heads
        { id: uuidv4(), name: 'Space Helmet', description: 'A futuristic space helmet', category: 'head', image_url: '/assets/avatars/head_space.svg', price_stars: 50, rarity: 'common', animation_data: JSON.stringify({ idle: 'float', action: 'glow' }) },
        { id: uuidv4(), name: 'Crown of Stars', description: 'A majestic starry crown', category: 'head', image_url: '/assets/avatars/head_crown.svg', price_stars: 150, rarity: 'rare', animation_data: JSON.stringify({ idle: 'sparkle', action: 'burst' }) },
        { id: uuidv4(), name: 'Neon Visor', description: 'Cyberpunk-style neon visor', category: 'head', image_url: '/assets/avatars/head_visor.svg', price_stars: 100, rarity: 'uncommon', animation_data: JSON.stringify({ idle: 'pulse', action: 'flash' }) },
        { id: uuidv4(), name: 'Galaxy Halo', description: 'A halo made of swirling galaxies', category: 'head', image_url: '/assets/avatars/head_halo.svg', price_stars: 300, rarity: 'epic', animation_data: JSON.stringify({ idle: 'rotate', action: 'expand' }) },
        { id: uuidv4(), name: 'Phoenix Crown', description: 'Legendary crown of eternal flame', category: 'head', image_url: '/assets/avatars/head_phoenix.svg', price_stars: 500, rarity: 'legendary', animation_data: JSON.stringify({ idle: 'flame', action: 'rebirth' }) },

        // Bodies
        { id: uuidv4(), name: 'Business Suit', description: 'Classic professional attire', category: 'body', image_url: '/assets/avatars/body_suit.svg', price_stars: 30, rarity: 'common', animation_data: JSON.stringify({ idle: 'none', action: 'wave' }) },
        { id: uuidv4(), name: 'Space Suit', description: 'Official space exploration gear', category: 'body', image_url: '/assets/avatars/body_space.svg', price_stars: 80, rarity: 'uncommon', animation_data: JSON.stringify({ idle: 'breathe', action: 'jetpack' }) },
        { id: uuidv4(), name: 'Cosmic Cloak', description: 'Cloak woven from stardust', category: 'body', image_url: '/assets/avatars/body_cloak.svg', price_stars: 200, rarity: 'rare', animation_data: JSON.stringify({ idle: 'flow', action: 'flutter' }) },
        { id: uuidv4(), name: 'Nebula Armor', description: 'Armor infused with nebula energy', category: 'body', image_url: '/assets/avatars/body_armor.svg', price_stars: 350, rarity: 'epic', animation_data: JSON.stringify({ idle: 'shimmer', action: 'shield' }) },
        { id: uuidv4(), name: 'Celestial Robes', description: 'Robes of a cosmic deity', category: 'body', image_url: '/assets/avatars/body_celestial.svg', price_stars: 600, rarity: 'legendary', animation_data: JSON.stringify({ idle: 'cosmic', action: 'ascend' }) },

        // Accessories
        { id: uuidv4(), name: 'Star Badge', description: 'A simple star pin', category: 'accessory', image_url: '/assets/avatars/acc_badge.svg', price_stars: 20, rarity: 'common', animation_data: JSON.stringify({ idle: 'twinkle' }) },
        { id: uuidv4(), name: 'Energy Wings', description: 'Wings made of pure energy', category: 'accessory', image_url: '/assets/avatars/acc_wings.svg', price_stars: 120, rarity: 'uncommon', animation_data: JSON.stringify({ idle: 'flap', action: 'spread' }) },
        { id: uuidv4(), name: 'Data Gauntlets', description: 'Gloves with holographic displays', category: 'accessory', image_url: '/assets/avatars/acc_gauntlets.svg', price_stars: 180, rarity: 'rare', animation_data: JSON.stringify({ idle: 'data', action: 'type' }) },
        { id: uuidv4(), name: 'Orbital Rings', description: 'Rings that orbit around you', category: 'accessory', image_url: '/assets/avatars/acc_rings.svg', price_stars: 280, rarity: 'epic', animation_data: JSON.stringify({ idle: 'orbit', action: 'align' }) },
        { id: uuidv4(), name: 'Nexus Core', description: 'The legendary Nexus Heart artifact', category: 'accessory', image_url: '/assets/avatars/acc_nexus.svg', price_stars: 800, rarity: 'legendary', animation_data: JSON.stringify({ idle: 'pulse', action: 'overcharge' }) },

        // Backgrounds
        { id: uuidv4(), name: 'Deep Space', description: 'Dark space with distant stars', category: 'background', image_url: '/assets/avatars/bg_space.svg', price_stars: 40, rarity: 'common', animation_data: JSON.stringify({ idle: 'stars' }) },
        { id: uuidv4(), name: 'Nebula Cloud', description: 'Colorful nebula backdrop', category: 'background', image_url: '/assets/avatars/bg_nebula.svg', price_stars: 100, rarity: 'uncommon', animation_data: JSON.stringify({ idle: 'swirl' }) },
        { id: uuidv4(), name: 'Aurora', description: 'Dancing northern lights', category: 'background', image_url: '/assets/avatars/bg_aurora.svg', price_stars: 150, rarity: 'rare', animation_data: JSON.stringify({ idle: 'wave' }) },
        { id: uuidv4(), name: 'Black Hole', description: 'Event horizon of a black hole', category: 'background', image_url: '/assets/avatars/bg_blackhole.svg', price_stars: 250, rarity: 'epic', animation_data: JSON.stringify({ idle: 'distort' }) },
        { id: uuidv4(), name: 'Big Bang', description: 'The birth of the universe', category: 'background', image_url: '/assets/avatars/bg_bigbang.svg', price_stars: 500, rarity: 'legendary', animation_data: JSON.stringify({ idle: 'expand' }) },

        // Effects
        { id: uuidv4(), name: 'Sparkles', description: 'Gentle sparkle effect', category: 'effect', image_url: '/assets/avatars/fx_sparkle.svg', price_stars: 25, rarity: 'common', animation_data: JSON.stringify({ idle: 'sparkle' }) },
        { id: uuidv4(), name: 'Flame Aura', description: 'Fiery aura around your avatar', category: 'effect', image_url: '/assets/avatars/fx_flame.svg', price_stars: 90, rarity: 'uncommon', animation_data: JSON.stringify({ idle: 'burn' }) },
        { id: uuidv4(), name: 'Electric Storm', description: 'Lightning crackling around you', category: 'effect', image_url: '/assets/avatars/fx_electric.svg', price_stars: 160, rarity: 'rare', animation_data: JSON.stringify({ idle: 'zap' }) },
        { id: uuidv4(), name: 'Void Rift', description: 'Reality tears around you', category: 'effect', image_url: '/assets/avatars/fx_void.svg', price_stars: 300, rarity: 'epic', animation_data: JSON.stringify({ idle: 'tear' }) },
        { id: uuidv4(), name: 'Cosmic Burst', description: 'Supernova explosion effect', category: 'effect', image_url: '/assets/avatars/fx_supernova.svg', price_stars: 700, rarity: 'legendary', animation_data: JSON.stringify({ idle: 'explode' }) },

        // Pets
        { id: uuidv4(), name: 'Star Pup', description: 'A friendly star-shaped companion', category: 'pet', image_url: '/assets/avatars/pet_star.svg', price_stars: 60, rarity: 'common', animation_data: JSON.stringify({ idle: 'bounce', action: 'spin' }) },
        { id: uuidv4(), name: 'Nebula Cat', description: 'A mysterious cosmic cat', category: 'pet', image_url: '/assets/avatars/pet_cat.svg', price_stars: 130, rarity: 'uncommon', animation_data: JSON.stringify({ idle: 'stretch', action: 'pounce' }) },
        { id: uuidv4(), name: 'Rocket Bot', description: 'A helpful robot companion', category: 'pet', image_url: '/assets/avatars/pet_robot.svg', price_stars: 200, rarity: 'rare', animation_data: JSON.stringify({ idle: 'hover', action: 'scan' }) },
        { id: uuidv4(), name: 'Phoenix Chick', description: 'A baby phoenix', category: 'pet', image_url: '/assets/avatars/pet_phoenix.svg', price_stars: 400, rarity: 'epic', animation_data: JSON.stringify({ idle: 'flame', action: 'chirp' }) },
        { id: uuidv4(), name: 'Galaxy Dragon', description: 'A majestic cosmic dragon', category: 'pet', image_url: '/assets/avatars/pet_dragon.svg', price_stars: 1000, rarity: 'legendary', animation_data: JSON.stringify({ idle: 'fly', action: 'roar' }) },
    ];

    const insertItem = db.prepare(`
        INSERT INTO avatar_items (id, name, description, category, image_url, price_stars, rarity, animation_data, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    avatarItems.forEach(item => {
        insertItem.run(item.id, item.name, item.description, item.category, item.image_url, item.price_stars, item.rarity, item.animation_data);
    });

    // ============================================
    // DEFAULT ORGANIZATION & USERS
    // ============================================
    const orgId = 'default-org';
    db.prepare('INSERT OR IGNORE INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'TaskMaster Demo');

    // Create general chat channel
    const generalChannelId = uuidv4();
    db.prepare(`
        INSERT INTO chat_channels (id, organization_id, name, type)
        VALUES (?, ?, 'general', 'public')
    `).run(generalChannelId, orgId);

    // Create demo users
    const demoUsers = [
        { email: 'admin@taskmaster.io', password: 'Admin123!', fullName: 'Admin User', role: 'admin', department: 'Management', points: 5000, level: 10 },
        { email: 'manager@taskmaster.io', password: 'Manager123!', fullName: 'Project Manager', role: 'manager', department: 'Engineering', points: 3500, level: 8 },
        { email: 'demo@taskmaster.io', password: 'Demo123!', fullName: 'Demo User', role: 'employee', department: 'Engineering', points: 2450, level: 5 },
        { email: 'sarah@taskmaster.io', password: 'Sarah123!', fullName: 'Sarah Chen', role: 'employee', department: 'Design', points: 3250, level: 7 },
        { email: 'mike@taskmaster.io', password: 'Mike123!', fullName: 'Mike Johnson', role: 'employee', department: 'Engineering', points: 2180, level: 5 },
    ];

    const insertUser = db.prepare(`
        INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department, total_points, level, stars_balance, streak_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const addToChannel = db.prepare('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)');

    demoUsers.forEach(user => {
        const userId = uuidv4();
        const passwordHash = bcrypt.hashSync(user.password, 10);
        const stars = Math.floor(user.points / 10);

        insertUser.run(
            userId,
            orgId,
            user.email,
            passwordHash,
            user.fullName,
            user.role,
            user.department,
            user.points,
            user.level,
            stars,
            Math.floor(Math.random() * 14) + 1
        );

        addToChannel.run(generalChannelId, userId);
    });

    // ============================================
    // DEMO TASKS
    // ============================================
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taskmaster.io');
    const manager = db.prepare('SELECT id FROM users WHERE email = ?').get('manager@taskmaster.io');

    if (demoUser && manager) {
        const tasks = [
            { title: 'Review Q4 marketing strategy', description: 'Analyze the marketing strategy for Q4 and provide feedback', priority: 'high', difficulty: 'hard', points: 30, status: 'pending' },
            { title: 'Update user documentation', description: 'Update the user guide with new features', priority: 'medium', difficulty: 'medium', points: 20, status: 'in_progress' },
            { title: 'Fix login page responsiveness', description: 'Ensure login page works on all devices', priority: 'high', difficulty: 'medium', points: 25, status: 'completed' },
            { title: 'Prepare team presentation', description: 'Create slides for the weekly team meeting', priority: 'medium', difficulty: 'easy', points: 15, status: 'pending' },
            { title: 'Code review for feature X', description: 'Review PR #42 for the new feature', priority: 'low', difficulty: 'easy', points: 10, status: 'completed' },
            { title: 'Database optimization', description: 'Optimize slow queries identified in monitoring', priority: 'high', difficulty: 'expert', points: 40, status: 'completed' },
            { title: 'Write unit tests', description: 'Add tests for the payment module', priority: 'medium', difficulty: 'medium', points: 20, status: 'pending' },
            { title: 'Update API endpoints', description: 'Migrate legacy endpoints to v2', priority: 'high', difficulty: 'hard', points: 30, status: 'review' },
        ];

        const insertTask = db.prepare(`
            INSERT INTO tasks (id, organization_id, title, description, assignee_id, creator_id, status, priority, difficulty, points_reward)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        tasks.forEach(task => {
            insertTask.run(
                uuidv4(),
                orgId,
                task.title,
                task.description,
                demoUser.id,
                manager.id,
                task.status,
                task.priority,
                task.difficulty,
                task.points
            );
        });
    }

    console.log('Database seeding completed!');
    console.log('\nDemo accounts:');
    console.log('  Admin:   admin@taskmaster.io / Admin123!');
    console.log('  Manager: manager@taskmaster.io / Manager123!');
    console.log('  User:    demo@taskmaster.io / Demo123!');
};

module.exports = seedDatabase;
