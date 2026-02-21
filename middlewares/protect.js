const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    try {
        let token;
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            throw new Error("Invalid authorization");
        }
        console.log(authorizationHeader);
        if (!authorizationHeader.startsWith('Bearer ')) {
            throw new Error("Invalid Authorization");
        }
        token = authorizationHeader.split(' ')[1];
        if (!token) {
            throw new Error("Not authorized!");
        }
        console.log(process.env.JWT_SECRET);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        next(err);
    }
}