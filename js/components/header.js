/* ========================================
   ExpenseIQ — Header Component
   ======================================== */

const Header = {
  render() {
    const header = document.getElementById('header');
    
    // Get budget notifications count
    const month = Utils.toMonthString(new Date());
    const budgetStatus = Store.getBudgetStatus(month);
    let alertsCount = 0;
    if (budgetStatus) {
      Object.values(budgetStatus.categoryStatus).forEach(s => {
        if (s.status === 'near-limit' || s.status === 'over-budget') alertsCount++;
      });
    }
    
    const badgeHtml = alertsCount > 0 ? `<div class="notification-badge"></div>` : '';
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
        
        <button class="header-icon-btn" id="notification-btn" title="Alerts">
          <i data-lucide="bell" ${alertsCount > 0 ? 'class="animate-bell"' : ''}></i>
          ${badgeHtml}
        </button>
        
        <button class="theme-toggle" id="theme-toggle" title="Toggle Theme">
          <i data-lucide="${settings.theme === 'dark' ? 'sun' : 'moon'}"></i>
        </button>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Setup Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      
      const icon = document.querySelector('#theme-toggle i');
      icon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
      
      Store.updateSettings({ theme: newTheme });
      EventBus.emit('theme:changed', newTheme);
    });

    // Mobile menu toggle
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-overlay').classList.add('active');
    });

    // Global Search shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('global-search').focus();
      }
    });

    // Handle global search
    const searchInput = document.getElementById('global-search');
    searchInput.addEventListener('input', Utils.debounce((e) => {
      const query = e.target.value.trim();
      if (query && Router.currentRoute !== '#/transactions') {
        Router.navigate('#/transactions');
        setTimeout(() => {
          EventBus.emit('global:search', query);
        }, 300);
      } else if (Router.currentRoute === '#/transactions') {
        EventBus.emit('global:search', query);
      }
    }, 500));
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
      '#/settings': 'Settings'
    };
    
    titleEl.textContent = map[route] || 'ExpenseIQ';
  }
};
