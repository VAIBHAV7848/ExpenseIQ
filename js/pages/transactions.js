/* ========================================
   ExpenseIQ — Transactions Page Renderer
   ======================================== */

const Transactions = {
  currentFilters: {
    type: 'all',
    search: '',
    category: '',
    startDate: '',
    endDate: ''
  },
  
  render() {
    const content = document.getElementById('page-content');
    
    // Default current month for filter
    if (!this.currentFilters.startDate) {
      const now = new Date();
      this.currentFilters.startDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      this.currentFilters.endDate = Utils.toDateString(new Date(now.getFullYear(), now.getMonth()+1, 0));
    }

    content.innerHTML = `
      <div class="transactions-header">
        <div></div>
        <button class="btn btn-primary animate-fade-in-right" onclick="window.showAddTransactionModal()">
          <i data-lucide="plus"></i> Add New
        </button>
      </div>

      <div class="transactions-filters animate-fade-in-up" style="animation-delay: 50ms">
        <div class="filters-row">
          <div class="filter-search">
            <i data-lucide="search" class="filter-search-icon"></i>
            <input type="text" id="tx-search" class="form-input" placeholder="Search notes..." value="${this.currentFilters.search}">
          </div>
          
          <select id="tx-type" class="form-select filter-date">
            <option value="all" ${this.currentFilters.type === 'all' ? 'selected' : ''}>All Types</option>
            <option value="income" ${this.currentFilters.type === 'income' ? 'selected' : ''}>Income</option>
            <option value="expense" ${this.currentFilters.type === 'expense' ? 'selected' : ''}>Expense</option>
          </select>
          
          <select id="tx-category" class="form-select filter-category">
            <option value="">All Categories</option>
            ${Store.getCategories().map(c => `<option value="${c.id}" ${this.currentFilters.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          
          <input type="date" id="tx-start" class="form-input filter-date" value="${this.currentFilters.startDate}">
          <span class="text-muted">to</span>
          <input type="date" id="tx-end" class="form-input filter-date" value="${this.currentFilters.endDate}">
        </div>
      </div>


      <div class="summary-bar animate-fade-in-up" style="animation-delay: 100ms" id="tx-summary-bar">
        <!-- Rendered via renderList() -->
      </div>

      <div class="transactions-list-container animate-fade-in-up" style="animation-delay: 150ms">
        <div id="tx-list-content">
          <!-- Rendered via renderList() -->
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindFilters();
    this.renderList();
    
    EventBus.on('global:search', (query) => {
      const searchInput = document.getElementById('tx-search');
      if (searchInput) {
        searchInput.value = query;
        this.currentFilters.search = query;
        this.renderList();
      }
    });

    // Need to handle deletion globally for this page
    window.deleteTxn = (id) => {
      ConfirmDialog.show({
        title: 'Delete Transaction',
        message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
        confirmText: 'Delete',
        onConfirm: () => {
          const removed = Store.deleteTransaction(id);
          if (removed) {
            this.renderList();
            Toast.success('Deleted', 'Transaction removed.', 5000, () => {
              Store.restoreTransaction(removed);
              this.renderList();
            });
            Sidebar.render();
          }
        }
      });
    };
  },

  bindFilters() {
    const update = () => {
      this.currentFilters = {
        search: document.getElementById('tx-search').value,
        type: document.getElementById('tx-type').value,
        category: document.getElementById('tx-category').value,
        startDate: document.getElementById('tx-start').value,
        endDate: document.getElementById('tx-end').value
      };
      this.renderList();
    };

    document.getElementById('tx-search').addEventListener('input', Utils.debounce(update, 300));
    document.getElementById('tx-type').addEventListener('change', update);
    document.getElementById('tx-category').addEventListener('change', update);
    document.getElementById('tx-start').addEventListener('change', update);
    document.getElementById('tx-end').addEventListener('change', update);
  },

  renderList() {
    const listEl = document.getElementById('tx-list-content');
    const summaryEl = document.getElementById('tx-summary-bar');
    if (!listEl || !summaryEl) return;

    const txns = Store.getTransactions(this.currentFilters);
    
    // Update summary
    const inc = txns.filter(t => t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = txns.filter(t => t.type==='expense').reduce((s,t)=>s+t.amount,0);
    
    summaryEl.innerHTML = `
      <div class="summary-bar-item">Transactions: <strong>${txns.length}</strong></div>
      <div class="summary-bar-item">Income: <strong class="text-income">↑ ${Utils.formatCurrency(inc)}</strong></div>
      <div class="summary-bar-item">Expense: <strong class="text-expense">↓ ${Utils.formatCurrency(exp)}</strong></div>
      <div class="summary-bar-item" style="margin-left:auto">Net: <strong>${Utils.formatCurrency(inc - exp)}</strong></div>
    `;

    if (txns.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
          <h3 class="empty-state-title">No transactions found</h3>
          <p class="empty-state-message">Try adjusting your filters or date range.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Group by date
    const grouped = Utils.groupBy(txns, 'date');
    const sortedDates = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a));

    let html = '';
    sortedDates.forEach(date => {
      const items = grouped[date];
      let dayTotal = items.reduce((s,t) => s + (t.type==='income'?t.amount:-t.amount), 0);
      
      html += `
        <div class="date-group stagger-children">
          <div class="date-header">
            <span>${Utils.formatRelativeDate(date)}</span>
            <span style="display:inline-block; font-family:var(--font-mono); font-size:10px;">${dayTotal >=0 ? '+' : ''}${Utils.formatCurrency(dayTotal)}</span>
          </div>
          ${items.map(t => {
            const cat = Store.getCategory(t.category);
            return `
              <div class="transaction-row">
                <div class="transaction-icon" style="background-color: ${cat ? cat.color : '#94a3b8'}">
                  <i data-lucide="${cat ? cat.icon : 'tag'}"></i>
                </div>
                <div class="transaction-details">
                  <div class="transaction-name">${Utils.escapeHtml(t.description)}</div>
                  <div class="transaction-category">${cat ? cat.name : 'Unknown'}</div>
                </div>
                <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</div>
                <div class="transaction-actions">
                  <button class="btn btn-ghost btn-icon" onclick="window.deleteTxn('${t.id}')" title="Delete">
                    <i data-lucide="trash-2"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    });

    listEl.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }
};
