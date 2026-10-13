const { connectRedis } = require('./redisClient');

// L1 In-Memory Fast Cache (TTL based)
const memoryCache = new Map();

const getMemoryCache = (key) => {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        memoryCache.delete(key);
        return null;
    }
    return item.data;
};

const setMemoryCache = (key, data, ttlSeconds) => {
    memoryCache.set(key, {
        data,
        expiry: Date.now() + (ttlSeconds * 1000)
    });
};

const deleteMemoryCache = (key) => {
    if (key.includes('*')) {
        const prefix = key.replace('*', '');
        for (const k of memoryCache.keys()) {
            if (k.startsWith(prefix)) {
                memoryCache.delete(k);
            }
        }
    } else {
        memoryCache.delete(key);
    }
};

/**
 * High-performance tiered caching (L1 Memory + L2 Redis + DB Fallback)
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds (default: 3600s / 1hr)
 * @param {function} fetchFunction - Fallback DB query function
 */
const getCachedData = async (key, ttl = 3600, fetchFunction) => {
    // 1. Check L1 In-Memory Cache (Instant ~0.1ms)
    const memData = getMemoryCache(key);
    if (memData !== null && memData !== undefined) {
        return memData;
    }

    // 2. Check L2 Redis Cache (Fast ~1-3ms)
    try {
        const redisClient = await connectRedis();
        if (redisClient && redisClient.isOpen) {
            const cachedString = await redisClient.get(key);
            if (cachedString) {
                const parsed = JSON.parse(cachedString);
                // Warm up L1 memory cache
                setMemoryCache(key, parsed, Math.min(ttl, 300));
                return parsed;
            }
        }
    } catch (err) {
        // Silently continue to DB fallback without blocking
    }

    // 3. Fallback to MongoDB Query
    const freshData = await fetchFunction();

    // 4. Populate L1 and L2 Caches
    if (freshData !== undefined && freshData !== null) {
        setMemoryCache(key, freshData, Math.min(ttl, 300));

        // Save to Redis asynchronously without delaying the HTTP response
        connectRedis().then(async (redisClient) => {
            if (redisClient && redisClient.isOpen) {
                try {
                    await redisClient.setEx(key, ttl, JSON.stringify(freshData));
                } catch (e) {}
            }
        }).catch(() => {});
    }

    return freshData;
};

/**
 * Invalidate a cache key from both L1 Memory and L2 Redis
 * @param {string} key - Cache key to delete
 */
const invalidateCache = async (key) => {
    // Delete from L1
    deleteMemoryCache(key);

    // Delete from L2 Redis
    try {
        const redisClient = await connectRedis();
        if (redisClient && redisClient.isOpen) {
            if (key.includes('*')) {
                // Handle wildcards if needed
                const keys = await redisClient.keys(key);
                if (keys && keys.length > 0) {
                    await redisClient.del(keys);
                }
            } else {
                await redisClient.del(key);
            }
        }
    } catch (err) {
        // Fail gracefully
    }
};

module.exports = { getCachedData, invalidateCache };