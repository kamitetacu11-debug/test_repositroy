/**
 * TaskMaster - Request Logger Middleware
 * Logs requests with geolocation, fingerprint, and timestamp
 */

const fs = require('fs');
const path = require('path');

// Log file path
const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// IP to country mapping (basic implementation)
// In production, use a service like MaxMind GeoIP2 or ip-api.com
const geoIPCache = new Map();

/**
 * Get country from IP address
 * Uses ip-api.com free tier (limited to 45 requests/minute)
 */
async function getGeoLocation(ip) {
    // Handle localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
        return { country: 'Localhost', city: 'Local', countryCode: 'LO' };
    }

    // Clean IPv6-mapped IPv4
    const cleanIP = ip.replace('::ffff:', '');

    // Check cache
    if (geoIPCache.has(cleanIP)) {
        return geoIPCache.get(cleanIP);
    }

    try {
        // Use ip-api.com (free, no API key required)
        const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,country,countryCode,city`);
        const data = await response.json();

        if (data.status === 'success') {
            const geoData = {
                country: data.country,
                city: data.city,
                countryCode: data.countryCode
            };
            geoIPCache.set(cleanIP, geoData);
            return geoData;
        }
    } catch (error) {
        console.error('GeoIP lookup error:', error.message);
    }

    return { country: 'Unknown', city: 'Unknown', countryCode: 'XX' };
}

/**
 * Generate fingerprint from request headers
 */
function generateFingerprint(req) {
    const components = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        req.headers['accept'] || '',
        req.headers['connection'] || '',
        req.headers['sec-ch-ua'] || '',
        req.headers['sec-ch-ua-platform'] || '',
        req.headers['sec-ch-ua-mobile'] || ''
    ];

    // Simple hash function
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to hex string
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Format log entry
 */
function formatLogEntry(data) {
    return JSON.stringify(data) + '\n';
}

/**
 * Write log to file
 */
function writeLog(logEntry) {
    try {
        fs.appendFileSync(LOG_FILE, formatLogEntry(logEntry));
    } catch (error) {
        console.error('Failed to write log:', error.message);
    }
}

/**
 * Request logger middleware
 */
const requestLogger = async (req, res, next) => {
    const startTime = Date.now();

    // Get client IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.socket?.remoteAddress ||
               req.ip ||
               'unknown';

    // Generate fingerprint
    const fingerprint = generateFingerprint(req);

    // Get geolocation (async, don't block request)
    const geoPromise = getGeoLocation(ip);

    // Store original end method
    const originalEnd = res.end;

    // Override end method to capture response
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;

        // Call original end
        originalEnd.call(this, chunk, encoding);

        // Log async (don't wait)
        geoPromise.then(geo => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('ru-RU'),
                time: new Date().toLocaleTimeString('ru-RU'),
                method: req.method,
                path: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                ip: ip,
                fingerprint: fingerprint,
                geo: {
                    country: geo.country,
                    countryCode: geo.countryCode,
                    city: geo.city
                },
                userAgent: req.headers['user-agent'] || 'unknown',
                referer: req.headers['referer'] || null,
                userId: req.user?.id || null,
                userEmail: req.user?.email || null
            };

            writeLog(logEntry);
        }).catch(err => {
            console.error('Log geo error:', err.message);
        });
    };

    next();
};

/**
 * Get logs from file
 */
function getLogs(options = {}) {
    const { limit = 100, offset = 0, filter = {} } = options;

    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }

        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);

        let logs = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Apply filters
        if (filter.country) {
            logs = logs.filter(l => l.geo?.countryCode === filter.country || l.geo?.country?.includes(filter.country));
        }
        if (filter.fingerprint) {
            logs = logs.filter(l => l.fingerprint === filter.fingerprint);
        }
        if (filter.userId) {
            logs = logs.filter(l => l.userId === filter.userId);
        }
        if (filter.startDate) {
            const start = new Date(filter.startDate);
            logs = logs.filter(l => new Date(l.timestamp) >= start);
        }
        if (filter.endDate) {
            const end = new Date(filter.endDate);
            logs = logs.filter(l => new Date(l.timestamp) <= end);
        }

        // Sort by timestamp descending (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Apply pagination
        return logs.slice(offset, offset + limit);
    } catch (error) {
        console.error('Error reading logs:', error);
        return [];
    }
}

/**
 * Get log statistics
 */
function getLogStats() {
    try {
        const logs = getLogs({ limit: 10000 });

        const stats = {
            totalRequests: logs.length,
            uniqueIPs: new Set(logs.map(l => l.ip)).size,
            uniqueFingerprints: new Set(logs.map(l => l.fingerprint)).size,
            uniqueUsers: new Set(logs.filter(l => l.userId).map(l => l.userId)).size,
            countries: {},
            methods: {},
            statusCodes: {},
            topPaths: {},
            hourlyDistribution: Array(24).fill(0)
        };

        logs.forEach(log => {
            // Countries
            const country = log.geo?.country || 'Unknown';
            stats.countries[country] = (stats.countries[country] || 0) + 1;

            // Methods
            stats.methods[log.method] = (stats.methods[log.method] || 0) + 1;

            // Status codes
            const statusGroup = Math.floor(log.statusCode / 100) * 100;
            stats.statusCodes[statusGroup] = (stats.statusCodes[statusGroup] || 0) + 1;

            // Top paths
            const path = log.path?.split('?')[0] || '/';
            stats.topPaths[path] = (stats.topPaths[path] || 0) + 1;

            // Hourly distribution
            const hour = new Date(log.timestamp).getHours();
            stats.hourlyDistribution[hour]++;
        });

        // Sort and limit top paths
        stats.topPaths = Object.entries(stats.topPaths)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

        return stats;
    } catch (error) {
        console.error('Error calculating stats:', error);
        return null;
    }
}

/**
 * Clear old logs (older than specified days)
 */
function clearOldLogs(daysToKeep = 30) {
    try {
        const logs = getLogs({ limit: 100000 });
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);

        // Rewrite file with only recent logs
        fs.writeFileSync(LOG_FILE, recentLogs.map(formatLogEntry).join(''));

        return {
            removed: logs.length - recentLogs.length,
            remaining: recentLogs.length
        };
    } catch (error) {
        console.error('Error clearing logs:', error);
        return null;
    }
}

module.exports = {
    requestLogger,
    getLogs,
    getLogStats,
    clearOldLogs,
    LOG_FILE,
    LOG_DIR
};
