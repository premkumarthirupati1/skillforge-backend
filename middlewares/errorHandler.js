const errorHandler = (err, req, res, next) => {
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
    if (err.name === "ValidationError") {
        return res.status(400).json({
            message: err.message,
        });
    }
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" || err.message === "Invalid authorization" || err.message === "Invalid Authorization" || err.message === "Not authorized!") {
        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token",
        });
    }
    res.status(500).json({
        message: err.message || "Internal Server Error"
    });
}
module.exports = errorHandler;