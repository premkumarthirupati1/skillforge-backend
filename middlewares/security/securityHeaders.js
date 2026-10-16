const helmet = require('helmet');

/**
 * Enterprise HTTP Security Headers Middleware
 * Configures Helmet with a production-grade Content-Security-Policy,
 * HSTS, Clickjacking defense, MIME-sniffing protection, and cross-origin resource sharing.
 */
const configureSecurityHeaders = (allowedOrigins = []) => {
    const connectOrigins = [
        "'self'",
        ...allowedOrigins,
        "https://api.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://*.razorpay.com"
    ];

    return helmet({
        // 1. Cross-Origin-Resource-Policy: cross-origin allows frontend to load images/videos from /uploads
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

        // 2. Clickjacking Protection
        frameguard: { action: "sameorigin" },

        // 3. DNS Prefetch Control
        dnsPrefetchControl: { allow: false },

        // 4. Force HTTPS via HSTS (Strict-Transport-Security)
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },

        // 5. Prevent MIME Sniffing
        noSniff: true,

        // 6. Referrer Policy
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },

        // 7. XSS Filter (Modern browsers standard: 0, relying on CSP)
        xssFilter: false,

        // 8. Robust Content Security Policy
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'", // Needed for React runtime hydration
                    "https://checkout.razorpay.com",
                    "https://www.youtube.com",
                    "https://s.ytimg.com"
                ],
                scriptSrcElem: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://checkout.razorpay.com",
                    "https://www.youtube.com",
                    "https://s.ytimg.com"
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com"
                ],
                fontSrc: [
                    "'self'",
                    "data:",
                    "https://fonts.gstatic.com"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https://images.unsplash.com",
                    "https://res.cloudinary.com",
                    "https://*.googleusercontent.com"
                ],
                mediaSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https://commondatastorage.googleapis.com",
                    "https://res.cloudinary.com"
                ],
                frameSrc: [
                    "'self'",
                    "https://api.razorpay.com",
                    "https://checkout.razorpay.com",
                    "https://www.youtube.com",
                    "https://www.youtube-nocookie.com"
                ],
                connectSrc: connectOrigins,
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
            }
        }
    });
};

module.exports = { configureSecurityHeaders };
