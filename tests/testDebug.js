require('dotenv').config();
const { handleDebuggingRequest } = require('../services/debuggingHandler');

async function test() {
  console.log('--- Test 1: Missing context check ---');
  const r1 = await handleDebuggingRequest({
    userMessage: 'Fix my bug please'
  });
  console.log('R1 (needsContext):', r1.needsContext);
  console.log('R1 reply:\n', r1.reply);

  console.log('\n--- Test 2: Real error with code ---');
  const r2 = await handleDebuggingRequest({
    userMessage: 'Why does my code throw TypeError in map?',
    context: {
      project: {
        projectTitle: 'User API',
        language: 'javascript',
        activeFileName: 'userService.js',
        activeCode: 'function getNames(users) {\n  return users.map(u => u.name);\n}'
      },
      error: 'TypeError: Cannot read properties of undefined (reading \'map\') at getNames (userService.js:2:16)'
    }
  });
  console.log('R2 model used:', r2.modelUsed);
  console.log('R2 reply sample:\n', r2.reply.slice(0, 300) + '...');
}
test();
