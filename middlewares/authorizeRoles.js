exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new Error("Not Authenticated!"));
        }
        console.log(req.user.role);
        if (!allowedRoles.includes(req.user.role)) {
            return next(new Error("Access Denied!"));
        }
        next();
    }
}