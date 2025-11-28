/**
 * TaskMaster Database Model
 * SQLite database with better-sqlite3 for high performance
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Initialize database
const dbPath = path.resolve(config.database.path);

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
const initDatabase = () => {
    // Organizations
    db.exec(`
        CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            logo_url TEXT,
            settings TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Users/Employees
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            organization_id TEXT REFERENCES organizations(id),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'employee' CHECK(role IN ('admin', 'manager', 'employee')),
            department TEXT,
            avatar_url TEXT,
            avatar_config TEXT DEFAULT '{}',
            total_points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            streak_days INTEGER DEFAULT 0,
            last_activity_date DATE,
            stars_balance INTEGER DEFAULT 100,
            is_active INTEGER DEFAULT 1,
            is_online INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Refresh Tokens
    db.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tasks
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            organization_id TEXT REFERENCES organizations(id),
            title TEXT NOT NULL,
            description TEXT,
            assignee_id TEXT REFERENCES users(id),
            creator_id TEXT REFERENCES users(id),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
            difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard', 'expert')),
            points_reward INTEGER DEFAULT 10,
            deadline DATETIME,
            completed_at DATETIME,
            estimated_hours REAL,
            actual_hours REAL,
            tags TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Task Submissions (solutions)
    db.exec(`
        CREATE TABLE IF NOT EXISTS task_submissions (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            content TEXT,
            file_path TEXT,
            file_type TEXT,
            file_name TEXT,
            code_language TEXT,
            status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted', 'approved', 'rejected', 'revision_requested')),
            reviewer_id TEXT REFERENCES users(id),
            reviewer_comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Points Transactions
    db.exec(`
        CREATE TABLE IF NOT EXISTS points_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('task_complete', 'bonus', 'streak', 'badge', 'purchase', 'gift', 'penalty')),
            source_type TEXT,
            source_id TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Badges
    db.exec(`
        CREATE TABLE IF NOT EXISTS badges (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            category TEXT,
            tier TEXT DEFAULT 'bronze' CHECK(tier IN ('bronze', 'silver', 'gold', 'platinum')),
            points_required INTEGER DEFAULT 0,
            condition_type TEXT,
            condition_value TEXT,
            stars_reward INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User Badges
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_badges (
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            badge_id TEXT NOT NULL REFERENCES badges(id),
            earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, badge_id)
        )
    `);

    // Avatar Items (Shop)
    db.exec(`
        CREATE TABLE IF NOT EXISTS avatar_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL CHECK(category IN ('head', 'body', 'accessory', 'background', 'effect', 'pet', 'banner')),
            image_url TEXT,
            animation_data TEXT,
            price_stars INTEGER NOT NULL DEFAULT 0,
            rarity TEXT DEFAULT 'common' CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            is_available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User Inventory
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_inventory (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id TEXT NOT NULL REFERENCES avatar_items(id),
            is_equipped INTEGER DEFAULT 0,
            purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, item_id)
        )
    `);

    // Chat Messages
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            sender_id TEXT NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'file', 'code', 'system')),
            file_path TEXT,
            file_name TEXT,
            code_language TEXT,
            is_edited INTEGER DEFAULT 0,
            reply_to_id TEXT REFERENCES chat_messages(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Chat Channels
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_channels (
            id TEXT PRIMARY KEY,
            organization_id TEXT REFERENCES organizations(id),
            name TEXT NOT NULL,
            type TEXT DEFAULT 'public' CHECK(type IN ('public', 'private', 'direct')),
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Channel Members
    db.exec(`
        CREATE TABLE IF NOT EXISTS channel_members (
            channel_id TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'moderator', 'member')),
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (channel_id, user_id)
        )
    `);

    // Notifications
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            data TEXT DEFAULT '{}',
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Activity Log (for analytics)
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            metadata TEXT DEFAULT '{}',
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Uploaded Images (stored in database)
    db.exec(`
        CREATE TABLE IF NOT EXISTS uploaded_images (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            image_type TEXT NOT NULL CHECK(image_type IN ('avatar', 'banner', 'chat', 'task', 'other')),
            filename TEXT NOT NULL,
            original_name TEXT,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            data BLOB NOT NULL,
            thumbnail BLOB,
            width INTEGER,
            height INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_organization ON tasks(organization_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_points_user ON points_transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_uploaded_images_user ON uploaded_images(user_id);
        CREATE INDEX IF NOT EXISTS idx_uploaded_images_type ON uploaded_images(image_type);
    `);

    console.log('Database initialized successfully');
};

// Initialize database tables immediately
initDatabase();

// Run migrations for new columns (must run before prepared statements)
const runMigrations = () => {
    const columns = [
        { name: 'banner_url', type: 'TEXT' },
        { name: 'skin_color', type: 'TEXT DEFAULT \'#FFD5B8\'' },
        { name: 'hair_color', type: 'TEXT DEFAULT \'#4A3C2A\'' },
        { name: 'eye_color', type: 'TEXT DEFAULT \'#2196F3\'' },
        { name: 'outfit_color', type: 'TEXT DEFAULT \'#6C63FF\'' }
    ];

    columns.forEach(col => {
        try {
            db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        } catch (err) {
            // Column already exists - ignore
        }
    });
};

runMigrations();

// Prepared statements for common operations
const statements = {
    // Users
    getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
    createUser: db.prepare(`
        INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    updateUserPoints: db.prepare('UPDATE users SET total_points = total_points + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    updateUserStars: db.prepare('UPDATE users SET stars_balance = stars_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    updateUserStreak: db.prepare('UPDATE users SET streak_days = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    updateUserLevel: db.prepare('UPDATE users SET level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    updateUserOnline: db.prepare('UPDATE users SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    updateUserAvatar: db.prepare('UPDATE users SET avatar_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),

    // Tasks
    getTaskById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
    getTasksByAssignee: db.prepare('SELECT * FROM tasks WHERE assignee_id = ? ORDER BY created_at DESC'),
    getTasksByOrganization: db.prepare('SELECT * FROM tasks WHERE organization_id = ? ORDER BY created_at DESC'),
    createTask: db.prepare(`
        INSERT INTO tasks (id, organization_id, title, description, assignee_id, creator_id, priority, difficulty, points_reward, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateTaskStatus: db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    completeTask: db.prepare("UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"),

    // Points
    addPointsTransaction: db.prepare(`
        INSERT INTO points_transactions (id, user_id, amount, type, source_type, source_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

    // Chat
    createMessage: db.prepare(`
        INSERT INTO chat_messages (id, channel_id, sender_id, content, message_type, file_path, file_name, code_language)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getChannelMessages: db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.channel_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
    `),

    // Notifications
    createNotification: db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, content, data)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    getUserNotifications: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
    markNotificationRead: db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?'),

    // Leaderboard
    getLeaderboard: db.prepare(`
        SELECT id, full_name, avatar_url, avatar_config, total_points, level, streak_days, department
        FROM users
        WHERE organization_id = ? AND is_active = 1
        ORDER BY total_points DESC
        LIMIT ?
    `),

    // Shop
    getShopItems: db.prepare('SELECT * FROM avatar_items WHERE is_available = 1 ORDER BY category, price_stars'),
    getUserInventory: db.prepare(`
        SELECT i.*, ai.name, ai.description, ai.category, ai.image_url, ai.animation_data, ai.rarity
        FROM user_inventory i
        JOIN avatar_items ai ON i.item_id = ai.id
        WHERE i.user_id = ?
    `),
    purchaseItem: db.prepare(`
        INSERT INTO user_inventory (id, user_id, item_id) VALUES (?, ?, ?)
    `),
    equipItem: db.prepare('UPDATE user_inventory SET is_equipped = ? WHERE user_id = ? AND item_id = ?'),

    // Badges
    getUserBadges: db.prepare(`
        SELECT b.*, ub.earned_at
        FROM user_badges ub
        JOIN badges b ON ub.badge_id = b.id
        WHERE ub.user_id = ?
    `),
    awardBadge: db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)'),

    // Images
    saveImage: db.prepare(`
        INSERT INTO uploaded_images (id, user_id, image_type, filename, original_name, mime_type, size, data, thumbnail, width, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getImageById: db.prepare('SELECT * FROM uploaded_images WHERE id = ?'),
    getImageByFilename: db.prepare('SELECT * FROM uploaded_images WHERE filename = ?'),
    getUserImages: db.prepare('SELECT id, filename, image_type, mime_type, size, width, height, created_at FROM uploaded_images WHERE user_id = ? ORDER BY created_at DESC'),
    deleteImage: db.prepare('DELETE FROM uploaded_images WHERE id = ? AND user_id = ?'),
    updateUserAvatarUrl: db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    updateUserBannerUrl: db.prepare('UPDATE users SET banner_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
};

module.exports = {
    db,
    initDatabase,
    statements
};
