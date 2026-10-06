const Course = require('../models/course');
const User = require('../models/user');
const Lesson = require('../models/lesson');
const Enrollment = require('../models/Enrollment');
const Module = require('../models/module');
const mongoose = require('mongoose');
const { getCachedData, invalidateCache } = require('../utils/cacheHelper');

exports.createCourse = async ({ title, description, difficulty, tags, instructorId, thumbnail, price }) => {
    const isFound = await Course.findOne({ title, instructorId });
    if (isFound) {
        throw new Error("You have already created this course.");
    }

    const course = await Course.create({
        title,
        description,
        difficulty,
        tags,
        price,
        instructorId,
        thumbnail
    });

    await invalidateCache("all_courses_list");

    const user = await User.findById(instructorId);
    if (!user) {
        throw new Error("No Instructor found!");
    }

    user.courses.push({ courseId: course._id });
    await user.save();

    return { course };
};

exports.getCourseInfo = async ({ courseId, userId }) => {
    const course = await Course.findById(courseId).setOptions({ includeDeleted: true });
    if (!course || (!course.isPublished && course.instructorId.toString() !== userId.toString())) {
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
        progress: enrollment?.progress || 0,
        isEnrolled: !!enrollment
    };
}

exports.getCourses = async ({ userId }) => {
    const courses = Course.find({ instructorId: userId, isDeleted: false }).sort({ createdAt: -1 });
    return courses;
}

exports.showCourses = async () => {
    return await getCachedData("all_courses_list", 43200, async () => {
        return await Course.find({ isPublished: true, isDeleted: false });
    });
}

exports.publishCourse = async ({ courseId, userId }) => {
    const course = await Course.findById(courseId);
    if (!course) {
        throw new Error("Mentioned Course is not available.");
    }
    if (course.instructorId.toString() !== userId.toString()) {
        throw new Error("Not Authorized to make changes in this Course.");
    }
    await invalidateCache("all_courses_list");
    course.isPublished = !course.isPublished;
    course.publishedAt = new Date();
    await course.save();
    return course;
}

exports.updateCourse = async ({ courseId, instructorId, updatedData }) => {
    const allowedFields = ["title", "description", "difficulty", "tags", "thumbnail", "price"];
    const filteredUpdate = {};

    for (const key of allowedFields) {
        if (updatedData[key] !== undefined) {
            if (key === "tags") {
                try {
                    const rawTags = updatedData.tags;
                    const parsedTags = typeof rawTags === 'string' ? JSON.parse(rawTags) : rawTags;
                    filteredUpdate.tags = Array.isArray(parsedTags) ? parsedTags : [];
                } catch (e) {
                    filteredUpdate.tags = [];
                }
            } else {
                filteredUpdate[key] = updatedData[key];
            }
        }
    }
    const course = await Course.findById(courseId).setOptions({ includeDeleted: true });
    if (!course) {
        throw new Error("Course not found!");
    }
    if (course.instructorId.toString() !== instructorId.toString()) {
        throw new Error("Not Authorized!");
    }
    if (filteredUpdate.title) {
        const existingTitle = await Course.findOne({
            title: filteredUpdate.title,
            instructorId,
        });
        if (existingTitle && existingTitle._id.toString() !== courseId) {
            throw new Error("You already have a course with this title.");
        }
    }
    Object.assign(course, filteredUpdate);
    await course.save();
    await invalidateCache("all_courses_list");
    return { message: "Course updated Successfully!", course };
}

exports.deleteCourse = async ({ courseId, instructorId }) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();


        const course = await Course.findById(courseId)
            .setOptions({ includeDeleted: true })
            .session(session);

        if (!course) {
            throw new Error("Course not found");
        }

        if (course.instructorId.toString() !== instructorId.toString()) {
            throw new Error("Not authorized");
        }


        course.isDeleted = true;
        await course.save({ session });


        await Module.updateMany(
            { courseId },
            { isDeleted: true },
            { session }
        );


        const modules = await Module.find({ courseId })
            .setOptions({ includeDeleted: true })
            .session(session);

        const moduleIds = modules.map(m => m._id);


        await Lesson.updateMany(
            { moduleId: { $in: moduleIds } },
            { isDeleted: true },
            { session }
        );

        await Enrollment.updateMany(
            { courseId },
            { isDeleted: true },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
        await invalidateCache("all_courses_list");
        return { message: "Course deleted successfully" };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};

exports.restoreCourse = async ({ courseId, instructorId }) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();


        const course = await Course.findById(courseId)
            .setOptions({ includeDeleted: true })
            .session(session);

        if (!course) {
            throw new Error("Course not found");
        }

        if (course.instructorId.toString() !== instructorId.toString()) {
            throw new Error("Not authorized");
        }


        course.isDeleted = false;
        await course.save({ session });


        await Module.updateMany(
            { courseId },
            { isDeleted: false },
            { session }
        );


        const modules = await Module.find({ courseId })
            .setOptions({ includeDeleted: true })
            .session(session);

        const moduleIds = modules.map(m => m._id);


        await Lesson.updateMany(
            { moduleId: { $in: moduleIds } },
            { isDeleted: false },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
        await invalidateCache("all_courses_list");

        return { message: "Course Restored successfully" };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};

exports.searchCourses = async ({ query, limit = 5 }) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const trimmedQuery = query.trim();
    const tokens = trimmedQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return [];
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Matches the start of any word (word boundary or non-alphanumeric boundary)
    const tokenConditions = tokens.map((token) => {
        const escaped = escapeRegex(token);
        const prefixRegex = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}`, 'i');
        return {
            $or: [
                { title: { $regex: prefixRegex } },
                { tags: { $regex: prefixRegex } },
                { description: { $regex: prefixRegex } }
            ]
        };
    });

    const courses = await Course.find({
        isPublished: true,
        $and: tokenConditions
    }).lean();

    // Sort by prefix relevance
    const lowerQuery = trimmedQuery.toLowerCase();
    const sortedCourses = courses.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();

        // 1. Exact start of title
        const aStartsWith = aTitle.startsWith(lowerQuery);
        const bStartsWith = bTitle.startsWith(lowerQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // 2. All tokens match prefix of words in title
        const aWords = aTitle.split(/[^a-zA-Z0-9_]+/).filter(Boolean);
        const bWords = bTitle.split(/[^a-zA-Z0-9_]+/).filter(Boolean);
        const aWordPrefix = tokens.every(token => aWords.some(w => w.startsWith(token.toLowerCase())));
        const bWordPrefix = tokens.every(token => bWords.some(w => w.startsWith(token.toLowerCase())));
        if (aWordPrefix && !bWordPrefix) return -1;
        if (!aWordPrefix && bWordPrefix) return 1;

        // 3. Match prefix of tags
        const aTags = Array.isArray(a.tags) ? a.tags.map(t => (t || '').toLowerCase()) : [];
        const bTags = Array.isArray(b.tags) ? b.tags.map(t => (t || '').toLowerCase()) : [];
        const aTagPrefix = tokens.every(token => aTags.some(t => t.split(/[^a-zA-Z0-9_]+/).some(w => w.startsWith(token.toLowerCase()))));
        const bTagPrefix = tokens.every(token => bTags.some(t => t.split(/[^a-zA-Z0-9_]+/).some(w => w.startsWith(token.toLowerCase()))));
        if (aTagPrefix && !bTagPrefix) return -1;
        if (!aTagPrefix && bTagPrefix) return 1;

        return 0;
    });

    return sortedCourses.slice(0, Math.max(1, Number(limit) || 5));
};