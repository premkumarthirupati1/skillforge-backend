const { connectRedis } = require('./redisClient');

/**
 * wrapper for caching any DB query with graceful fallback
 * @param {string} key - The Redis key
 * @param {number} ttl - Time to live in seconds
 * @param {function} fetchFunction - The original DB logic
 */
const getCachedData = async (key, ttl, fetchFunction) => {
    try {
        const client = await connectRedis();
        if (client && client.isOpen) {
            const cachedData = await client.get(key);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            const freshData = await fetchFunction();
            if (freshData !== undefined && freshData !== null) {
                await client.setEx(key, ttl, JSON.stringify(freshData));
            }
            return freshData;
        }
    } catch (err) {
        console.warn(`⚠️ Cache read/write error for key "${key}":`, err.message);
    }

    // Direct DB fallback if Redis is offline or fails
    return await fetchFunction();
};

const invalidateCache = async (key) => {
    try {
        const client = await connectRedis();
        if (client && client.isOpen) {
            await client.del(key);
        }
    } catch (err) {
        console.warn(`⚠️ Cache invalidation error for key "${key}":`, err.message);
    }
};

module.exports = { getCachedData, invalidateCache };