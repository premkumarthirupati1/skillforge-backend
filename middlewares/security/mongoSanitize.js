/**
 * NoSQL Injection Protection Middleware
 * Recursively scans and sanitizes req.body, req.query, and req.params
 * to strip keys containing MongoDB query operators (starting with '$')
 * or prototype/path traversal operators (containing '.').
 */
function sanitizeObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            obj[i] = sanitizeObject(obj[i], `${path}[${i}]`);
        }
        return obj;
    }

    for (const key of Object.keys(obj)) {
        // Check for MongoDB operator injection ($gt, $ne, $where, etc.) or object path traversal (.)
        if (key.startsWith('$') || key.includes('.')) {
            console.warn(`[SECURITY WARNING] Stripped potentially dangerous NoSQL injection key: "${key}" at path "${path}"`);
            delete obj[key];
        } else {
            obj[key] = sanitizeObject(obj[key], path ? `${path}.${key}` : key);
        }
    }

    return obj;
}

const mongoSanitizer = (req, res, next) => {
    try {
        if (req.body) {
            req.body = sanitizeObject(req.body, 'body');
        }
        if (req.query) {
            req.query = sanitizeObject(req.query, 'query');
        }
        if (req.params) {
            req.params = sanitizeObject(req.params, 'params');
        }
        next();
    } catch (err) {
        console.error('[SECURITY ERROR] Error during NoSQL sanitization:', err);
        next();
    }
};

module.exports = { mongoSanitizer, sanitizeObject };
