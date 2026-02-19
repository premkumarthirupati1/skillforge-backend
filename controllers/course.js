const courseService = require('../services/courseService');
exports.createCourse = (req, res, next) => {
    const { title, description, difficulty, tags, instructorId, isPublished } = req.body;
    try {
        const result = courseService.createCourse({ title, description, difficulty, tags, instructorId: req.user.id });
        res.status(200).json({ result });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
}