/**
 * Security Audit & Event Logger Middleware
 * Monitors API responses for authentication failures (401/403),
 * rate-limit triggers (429), and internal exceptions (500),
 * logging structured security telemetry for incident response.
 */
const securityAuditLogger = (req, res, next) => {
    const startTime = Date.now();
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Hook into response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Flag security-critical HTTP status codes
        if (statusCode === 401 || statusCode === 403 || statusCode === 429 || statusCode >= 500) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                event: statusCode === 429 ? 'RATE_LIMIT_HIT' : statusCode === 401 ? 'UNAUTHORIZED_ACCESS' : statusCode === 403 ? 'FORBIDDEN_ATTEMPT' : 'SERVER_ERROR',
                status: statusCode,
                method: req.method,
                path: req.originalUrl,
                ip: clientIp,
                durationMs: duration,
                userAgent: userAgent.substring(0, 100)
            };

            console.warn(`[SECURITY AUDIT] ${JSON.stringify(logEntry)}`);
        }
    });

    next();
};

module.exports = { securityAuditLogger };
