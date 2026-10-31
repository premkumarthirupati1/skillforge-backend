/**
 * Centralized AI Request and Latency Logger
 */

const logs = [];
const MAX_LOG_HISTORY = 200;

function logAiRequest({
    handler,
    route,
    model,
    parameters,
    promptLength,
    responseLength,
    latencyMs,
    success,
    error = null
}) {
    const entry = {
        timestamp: new Date().toISOString(),
        handler,
        route,
        model,
        parameters: {
            temperature: parameters?.temperature,
            max_tokens: parameters?.max_tokens
        },
        promptLength,
        responseLength,
        latencyMs,
        success,
        error: error ? error.message || String(error) : null
    };

    logs.unshift(entry);
    if (logs.length > MAX_LOG_HISTORY) {
        logs.pop();
    }

    const statusBadge = success ? "SUCCESS" : "FAILED";
    console.log(`[AI-LOG] [${statusBadge}] ${handler.toUpperCase()} | model=${model} | latency=${latencyMs}ms | promptLen=${promptLength} | respLen=${responseLength || 0}`);
    if (error) {
        console.error(`[AI-LOG] Error in ${handler}:`, error);
    }

    return entry;
}

function getRecentLogs(limit = 50) {
    return logs.slice(0, limit);
}

module.exports = {
    logAiRequest,
    getRecentLogs
};
