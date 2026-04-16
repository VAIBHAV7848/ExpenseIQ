/* ========================================
   ExpenseIQ — Hash Router
   ======================================== */

const Router = {
  routes: {},
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    // Handle initial route
    if (!location.hash) location.hash = '#/';
    else this._handleRoute();
  },

  addRoute(hash, handler) {
    this.routes[hash] = handler;
  },

  navigate(hash) {
    location.hash = hash;
  },

  getCurrentRoute() {
    return location.hash || '#/';
  },

  _handleRoute() {
    const hash = location.hash || '#/';

    // --- Route Guard ---
    if (hash !== '#/login') {
      if (!Auth.isAuthenticated() && !Auth.isGuest()) {
        location.hash = '#/login';
        return;
      }
      
      // Ensure app shell is rendered if we bypassed the initial boot block
      if (window.Sidebar && document.getElementById('sidebar').innerHTML.trim() === '') {
        Sidebar.render();
      }
      if (window.Header && document.getElementById('header').innerHTML.trim() === '') {
        Header.render();
      }
      
      const appWrap = document.getElementById('app');
      if (appWrap) appWrap.style.display = 'flex';
      
      const loginWrap = document.getElementById('login-wrapper');
      if (loginWrap) loginWrap.style.display = 'none';
      
    } else {
      if (Auth.isAuthenticated() || Auth.isGuest()) {
        location.hash = '#/';
        return;
      }
    }

    const handler = this.routes[hash];
    if (!handler) {
      // 404 — redirect to dashboard or login
      location.hash = (Auth.isAuthenticated() || Auth.isGuest()) ? '#/' : '#/login';
      return;
    }

    const content = document.getElementById('page-content');
    if (!content) return;

    // Page transition
    content.classList.remove('page-enter');
    content.classList.add('page-exit');

    setTimeout(() => {
      this.currentRoute = hash;
      handler();
      content.classList.remove('page-exit');
      content.classList.add('page-enter');

      // Update sidebar active state
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === hash);
      });

      // Update bottom nav
      document.querySelectorAll('.bottom-nav-item').forEach(item => {
        if (item.dataset.route) {
          item.classList.toggle('active', item.dataset.route === hash);
        }
      });

      // Update header title
      Header.updateTitle(hash);

      // Scroll to top
      content.scrollTop = 0;
      window.scrollTo(0, 0);

      // Reinit Lucide icons
      if (window.lucide) lucide.createIcons();
    }, 200);
  }
};
