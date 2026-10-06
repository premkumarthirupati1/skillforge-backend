const { default: mongoose } = require('mongoose');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.signUpController = async (req, res, next) => {
    const { name, role, email, password } = req.body;
    try {
        const result = await authService.registerUser({ name, role, email, password });
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.status(200).json({ token: result.accessToken, user: result.user });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
}
exports.loginController = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await authService.loginUser({ email, password });
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        console.log("Login Successful!");
        return res.status(200).json({ token: result.accessToken, user: result.user });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}

exports.refreshController = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token found" });
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + "_REFRESH");
        const user = await User.findById(decoded.id);
        if (!user) throw new Error("User not found");
        
        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        return res.status(200).json({ token: accessToken });
    } catch (err) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
};

exports.logoutController = async (req, res, next) => {
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return res.status(200).json({ message: "Logged out" });
};
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