const authService = require('../services/authService');
const User = require('../models/user');

const isProd = process.env.NODE_ENV === 'production';
const getCookieOptions = () => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});

const getClientMeta = (req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return { ip, userAgent };
};

exports.signUpController = async (req, res, next) => {
    const { name, role, email, password } = req.body;
    const { ip, userAgent } = getClientMeta(req);

    try {
        const result = await authService.registerUser({ name, role, email, password, ip, userAgent });
        if (result.requiresOtp) {
            return res.status(200).json({ 
                success: true,
                requiresOtp: true, 
                email: result.email, 
                message: result.message 
            });
        }
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(201).json({ 
            success: true,
            token: result.accessToken, 
            refreshToken: result.refreshToken, 
            user: result.user 
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.loginController = async (req, res, next) => {
    const { email, password } = req.body;
    const { ip, userAgent } = getClientMeta(req);

    try {
        const result = await authService.loginUser({ email, password, ip, userAgent });
        if (result.requiresOtp) {
            return res.status(200).json({ 
                success: true,
                requiresOtp: true, 
                email: result.email, 
                message: result.message 
            });
        }
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(200).json({ 
            success: true,
            token: result.accessToken, 
            refreshToken: result.refreshToken, 
            user: result.user 
        });
    } catch (error) {
        const statusCode = error.message.includes("temporarily locked") ? 403 : 400;
        return res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.verifyOtpController = async (req, res, next) => {
    const { email, otp } = req.body;
    const { ip, userAgent } = getClientMeta(req);

    try {
        const result = await authService.verifyOtp({ email, otp, ip, userAgent });
        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(200).json({
            success: true,
            token: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            message: "Email verified successfully!"
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.resendOtpController = async (req, res, next) => {
    const { email } = req.body;
    const { ip, userAgent } = getClientMeta(req);

    try {
        const result = await authService.resendOtp({ email, ip, userAgent });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.refreshController = async (req, res, next) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const { ip, userAgent } = getClientMeta(req);

    if (!incomingRefreshToken) {
        return res.status(401).json({ success: false, message: "No refresh token provided." });
    }

    try {
        const result = await authService.rotateRefreshToken({
            incomingRefreshToken,
            ip,
            userAgent
        });

        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(200).json({
            success: true,
            token: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user
        });
    } catch (err) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax'
        });
        return res.status(403).json({ success: false, message: err.message || "Invalid refresh token." });
    }
};

exports.logoutController = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const userId = req.user?._id;

    if (refreshToken) {
        await authService.revokeSession({ refreshToken, userId });
    }

    res.clearCookie('refreshToken', { 
        httpOnly: true, 
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });

    return res.status(200).json({ success: true, message: "Logged out successfully." });
};

exports.logoutAllController = async (req, res, next) => {
    const { ip, userAgent } = getClientMeta(req);
    try {
        const result = await authService.revokeAllSessions({
            userId: req.user._id,
            ip,
            userAgent
        });

        res.clearCookie('refreshToken', { 
            httpOnly: true, 
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax'
        });

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.meController = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                username: user.username,
                bio: user.Bio,
                isEmailVerified: user.isEmailVerified,
                userProgress: user.userProgress,
                lastLoginAt: user.lastLoginAt,
                passwordChangedAt: user.passwordChangedAt
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.changePasswordController = async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const { ip, userAgent } = getClientMeta(req);

    try {
        const result = await authService.changePassword({
            userId: req.user._id,
            currentPassword,
            newPassword,
            confirmPassword,
            ip,
            userAgent
        });

        res.cookie('refreshToken', result.refreshToken, getCookieOptions());
        return res.status(200).json({
            success: true,
            message: result.message,
            token: result.accessToken,
            refreshToken: result.refreshToken
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

exports.getSessionsController = async (req, res, next) => {
    const currentRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    try {
        const sessions = await authService.getUserSessions(req.user._id, currentRefreshToken);
        return res.status(200).json({ success: true, sessions });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.forgotPasswordController = async (req, res) => {
    const { ip, userAgent } = getClientMeta(req);
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword({ email, ip, userAgent });
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

exports.forgotPasswordTokenCheckController = async (req, res) => {
    try {
        const { token, email } = req.params;
        const result = await authService.forgotPasswordTokenCheck({ token, email });
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

exports.resetPasswordController = async (req, res) => {
    const { ip, userAgent } = getClientMeta(req);
    try {
        const { email } = req.params;
        const { password, token } = req.body;
        const result = await authService.resetPassword({ email, token, password, ip, userAgent });
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};
