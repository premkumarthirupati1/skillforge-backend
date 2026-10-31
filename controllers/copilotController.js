const copilotService = require('../services/copilotService');
const codeReviewService = require('../services/codeReviewService');

/**
 * Handle Forge Copilot Chat Request
 * Route: POST /api/copilot/chat
 */
exports.handleCopilotChat = async (req, res, next) => {
    try {
        const { mode = "global", messages = [], context = {}, isAgent = false } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Messages array cannot be empty."
            });
        }

        // Validate mode
        const allowedModes = ["global", "learning", "coding"];
        const validatedMode = allowedModes.includes(mode) ? mode : "global";

        // Enrich context with authenticated user if present
        const enrichedContext = {
            ...context,
            userId: req.user?.id || null
        };

        const result = await copilotService.chatWithCopilot({
            mode: validatedMode,
            messages,
            context: enrichedContext,
            isAgent: Boolean(isAgent)
        });

        return res.status(200).json({
            success: true,
            mode: validatedMode,
            category: result.category || "general",
            action: result.action || null,
            target: result.target || null,
            path: result.path || null,
            reply: result.reply,
            suggestions: result.suggestions || [],
            recommendedCourses: result.recommendedCourses || [],
            citedLessons: result.citedLessons || [],
            needsContext: result.needsContext || false,
            modelUsed: result.modelUsed || null,
            latencyMs: result.latencyMs || null
        });
    } catch (err) {
        console.error("Copilot Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to generate Copilot response.",
            error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
};

/**
 * Get Public Courses for Copilot UI Quick Preview
 * Route: GET /api/copilot/courses
 */
exports.getCopilotCourses = async (req, res, next) => {
    try {
        const catalog = await copilotService.getPublishedCourseCatalog();
        return res.status(200).json({
            success: true,
            courses: catalog
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Handle AI Automated Code Review
 * Route: POST /api/copilot/code-review
 */
exports.handleCodeReview = async (req, res, next) => {
    try {
        const {
            projectId,
            projectTitle,
            language,
            milestoneIndex,
            milestoneTitle,
            milestoneRules,
            files,
            testResults
        } = req.body;

        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Source files array is required for code review."
            });
        }

        const userId = req.user?.id || req.user?._id || null;

        const review = await codeReviewService.generateCodeReview({
            projectId,
            projectTitle,
            language,
            milestoneIndex: Number(milestoneIndex) || 0,
            milestoneTitle,
            milestoneRules: Array.isArray(milestoneRules) ? milestoneRules : [],
            files,
            testResults,
            userId
        });

        return res.status(200).json({
            success: true,
            review
        });
    } catch (err) {
        console.error("Code Review Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to generate code review.",
            error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
};

/**
 * Get Review History for Project
 * Route: GET /api/copilot/reviews/:projectId
 */
exports.getProjectReviews = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?.id || req.user?._id || null;

        if (!userId) {
            return res.status(200).json({
                success: true,
                reviews: []
            });
        }

        const reviews = await codeReviewService.getProjectReviewHistory({
            userId,
            projectId
        });

        return res.status(200).json({
            success: true,
            reviews
        });
    } catch (err) {
        next(err);
    }
};
