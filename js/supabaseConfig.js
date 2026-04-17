/* ========================================
   ExpenseIQ — Supabase Configuration
   Uses CONFIG object from config.js
   ======================================== */

let supabaseAdmin = null;

try {
  if (window.CONFIG &&
      CONFIG.SUPABASE_URL &&
      CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
      window.supabase) {
    supabaseAdmin = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('Supabase Client Initialized Successfully');
  } else {
    console.warn('Supabase URL/Key not set. Running in localStorage fallback mode.');
  }
} catch (e) {
  console.error('Failed to initialize Supabase:', e);
}

window.supabaseClient = supabaseAdmin;
