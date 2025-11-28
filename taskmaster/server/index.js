/**
 * TaskMaster Server
 * Main entry point with Express, Socket.IO, and security configuration
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Load configuration
const config = require('./config/config');

// Initialize database
const { db, initDatabase, statements } = require('./models/database');
const { initSAPSchema } = require('./models/sap-schema');

// Security middleware
const {
    helmetConfig,
    apiLimiter,
    sanitizeInput,
    validateContentType,
    auditLog,
    preventInjection,
    hpp
} = require('./middleware/security');

// Routes
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const shopRoutes = require('./routes/shop');
const chatRoutes = require('./routes/chat');
const leaderboardRoutes = require('./routes/leaderboard');
const notificationsRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const profileRoutes = require('./routes/profile');
const logsRoutes = require('./routes/logs');
const imagesRoutes = require('./routes/images');
const analyticsRoutes = require('./routes/analytics');
const workflowRoutes = require('./routes/workflow');
const sapRoutes = require('./routes/sap');

// Request logger middleware
const { requestLogger } = require('./middleware/logger');

// Create Express app
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: config.cors.origin,
        credentials: true
    }
});

// Ensure directories exist
const ensureDirs = () => {
    const dirs = [
        path.dirname(config.database.path),
        config.upload.path,
        path.join(config.upload.path, 'chat')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

ensureDirs();

// Initialize database
initDatabase();
initSAPSchema();

// Seed initial data
const seedDatabase = require('./utils/seedData');
seedDatabase();

// Add banner items to existing database (if not present)
const { addBannersToExistingDatabase } = require('./utils/seedData');
addBannersToExistingDatabase();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmetConfig);

// CORS
app.use(cors({
    origin: config.cors.origin,
    credentials: true
}));

// Compression
app.use(compression());

// Request logging
if (config.env !== 'test') {
    app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Security middleware
app.use(sanitizeInput);
app.use(hpp);
app.use(preventInjection);

// Rate limiting for API
app.use('/api/', apiLimiter);

// Audit logging
app.use(auditLog);

// Custom request logger (geo, fingerprint, timestamp)
app.use(requestLogger);

// Static files
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/sap', sapRoutes);

// File download/preview endpoint
app.get('/api/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================
// SOCKET.IO - Real-time features
// ============================================

// Socket authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = statements.getUserById.get(decoded.userId);

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = {
            id: user.id,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            organizationId: user.organization_id
        };

        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.fullName}`);

    // Add to online users
    onlineUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.user
    });

    // Update online status in DB
    statements.updateUserOnline.run(1, socket.userId);

    // Broadcast online status
    io.emit('user:online', {
        userId: socket.userId,
        user: socket.user
    });

    // Join organization room
    socket.join(`org:${socket.user.organizationId}`);

    // Join user's channels
    const channels = db.prepare(`
        SELECT channel_id FROM channel_members WHERE user_id = ?
    `).all(socket.userId);

    channels.forEach(ch => {
        socket.join(`channel:${ch.channel_id}`);
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
        const { channelId, content, messageType = 'text', codeLanguage } = data;

        // Verify membership
        const membership = db.prepare(`
            SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?
        `).get(channelId, socket.userId);

        if (!membership) {
            socket.emit('error', { message: 'Not a member of this channel' });
            return;
        }

        // Save message
        const { v4: uuidv4 } = require('uuid');
        const messageId = uuidv4();

        statements.createMessage.run(
            messageId,
            channelId,
            socket.userId,
            content,
            messageType,
            null,
            null,
            codeLanguage || null
        );

        const message = db.prepare(`
            SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar, u.avatar_config
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `).get(messageId);

        // Broadcast to channel
        io.to(`channel:${channelId}`).emit('chat:message', {
            ...message,
            avatarConfig: JSON.parse(message.avatar_config || '{}')
        });
    });

    // Handle typing indicator
    socket.on('chat:typing', (data) => {
        const { channelId, isTyping } = data;
        socket.to(`channel:${channelId}`).emit('chat:typing', {
            userId: socket.userId,
            userName: socket.user.fullName,
            isTyping
        });
    });

    // Handle joining channel
    socket.on('channel:join', (channelId) => {
        socket.join(`channel:${channelId}`);
    });

    // Handle task updates
    socket.on('task:update', (data) => {
        io.to(`org:${socket.user.organizationId}`).emit('task:updated', {
            ...data,
            updatedBy: socket.user
        });
    });

    // Handle points earned (for animations)
    socket.on('points:earned', (data) => {
        io.to(`org:${socket.user.organizationId}`).emit('points:earned', {
            userId: socket.userId,
            userName: socket.user.fullName,
            ...data
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.fullName}`);

        onlineUsers.delete(socket.userId);
        statements.updateUserOnline.run(0, socket.userId);

        io.emit('user:offline', {
            userId: socket.userId
        });
    });
});

// Make io accessible to routes
app.set('io', io);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large',
            code: 'FILE_TOO_LARGE'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        error: config.env === 'production' ? 'Internal server error' : err.message,
        code: 'SERVER_ERROR'
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port;
const HOST = config.host;

server.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ████████╗ █████╗ ███████╗██╗  ██╗                       ║
║   ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝                       ║
║      ██║   ███████║███████╗█████╔╝                        ║
║      ██║   ██╔══██║╚════██║██╔═██╗                        ║
║      ██║   ██║  ██║███████║██║  ██╗                       ║
║      ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝                       ║
║                                                            ║
║   ███╗   ███╗ █████╗ ███████╗████████╗███████╗██████╗     ║
║   ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗    ║
║   ██╔████╔██║███████║███████╗   ██║   █████╗  ██████╔╝    ║
║   ██║╚██╔╝██║██╔══██║╚════██║   ██║   ██╔══╝  ██╔══██╗    ║
║   ██║ ╚═╝ ██║██║  ██║███████║   ██║   ███████╗██║  ██║    ║
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝    ║
║                                                            ║
║   Server running on http://${HOST}:${PORT}                    ║
║   Environment: ${config.env}                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        db.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        db.close();
        process.exit(0);
    });
});

module.exports = { app, server, io };
