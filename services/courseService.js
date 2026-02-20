const Course = require('../models/course');
const User = require('../models/user');
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