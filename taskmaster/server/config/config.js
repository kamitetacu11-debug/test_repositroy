/**
 * TaskMaster Configuration
 * Centralized configuration management with security best practices
 */

require('dotenv').config();

const config = {
    // Server
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',

    // JWT Security
    jwt: {
        secret: process.env.JWT_SECRET || 'default-dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: '30d',
        algorithm: 'HS256'
    },

    // Password Hashing
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12
    },

    // Database
    database: {
        path: process.env.DATABASE_PATH || './database/taskmaster.db'
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
    },

    // File Upload
    upload: {
        maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
        path: process.env.UPLOAD_PATH || './uploads',
        allowedTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/html',
            'text/css',
            'application/javascript',
            'application/json',
            'application/zip'
        ]
    },

    // Admin Security
    admin: {
        allowedIPs: (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1').split(',')
    },

    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    },

    // Gamification Settings
    gamification: {
        pointsMultiplier: {
            easy: 1.0,
            medium: 1.5,
            hard: 2.0,
            expert: 3.0
        },
        streakBonus: {
            3: 0.1,   // 10% bonus after 3 days
            7: 0.2,   // 20% bonus after 7 days
            14: 0.3,  // 30% bonus after 14 days
            30: 0.5   // 50% bonus after 30 days
        },
        levelThresholds: [
            0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000,
            6500, 8000, 10000, 12500, 15000, 18000, 21500, 25500, 30000, 35000
        ]
    }
};

// Validate required config in production
if (config.env === 'production') {
    const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET'];
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

module.exports = config;
