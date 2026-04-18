import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Configure Web Push with VAPID keys injected via Supabase Secrets
const publicVapidKey = Deno.env.get('VAPID_PUBLIC_KEY');
const privateVapidKey = Deno.env.get('VAPID_PRIVATE_KEY');

if (!publicVapidKey || !privateVapidKey) {
  console.error("VAPID keys must be set in Supabase Secrets.");
} else {
  webpush.setVapidDetails(
    "mailto:admin@expenseiq.app",
    publicVapidKey,
    privateVapidKey
  );
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } });
  }

  try {
    const { user_id, title, body } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    // Fetch all active push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (error || !subscriptions) throw error;
    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No active subscriptions found for user." }), { status: 200 });
    }

    const payload = JSON.stringify({ title, body, icon: '/icons/icon-192x192.png' });
    let successCount = 0;

    // Dispatch Web Push to all registered devices for this user
    await Promise.all(subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or was unsubscribed, delete from DB
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error("Push Error for", sub.id, err);
        }
      }
    }));

    return new Response(JSON.stringify({ success: true, deliveries: successCount }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
