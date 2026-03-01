const Module = require('../models/module');
const Lesson = require('../models/lesson');
const Course = require('../models/course');
const Enrollment = require('../models/Enrollment');
const createLesson = async ({ moduleId, title, contentType, content, duration, order, instructorId }) => {
    const module = await Module.findById(moduleId).populate('courseId');
    if (!module) {
        throw new Error("No such module available");
    }
    const lesson = await Lesson.create({
        moduleId,
        title,
        contentType,
        content,
        duration,
        order
    });
    return lesson;
}

const updateLesson = async ({ lessonId, instructorId, updatedData }) => {
    const allowedFields = ["title", "content", "contentType", "duration", "order"];
    const filteredData = {};
    for (const key of allowedFields) {
        if (updatedData[key] !== undefined) {
            filteredData[key] = updatedData[key];
        }
    }
    const lesson = await Lesson.findById(lessonId).setOptions({
        includeDelete: true
    });
    if (!lesson) {
        throw new Error("Lesson not found!");
    }
    const module = await Module.findById(lesson.moduleId).setOptions({ includeDelete: true });
    if (!module) {
        throw new Error("Module not found!");
    }
    const course = await Course.findById(module.courseId).setOptions({
        includeDelete: true
    });
    if (!course) {
        throw new Error("Course not found!");
    }
    if (course.instructorId.toString() !== instructorId.toString()) {
        throw new Error("Not Authorized!");
    }
    if (course.isPublished && updateData.order !== undefined) {
        throw new Error("Cannot reorder lessons after course is published");
    }
    Object.assign(lesson, filteredData);
    try {
        await lesson.save();
    }
    catch (err) {
        if (err.code === 11000) {
            throw new Error("Duplication Key error!");
        }
        throw err;
    }
    return {
        message: "Lesson updated Successfully",
        lesson
    }
}

const completeLesson = async ({ lessonId, userId }) => {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
        throw new Error("No lesson found!");
    }
    const module = await Module.findById(lesson.moduleId);
    if (!module) {
        throw new Error("No Module found!");
    }
    const courseId = module.courseId;

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        { userId, courseId },
        {
            $addToSet: { completedLessons: lessonId },
            $set: { lastAccessedLesson: lessonId }
        },
        { new: true }
    );
    if (!updatedEnrollment) {
        throw new Error("Not Enrolled in this course!");
    }
    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(m => m._id);
    const totalLessons = await Lesson.countDocuments(
        {
            moduleId: { $in: moduleIds }
        }
    );
    const completedCount = updatedEnrollment.completedLessons.length;
    updatedEnrollment.progress =
        totalLessons === 0
            ? 0
            : Math.round((completedCount / totalLessons) * 100);

    let nextLesson = await Lesson.findOne({
        moduleId: module._id,
        order: { $gt: lesson.order }
    }).sort({ order: 1 });

    if (!nextLesson) {

        const nextModule = await Module.findOne({
            courseId,
            order: { $gt: module.order }
        }).sort({ order: 1 });

        if (nextModule) {
            nextLesson = await Lesson.findOne({
                moduleId: nextModule._id
            }).sort({ order: 1 });
        }
    }
    enrollment.lastAccessedLesson = nextLesson ? nextLesson._id : lesson._id;
    await enrollment.save();
    return {
        progress: enrollment.progress,
        nextLessonId: nextLesson ? nextLesson._id : null,
        message: nextLesson
            ? "Lesson Completed"
            : "Module Completed"
    };
}

module.exports = { createLesson, completeLesson, updateLesson };