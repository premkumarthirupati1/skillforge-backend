const copilotService = require('../services/copilotService');

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
            reply: result.reply,
            suggestions: result.suggestions || [],
            recommendedCourses: result.recommendedCourses || []
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
