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
    console.log(email);
    console.log(password);
    try {
        const result = await authService.loginUser({ email, password });
        console.log("Login Successful!");
        return res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}
exports.forgotPasswordController = async (req, res, next) => {
    const { email } = req.body;
    try {
        const result = await authService.forgotPassword({ email });
        console.log("Password Reset Successful!");
        return res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
    res.json({ message: "Token valid, please enter new password" });
}
exports.forgotPasswordToken = async (req, res, next) => {
    const { email }
}