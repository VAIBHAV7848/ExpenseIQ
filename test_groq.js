const key = 'YOUR_GROQ_API_KEY_HERE';
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama3-8b-8192',
    max_tokens: 200,
    messages: [
      { role: 'system', content: 'test' },
      { role: 'user', content: 'hello' }
    ]
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log(await r.text());
});
