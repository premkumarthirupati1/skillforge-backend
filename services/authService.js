const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
exports.registerUser = async ({ email, password }) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("User already exists");
    }
    const hashed = await bcrypt.hash(password, 12);

    const user = User.create({
        email,
        password: hashed,
    })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return { user, token };
};