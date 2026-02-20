const courseService = require('../services/courseService');
exports.createCourse = async (req, res, next) => {
    const { title, description, difficulty, tags, instructorId, isPublished } = req.body;
    try {
        const result = await courseService.createCourse({ title, description, difficulty, tags, instructorId: req.user.id });
        res.status(201).json({ result });
    }
    catch (err) {
        next(err);
    }
}