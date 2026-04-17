/* ========================================
   ExpenseIQ — Login Page Component
   ======================================== */

const Login = {
  render() {
    const wrap = document.createElement('div');
    wrap.className = 'login-page animate-fade-in';

    wrap.innerHTML = `
      <div class="login-container">
        <div class="login-logo animate-bounce-in" style="animation-delay: 100ms">
          💰
        </div>
        <h1 class="login-title animate-fade-in-up" style="animation-delay: 200ms">ExpenseIQ</h1>
        <p class="login-subtitle animate-fade-in-up" style="animation-delay: 300ms">Smart financial tracking, powered by AI.</p>

        <div class="login-buttons animate-fade-in-up" style="animation-delay: 400ms">
          <button id="btn-login-google" class="btn btn-google">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div class="login-divider">OR</div>

          <button id="btn-login-guest" class="btn btn-guest">
            Continue as Guest
          </button>

          <button id="btn-login-demo" class="btn btn-demo">
            <i data-lucide="database"></i>
            Try with Sample Data
          </button>
        </div>

        <div class="login-features animate-fade-in-up" style="animation-delay: 500ms">
          <div class="login-feature"><i data-lucide="shield-check"></i> Offline-first architecture</div>
          <div class="login-feature"><i data-lucide="zap"></i> AI-powered insights</div>
          <div class="login-feature"><i data-lucide="refresh-cw"></i> Real-time multi-device sync</div>
        </div>
      </div>
    `;

    document.getElementById('app').style.display = 'none';

    let loginWrapper = document.getElementById('login-wrapper');
    if (!loginWrapper) {
      loginWrapper = document.createElement('div');
      loginWrapper.id = 'login-wrapper';
      document.body.appendChild(loginWrapper);
    }

    loginWrapper.innerHTML = '';
    loginWrapper.appendChild(wrap);
    loginWrapper.style.display = 'block';

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
  },

  destroy() {
    const loginWrapper = document.getElementById('login-wrapper');
    if (loginWrapper) {
      loginWrapper.style.display = 'none';
      loginWrapper.innerHTML = '';
    }
    document.getElementById('app').style.display = 'flex';
  },

  bindEvents() {
    document.getElementById('btn-login-google')?.addEventListener('click', () => {
      Auth.signInWithGoogle();
    });

    document.getElementById('btn-login-guest')?.addEventListener('click', () => {
      Auth.setGuest(true);
      this.destroy();
      Sidebar.render();
      Header.render();
      window.location.hash = '#/';
    });

    document.getElementById('btn-login-demo')?.addEventListener('click', () => {
      Auth.setGuest(true);
      Store.loadDemoData();
      this.destroy();
      Sidebar.render();
      Header.render();
      window.location.hash = '#/';
      Toast.success('Demo Loaded', '50 sample transactions added for exploration.');
    });
  }
};
