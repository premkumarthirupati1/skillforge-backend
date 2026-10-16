const Course = require('../models/course');

/**
 * Forge Copilot Unified Backend Service
 * Supports:
 * - Mode A: Global Assistant (Course discovery, learning paths, general CS/coding)
 * - Mode B: Learning Assistant (Lesson comprehension, socratic guidance, revision)
 * - Mode C: Coding & Project Assistant (Architecture, debugging, code review)
 */

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
 * Match courses relevant to the conversation
 */
function findRelevantCourses(userText, catalog) {
    if (!catalog || catalog.length === 0) return [];
    const text = (userText || "").toLowerCase();
    
    // Check if user is asking for recommendations, courses, or learning path
    const isRecommendationQuery = /(course|learn|recommend|study|curriculum|track|path|start|begin|guide|fullstack|frontend|backend|system design|kubernetes|cloud|devops|security|cyber|ai|python|react|node|nextjs)/i.test(text);
    if (!isRecommendationQuery) return [];

    return catalog.filter(c => {
        const titleMatch = c.title && text.includes(c.title.toLowerCase());
        const tagMatch = Array.isArray(c.tags) && c.tags.some(t => text.includes(t.toLowerCase()));
        const descMatch = c.description && c.description.toLowerCase().split(' ').some(w => w.length > 4 && text.includes(w));
        return titleMatch || tagMatch || descMatch;
    }).slice(0, 3);
}

/**
 * Fallback response generator if OpenRouter / LLM is unreachable
 */
function generateFallbackResponse({ mode, userMessage, context, catalog }) {
    const text = (userMessage || "").toLowerCase();

    if (mode === "learning") {
        const lessonTitle = context?.lesson?.title || "this lesson";
        return {
            reply: `You're currently exploring **${lessonTitle}**.\n\nHere are three key ways to approach this concept:\n1. **Core Principle**: Break the objective into the smallest working component first.\n2. **Mental Model**: Verify what inputs are expected and inspect what your code actually produces.\n3. **Guided Question**: What step in this lesson feels unclear or is giving unexpected output?\n\nTell me where you feel stuck and I'll walk you through step-by-step!`,
            suggestions: [
                "Summarize the key takeaways of this lesson",
                "Give me a conceptual hint on this topic",
                "What's a practical real-world example?"
            ],
            recommendedCourses: []
        };
    }

    if (mode === "coding") {
        return {
            reply: `I've analyzed your project context. When debugging or planning your implementation:\n\n- **Check Preconditions**: Ensure data structures and types match the expected specification.\n- **Isolate Assertions**: Run tests individually to isolate the first failing invariant.\n- **Error Boundary**: Add defensive assertions before returning state.\n\nFeel free to paste the exact error log or describe what behavior you observe versus what is expected!`,
            suggestions: [
                "How do I structure my milestone logic?",
                "What invariant is failing here?",
                "Review my code for edge cases"
            ],
            recommendedCourses: []
        };
    }

    // Global Mode Fallback
    const matched = findRelevantCourses(userMessage, catalog);
    const coursesToReturn = matched.length > 0 ? matched : catalog.slice(0, 3);

    return {
        reply: `Welcome to **SkillForge**! I'm **Forge Copilot**, your companion for learning, coding, and building.\n\nSkillForge is an engineering-first platform where you learn by implementing real-world production systems (like Redis, Raft, Local RAG, and microservices) with automated milestone tests in our interactive IDE.\n\nHere are some of our top hands-on courses you can dive into right away:`,
        suggestions: [
            "Which course should I start with as a beginner?",
            "How do SkillForge hands-on projects work?",
            "Tell me about Fullstack Next.js and System Design tracks"
        ],
        recommendedCourses: coursesToReturn
    };
}

/**
 * Main Copilot Chat Handler
 */
async function chatWithCopilot({
    mode = "global",
    messages = [],
    context = {},
    isAgent = false
}) {
    const catalog = await getPublishedCourseCatalog();
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";

    // 1. Build contextual system prompt
    let systemPrompt = `You are "Forge Copilot", the official intelligent coding and learning assistant integrated into SkillForge.
SkillForge Tagline: "Your companion for learning, coding, and building."

BRANDING & IDENTITY:
- Your name is strictly "Forge Copilot" (never "Forge AI" or generic "assistant").
- SkillForge is an elite hands-on engineering platform where learners master software development by building real production systems with automated test suites, interactive Monaco IDE, and guided curriculum.
- Maintain a polished, professional developer-tool experience: clear hierarchy, encouraging tone, high technical accuracy, concise explanations, and actionable guidance.
- When generating code, use clean markdown code blocks with explicit language tags (e.g. \`\`\`javascript, \`\`\`typescript, \`\`\`python, \`\`\`rust, \`\`\`go, \`\`\`bash).
${isAgent ? `
AGENT AUTONOMOUS MODE ACTIVE:
- Operate with deep technical rigor as an autonomous staff engineer / system architect.
- Provide a systematic diagnostic trace: Root Cause -> Invariant Analysis -> Step-by-Step Remediation -> Edge Case Verification.
- When inspecting code or test failures, pinpoint the exact logical flaws and provide production-grade, test-passing solutions.
` : ''}
`;

    if (mode === "global") {
        systemPrompt += `
OPERATING MODE: GLOBAL ASSISTANT (Mode A)
You are accessible across SkillForge's public and authenticated pages (Showcase, Dashboard, Homepage, Tracks).
Responsibilities:
1. Explain SkillForge platform features (interactive workspace, automated test runner, milestone progression, certificates).
2. Recommend relevant courses based on user goals, background, or interests.
3. Help users choose what to learn and structure their learning paths.
4. Answer general programming, system design, algorithm, and software engineering questions with clean, idiomatic code examples.

REAL VERIFIED COURSES AVAILABLE ON SKILLFORGE:
${catalog.map(c => `- ID: "${c._id}" | Title: "${c.title}" | Difficulty: "${c.difficulty}" | Price: ${c.price === 0 ? "Free" : `$${c.price}`} | Tags: [${(c.tags || []).join(', ')}] | Description: ${c.description?.slice(0, 140)}...`).join('\n')}

COURSE RECOMMENDATION RULES:
- When the user asks for course recommendations, learning paths, or what to learn, ONLY recommend courses from the real catalog above.
- Mention them naturally by exact title. Format links as [Course Title](/course/:id).
- NEVER invent or hallucinate course titles that do not exist in the catalog.
`;
    } else if (mode === "learning") {
        const lesson = context.lesson || {};
        systemPrompt += `
OPERATING MODE: LEARNING ASSISTANT (Mode B)
You are active inside the Lesson Viewer (${context.route || "/lesson"}).
CURRENT LESSON CONTEXT:
- Course: "${lesson.courseTitle || 'Current Course'}"
- Module: "${lesson.moduleTitle || 'Current Module'}"
- Lesson Title: "${lesson.title || 'Interactive Lesson'}"
- Description: "${lesson.description || 'Lesson materials and concepts'}"
${lesson.content ? `- Key Content / Notes: "${lesson.content.slice(0, 1000)}..."` : ''}

PEDAGOGICAL CONTRACT:
1. Explain lesson concepts clearly using intuitive mental models, diagrams (in text/mermaid), or concise code examples.
2. Provide socratic, progressive hints: do NOT simply give away answers to challenges; encourage the learner with guided reasoning.
3. Ground your explanations directly in the current lesson context unless the user asks an unrelated general question.
4. Keep responses focused, encouraging, and easy to read during study sessions.
`;
    } else if (mode === "coding") {
        const project = context.project || {};
        systemPrompt += `
OPERATING MODE: CODING & PROJECT ASSISTANT (Mode C)
You are active inside the Project Code Studio & Workspace.
PROJECT CONTEXT:
- Project: "${project.projectTitle || 'Systems Project'}" (${project.language || 'Code'})
- Milestone: "${project.milestoneTitle || 'Current Milestone'}"
- Active File: "${project.activeFileName || 'Source'}"
${project.activeCode ? `- Code snippet:\n\`\`\`${project.language || ''}\n${project.activeCode.slice(0, 1500)}\n\`\`\`` : ''}

RESPONSIBILITIES:
1. Diagnose compiler, syntax, and logic errors.
2. Explain test failures and architectural invariants.
3. Suggest clean, idiomatic refactoring patterns without rewriting their entire project.
4. Provide graduated hints (Conceptual -> Bug Pinpoint -> Code Pattern) to empower the developer.
`;
    }

    // 2. Prepare conversation history for LLM (limit to last 8 messages for speed and focus)
    const recentMessages = messages.slice(-8).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content || ""
    }));

    // Check OpenRouter API
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        try {
            const openRouterModel = process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-coder-32b-instruct";
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://skillforge.dev",
                    "X-Title": "SkillForge Copilot"
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...recentMessages
                    ],
                    temperature: 0.3,
                    max_tokens: 1400
                })
            });

            if (response.ok) {
                const data = await response.json();
                const replyText = data?.choices?.[0]?.message?.content;
                if (replyText) {
                    const matchedCourses = findRelevantCourses(lastUserMessage + " " + replyText, catalog);
                    
                    // Generate smart follow-up suggestions based on mode
                    let suggestions = [
                        "Can you provide a code example?",
                        "What is the best way to practice this?",
                        "Explain this concept with an analogy"
                    ];
                    if (mode === "global") {
                        suggestions = [
                            "Which course should I take first?",
                            "How do interactive project milestones work?",
                            "What is the recommended path for Fullstack?"
                        ];
                    } else if (mode === "learning") {
                        suggestions = [
                            "Summarize key concepts from this lesson",
                            "Can you test my understanding with a quick question?",
                            "Give me a hint for the exercise"
                        ];
                    } else if (mode === "coding") {
                        suggestions = [
                            "Why is my assertion failing?",
                            "Review my architecture for this milestone",
                            "What edge cases should I test?"
                        ];
                    }

                    return {
                        reply: replyText,
                        suggestions,
                        recommendedCourses: matchedCourses
                    };
                }
            } else {
                console.warn(`OpenRouter Copilot API error (${response.status}):`, await response.text());
            }
        } catch (err) {
            console.warn("OpenRouter Copilot request failed:", err.message);
        }
    }

    // 3. Fallback to expert heuristics if API fails or is not configured
    return generateFallbackResponse({
        mode,
        userMessage: lastUserMessage,
        context,
        catalog
    });
}

module.exports = {
    chatWithCopilot,
    getPublishedCourseCatalog
};
