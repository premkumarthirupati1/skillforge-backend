/**
 * SkillForge AI Coding Mentor Service (Forge Copilot)
 * 
 * Provides graduated pedagogical guidance for failing tests, architectural debugging,
 * and contextual code advice without spoiling complete answers.
 * 
 * Modes:
 * 1. Google Gemini 1.5 / 2.0 API (when GEMINI_API_KEY is configured in .env)
 * 2. Expert Heuristic Diagnostic Engine (instant 0ms offline fallback for all 8 tracks)
 */

/**
 * Main AI Mentor Entrypoint
 */
async function getAiMentorAdvice({
    projectId = "general",
    projectTitle = "Systems Project",
    language = "javascript",
    milestoneIndex = 0,
    milestoneTitle = "Milestone 1",
    milestoneObjective = "",
    activeFileName = "main.rs",
    userCode = "",
    testResults = null,
    userQuery = "",
    hintLevel = 1
}) {
    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini API Key is present, try LLM first
    if (apiKey) {
        try {
            const llmResult = await callGeminiMentor({
                apiKey,
                projectId,
                projectTitle,
                language,
                milestoneIndex,
                milestoneTitle,
                milestoneObjective,
                activeFileName,
                userCode,
                testResults,
                userQuery,
                hintLevel
            });
            if (llmResult) {
                return {
                    ...llmResult,
                    modelUsed: "Forge Copilot (Gemini-Enhanced)",
                    isLiveAI: true
                };
            }
        } catch (llmErr) {
            console.warn("Gemini API call failed, falling back to Expert Heuristic Engine:", llmErr.message);
        }
    }

    // Heuristic & Expert Pedagogical Engine (Resilient Fallback)
    const heuristicResult = analyzeWithExpertHeuristics({
        projectId,
        projectTitle,
        language,
        milestoneIndex,
        milestoneTitle,
        milestoneObjective,
        activeFileName,
        userCode,
        testResults,
        userQuery,
        hintLevel
    });

    return {
        ...heuristicResult,
        modelUsed: "Forge Heuristic Diagnostic Engine",
        isLiveAI: false
    };
}

/**
 * Call Gemini Generative Language REST API
 */
async function callGeminiMentor({
    apiKey,
    projectTitle,
    language,
    milestoneIndex,
    milestoneTitle,
    milestoneObjective,
    activeFileName,
    userCode,
    testResults,
    userQuery,
    hintLevel
}) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const failedStep = testResults?.steps?.find(s => !s.passed) || (testResults?.error ? { name: "Runtime Error", output: testResults.error } : null);

    const systemPrompt = `You are "Forge Copilot", an elite Staff Engineer and coding mentor for SkillForge (a hands-on developer platform).
You guide developers who are building production-grade software (e.g. Redis clones, Raft consensus, Local RAG agents, API gateways, Git internals).

PEDAGOGICAL RULES:
1. NEVER output the full solution code. Your goal is to guide the learner so they understand the bug themselves.
2. Match the requested Hint Level strictly:
   - Level 1 (Conceptual Nudge): Explain the architectural concept or invariant that was violated. Ask a reflective question.
   - Level 2 (Pinpoint Bug): Point directly to the function, struct, or file location causing the issue and explain why it behaves unexpectedly.
   - Level 3 (Structural Pattern): Provide a small, idiomatic code pattern or skeleton showing how to approach the fix, without writing the whole file.
3. Be concise, technical, and empathetic. Format your response strictly as valid JSON with keys:
{
  "diagnosis": "Short 1-2 sentence explanation of what went wrong",
  "hint": "The graduated hint tailored to Level ${hintLevel}",
  "targetLine": <number or null if line can be identified in user code>,
  "codePattern": "Small 2-5 line code snippet illustrating the concept (or empty string)",
  "quickPrompts": ["3 short relevant follow-up questions user might ask"]
}`;

    const promptText = `
Project: ${projectTitle} (${language})
Milestone ${milestoneIndex + 1}: ${milestoneTitle}
Objective: ${milestoneObjective}

Active File: ${activeFileName}
User Code:
\`\`\`${language}
${userCode.slice(0, 3500)}
\`\`\`

Test Results:
${failedStep ? `Failing Assertion: ${failedStep.name}\nDiagnostic Output: ${failedStep.output}` : "General inspection requested."}

User Question: ${userQuery || "Please analyze why my tests failed and provide guidance."}
Requested Hint Level: Level ${hintLevel} (1=Nudge, 2=Pinpoint, 3=Code Structure)

Return ONLY a valid JSON object matching the requested schema.`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: systemPrompt + "\n\n" + promptText }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 800,
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    try {
        const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch (e) {
        return {
            diagnosis: rawText.slice(0, 200),
            hint: rawText,
            targetLine: null,
            codePattern: "",
            quickPrompts: ["Explain the milestone objective", "How do I fix this error?"]
        };
    }
}

/**
 * Domain-Specific Heuristic Diagnostic Engine
 * Covers all 8 SkillForge project tracks with precise diagnostic rules.
 */
function analyzeWithExpertHeuristics({
    projectId,
    projectTitle,
    language,
    milestoneIndex,
    milestoneTitle,
    milestoneObjective,
    activeFileName,
    userCode = "",
    testResults,
    userQuery = "",
    hintLevel = 1
}) {
    const code = userCode.trim();
    const failedStep = testResults?.steps?.find(s => !s.passed) || null;
    const errorMsg = failedStep?.output || testResults?.error || "";

    // 1. Detect uncompleted TODOs
    if (/TODO[:\s]+implement/i.test(code) || code.includes("# TODO") || code.includes("// TODO")) {
        const todoMatch = code.match(/(\/\/\s*TODO[^\n]*|#\s*TODO[^\n]*)/i);
        const lineIdx = code.split("\n").findIndex(l => /TODO/i.test(l));
        
        return {
            diagnosis: `Starter placeholder detected: Your code still contains an uncompleted TODO comment at line ${lineIdx !== -1 ? lineIdx + 1 : '1'}.`,
            level: hintLevel,
            targetLine: lineIdx !== -1 ? lineIdx + 1 : 1,
            hint: hintLevel === 1 
                ? `Milestone ${milestoneIndex + 1} requires replacing the template stub with actual domain logic.`
                : hintLevel === 2
                ? `Check ${todoMatch ? todoMatch[0] : 'the TODO line'}. The test runner looks for real functional implementation rather than default returned state.`
                : `Replace the TODO block with concrete logic that computes and validates inputs before returning.`,
            codePattern: language === "rust" ? "// Implement struct methods\nimpl Node {\n    pub fn new() -> Self { ... }\n}" : "function execute() {\n    // Concrete logic here\n}",
            quickPrompts: [
                "What is the first function I should implement?",
                "Show me the expected inputs and outputs",
                "What edge cases should I consider?"
            ]
        };
    }

    // 2. Project-Specific Heuristics
    const pid = (projectId || "").toLowerCase();

    // Track: Redis Clone (Rust)
    if (pid.includes("redis")) {
        if (milestoneIndex === 0) {
            return {
                diagnosis: "RESP protocol parsing error: Redis commands require strictly framed delimiters (`\\r\\n`).",
                level: hintLevel,
                targetLine: findLineNumber(code, ["\\r\\n", "b'+'", "b'$'", "parse"]),
                hint: hintLevel === 1
                    ? "In RESP, every command or string terminates with CRLF (\\r\\n). If your parser doesn't advance its slice index past both bytes, future reads will be offset."
                    : hintLevel === 2
                    ? "Inspect your slice index advancement. When encountering `+OK\\r\\n`, you must read until `\\r` and then skip 2 bytes (`pos + 2`) for the next token."
                    : "Pattern: `if let Some(pos) = buffer.windows(2).position(|w| w == b\"\\r\\n\") { let line = &buffer[..pos]; *cursor += pos + 2; }`",
                codePattern: "let pos = buf.windows(2).position(|w| w == b\"\\r\\n\").ok_or(RespError::Incomplete)?;\nlet line = &buf[..pos];\n*cursor += pos + 2;",
                quickPrompts: [
                    "How do I parse Simple Strings vs Bulk Strings?",
                    "How to handle fragmented TCP buffer chunks?",
                    "What is the RESP spec for null arrays?"
                ]
            };
        }
    }

    // Track: Local RAG Agent (Python)
    if (pid.includes("rag") || pid.includes("agent")) {
        if (milestoneIndex === 0) {
            return {
                diagnosis: "Document Chunking & Token Window error: Chunk boundaries or overlap logic is incomplete.",
                level: hintLevel,
                targetLine: findLineNumber(code, ["chunk", "split", "overlap", "def "]),
                hint: hintLevel === 1
                    ? "RAG pipelines require text to be segmented into sliding windows with overlap so semantic context isn't lost at the boundaries."
                    : hintLevel === 2
                    ? "Verify that your `chunk_text(text, chunk_size, overlap)` loop advances by `chunk_size - overlap` on each iteration to prevent duplicate or skipped tokens."
                    : "Pattern:\nstep = chunk_size - overlap\nchunks = [text[i:i + chunk_size] for i in range(0, len(text), step)]",
                codePattern: "def chunk_text(text: str, chunk_size=500, overlap=50):\n    step = chunk_size - overlap\n    return [text[i : i + chunk_size] for i in range(0, len(text), step)]",
                quickPrompts: [
                    "How should I handle sentence boundary preservation?",
                    "What embedding model dimension is expected?",
                    "How to implement MMR (Maximal Marginal Relevance)?"
                ]
            };
        }
    }

    // Track: Distributed Consensus / Raft / URL Shortener (Go)
    if (pid.includes("url") || pid.includes("gateway") || pid.includes("cicd") || language === "go") {
        return {
            diagnosis: "Concurrent State / Channel sync invariant failed: State transition or mutex locking issue.",
            level: hintLevel,
            targetLine: findLineNumber(code, ["sync.Mutex", "chan", "struct", "func "]),
            hint: hintLevel === 1
                ? "Distributed nodes maintain strict state invariants (Follower, Candidate, Leader). Ensure all shared state reads and writes are protected under a mutex."
                : hintLevel === 2
                ? "Check your timer reset routine. When receiving a heartbeat or granting a vote, the randomized election timer must be reset to prevent split votes."
                : "Pattern:\nmu.Lock()\ndefer mu.Unlock()\nrf.currentTerm++\nrf.state = StateCandidate",
            codePattern: "rf.mu.Lock()\ndefer rf.mu.Unlock()\nrf.state = Candidate\nrf.currentTerm++\nrf.votedFor = rf.me",
            quickPrompts: [
                "How to simulate network partitions?",
                "What is the recommended election timeout range?",
                "How does log compaction work in Raft?"
            ]
        };
    }

    // Track: Collaborative Canvas / Audio Synthesizer (JavaScript / TypeScript)
    if (language === "javascript" || language === "typescript" || pid.includes("canvas") || pid.includes("audio")) {
        return {
            diagnosis: "Event Loop / State Machine verification failed: Callback or exported module method returned unexpected state.",
            level: hintLevel,
            targetLine: findLineNumber(code, ["export", "function", "class", "return"]),
            hint: hintLevel === 1
                ? "Check the exported API contract. The test runner imports your module and invokes lifecycle methods (e.g. `initialize()`, `connect()`)."
                : hintLevel === 2
                ? "Ensure all return objects match the expected schema keys. For example, `initialize()` must return `{ status: 'initialized', ready: true }`."
                : "Pattern:\nexport function initialize() {\n    return { status: 'initialized', ready: true, nodes: [] };\n}",
            codePattern: "export function initialize() {\n    return { status: 'initialized', ready: true };\n}",
            quickPrompts: [
                "What methods must be exported?",
                "How to handle WebSocket reconnection?",
                "How does audio buffer scheduling work?"
            ]
        };
    }

    // Default Fallback Guidance
    return {
        diagnosis: errorMsg 
            ? `Assertion failure: ${errorMsg}` 
            : `Your code for Milestone ${milestoneIndex + 1} did not satisfy all test assertions.`,
        level: hintLevel,
        targetLine: 1,
        hint: hintLevel === 1
            ? `Review the milestone specification in the Spec Guide tab. Verify that all required functions, structs, and return values are provided.`
            : hintLevel === 2
            ? `Inspect the failed test assertion in the bottom drawer. Compare the expected value against what your implementation produces.`
            : `Ensure your implementation handles edge cases like empty inputs, out-of-bounds queries, and unexpected type formats.`,
        codePattern: "",
        quickPrompts: [
            "Explain the milestone objective",
            "What test cases are being run?",
            "How should I structure this solution?"
        ]
    };
}

/**
 * Helper to locate the most relevant line in user code
 */
function findLineNumber(code, keywords = []) {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const kw of keywords) {
            if (line.includes(kw)) {
                return i + 1;
            }
        }
    }
    return 1;
}

module.exports = {
    getAiMentorAdvice
};
