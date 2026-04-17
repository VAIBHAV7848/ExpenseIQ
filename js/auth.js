/* ========================================
   ExpenseIQ — Authentication Helper
   ======================================== */

const Auth = {
  session: null,

  async init() {
    if (!window.supabaseClient) {
      console.warn('Supabase client missing. Defaulting to Guest mode.');
      this.setGuest(true);
      return;
    }

    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session) {
        this.session = data.session;
        this.setGuest(false);
      }
    } catch (e) {
      console.warn('Auth session check failed:', e);
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      if (session) {
        this.setGuest(false);
        EventBus.emit('auth:changed', session);
        
        // If we just successfully authenticated from Google OAuth or Login screen,
        // redirect to the Dashboard so they don't stare at a blank screen.
        if (window.location.hash.includes('access_token=') || window.location.hash === '#/login') {
          window.location.hash = '#/';
        }
      } else {
        EventBus.emit('auth:signedOut');
      }
    });
  },

  async signInWithGoogle() {
    if (!window.supabaseClient) {
      if (window.Toast) Toast.error('Not Available', 'Supabase is not configured. Check config.js.');
      console.error('signInWithGoogle: supabaseClient is null');
      return;
    }
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) {
        console.error('Google Sign-In error:', error);
        if (window.Toast) Toast.error('Sign In Failed', error.message);
      } else {
        console.log('OAuth redirect initiated:', data);
      }
    } catch (e) {
      console.error('Google Sign-In exception:', e);
      if (window.Toast) Toast.error('Sign In Error', e.message || 'Something went wrong.');
    }
  },

  async signOut() {
    if (this.session && window.supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    this.session = null;
    localStorage.removeItem('expenseiq_guest');
    localStorage.removeItem('expenseiq_data');
    localStorage.removeItem('expenseiq_settings');
    if (typeof subscriptionManager !== 'undefined') subscriptionManager.unsubscribeAll();
    window.location.hash = '#/login';
    window.location.reload();
  },

  setGuest(isGuest) {
    localStorage.setItem('expenseiq_guest', isGuest ? 'true' : 'false');
    if (isGuest) EventBus.emit('auth:guest');
  },

  isAuthenticated() {
    return !!this.session;
  },

  isGuest() {
    return localStorage.getItem('expenseiq_guest') === 'true';
  },

  getUser() {
    return this.session?.user ?? null;
  }
};
