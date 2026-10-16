const errorHandler = (err, req, res, next) => {
    // 1. Payload Too Large (DoS Defense)
    if (err.type === 'entity.too.large' || err.status === 413) {
        return res.status(413).json({
            success: false,
            message: "Request payload exceeds maximum allowed limit (1MB)."
        });
    }

    // 2. CORS Violation
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: "Cross-Origin Request Blocked by Security Policy."
        });
    }

    // 3. Duplicate Key (Mongo E11000)
    if (err.code === 11000) {
        if (err.keyPattern && err.keyPattern.order) {
            return res.status(400).json({
                message: "Lesson order already exists in this module"
            });
        }
        return res.status(400).json({
            message: "Duplicate entry detected"
        });
    }

    // 4. Schema Validation
    if (err.name === "ValidationError") {
        return res.status(400).json({
            message: err.message,
        });
    }

    // 5. JWT / Auth Failures
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" || err.message === "Invalid authorization" || err.message === "Invalid Authorization" || err.message === "Not authorized!") {
        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token",
        });
    }

    // 6. Generic 500: Mask internal stack traces in production
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? "Internal Server Error" : (err.message || "Internal Server Error");

    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);

    res.status(err.status || 500).json({
        success: false,
        message
    });
};

module.exports = errorHandler;