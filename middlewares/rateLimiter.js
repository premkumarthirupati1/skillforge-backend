const rateLimit = require('express-rate-limit');

/**
 * 1. Global Rate Limiter
 * Applied across all public and protected API routes to protect against DoS attacks & scrapers.
 * Limit: 200 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
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
 * Limit: 10 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
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
 * Limit: 15 transactions per 10 minutes per IP
 */
const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 15,
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
 * Limit: 60 queries per minute per IP
 */
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
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
 * Limit: 20 attempts per 15 minutes per IP
 */
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
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

