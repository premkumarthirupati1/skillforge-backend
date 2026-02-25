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

exports.getCourseInfo = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await courseService.getCourseInfo({ courseId, userId });
        res.status(200).json({ result });
    }
    catch (err) {
        next(err);
    }
}


exports.publishCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await courseService.publishCourse({ courseId, userId });
        return res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.deleteCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await courseService.deleteCourse({ courseId, userId });
        return res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}