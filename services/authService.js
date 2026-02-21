const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

module.exports = { registerUser, loginUser };