const { default: mongoose } = require('mongoose');
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
exports.forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword({ email });
        if (result.success) {
            return res.status(200).json({ message: result.message });
        }
        return res.status(400).json({ message: result.message });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.forgotPasswordTokenCheckController = async (req, res) => {
    try {
        const { token, email } = req.params;
        await authService.forgotPasswordTokenCheck({ token, email }, res);
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.resetPasswordController = async (req, res) => {
    try {
        const { email } = req.params;
        const { password } = req.body;
        const result = await authService.resetPassword({ email, password });
        if (result.success) {
            return res.status(200).json({ message: result.message });
        }
        return res.status(400).json({ message: result.message });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};