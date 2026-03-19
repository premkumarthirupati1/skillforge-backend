const courseService = require('../services/courseService');
const upload = require('../middlewares/upload');
exports.createCourse = async (req, res, next) => {
    const { title, description, difficulty, tags, price } = req.body;
    console.log(req.body);
    try {
        const thumbnailPath = req.file ? req.file.path.replace(/\\/g, "/") : "uploads/default-thumbnail.png";
        const result = await courseService.createCourse({ title, description, difficulty, tags, price, instructorId: req.user.id, thumbnail: thumbnailPath });
        res.status(201).json({ result });
    }
    catch (err) {
        next(err);
    }
}

exports.getCourseInfo = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await courseService.getCourseInfo({ courseId, userId });
        console.log(result);
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.getCourses = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await courseService.getCourses({ userId });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.showCourses = async (req, res, next) => {
    try {
        const result = await courseService.showCourses();
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.publishCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    try {
        const result = await courseService.publishCourse({ courseId, userId });
        return res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.updateCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const instructorId = req.user.id;
    const updatedData = req.body;
    if (req.file) {
        updatedData["thumbnail"] = req.file.path.replace(/\\/g, "/");
    }
    try {
        const result = await courseService.updateCourse({ courseId, instructorId, updatedData });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}

exports.deleteCourse = async (req, res, next) => {
    try {
        const result = await courseService.deleteCourse({
            courseId: req.params.courseId,
            instructorId: req.user.id
        });

        return res.status(200).json(result);

    } catch (err) {
        next(err);
    }
};
exports.restoreCourse = async (req, res, next) => {
    try {
        const result = await courseService.restoreCourse({
            courseId: req.params.courseId,
            instructorId: req.user.id
        });

        return res.status(200).json(result);

    } catch (err) {
        next(err);
    }
}