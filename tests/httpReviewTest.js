const http = require("http");

const payload = JSON.stringify({
    projectId: "collaborative-canvas",
    projectTitle: "Multiplayer Real-Time Canvas",
    language: "javascript",
    milestoneIndex: 0,
    milestoneTitle: "Infinite 2D Viewport",
    milestoneRules: ["Implement screenToWorld coordinate transform"],
    files: [{ name: "canvas.js", content: "function screenToWorld(x, y, zoom) { return { x: x / zoom, y: y / zoom }; }" }]
});

const req = http.request({
    hostname: "localhost",
    port: 3000,
    path: "/api/copilot/code-review",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
    }
}, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
        console.log("HTTP STATUS:", res.statusCode);
        try {
            const parsed = JSON.parse(data);
            console.log("SUCCESS:", parsed.success);
            console.log("GRADE:", parsed.review?.grade);
            console.log("SCORE:", parsed.review?.score);
            console.log("COMPLEXITY:", parsed.review?.complexity);
            console.log("SUMMARY:", parsed.review?.summary);
            console.log("SUGGESTIONS COUNT:", parsed.review?.suggestions?.length);
        } catch(e) {
            console.log("RAW BODY:", data);
        }
    });
});
req.on("error", err => console.error("ERR:", err.message));
req.write(payload);
req.end();
