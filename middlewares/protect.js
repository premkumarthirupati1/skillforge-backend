const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { logSecurityEvent } = require('./security/auditLogger');

exports.protect = async (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
        let token;
        const authorizationHeader = req.headers.authorization;

        if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
            token = authorizationHeader.split(' ')[1];
        }

        if (!token) {
            logSecurityEvent({
                event: 'UNAUTHORIZED_ACCESS_MISSING_TOKEN',
                ip: clientIp,
                userAgent,
                status: 401,
                details: { path: req.originalUrl }
            });
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please sign in to access this resource."
            });
        }

        // Verify token signature and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid token structure. Please sign in again."
            });
        }

        // Fetch fresh user record from database
        const currentUser = await User.findById(decoded.id).select('+lockUntil');
        if (!currentUser) {
            logSecurityEvent({
                event: 'UNAUTHORIZED_ACCESS_DELETED_USER',
                userId: decoded.id,
                ip: clientIp,
                userAgent,
                status: 401,
                details: { path: req.originalUrl }
            });
            return res.status(401).json({
                success: false,
                message: "The user belonging to this token no longer exists."
            });
        }

        // Check if account is temporarily locked
        if (currentUser.isLocked()) {
            const minutesLeft = Math.ceil((currentUser.lockUntil.getTime() - Date.now()) / (60 * 1000));
            logSecurityEvent({
                event: 'LOCKED_ACCOUNT_ACCESS_ATTEMPT',
                userId: currentUser._id,
                email: currentUser.email,
                ip: clientIp,
                userAgent,
                status: 403
            });
            return res.status(403).json({
                success: false,
                message: `Account is temporarily locked. Please try again in ${minutesLeft} minute(s).`
            });
        }

        // Check if user changed password after token was issued
        if (currentUser.hasPasswordChangedAfter(decoded.iat)) {
            logSecurityEvent({
                event: 'UNAUTHORIZED_TOKEN_AFTER_PASSWORD_CHANGE',
                userId: currentUser._id,
                email: currentUser.email,
                ip: clientIp,
                userAgent,
                status: 401
            });
            return res.status(401).json({
                success: false,
                message: "Password was recently changed. Please sign in again."
            });
        }

        // Grant access: attach authenticated user
        req.user = currentUser;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                code: 'TOKEN_EXPIRED',
                message: "Session token has expired. Please refresh your session."
            });
        }

        if (err.name === 'JsonWebTokenError') {
            logSecurityEvent({
                event: 'MALFORMED_JWT_PRESENTED',
                ip: clientIp,
                userAgent,
                status: 401,
                details: { error: err.message, path: req.originalUrl }
            });
            return res.status(401).json({
                success: false,
                message: "Invalid session token. Please sign in again."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Authentication failed. Please sign in again."
        });
    }
};
