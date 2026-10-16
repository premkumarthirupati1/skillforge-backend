/**
 * SkillForge AI Coding Mentor Service (Forge Copilot)
 * 
 * Deep, multi-track pedagogical guidance for all 8 SkillForge project tracks,
 * covering every milestone, failing test case, and user query with graduated hinting.
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
    specRules = [],
    testCases = [],
    allFiles = [],
    activeFileName = "main.rs",
    userCode = "",
    testResults = null,
    userQuery = "",
    hintLevel = 1
}) {
    // 1. Try OpenRouter API (Qwen 2.5 Coder 32B / Open-Source LLMs)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        try {
            const openRouterModel = process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-coder-32b-instruct";
            const llmResult = await callOpenRouterMentor({
                apiKey: openRouterKey,
                model: openRouterModel,
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
                hintLevel
            });
            if (llmResult && llmResult.diagnosis) {
                return {
                    ...llmResult,
                    modelUsed: `Qwen 2.5 Coder 32B (OpenRouter)`,
                    isLiveAI: true
                };
            }
        } catch (llmErr) {
            console.warn("OpenRouter API call failed, attempting fallback:", llmErr.message);
        }
    }

    // 2. Try Gemini API if configured
    const apiKey = process.env.GEMINI_API_KEY;
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
                specRules,
                testCases,
                allFiles,
                activeFileName,
                userCode,
                testResults,
                userQuery,
                hintLevel
            });
            if (llmResult && llmResult.diagnosis) {
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

    // 3. Expert Pedagogical Engine (Deep Domain Diagnostic for all 8 tracks)
    const heuristicResult = analyzeWithExpertHeuristics({
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
        hintLevel
    });

    return {
        ...heuristicResult,
        modelUsed: "Forge Heuristic Diagnostic Engine",
        isLiveAI: false
    };
}

/**
 * Call OpenRouter API (Qwen 2.5 Coder 32B / Open-Source LLMs)
 */
async function callOpenRouterMentor({
    apiKey,
    model = "qwen/qwen-2.5-coder-32b-instruct",
    projectId,
    projectTitle,
    language,
    milestoneIndex,
    milestoneTitle,
    milestoneObjective,
    specRules = [],
    testCases = [],
    allFiles = [],
    activeFileName,
    userCode,
    testResults,
    userQuery,
    hintLevel
}) {
    const endpoint = "https://openrouter.ai/api/v1/chat/completions";

    const failedStep = testResults?.steps?.find(s => !s.passed) || (testResults?.error ? { name: "Runtime Error", output: testResults.error } : null);

    const rawCode = userCode || "";
    const lines = rawCode.split('\n');
    const lineCount = lines.length;
    // Format code with 1-based line numbers so the LLM has exact ground truth coordinates
    const numberedCode = lines.map((l, i) => `${String(i + 1).padStart(3, ' ')} | ${l}`).join('\n');

    const systemPrompt = `You are "Forge Copilot", an elite Staff Systems Engineer and pedagogical coding mentor for SkillForge (a hands-on developer engineering platform).
You guide engineers building production-grade software (Redis in Rust, Raft in Go, Local RAG in Python, Distributed Systems, Canvas in TypeScript, API Gateways in Go, Web Audio, CI/CD runners).

PEDAGOGICAL CONTRACT:
1. NEVER output the full solution code or rewrite entire files. Guide the engineer with surgical accuracy to discover and understand the fix themselves.
2. Ground all diagnoses strictly in the provided project specification rules and unit assertions.
3. Match the requested Hint Level strictly:
   - Level 1 (Conceptual Nudge): Explain the architectural invariant, protocol rule, or concept that was violated. Ask a reflective Socratic question. Set "codePattern" to "".
   - Level 2 (Pinpoint Bug): Point directly to the exact function, struct, line, or logic branch causing the failure. Explain clearly *why* the current code fails the assertion.
   - Level 3 (Structural Pattern): Provide a concise 2-6 line idiomatic code pattern or skeleton in ${language} demonstrating how to implement the required behavior.
4. TARGET LINE ACCURACY:
   - The active file "${activeFileName}" has exactly ${lineCount} lines (numbered 1 to ${lineCount}).
   - If a specific line in the active file contains the bug, missing call, or flawed logic, return that 1-indexed number in "targetLine" (must be between 1 and ${lineCount}).
   - If the issue is due to missing functions, missing architecture, another file, or general structure, return null for "targetLine".
   - CRITICAL: NEVER return a line number greater than ${lineCount}.
5. OUTPUT FORMAT:
   - Output ONLY a raw valid JSON object.
   - Do NOT include markdown fences, greetings, or conversational preambles.
   - Schema:
   {
     "diagnosis": "Concise 1-2 sentence explanation of the bug or answers user query",
     "hint": "The graduated pedagogical hint tailored to Level ${hintLevel}",
     "targetLine": null,
     "codePattern": "",
     "quickPrompts": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"]
   }`;

    let promptText = `Project: ${projectTitle} (${language})
Milestone ${milestoneIndex + 1}: ${milestoneTitle}
Milestone Objective: ${milestoneObjective || "Follow milestone specifications."}

`;

    if (Array.isArray(specRules) && specRules.length > 0) {
        promptText += `Milestone Production Specification Rules:\n${specRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    }

    if (Array.isArray(testCases) && testCases.length > 0) {
        promptText += `Verification Test Suite Targets:\n${testCases.map((tc, i) => `- Test ${i + 1}: "${tc.name}" | Expected: "${tc.expected || tc.cmd || ''}"`).join('\n')}\n\n`;
    }

    promptText += `Active File: ${activeFileName} (${lineCount} lines total)
Line-Numbered Source Code:
\`\`\`${language}
${numberedCode.slice(0, 4500)}
\`\`\`

`;

    if (Array.isArray(allFiles) && allFiles.length > 1) {
        const otherFiles = allFiles
            .filter(f => f.name !== activeFileName && f.content)
            .slice(0, 3)
            .map(f => `--- ${f.name} ---\n${f.content.slice(0, 1200)}`)
            .join('\n\n');
        if (otherFiles) {
            promptText += `Related Project Files in Workspace:\n${otherFiles}\n\n`;
        }
    }

    promptText += `Test Run Results:
${failedStep ? `❌ Failing Assertion: ${failedStep.name}\nDiagnostic Output: ${failedStep.output}` : "General analysis requested (all tests currently passing or pending execution)."}

User Question / Context: ${userQuery || "Please analyze why my tests failed and provide guidance."}
Requested Hint Level: Level ${hintLevel} (1=Conceptual Nudge, 2=Pinpoint Bug, 3=Structural Pattern)

Remember: Output raw valid JSON only. If targetLine is specified, it must be between 1 and ${lineCount}, or null.`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://skillforge.dev",
            "X-Title": "SkillForge AI Mentor"
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: promptText }
            ],
            temperature: 0.2,
            max_tokens: 1200,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    return safelyParseAiJson(rawContent, lineCount);
}

/**
 * Resilient JSON Parser & Field Extractor
 * Prevents raw JSON from leaking into the UI if LLM makes syntax errors.
 * Clamps targetLine to valid bounds [1, maxLineCount] to avoid out-of-range jumps.
 */
function safelyParseAiJson(rawText, maxLineCount = null) {
    if (!rawText || typeof rawText !== "string") return null;

    // 1. Strip markdown fences
    let cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();

    // 2. Fix malformed key syntax e.g. "hint: text" -> "hint": "text"
    cleaned = cleaned.replace(/"(diagnosis|hint|targetLine|codePattern|quickPrompts):\s*/g, '"$1": "');

    const sanitizeTargetLine = (val) => {
        if (val === null || val === undefined) return null;
        const num = typeof val === "number" ? val : parseInt(val, 10);
        if (isNaN(num) || num < 1) return null;
        if (maxLineCount && num > maxLineCount) return null;
        return num;
    };

    // 3. Try standard JSON parse
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object") {
            return {
                diagnosis: String(parsed.diagnosis || "").trim(),
                hint: String(parsed.hint || parsed.explanation || "").trim(),
                targetLine: sanitizeTargetLine(parsed.targetLine),
                codePattern: String(parsed.codePattern || "").trim(),
                quickPrompts: Array.isArray(parsed.quickPrompts) ? parsed.quickPrompts : []
            };
        }
    } catch (e) {
        // Continue to regex recovery
    }

    // 4. Regex extraction for each field
    const extractString = (field) => {
        const regex = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)(?="\\s*,\\s*"|"\\s*\\}|$)`, "i");
        const m = cleaned.match(regex);
        if (m) {
            let val = m[1].trim();
            if (val.endsWith('"')) val = val.slice(0, -1);
            return val.replace(/\\n/g, "\n").replace(/\\"/g, '"');
        }
        return null;
    };

    const diagnosis = extractString("diagnosis");
    const hint = extractString("hint");
    const codePattern = extractString("codePattern");

    const lineMatch = cleaned.match(/"targetLine"\s*:\s*(\d+)/i);
    const targetLine = sanitizeTargetLine(lineMatch ? lineMatch[1] : null);

    let quickPrompts = [];
    const promptsMatch = cleaned.match(/"quickPrompts"\s*:\s*\[([\s\S]*?)\]/i);
    if (promptsMatch) {
        quickPrompts = [...promptsMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    }

    if (hint || diagnosis) {
        return {
            diagnosis: diagnosis || "Analysis complete",
            hint: hint || (diagnosis ? "Review the implementation details above." : cleaned),
            targetLine,
            codePattern: codePattern || "",
            quickPrompts: quickPrompts.length > 0 ? quickPrompts : [
                "How do I fix this?",
                "Give me a subtle hint",
                "Show code pattern"
            ]
        };
    }

    // 5. Ultimate fallback: Clean out any JSON braces/keys so user never sees raw JSON
    const humanText = cleaned
        .replace(/[{}]/g, "")
        .replace(/"diagnosis"\s*:\s*"?/gi, "")
        .replace(/"hint"\s*:\s*"?/gi, "")
        .replace(/"codePattern"\s*:\s*"?/gi, "\n\nCode Pattern:\n")
        .replace(/"quickPrompts"[\s\S]*$/, "")
        .replace(/"/g, "")
        .trim();

    return {
        diagnosis: "Staff Engineer Analysis",
        hint: humanText || cleaned,
        targetLine: null,
        codePattern: "",
        quickPrompts: ["Explain milestone objective", "How do I fix this error?"]
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
    specRules = [],
    testCases = [],
    allFiles = [],
    activeFileName,
    userCode,
    testResults,
    userQuery,
    hintLevel
}) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const failedStep = testResults?.steps?.find(s => !s.passed) || (testResults?.error ? { name: "Runtime Error", output: testResults.error } : null);

    const rawCode = userCode || "";
    const lines = rawCode.split('\n');
    const lineCount = lines.length;
    const numberedCode = lines.map((l, i) => `${String(i + 1).padStart(3, ' ')} | ${l}`).join('\n');

    const systemPrompt = `You are "Forge Copilot", an elite Staff Engineer and coding mentor for SkillForge.
You guide developers building production-grade software (Redis in Rust, Raft in Go, Local RAG in Python, API Gateway in Go, Git in Rust, Canvas, Synthesizer).

PEDAGOGICAL RULES:
1. NEVER output the full solution code. Guide the learner to understand the bug themselves.
2. Match the requested Hint Level strictly:
   - Level 1 (Conceptual Nudge): Explain the architectural concept or invariant that was violated. Ask a reflective question. Set codePattern to "".
   - Level 2 (Pinpoint Bug): Point directly to the function, struct, or file location causing the issue and explain why it behaves unexpectedly.
   - Level 3 (Structural Pattern): Provide a small, idiomatic code pattern (2-5 lines) showing how to approach the fix.
3. Target Line Accuracy: The active file has ${lineCount} lines. If targetLine is set, it MUST be an integer between 1 and ${lineCount}, or null.
4. Return strictly valid JSON:
{
  "diagnosis": "Short 1-2 sentence explanation of what went wrong or answers the query",
  "hint": "The graduated hint tailored to Level ${hintLevel}",
  "targetLine": null,
  "codePattern": "",
  "quickPrompts": ["3 short relevant follow-up questions user might ask"]
}`;

    let promptText = `Project: ${projectTitle} (${language})
Milestone ${milestoneIndex + 1}: ${milestoneTitle}
Objective: ${milestoneObjective}

`;

    if (Array.isArray(specRules) && specRules.length > 0) {
        promptText += `Spec Rules:\n${specRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    }

    if (Array.isArray(testCases) && testCases.length > 0) {
        promptText += `Tests:\n${testCases.map((tc, i) => `- ${tc.name} (Expects: ${tc.expected || ''})`).join('\n')}\n\n`;
    }

    promptText += `Active File: ${activeFileName} (${lineCount} lines)
Line-Numbered Code:
\`\`\`${language}
${numberedCode.slice(0, 4000)}
\`\`\`

Test Results:
${failedStep ? `Failing Assertion: ${failedStep.name}\nDiagnostic Output: ${failedStep.output}` : "General inspection requested."}

User Question: ${userQuery || "Please analyze why my tests failed and provide guidance."}
Requested Hint Level: Level ${hintLevel} (1=Nudge, 2=Pinpoint, 3=Code Structure)

Return ONLY valid JSON.`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n" + promptText }] }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
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

    return safelyParseAiJson(rawText, lineCount);
}

/**
 * Domain Knowledge Base: Comprehensive milestone specifications, common errors,
 * and graduated hints for all 8 SkillForge project tracks.
 */
const TRACK_KNOWLEDGE = {
    // -------------------------------------------------------------
    // 1. REDIS CLONE (Rust)
    // -------------------------------------------------------------
    "redis-clone": {
        0: {
            title: "RESP Parser & Ping/Pong Protocol",
            concept: "Redis Serialization Protocol (RESP) framing with CRLF (\\r\\n).",
            failingConditions: [
                {
                    match: /ping|pong/i,
                    diagnosis: "Ping Command Handling: Server must reply with simple string `+PONG\\r\\n` on receiving `PING`.",
                    lineKeywords: ["PING", "handle_client", "write_all", "buffer"],
                    nudge: "Redis clients send `PING` formatted either as inline plain text or as a RESP array (`*1\\r\\n$4\\r\\nPING\\r\\n`). Is your server writing `+PONG\\r\\n` back to the stream?",
                    pinpoint: "Inspect your `handle_client` loop in `main.rs`. Ensure you flush or write `+PONG\\r\\n` directly to the `TcpStream` using `stream.write_all(b\"+PONG\\r\\n\")`.",
                    pattern: "if input.trim().to_uppercase().contains(\"PING\") {\n    stream.write_all(b\"+PONG\\r\\n\")?;\n}"
                },
                {
                    match: /simple string|crlf|delimiter/i,
                    diagnosis: "RESP Framing: Simple strings must start with `+` and terminate with `\\r\\n` without embedded newlines.",
                    lineKeywords: ["b'+'", "\\r\\n", "write", "parse"],
                    nudge: "In RESP, every command or simple string terminates strictly with CRLF (\\r\\n). If your parser advances past `\\r` but forgets `\\n`, subsequent tokens are offset.",
                    pinpoint: "When scanning for `\\r\\n`, calculate the delimiter position using `windows(2)` and advance your stream cursor by `pos + 2`.",
                    pattern: "let pos = buf.windows(2).position(|w| w == b\"\\r\\n\").ok_or(RespError::Incomplete)?;\nlet line = &buf[..pos];\n*cursor += pos + 2;"
                }
            ],
            defaultDiagnosis: "Milestone 1 requires implementing the basic TCP connection listener and parsing PING commands formatted as RESP simple strings.",
            nudge: "Start by binding a `TcpListener` on `127.0.0.1:6379`. For each incoming stream, read into a buffer and check if the payload matches `PING`.",
            pinpoint: "Check `src/main.rs` in `handle_client`. Make sure you're reading from the `TcpStream` and writing the RESP reply `+PONG\\r\\n`.",
            pattern: "let listener = TcpListener::bind(\"127.0.0.1:6379\")?;\nfor stream in listener.incoming() {\n    let stream = stream?;\n    thread::spawn(|| handle_client(stream));\n}",
            quickPrompts: ["How do I parse Simple Strings vs Bulk Strings?", "How to handle fragmented TCP buffer chunks?", "What is the RESP spec for arrays?"]
        },
        1: {
            title: "ECHO Command & Bulk Strings",
            concept: "Bulk Strings syntax: `$<length>\\r\\n<data>\\r\\n`.",
            defaultDiagnosis: "ECHO command must return the argument as a RESP Bulk String (`$<len>\\r\\n<arg>\\r\\n`).",
            nudge: "Unlike Simple Strings, Bulk Strings can contain binary data and newlines because they declare their byte length upfront with `$<length>`.",
            pinpoint: "Inspect `src/resp.rs`. When decoding `*2\\r\\n$4\\r\\nECHO\\r\\n$5\\r\\nhello\\r\\n`, extract the second argument and write `format!(\"${}\\r\\n{}\\r\\n\", arg.len(), arg)`.",
            pattern: "let response = format!(\"${}\\r\\n{}\\r\\n\", arg.len(), arg);\nstream.write_all(response.as_bytes())?;",
            quickPrompts: ["How to handle empty bulk strings ($0\\r\\n\\r\\n)?", "How to return Null Bulk String ($-1\\r\\n)?", "How to parse multi-bulk command arrays?"]
        },
        2: {
            title: "SET & GET In-Memory Key-Value Store",
            concept: "Concurrent in-memory storage using `Arc<RwLock<HashMap<String, String>>>`.",
            defaultDiagnosis: "SET and GET store operations: Keys must persist in memory and return `+OK\\r\\n` for SET, or Bulk String for GET.",
            nudge: "How are you sharing state across client threads? Multiple TCP clients will write simultaneously.",
            pinpoint: "In `src/store.rs`, use `Arc<RwLock<HashMap<String, String>>>`. For SET acquire a write lock, for GET acquire a read lock. Return `$-1\\r\\n` if key doesn't exist.",
            pattern: "pub struct Db {\n    entries: Arc<RwLock<HashMap<String, String>>>,\n}\n// GET:\nlet db = self.entries.read().unwrap();\ndb.get(key).cloned()",
            quickPrompts: ["Why use RwLock instead of Mutex in Redis?", "What does GET return on non-existent keys?", "How to handle key case sensitivity?"]
        },
        3: {
            title: "LRU Memory Eviction & Concurrent Connections",
            concept: "O(1) Least Recently Used cache eviction using HashMap + Doubly Linked List.",
            defaultDiagnosis: "LRU Eviction failure: When memory limit is reached, the least recently accessed key must be evicted.",
            nudge: "How do you achieve O(1) eviction? A Doubly Linked List tracks access recency, while a HashMap maps keys to list node pointers.",
            pinpoint: "On every GET or SET hit, detach the node from its current position and splice it to the head. When evicting, remove the node at the tail.",
            pattern: "pub fn access(&mut self, key: &str) {\n    if let Some(&node_ptr) = self.map.get(key) {\n        self.list.move_to_head(node_ptr);\n    }\n}",
            quickPrompts: ["How does Redis approximate LRU with random sampling?", "How to track memory usage in Rust?", "What is the difference between volatile-lru and allkeys-lru?"]
        },
        4: {
            title: "RDB Disk Snapshot Encoding & Recovery",
            concept: "Binary RDB snapshot serialization format: header, opcodes, key-value pairs, checksum.",
            defaultDiagnosis: "RDB snapshot persistence failure: In-memory keys must be encoded into binary file format and recovered on restart.",
            nudge: "Redis RDB files start with the magic string `REDIS` followed by 4-digit version, opcode indicators (`0xFE` for DB selector, `0xFD` for expiry), and EOF.",
            pinpoint: "In `src/rdb.rs`, serialize entries: Write magic header `REDIS0011`, write DB index, encode length-prefixed strings, and finish with checksum.",
            pattern: "file.write_all(b\"REDIS0011\")?;\nfile.write_all(&[0xFE, 0x00])?; // Select DB 0\n// Iterate and write key-values...",
            quickPrompts: ["How does Redis fork a child process for background saving (BGSAVE)?", "How are 64-bit integer timestamps stored in RDB?", "What is CRC64 checksum?"]
        }
    },

    // -------------------------------------------------------------
    // 2. LOCAL RAG AGENT (Python)
    // -------------------------------------------------------------
    "local-rag-agent": {
        0: {
            title: "Document Ingestion & Sliding Window Chunking",
            concept: "Text chunking with token overlap to maintain semantic continuity across boundaries.",
            failingConditions: [
                {
                    match: /overlap|boundary|chunk/i,
                    diagnosis: "Chunk Overlap Mismatch: The step between consecutive chunks must be `chunk_size - overlap`.",
                    lineKeywords: ["chunk_size", "overlap", "step", "chunk_text"],
                    nudge: "If you simply slice `text[i:i + chunk_size]` without advancing by `chunk_size - overlap`, you will either lose context or duplicate text incorrectly.",
                    pinpoint: "Look at your chunking loop in `src/retriever.py` or `src/main.py`. Ensure step is defined as `step = max(1, chunk_size - overlap)` and loop uses `range(0, len(text), step)`.",
                    pattern: "def chunk_text(text: str, chunk_size=500, overlap=50):\n    step = max(1, chunk_size - overlap)\n    return [text[i:i + chunk_size] for i in range(0, len(text), step)]"
                }
            ],
            defaultDiagnosis: "Document chunking logic missing or incomplete: Text must be split into overlapping chunks for semantic retrieval.",
            nudge: "RAG retrieval fails if chunk size is too large (dilutes relevance) or too small (loses context). Implement a sliding window with 50-token overlap.",
            pinpoint: "Check `src/retriever.py` in `chunk_text()`. It should accept raw document text and return a list of string chunks.",
            pattern: "def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:\n    step = chunk_size - overlap\n    return [text[i : i + chunk_size] for i in range(0, len(text), step)]",
            quickPrompts: ["How to preserve sentence boundaries during chunking?", "What chunk size is optimal for code vs prose?", "How to store chunk metadata?"]
        },
        1: {
            title: "Vector Embeddings & ChromaDB Collection",
            concept: "Dense embedding generation with cosine similarity indexing.",
            defaultDiagnosis: "Vector Store indexing error: Documents must be embedded into float vectors and stored in a collection.",
            nudge: "Vector stores require each chunk to have an ID, an embedding vector (e.g. 384-dimensional float list), and associated text metadata.",
            pinpoint: "In `src/retriever.py`, check your `add_documents` method. Ensure you call `collection.add(ids=ids, documents=chunks, embeddings=embeddings)`.",
            pattern: "collection = client.get_or_create_collection('rag_docs')\ncollection.add(\n    ids=[f'doc_{i}' for i in range(len(chunks))],\n    documents=chunks\n)",
            quickPrompts: ["What distance metric is best (Cosine vs L2)?", "How to batch embedding requests for speed?", "How to persist the ChromaDB database to disk?"]
        },
        2: {
            title: "Hybrid Search (BM25 + Dense Semantic)",
            concept: "Reciprocal Rank Fusion (RRF) combining keyword and dense semantic vector scores.",
            defaultDiagnosis: "Hybrid Search Fusion: BM25 keyword rankings must be combined with vector similarity rankings.",
            nudge: "Pure vector search fails on exact keyword identifiers (e.g. error codes, variable names). Hybrid search fuses BM25 + dense vector scores.",
            pinpoint: "Implement Reciprocal Rank Fusion: `RRF(doc) = 1 / (60 + rank_dense) + 1 / (60 + rank_bm25)`.",
            pattern: "def rrf_score(rank_dense, rank_bm25, k=60):\n    return (1.0 / (k + rank_dense)) + (1.0 / (k + rank_bm25))",
            quickPrompts: ["What is the RRF constant k?", "When does BM25 outperform semantic vectors?", "How to normalize BM25 scores?"]
        },
        3: {
            title: "Agent Reasoning Loop with Context Window Truncation",
            concept: "Prompt assembling, token budget truncation, and query answering loop.",
            defaultDiagnosis: "Agent loop context overflow: Prompt tokens exceed max context window budget.",
            nudge: "Before feeding retrieved chunks into LLM prompt, calculate total token estimate and truncate lowest-ranked chunks.",
            pinpoint: "In `src/agent.py`, sort retrieved documents by relevance score and append to context until `current_tokens + len(doc) <= max_tokens`.",
            pattern: "selected = []\ncurr_len = 0\nfor doc in sorted_docs:\n    if curr_len + len(doc.text) > MAX_CHAR_BUDGET: break\n    selected.append(doc.text)\n    curr_len += len(doc.text)",
            quickPrompts: ["How to manage multi-turn chat history in RAG?", "How to format source citations in LLM responses?", "How to prompt for self-reflection?"]
        },
        4: {
            title: "Real-Time SSE Streaming Output & Syntax Highlighter",
            concept: "Server-Sent Events (SSE) token generator yielding chunks with `data: ...\\n\\n` framing.",
            defaultDiagnosis: "Streaming protocol error: Output stream must format events as SSE text stream.",
            nudge: "FastAPI / Starlette `StreamingResponse` expects an async generator yielding string chunks prefixed with `data: `.",
            pinpoint: "In `src/main.py`, set `media_type=\"text/event-stream\"` and yield `f\"data: {json.dumps({'token': chunk})}\\n\\n\"`.",
            pattern: "async def event_generator():\n    async for token in llm.astream(prompt):\n        yield f\"data: {json.dumps({'text': token})}\\n\\n\"\nreturn StreamingResponse(event_generator(), media_type=\"text/event-stream\")",
            quickPrompts: ["How to handle client disconnection mid-stream?", "How to stream reasoning tokens vs answer tokens?", "What headers are needed for SSE?"]
        }
    },

    // -------------------------------------------------------------
    // 3. COLLABORATIVE CANVAS (TypeScript)
    // -------------------------------------------------------------
    "collaborative-canvas": {
        0: {
            title: "HTML5 Canvas Primitive Rendering",
            concept: "2D context draw path operations and coordinate transformation.",
            defaultDiagnosis: "Canvas rendering pipeline: Stroke, line, and rectangle paths must be committed to the 2D context.",
            nudge: "When drawing on a Canvas, remember to call `ctx.beginPath()`, set `lineWidth` and `strokeStyle`, and call `ctx.stroke()` or `ctx.fill()`.",
            pinpoint: "Check `src/Canvas.tsx` in your `drawPrimitive` function. Make sure coordinates take high-DPI scaling (`devicePixelRatio`) into account.",
            pattern: "ctx.beginPath();\nctx.strokeStyle = element.color;\nctx.lineWidth = element.width;\nctx.moveTo(element.x1, element.y1);\nctx.lineTo(element.x2, element.y2);\nctx.stroke();",
            quickPrompts: ["How to handle Retina/High-DPI canvas blur?", "How to implement smooth Bezier curves?", "How to track mouse drag coordinates?"]
        },
        1: {
            title: "Undo/Redo History Stack",
            concept: "Command pattern maintaining undo and redo stacks of immutable state deltas.",
            defaultDiagnosis: "History management error: Canvas state must support undo and redo operations without losing unsaved changes.",
            nudge: "Each user action pushes a command to the `undoStack`. When `undo()` is called, pop from `undoStack`, push to `redoStack`, and redraw canvas.",
            pinpoint: "In `src/Canvas.tsx`, ensure that performing a *new* drawing action clears the `redoStack` to prevent diverging timelines.",
            pattern: "const undo = () => {\n    if (history.length === 0) return;\n    const last = history[history.length - 1];\n    setRedoStack(prev => [...prev, last]);\n    setElements(prev => prev.slice(0, -1));\n};",
            quickPrompts: ["How to limit history stack size to prevent memory leaks?", "Should history store full frames or deltas?", "How to group rapid mouse moves into one action?"]
        },
        2: {
            title: "Real-Time WebSocket Cursor & Event Sync",
            concept: "Broadcasting operational deltas and peer cursor coordinates over WebSockets.",
            defaultDiagnosis: "WebSocket message schema mismatch: Incoming remote draw operations must be parsed and rendered on a remote canvas layer.",
            nudge: "Do not redraw the entire canvas on every remote mouse move. Keep remote cursors on a separate transparent overlay canvas.",
            pinpoint: "In `src/websocket.ts`, listen for `onmessage` and dispatch event types: `{ type: 'cursor', userId, x, y }` and `{ type: 'draw', element }`.",
            pattern: "socket.send(JSON.stringify({\n    type: 'draw_delta',\n    userId,\n    element: newElement\n}));",
            quickPrompts: ["How to throttle cursor broadcasts to 30fps?", "How to handle WebSocket disconnections gracefully?", "How to identify peer cursor colors?"]
        },
        3: {
            title: "Concurrent Shape Mutations & Conflict Resolution",
            concept: "Last-Write-Wins (LWW) or operational CRDT ordering for concurrent edits.",
            defaultDiagnosis: "State desynchronization: When two users edit the same element simultaneously, states diverge.",
            nudge: "Attach a Lamport timestamp or monotonic version counter to each element mutation. Higher timestamp wins.",
            pinpoint: "In `src/state.ts`, compare incoming delta timestamp against local element timestamp before applying updates.",
            pattern: "if (incoming.version > current.version) {\n    updateElement(incoming.id, incoming.props);\n}",
            quickPrompts: ["What is a Lamport timestamp?", "How do CRDTs guarantee eventual consistency?", "How to handle deleted element conflicts?"]
        },
        4: {
            title: "Local History Tree & High-Res Image Export",
            concept: "OffscreenCanvas bitmap generation and Blob serialization for PNG/SVG export.",
            defaultDiagnosis: "Canvas export failure: Exported bitmap is blank or missing remote elements.",
            nudge: "When exporting, render all layers (background grid, static shapes, annotations) onto an offscreen canvas at 2x resolution.",
            pinpoint: "Use `canvas.toBlob((blob) => { ... }, 'image/png')` and generate a downloadable object URL.",
            pattern: "canvas.toBlob((blob) => {\n    const url = URL.createObjectURL(blob);\n    const a = document.createElement('a');\n    a.href = url;\n    a.download = 'diagram.png';\n    a.click();\n});",
            quickPrompts: ["How to export SVG paths from HTML5 Canvas?", "How to include custom fonts in canvas export?", "How to prevent CORS taint on canvas export?"]
        }
    },

    // -------------------------------------------------------------
    // 4. API GATEWAY & REVERSE PROXY (Go)
    // -------------------------------------------------------------
    "api-gateway-proxy": {
        0: {
            title: "HTTP Reverse Proxy & Request Forwarding",
            concept: "Go `net/http/httputil` ReverseProxy director and header propagation.",
            defaultDiagnosis: "Reverse Proxy forwarding error: Incoming requests must be forwarded to target upstream with headers intact.",
            nudge: "In Go, `httputil.NewSingleHostReverseProxy(targetURL)` handles the heavy lifting, but you must rewrite the `Host` header to match the backend target.",
            pinpoint: "In `proxy.go`, check your `Director` function. Ensure `req.URL.Scheme = target.Scheme`, `req.URL.Host = target.Host`, and `req.Host = target.Host`.",
            pattern: "proxy := httputil.NewSingleHostReverseProxy(targetUrl)\noriginalDirector := proxy.Director\nproxy.Director = func(req *http.Request) {\n    originalDirector(req)\n    req.Host = targetUrl.Host\n}",
            quickPrompts: ["How to handle X-Forwarded-For headers?", "How to proxy WebSocket connections in Go?", "How to stream large request bodies without buffering?"]
        },
        1: {
            title: "Round-Robin & Least-Connections Load Balancer",
            concept: "Thread-safe server pool rotation using atomic index operations.",
            defaultDiagnosis: "Load Balancer algorithm error: Upstream selection must cycle through healthy backends atomically.",
            nudge: "Using a regular integer for round-robin causes race conditions in Go HTTP handlers. Use `atomic.AddUint64` to increment the index safely.",
            pinpoint: "In `balancer.go`, implement `NextIndex()` using `atomic.AddUint64(&s.current, 1) % uint64(len(s.backends))`.",
            pattern: "func (s *ServerPool) GetNextPeer() *Backend {\n    next := int(atomic.AddUint64(&s.current, 1) % uint64(len(s.backends)))\n    return s.backends[next]\n}",
            quickPrompts: ["How to skip unhealthy backends in round-robin?", "How to track active connections for Least-Connections?", "How to implement weighted load balancing?"]
        },
        2: {
            title: "Token Bucket Rate Limiting",
            concept: "Rate limiting per client IP using token bucket replenishment.",
            defaultDiagnosis: "Rate Limiter threshold failure: Client exceeding rate limit must receive HTTP 429 Too Many Requests.",
            nudge: "A token bucket replenishes tokens at a fixed rate `r` tokens/sec up to capacity `b`. Every request takes 1 token.",
            pinpoint: "In `main.go`, check your rate limiting middleware. If `!limiter.Allow()`, immediately return `http.StatusTooManyRequests` (429) and stop execution.",
            pattern: "if !limiter.Allow() {\n    http.Error(w, \"Too Many Requests\", http.StatusTooManyRequests)\n    return\n}\nnext.ServeHTTP(w, r)",
            quickPrompts: ["How to clean up stale client IPs from the rate limiter map?", "How to return Retry-After HTTP headers?", "Token Bucket vs Leaky Bucket tradeoffs?"]
        },
        3: {
            title: "Dynamic Routing Rules with Path Rewriting",
            concept: "Regex path prefix matching and URL rewrite stripping.",
            defaultDiagnosis: "Route matching error: Path prefix must be stripped before dispatching to upstream.",
            nudge: "If client requests `/api/v1/users`, your gateway should strip `/api/v1` and request `/users` on upstream service.",
            pinpoint: "In `router.go`, use `strings.TrimPrefix(req.URL.Path, route.Prefix)` and update `req.URL.Path` before forwarding.",
            pattern: "req.URL.Path = strings.TrimPrefix(req.URL.Path, matchedRoute.Prefix)\nif !strings.HasPrefix(req.URL.Path, \"/\") {\n    req.URL.Path = \"/\" + req.URL.Path\n}",
            quickPrompts: ["How to hot-reload routes without server restart?", "How to support wildcard path parameters?", "How to handle query parameter preservation?"]
        },
        4: {
            title: "Prometheus Latency Metrics & Docker Cluster Spec",
            concept: "HTTP metrics middleware exposing request count, status codes, and duration histograms.",
            defaultDiagnosis: "Metrics collection failure: Requests must record status codes and duration in Prometheus histograms.",
            nudge: "Wrap the HTTP handler with a response recorder to capture the status code, then record `time.Since(start).Seconds()`.",
            pinpoint: "In `metrics.go`, register `http_request_duration_seconds` and call `histogram.Observe(duration)` in middleware.",
            pattern: "start := time.Now()\nnext.ServeHTTP(recorder, req)\nduration := time.Since(start).Seconds()\nhttpDuration.WithLabelValues(req.Method, recorder.Status()).Observe(duration)",
            quickPrompts: ["How to expose /metrics endpoint safely?", "What histogram bucket intervals are optimal for web APIs?", "How to monitor connection pool saturation?"]
        }
    },

    // -------------------------------------------------------------
    // 5. DISTRIBUTED URL SHORTENER (JavaScript)
    // -------------------------------------------------------------
    "url-shortener-distributed": {
        0: {
            title: "Base62 Encoding & Decoding",
            concept: "Bijective mapping between 64-bit integer IDs and Base62 strings (`0-9a-zA-Z`).",
            defaultDiagnosis: "Base62 encoding logic error: Must accurately map positive integers to 6-8 character strings and back.",
            nudge: "Base62 uses characters `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. Convert numbers by repeated modulo 62 and division.",
            pinpoint: "In `src/base62.js`, verify `encode(id)`. While `id > 0`, prepend `CHARSET[id % 62]` and set `id = Math.floor(id / 62)`.",
            pattern: "const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';\nexport function encodeBase62(num) {\n    if (num === 0) return CHARSET[0];\n    let str = '';\n    while (num > 0) {\n        str = CHARSET[num % 62] + str;\n        num = Math.floor(num / 62);\n    }\n    return str;\n}",
            quickPrompts: ["Why Base62 instead of Base64 for URLs?", "What is the max number of URLs for 7 chars?", "How to prevent sequential URL enumeration?"]
        },
        1: {
            title: "Snowflake Distributed Unique ID Generator",
            concept: "64-bit distributed IDs composed of timestamp, worker ID, and sequence number.",
            defaultDiagnosis: "Unique ID Generator collision: IDs generated in the same millisecond must increment the sequence counter.",
            nudge: "Twitter Snowflake divides 64 bits into: 41 bits (timestamp), 10 bits (machine/worker ID), 12 bits (sequence counter).",
            pinpoint: "Ensure that if `currentTimestamp === lastTimestamp`, you increment `sequence = (sequence + 1) & 4095`. If sequence overflows, wait until next millisecond.",
            pattern: "if (currentTimestamp === lastTimestamp) {\n    sequence = (sequence + 1n) & 4095n;\n    if (sequence === 0n) currentTimestamp = waitNextMillis(lastTimestamp);\n}",
            quickPrompts: ["How to handle NTP system clock rollback in Snowflake?", "How to allocate worker IDs automatically?", "Bitwise BigInt syntax in JavaScript?"]
        },
        2: {
            title: "Redis Write-Through Cache with Cache-Stampede Shield",
            concept: "In-memory caching of shortened URL destinations with probabilistic early expiration (XFetch).",
            defaultDiagnosis: "Cache stampede vulnerability: Expired high-traffic keys hit database simultaneously.",
            nudge: "When a key is near expiration, probabilistically trigger a background refresh before it actually expires.",
            pinpoint: "In `src/cache.js`, check if `Date.now() - (delta * beta * Math.log(Math.random())) > expiry`. If true, recompute in background.",
            pattern: "const shouldRefresh = (expiry - Date.now()) < (computeTime * 1.0 * Math.log(Math.random()));",
            quickPrompts: ["What is the XFetch algorithm?", "Why use write-through vs cache-aside?", "How to set TTL in Redis client?"]
        },
        3: {
            title: "Sliding-Window Rate Limiting Middleware",
            concept: "Rolling window request counter stored in Redis sorted set (ZSET).",
            defaultDiagnosis: "Rate limiter burst bypass: Fixed window resets allow double request bursts on boundary.",
            nudge: "Use a Redis ZSET where member and score are both `Date.now()`. Prune entries older than `now - windowSize` with `ZREMRANGEBYSCORE`.",
            pinpoint: "Count remaining requests using `ZCARD`. If count exceeds limit, return 429.",
            pattern: "await redis.zremrangebyscore(key, 0, now - windowMs);\nconst count = await redis.zcard(key);\nif (count >= limit) return res.status(429).json({ error: 'Too Many Requests' });\nawait redis.zadd(key, now, `${now}-${Math.random()}`);",
            quickPrompts: ["Why is sliding-window better than fixed-window?", "How to expire the entire Redis ZSET key?", "How to handle distributed rate limiter clock skew?"]
        },
        4: {
            title: "Telemetry Analytics Worker & Click Geo-tracking",
            concept: "Asynchronous click event buffering and batch ingestion into analytics database.",
            defaultDiagnosis: "Telemetry blocking HTTP redirect: Logging click metrics must not delay the 302 redirect response.",
            nudge: "Send the 302 response immediately, then push the analytics event to an in-memory queue or Redis stream asynchronously.",
            pinpoint: "Do not `await` the analytics write inside the redirect handler. Use `process.nextTick` or a job queue.",
            pattern: "res.redirect(302, destinationUrl);\nanalyticsQueue.push({ shortCode, ip: req.ip, userAgent: req.headers['user-agent'], timestamp: Date.now() });",
            quickPrompts: ["How to parse MaxMind GeoIP offline databases?", "How to batch database inserts with pg-promise?", "What HTTP redirect code preserves POST bodies?"]
        }
    },

    // -------------------------------------------------------------
    // 6. AUDIO SYNTHESIZER (JavaScript)
    // -------------------------------------------------------------
    "audio-synthesizer": {
        0: {
            title: "WebAudio AudioContext Graph",
            concept: "Audio node routing: OscillatorNode -> GainNode -> AudioContext.destination.",
            defaultDiagnosis: "Audio graph routing missing: Notes must pass through a Master Gain Node before connecting to destination.",
            nudge: "In the Web Audio API, sound sources (oscillators) must connect to audio processing nodes (gain) before the speakers (`audioCtx.destination`).",
            pinpoint: "In `src/audioEngine.js`, initialize `this.ctx = new (window.AudioContext || window.webkitAudioContext)()` and create `this.masterGain = this.ctx.createGain()`.",
            pattern: "const ctx = new AudioContext();\nconst osc = ctx.createOscillator();\nconst gain = ctx.createGain();\nosc.connect(gain);\ngain.connect(ctx.destination);\nosc.start();",
            quickPrompts: ["Why do browsers block AudioContext on page load?", "How to calculate note frequencies from MIDI numbers?", "Sine vs Sawtooth harmonic differences?"]
        },
        1: {
            title: "ADSR Envelope Generator",
            concept: "Linear and exponential parameter ramps for Attack, Decay, Sustain, and Release.",
            defaultDiagnosis: "Envelope timing error: Gain parameter ramps must use `audioParam.linearRampToValueAtTime()`.",
            nudge: "Never set `gain.value = 0` abruptly—that causes audible audio clicks and pops! Always ramp smoothly over a few milliseconds.",
            pinpoint: "In `src/audioEngine.js`, on `noteOn`: `gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + attack);`",
            pattern: "const now = ctx.currentTime;\ngain.gain.cancelScheduledValues(now);\ngain.gain.setValueAtTime(0.001, now);\ngain.gain.linearRampToValueAtTime(1.0, now + attack);\ngain.gain.exponentialRampToValueAtTime(sustain, now + attack + decay);",
            quickPrompts: ["Why does exponentialRamp fail with value 0?", "How to trigger Release on keyup?", "What is the typical Attack time for a pad vs lead?"]
        },
        2: {
            title: "16-Step High-Precision BPM Sequencer Clock",
            concept: "WebAudio clock lookahead scheduling to avoid JavaScript `setInterval` timing jitter.",
            defaultDiagnosis: "Sequencer timing drift: `setTimeout` or `setInterval` drifts by 10-50ms under UI load.",
            nudge: "JavaScript timers drift when the main thread is busy. Use a WebAudio lookahead schedule: schedule notes ahead in AudioContext time.",
            pinpoint: "In `src/sequencer.js`, run a lightweight timer every 25ms that schedules all notes falling within the next 100ms window.",
            pattern: "while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {\n    scheduleNote(currentStep, nextNoteTime);\n    nextStep();\n}",
            quickPrompts: ["What is the Chris Wilson scheduling algorithm?", "How to compute seconds per beat from BPM?", "How to sync swing timing?"]
        },
        3: {
            title: "Real-Time Frequency Visualizer on HTML Canvas",
            concept: "Fast Fourier Transform (FFT) analysis via `AnalyserNode.getByteFrequencyData`.",
            defaultDiagnosis: "Visualizer render loop failure: Frequency buffer must be refreshed inside `requestAnimationFrame`.",
            nudge: "Connect your Master Gain to an `AnalyserNode`. Inside `requestAnimationFrame`, copy bytes to Uint8Array and draw bars on Canvas.",
            pinpoint: "In `src/visualizer.js`, call `analyser.getByteFrequencyData(dataArray)` and clear canvas with `clearRect` before drawing.",
            pattern: "const analyser = ctx.createAnalyser();\nanalyser.fftSize = 256;\nconst bufferLength = analyser.frequencyBinCount;\nconst dataArray = new Uint8Array(bufferLength);\nanalyser.getByteFrequencyData(dataArray);",
            quickPrompts: ["What does fftSize control?", "How to map frequency bins to log scale for human hearing?", "How to draw smooth waveform lines?"]
        },
        4: {
            title: "JSON Beat Preset Importer & Exporter",
            concept: "Pattern state serialization with validation schema.",
            defaultDiagnosis: "Preset serialization error: Exported JSON must match matrix track and step schema.",
            nudge: "Serialize active steps as boolean arrays per track: `{ bpm, tracks: { kick: [1,0,0...], snare: [...] } }`.",
            pinpoint: "Validate imported JSON has valid numeric BPM (40-240) and 16 boolean steps per track before loading.",
            pattern: "const presetJson = JSON.stringify({ bpm, pattern: gridState }, null, 2);\nconst blob = new Blob([presetJson], { type: 'application/json' });",
            quickPrompts: ["How to allow user file upload via `<input type='file'>`?", "How to encode audio presets in URL hashes?", "How to prevent XSS in preset names?"]
        }
    },

    // -------------------------------------------------------------
    // 7. GIT INTERNALS (Rust)
    // -------------------------------------------------------------
    "git-clone": {
        0: {
            title: "Git Repository Scaffolding (`git init`)",
            concept: "Creating `.git` folder structure: `objects/`, `refs/heads/`, and default `HEAD` ref.",
            defaultDiagnosis: "Repository initialization error: Standard `.git` directory layout is incomplete.",
            nudge: "A valid git repo requires: `.git/objects`, `.git/refs/heads`, and `.git/HEAD` containing `ref: refs/heads/main\\n`.",
            pinpoint: "In `src/main.rs`, check `init()`: Use `fs::create_dir_all(\".git/objects\")`, `fs::create_dir_all(\".git/refs/heads\")`, and `fs::write(\".git/HEAD\", \"ref: refs/heads/main\\n\")`.",
            pattern: "fs::create_dir_all(\".git/objects\")?;\nfs::create_dir_all(\".git/refs/heads\")?;\nfs::write(\".git/HEAD\", \"ref: refs/heads/main\\n\")?;",
            quickPrompts: ["What does the HEAD file point to in detached state?", "Why are Git object hashes split into 2-char directories?", "How to parse Git config files?"]
        },
        1: {
            title: "Reading & Decompressing Blobs (`cat-file -p`)",
            concept: "Zlib decompression and parsing Git object header: `blob <size>\\0<content>`.",
            defaultDiagnosis: "Object parsing error: Git object headers are null-byte (`\\0`) terminated.",
            nudge: "Git compresses all objects with Zlib. After decompressing, the raw bytes start with `<type> <size>\\0` followed by the actual content.",
            pinpoint: "In `src/objects.rs`, locate the null byte `\\0` in decompressed bytes. The header is `&bytes[..null_pos]`, and payload is `&bytes[null_pos + 1..]`.",
            pattern: "let mut decoder = ZlibDecoder::new(&file_bytes[..]);\nlet mut decompressed = Vec::new();\ndecoder.read_to_end(&mut decompressed)?;\nlet null_idx = decompressed.iter().position(|&b| b == 0).unwrap();\nlet content = &decompressed[null_idx + 1..];",
            quickPrompts: ["How does Git compute SHA-1 from the object header?", "How to handle tree objects vs blob objects in cat-file?", "How does zlib flate2 crate work in Rust?"]
        },
        2: {
            title: "Recursive Tree Objects & Directory Serialization",
            concept: "Git tree object encoding: `<mode> <name>\\0<20-byte-binary-sha1>`.",
            defaultDiagnosis: "Tree object format error: Tree entries store binary SHA-1 hashes, not 40-character hex strings.",
            nudge: "In Git tree objects, hashes are stored as raw 20-byte binary digests, directly following the null-terminated `<mode> <name>\\0`.",
            pinpoint: "In `src/tree.rs`, convert hex hash to raw 20 bytes with `hex::decode(hash)` before writing to tree payload.",
            pattern: "let mut entry = format!(\"100644 {}\\0\", filename).into_bytes();\nentry.extend_from_slice(&hex::decode(sha1_hex)?);\npayload.extend_from_slice(&entry);",
            quickPrompts: ["What is the mode string for directories (040000) vs executable files (100755)?", "Why are tree entries sorted alphabetically?", "How to parse nested subtrees?"]
        },
        3: {
            title: "Commit Objects with Author Timestamps & Parents",
            concept: "Commit formatting: `tree <sha>\\nparent <sha>\\nauthor ...\\ncommitter ...\\n\\n<message>\\n`.",
            defaultDiagnosis: "Commit object formatting error: Missing required parent pointers or empty line before message.",
            nudge: "A git commit object header specifies the root `tree`, zero or more `parent` lines, `author`, `committer`, and an empty line before message.",
            pinpoint: "In `src/commit.rs`, format author string: `author Name <email> <timestamp> +0000\\n`. Double newline before commit message.",
            pattern: "let content = format!(\"tree {}\\nparent {}\\nauthor {} <{}> {} +0000\\ncommitter {} <{}> {} +0000\\n\\n{}\\n\", tree_sha, parent_sha, name, email, now, name, email, now, message);",
            quickPrompts: ["How to handle initial root commit without parent?", "How are merge commits formatted with multiple parents?", "How does GPG signing attach to commit objects?"]
        },
        4: {
            title: "Branch Ref Pointers & Working Directory Checkout",
            concept: "Reading commit tree, restoring files to disk, and updating `.git/HEAD`.",
            defaultDiagnosis: "Checkout error: Files from target commit tree are not unpacked into working tree.",
            nudge: "Checking out a ref involves: 1. Resolving branch name to commit hash. 2. Resolving commit to tree hash. 3. Recursively unpacking blobs to files.",
            pinpoint: "In `src/checkout.rs`, update `.git/HEAD` to point to `refs/heads/<branch>` and write blob contents to disk.",
            pattern: "fs::write(\".git/HEAD\", format!(\"ref: refs/heads/{}\\n\", branch_name))?;\nunpack_tree_to_disk(&tree_sha, Path::new(\".\"))?;",
            quickPrompts: ["How to detect unstaged local modifications before checkout?", "What is detached HEAD state in Git?", "How does index/staging area relate to checkout?"]
        }
    },

    // -------------------------------------------------------------
    // 8. CI/CD WORKFLOW ENGINE (JavaScript)
    // -------------------------------------------------------------
    "cicd-runner": {
        0: {
            title: "Pipeline DAG Parser & Validation",
            concept: "Parsing YAML/JSON pipeline stages into a Directed Acyclic Graph and detecting cycles.",
            defaultDiagnosis: "Pipeline validation error: Circular dependencies or missing upstream steps must trigger validation error.",
            nudge: "A pipeline is valid only if its dependency graph has no cycles. Use Kahn's algorithm or DFS with recursion stack tracking to detect cycles.",
            pinpoint: "In `src/pipeline.js`, validate that all `needs: ['step_name']` references exist and that no step directly or indirectly depends on itself.",
            pattern: "function hasCycle(graph) {\n    const visited = new Set(), inStack = new Set();\n    function dfs(node) {\n        if (inStack.has(node)) return true;\n        if (visited.has(node)) return false;\n        visited.add(node); inStack.add(node);\n        for (const neighbor of graph[node] || []) {\n            if (dfs(neighbor)) return true;\n        }\n        inStack.delete(node);\n        return false;\n    }\n    return Object.keys(graph).some(dfs);\n}",
            quickPrompts: ["How to compute parallel execution stages using topological sort?", "How to validate step timeout formats?", "How to handle step conditional 'if' expressions?"]
        },
        1: {
            title: "Docker Daemon Client & Ephemeral Container Lifecycle",
            concept: "Interfacing with Docker Unix domain socket to pull images, create containers, and stream logs.",
            defaultDiagnosis: "Container lifecycle error: Ephemeral sandboxes must be cleaned up (`remove: true`) after execution.",
            nudge: "Each CI job runs in an isolated ephemeral container. Use Docker Engine REST API or Dockerode to create, start, wait, and auto-remove.",
            pinpoint: "In `src/docker.js`, pass `HostConfig: { AutoRemove: true }` so containers don't leak disk space on the host.",
            pattern: "const container = await docker.createContainer({\n    Image: 'node:18-alpine',\n    Cmd: ['sh', '-c', step.run],\n    HostConfig: { AutoRemove: true }\n});\nawait container.start();",
            quickPrompts: ["How to connect to Docker socket on Windows named pipe?", "How to limit container memory and CPU cgroups?", "How to bind mount project source code safely?"]
        },
        2: {
            title: "Pipeline Step DAG Execution with Exit Code Traps",
            concept: "Sequential and concurrent step execution with non-zero exit code failure propagation.",
            defaultDiagnosis: "Pipeline execution failure: Non-zero exit code must halt downstream dependent stages.",
            nudge: "If step `build` exits with code 1, downstream step `test` (which depends on `build`) must be skipped and the job marked failed.",
            pinpoint: "In `src/executor.js`, inspect container exit code with `await container.wait()`. If `StatusCode !== 0`, abort pending dependents.",
            pattern: "const status = await container.wait();\nif (status.StatusCode !== 0) {\n    pipelineState.failedSteps.add(step.id);\n    skipDependents(step.id);\n}",
            quickPrompts: ["How to implement `continue-on-error: true` in CI steps?", "How to enforce step timeouts?", "How to capture environment variable exports across steps?"]
        },
        3: {
            title: "Live Streaming Container STDOUT/STDERR via WebSockets",
            concept: "Multiplexing Docker log stream (8-byte header frames) and broadcasting to connected browser clients.",
            defaultDiagnosis: "Log stream demuxing error: Docker logs include an 8-byte binary header per chunk.",
            nudge: "Docker multiplexes stdout/stderr into chunks with an 8-byte header (byte 0: stream type 1=stdout, 2=stderr; bytes 4-7: frame length).",
            pinpoint: "In `src/logs.js`, strip the 8-byte header or use `dockerode.modem.demuxStream(stream, stdout, stderr)` before sending to WebSocket.",
            pattern: "const stream = await container.logs({ follow: true, stdout: true, stderr: true });\ncontainer.modem.demuxStream(stream, clientWsStream, clientWsStream);",
            quickPrompts: ["What is ANSI escape color code handling in web terminals?", "How to buffer logs for reconnecting clients?", "How to throttle high-frequency log lines?"]
        },
        4: {
            title: "Job Matrix Fan-Out & Artifact Storage",
            concept: "Matrix expansion (e.g. node: [16, 18, 20] x os: [ubuntu, alpine]) and archiving build outputs.",
            defaultDiagnosis: "Matrix expansion failure: Matrix variables must generate distinct parallel job execution contexts.",
            nudge: "Compute the Cartesian product of all matrix keys to generate independent job definitions.",
            pinpoint: "In `src/matrix.js`, expand combinations: `[{ node: 16, os: 'alpine' }, { node: 18, os: 'alpine' }, ...]` and queue concurrently.",
            pattern: "function cartesianProduct(matrix) {\n    return Object.entries(matrix).reduce((acc, [key, values]) => {\n        return acc.flatMap(comb => values.map(val => ({ ...comb, [key]: val })));\n    }, [{}]);\n}",
            quickPrompts: ["How to store step artifacts (tar/zip)?", "How to set GitHub commit status check API from CI runner?", "How to implement matrix fail-fast?"]
        }
    }
};

/**
 * Expert Heuristic Diagnostic Engine
 * Intelligently matches:
 * 1. Specific user query (Q&A / chat)
 * 2. Specific failing test assertion
 * 3. Milestone production specification rules
 * 4. Code structure and uncompleted TODOs with actionable guidance
 */
function analyzeWithExpertHeuristics({
    projectId = "redis-clone",
    projectTitle = "Systems Project",
    language = "javascript",
    milestoneIndex = 0,
    milestoneTitle = "Milestone 1",
    milestoneObjective = "",
    specRules = [],
    testCases = [],
    allFiles = [],
    activeFileName = "main.rs",
    userCode = "",
    testResults = null,
    userQuery = "",
    hintLevel = 1
}) {
    const code = (userCode || "").trim();
    const failedStep = testResults?.steps?.find(s => !s.passed) || null;
    const testName = failedStep?.name || "";
    const testOutput = failedStep?.output || testResults?.error || "";
    const query = (userQuery || "").toLowerCase().trim();

    // Find project entry in knowledge base
    const pid = (projectId || "").toLowerCase();
    const trackKey = Object.keys(TRACK_KNOWLEDGE).find(k => pid.includes(k) || k.includes(pid)) || "redis-clone";
    const track = TRACK_KNOWLEDGE[trackKey] || {};
    const milestoneInfo = track[milestoneIndex] || track[0] || {};

    // -------------------------------------------------------------
    // INTENT 1: Specific User Question Matching
    // -------------------------------------------------------------
    if (query) {
        // Query: "why did test fail?"
        if (query.includes("why") && (query.includes("fail") || query.includes("test") || query.includes("error"))) {
            if (failedStep) {
                const targetL = findLineNumber(code, [testName.toLowerCase(), "todo", "error", "return", "write"]);
                return {
                    diagnosis: `Failing Test: '${testName}' failed with: ${testOutput}`,
                    level: hintLevel,
                    targetLine: targetL,
                    hint: hintLevel === 1
                        ? `The test harness expects: ${milestoneInfo.concept || milestoneObjective}. Your code did not return the expected output.`
                        : hintLevel === 2
                        ? (milestoneInfo.pinpoint || `Check the implementation for ${testName}. The runner verifies conformance against Milestone ${milestoneIndex + 1} specs.`)
                        : (milestoneInfo.pattern || "Review the milestone rules in the Spec Guide tab."),
                    codePattern: hintLevel === 3 ? (milestoneInfo.pattern || "") : "",
                    quickPrompts: ["Give me a subtle hint", "Check my code for edge cases", "Explain milestone architecture"]
                };
            }
        }

        // Query: "edge cases"
        if (query.includes("edge case") || query.includes("cases")) {
            return {
                diagnosis: `Edge Cases for ${milestoneTitle}: Handle boundary, concurrency, and format constraints.`,
                level: hintLevel,
                targetLine: null,
                hint: `Key edge cases to account for:\n1. Empty inputs or malformed buffer payloads\n2. Delimiter framing and partial network reads\n3. Concurrency race conditions on shared state\n4. Graceful error propagation rather than crashing/panicking.`,
                codePattern: hintLevel === 3 ? (milestoneInfo.pattern || "") : "",
                quickPrompts: ["Why did my test fail?", "Give me a subtle hint", "Show code pattern"]
            };
        }

        // Query: "architecture" / "explain milestone"
        if (query.includes("architect") || query.includes("explain") || query.includes("objective")) {
            return {
                diagnosis: `Milestone ${milestoneIndex + 1} Architecture: ${milestoneInfo.title || milestoneTitle}`,
                level: hintLevel,
                targetLine: null,
                hint: `${milestoneInfo.concept || milestoneObjective}\n\nKey Requirement: Implement this subsystem modularly and ensure clean separation of concerns before advancing to Stage ${milestoneIndex + 2}.`,
                codePattern: hintLevel === 3 ? (milestoneInfo.pattern || "") : "",
                quickPrompts: ["Why did my test fail?", "What edge cases exist?", "Show code pattern"]
            };
        }

        // Query: "hint" or "nudge"
        if (query.includes("hint") || query.includes("nudge") || query.includes("help")) {
            return {
                diagnosis: `Contextual Hint for ${milestoneTitle}`,
                level: 1,
                targetLine: findLineNumber(code, ["todo", "function", "impl", "class", "fn"]),
                hint: milestoneInfo.nudge || `Review the rules in the Spec Guide. You need to implement the core logic for ${milestoneInfo.title}.`,
                codePattern: "",
                quickPrompts: ["Pinpoint the bug", "Show code pattern", "Why did my test fail?"]
            };
        }
    }

    // -------------------------------------------------------------
    // INTENT 2: Check for Specific Failing Condition Rules
    // -------------------------------------------------------------
    if (milestoneInfo.failingConditions && milestoneInfo.failingConditions.length > 0) {
        for (const cond of milestoneInfo.failingConditions) {
            if (cond.match.test(testName) || cond.match.test(testOutput) || cond.match.test(query)) {
                return {
                    diagnosis: cond.diagnosis,
                    level: hintLevel,
                    targetLine: findLineNumber(code, cond.lineKeywords || []),
                    hint: hintLevel === 1 ? cond.nudge : (hintLevel === 2 ? cond.pinpoint : cond.pattern),
                    codePattern: hintLevel === 3 ? (cond.pattern || "") : "",
                    quickPrompts: milestoneInfo.quickPrompts || ["Why did my test fail?", "Give me a subtle hint", "Check edge cases"]
                };
            }
        }
    }

    // -------------------------------------------------------------
    // INTENT 3: Incomplete Starter Code / TODO Analysis (Context-Aware)
    // -------------------------------------------------------------
    const hasTodo = /TODO[:\s]+implement/i.test(code) || code.includes("# TODO") || code.includes("// TODO");
    if (hasTodo) {
        const lineIdx = code.split("\n").findIndex(l => /TODO/i.test(l));
        const lineNum = lineIdx !== -1 ? lineIdx + 1 : null;

        return {
            diagnosis: `Milestone ${milestoneIndex + 1} (${milestoneInfo.title || milestoneTitle}) incomplete: Active TODO placeholder detected${lineNum ? ` at line ${lineNum}` : ''}.`,
            level: hintLevel,
            targetLine: lineNum,
            hint: hintLevel === 1
                ? (milestoneInfo.nudge || `Milestone ${milestoneIndex + 1} requires replacing the placeholder stub with real domain logic: ${milestoneInfo.concept || milestoneObjective}.`)
                : hintLevel === 2
                ? (milestoneInfo.pinpoint || `Inspect ${lineNum ? `line ${lineNum}` : 'the active file'}. Replace the default placeholder return with logic satisfying the milestone assertions.`)
                : (milestoneInfo.pattern || "Implement the required data structure and return types."),
            codePattern: hintLevel === 3 ? (milestoneInfo.pattern || "") : "",
            quickPrompts: milestoneInfo.quickPrompts || [
                "What is the first function I should implement?",
                "What edge cases should I consider?",
                "Explain milestone architecture"
            ]
        };
    }

    // -------------------------------------------------------------
    // INTENT 4: General Milestone Diagnostic
    // -------------------------------------------------------------
    return {
        diagnosis: testOutput 
            ? `Assertion failed in ${testName || 'Milestone Tests'}: ${testOutput}`
            : `Specification check for Milestone ${milestoneIndex + 1}: ${milestoneInfo.title || milestoneTitle}`,
        level: hintLevel,
        targetLine: findLineNumber(code, ["error", "fn ", "function ", "class ", "def "]),
        hint: hintLevel === 1
            ? (milestoneInfo.nudge || `Review the milestone rules. Make sure your logic conforms to ${milestoneInfo.concept || milestoneObjective}.`)
            : hintLevel === 2
            ? (milestoneInfo.pinpoint || `Verify that your implementation returns the exact schema expected by the test cases in the bottom drawer.`)
            : (milestoneInfo.pattern || "Ensure all functions export proper signatures and handle error boundaries."),
        codePattern: hintLevel === 3 ? (milestoneInfo.pattern || "") : "",
        quickPrompts: milestoneInfo.quickPrompts || [
            "Why did my test fail?",
            "Give me a subtle hint",
            "Explain milestone architecture"
        ]
    };
}

/**
 * Locate the most relevant line number in user code, or null if not found
 */
function findLineNumber(code, keywords = []) {
    if (!code) return null;
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        for (const kw of keywords) {
            if (kw && line.includes(kw.toLowerCase())) {
                return i + 1;
            }
        }
    }
    return null;
}

module.exports = {
    getAiMentorAdvice
};

