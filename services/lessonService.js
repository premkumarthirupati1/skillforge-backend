const Module = require('../models/module');
const Lesson = require('../models/lesson');
const Course = require('../models/course');
const Enrollment = require('../models/Enrollment');
const createLesson = async ({ moduleId, title, contentType, content, duration, order, instructorId }) => {
    const module = await Module.findById(moduleId);
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
    if (course.isPublished && updatedData.order !== undefined) {
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

const fetchLessons = async ({ moduleId }) => {
    const result = await Lesson.find({ moduleId }).sort({ order: 1 });
    return result;
}

const getLesson = async ({ lessonId }) => {
    const result = await Lesson.findById(lessonId);
    return result;
}
const completeLesson = async ({ lessonId, userId }) => {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const module = await Module.findById(lesson.moduleId);
    if (!module) throw new Error("Module not found");

    const courseId = module.courseId;

    // Check if already completed to determine if we are ADDING or REMOVING
    const currentEnrollment = await Enrollment.findOne({ userId, courseId });
    if (!currentEnrollment) throw new Error("Not enrolled");

    const isAlreadyComplete = currentEnrollment.completedLessons.includes(lessonId);

    // Update Enrollment using $pull (remove) or $addToSet (add)
    const updateAction = isAlreadyComplete
        ? { $pull: { completedLessons: lessonId } }
        : { $addToSet: { completedLessons: lessonId }, $set: { lastAccessedLesson: lessonId } };

    const enrollment = await Enrollment.findOneAndUpdate(
        { userId, courseId },
        updateAction,
        { new: true }
    );

    //Recalculate Progress (Logic remains same, but using updated enrollment)
    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(m => m._id);
    const totalLessons = await Lesson.countDocuments({ moduleId: { $in: moduleIds } });

    const completedCount = enrollment.completedLessons.length;
    const progress = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

    enrollment.progress = progress;
    await enrollment.save();

    //  Find Next Lesson (Only if we just COMPLETED the lesson)
    let nextLessonId = null;
    if (!isAlreadyComplete) {
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
                nextLesson = await Lesson.findOne({ moduleId: nextModule._id }).sort({ order: 1 });
            }
        }
        nextLessonId = nextLesson ? nextLesson._id : null;
    }
    lesson.completed = !lesson.completed;
    await lesson.save();
    return {
        progress,
        isCompleted: !isAlreadyComplete, // Tell frontend the new state
        nextLessonId,
        message: isAlreadyComplete ? "Lesson unmarked" : (nextLessonId ? "Lesson completed" : "Course completed")
    };
};
module.exports = { createLesson, completeLesson, updateLesson, fetchLessons, getLesson };