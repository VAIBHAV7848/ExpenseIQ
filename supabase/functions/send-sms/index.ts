import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } });
  }

  try {
    const { phone_number, amount, type, category, timestamp, description } = await req.json();

    if (!phone_number) {
      return new Response(JSON.stringify({ error: "Missing phone number" }), { status: 400 });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Twilio credentials missing in environment variables.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    // Prepare message template
    let message = "";
    if (type === 'income') {
      message = `Credit of ₹${amount} added successfully.`;
    } else {
      message = `Debit of ₹${amount} recorded successfully.`;
    }

    message += `\nCategory: ${category}`;
    if (description) message += `\nNote: ${description}`;
    message += `\nTime: ${new Date(timestamp).toLocaleString('en-IN')}`;

    // Twilio API call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const params = new URLSearchParams();
    params.append('To', phone_number);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio SMS Failure:", result.message || response.statusText);
      return new Response(JSON.stringify({ error: "Failed to send SMS", detail: result.message }), { status: response.status });
    }

    return new Response(JSON.stringify({ success: true, sid: result.sid }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err: any) {
    console.error("send-sms Function Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});
