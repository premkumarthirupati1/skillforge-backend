const { configureSecurityHeaders } = require('./securityHeaders');
const { mongoSanitizer } = require('./mongoSanitize');
const { xssSanitizer } = require('./xssSanitizer');
const { hppSanitizer } = require('./hppSanitizer');
const { securityAuditLogger } = require('./auditLogger');

/**
 * Applies the entire defense-in-depth security layer to an Express application:
 * 1. HTTP Security Headers (Helmet + Custom Content-Security-Policy + HSTS)
 * 2. Security Audit & Telemetry Logger
 * 3. NoSQL Injection Sanitization (Mongo operator scrub)
 * 4. XSS (Cross-Site Scripting) Payload Sanitization
 * 5. HTTP Parameter Pollution (HPP) Protection
 */
const applySecurityLayer = (app, options = {}) => {
    const { allowedOrigins = [] } = options;

    // 1. Disable X-Powered-By to prevent technology fingerprinting
    app.disable('x-powered-by');

    // 2. HTTP Security Headers
    app.use(configureSecurityHeaders(allowedOrigins));

    // 3. Security Audit Event Logger
    app.use(securityAuditLogger);

    // 4. Parameter Pollution Protection (applied before or after body parser)
    app.use(hppSanitizer);

    // 5. NoSQL & XSS Sanitization (applied after express.json() / express.urlencoded())
    // Returned as an array of middlewares to mount after body parsing
    return [
        mongoSanitizer,
        xssSanitizer
    ];
};

module.exports = {
    applySecurityLayer,
    configureSecurityHeaders,
    mongoSanitizer,
    xssSanitizer,
    hppSanitizer,
    securityAuditLogger
};
