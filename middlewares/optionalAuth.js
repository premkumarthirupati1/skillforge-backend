const jwt = require('jsonwebtoken');

/**
 * Optional Authentication Middleware:
 * If an Authorization header with Bearer token is provided and valid,
 * req.user is populated with the decoded token payload.
 * If no token is provided, or the token is expired/invalid,
 * req.user is set to null and execution continues uninterrupted.
 */
exports.optionalAuth = (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authorizationHeader.split(' ')[1];
        if (!token) {
            req.user = null;
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (jwtErr) {
            // Token expired or invalid - gracefully treat as unauthenticated guest
            req.user = null;
        }

        next();
    } catch (err) {
        req.user = null;
        next();
    }
};
