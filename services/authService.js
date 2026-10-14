const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('../models/user');
const nodemailer = require('nodemailer');
const crypto = require('crypto')
const getTransporter = () => {
    const emailUser = process.env.EMAIL_USER || "skillforge.noreply@gmail.com";
    const emailPass = process.env.EMAIL_PASS || "laxx wion xwlu kaaj";

    if (emailUser && emailPass) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
        });
    }

    if (process.env.SENDGRID_KEY && process.env.SENDGRID_KEY.startsWith("SG.")) {
        return nodemailer.createTransport({
            host: "smtp.sendgrid.net",
            port: 587,
            auth: {
                user: "apikey",
                pass: process.env.SENDGRID_KEY
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
        });
    }

    return null;
};
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
        // Case-insensitive user lookup
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
        if (!user) {
            throw new Error("This email is not registered with SkillForge.");
        }

        // Generate cryptographically secure random token (64 hex characters)
        const token = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

        // Initialize resetTokens array if needed, keep only non-expired tokens
        user.resetTokens = (user.resetTokens || []).filter(t => t.expiry && new Date(t.expiry) > new Date());
        user.resetTokens.push({ tokenHash: hashedToken, expiry: new Date(expiry) });

        // Maintain legacy fields for compatibility
        user.resetToken = hashedToken;
        user.resetTokenExpiry = expiry;
        await user.save();

        const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, '');
        const resetLink = `${frontendUrl}/auth/forgot-password/${token}?email=${encodeURIComponent(user.email)}`;

        const senderEmail = process.env.EMAIL_USER || "skillforge.noreply@gmail.com";
        const mailOptions = {
            from: `"SkillForge Support" <${senderEmail}>`,
            to: user.email,
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

        const transporter = getTransporter();
        if (transporter) {
            // Asynchronously dispatch email without blocking HTTP response
            transporter.sendMail(mailOptions)
                .then(() => {
                    console.log(`✅ Password reset email successfully delivered to ${user.email}`);
                })
                .catch((mailError) => {
                    console.warn("⚠️ Email delivery note:", mailError.message);
                    console.log("\n=======================================================");
                    console.log("🔗 [DEV] PASSWORD RESET LINK FOR " + user.email + ":");
                    console.log(resetLink);
                    console.log("=======================================================\n");
                });
        } else {
            console.log("\n=======================================================");
            console.log("🔗 [DEV] NO TRANSPORTER CONFIGURED. RESET LINK FOR " + user.email + ":");
            console.log(resetLink);
            console.log("=======================================================\n");
        }

        return { success: true, message: "Reset link has been sent to your email." };
    } catch (err) {
        return { success: false, message: err.message };
    }
};

const forgotPasswordTokenCheck = async ({ token, email }) => {
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (!user) {
        throw new Error("User not found!");
    }

    const shaHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = Date.now();

    // 1. Check in multi-token resetTokens array
    const validInArray = (user.resetTokens || []).some(
        t => t.tokenHash === shaHash && new Date(t.expiry) > new Date(now)
    );

    if (validInArray) {
        return { success: true, message: "Token valid, proceed to reset password" };
    }

    // 2. Check legacy resetToken field (SHA-256 or bcrypt)
    if (user.resetToken && user.resetTokenExpiry && new Date(user.resetTokenExpiry) > new Date(now)) {
        if (user.resetToken === shaHash) {
            return { success: true, message: "Token valid, proceed to reset password" };
        }
        try {
            const isBcryptMatch = await bcrypt.compare(token, user.resetToken);
            if (isBcryptMatch) {
                return { success: true, message: "Token valid, proceed to reset password" };
            }
        } catch (e) {
            // Not a bcrypt hash
        }
    }

    throw new Error("Password reset link is invalid or has expired. Please request a new one.");
};

const resetPassword = async ({ email, token, password }) => {
    if (!token) {
        throw new Error("Security reset token is required.");
    }

    if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
    }

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (!user) {
        throw new Error("User not found.");
    }

    const shaHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = Date.now();

    // Verify token exists and is still valid
    let isValid = false;
    if (user.resetTokens && user.resetTokens.length > 0) {
        isValid = user.resetTokens.some(
            t => t.tokenHash === shaHash && new Date(t.expiry) > new Date(now)
        );
    }

    if (!isValid && user.resetToken && user.resetTokenExpiry && new Date(user.resetTokenExpiry) > new Date(now)) {
        if (user.resetToken === shaHash) {
            isValid = true;
        } else {
            try {
                isValid = await bcrypt.compare(token, user.resetToken);
            } catch (e) {
                isValid = false;
            }
        }
    }

    if (!isValid) {
        throw new Error("Invalid or expired security token.");
    }

    // Hash new password and revoke ALL reset tokens
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.resetTokens = [];

    await user.save();
    return { success: true, message: "Password updated successfully!" };
};

module.exports = { registerUser, loginUser, forgotPassword, forgotPasswordTokenCheck, resetPassword };