const moduleService = require('../services/moduleService');
exports.createModule = async (req, res, next) => {
    const { title, order } = req.body;
    const instructorId = req.user.id;
    const courseId = req.params.courseId;
    console.log(courseId);
    try {
        const result = await moduleService.createModule({ courseId, title, order, instructorId });
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err.message });
    }
}
exports.updateModule = async (req, res, next) => {
    try {
        const result = await moduleService.updateModule({
            moduleId: req.params.moduleId,
            instructorId: req.user.id,
            updatedData: req.body
        });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}
exports.getModule = async (req, res, next) => {
    const moduleId = req.params.moduleId;
    try {
        const result = await moduleService.getModule({ moduleId });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}
exports.fetchModules = async (req, res, next) => {
    const courseId = req.params.courseId;
    try {
        const result = (await moduleService.fetchModules({ courseId }));
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
}