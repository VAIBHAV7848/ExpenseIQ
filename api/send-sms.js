// /api/send-sms.js
// Secure Node.js serverless proxy gateway for sending transactional SMS alerts via Twilio.

export default async function handler(req, res) {
  // CORS Headers for safety
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    phone_number,
    amount,
    type,
    category,
    formatted_time,
    description,
    balance,
    account_label,
    custom_message
  } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: 'Missing phone number' });
  }

  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return res.status(500).json({
      error: 'Twilio credentials are not configured on the Vercel backend.'
    });
  }

  try {
    // Professional bank-style SMS alert compilation
    const label = account_label || 'GUEST';
    const action = type === 'income' ? 'credited' : 'debited';
    const timeStr = formatted_time || new Date().toLocaleString('en-IN');
    const note = description ? ` Info: ${description}` : '';
    const cat = category ? ` Ref: ${category}` : '';

    const message = custom_message || `ExpenseIQ Alert: A/c ${label} ${action} for ₹${amount} on ${timeStr}.${cat}.${note} Avl Bal: ₹${balance}. - ExpenseIQ`;

    // Twilio Endpoint Configuration
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', phone_number);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    console.log(`[send-sms] Dispatching Twilio alert to ${phone_number}...`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-sms] Twilio API Error:', result.code, result.message);
      return res.status(response.status).json({
        error: 'Twilio API Error',
        detail: result.message,
        code: result.code
      });
    }

    console.log('[send-sms] SUCCESS: SMS Dispatched. SID:', result.sid);
    return res.status(200).json({ success: true, sid: result.sid });

  } catch (error) {
    console.error('Server SMS proxy error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
