/**
 * Debugging Handler
 * Handles deep algorithmic and system debugging using DeepSeek Reasoning (thinking mode).
 * Automatically collects full context: stack trace, active code, framework, milestone objectives.
 * Detects missing context and asks clarifying questions instead of guessing.
 */

const { callChatCompletion, stripThinkingTags } = require('./aiClient');

/**
 * Checks if the debugging request has sufficient context.
 */
function assessDebuggingContext(userMessage = "", context = {}) {
    const text = userMessage.toLowerCase();
    const hasInlineCode = /```[\s\S]*?```/.test(userMessage) || /\{[\s\S]*;[\s\S]*\}/.test(userMessage) || userMessage.length > 180;
    const hasInlineError = /(error|exception|fail|traceback|panic|segfault|cannot read|undefined|nan)/i.test(text);

    const project = context?.project || {};
    const hasContextCode = Boolean(project.activeCode && project.activeCode.trim().length > 10);
    const hasContextError = Boolean(context.error || context.testResults?.failedAssertion || project.testResults?.failedAssertion);

    const hasAnyCode = hasInlineCode || hasContextCode;
    const hasAnyError = hasInlineError || hasContextError;

    // Check if the user is making a vague debugging plea with zero context
    const isVaguePlea = /^(debug|fix this|fix it|why does it fail|why is my code not working|error in my code|help me debug|it failed|not working)\??$/i.test(text.trim());

    if (isVaguePlea && !hasAnyCode && !hasAnyError) {
        return {
            sufficient: false,
            missing: ["error_and_code"],
            message: "I need a bit more context to diagnose the issue accurately. Please provide:\n1. **The exact error message or stack trace**\n2. **The relevant code snippet or active file**\n3. **What you were trying to accomplish (expected vs. actual output)**"
        };
    }

    if (!hasAnyCode && !hasAnyError && text.split(' ').length < 10) {
        return {
            sufficient: false,
            missing: ["details"],
            message: "To help you debug, could you share the error message, failing test output, or the code snippet you're working on?"
        };
    }

    return {
        sufficient: true
    };
}

/**
 * Build Debugging System Prompt
 */
function buildDebuggingSystemPrompt(context = {}) {
    const project = context?.project || {};
    const language = project.language || context?.language || "programming language";
    const projectTitle = project.projectTitle || "Software System";
    const milestoneTitle = project.milestoneTitle || "Current Implementation";

    return `You are the Lead Systems Debugger and Staff Engineer for SkillForge.
You are assisting a developer building "${projectTitle}" (${language}) at milestone "${milestoneTitle}".

SYSTEM DEBUGGING CONTRACT:
1. REASON STEP-BY-STEP:
   - Identify the exact line or logic branch where the failure occurs.
   - Explain the root cause: *why* the bug happens in terms of memory, types, concurrency, protocol specs, or data structure invariants.
2. PROVIDE THE FIX:
   - Provide clean, idiomatic, and syntactically correct ${language} code.
   - Show only the necessary changes or complete replacement function—do not write placeholder code like "// implement this later".
3. VERIFICATION:
   - Explain step-by-step how to verify the fix (e.g. which test command or assertion to run).
4. HONESTY & RIGOR:
   - Never invent functions, libraries, APIs, or compiler flags that do not exist in ${language}.
   - If an edge case is unclear from the available code, say so honestly and state what assumption you are making.
5. CONCISENESS & CLARITY:
   - Present your final answer cleanly formatted in GitHub-flavored Markdown.
   - Keep explanations razor-sharp and developer-focused.`;
}

/**
 * Handles debugging requests
 */
async function handleDebuggingRequest({
    userMessage,
    messages = [],
    context = {}
}) {
    // 1. Automatic context assessment: if essential context is missing, ask for it!
    const assessment = assessDebuggingContext(userMessage, context);
    if (!assessment.sufficient) {
        return {
            reply: assessment.message,
            suggestions: [
                "Here is the error message...",
                "Here is my active code...",
                "How do I run tests in the workspace?"
            ],
            needsContext: true,
            modelUsed: "context-guard"
        };
    }

    // 2. Compile full context payload
    const project = context?.project || {};
    const language = project.language || context?.language || "code";
    const activeFileName = project.activeFileName || "source file";
    const activeCode = project.activeCode || "";
    const testResults = context?.testResults || project.testResults || null;
    const errorDetails = context?.error || null;
    const specRules = project.specRules || [];

    let contextSupplement = `\n--- DEBUGGING CONTEXT ---
Target Project: ${project.projectTitle || 'System Project'}
Language / Runtime: ${language}
Active File: ${activeFileName}
`;

    if (activeCode) {
        contextSupplement += `\nSource Code:\n\`\`\`${language}\n${activeCode.slice(0, 4000)}\n\`\`\`\n`;
    }

    if (errorDetails) {
        contextSupplement += `\nRuntime / Compiler Error:\n\`\`\`\n${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails, null, 2)}\n\`\`\`\n`;
    }

    if (testResults) {
        contextSupplement += `\nTest Runner Diagnostics:\n`;
        if (testResults.failedAssertion) {
            contextSupplement += `Failed Assertion: ${testResults.failedAssertion}\n`;
        }
        if (testResults.output) {
            contextSupplement += `Runner Output:\n\`\`\`\n${testResults.output.slice(0, 2000)}\n\`\`\`\n`;
        }
    }

    if (Array.isArray(specRules) && specRules.length > 0) {
        contextSupplement += `\nMilestone Invariant Rules:\n${specRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`;
    }

    const systemPrompt = buildDebuggingSystemPrompt(context);

    try {
        const result = await callChatCompletion({
            handler: "debugging",
            route: "debugging",
            systemPrompt,
            messages: [
                ...messages,
                { role: "user", content: `${contextSupplement}\n\nDeveloper Inquiry / Issue:\n${userMessage}` }
            ]
        });

        // Strip any thinking tags so user sees only the clean final answer
        const cleanAnswer = stripThinkingTags(result.content);

        return {
            reply: cleanAnswer,
            suggestions: [
                "How do I prevent this bug in the future?",
                "What edge cases should I add unit tests for?",
                "Can you explain the concurrency/memory impact of this fix?"
            ],
            modelUsed: result.modelUsed,
            latencyMs: result.latencyMs,
            needsContext: false
        };

    } catch (err) {
        console.error("[DEBUG-HANDLER] Error in debugging LLM call:", err);
        return {
            reply: `I encountered an issue reaching the debugging reasoning engine (${err.message}). Please check that your network connection is active and try resubmitting your error log.`,
            suggestions: ["Retry debugging request", "Show error log"],
            needsContext: false,
            error: true
        };
    }
}

module.exports = {
    handleDebuggingRequest,
    assessDebuggingContext,
    buildDebuggingSystemPrompt
};
