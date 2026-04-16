/* ========================================
   ExpenseIQ — Sidebar Component
   ======================================== */

const Sidebar = {
  render() {
    const sidebar = document.getElementById('sidebar');
    
    // Get budget notifications count
    const month = Utils.toMonthString(new Date());
    const budgetStatus = Store.getBudgetStatus(month);
    let alertsCount = 0;
    if (budgetStatus) {
      Object.values(budgetStatus.categoryStatus).forEach(s => {
        if (s.status === 'near-limit' || s.status === 'over-budget') alertsCount++;
      });
    }
    
    const badgeHtml = alertsCount > 0 ? `<div class="nav-item-badge">${alertsCount}</div>` : '';

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <i data-lucide="wallet"></i>
        </div>
        <div class="sidebar-logo-text">
          <h1>ExpenseIQ</h1>
          <span>Smart Tracker</span>
        </div>
      </div>
      <div class="sidebar-nav">
        <div class="sidebar-nav-label">Main Menu</div>
        <a href="#/" class="nav-item" data-route="#/">
          <i data-lucide="layout-dashboard"></i>
          <span>Dashboard</span>
        </a>
        <a href="#/transactions" class="nav-item" data-route="#/transactions">
          <i data-lucide="credit-card"></i>
          <span>Transactions</span>
        </a>
        <a href="#/reports" class="nav-item" data-route="#/reports">
          <i data-lucide="bar-chart-3"></i>
          <span>Reports</span>
        </a>
        
        <div class="sidebar-nav-label">Management</div>
        <a href="#/budgets" class="nav-item" data-route="#/budgets">
          <i data-lucide="target"></i>
          <span>Budgets</span>
          ${badgeHtml}
        </a>
        <a href="#/categories" class="nav-item" data-route="#/categories">
          <i data-lucide="folders"></i>
          <span>Categories</span>
        </a>
        <a href="#/settings" class="nav-item" data-route="#/settings">
          <i data-lucide="settings"></i>
          <span>Settings</span>
        </a>
      </div>
      <div class="sidebar-footer">
        <button class="sidebar-add-btn" id="sidebar-add-btn">
          <i data-lucide="plus"></i>
          New Transaction
        </button>
      </div>
    `;

    // Render mobile bottom nav
    if (!document.getElementById('bottom-nav')) {
      const bottomNav = document.createElement('nav');
      bottomNav.id = 'bottom-nav';
      bottomNav.className = 'bottom-nav';
      bottomNav.innerHTML = `
        <div class="bottom-nav-items">
          <a href="#/" class="bottom-nav-item" data-route="#/">
            <i data-lucide="layout-dashboard"></i>
            <span>Home</span>
          </a>
          <a href="#/transactions" class="bottom-nav-item" data-route="#/transactions">
            <i data-lucide="credit-card"></i>
            <span>List</span>
          </a>
          <button class="bottom-nav-add" id="bottom-nav-add">
            <i data-lucide="plus"></i>
          </button>
          <a href="#/reports" class="bottom-nav-item" data-route="#/reports">
            <i data-lucide="bar-chart-3"></i>
            <span>Reports</span>
          </a>
          <a href="#/settings" class="bottom-nav-item" data-route="#/settings">
            <i data-lucide="settings"></i>
            <span>Settings</span>
          </a>
        </div>
      `;
      document.getElementById('app').appendChild(bottomNav);
      
      const overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.id = 'sidebar-overlay';
      document.getElementById('app').appendChild(overlay);
      
      overlay.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    if (window.lucide) lucide.createIcons();

    // Bind Add button globally
    document.getElementById('sidebar-add-btn')?.addEventListener('click', () => {
       if(window.showAddTransactionModal) window.showAddTransactionModal();
    });
    document.getElementById('bottom-nav-add')?.addEventListener('click', () => {
       if(window.showAddTransactionModal) window.showAddTransactionModal();
    });
    
    // Force active state refresh
    if (Router.currentRoute) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === Router.currentRoute);
      });
      document.querySelectorAll('.bottom-nav-item').forEach(item => {
        if(item.dataset.route) item.classList.toggle('active', item.dataset.route === Router.currentRoute);
      });
    }
  }
};
