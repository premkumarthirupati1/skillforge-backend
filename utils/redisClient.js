const { createClient } = require('redis');
require('dotenv').config();

let client = null;
let isConnected = false;
let connectionAttempted = false;
let lastAttemptTime = 0;
const RETRY_BACKOFF_MS = 60000; // Wait at least 60 seconds before trying to reconnect if previous attempt failed

const getRedisClient = () => {
    if (!client) {
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST;
        const redisPort = process.env.REDIS_PORT;
        const redisPassword = process.env.REDIS_PASSWORD;

        // If no URL and no HOST is explicitly set in env, don't attempt to connect to a dead default host
        if (!redisUrl && !redisHost) {
            return null;
        }

        try {
            if (redisUrl) {
                client = createClient({ url: redisUrl });
            } else {
                client = createClient({
                    username: 'default',
                    password: redisPassword,
                    socket: {
                        host: redisHost,
                        port: Number(redisPort) || 6379,
                        connectTimeout: 2000,
                        reconnectStrategy: false // Do not loop reconnecting on socket errors
                    }
                });
            }

            client.on('error', (err) => {
                isConnected = false;
            });

            client.on('connect', () => {
                isConnected = true;
                console.log('✅ Connected to Redis cache successfully.');
            });

            client.on('end', () => {
                isConnected = false;
            });
        } catch (err) {
            console.warn('⚠️ Error initializing Redis client:', err.message);
            client = null;
        }
    }
    return client;
};

const connectRedis = async () => {
    const c = getRedisClient();
    if (!c) {
        return null;
    }

    if (c.isOpen && isConnected) {
        return c;
    }

    const now = Date.now();
    if (connectionAttempted && (now - lastAttemptTime < RETRY_BACKOFF_MS)) {
        // Backoff: do not freeze incoming requests with repeated failed connection attempts
        return null;
    }

    try {
        connectionAttempted = true;
        lastAttemptTime = now;
        await c.connect();
        isConnected = true;
        return c;
    } catch (err) {
        isConnected = false;
        return null;
    }
};

module.exports = { client: getRedisClient(), connectRedis };