/**
 * TaskMaster - Logs Routes
 * Admin access to request logs
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getLogs, getLogStats, clearOldLogs } = require('../middleware/logger');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * Get logs with filtering and pagination
 * GET /api/logs?limit=100&offset=0&country=RU&fingerprint=ABC123
 */
router.get('/', (req, res) => {
    try {
        const { limit = 100, offset = 0, country, fingerprint, userId, startDate, endDate } = req.query;

        const logs = getLogs({
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            filter: {
                country,
                fingerprint,
                userId: userId ? parseInt(userId, 10) : null,
                startDate,
                endDate
            }
        });

        res.json({
            success: true,
            data: {
                logs,
                count: logs.length,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10)
            }
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get logs'
        });
    }
});

/**
 * Get log statistics
 * GET /api/logs/stats
 */
router.get('/stats', (req, res) => {
    try {
        const stats = getLogStats();

        if (!stats) {
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate stats'
            });
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get log stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get log stats'
        });
    }
});

/**
 * Clear old logs
 * DELETE /api/logs/clear?days=30
 */
router.delete('/clear', (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 30;
        const result = clearOldLogs(days);

        if (!result) {
            return res.status(500).json({
                success: false,
                message: 'Failed to clear logs'
            });
        }

        res.json({
            success: true,
            data: result,
            message: `Cleared ${result.removed} old logs, ${result.remaining} remaining`
        });
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear logs'
        });
    }
});

/**
 * Get unique fingerprints
 * GET /api/logs/fingerprints
 */
router.get('/fingerprints', (req, res) => {
    try {
        const logs = getLogs({ limit: 10000 });
        const fingerprints = {};

        logs.forEach(log => {
            if (!fingerprints[log.fingerprint]) {
                fingerprints[log.fingerprint] = {
                    fingerprint: log.fingerprint,
                    count: 0,
                    lastSeen: log.timestamp,
                    countries: new Set(),
                    ips: new Set(),
                    users: new Set()
                };
            }
            fingerprints[log.fingerprint].count++;
            if (log.geo?.country) {
                fingerprints[log.fingerprint].countries.add(log.geo.country);
            }
            fingerprints[log.fingerprint].ips.add(log.ip);
            if (log.userId) {
                fingerprints[log.fingerprint].users.add(log.userId);
            }
        });

        // Convert Sets to arrays
        const result = Object.values(fingerprints).map(fp => ({
            ...fp,
            countries: Array.from(fp.countries),
            ips: Array.from(fp.ips),
            users: Array.from(fp.users)
        })).sort((a, b) => b.count - a.count);

        res.json({
            success: true,
            data: result.slice(0, 100)
        });
    } catch (error) {
        console.error('Get fingerprints error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get fingerprints'
        });
    }
});

/**
 * Get country statistics
 * GET /api/logs/countries
 */
router.get('/countries', (req, res) => {
    try {
        const logs = getLogs({ limit: 10000 });
        const countries = {};

        logs.forEach(log => {
            const country = log.geo?.country || 'Unknown';
            const countryCode = log.geo?.countryCode || 'XX';

            if (!countries[countryCode]) {
                countries[countryCode] = {
                    country,
                    countryCode,
                    requests: 0,
                    uniqueIPs: new Set(),
                    uniqueFingerprints: new Set(),
                    uniqueUsers: new Set()
                };
            }

            countries[countryCode].requests++;
            countries[countryCode].uniqueIPs.add(log.ip);
            countries[countryCode].uniqueFingerprints.add(log.fingerprint);
            if (log.userId) {
                countries[countryCode].uniqueUsers.add(log.userId);
            }
        });

        // Convert Sets to counts
        const result = Object.values(countries).map(c => ({
            country: c.country,
            countryCode: c.countryCode,
            requests: c.requests,
            uniqueIPs: c.uniqueIPs.size,
            uniqueFingerprints: c.uniqueFingerprints.size,
            uniqueUsers: c.uniqueUsers.size
        })).sort((a, b) => b.requests - a.requests);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get countries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get country stats'
        });
    }
});

module.exports = router;
