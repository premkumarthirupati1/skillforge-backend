const redisModule = require('./redisClient');
const client = redisModule.default || redisModule;
/**
 * Generic wrapper for caching any DB query
 * @param {string} key - The Redis key
 * @param {number} ttl - Time to live in seconds
 * @param {function} fetchFunction - The original DB logic
 */

exports.getCachedData = async (key, ttl, fetchFunction) => {
    const cachedData = await client.get(key);
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    const freshData = await fetchFunction();
    await client.setEx(key, ttl, JSON.stringify(freshData));
    return freshData;
}