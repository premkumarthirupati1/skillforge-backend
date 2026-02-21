const authService = require('../services/authService');

exports.signUpController = async (req, res, next) => {
    const { name, role, email, password } = req.body;
    try {
        const result = await authService.registerUser({ name, role, email, password });
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
}
exports.loginController = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await authService.loginUser({ email, password });
        console.log("Login Successful!");
        return res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}