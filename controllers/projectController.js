const ProjectProgress = require('../models/ProjectProgress');

/**
 * Save or update project progress for the authenticated user
 * POST /api/projects/progress
 */
exports.saveProjectProgress = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const {
            projectId,
            projectTitle,
            track,
            currentMilestone,
            verifiedMilestones,
            status,
            percent,
            secondsElapsed
        } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        const updateData = {
            lastActive: new Date()
        };
        if (projectTitle) updateData.projectTitle = projectTitle;
        if (track) updateData.track = track;
        if (currentMilestone !== undefined) updateData.currentMilestone = currentMilestone;
        if (Array.isArray(verifiedMilestones)) updateData.verifiedMilestones = verifiedMilestones;
        if (status) updateData.status = status;
        if (percent !== undefined) updateData.percent = percent;
        if (secondsElapsed !== undefined) updateData.secondsElapsed = secondsElapsed;

        const progress = await ProjectProgress.findOneAndUpdate(
            { userId, projectId },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Project progress saved successfully",
            progress
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch project progress for a specific project
 * GET /api/projects/progress/:projectId
 */
exports.getProjectProgress = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const { projectId } = req.params;

        const progress = await ProjectProgress.findOne({ userId, projectId });
        return res.status(200).json({
            success: true,
            progress: progress || null
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Fetch all active and completed project builds for the authenticated user
 * GET /api/projects/builds
 */
exports.getUserBuilds = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const builds = await ProjectProgress.find({ userId }).sort({ lastActive: -1 });

        return res.status(200).json({
            success: true,
            builds
        });
    } catch (err) {
        next(err);
    }
};
