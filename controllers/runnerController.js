const { executeCodeSandbox } = require('../services/codeExecutionService');
const { getAiMentorAdvice } = require('../services/aiMentorService');

/**
 * Controller: Execute Code Sandbox
 * POST /api/runner/execute
 */
exports.executeCode = async (req, res) => {
    try {
        const { language, files, entrypoint, testCases, milestoneIndex, projectId } = req.body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files provided for execution."
            });
        }

        const result = await executeCodeSandbox({
            language,
            files,
            entrypoint,
            testCases,
            milestoneIndex,
            projectId
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error("Runner controller error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal error during sandbox execution.",
            error: err.message
        });
    }
};

/**
 * Controller: AI Mentor / Forge Copilot
 * POST /api/runner/ai-assist
 */
exports.getAiMentorAssistance = async (req, res) => {
    try {
        const {
            projectId,
            projectTitle,
            language,
            milestoneIndex,
            milestoneTitle,
            milestoneObjective,
            specRules,
            testCases,
            allFiles,
            activeFileName,
            userCode,
            testResults,
            userQuery,
            hintLevel,
            isAgent
        } = req.body;

        const advice = await getAiMentorAdvice({
            projectId,
            projectTitle,
            language,
            milestoneIndex,
            milestoneTitle,
            milestoneObjective,
            specRules,
            testCases,
            allFiles,
            activeFileName,
            userCode,
            testResults,
            userQuery,
            hintLevel,
            isAgent: Boolean(isAgent)
        });

        return res.status(200).json({
            success: true,
            data: advice
        });
    } catch (err) {
        console.error("AI Mentor controller error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to generate AI mentor guidance.",
            error: err.message
        });
    }
};
