/**
 * HTTP Parameter Pollution (HPP) Protection Middleware
 * Prevents attackers from sending duplicated query parameters
 * (e.g., ?difficulty=beginner&difficulty=advanced) to exploit type-confusion
 * bugs in controllers.
 * 
 * Legitimate array parameters (e.g., tags, skills) are whitelisted.
 */
const WHITELISTED_ARRAY_PARAMS = new Set([
    'tags',
    'skills',
    'categories',
    'topics',
    'ids'
]);

const hppSanitizer = (req, res, next) => {
    try {
        if (req.query && typeof req.query === 'object') {
            for (const [key, value] of Object.entries(req.query)) {
                if (Array.isArray(value) && !WHITELISTED_ARRAY_PARAMS.has(key)) {
                    // Take only the last parameter value
                    req.query[key] = value[value.length - 1];
                }
            }
        }
        next();
    } catch (err) {
        console.error('[SECURITY ERROR] Error during HPP sanitization:', err);
        next();
    }
};

module.exports = { hppSanitizer };
