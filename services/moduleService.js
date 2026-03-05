const Course = require('../models/course');
const Module = require('../models/module');
const createModule = async ({ courseId, title, order, instructorId }) => {
    const course = await Course.findById(courseId);
    console.log(courseId);
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
const updateModule = async ({ moduleId, instructorId, updatedData }) => {
    const allowedFields = ["title", "order"];
    const filteredUpdate = {};
    for (const key of allowedFields) {
        if (updatedData[key] !== undefined) {
            filteredUpdate[key] = updatedData[key];
        }
    }
    const module = await Module.findById(moduleId).setOptions({ includeDeleted: true });
    if (!module) {
        throw new Error("No such module found!");
    }
    const course = await Course.findById(module.courseId).setOptions({ includeDeleted: true });
    if (!course) {
        throw new Error("No such course is found!");
    }
    if (course.instructorId.toString() !== instructorId.toString()) {
        throw new Error("Not Authorized!");
    }
    if (course.isPublished && updateData.order !== undefined) {
        throw new Error("Cannot reorder modules after course is published");
    }
    Object.assign(module, filteredUpdate);
    console.log(module);
    try {
        await module.save();
    }
    catch (err) {
        if (err.code == 11000) {
            throw new Error("Module already exists in this course.");
        }
        throw err;
    }
    return {
        message: "Module updated Successfully!",
        module
    }
}

const getModule = async ({ moduleId }) => {
    const module = Module.findById(moduleId);
    if (!module) {
        throw new Error("No Module found!");
    }
    return module;
}

const fetchModules = async ({ courseId }) => {
    const modules = await Module.find({ courseId }).sort({ order: 1 });
    return modules;
};
module.exports = { createModule, updateModule, fetchModules, getModule };