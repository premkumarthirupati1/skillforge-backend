/**
 * Forge Copilot Unified Orchestration Engine
 * Routes requests to dedicated handlers:
 * (A) NAVIGATION: Route-registry validated navigation with structured JSON dispatch.
 * (B) DEBUGGING: Deep reasoning engine with automatic context ingestion and missing-context guards.
 * (C) LEARNING: RAG over MongoDB lessons with strict citations and pedagogical Socratic guidance.
 * (D) GENERAL / ARCHITECTURE: High-level platform guidance and Staff-level architectural blueprints.
 */

const Course = require('../models/course');
const { classifyMessage } = require('./routerService');
const { handleNavigationRequest } = require('./navigationHandler');
const { handleDebuggingRequest } = require('./debuggingHandler');
const { handleLearningRequest } = require('./learningRagService');
const { callChatCompletion } = require('./aiClient');
const { isArchitectureQuery, generateMermaidImageUrl, TRACK_ARCHITECTURES } = require('./aiMentorService');

async function getPublishedCourseCatalog() {
    try {
        const courses = await Course.find({ isPublished: true, isDeleted: false })
            .select('_id title description difficulty price tags thumbnail averageRating')
            .lean();
        return courses || [];
    } catch (err) {
        console.warn("Failed to load course catalog for Copilot:", err.message);
        return [];
    }
}

/**
 * General Platform Handler (Fallback & Architecture Blueprints)
 */
async function handleGeneralRequest({
    userMessage,
    messages = [],
    context = {},
    catalog = [],
    isAgent = false
}) {
    const isArch = isArchitectureQuery(userMessage);

    // Architectural Blueprint Fast Path
    if (isArch) {
        const pid = (context?.project?.projectId || "redis-clone").toLowerCase();
        const trackKey = Object.keys(TRACK_ARCHITECTURES).find(k => pid.includes(k) || k.includes(pid)) || "redis-clone";
        const arch = TRACK_ARCHITECTURES[trackKey];
        if (arch) {
            const imgUrl = generateMermaidImageUrl(arch.mermaid);
            return {
                category: "debugging",
                reply: `### Staff Architecture Blueprint: ${arch.title}\n\n${arch.summary}\n\n### 📐 Visual Architecture Diagram\n![${arch.title} Architecture Diagram](${imgUrl})\n\n\`\`\`mermaid\n${arch.mermaid}\n\`\`\`\n\n${arch.blueprint}\n\n\`\`\`${context?.project?.language || 'rust'}\n${arch.codePattern}\n\`\`\``,
                suggestions: arch.quickPrompts,
                recommendedCourses: [],
                modelUsed: "staff-architecture-engine"
            };
        }
    }

    const systemPrompt = `You are "Forge Copilot", the official AI guide for SkillForge.
SkillForge is an engineering-first platform where developers build production systems (like Redis, Raft, Distributed KV, Local RAG, and microservices) with automated milestone tests.

VERIFIED COURSES AVAILABLE:
${catalog.map(c => `- ID: "${c._id}" | Title: "${c.title}" | Difficulty: "${c.difficulty}" | Tags: [${(c.tags || []).join(', ')}]`).join('\n')}

GUIDELINES:
1. Explain SkillForge platform features, tracks, projects, and learning pathways clearly.
2. Recommend relevant courses strictly from the verified list above. Format course links as [Course Title](/course/:id).
3. If the user asks a general software engineering or coding question, provide concise, idiomatic code examples.
4. Maintain a high-bar, developer-focused, encouraging tone.`;

    const result = await callChatCompletion({
        handler: "general",
        route: "general",
        systemPrompt,
        messages: [
            ...messages,
            { role: "user", content: userMessage }
        ],
        overrideConfig: {
            temperature: 0.3,
            max_tokens: 1800
        }
    });

    let replyText = result.content;
    // Mermaid diagram enrichment if generated inline
    if (replyText.includes("```mermaid") && !replyText.includes("mermaid.ink/svg/")) {
        const mermaidMatch = replyText.match(/```mermaid\s*([\s\S]*?)```/i);
        if (mermaidMatch) {
            const imgUrl = generateMermaidImageUrl(mermaidMatch[1]);
            if (imgUrl) {
                replyText = replyText.replace(/```mermaid/, `### 📐 Visual Architecture Diagram\n![System Architecture Diagram](${imgUrl})\n\n\`\`\`mermaid`);
            }
        }
    }

    return {
        category: "general",
        reply: replyText,
        suggestions: [
            "Which course should I take first?",
            "How do interactive project milestones work?",
            "What is the recommended path for Systems Engineering?"
        ],
        recommendedCourses: catalog.slice(0, 3),
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs
    };
}

/**
 * Main Copilot Chat Handler with Intent Routing
 */
async function chatWithCopilot({
    mode = "global",
    messages = [],
    context = {},
    isAgent = false
}) {
    const catalog = await getPublishedCourseCatalog();
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";

    if (!lastUserMessage.trim()) {
        return {
            category: "general",
            reply: "Hello! I'm Forge Copilot. How can I help you navigate, debug code, or study courses today?",
            suggestions: ["Explore Courses", "Open Systems Projects", "Go to Dashboard"]
        };
    }

    // Step 2: Request Router Classification
    const classification = await classifyMessage(lastUserMessage, { ...context, mode });
    const category = classification.category || "general";
    console.log(`[COPILOT] Query: "${lastUserMessage.slice(0, 50)}..." -> Routed to: [${category.toUpperCase()}] (${classification.reasoning})`);

    let response;

    switch (category) {
        case "navigation":
            response = await handleNavigationRequest({
                userMessage: lastUserMessage,
                messages,
                context
            });
            break;

        case "debugging":
            response = await handleDebuggingRequest({
                userMessage: lastUserMessage,
                messages,
                context: {
                    ...context,
                    isAgent
                }
            });
            break;

        case "learning":
            response = await handleLearningRequest({
                userMessage: lastUserMessage,
                messages,
                context
            });
            break;

        case "general":
        default:
            response = await handleGeneralRequest({
                userMessage: lastUserMessage,
                messages,
                context,
                catalog,
                isAgent
            });
            break;
    }

    return {
        category,
        action: response.action || null,
        target: response.target || null,
        path: response.path || null,
        reply: response.reply,
        suggestions: response.suggestions || [],
        recommendedCourses: response.recommendedCourses || [],
        citedLessons: response.citedLessons || [],
        needsContext: Boolean(response.needsContext),
        modelUsed: response.modelUsed,
        latencyMs: response.latencyMs
    };
}

module.exports = {
    chatWithCopilot,
    getPublishedCourseCatalog
};
