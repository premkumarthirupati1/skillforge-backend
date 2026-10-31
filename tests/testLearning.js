require('dotenv').config();
const mongoose = require('mongoose');
const { handleLearningRequest } = require('../services/learningRagService');

const URI = 'mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority';

async function test() {
  await mongoose.connect(URI);

  console.log('--- Test 1: Question covered by course ---');
  const r1 = await handleLearningRequest({
    userMessage: 'What is the Next.js 14 paradigm shift with Server Components vs Client Components?',
    context: {
      lesson: {
        title: 'Next.js 14 Paradigm Shift: Client vs Server Components',
        courseTitle: 'Fullstack Next.js 14 & React Server Components'
      }
    }
  });
  console.log('R1 Chunks retrieved:', r1.retrievedChunksCount);
  console.log('R1 Cited lessons:', r1.citedLessons);
  console.log('R1 Reply sample:\n', r1.reply.slice(0, 300) + '...\n');

  console.log('--- Test 2: Question NOT covered by course ---');
  const r2 = await handleLearningRequest({
    userMessage: 'How do I train an elephant to balance a beach ball on its nose?',
    context: {
      lesson: {
        title: 'Next.js 14 Paradigm Shift: Client vs Server Components',
        courseTitle: 'Fullstack Next.js 14 & React Server Components'
      }
    }
  });
  console.log('R2 Chunks retrieved:', r2.retrievedChunksCount);
  console.log('R2 Reply sample:\n', r2.reply.slice(0, 300) + '...\n');

  await mongoose.disconnect();
}
test();
