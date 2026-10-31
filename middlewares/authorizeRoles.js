const { logSecurityEvent } = require('./security/auditLogger');

exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';

            logSecurityEvent({
                event: 'RBAC_ACCESS_DENIED',
                userId: req.user._id,
                email: req.user.email,
                ip: clientIp,
                userAgent,
                status: 403,
                details: {
                    userRole: req.user.role,
                    allowedRoles,
                    path: req.originalUrl
                }
            });

            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have permission to access this resource."
            });
        }

        next();
    };
};
