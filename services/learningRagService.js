/**
 * Learning RAG Service
 * Implements chunking, semantic retrieval, and Socratic pedagogical responses
 * over MongoDB Course, Module, and Lesson content.
 */

const Course = require('../models/course');
const Module = require('../models/module');
const Lesson = require('../models/lesson');
const { callChatCompletion } = require('./aiClient');

/**
 * Splits lesson content into semantic chunks (by markdown sections or paragraphs)
 */
function chunkLessonContent(lesson, moduleTitle = "", courseTitle = "") {
    const content = lesson.content || "";
    if (!content.trim()) return [];

    // Split by markdown headers or double newlines
    const rawSections = content.split(/(?=\n#{1,3}\s)/g);
    const chunks = [];

    rawSections.forEach((sec, idx) => {
        const trimmed = sec.trim();
        if (trimmed.length > 30) {
            // Further subdivide if a section is huge (>1200 chars)
            if (trimmed.length > 1200) {
                const subParagraphs = trimmed.split(/\n\s*\n/);
                let currentChunk = "";
                subParagraphs.forEach(p => {
                    if ((currentChunk + "\n" + p).length > 800) {
                        if (currentChunk) {
                            chunks.push({
                                lessonId: lesson._id.toString(),
                                lessonTitle: lesson.title,
                                moduleTitle,
                                courseTitle,
                                text: currentChunk.trim()
                            });
                        }
                        currentChunk = p;
                    } else {
                        currentChunk += (currentChunk ? "\n\n" : "") + p;
                    }
                });
                if (currentChunk.trim()) {
                    chunks.push({
                        lessonId: lesson._id.toString(),
                        lessonTitle: lesson.title,
                        moduleTitle,
                        courseTitle,
                        text: currentChunk.trim()
                    });
                }
            } else {
                chunks.push({
                    lessonId: lesson._id.toString(),
                    lessonTitle: lesson.title,
                    moduleTitle,
                    courseTitle,
                    text: trimmed
                });
            }
        }
    });

    return chunks;
}

/**
 * Tokenize text into normalized terms
 */
function tokenize(text = "") {
    return text.toLowerCase()
        .replace(/[^a-z0-9_\-\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);
}

/**
 * Score relevance between query and chunk text
 */
function scoreChunkRelevance(query, chunk) {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return 0;

    const chunkTerms = tokenize(chunk.text + " " + chunk.lessonTitle);
    const titleTerms = tokenize(chunk.lessonTitle);

    let matchCount = 0;
    let titleBoost = 0;

    queryTerms.forEach(term => {
        const occurrences = chunkTerms.filter(t => t === term || t.includes(term)).length;
        if (occurrences > 0) {
            matchCount += Math.min(occurrences, 4);
        }
        if (titleTerms.some(t => t === term || t.includes(term))) {
            titleBoost += 3;
        }
    });

    const score = (matchCount + titleBoost) / (queryTerms.length + 1);
    return score;
}

/**
 * Retrieve relevant lesson chunks scoped to current course/lesson
 */
async function retrieveCourseChunks({ query, courseId, lessonId, moduleId, limit = 4 }) {
    try {
        let lessonQuery = { isDeleted: false };

        if (lessonId) {
            lessonQuery._id = lessonId;
        } else if (moduleId) {
            lessonQuery.moduleId = moduleId;
        } else if (courseId) {
            const modules = await Module.find({ courseId, isDeleted: false }).select('_id').lean();
            const moduleIds = modules.map(m => m._id);
            lessonQuery.moduleId = { $in: moduleIds };
        }

        const lessons = await Lesson.find(lessonQuery)
            .populate({
                path: 'moduleId',
                select: 'title courseId',
                populate: { path: 'courseId', select: 'title' }
            })
            .lean();

        if (!lessons || lessons.length === 0) {
            return [];
        }

        const allChunks = [];
        lessons.forEach(l => {
            const moduleTitle = l.moduleId?.title || "";
            const courseTitle = l.moduleId?.courseId?.title || "";
            const chunks = chunkLessonContent(l, moduleTitle, courseTitle);
            allChunks.push(...chunks);
        });

        // Score all chunks
        const scored = allChunks.map(chunk => ({
            ...chunk,
            score: scoreChunkRelevance(query, chunk)
        }));

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score);

        // Keep top chunks that meet minimum relevance threshold
        const relevant = scored.filter(c => c.score > 0.4).slice(0, limit);
        return relevant;

    } catch (err) {
        console.warn("[LEARNING-RAG] Retrieval error:", err.message);
        return [];
    }
}

/**
 * Build Learning System Prompt
 */
function buildLearningSystemPrompt(retrievedChunks = [], currentContext = {}) {
    const hasMaterial = retrievedChunks.length > 0;
    const lessonTitle = currentContext?.lesson?.title || "";
    const courseTitle = currentContext?.lesson?.courseTitle || currentContext?.course?.title || "";

    let materialSection = "";
    if (hasMaterial) {
        materialSection = `\nRETRIEVED COURSE CURRICULUM MATERIAL:\n` +
            retrievedChunks.map((c, i) => `--- [Chunk ${i + 1}] Lesson: "${c.lessonTitle}" | Module: "${c.moduleTitle}" | Course: "${c.courseTitle}" ---\n${c.text}\n`).join('\n');
    } else {
        materialSection = `\nNOTE: No relevant lessons in the enrolled curriculum matched this specific question.`;
    }

    return `You are the Socratic Learning Companion for SkillForge.
Active Course: "${courseTitle || 'Curriculum'}"
Active Lesson: "${lessonTitle || 'Interactive Lesson'}"
${materialSection}

PEDAGOGICAL CONTRACT & STRICT RULES:
1. GROUNDING IN COURSE MATERIAL:
   - When answering, ground your explanation strictly in the retrieved lesson material above.
   - ALWAYS cite which lesson the concept came from using the format: **[Lesson: "<Lesson Title>"]**.
2. TOPICS NOT COVERED:
   - If the retrieved material does not cover the user's question (or if no relevant chunks are present), state clearly and honestly:
     "This specific topic is not covered in your current course or lesson material."
   - Do NOT guess or make up curriculum facts. If helpful, you may briefly define the concept in one sentence, but clearly remind the student that it is outside this lesson's scope.
3. PEDAGOGY:
   - Explain step-by-step in clear, intuitive, and simple language.
   - Use concrete analogies and mental models.
   - Match the learner's level (start fundamental, build to advanced).
   - End your explanation with a short, friendly check-for-understanding question (e.g. "To check your understanding: how would you...?").
4. Keep the tone encouraging, inspiring, and concise.`;
}

/**
 * Main Learning Handler
 */
async function handleLearningRequest({
    userMessage,
    messages = [],
    context = {}
}) {
    const courseId = context?.course?.courseId || context?.lesson?.courseId || null;
    const lessonId = context?.lesson?.lessonId || null;
    const moduleId = context?.lesson?.moduleId || null;

    // 1. Retrieve relevant chunks scoped to current course/lesson
    const chunks = await retrieveCourseChunks({
        query: userMessage,
        courseId,
        lessonId,
        moduleId,
        limit: 4
    });

    // 2. Build grounded prompt
    const systemPrompt = buildLearningSystemPrompt(chunks, context);

    try {
        const result = await callChatCompletion({
            handler: "learning",
            route: "learning",
            systemPrompt,
            messages: [
                ...messages,
                { role: "user", content: userMessage }
            ],
            overrideConfig: {
                temperature: 0.35,
                max_tokens: 2500
            }
        });

        // Smart follow-up suggestions
        const citedLesson = chunks[0]?.lessonTitle;
        const suggestions = [
            citedLesson ? `Explain more about "${citedLesson}"` : "Summarize key concepts",
            "Can you give another analogy for this?",
            "What is a common pitfall with this concept?"
        ];

        return {
            reply: result.content,
            suggestions,
            retrievedChunksCount: chunks.length,
            citedLessons: [...new Set(chunks.map(c => c.lessonTitle))],
            modelUsed: result.modelUsed,
            latencyMs: result.latencyMs
        };

    } catch (err) {
        console.error("[LEARNING-RAG] LLM call error:", err);
        return {
            reply: `I encountered an issue retrieving the lesson explanation (${err.message}). Please try asking your question again.`,
            suggestions: ["Retry question", "Show lesson summary"],
            error: true
        };
    }
}

module.exports = {
    chunkLessonContent,
    scoreChunkRelevance,
    retrieveCourseChunks,
    buildLearningSystemPrompt,
    handleLearningRequest
};
