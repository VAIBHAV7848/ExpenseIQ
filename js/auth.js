/* ========================================
   ExpenseIQ — Authentication Helper
   ======================================== */

const Auth = {
  isGuestUser: localStorage.getItem('expenseiq_guest') === 'true',
  session: null,

  async init() {
    if (!window.supabaseClient) {
      console.warn("Supabase client missing. Defaulting to Guest mode.");
      this.setGuest(true);
      return;
    }

    // Check current session
    const { data, error } = await supabaseClient.auth.getSession();
    if (data.session) {
      this.session = data.session;
      this.setGuest(false);
    }

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      if (session) {
        this.setGuest(false);
        EventBus.emit('auth:changed', this.session);
      }
    });
  },

  async signInWithGoogle() {
    if (!window.supabaseClient) return;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) {
      console.error("Error signing in with Google:", error.message);
      if (window.Toast) Toast.error("Sign In Failed", error.message);
    }
  },

  async signOut() {
    if (this.session && window.supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    this.session = null;
    this.setGuest(false);
    
    // Clear local storage strictly to prevent data leaks between accounts
    Store.clearAll();
    
    // Refresh the page or navigate to login
    window.location.hash = '#/login';
    window.location.reload();
  },

  setGuest(isGuest) {
    this.isGuestUser = isGuest;
    localStorage.setItem('expenseiq_guest', isGuest ? 'true' : 'false');
    if (isGuest) {
        EventBus.emit('auth:guest');
    }
  },

  isAuthenticated() {
    return !!this.session;
  },

  isGuest() {
    return this.isGuestUser;
  },

  getUser() {
    return this.session ? this.session.user : null;
  }
};
