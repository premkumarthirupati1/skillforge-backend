require('dotenv').config();
const { classifyMessage } = require('../services/routerService');

async function test() {
  const tests = [
    'Take me to my profile settings',
    'My code fails with TypeError: Cannot read property of undefined in handleLogin',
    'What is the difference between TCP and UDP in this networking lesson?',
    'Hey what is up?'
  ];

  for (const t of tests) {
    const r = await classifyMessage(t);
    console.log(`[QUERY] "${t}" ==> [${r.category}] (${r.reasoning})`);
  }
}
test();
