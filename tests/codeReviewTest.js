/**
 * Verification Test for Automated AI Code Review Service
 */

const { generateCodeReview } = require('../services/codeReviewService');

async function runTest() {
    console.log("=== Testing AI Automated Code Review Service ===");

    const sampleFiles = [
        {
            name: "canvas.js",
            language: "javascript",
            content: `
class VectorCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.zoom = 1.0;
        this.pan = { x: 0, y: 0 };
        this.items = [];
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.pan.x) / this.zoom,
            y: (screenY - this.pan.y) / this.zoom
        };
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.pan.x, this.pan.y);
        this.ctx.scale(this.zoom, this.zoom);

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            this.ctx.fillStyle = item.color || '#38bdf8';
            this.ctx.fillRect(item.x, item.y, item.w, item.h);
        }

        this.ctx.restore();
    }
}
`
        }
    ];

    try {
        const review = await generateCodeReview({
            projectId: "collaborative-canvas",
            projectTitle: "Multiplayer Real-Time Code & Diagram Canvas",
            language: "javascript",
            milestoneIndex: 0,
            milestoneTitle: "Infinite HTML5 2D Vector Canvas Viewport",
            milestoneRules: [
                "Implement bidirectional screen-to-world coordinate transformations",
                "Ensure render loop respects zoom scale and pan offset",
                "Maintain 60fps rendering without memory leaks or unbounded allocations"
            ],
            files: sampleFiles,
            testResults: { status: "passed", total: 4, passed: 4 },
            userId: null
        });

        console.log("\n✅ Code Review Generated Successfully!");
        console.log(`Grade: ${review.grade} (Score: ${review.score}/100)`);
        console.log(`Summary: ${review.summary}`);
        console.log(`Time Complexity: ${review.complexity.time} | Space: ${review.complexity.space}`);
        console.log(`Complexity Analysis: ${review.complexity.analysis}`);
        console.log(`Categories:`, JSON.stringify(review.categories, null, 2));
        console.log(`Praise:`, review.praise);
        console.log(`Suggestions (${review.suggestions.length}):`, JSON.stringify(review.suggestions, null, 2));

        if (review.score >= 50 && review.complexity && review.categories) {
            console.log("\n>>> ALL ASSERTIONS PASSED <<<");
            process.exit(0);
        } else {
            console.error("Assertion failed: incomplete review structure");
            process.exit(1);
        }
    } catch (err) {
        console.error("❌ Test Failed:", err);
        process.exit(1);
    }
}

runTest();
