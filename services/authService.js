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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return {
        token,
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
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    return { token, user: { id: user._id, email: user.email, role: user.role } };
}
const forgotPassword = async ({ email }) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error("This is not a registered mail.");
        }

        const token = crypto.randomBytes(32).toString("hex");
        const hashedToken = await bcrypt.hash(token, 12);

        user.resetToken = hashedToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetLink = `http://localhost:5173/auth/forgot-password/${token}?email=${email}`;

        const mailOptions = {
            from: "thirupatipremkumar1@gmail.com",
            to: email,
            subject: "Skillforge - Password Reset",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. 
             This link will expire in 15 minutes.</p>`
        };

        await transporter.sendMail(mailOptions);
        return { success: true, message: "Reset email sent" };
    } catch (err) {
        return { success: false, message: err.message };
    }
};

const forgotPasswordTokenCheck = async ({ token, email }, res) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found!" });
        }

        const isValid = await bcrypt.compare(token, user.resetToken);
        if (!isValid || user.resetTokenExpiry < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired Token" });
        }

        res.status(200).json({ message: "Token valid, proceed to reset password" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const resetPassword = async ({ email, password }) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error("User not found");
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;

        await user.save();
        return { success: true, message: "Password reset successful" };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

module.exports = { registerUser, loginUser, forgotPassword, forgotPasswordTokenCheck, resetPassword };