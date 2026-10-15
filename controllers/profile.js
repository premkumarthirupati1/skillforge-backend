const mongoose = require('mongoose');
const Profile = require('../models/profile');
const User = require('../models/user');

const generateUniqueUsername = async (baseName, userId) => {
    let clean = (baseName || "developer")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 20);
    if (!clean || clean.length < 3) clean = "developer";

    let candidate = clean;
    let count = 0;
    while (true) {
        const existing = await Profile.findOne({ username: candidate, userId: { $ne: userId } });
        if (!existing) break;
        count++;
        candidate = `${clean}${count}`;
    }
    return candidate;
};

exports.getProfile = async (req, res, next) => {
    const userId = req.user.id;
    try {
        let profile = await Profile.findOne({ userId }).populate('userId', 'email role name username createdAt');
        const user = await User.findById(userId);

        if (!profile) {
            const initialName = (user && user.name) ? user.name : (user && user.email ? user.email.split('@')[0] : "Developer");
            const initialBio = (user && user.Bio) ? user.Bio : "";
            const initialUsername = await generateUniqueUsername(user?.username || user?.email?.split('@')[0] || user?.name, userId);

            profile = await Profile.create({
                userId,
                name: initialName,
                username: initialUsername,
                bio: initialBio,
                socials: { github: "", twitter: "", linkedin: "" }
            });

            if (user && !user.username) {
                user.username = initialUsername;
                await user.save();
            }

            profile = await Profile.findOne({ userId }).populate('userId', 'email role name username createdAt');
        } else if (!profile.username) {
            // Auto-populate missing username for existing profiles
            const generatedUsername = await generateUniqueUsername(user?.username || user?.email?.split('@')[0] || profile.name, userId);
            profile.username = generatedUsername;
            await profile.save();

            if (user && !user.username) {
                user.username = generatedUsername;
                await user.save();
            }
        }

        return res.status(200).json(profile);
    }
    catch (err) {
        next(err);
    }
};

exports.getPublicProfile = async (req, res, next) => {
    const identifier = req.params.identifier || req.params.userId;
    if (!identifier) {
        return res.status(400).json({ message: "Identifier is required" });
    }

    try {
        const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
        const query = isObjectId 
            ? { $or: [{ username: identifier.toLowerCase() }, { userId: identifier }] }
            : { username: identifier.toLowerCase() };

        let profile = await Profile.findOne(query).populate('userId', 'name username role createdAt');
        
        if (!profile) {
            // Fallback: check User collection
            const userQuery = isObjectId 
                ? { $or: [{ _id: identifier }, { username: identifier.toLowerCase() }] }
                : { username: identifier.toLowerCase() };
            const user = await User.findOne(userQuery).select('name username role createdAt');

            if (!user) {
                return res.status(404).json({ message: "User profile not found" });
            }

            return res.status(200).json({
                name: user.name || user.username || "Developer",
                username: user.username || identifier.toLowerCase(),
                bio: "",
                avatar: "",
                socials: { github: "", twitter: "", linkedin: "" },
                public: true,
                userId: {
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                    createdAt: user.createdAt
                }
            });
        }

        if (profile.public === false) {
            return res.status(403).json({ message: "This profile is private" });
        }

        return res.status(200).json(profile);
    } catch (err) {
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    const userId = req.user.id;
    let { name, username, bio, socials } = req.body;
    
    if (typeof socials === 'string') {
        try { socials = JSON.parse(socials); } catch (e) {}
    }

    let avatarPath;
    if (req.file) {
        avatarPath = req.file.path.replace(/\\/g, "/");
    }

    try {
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (bio !== undefined) updateData.bio = bio;
        if (socials !== undefined) updateData.socials = socials;
        if (avatarPath) updateData.avatar = avatarPath;

        if (username !== undefined) {
            const cleanUsername = username.trim().toLowerCase();
            const usernameRegex = /^[a-z0-9_-]{3,30}$/;
            if (!usernameRegex.test(cleanUsername)) {
                return res.status(400).json({ 
                    message: "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens." 
                });
            }

            // Check if username taken by another user
            const existingProfile = await Profile.findOne({ 
                username: cleanUsername, 
                userId: { $ne: userId } 
            });
            if (existingProfile) {
                return res.status(400).json({ message: "Username is already taken. Please choose another." });
            }

            const existingUser = await User.findOne({ 
                username: cleanUsername, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                return res.status(400).json({ message: "Username is already taken. Please choose another." });
            }

            updateData.username = cleanUsername;
        }

        const result = await Profile.findOneAndUpdate(
            { userId },
            { $set: updateData },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        ).populate('userId', 'email role name username createdAt');

        // Synchronize User model
        const userUpdate = {};
        if (name) userUpdate.name = name.trim();
        if (updateData.username) userUpdate.username = updateData.username;
        if (Object.keys(userUpdate).length > 0) {
            await User.findByIdAndUpdate(userId, userUpdate);
        }

        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};