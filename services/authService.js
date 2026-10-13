const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('../models/user');
const nodemailer = require('nodemailer');
const crypto = require('crypto')
let transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    auth: {
        user: "apikey",
        pass: process.env.SENDGRID_KEY
    }
});
const registerUser = async ({ name, role, email, password }) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("User already exists");
    }
    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
        name,
        role,
        email,
        password: hashed,
    })

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET + "_REFRESH", { expiresIn: '7d' });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            email: user.email,
            role: user.role
        }
    };
};

const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        throw new Error("Could not find this email.");
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
        throw new Error("Invalid Credentials.");
    }
    const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET + "_REFRESH",
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role } };
}
const forgotPassword = async ({ email }) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error("This email is not registered with SkillForge.");
        }

        // Generate cryptographically secure random token
        const token = crypto.randomBytes(32).toString("hex");
        const hashedToken = await bcrypt.hash(token, 12);

        user.resetToken = hashedToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const resetLink = `${frontendUrl}/auth/forgot-password/${token}?email=${encodeURIComponent(email)}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || "support@skillforge.com",
            to: email,
            subject: "SkillForge - Password Reset Request",
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #4F46E5; margin: 0; font-size: 24px; font-weight: 800;">SkillForge</h2>
                    </div>
                    <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Reset Your Password</h3>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        We received a request to reset your password for your SkillForge account. Click the button below to choose a new password:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetLink}" style="background-color: #4F46E5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
                        This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely disregard this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; margin: 0; word-break: break-all;">
                        Or copy this link: <a href="${resetLink}" style="color: #4F46E5;">${resetLink}</a>
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.warn("⚠️ Email delivery note:", mailError.message);
            // Log link for local development/testing so developer is never blocked
            console.log("\n=======================================================");
            console.log("🔗 [DEV] PASSWORD RESET LINK FOR " + email + ":");
            console.log(resetLink);
            console.log("=======================================================\n");
        }

        return { success: true, message: "Reset link has been sent to your email." };
    } catch (err) {
        return { success: false, message: err.message };
    }
};

const forgotPasswordTokenCheck = async ({ token, email }) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("User not found!");
    }

    if (!user.resetToken || !user.resetTokenExpiry) {
        throw new Error("No password reset requested or link has already been used.");
    }

    if (user.resetTokenExpiry < Date.now()) {
        throw new Error("Password reset link has expired. Please request a new one.");
    }

    const isValid = await bcrypt.compare(token, user.resetToken);
    if (!isValid) {
        throw new Error("Invalid reset link or token.");
    }

    return { success: true, message: "Token valid, proceed to reset password" };
};

const resetPassword = async ({ email, token, password }) => {
    if (!token) {
        throw new Error("Security reset token is required.");
    }

    if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("User not found.");
    }

    if (!user.resetToken || !user.resetTokenExpiry) {
        throw new Error("No password reset requested or link has already been used.");
    }

    if (user.resetTokenExpiry < Date.now()) {
        throw new Error("Password reset link has expired. Please request a new one.");
    }

    // Cryptographically verify token before allowing password modification
    const isValid = await bcrypt.compare(token, user.resetToken);
    if (!isValid) {
        throw new Error("Invalid security token.");
    }

    // Hash new password and revoke token
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();
    return { success: true, message: "Password updated successfully!" };
};

module.exports = { registerUser, loginUser, forgotPassword, forgotPasswordTokenCheck, resetPassword };