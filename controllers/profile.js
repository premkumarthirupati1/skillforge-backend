const Profile = require('../models/profile');
const User = require('../models/user');

exports.getProfile = async (req, res, next) => {
    const userId = req.user.id;
    try {
        let profile = await Profile.findOne({ userId }).populate('userId', 'email role name createdAt');
        if (!profile) {
            const user = await User.findById(userId);
            const initialName = (user && user.name) ? user.name : (user && user.email ? user.email.split('@')[0] : "Developer");
            const initialBio = (user && user.Bio) ? user.Bio : "";
            profile = await Profile.create({
                userId,
                name: initialName,
                bio: initialBio,
                socials: { github: "", twitter: "", linkedin: "" }
            });
            profile = await Profile.findOne({ userId }).populate('userId', 'email role name createdAt');
        }
        return res.status(200).json(profile);
    }
    catch (err) {
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    const userId = req.user.id;
    let { name, bio, socials } = req.body;
    
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

        const result = await Profile.findOneAndUpdate(
            { userId },
            { $set: updateData },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        ).populate('userId', 'email role name createdAt');

        if (name) {
            await User.findByIdAndUpdate(userId, { name: name.trim() });
        }

        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};