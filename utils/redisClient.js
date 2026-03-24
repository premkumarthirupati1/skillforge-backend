import { createClient } from 'redis';
import 'dotenv/config';
configDotenv
console.log("Password from env:", process.env.REDIS_PASSWORD);
console.log(process.env);
const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-19551.c239.us-east-1-2.ec2.cloud.redislabs.com',
        port: 19551
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to Redis.");

        await client.set('skillforge_test', 'Hello Redis!');
        const result = await client.get('skillforge_test');
        console.log("Value from Redis:", result);

        await client.disconnect();
    } catch (err) {
        console.error('Error occurred connecting to Redis:', err);
    }
}

run();