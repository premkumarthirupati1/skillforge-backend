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

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
        throw new Error("Not Enrolled in this course");
    }
    if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId);
    }
    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(m => m._id);
    const totalLessons = await Lesson.countDocuments({
        moduleId: { $in: moduleIds }
    });
    const completedCount = enrollment.completedLessons.length;
    console.log(completedCount);
    console.log(totalLessons);
    enrollment.progress =
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

module.exports = { createLesson, completeLesson };