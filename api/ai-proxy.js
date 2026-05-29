/**
 * ExpenseIQ — Secure Serverless AI Proxy
 * Routes client AI requests to the Groq Cloud securely using process.env.GROQ_API_KEY.
 */
module.exports = async function handler(req, res) {
  // CORS setup for serverless functions
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { messages, model, max_tokens } = req.body;

  // Retrieve Groq API Key securely from the server environment
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
    return res.status(500).json({
      error: 'Groq API Key is not configured on the server environment.'
    });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Bad Request. "messages" array is required.' });
  }

  try {
    // Call the Groq API securely. Node 18+ global fetch is used (no dependencies).
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama-3.1-8b-instant',
        max_tokens: max_tokens || 500,
        messages: messages
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq Cloud API responded with error:', errorText);
      return res.status(groqResponse.status).json({
        error: `Groq API Error: ${errorText}`
      });
    }

    const data = await groqResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Server proxy error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
