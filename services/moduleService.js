const Course = require('../models/course');
const Module = require('../models/module');
const createModule = async ({ courseId, title, order, instructorId }) => {
    const course = await Course.findById(courseId);
    if (!course) {
        throw new Error("No course is available.");
    }
    if (course.instructorId.toString() !== instructorId.toString()) {
        throw new Error("Not Authorized to edit this course.");
    }
    const module = await Module.create({
        courseId: courseId,
        title: title,
        order: order
    })
    return module;
}
module.exports = { createModule };