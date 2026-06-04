const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-13307.c265.us-east-1-2.ec2.cloud.redislabs.com',
        port: 13307
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