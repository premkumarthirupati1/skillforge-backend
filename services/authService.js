const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('../models/user');
const nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    auth: {
        user: "apikey",
        pass: "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"
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
    const user = User.findOne({ email });
    if (!user) {
        throw new Error("This is not a registered mail.");
    }
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    let resetlink = `https://localhost:5173/auth/forgot-password/${token}`;
    let mailOptions = {
        from: "thirupatipremkumar1@gmail.com",
        to: email,
        subject: "From Skillforge-Password Reset",
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password. 
         This link will expire in 15 minutes.</p>`
    }
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    user.save();
    transporter.sendMail(mailOptions);
}
const forgotPasswordTokenCheck = async () => {
    try {
        const { token, email } = req.paramas;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found!" });
        }
        if (user.resetToken !== token || user.resetTokenExpiry < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired Token" });
        }
        res.status(200).json({ message: "Token valid,proceed to reset password" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
}
module.exports = { registerUser, loginUser };