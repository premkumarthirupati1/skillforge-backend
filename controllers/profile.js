const Profile = require('../models/profile');
exports.getProfile = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await Profile.find({ userId: userId });
        console.log(userId);
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}
exports.updateProfile = async (req, res, next) => {
    const userId = req.user.id;
    // When using FormData, strings might come as JSON strings or raw strings.
    // Parse socials if it's sent as a string from FormData
    let { name, bio, socials } = req.body;
    
    if (typeof socials === 'string') {
        try { socials = JSON.parse(socials); } catch (e) {}
    }

    let avatarPath;
    if (req.file) {
        avatarPath = req.file.path.replace(/\\/g, "/");
    }

    try {
        const updateData = { name, bio, userId, socials };
        if (avatarPath) {
            updateData.avatar = avatarPath;
        }

        const result = await Profile.findOneAndUpdate(
            { userId },
            updateData,
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};