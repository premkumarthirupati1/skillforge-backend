/**
 * Request Router Service
 * Classifies every user message as 'navigation', 'debugging', 'learning', or 'general'.
 * Combines ultra-fast heuristic pattern matching with LLM classification for edge cases.
 */

const { callChatCompletion } = require('./aiClient');

/**
 * Heuristic classifier for rapid pattern matching
 */
function classifyWithHeuristics(userMessage = "", context = {}) {
    const text = userMessage.toLowerCase().trim();

    // 1. Clear Navigation heuristics
    const navRegex = /^(take me to|navigate to|go to|open|show me the|redirect to|bring me to|switch to|where can i find|where can i browse|where can i explore|where can i see|where is the|where are the|where can i|view my|view the|browse all|explore all|show all|view all)\b/i;
    const navKeywords = ["profile", "dashboard", "courses", "catalog", "tracks", "skills", "projects", "challenges", "community", "settings", "login", "signup", "studio", "instructor"];
    
    const hasNavIntent = navRegex.test(text);
    const mentionsNavTarget = navKeywords.some(k => text.includes(k));

    if (hasNavIntent || (text.split(' ').length <= 7 && mentionsNavTarget && !text.includes("error") && !text.includes("bug"))) {
        return {
            category: "navigation",
            confidence: 0.95,
            reasoning: "Matched navigation action intent / destination keywords"
        };
    }

    // 2. Clear Debugging heuristics
    const debugKeywords = [
        "error", "exception", "failed", "failing", "stack trace", "traceback",
        "undefined is not a function", "cannot read property", "segmentation fault",
        "borrow checker", "lifetime", "panic", "assertion", "segfault", "compile error",
        "compiler error", "syntax error", "typeerror", "referenceerror", "bug in my code",
        "why does this fail", "fix my code", "fix this error", "line ", "test failure"
    ];
    const hasCodeBlock = /```[\s\S]*?```/.test(userMessage) || /\{[\s\S]*;[\s\S]*\}/.test(userMessage);
    const hasDebugKeyword = debugKeywords.some(k => text.includes(k));
    const hasErrorContext = Boolean(context?.testResults?.failedAssertion || context?.error);

    if (hasErrorContext || (hasDebugKeyword && (hasCodeBlock || text.includes("why") || text.includes("fix") || text.includes("test")))) {
        return {
            category: "debugging",
            confidence: 0.95,
            reasoning: "Detected stack trace, error logs, compiler failure, or failing test assertion"
        };
    }

    // 3. Clear Learning heuristics
    const isInsideLesson = Boolean(context?.lesson?.title || context?.route?.includes("/lesson/"));
    const learningKeywords = [
        "explain", "what does this mean", "how does this work", "concept", "analogy",
        "lesson", "takeaway", "quiz", "summary", "understand", "difference between",
        "what is", "why is it called", "curriculum"
    ];
    const hasLearningKeyword = learningKeywords.some(k => text.includes(k));

    if (isInsideLesson && hasLearningKeyword && !hasDebugKeyword) {
        return {
            category: "learning",
            confidence: 0.9,
            reasoning: "User is active in a lesson asking conceptual/learning questions"
        };
    }

    return null; // Defer to fast LLM classifier
}

/**
 * Classifies message using fast LLM call
 */
async function classifyMessage(userMessage, context = {}) {
    // 1. Try fast heuristics first (<1ms)
    const heuristic = classifyWithHeuristics(userMessage, context);
    if (heuristic) {
        return heuristic;
    }

    // 2. Fast LLM Classification Call
    const systemPrompt = `You are the Request Classifier for SkillForge.
Classify the user's message into exactly ONE of these four categories:
1. "navigation": User wants to find, visit, open, or move to a page/feature in the app (e.g. "go to courses", "where is my profile", "open dashboard").
2. "debugging": User is fixing a bug, dealing with code compiler/runtime errors, test failures, or asking why their code is broken.
3. "learning": User is studying a concept, asking about course lessons, concepts, theories, mental models, or explanations.
4. "general": General chat, greetings, platform FAQs, or ambiguous intent.

Output ONLY a JSON object:
{"category": "navigation" | "debugging" | "learning" | "general", "reasoning": "brief 1-sentence reason"}`;

    try {
        const result = await callChatCompletion({
            handler: "router",
            route: "classification",
            systemPrompt,
            messages: [{ role: "user", content: `Context: ActiveRoute=${context.route || 'unknown'}\nMessage: "${userMessage}"` }],
            overrideConfig: {
                max_tokens: 300,
                temperature: 0.0
            }
        });

        const raw = result.content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(raw);
        const validCategories = ["navigation", "debugging", "learning", "general"];
        const category = validCategories.includes(parsed.category) ? parsed.category : "general";

        return {
            category,
            confidence: 0.85,
            reasoning: parsed.reasoning || "Classified by router model",
            modelUsed: result.modelUsed
        };
    } catch (err) {
        console.warn("[ROUTER] LLM classification error, falling back to 'general':", err.message);
        return {
            category: "general",
            confidence: 0.5,
            reasoning: "Fallback due to classification failure"
        };
    }
}

module.exports = {
    classifyMessage,
    classifyWithHeuristics
};
