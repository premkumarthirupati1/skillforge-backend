require('dotenv').config();

async function testModel(model) {
  const fetch = globalThis.fetch;
  const systemPrompt = "You are a helper. Output JSON: {\"action\": \"navigate\", \"target\": \"profile\", \"params\": {}, \"reply\": \"Navigating to profile...\", \"suggestions\": [\"Edit bio\"]}";
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Take me to profile" }
      ],
      temperature: 0.1,
      max_tokens: 600
    })
  });

  const data = await response.json();
  const choice = data.choices?.[0];
  console.log(`[${model}] finish_reason:`, choice?.finish_reason, "| content:", choice?.message?.content);
}

async function run() {
  await testModel("deepseek/deepseek-chat");
  await testModel("qwen/qwen-2.5-72b-instruct");
  await testModel("deepseek/deepseek-r1");
  await testModel("meta-llama/llama-3.3-70b-instruct");
}
run();
