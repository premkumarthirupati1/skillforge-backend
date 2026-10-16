const { default: mongoose } = require('mongoose');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const isProd = process.env.NODE_ENV === 'production';
const getCookieOptions = () => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});

exports.signUpController = async (req, res, next) => {
    const { name, role, email, password } = req.body;
    try {
        const result = await authService.registerUser({ name, role, email, password });
        if (result.requiresOtp) {
            return res.status(200).json({ 
                requiresOtp: true, 
                email: result.email, 
                message: result.message 
            });
        }
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(200).json({ 
            token: result.accessToken, 
            refreshToken: result.refreshToken, 
            user: result.user 
        });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

exports.loginController = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await authService.loginUser({ email, password });
        if (result.requiresOtp) {
            return res.status(200).json({ 
                requiresOtp: true, 
                email: result.email, 
                message: result.message 
            });
        }
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        console.log("Login Successful!");
        return res.status(200).json({ 
            token: result.accessToken, 
            refreshToken: result.refreshToken, 
            user: result.user 
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.verifyOtpController = async (req, res, next) => {
    const { email, otp } = req.body;
    try {
        const result = await authService.verifyOtp({ email, otp });
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(200).json({
            token: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            message: "Email verified successfully!"
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

exports.resendOtpController = async (req, res, next) => {
    const { email } = req.body;
    try {
        const result = await authService.resendOtp({ email });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

exports.refreshController = async (req, res, next) => {
    // Support both HttpOnly cookie and body fallback for cross-site browser safety
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token found" });
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + "_REFRESH");
        const user = await User.findById(decoded.id);
        if (!user) throw new Error("User not found");
        
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
        const accessToken = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        const newRefreshToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET + "_REFRESH",
            { expiresIn: '30d' }
        );

        res.cookie('refreshToken', newRefreshToken, getCookieOptions());
        return res.status(200).json({ token: accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
};

exports.logoutController = async (req, res, next) => {
    res.clearCookie('refreshToken', { 
        httpOnly: true, 
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });
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
        const result = await authService.forgotPasswordTokenCheck({ token, email });
        return res.status(200).json({ message: result.message });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

exports.resetPasswordController = async (req, res) => {
    try {
        const { email } = req.params;
        const { password, token } = req.body;
        const result = await authService.resetPassword({ email, token, password });
        if (result.success) {
            return res.status(200).json({ message: result.message });
        }
        return res.status(400).json({ message: result.message });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};