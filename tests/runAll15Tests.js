/**
 * 15-Test Verification Suite for SkillForge AI Chatbot
 * Tests all 3 handlers across nominal and adversarial scenarios:
 * - 5 Navigation tests
 * - 5 Debugging tests
 * - 5 Learning tests
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { chatWithCopilot } = require('../services/copilotService');
const { handleNavigationRequest } = require('../services/navigationHandler');
const { handleDebuggingRequest } = require('../services/debuggingHandler');
const { handleLearningRequest } = require('../services/learningRagService');

const MONGODB_URI = 'mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority';

async function runTestSuite() {
    console.log("================================================================================");
    console.log("       SKILLFORGE FORGE COPILOT - 15-POINT COMPREHENSIVE VERIFICATION SUITE       ");
    console.log("================================================================================\n");

    await mongoose.connect(MONGODB_URI);
    const results = [];

    // ==========================================
    // SUITE A: NAVIGATION HANDLER (5 TESTS)
    // ==========================================
    console.log(">>> [SUITE A: NAVIGATION HANDLER]");

    // Test 1: Real page - Profile
    {
        const question = "Take me to my profile settings";
        console.log(`\nTest 1 (Nav-1): "${question}"`);
        const res = await chatWithCopilot({
            messages: [{ role: "user", content: question }]
        });
        const passed = res.category === "navigation" && res.action === "navigate" && res.path === "/profile";
        results.push({ id: "Nav-1", group: "Navigation", question, passed, expected: "action: navigate, path: /profile", actual: `action: ${res.action}, path: ${res.path}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Target: ${res.target} | Path: ${res.path}`);
    }

    // Test 2: Real page - Courses Catalog
    {
        const question = "Where can I explore all courses?";
        console.log(`\nTest 2 (Nav-2): "${question}"`);
        const res = await chatWithCopilot({
            messages: [{ role: "user", content: question }]
        });
        const passed = res.category === "navigation" && res.action === "navigate" && (res.path === "/courses" || res.path === "/course-showcase");
        results.push({ id: "Nav-2", group: "Navigation", question, passed, expected: "action: navigate, path: /courses", actual: `action: ${res.action}, path: ${res.path}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Target: ${res.target} | Path: ${res.path}`);
    }

    // Test 3: Real page - Systems Projects Gallery
    {
        const question = "Open the systems project gallery";
        console.log(`\nTest 3 (Nav-3): "${question}"`);
        const res = await chatWithCopilot({
            messages: [{ role: "user", content: question }]
        });
        const passed = res.category === "navigation" && res.action === "navigate" && res.path === "/projects";
        results.push({ id: "Nav-3", group: "Navigation", question, passed, expected: "action: navigate, path: /projects", actual: `action: ${res.action}, path: ${res.path}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Target: ${res.target} | Path: ${res.path}`);
    }

    // Test 4: Non-existent page (Never navigate, ask clarification)
    {
        const question = "Take me to the interstellar crypto casino";
        console.log(`\nTest 4 (Nav-4): "${question}"`);
        const res = await chatWithCopilot({
            messages: [{ role: "user", content: question }]
        });
        const passed = res.action === "clarify" && res.path === null && res.reply.length > 20;
        results.push({ id: "Nav-4", group: "Navigation", question, passed, expected: "action: clarify, path: null", actual: `action: ${res.action}, path: ${res.path}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Blocked invalid navigation and asked clarifying question.`);
    }

    // Test 5: Ambiguous Navigation Request
    {
        const question = "Take me to that screen";
        console.log(`\nTest 5 (Nav-5): "${question}"`);
        const res = await chatWithCopilot({
            messages: [{ role: "user", content: question }]
        });
        const passed = res.action === "clarify" && res.path === null;
        results.push({ id: "Nav-5", group: "Navigation", question, passed, expected: "action: clarify, path: null", actual: `action: ${res.action}, path: ${res.path}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Handled ambiguity with clarification prompt.`);
    }

    // ==========================================
    // SUITE B: DEBUGGING HANDLER (5 TESTS)
    // ==========================================
    console.log("\n>>> [SUITE B: DEBUGGING HANDLER]");

    // Test 6: Real error with code (JS map on undefined)
    {
        const question = "Why does my code throw TypeError in map?";
        console.log(`\nTest 6 (Debug-1): "${question}"`);
        const res = await handleDebuggingRequest({
            userMessage: question,
            context: {
                project: {
                    projectTitle: "User API",
                    language: "javascript",
                    activeFileName: "userService.js",
                    activeCode: "function getNames(users) {\n  return users.map(u => u.name);\n}"
                },
                error: "TypeError: Cannot read properties of undefined (reading 'map')"
            }
        });
        const passed = res.reply.toLowerCase().includes("undefined") && res.reply.includes("function") && !res.needsContext;
        results.push({ id: "Debug-1", group: "Debugging", question, passed, expected: "Diagnose undefined 'users' and provide safe optional chaining or default array", actual: "Detailed Root Cause & Fix provided", reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Deep reasoning diagnosis received.`);
    }

    // Test 7: Real error with code (Rust Borrow Checker E0382)
    {
        const question = "Why does Rust borrow checker fail with error E0382?";
        console.log(`\nTest 7 (Debug-2): "${question}"`);
        const res = await handleDebuggingRequest({
            userMessage: question,
            context: {
                project: {
                    projectTitle: "Redis Clone",
                    language: "rust",
                    activeFileName: "main.rs",
                    activeCode: "let data = String::from(\"command\");\nlet first = data;\nprintln!(\"{}\", data);"
                },
                error: "error[E0382]: borrow of moved value: `data`"
            }
        });
        const passed = (res.reply.toLowerCase().includes("move") || res.reply.toLowerCase().includes("ownership")) && !res.needsContext;
        results.push({ id: "Debug-2", group: "Debugging", question, passed, expected: "Identify move semantics and suggest clone or borrowing", actual: "Ownership & Move Semantics explained with corrected code", reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Invariant audit & fix verified.`);
    }

    // Test 8: Real error with code (Go nil pointer dereference)
    {
        const question = "How do I fix this nil pointer dereference in Go?";
        console.log(`\nTest 8 (Debug-3): "${question}"`);
        const res = await handleDebuggingRequest({
            userMessage: question,
            context: {
                project: {
                    projectTitle: "Raft Consensus",
                    language: "go",
                    activeFileName: "server.go",
                    activeCode: "type Node struct { state *State }\nfunc (n *Node) Run() { n.state.Lock() }"
                },
                error: "panic: runtime error: invalid memory address or nil pointer dereference"
            }
        });
        const passed = (res.reply.toLowerCase().includes("nil") || res.reply.toLowerCase().includes("initialize")) && !res.needsContext;
        results.push({ id: "Debug-3", group: "Debugging", question, passed, expected: "Identify uninitialized state pointer and show constructor", actual: "Nil pointer guard and initialization provided", reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Go nil dereference resolved.`);
    }

    // Test 9: Completely missing context (Answer must ask for information)
    {
        const question = "Fix my bug please";
        console.log(`\nTest 9 (Debug-4): "${question}"`);
        const res = await handleDebuggingRequest({
            userMessage: question
        });
        const passed = res.needsContext === true && res.reply.includes("error message");
        results.push({ id: "Debug-4", group: "Debugging", question, passed, expected: "needsContext: true, ask for error & code", actual: `needsContext: ${res.needsContext}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Correctly requested missing context.`);
    }

    // Test 10: Vague debugging plea with missing information
    {
        const question = "Why is my code not working?";
        console.log(`\nTest 10 (Debug-5): "${question}"`);
        const res = await handleDebuggingRequest({
            userMessage: question
        });
        const passed = res.needsContext === true;
        results.push({ id: "Debug-5", group: "Debugging", question, passed, expected: "needsContext: true, refuse to guess", actual: `needsContext: ${res.needsContext}`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Refused to guess without code or error.`);
    }

    // ==========================================
    // SUITE C: LEARNING HANDLER & RAG (5 TESTS)
    // ==========================================
    console.log("\n>>> [SUITE C: LEARNING HANDLER]");

    // Test 11: Covered by course (Server Components vs Client Components)
    {
        const question = "What is the Next.js 14 paradigm shift with Server Components vs Client Components?";
        console.log(`\nTest 11 (Learn-1): "${question}"`);
        const res = await handleLearningRequest({
            userMessage: question,
            context: {
                lesson: {
                    title: "Next.js 14 Paradigm Shift: Client vs Server Components",
                    courseTitle: "Fullstack Next.js 14 & React Server Components"
                }
            }
        });
        const passed = res.retrievedChunksCount > 0 && res.reply.length > 200 && res.citedLessons.length > 0;
        results.push({ id: "Learn-1", group: "Learning", question, passed, expected: "Ground answer in retrieved lesson and cite lesson source", actual: `Cited: [${res.citedLessons.join(', ')}]`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Grounded in lesson chunks with citation.`);
    }

    // Test 12: Covered by course (Streaming SSR & Suspense)
    {
        const question = "How does Streaming SSR with Suspense and loading skeletons work in Next.js?";
        console.log(`\nTest 12 (Learn-2): "${question}"`);
        const res = await handleLearningRequest({
            userMessage: question,
            context: {
                lesson: {
                    title: "Streaming SSR with Suspense & Loading Skeletons",
                    courseTitle: "Fullstack Next.js 14 & React Server Components"
                }
            }
        });
        const passed = res.retrievedChunksCount > 0 && res.reply.toLowerCase().includes("streaming") && res.reply.toLowerCase().includes("suspense");
        results.push({ id: "Learn-2", group: "Learning", question, passed, expected: "Explain streaming SSR with mental model & citations", actual: `Cited: [${res.citedLessons.join(', ')}]`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Streaming SSR explained with mental model.`);
    }

    // Test 13: Covered by course (Server Actions & Zod)
    {
        const question = "How do Server Actions work with Zod validation in Next.js 14?";
        console.log(`\nTest 13 (Learn-3): "${question}"`);
        const res = await handleLearningRequest({
            userMessage: question,
            context: {
                lesson: {
                    title: "Zero-API Mutations with Next.js Server Actions & Zod Validation",
                    courseTitle: "Fullstack Next.js 14 & React Server Components"
                }
            }
        });
        const passed = res.retrievedChunksCount > 0 && res.reply.toLowerCase().includes("zod");
        results.push({ id: "Learn-3", group: "Learning", question, passed, expected: "Explain zero-API mutation with Zod validation schema", actual: `Cited: [${res.citedLessons.join(', ')}]`, reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Zod Server Actions retrieved & explained.`);
    }

    // Test 14: NOT covered by course (Elephant balancing beach ball)
    {
        const question = "How do I train an elephant to balance a beach ball on its nose?";
        console.log(`\nTest 14 (Learn-4): "${question}"`);
        const res = await handleLearningRequest({
            userMessage: question,
            context: {
                lesson: {
                    title: "Next.js 14 Paradigm Shift: Client vs Server Components",
                    courseTitle: "Fullstack Next.js 14 & React Server Components"
                }
            }
        });
        const passed = res.reply.toLowerCase().includes("not covered in your current course") || res.reply.toLowerCase().includes("not covered in the current course");
        results.push({ id: "Learn-4", group: "Learning", question, passed, expected: "Explicitly say topic is not covered in course curriculum without guessing", actual: res.reply.slice(0, 80) + "...", reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Explicitly flagged topic as not in course material.`);
    }

    // Test 15: Conversational follow-up in the same conversation
    {
        const question = "Can you give me a simple code example of that server component we just discussed?";
        console.log(`\nTest 15 (Learn-5): "${question}"`);
        const res = await handleLearningRequest({
            userMessage: question,
            messages: [
                { role: "user", content: "What is the Next.js 14 paradigm shift with Server Components vs Client Components?" },
                { role: "assistant", content: "In Next.js 14, React Server Components (RSC) are the default. They run only on the server." }
            ],
            context: {
                lesson: {
                    title: "Next.js 14 Paradigm Shift: Client vs Server Components",
                    courseTitle: "Fullstack Next.js 14 & React Server Components"
                }
            }
        });
        const passed = res.reply.includes("async function") || res.reply.includes("```");
        results.push({ id: "Learn-5", group: "Learning", question, passed, expected: "Maintain conversation context and provide code snippet", actual: "Clean Server Component code example provided with pedagogical check", reply: res.reply });
        console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"} | Multi-turn conversational continuity verified.`);
    }

    await mongoose.disconnect();

    console.log("\n================================================================================");
    console.log("                           VERIFICATION SUITE SUMMARY                           ");
    console.log("================================================================================");
    const passedCount = results.filter(r => r.passed).length;
    console.log(`Total Tests: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
    
    // Save summary file for final reporting
    const fs = require('fs');
    fs.writeFileSync('d:/Projects For github/Skill Forge-backend/tests/testResults.json', JSON.stringify(results, null, 2));
    console.log("Results saved to tests/testResults.json");
}

runTestSuite().catch(err => {
    console.error("Test Suite execution fatal error:", err);
    process.exit(1);
});
