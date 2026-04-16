/* ========================================
   ExpenseIQ — Data Store (Optimistic Supabase Sync + localStorage Fallback)
   ======================================== */

const Store = {
  KEYS: {
    TRANSACTIONS: 'expenseiq_transactions',
    CATEGORIES: 'expenseiq_categories',
    BUDGETS: 'expenseiq_budgets',
    SETTINGS: 'expenseiq_settings',
    INITIALIZED: 'expenseiq_initialized'
  },

  // InMemory Caches
  _state: {
    transactions: [],
    categories: [],
    budgets: [],
    settings: null
  },

  get sb() { return window.supabaseClient; },

  // --- Generic helpers ---
  _getFromLocal(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  _saveToBoth(key, data, stateKey) {
    this._state[stateKey] = data;
    localStorage.setItem(key, JSON.stringify(data));
  },

  // --- Init ---
  async init() {
    // 1. Always load from LocalStorage first to immediately hydrate the UI
    const localInit = this._getFromLocal(this.KEYS.INITIALIZED);
    if (!localInit) {
      this._saveToBoth(this.KEYS.CATEGORIES, ALL_DEFAULT_CATEGORIES, 'categories');
      this._saveToBoth(this.KEYS.TRANSACTIONS, [], 'transactions');
      this._saveToBoth(this.KEYS.BUDGETS, [], 'budgets');
      this._saveToBoth(this.KEYS.SETTINGS, this.defaultSettings(), 'settings');
      localStorage.setItem(this.KEYS.INITIALIZED, 'true');
    } else {
      this._state.categories = this._getFromLocal(this.KEYS.CATEGORIES) || ALL_DEFAULT_CATEGORIES;
      this._state.transactions = this._getFromLocal(this.KEYS.TRANSACTIONS) || [];
      this._state.budgets = this._getFromLocal(this.KEYS.BUDGETS) || [];
      this._state.settings = this._getFromLocal(this.KEYS.SETTINGS) || this.defaultSettings();
    }

    // 2. If Supabase is connected AND user is logged in, fetch from remote
    if (this.sb && !Auth.isGuest() && Auth.isAuthenticated()) {
      try {
        console.log("Syncing from Supabase...");
        
        // Fetch Categories
        const { data: cats, error: catErr } = await this.sb.from('categories').select('*');
        if (!catErr && cats.length > 0) {
          // Merge defaults with custom properly for local UI
          const allCats = [...ALL_DEFAULT_CATEGORIES, ...cats.filter(c => !c.isDefault)];
          this._saveToBoth(this.KEYS.CATEGORIES, allCats, 'categories');
        }

        // Fetch Transactions
        const { data: txns, error: txnErr } = await this.sb.from('transactions').select('*');
        if (!txnErr) this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');

        // Fetch Budgets
        const { data: buds, error: budErr } = await this.sb.from('budgets').select('*');
        if (!budErr) this._saveToBoth(this.KEYS.BUDGETS, buds, 'budgets');
        
        console.log("Supabase sync complete.");
      } catch (err) {
        console.error("Error syncing from Supabase:", err);
      }
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
    let txns = [...this._state.transactions];
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
    
    // Optimistic Update
    const txns = [...this._state.transactions, txn];
    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:added', txn);

    // Background Sync
    if (this.sb && !Auth.isGuest()) {
      this.sb.from('transactions').insert([txn]).then(({error}) => {
        if (error) console.error("Supabase Error (Insert Txn):", error);
      });
    }

    return txn;
  },

  updateTransaction(id, data) {
    const txns = [...this._state.transactions];
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) return null;
    
    txns[idx] = { ...txns[idx], ...data, updatedAt: new Date().toISOString() };
    
    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:updated', txns[idx]);

    // Background Sync
    if (this.sb && !Auth.isGuest()) {
      this.sb.from('transactions').update(txns[idx]).eq('id', id).then(({error}) => {
        if (error) console.error("Supabase Error (Update Txn):", error);
      });
    }

    return txns[idx];
  },

  deleteTransaction(id) {
    const txns = [...this._state.transactions];
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) return null;
    
    const removed = txns.splice(idx, 1)[0];
    
    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:deleted', removed);

    if (this.sb && !Auth.isGuest()) {
      this.sb.from('transactions').delete().eq('id', id).then(({error}) => {
        if (error) console.error("Supabase Error (Delete Txn):", error);
      });
    }

    return removed;
  },

  restoreTransaction(txn) {
    const txns = [...this._state.transactions, txn];
    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:added', txn);

    if (this.sb && !Auth.isGuest()) {
      this.sb.from('transactions').insert([txn]).then(({error}) => {
        if (error) console.error("Supabase Error (Restore Txn):", error);
      });
    }
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
  getBudgets() { return this._state.budgets; },

  getBudget(month) {
    return this._state.budgets.find(b => b.month === month) || null;
  },

  setBudget(data) {
    const budgets = [...this._state.budgets];
    const idx = budgets.findIndex(b => b.month === data.month);
    let targetBudget;

    if (idx >= 0) { 
      budgets[idx] = { ...budgets[idx], ...data }; 
      targetBudget = budgets[idx];
    } else { 
      targetBudget = { id: Utils.generateId('budget'), ...data };
      budgets.push(targetBudget); 
    }
    
    this._saveToBoth(this.KEYS.BUDGETS, budgets, 'budgets');
    EventBus.emit('budget:updated', targetBudget);

    if (this.sb && !Auth.isGuest()) {
      this.sb.from('budgets').upsert([targetBudget], { onConflict: 'id' }).then(({error}) => {
        if (error) console.error("Supabase Error (Upsert Budget):", error);
      });
    }
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

  checkBudgetAlerts(txn) {
    if (txn.type !== 'expense') return [];
    const month = Utils.toMonthString(new Date(txn.date));
    const budget = this.getBudget(month);
    if (!budget) return [];
    const alerts = [];
    const settings = this.getSettings();
    const thresholds = settings.budgetAlertThresholds || [80, 90, 100];
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
    const cats = this._state.categories;
    if (type) return cats.filter(c => c.type === type);
    return cats;
  },

  getCategory(id) {
    return this._state.categories.find(c => c.id === id) || null;
  },

  addCategory(data) {
    const cats = [...this._state.categories];
    const cat = { id: Utils.generateId('cat'), isDefault: false, ...data };
    cats.push(cat);
    
    this._saveToBoth(this.KEYS.CATEGORIES, cats, 'categories');

    if (this.sb && !Auth.isGuest()) {
      this.sb.from('categories').insert([cat]).then(({error}) => {
        if (error) console.error("Supabase Error (Insert Category):", error);
      });
    }

    return cat;
  },

  updateCategory(id, data) {
    const cats = [...this._state.categories];
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...data };
    
    this._saveToBoth(this.KEYS.CATEGORIES, cats, 'categories');

    if (this.sb && !Auth.isGuest()) {
      this.sb.from('categories').update(cats[idx]).eq('id', id).then(({error}) => {
        if (error) console.error("Supabase Error (Update Category):", error);
      });
    }

    return cats[idx];
  },

  deleteCategory(id) {
    const cats = [...this._state.categories];
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    if (cats[idx].isDefault) return null; 
    
    const removed = cats.splice(idx, 1)[0];
    
    this._saveToBoth(this.KEYS.CATEGORIES, cats, 'categories');

    if (this.sb && !Auth.isGuest()) {
      this.sb.from('categories').delete().eq('id', id).then(({error}) => {
        if (error) console.error("Supabase Error (Delete Category):", error);
      });
    }

    return removed;
  },

  // === SETTINGS ===
  getSettings() { return this._state.settings; },
  updateSettings(data) {
    const settings = { ...this.getSettings(), ...data };
    this._saveToBoth(this.KEYS.SETTINGS, settings, 'settings');
    EventBus.emit('settings:changed', settings);
    return settings;
  },

  // === DATA MANAGEMENT ===
  exportData() {
    return JSON.stringify({
      transactions: this._state.transactions,
      categories: this._state.categories,
      budgets: this._state.budgets,
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  importData(json) {
    // Basic import logic, in production you'd merge and push
  },

  loadDemoData() {
    const existing = [...this._state.transactions];
    const toAdd = SAMPLE_TRANSACTIONS.map(t => ({
      ...t, createdAt: t.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
    }));
    const newTxns = [...existing, ...toAdd];
    
    this._saveToBoth(this.KEYS.TRANSACTIONS, newTxns, 'transactions');
    
    const existingBudgets = [...this._state.budgets];
    SAMPLE_BUDGETS.forEach(b => {
      if (!existingBudgets.find(eb => eb.month === b.month)) existingBudgets.push(b);
    });
    this._saveToBoth(this.KEYS.BUDGETS, existingBudgets, 'budgets');

    if (this.sb && !Auth.isGuest()) {
      console.log("Pushing demo data to Supabase...");
      this.sb.from('transactions').upsert(toAdd, {onConflict:'id'}).then(()=>{});
      this.sb.from('budgets').upsert(SAMPLE_BUDGETS, {onConflict:'id'}).then(()=>{});
    }
  },

  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
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
