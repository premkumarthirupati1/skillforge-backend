const authService = require('../services/authService');

exports.signUpController = (req, res, next) => {
    const { name, role, email, password } = req.body;
    try {
        const result = authService.signUpController({ name, role, email, password });
        return res.status(200).json({ result });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
}
exports.loginController = (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = authService.loginUser({ email, password });
        return res.status(200).json({ result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}