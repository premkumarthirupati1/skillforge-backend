const lessonService = require('../services/lessonService');
exports.createLesson = async (req, res, next) => {
    const { moduleId, title, contentType, content, duration, order } = req.body;
    const instructorId = req.user.id;
    try {
        const result = await lessonService.createLesson({ moduleId, title, contentType, content, duration, order, instructorId });
        return res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.updateLesson = async (req, res, next) => {
    const lessonId = req.params.lessonId;
    const instructorId = req.user.id;
    const updatedData = req.body;
    try {
        const result = await lessonService.updateLesson({ lessonId, instructorId, updatedData });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.completedLesson = async (req, res, next) => {
    const lessonId = req.params.lessonId;
    const userId = req.user.id;
    try {
        const result = await lessonService.completeLesson({ lessonId, userId });
        return res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}
