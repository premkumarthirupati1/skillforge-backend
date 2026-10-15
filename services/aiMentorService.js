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
    const endpoint = "https://openrouter.ai/api/v1/chat/completions";

    const failedStep = testResults?.steps?.find(s => !s.passed) || (testResults?.error ? { name: "Runtime Error", output: testResults.error } : null);

    const systemPrompt = `You are "Forge Copilot", an elite Staff Engineer and coding mentor for SkillForge (a hands-on developer platform).
You guide developers building production-grade software (Redis in Rust, Raft in Go, Local RAG in Python, API Gateways, Git Internals).

PEDAGOGICAL RULES:
1. NEVER output the full solution code. Guide the learner to discover and fix the bug themselves.
2. Match the requested Hint Level strictly:
   - Level 1 (Conceptual Nudge): Explain the architectural concept or invariant that was violated. Ask a reflective question.
   - Level 2 (Pinpoint Bug): Point directly to the function, struct, or file location causing the issue and explain why it behaves unexpectedly.
   - Level 3 (Structural Pattern): Provide a small, idiomatic code pattern or skeleton showing how to approach the fix, without writing the whole file.
3. Be concise, technical, and empathetic. Output ONLY a valid JSON object with the following structure:
{
  "diagnosis": "Short 1-2 sentence explanation of what went wrong or direct answer to the query",
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
${userCode ? userCode.slice(0, 3500) : "// Starter code"}
\`\`\`

Test Results:
${failedStep ? `Failing Assertion: ${failedStep.name}\nDiagnostic Output: ${failedStep.output}` : "All tests currently passing or not yet executed."}

User Question: ${userQuery || "Please analyze why my tests failed and provide guidance."}
Requested Hint Level: Level ${hintLevel} (1=Nudge, 2=Pinpoint, 3=Code Structure)

Output strictly valid JSON with keys: "diagnosis", "hint", "targetLine", "codePattern", "quickPrompts".`;

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
            temperature: 0.3,
            max_tokens: 800,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    try {
        const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch (e) {
        return {
            diagnosis: rawContent.slice(0, 200),
            hint: rawContent,
            targetLine: null,
            codePattern: "",
            quickPrompts: ["Explain milestone objective", "How do I fix this error?"]
        };
    }
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

    const systemPrompt = `You are "Forge Copilot", an elite Staff Engineer and coding mentor for SkillForge.
You guide developers building production-grade software (Redis, Raft, Local RAG, API Gateway, Git, WebAudio, Canvas).

PEDAGOGICAL RULES:
1. NEVER output the full solution code. Guide the learner to understand the bug themselves.
2. Match the requested Hint Level strictly:
   - Level 1 (Conceptual Nudge): Explain the architectural concept or invariant that was violated. Ask a reflective question.
   - Level 2 (Pinpoint Bug): Point directly to the function, struct, or file location causing the issue and explain why it behaves unexpectedly.
   - Level 3 (Structural Pattern): Provide a small, idiomatic code pattern or skeleton showing how to approach the fix, without writing the whole file.
3. If the user asked a specific question, answer it directly with high technical precision.
4. Return strictly valid JSON:
{
  "diagnosis": "Short 1-2 sentence explanation of what went wrong or answers the query",
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

Return ONLY valid JSON.`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n" + promptText }] }],
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
            quickPrompts: ["Explain milestone objective", "How do I fix this error?"]
        };
    }
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
        }
    }
};

/**
 * Expert Heuristic Diagnostic Engine
 * Intelligently matches:
 * 1. Specific user query (Q&A / chat)
 * 2. Specific failing test assertion
 * 3. Specific project track and milestone stage
 * 4. Code structure and uncompleted TODOs with actionable guidance
 */
function analyzeWithExpertHeuristics({
    projectId = "redis-clone",
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
                return {
                    diagnosis: `Failing Test: '${testName}' failed with: ${testOutput}`,
                    level: hintLevel,
                    targetLine: findLineNumber(code, [testName.toLowerCase(), "todo", "error", "return"]),
                    hint: hintLevel === 1
                        ? `The test harness expects: ${milestoneInfo.concept || milestoneObjective}. Your code did not return the expected output.`
                        : hintLevel === 2
                        ? (milestoneInfo.pinpoint || `Check the implementation for ${testName}. The runner verifies conformance against Milestone ${milestoneIndex + 1} specs.`)
                        : (milestoneInfo.pattern || "Review the milestone rules in the Spec Guide tab."),
                    codePattern: milestoneInfo.pattern || "",
                    quickPrompts: ["Give me a subtle hint", "Check my code for edge cases", "Explain milestone architecture"]
                };
            }
        }

        // Query: "edge cases"
        if (query.includes("edge case") || query.includes("cases")) {
            return {
                diagnosis: `Edge Cases for ${milestoneTitle}: Handle boundary, concurrency, and format constraints.`,
                level: hintLevel,
                targetLine: 1,
                hint: `Key edge cases to account for:\n1. Empty inputs or malformed buffer payloads\n2. Delimiter framing and partial network reads\n3. Concurrency race conditions on shared state\n4. Graceful error propagation rather than crashing/panicking.`,
                codePattern: milestoneInfo.pattern || "",
                quickPrompts: ["Why did my test fail?", "Give me a subtle hint", "Show code pattern"]
            };
        }

        // Query: "architecture" / "explain milestone"
        if (query.includes("architect") || query.includes("explain") || query.includes("objective")) {
            return {
                diagnosis: `Milestone ${milestoneIndex + 1} Architecture: ${milestoneInfo.title || milestoneTitle}`,
                level: hintLevel,
                targetLine: 1,
                hint: `${milestoneInfo.concept || milestoneObjective}\n\nKey Requirement: Implement this subsystem modularly and ensure clean separation of concerns before advancing to Stage ${milestoneIndex + 2}.`,
                codePattern: milestoneInfo.pattern || "",
                quickPrompts: ["Why did my test fail?", "What edge cases exist?", "Show code pattern"]
            };
        }

        // Query: "hint" or "nudge"
        if (query.includes("hint") || query.includes("nudge") || query.includes("help")) {
            return {
                diagnosis: `Contextual Hint for ${milestoneTitle}`,
                level: 1,
                targetLine: findLineNumber(code, ["todo", "function", "impl", "class"]),
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
                    codePattern: cond.pattern || "",
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
        const lineNum = lineIdx !== -1 ? lineIdx + 1 : 1;

        return {
            diagnosis: `Milestone ${milestoneIndex + 1} (${milestoneInfo.title || milestoneTitle}) incomplete: Active TODO placeholder detected at line ${lineNum}.`,
            level: hintLevel,
            targetLine: lineNum,
            hint: hintLevel === 1
                ? (milestoneInfo.nudge || `Milestone ${milestoneIndex + 1} requires replacing the placeholder stub with real domain logic: ${milestoneInfo.concept || milestoneObjective}.`)
                : hintLevel === 2
                ? (milestoneInfo.pinpoint || `Inspect line ${lineNum}. Replace the default placeholder return with logic satisfying the milestone assertions.`)
                : (milestoneInfo.pattern || "Implement the required data structure and return types."),
            codePattern: milestoneInfo.pattern || "",
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
        targetLine: findLineNumber(code, ["error", "fn", "function", "class", "def "]),
        hint: hintLevel === 1
            ? (milestoneInfo.nudge || `Review the milestone rules. Make sure your logic conforms to ${milestoneInfo.concept || milestoneObjective}.`)
            : hintLevel === 2
            ? (milestoneInfo.pinpoint || `Verify that your implementation returns the exact schema expected by the test cases in the bottom drawer.`)
            : (milestoneInfo.pattern || "Ensure all functions export proper signatures and handle error boundaries."),
        codePattern: milestoneInfo.pattern || "",
        quickPrompts: milestoneInfo.quickPrompts || [
            "Why did my test fail?",
            "Give me a subtle hint",
            "Explain milestone architecture"
        ]
    };
}

/**
 * Locate the most relevant line number in user code
 */
function findLineNumber(code, keywords = []) {
    if (!code) return 1;
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        for (const kw of keywords) {
            if (line.includes(kw.toLowerCase())) {
                return i + 1;
            }
        }
    }
    return 1;
}

module.exports = {
    getAiMentorAdvice
};
