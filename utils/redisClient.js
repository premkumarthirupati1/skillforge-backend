const { createClient } = require('redis');
require('dotenv').config();

let client = null;
let isConnecting = false;

const getRedisClient = () => {
    if (!client) {
        client = createClient({
            username: 'default',
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST || 'redis-16839.c91.us-east-1-3.ec2.cloud.redislabs.com',
                port: Number(process.env.REDIS_PORT) || 16839,
                connectTimeout: 3000,
                reconnectStrategy: (retries) => {
                    if (retries > 3) {
                        return false; // Stop reconnection attempts after 3 tries
                    }
                    return Math.min(retries * 500, 2000);
                }
            }
        });

        client.on('error', (err) => {
            // Log as warning rather than crashing or filling console
            console.warn('⚠️ Redis Notice:', err.message);
        });
    }
    return client;
};

const connectRedis = async () => {
    const c = getRedisClient();
    if (c.isOpen) {
        return c;
    }
    if (isConnecting) {
        return null;
    }
    try {
        isConnecting = true;
        await c.connect();
        return c;
    } catch (err) {
        console.warn('⚠️ Redis offline, continuing with direct DB fallback.');
        return null;
    } finally {
        isConnecting = false;
    }
};

module.exports = { client: getRedisClient(), connectRedis };