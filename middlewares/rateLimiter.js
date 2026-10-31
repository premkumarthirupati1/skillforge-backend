const rateLimit = require('express-rate-limit');

/**
 * 1. Global Rate Limiter
 * Applied across all public and protected API routes to protect against DoS attacks & scrapers.
 * Limit: 300 requests per 15 minutes per IP (elevated in test mode)
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' ? 2000 : 300,
    standardHeaders: 'draft-7', // Sends RateLimit-* headers
    legacyHeaders: false,
    message: {
        success: false,
        status: 429,
        message: "Too many requests from this IP address. Please slow down and try again in 15 minutes."
    }
});

/**
 * 2. Authentication Rate Limiter
 * Applied to login, signup, password-reset endpoints.
 * Protects against brute-force password guessing, credential stuffing, and SendGrid email quota abuse.
 * In development/test mode, generous headroom allows full security test suites to run.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' ? 500 : (process.env.AUTH_RATE_LIMIT ? parseInt(process.env.AUTH_RATE_LIMIT, 10) : 60),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        status: 429,
        message: "Too many authentication attempts. For security reasons, please wait 15 minutes before trying again."
    }
});

/**
 * 3. Payment Rate Limiter
 * Applied to payment order creation and verification.
 * Protects against automated card testing, denial-of-wallet, and gateway order flooding.
 * Limit: 20 transactions per 10 minutes per IP
 */
const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        status: 429,
        message: "Too many payment transaction attempts. Please wait 10 minutes before retrying."
    }
});

/**
 * 4. Search Rate Limiter
 * Applied to autocomplete and full-text course search.
 * Protects against aggressive search scrapers and database CPU spikes.
 * Limit: 100 queries per minute per IP
 */
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        status: 429,
        message: "Search query rate limit exceeded. Please wait a moment."
    }
});

/**
 * 5. OTP Rate Limiter
 * Applied to OTP verification and resend endpoints.
 * Limit: 30 attempts per 15 minutes per IP
 */
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        status: 429,
        message: "Too many verification attempts. Please wait 15 minutes before trying again."
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    otpLimiter,
    paymentLimiter,
    searchLimiter
};
