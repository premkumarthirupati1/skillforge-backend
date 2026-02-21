const User = require('../models/user');
const Enrollment = require('../models/Enrollment');
const enrollmentService = require('../services/enrollmentService');
exports.enrollInCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await enrollmentService.enrollment({ courseId, userId });
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err.message });
    }
}

exports.getEnrollments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const enrollments = await Enrollment.find({ userId })
            .populate('courseId');
        return res.status(200).json(enrollments);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};