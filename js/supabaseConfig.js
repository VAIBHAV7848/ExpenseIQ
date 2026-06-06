/* ========================================
   ExpenseIQ — Supabase Configuration
   Uses CONFIG object from config.js with hardcoded fallbacks
   ======================================== */

let supabaseAdmin = null;

try {
  const url = window.CONFIG && CONFIG.SUPABASE_URL;
  const key = window.CONFIG && CONFIG.SUPABASE_ANON_KEY;

  if (url && url !== 'YOUR_SUPABASE_URL_HERE' && key && key !== 'YOUR_SUPABASE_ANON_KEY_HERE' && window.supabase) {
    supabaseAdmin = window.supabase.createClient(url, key);
    console.log('Supabase Client Initialized Successfully');
  } else if (!window.supabase) {
    console.warn('Supabase JS library not loaded. Running in localStorage fallback mode.');
  } else {
    console.warn('Supabase URL/Key not set. Running in localStorage fallback mode.');
  }
} catch (e) {
  console.error('Failed to initialize Supabase:', e);
}

window.supabaseClient = supabaseAdmin;

