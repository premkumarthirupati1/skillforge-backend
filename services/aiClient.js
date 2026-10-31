/**
 * Unified AI Client with Retries, Thinking Extraction, and History Sanitization
 */

const AI_CONFIG = require('../config/aiConfig');
const { logAiRequest } = require('./aiLogger');

/**
 * Strips reasoning / thinking blocks from text output.
 */
function stripThinkingTags(text) {
    if (!text || typeof text !== "string") return "";
    // Remove <think>...</think> including multiline
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Also remove markdown thinking blocks if present
    cleaned = cleaned.replace(/^\[Thinking Process\][\s\S]*?\n\n/i, '').trim();
    return cleaned;
}

/**
 * Extracts thinking process if present
 */
function extractThinking(text) {
    if (!text || typeof text !== "string") return null;
    const match = text.match(/<think>([\s\S]*?)<\/think>/i);
    return match ? match[1].trim() : null;
}

/**
 * Sanitizes and orders conversation history.
 * Maintains system message at index 0, followed by alternating user/assistant turns.
 * Trims oldest turns if exceeding limit.
 */
function sanitizeConversationHistory(systemPrompt, rawMessages = [], maxTurns = 16) {
    const sanitized = [];

    if (systemPrompt && typeof systemPrompt === "string") {
        sanitized.push({ role: "system", content: systemPrompt.trim() });
    }

    // Filter valid roles
    const validMessages = (rawMessages || []).filter(m => {
        return m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0;
    });

    // Trim to maxTurns preserving the most recent turns
    const recent = validMessages.slice(-maxTurns);

    // Ensure valid alternating sequence starting after system
    let lastRole = "system";
    for (const msg of recent) {
        // Strip any leaked think tags from saved history
        const cleanContent = stripThinkingTags(msg.content);
        if (!cleanContent) continue;

        // Prevent back-to-back same role if provider complains
        if (msg.role === lastRole && msg.role !== "system") {
            // Append to previous message content
            sanitized[sanitized.length - 1].content += `\n\n${cleanContent}`;
        } else {
            sanitized.push({
                role: msg.role,
                content: cleanContent
            });
            lastRole = msg.role;
        }
    }

    return sanitized;
}

/**
 * Call Chat Completion with retry logic and multi-provider failover
 */
async function callChatCompletion({
    handler = "general",
    route = "api",
    systemPrompt,
    messages = [],
    overrideConfig = {}
}) {
    const handlerConfig = AI_CONFIG.handlers[handler] || AI_CONFIG.handlers.general;
    let currentProviderKey = overrideConfig.provider || handlerConfig.provider;
    let currentProvider = AI_CONFIG.providers[currentProviderKey] || AI_CONFIG.providers.gemini;

    let currentModel = overrideConfig.model || handlerConfig.model;
    const temperature = overrideConfig.temperature !== undefined ? overrideConfig.temperature : handlerConfig.temperature;
    const max_tokens = overrideConfig.max_tokens || handlerConfig.max_tokens;
    const response_format = overrideConfig.response_format || undefined;

    const sanitizedMessages = sanitizeConversationHistory(
        systemPrompt,
        messages,
        AI_CONFIG.reliability.maxHistoryTurns
    );

    const payload = {
        model: currentModel,
        messages: sanitizedMessages,
        temperature,
        max_tokens
    };

    if (response_format) {
        payload.response_format = response_format;
    }

    const maxRetries = AI_CONFIG.reliability.maxRetries;
    let attempt = 0;
    const startTime = Date.now();
    let lastError = null;

    while (attempt <= maxRetries) {
        try {
            const endpoint = `${currentProvider.baseUrl}/chat/completions`;
            const headers = {
                "Authorization": `Bearer ${currentProvider.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://skillforge.dev",
                "X-Title": "SkillForge Copilot"
            };

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), handlerConfig.timeoutMs || 25000);

            const response = await fetch(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                // If failover provider available, switch provider
                if (handlerConfig.fallbackProvider && currentProviderKey !== handlerConfig.fallbackProvider) {
                    console.warn(`[AI-CLIENT] Provider ${currentProviderKey} failed (${response.status}). Switching to failover ${handlerConfig.fallbackProvider}`);
                    currentProviderKey = handlerConfig.fallbackProvider;
                    currentProvider = AI_CONFIG.providers[currentProviderKey];
                    currentModel = handlerConfig.fallbackModel || currentModel;
                    payload.model = currentModel;
                    attempt++;
                    continue;
                }
                throw new Error(`API error (${response.status}): ${errorText.slice(0, 300)}`);
            }

            const data = await response.json();
            const choice = data?.choices?.[0];

            // Detect if provider crashed mid-generation
            if (choice?.finish_reason === "error" || choice?.error) {
                const errMsg = choice?.error?.message || "Generation error from inference provider";
                if (handlerConfig.fallbackProvider && currentProviderKey !== handlerConfig.fallbackProvider) {
                    console.warn(`[AI-CLIENT] Choice error on ${currentModel}: ${errMsg}. Switching to fallback provider ${handlerConfig.fallbackProvider}`);
                    currentProviderKey = handlerConfig.fallbackProvider;
                    currentProvider = AI_CONFIG.providers[currentProviderKey];
                    currentModel = handlerConfig.fallbackModel || currentModel;
                    payload.model = currentModel;
                    attempt++;
                    continue;
                }
                throw new Error(`Inference engine error: ${errMsg}`);
            }

            const rawChoice = choice?.message;
            let content = rawChoice?.content || "";
            const reasoning = rawChoice?.reasoning || extractThinking(content);

            // Strip thinking tags from final content for display and storage
            content = stripThinkingTags(content);

            const latencyMs = Date.now() - startTime;
            logAiRequest({
                handler,
                route,
                model: `${currentProviderKey}/${payload.model}`,
                parameters: { temperature, max_tokens },
                promptLength: JSON.stringify(sanitizedMessages).length,
                responseLength: content.length,
                latencyMs,
                success: true
            });

            return {
                content,
                reasoning,
                modelUsed: `${currentProviderKey}:${payload.model}`,
                latencyMs
            };

        } catch (err) {
            lastError = err;
            attempt++;
            console.warn(`[AI-CLIENT] Attempt ${attempt} failed for handler ${handler} (${currentProviderKey}): ${err.message}`);

            if (attempt <= maxRetries) {
                // If fallback available, switch to fallback
                if (handlerConfig.fallbackProvider && currentProviderKey !== handlerConfig.fallbackProvider) {
                    console.warn(`[AI-CLIENT] Switching to fallback provider ${handlerConfig.fallbackProvider}`);
                    currentProviderKey = handlerConfig.fallbackProvider;
                    currentProvider = AI_CONFIG.providers[currentProviderKey];
                    currentModel = handlerConfig.fallbackModel || currentModel;
                    payload.model = currentModel;
                }
                const backoff = AI_CONFIG.reliability.initialRetryDelayMs * Math.pow(2, attempt - 1);
                await new Promise(r => setTimeout(r, backoff));
            }
        }
    }

    const latencyMs = Date.now() - startTime;
    logAiRequest({
        handler,
        route,
        model: `${currentProviderKey}/${payload.model}`,
        parameters: { temperature, max_tokens },
        promptLength: JSON.stringify(sanitizedMessages).length,
        responseLength: 0,
        latencyMs,
        success: false,
        error: lastError
    });

    throw lastError;
}

module.exports = {
    stripThinkingTags,
    extractThinking,
    sanitizeConversationHistory,
    callChatCompletion
};
