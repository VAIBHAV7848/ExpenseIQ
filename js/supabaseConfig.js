/* ========================================
   ExpenseIQ — Supabase Configuration
   Uses CONFIG object from config.js with hardcoded fallbacks
   ======================================== */

let supabaseAdmin = null;

// Fallback keys (publishable, protected by RLS)
const FALLBACK_URL = 'https://krzlmgxzuqgwmvrmowax.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyemxtZ3h6dXFnd212cm1vd2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MjEyNjgsImV4cCI6MjA2MDE5NzI2OH0.L6pkqxiZCsMiFfpCv4BrexQb-L9G7SuI_rmHoec5p1U';

try {
  const url = (window.CONFIG && CONFIG.SUPABASE_URL) || FALLBACK_URL;
  const key = (window.CONFIG && CONFIG.SUPABASE_ANON_KEY) || FALLBACK_KEY;

  if (url && url !== 'YOUR_SUPABASE_URL_HERE' && window.supabase) {
    supabaseAdmin = window.supabase.createClient(url, key);
    console.log('Supabase Client Initialized Successfully');
  } else if (!window.supabase) {
    console.warn('Supabase JS library not loaded. Running in localStorage fallback mode.');
  } else {
    console.warn('Supabase URL not set. Running in localStorage fallback mode.');
  }
} catch (e) {
  console.error('Failed to initialize Supabase:', e);
}

window.supabaseClient = supabaseAdmin;

