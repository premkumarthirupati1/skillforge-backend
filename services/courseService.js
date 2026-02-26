const Course = require('../models/course');
const User = require('../models/user');
const Lesson = require('../models/lesson');
const Enrollment = require('../models/Enrollment');
const Module = require('../models/module');
const mongoose = require('mongoose');
exports.createCourse = async ({ title, description, difficulty, tags, instructorId }) => {
    const isFound = await Course.findOne({ title, instructorId });
    if (isFound) {
        throw new Error("You have already created this course.");
    }
    const course = await Course.create({
        title,
        description,
        difficulty,
        tags,
        instructorId,
    });
    const user = await User.findById(instructorId);
    if (!user) {
        throw new Error("No Instructor found!");
    }
    user.courses.push({ courseId: course._id });
    await user.save();
    return { course };
};

exports.getCourseInfo = async ({ courseId, userId }) => {
    const course = await Course.findById(courseId);
    if (!course.isPublished && !course.instructorId.toString() !== userId) {
        throw new Error("Course is not available.");
    }
    const modules = await Module.find({ courseId }).sort({ order: 1 });
    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });
    const enrollment = await Enrollment.findOne({
        userId,
        courseId
    });
    const structuredModules = modules.map(module => {
        const moduleLessons = lessons
            .filter(lesson => lesson.moduleId.toString() === module._id.toString())
            .map(lesson => ({
                ...lesson.toObject(),
                completed: enrollment?.completedLessons.includes(lesson._id)
            }));
        return {
            ...module.toObject(),
            lessons: moduleLessons,
        };
    });
    return {
        course,
        modules: structuredModules,
        progress: enrollment?.progress || 0
    };
}

exports.publishCourse = async ({ courseId, userId }) => {
    const course = await Course.findById(courseId);
    if (!course) {
        throw new Error("Mentioned Course is not available.");
    }
    if (course.instructorId.toString() !== userId.toString()) {
        throw new Error("Not Authorized to make changes in this Course.");
    }
    course.isPublished = true;
    course.publishedAt = new Date();
    await course.save();
    return course;
}
exports.deleteCourse = async ({ courseId, instructorId }) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const course = await Course
            .findById(courseId)
            .setOptions({ includeDeleted: true })
            .session(session);

        if (!course) {
            throw new Error("Course not found!");
        }

        course.isDeleted = true;
        await course.save({ session });

        console.log("After save:", course.isDeleted); // ✅ HERE
        console.log("Before commit");
        await session.commitTransaction();
        console.log("After commit");
        session.endSession();

        return { message: "Course deleted successfully" };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};