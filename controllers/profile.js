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
    const { name, bio, socials } = req.body;

    try {
        const result = await Profile.findOneAndUpdate(
            { userId },
            { name, bio, userId, socials },
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