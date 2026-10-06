const User = require('../models/user');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/course');
const enrollmentService = require('../services/enrollmentService');
const { getCachedData, invalidateCache } = require('../utils/cacheHelper');

exports.enrollInCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await enrollmentService.enrollment({ courseId, userId });
        await invalidateCache(`enrollments:${userId}`);
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

exports.getEnrollments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = `enrollments:${userId}`;

        const enrollments = await getCachedData(cacheKey, 3600, async () => {
            return await Enrollment.find({ userId }).populate('courseId');
        });

        return res.status(200).json(enrollments);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

exports.getSingleCourseProgress = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const cacheKey = `enrollment:progress:${userId}:${courseId}`;

        const enrollment = await getCachedData(cacheKey, 7200, async () => {
            return await Enrollment.findOne({ userId, courseId })
                .populate('courseId')
                .populate('completedLessons');
        });

        if (!enrollment) {
            return res.status(404).json({ message: "No active enrollment found for this course." });
        }

        return res.status(200).json(enrollment);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

exports.toggleLessonCompletion = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { lessonId } = req.body;
        const userId = req.user.id;
        const cacheKey = `enrollment:progress:${userId}:${courseId}`;

        const course = await Course.findById(courseId);
        if (!course) {
            console.log("Course context missing for courseId:", courseId);
            return res.status(404).json({ message: "Course context missing." });
        }

        const Module = require('../models/module');
        const Lesson = require('../models/lesson');
        const modules = await Module.find({ courseId: course._id });
        const moduleIds = modules.map(m => m._id);
        let totalLessonsCount = await Lesson.countDocuments({ moduleId: { $in: moduleIds } });

        if (totalLessonsCount === 0) totalLessonsCount = 1;

        const enrollment = await Enrollment.findOne({ userId, courseId });
        if (!enrollment) {
            console.log("Enrollment tracking error for userId:", userId, "courseId:", courseId);
            return res.status(404).json({ message: "Enrollment tracking error." });
        }

        const currentCompleted = enrollment.completedLessons.map(id => id.toString());
        const lessonIndex = currentCompleted.indexOf(lessonId.toString());

        if (lessonIndex > -1) {
            enrollment.completedLessons.splice(lessonIndex, 1);
        } else {
            enrollment.completedLessons.push(lessonId);
        }

        enrollment.lastAccessedLesson = lessonId;

        enrollment.progress = Math.min(
            100,
            Math.max(0, Math.round((enrollment.completedLessons.length / totalLessonsCount) * 100))
        );

        enrollment.markModified('completedLessons');
        await enrollment.save();

        const populatedRecord = await Enrollment.findById(enrollment._id)
            .populate('courseId')
            .populate('completedLessons');

        await invalidateCache(cacheKey);
        await invalidateCache(`enrollments:${userId}`);

        return res.status(200).json(populatedRecord);
    } catch (err) {
        console.error("Error in toggleLessonCompletion:", err);
        return res.status(400).json({ message: err.message });
    }
};