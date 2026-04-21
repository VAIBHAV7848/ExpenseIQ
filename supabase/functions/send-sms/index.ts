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
    const { phone_number, amount, type, category, timestamp, formatted_time, description, balance, account_label } = await req.json();

    if (!phone_number) {
      return new Response(JSON.stringify({ error: "Missing phone number" }), { status: 400 });
    }

    console.log(`[send-sms] Payload: phone=${phone_number}, amt=${amount}, type=${type}, balance=${balance}`);

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("[send-sms] CONFIG ERROR: Twilio credentials missing.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    // Professional Bank-Style Template
    const label = account_label || 'XX-USER';
    const action = type === 'income' ? 'credited' : 'debited';
    const timeStr = formatted_time || new Date(timestamp).toLocaleString('en-IN');
    const note = description ? ` Info: ${description}` : '';
    const cat = category ? ` Ref: ${category}` : '';

    const message = `ExpenseIQ Alert: A/c ${label} ${action} for ₹${amount} on ${timeStr}.${cat}.${note} Avl Bal: ₹${balance}. - ExpenseIQ`;

    console.log(`[send-sms] Message: "${message}"`);

    // Twilio API call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const params = new URLSearchParams();
    params.append('To', phone_number);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    console.log(`[send-sms] Calling Twilio API for ${phone_number}...`);
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
      console.error("[send-sms] Twilio Error:", result.code, result.message);
      return new Response(JSON.stringify({ error: "Twilio Error", detail: result.message, code: result.code }), { status: response.status });
    }

    console.log("[send-sms] SUCCESS: SMS queued. SID:", result.sid);

    return new Response(JSON.stringify({ success: true, sid: result.sid }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err: any) {
    console.error("send-sms Function Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});
