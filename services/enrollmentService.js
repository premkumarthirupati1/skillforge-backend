const Course = require('../models/course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/user');
const Payment = require('../models/payment');

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
        throw new Error("You have already enrolled for this course.");
    }

    // Verify completed payment for paid courses
    if (course.price && Number(course.price) > 0) {
        const completedPayment = await Payment.findOne({
            userId,
            courseId,
            status: 'completed'
        });
        if (!completedPayment) {
            throw new Error("Payment required to enroll in this premium course. Please complete payment first.");
        }
    }

    const enrollment = await Enrollment.create({
        userId: userId,
        courseId: courseId,
        progress: 0,
        completedLessons: []
    });
    return { enrollment };
}
const getEnrollments = async ({ userId }) => {
    const courses = await Enrollment.find({ userId: userId }).populate('courseId');
    return courses;
}
module.exports = { enrollment, getEnrollments };