/* ========================================
   ExpenseIQ — Supabase Configuration
   ======================================== */

// IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://krzlmgxzuqgwmvrmowax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__mLHC_b3oVC1yJi38L_xug_NqGwro8_';

// Initialize the Supabase client
// Note: If you haven't replaced the URL/Key yet, this will fail gracefully or show errors in console,
// and the app will safely fallback to localStorage only.
let supabaseAdmin = null;

try {
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && window.supabase) {
    supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client Initialized Successfully");
  } else {
    console.warn("Supabase URL/Key not set. Running in localStorage fallback mode.");
  }
} catch (e) {
  console.error("Failed to initialize Supabase:", e);
}

window.supabaseClient = supabaseAdmin;
