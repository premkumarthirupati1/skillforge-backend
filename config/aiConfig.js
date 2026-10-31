/**
 * Centralized AI Configuration for SkillForge
 * Keeps all endpoints, models, temperatures, and token ceilings in one place.
 */

require('dotenv').config();

const AI_CONFIG = {
    providers: {
        gemini: {
            baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
            apiKey: process.env.GEMINI_API_KEY || "",
            models: {
                primary: "gemini-3.8-flash",
                fast: "gemini-3.8-flash"
            }
        },
        deepseek: {
            baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
            apiKey: process.env.DEEPSEEK_API_KEY || "",
            models: {
                reasoner: "deepseek-v4-pro",
                fast: "deepseek-flash"
            }
        },
        openrouter: {
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || "",
            models: {
                reasoner: "deepseek/deepseek-r1",
                chat: "deepseek/deepseek-chat",
                large: "qwen/qwen-2.5-72b-instruct",
                coder: "qwen/qwen-2.5-coder-32b-instruct"
            }
        }
    },

    handlers: {
        // NOTE: Gemini free-tier quota exhausted (20 req/day limit). Using OpenRouter as primary.
        // Switch back to provider:"gemini" when quota resets or you upgrade to Gemini paid tier.
        router: {
            provider: "openrouter",
            model: "deepseek/deepseek-chat",
            fallbackProvider: "gemini",
            fallbackModel: "gemini-3.8-flash",
            temperature: 0.0,
            max_tokens: 300,
            timeoutMs: 10000
        },
        navigation: {
            provider: "openrouter",
            model: "deepseek/deepseek-chat",
            fallbackProvider: "gemini",
            fallbackModel: "gemini-3.8-flash",
            temperature: 0.1,
            max_tokens: 800,
            timeoutMs: 15000
        },
        debugging: {
            provider: "openrouter",
            model: "deepseek/deepseek-chat",
            fallbackProvider: "openrouter",
            fallbackModel: "deepseek/deepseek-r1",
            temperature: 0.1,
            max_tokens: 6000,
            timeoutMs: 45000,
            thinkingMode: true
        },
        learning: {
            provider: "openrouter",
            model: "deepseek/deepseek-chat",
            fallbackProvider: "gemini",
            fallbackModel: "gemini-3.8-flash",
            temperature: 0.35,
            max_tokens: 3000,
            timeoutMs: 25000
        },
        general: {
            provider: "openrouter",
            model: "deepseek/deepseek-chat",
            fallbackProvider: "gemini",
            fallbackModel: "gemini-3.8-flash",
            temperature: 0.3,
            max_tokens: 2000,
            timeoutMs: 20000
        },
        codeReview: {
            provider: "openrouter",
            model: "qwen/qwen-2.5-coder-32b-instruct",
            fallbackProvider: "openrouter",
            fallbackModel: "deepseek/deepseek-chat",
            temperature: 0.15,
            max_tokens: 4500,
            timeoutMs: 45000
        }
    },

    reliability: {
        maxRetries: 2,
        initialRetryDelayMs: 600,
        maxHistoryTurns: 16
    }
};

module.exports = AI_CONFIG;
