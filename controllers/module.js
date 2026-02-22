const moduleService = require('../services/moduleService');
exports.createModule = async (req, res, next) => {
    const { title, order } = req.body;
    const instructorId = req.user.id;
    const courseId = req.params.courseId;
    try {
        const result = await moduleService.createModule({ courseId, title, order, instructorId });
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err.message });
    }
}