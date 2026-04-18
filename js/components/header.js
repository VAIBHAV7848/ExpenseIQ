/* ========================================
   ExpenseIQ — Header Component
   ======================================== */

const Header = {
  render() {
    const header = document.getElementById('header');

    const month = Utils.toMonthString(new Date());
    const budgetStatus = Store.getBudgetStatus(month);
    let alertsCount = 0;
    if (budgetStatus) {
      Object.values(budgetStatus.categoryStatus).forEach(s => {
        if (s.status === 'near-limit' || s.status === 'over-budget') alertsCount++;
      });
    }

    const badgeHtml = alertsCount > 0 ? '<div class="notification-badge"></div>' : '';
    const settings = Store.getSettings();

    header.innerHTML = `
      <div class="header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn">
          <i data-lucide="menu"></i>
        </button>
        <div>
          <h2 class="header-title" id="header-title">Dashboard</h2>
          <div class="header-subtitle" id="header-subtitle">${Utils.formatDate(new Date().toISOString(), 'long')}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="header-search">
          <i data-lucide="search" class="header-search-icon"></i>
          <input type="text" id="global-search" placeholder="Search transactions...">
          <div class="header-search-shortcut">/</div>
        </div>

        <button id="voice-mic-btn" class="btn btn-ghost btn-icon"
          onclick="window.startVoiceInput && window.startVoiceInput()"
          title="Voice Input" style="display:none;">
          <i data-lucide="mic"></i>
        </button>
        <div id="voice-indicator" style="display:none;align-items:center;
          gap:4px;font-size:11px;color:var(--color-expense);">
          <span class="voice-pulse"></span>
          <span>REC</span>
        </div>

        <div id="sync-status-badge" class="sync-badge synced" title="Sync Status">
          ✓ Synced
        </div>

        <button class="header-icon-btn" id="notification-btn" title="Alerts">
          <i data-lucide="bell" ${alertsCount > 0 ? 'class="animate-bell"' : ''}></i>
          ${badgeHtml}
        </button>

        <button class="theme-toggle" id="theme-toggle" title="Toggle Theme">
          <i data-lucide="${settings.theme === 'dark' ? 'sun' : 'moon'}"></i>
        </button>

        <div class="user-profile" id="header-user-profile"></div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.renderUserProfile();
    this.bindEvents();
    this._listenSyncEvents();
  },

  renderUserProfile() {
    const profileEl = document.getElementById('header-user-profile');
    if (!profileEl) return;

    if (Auth.isAuthenticated() && !Auth.isGuest()) {
      const user = Auth.getUser();
      const meta = user?.user_metadata || {};
      const authEmail = user?.email || 'User';
      const primaryName = meta.full_name || meta.name || authEmail.split('@')[0];
      const avatarUrl = meta.avatar_url || meta.picture || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(primaryName) + '&background=6366f1&color=fff');
      
      profileEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:var(--space-2); cursor:pointer;" onclick="location.hash='#/settings'" title="Settings">
          <img src="${Utils.escapeHtml(avatarUrl)}" alt="Profile" class="avatar" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
          <div class="user-info hide-on-mobile" style="display:flex; flex-direction:column;">
            <span style="font-size:var(--text-xs); font-weight:600;">${Utils.escapeHtml(primaryName)}</span>
            <span style="font-size:10px; color:var(--text-muted);">Settings</span>
          </div>
        </div>
      `;
    } else {
      profileEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:var(--space-2); cursor:pointer;" onclick="location.hash='#/login'" title="Sign In">
          <div class="avatar" style="width:36px; height:36px; border-radius:50%; background:var(--glass-bg); display:flex; align-items:center; justify-content:center;">
             <i data-lucide="user"></i>
          </div>
          <div class="user-info hide-on-mobile" style="display:flex; flex-direction:column;">
            <span style="font-size:var(--text-xs); font-weight:600;">Guest User</span>
            <span style="font-size:10px; color:var(--text-muted);">Sign In</span>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  },

  bindEvents() {
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);

      const icon = document.querySelector('#theme-toggle i');
      if (icon) icon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();

      Store.updateSettings({ theme: newTheme });
      EventBus.emit('theme:changed', newTheme);
    });

    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.add('open');
      document.getElementById('sidebar-overlay')?.classList.add('active');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    });

    const searchInput = document.getElementById('global-search');
    searchInput?.addEventListener('input', Utils.debounce((e) => {
      const query = e.target.value.trim();
      if (query && Router.currentRoute !== '#/transactions') {
        Router.navigate('#/transactions');
        setTimeout(() => EventBus.emit('global:search', query), 300);
      } else if (Router.currentRoute === '#/transactions') {
        EventBus.emit('global:search', query);
      }
    }, 500));
  },

  _listenSyncEvents() {
    EventBus.on('sync:status', (data) => {
      const badge = document.getElementById('sync-status-badge');
      if (!badge) return;
      badge.className = 'sync-badge ' + data.status;
      if (data.status === 'syncing') {
        badge.innerHTML = '<span class="spin">↻</span> Syncing...';
      } else if (data.status === 'synced') {
        badge.innerHTML = '✓ Synced';
      } else if (data.status === 'offline') {
        badge.innerHTML = '⚠ Offline';
      } else if (data.status === 'error') {
        badge.innerHTML = '✕ Error';
      }
    });

    EventBus.on('sync:pending', ({ count }) => {
      const badge = document.getElementById('sync-status-badge');
      if (badge && count > 0) {
        badge.className = 'sync-badge syncing';
        badge.innerHTML = '↻ ' + count + ' pending';
      }
    });
  },

  updateTitle(route) {
    const titleEl = document.getElementById('header-title');
    if (!titleEl) return;

    const map = {
      '#/': 'Dashboard',
      '#/transactions': 'Transactions',
      '#/reports': 'Reports & Analytics',
      '#/budgets': 'Budget Management',
      '#/categories': 'Categories',
      '#/settings': 'Settings',
      '#/goals': 'Savings Goals',
      '#/debts': 'Debt Tracker'
    };

    titleEl.textContent = map[route] || 'ExpenseIQ';
  }
};
