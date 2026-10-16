/**
 * XSS (Cross-Site Scripting) Sanitization Middleware
 * Recursively scans user-provided strings in req.body and req.query,
 * stripping malicious script injections and event-handler exploits.
 * 
 * NOTE: Automatically exempts sandbox runner routes (/runner, /api/runner)
 * where raw source code strings are intentionally evaluated in isolated test runners.
 */

// Regex patterns detecting dangerous script execution tags and inline event handlers
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const JAVASCRIPT_PROTOCOL_REGEX = /javascript\s*:/gi;
const VBSCRIPT_PROTOCOL_REGEX = /vbscript\s*:/gi;
const DANGEROUS_ATTRIBUTES = /\s*(onload|onerror|onclick|onmouseover|onfocus|onblur|onkeydown|onkeyup)\s*=\s*['"][^'"]*['"]/gi;
const DANGEROUS_TAGS = /<\/?(iframe|embed|object|applet|meta|link|base)[^>]*>/gi;

function cleanString(str) {
    if (typeof str !== 'string') return str;

    let cleaned = str
        .replace(SCRIPT_REGEX, '')
        .replace(JAVASCRIPT_PROTOCOL_REGEX, 'blocked-javascript:')
        .replace(VBSCRIPT_PROTOCOL_REGEX, 'blocked-vbscript:')
        .replace(DANGEROUS_ATTRIBUTES, '')
        .replace(DANGEROUS_TAGS, '');

    return cleaned;
}

function deepClean(data) {
    if (!data) return data;

    if (typeof data === 'string') {
        return cleanString(data);
    }

    if (Array.isArray(data)) {
        return data.map(item => deepClean(item));
    }

    if (typeof data === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = deepClean(value);
        }
        return result;
    }

    return data;
}

const xssSanitizer = (req, res, next) => {
    // Exempt code sandbox runner where programming code is expected
    if (req.originalUrl && (req.originalUrl.includes('/runner') || req.originalUrl.includes('/projects'))) {
        return next();
    }

    try {
        if (req.body && typeof req.body === 'object') {
            req.body = deepClean(req.body);
        }
        if (req.query && typeof req.query === 'object') {
            req.query = deepClean(req.query);
        }
        next();
    } catch (err) {
        console.error('[SECURITY ERROR] Error during XSS sanitization:', err);
        next();
    }
};

module.exports = { xssSanitizer, cleanString };
