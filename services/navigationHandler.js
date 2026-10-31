/**
 * Navigation Handler
 * Dispatches structured navigation actions strictly validated against routeRegistry.
 */

const { ROUTE_REGISTRY, validateTarget } = require('../config/routeRegistry');
const { callChatCompletion } = require('./aiClient');

/**
 * Build system prompt with all verified pages
 */
function buildNavigationSystemPrompt() {
    const screens = Object.values(ROUTE_REGISTRY).map(r => {
        const paramsDesc = r.parameters.length > 0 ? ` [Requires: ${r.parameters.join(', ')}]` : '';
        return `- ID: "${r.id}" | Path: "${r.path}" | Title: "${r.title}" | Purpose: ${r.description}${paramsDesc}`;
    }).join('\n');

    return `You are the Navigation Dispatcher for SkillForge.
Your ONLY job is to help users navigate to real screens and features inside the SkillForge application.

OFFICIAL VERIFIED APPLICATION REGISTRY:
${screens}

CRITICAL RULES:
1. You may ONLY reference screens that exist in the registry above. NEVER invent, hallucinate, or guess routes or pages.
2. If the user wants to navigate to a screen and you know the target ID:
   Return JSON:
   {
     "action": "navigate",
     "target": "<route_id_from_registry>",
     "params": { ...required_params_if_any },
     "reply": "Short, friendly confirmation (1-2 sentences max).",
     "suggestions": ["Follow-up suggestion 1", "Follow-up suggestion 2"]
   }
3. If the user's destination is AMBIGUOUS (e.g. "take me to my course" when they could mean enrolled view, catalog, or studio) OR the requested page DOES NOT EXIST in the registry:
   Return JSON:
   {
     "action": "clarify",
     "target": null,
     "params": {},
     "reply": "Politely ask a clarifying question. List only the relevant real pages from the registry that they might want.",
     "suggestions": ["Option A title", "Option B title"]
   }
4. Keep answers short, crisp, and direct.
5. You must return ONLY raw valid JSON. Do not include markdown formatting or backticks.`;
}

/**
 * Handles navigation requests
 */
async function handleNavigationRequest({
    userMessage,
    messages = [],
    context = {}
}) {
    const systemPrompt = buildNavigationSystemPrompt();

    let llmResult;
    try {
        llmResult = await callChatCompletion({
            handler: "navigation",
            route: "navigation",
            systemPrompt,
            messages: [
                ...messages,
                { role: "user", content: userMessage }
            ]
        });
    } catch (err) {
        console.error("[NAV-HANDLER] LLM call failed:", err);
        return {
            action: "clarify",
            target: null,
            reply: "I couldn't process your navigation request right now. Where in SkillForge would you like to go (e.g. Courses, Projects, Dashboard, or Profile)?",
            suggestions: ["Go to Courses", "Open Projects Gallery", "View Learner Dashboard"],
            valid: false
        };
    }

    let parsed = null;
    try {
        const rawContent = llmResult.content.trim();
        // Handle possible code block wrap
        const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
    } catch (parseErr) {
        console.warn("[NAV-HANDLER] JSON parse error on response:", llmResult.content);
        return {
            action: "clarify",
            target: null,
            reply: "Could you clarify which page you'd like to visit? You can say: Courses, Projects, Dashboard, or Profile.",
            suggestions: ["Courses", "Projects", "Dashboard", "Profile"],
            valid: false
        };
    }

    // Step 3 Validation: Validate the model's output against the registry
    if (parsed.action === "navigate" && parsed.target) {
        // Inherit context params if model didn't provide but context has it
        const params = {
            ...(context?.project?.projectId ? { projectId: context.project.projectId } : {}),
            ...(context?.course?.courseId ? { courseId: context.course.courseId } : {}),
            ...(parsed.params || {})
        };

        const validation = validateTarget(parsed.target, params);

        if (validation.valid) {
            return {
                action: "navigate",
                target: parsed.target,
                path: validation.path,
                title: validation.route.title,
                reply: parsed.reply || `Navigating to ${validation.route.title}...`,
                suggestions: parsed.suggestions || [],
                valid: true,
                modelUsed: llmResult.modelUsed
            };
        } else {
            // Target does not exist or missing parameters: NEVER NAVIGATE. Ask a clarifying question instead.
            console.warn(`[NAV-HANDLER] Invalid navigation target blocked: "${parsed.target}". Reason: ${validation.error}`);
            
            // Build helpful suggestions from real registry
            const sampleRoutes = ["courses", "projects", "dashboard", "profile"];
            return {
                action: "clarify",
                target: null,
                reply: validation.missingParams
                    ? `To open ${validation.route.title}, I need to know which one. Could you specify the ${validation.missingParams.join(' or ')}?`
                    : `SkillForge doesn't have a "${parsed.target}" page. Did you mean one of these?`,
                suggestions: sampleRoutes.map(k => ROUTE_REGISTRY[k]?.title || k),
                valid: false,
                validationError: validation.error,
                modelUsed: llmResult.modelUsed
            };
        }
    }

    // Explicit clarify action from model
    return {
        action: "clarify",
        target: null,
        reply: parsed.reply || "Could you clarify where you would like to go in SkillForge?",
        suggestions: parsed.suggestions || ["Courses", "Projects", "Dashboard"],
        valid: true,
        modelUsed: llmResult.modelUsed
    };
}

module.exports = {
    handleNavigationRequest,
    buildNavigationSystemPrompt
};
