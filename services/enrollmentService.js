const Course = require('../models/course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/user');
const enrollment = async ({ courseId, userId }) => {
    const course = await Course.findById(courseId);

    if (!course) {
        throw new Error("Course not found!");
    }
    if (!course.isPublished) {
        throw new Error("Course is not published yet.");
    }
    const doesExist = await Enrollment.findOne({ courseId, userId });
    if (doesExist) {
        throw new Error("You have already enrolled for this.");
    }
    const enrollment = await Enrollment.create({
        userId: userId,
        courseId: courseId
    });
    return { enrollment };
}
const getEnrollments = async ({ userId }) => {
    const courses = await Enrollment.find({ userId: userId }).populate('courseId');
    return courses;
}
module.exports = { enrollment, getEnrollments };