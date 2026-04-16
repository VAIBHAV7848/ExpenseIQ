/* ========================================
   ExpenseIQ — Data Store (localStorage)
   ======================================== */

const Store = {
  KEYS: {
    TRANSACTIONS: 'expenseiq_transactions',
    CATEGORIES: 'expenseiq_categories',
    BUDGETS: 'expenseiq_budgets',
    SETTINGS: 'expenseiq_settings',
    INITIALIZED: 'expenseiq_initialized'
  },

  // --- Generic helpers ---
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // --- Init ---
  init() {
    if (!this._get(this.KEYS.INITIALIZED)) {
      this._set(this.KEYS.CATEGORIES, ALL_DEFAULT_CATEGORIES);
      this._set(this.KEYS.TRANSACTIONS, []);
      this._set(this.KEYS.BUDGETS, []);
      this._set(this.KEYS.SETTINGS, this.defaultSettings());
      this._set(this.KEYS.INITIALIZED, true);
    }
  },

  defaultSettings() {
    return {
      theme: 'dark', currency: 'INR', currencySymbol: '₹', locale: 'en-IN',
      dateFormat: 'DD/MM/YYYY', startOfWeek: 'monday', defaultView: 'dashboard',
      notifications: { overspending: true, dailySummary: false, weeklyReport: true },
      budgetAlertThresholds: [80, 90, 100]
    };
  },

  // === TRANSACTIONS ===
  getTransactions(filters = {}) {
    let txns = this._get(this.KEYS.TRANSACTIONS) || [];
    if (filters.type && filters.type !== 'all') txns = txns.filter(t => t.type === filters.type);
    if (filters.category) txns = txns.filter(t => t.category === filters.category);
    if (filters.categories && filters.categories.length) txns = txns.filter(t => filters.categories.includes(t.category));
    if (filters.startDate) txns = txns.filter(t => t.date >= filters.startDate);
    if (filters.endDate) txns = txns.filter(t => t.date <= filters.endDate);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      txns = txns.filter(t => t.description.toLowerCase().includes(q));
    }
    if (filters.minAmount) txns = txns.filter(t => t.amount >= filters.minAmount);
    if (filters.maxAmount) txns = txns.filter(t => t.amount <= filters.maxAmount);
    // Sort
    const sortKey = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';
    txns.sort((a, b) => {
      if (sortKey === 'date') {
        const da = new Date(a.date + 'T' + (a.createdAt ? a.createdAt.split('T')[1] : '00:00:00')),
              db = new Date(b.date + 'T' + (b.createdAt ? b.createdAt.split('T')[1] : '00:00:00'));
        return sortOrder === 'desc' ? db - da : da - db;
      }
      if (sortKey === 'amount') return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      return 0;
    });
    return txns;
  },

  addTransaction(data) {
    const txns = this._get(this.KEYS.TRANSACTIONS) || [];
    const txn = {
      id: Utils.generateId('txn'),
      type: data.type,
      category: data.category,
      amount: parseFloat(data.amount),
      description: data.description || '',
      date: data.date || Utils.today(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    txns.push(txn);
    this._set(this.KEYS.TRANSACTIONS, txns);
    EventBus.emit('transaction:added', txn);
    return txn;
  },

  updateTransaction(id, data) {
    const txns = this._get(this.KEYS.TRANSACTIONS) || [];
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) return null;
    txns[idx] = { ...txns[idx], ...data, updatedAt: new Date().toISOString() };
    this._set(this.KEYS.TRANSACTIONS, txns);
    EventBus.emit('transaction:updated', txns[idx]);
    return txns[idx];
  },

  deleteTransaction(id) {
    const txns = this._get(this.KEYS.TRANSACTIONS) || [];
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const removed = txns.splice(idx, 1)[0];
    this._set(this.KEYS.TRANSACTIONS, txns);
    EventBus.emit('transaction:deleted', removed);
    return removed;
  },

  restoreTransaction(txn) {
    const txns = this._get(this.KEYS.TRANSACTIONS) || [];
    txns.push(txn);
    this._set(this.KEYS.TRANSACTIONS, txns);
    EventBus.emit('transaction:added', txn);
  },

  // === AGGREGATIONS ===
  getTotals(month = null) {
    const filters = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filters.startDate = `${y}-${String(m).padStart(2,'0')}-01`;
      filters.endDate = `${y}-${String(m).padStart(2,'0')}-${Utils.daysInMonth(y, m - 1)}`;
    }
    const txns = this.getTransactions(filters);
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, count: txns.length };
  },

  getByCategory(month = null) {
    const filters = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filters.startDate = `${y}-${String(m).padStart(2,'0')}-01`;
      filters.endDate = `${y}-${String(m).padStart(2,'0')}-${Utils.daysInMonth(y, m - 1)}`;
    }
    const txns = this.getTransactions(filters);
    const cats = {};
    txns.forEach(t => {
      if (!cats[t.category]) cats[t.category] = { income: 0, expense: 0, count: 0 };
      cats[t.category][t.type] += t.amount;
      cats[t.category].count++;
    });
    return cats;
  },

  getDailyTotals(month) {
    const [y, m] = month.split('-').map(Number);
    const days = Utils.daysInMonth(y, m - 1);
    const result = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const txns = this.getTransactions({ startDate: dateStr, endDate: dateStr });
      const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      result.push({ date: dateStr, day: d, income, expense });
    }
    return result;
  },

  getMonthlyTotals(year) {
    const result = [];
    for (let m = 0; m < 12; m++) {
      const month = `${year}-${String(m + 1).padStart(2, '0')}`;
      const totals = this.getTotals(month);
      result.push({ month, label: Utils.getShortMonth(m), ...totals });
    }
    return result;
  },

  // === BUDGETS ===
  getBudgets() { return this._get(this.KEYS.BUDGETS) || []; },

  getBudget(month) {
    const budgets = this.getBudgets();
    return budgets.find(b => b.month === month) || null;
  },

  setBudget(data) {
    const budgets = this.getBudgets();
    const idx = budgets.findIndex(b => b.month === data.month);
    if (idx >= 0) { budgets[idx] = { ...budgets[idx], ...data }; }
    else { budgets.push({ id: Utils.generateId('budget'), ...data }); }
    this._set(this.KEYS.BUDGETS, budgets);
    EventBus.emit('budget:updated', data);
  },

  getBudgetStatus(month) {
    const budget = this.getBudget(month);
    if (!budget) return null;
    const byCategory = this.getByCategory(month);
    const totals = this.getTotals(month);
    const categoryStatus = {};
    Object.entries(budget.categoryBudgets || {}).forEach(([catId, limit]) => {
      const spent = byCategory[catId] ? byCategory[catId].expense : 0;
      const pct = Utils.percentage(spent, limit);
      let status = 'on-track';
      if (pct >= 100) status = 'over-budget';
      else if (pct >= 80) status = 'near-limit';
      else if (pct >= 60) status = 'watch-out';
      categoryStatus[catId] = { spent, limit, pct, status };
    });
    return {
      totalSpent: totals.expense,
      totalBudget: budget.totalBudget,
      totalPct: Utils.percentage(totals.expense, budget.totalBudget),
      categoryStatus,
      remaining: budget.totalBudget - totals.expense,
      daysLeft: Utils.daysRemaining()
    };
  },

  // Check budget alerts for a new transaction
  checkBudgetAlerts(txn) {
    if (txn.type !== 'expense') return [];
    const month = Utils.toMonthString(new Date(txn.date));
    const budget = this.getBudget(month);
    if (!budget) return [];
    const alerts = [];
    const settings = this.getSettings();
    const thresholds = settings.budgetAlertThresholds || [80, 90, 100];
    // Check category budget
    const catBudget = budget.categoryBudgets[txn.category];
    if (catBudget) {
      const byCategory = this.getByCategory(month);
      const spent = byCategory[txn.category] ? byCategory[txn.category].expense : 0;
      const pct = Utils.percentage(spent, catBudget);
      const cat = this.getCategory(txn.category);
      thresholds.forEach(th => {
        if (pct >= th && Utils.percentage(spent - txn.amount, catBudget) < th) {
          alerts.push({
            type: th >= 100 ? 'error' : 'warning',
            title: th >= 100 ? 'Budget Exceeded!' : 'Budget Alert',
            message: `You've used ${pct}% of your ${cat ? cat.name : 'category'} budget (${Utils.formatCurrency(spent)} / ${Utils.formatCurrency(catBudget)})`
          });
        }
      });
    }
    return alerts;
  },

  // === CATEGORIES ===
  getCategories(type = null) {
    const cats = this._get(this.KEYS.CATEGORIES) || [];
    if (type) return cats.filter(c => c.type === type);
    return cats;
  },

  getCategory(id) {
    return this.getCategories().find(c => c.id === id) || null;
  },

  addCategory(data) {
    const cats = this.getCategories();
    const cat = { id: Utils.generateId('cat'), isDefault: false, ...data };
    cats.push(cat);
    this._set(this.KEYS.CATEGORIES, cats);
    return cat;
  },

  updateCategory(id, data) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...data };
    this._set(this.KEYS.CATEGORIES, cats);
    return cats[idx];
  },

  deleteCategory(id) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    if (cats[idx].isDefault) return null; // Can't delete defaults
    const removed = cats.splice(idx, 1)[0];
    this._set(this.KEYS.CATEGORIES, cats);
    return removed;
  },

  // === SETTINGS ===
  getSettings() { return this._get(this.KEYS.SETTINGS) || this.defaultSettings(); },
  updateSettings(data) {
    const settings = { ...this.getSettings(), ...data };
    this._set(this.KEYS.SETTINGS, settings);
    EventBus.emit('settings:changed', settings);
    return settings;
  },

  // === DATA MANAGEMENT ===
  exportData() {
    return JSON.stringify({
      transactions: this._get(this.KEYS.TRANSACTIONS) || [],
      categories: this._get(this.KEYS.CATEGORIES) || [],
      budgets: this._get(this.KEYS.BUDGETS) || [],
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  importData(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (data.transactions) this._set(this.KEYS.TRANSACTIONS, data.transactions);
      if (data.categories) this._set(this.KEYS.CATEGORIES, data.categories);
      if (data.budgets) this._set(this.KEYS.BUDGETS, data.budgets);
      if (data.settings) this._set(this.KEYS.SETTINGS, data.settings);
      return true;
    } catch { return false; }
  },

  loadDemoData() {
    const existing = this._get(this.KEYS.TRANSACTIONS) || [];
    // Add sample transactions
    const toAdd = SAMPLE_TRANSACTIONS.map(t => ({
      ...t, createdAt: t.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
    }));
    this._set(this.KEYS.TRANSACTIONS, [...existing, ...toAdd]);
    // Add sample budgets
    const existingBudgets = this.getBudgets();
    SAMPLE_BUDGETS.forEach(b => {
      if (!existingBudgets.find(eb => eb.month === b.month)) existingBudgets.push(b);
    });
    this._set(this.KEYS.BUDGETS, existingBudgets);
  },

  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    this.init();
  }
};

// === EVENT BUS ===
const EventBus = {
  _events: {},
  on(event, cb) {
    (this._events[event] = this._events[event] || []).push(cb);
  },
  off(event, cb) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter(f => f !== cb);
  },
  emit(event, data) {
    (this._events[event] || []).forEach(cb => cb(data));
  }
};
