const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-19551.c239.us-east-1-2.ec2.cloud.redislabs.com',
        port: 19551
    }
});

client.on('error', err => console.error('Redis Client Error', err));

const connectRedis = async () => {
    if (!client.isOpen) {
        await client.connect();
    }
    return client;
};

module.exports = { client, connectRedis };