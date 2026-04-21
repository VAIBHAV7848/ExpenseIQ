/* ========================================
   ExpenseIQ — Data Store
   Optimistic updates + SyncEngine integration
   ======================================== */

const Store = {
  KEYS: {
    TRANSACTIONS: 'expenseiq_transactions',
    CATEGORIES: 'expenseiq_categories',
    BUDGETS: 'expenseiq_budgets',
    GOALS: 'expenseiq_goals',
    DEBTS: 'expenseiq_debts',
    RECURRING: 'expenseiq_recurring',
    SETTINGS: 'expenseiq_settings',
    ACTIVITY_LOG: 'expenseiq_activity_log',
    INITIALIZED: 'expenseiq_initialized'
  },

  _state: {
    transactions: [],
    categories: [],
    budgets: [],
    goals: [],
    debts: [],
    recurring: [],
    settings: null,
    activityLog: []
  },

  get sb() { return window.supabaseClient; },

  // --- Generic helpers ---
  _getFromLocal(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },

  _saveToBoth(key, data, stateKey) {
    this._state[stateKey] = data;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('localStorage full:', e); }
  },

  // --- Init ---
  async init() {
    const localInit = this._getFromLocal(this.KEYS.INITIALIZED);
    if (!localInit) {
      this._saveToBoth(this.KEYS.CATEGORIES, ALL_DEFAULT_CATEGORIES, 'categories');
      this._saveToBoth(this.KEYS.TRANSACTIONS, [], 'transactions');
      this._saveToBoth(this.KEYS.BUDGETS, [], 'budgets');
      this._saveToBoth(this.KEYS.GOALS, [], 'goals');
      this._saveToBoth(this.KEYS.DEBTS, [], 'debts');
      this._saveToBoth(this.KEYS.RECURRING, [], 'recurring');
      this._saveToBoth(this.KEYS.SETTINGS, this.defaultSettings(), 'settings');
      this._saveToBoth(this.KEYS.ACTIVITY_LOG, [], 'activityLog');
      localStorage.setItem(this.KEYS.INITIALIZED, 'true');
    } else {
      this._state.categories = this._getFromLocal(this.KEYS.CATEGORIES) || ALL_DEFAULT_CATEGORIES;
      this._state.transactions = this._getFromLocal(this.KEYS.TRANSACTIONS) || [];
      this._state.budgets = this._getFromLocal(this.KEYS.BUDGETS) || [];
      this._state.goals = this._getFromLocal(this.KEYS.GOALS) || [];
      this._state.debts = this._getFromLocal(this.KEYS.DEBTS) || [];
      this._state.recurring = this._getFromLocal(this.KEYS.RECURRING) || [];
      this._state.settings = this._getFromLocal(this.KEYS.SETTINGS) || this.defaultSettings();
      this._state.activityLog = this._getFromLocal(this.KEYS.ACTIVITY_LOG) || [];
    }

    // Fetch from Supabase if connected and authenticated
    if (this.sb && !Auth.isGuest() && Auth.isAuthenticated()) {
      try {
        const userId = Auth.getUser()?.id;
        if (!userId) return;

        const [catRes, txnRes, budRes, goalRes, debtRes, recRes] = await Promise.allSettled([
          this.sb.from('categories').select('*').or('user_id.eq.' + userId + ',user_id.is.null'),
          this.sb.from('transactions').select('*').eq('user_id', userId),
          this.sb.from('budgets').select('*').eq('user_id', userId),
          this.sb.from('goals').select('*').eq('user_id', userId),
          this.sb.from('debts').select('*').eq('user_id', userId),
          this.sb.from('recurring_templates').select('*').eq('user_id', userId)
        ]);

        if (catRes.status === 'fulfilled' && catRes.value.data?.length > 0) {
          const remoteCats = catRes.value.data;
          const merged = [...ALL_DEFAULT_CATEGORIES];
          remoteCats.forEach(rc => {
            if (!merged.find(m => m.id === rc.id)) merged.push(rc);
          });
          this._saveToBoth(this.KEYS.CATEGORIES, merged, 'categories');
        }

        if (txnRes.status === 'fulfilled' && !txnRes.value.error) {
          this._saveToBoth(this.KEYS.TRANSACTIONS, txnRes.value.data || [], 'transactions');
        }
        if (budRes.status === 'fulfilled' && !budRes.value.error) {
          const budgets = (budRes.value.data || []).map(b => ({
            ...b,
            totalBudget: b.total_budget || b.totalBudget,
            categoryBudgets: b.category_budgets || b.categoryBudgets || {}
          }));
          this._saveToBoth(this.KEYS.BUDGETS, budgets, 'budgets');
        }
        if (goalRes.status === 'fulfilled' && !goalRes.value.error) {
          this._saveToBoth(this.KEYS.GOALS, goalRes.value.data || [], 'goals');
        }
        if (debtRes.status === 'fulfilled' && !debtRes.value.error) {
          this._saveToBoth(this.KEYS.DEBTS, debtRes.value.data || [], 'debts');
        }
        if (recRes.status === 'fulfilled' && !recRes.value.error) {
          this._saveToBoth(this.KEYS.RECURRING, recRes.value.data || [], 'recurring');
        }

        console.log('Supabase sync complete.');
      } catch (err) {
        console.error('Error syncing from Supabase:', err);
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

  // ═══════════════ TRANSACTIONS ═══════════════
  getTransactions(filters = {}) {
    let txns = [...this._state.transactions];
    if (filters.type && filters.type !== 'all') txns = txns.filter(t => t.type === filters.type);
    if (filters.category) txns = txns.filter(t => t.category === filters.category);
    if (filters.categories && filters.categories.length) txns = txns.filter(t => filters.categories.includes(t.category));
    if (filters.startDate) txns = txns.filter(t => t.date >= filters.startDate);
    if (filters.endDate) txns = txns.filter(t => t.date <= filters.endDate);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      txns = txns.filter(t => (t.description || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q));
    }
    if (filters.minAmount) txns = txns.filter(t => t.amount >= filters.minAmount);
    if (filters.maxAmount) txns = txns.filter(t => t.amount <= filters.maxAmount);

    const sortKey = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';
    txns.sort((a, b) => {
      if (sortKey === 'date') {
        const da = new Date(a.date + 'T' + (a.createdAt ? a.createdAt.split('T')[1] : '00:00:00'));
        const db = new Date(b.date + 'T' + (b.createdAt ? b.createdAt.split('T')[1] : '00:00:00'));
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
      notes: data.notes || '',
      split_group_id: data.splitGroupId || data.split_group_id || null,
      recurring_id: data.recurringId || data.recurring_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: Auth.getUser()?.id,
      version: 1,
      last_modified_at: new Date().toISOString(),
      sync_status: 'pending',
      device_id: Utils.getDeviceId(),
      conflict_resolution_strategy: 'last-write-wins'
    };

    const txns = [...this._state.transactions, txn];
    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:added', txn);
    this._logActivity('Added ₹' + txn.amount + ' ' + txn.type + ' — ' + txn.description);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('transactions', 'insert', txn);
    }

    // Trigger SMS Notification (instantly sends SMS to user)
    if (typeof SMS !== 'undefined') {
      SMS.notify(txn);
    }

    return txn;
  },

  updateTransaction(id, data) {
    const txns = [...this._state.transactions];
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) return null;

    txns[idx] = {
      ...txns[idx],
      ...data,
      updated_at: new Date().toISOString(),
      version: (txns[idx].version || 1) + 1,
      last_modified_at: new Date().toISOString(),
      device_id: Utils.getDeviceId()
    };

    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:updated', txns[idx]);
    this._logActivity('Updated transaction — ' + txns[idx].description);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('transactions', 'update', txns[idx]);
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
    this._logActivity('Deleted transaction — ' + removed.description);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('transactions', 'delete', { id, user_id: Auth.getUser()?.id });
    }

    return removed;
  },

  restoreTransaction(txn) {
    const txns = [...this._state.transactions, txn];
    this._saveToBoth(this.KEYS.TRANSACTIONS, txns, 'transactions');
    EventBus.emit('transaction:added', txn);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('transactions', 'insert', txn);
    }
  },

  // ═══════════════ AGGREGATIONS ═══════════════
  getTotals(month = null) {
    const filters = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filters.startDate = y + '-' + String(m).padStart(2, '0') + '-01';
      filters.endDate = y + '-' + String(m).padStart(2, '0') + '-' + Utils.daysInMonth(y, m - 1);
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
      filters.startDate = y + '-' + String(m).padStart(2, '0') + '-01';
      filters.endDate = y + '-' + String(m).padStart(2, '0') + '-' + Utils.daysInMonth(y, m - 1);
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

  // PERFORMANCE FIX: O(transactions + days) instead of O(days × transactions)
  getDailyTotals(month) {
    const [y, m] = month.split('-').map(Number);
    const days = Utils.daysInMonth(y, m - 1);
    const monthStr = String(m).padStart(2, '0');

    // Fetch all transactions for the month in ONE call
    const txns = this.getTransactions({
      startDate: y + '-' + monthStr + '-01',
      endDate: y + '-' + monthStr + '-' + days
    });

    // Build hashmap
    const byDate = {};
    txns.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = { income: 0, expense: 0 };
      byDate[t.date][t.type] += t.amount;
    });

    // Build result array
    const result = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = y + '-' + monthStr + '-' + String(d).padStart(2, '0');
      const data = byDate[dateStr] || { income: 0, expense: 0 };
      result.push({ date: dateStr, day: d, income: data.income, expense: data.expense });
    }
    return result;
  },

  getMonthlyTotals(year) {
    const result = [];
    for (let m = 0; m < 12; m++) {
      const month = year + '-' + String(m + 1).padStart(2, '0');
      const totals = this.getTotals(month);
      result.push({ month, label: Utils.getShortMonth(m), ...totals });
    }
    return result;
  },

  // ═══════════════ BUDGETS ═══════════════
  getBudgets() { return this._state.budgets; },

  getBudget(month) {
    return this._state.budgets.find(b => b.month === month) || null;
  },

  setBudget(data) {
    const budgets = [...this._state.budgets];
    const idx = budgets.findIndex(b => b.month === data.month);
    let targetBudget;

    const syncFields = {
      user_id: Auth.getUser()?.id,
      version: 1,
      last_modified_at: new Date().toISOString(),
      device_id: Utils.getDeviceId(),
      conflict_resolution_strategy: 'last-write-wins'
    };

    if (idx >= 0) {
      budgets[idx] = { ...budgets[idx], ...data, ...syncFields, version: (budgets[idx].version || 1) + 1 };
      targetBudget = budgets[idx];
    } else {
      targetBudget = { id: Utils.generateId('budget'), ...data, ...syncFields };
      budgets.push(targetBudget);
    }

    this._saveToBoth(this.KEYS.BUDGETS, budgets, 'budgets');
    EventBus.emit('budget:updated', targetBudget);
    this._logActivity('Budget updated for ' + data.month);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('budgets', idx >= 0 ? 'upsert' : 'insert', targetBudget);
    }
  },

  getBudgetStatus(month) {
    const budget = this.getBudget(month);
    if (!budget) return null;
    const byCategory = this.getByCategory(month);
    const totals = this.getTotals(month);
    const categoryStatus = {};
    Object.entries(budget.categoryBudgets || budget.category_budgets || {}).forEach(([catId, limit]) => {
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
      totalBudget: budget.totalBudget || budget.total_budget,
      totalPct: Utils.percentage(totals.expense, budget.totalBudget || budget.total_budget),
      categoryStatus,
      remaining: (budget.totalBudget || budget.total_budget) - totals.expense,
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
    const catBudget = (budget.categoryBudgets || budget.category_budgets || {})[txn.category];
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
            message: 'You\'ve used ' + pct + '% of your ' + (cat ? cat.name : 'category') + ' budget (' + Utils.formatCurrency(spent) + ' / ' + Utils.formatCurrency(catBudget) + ')'
          });
        }
      });
    }
    return alerts;
  },

  // ═══════════════ CATEGORIES ═══════════════
  getCategories(type = null) {
    const cats = this._state.categories;
    if (type) return cats.filter(c => c.type === type);
    return cats;
  },

  getCategory(id) {
    return this._state.categories.find(c => c.id === id) || null;
  },

  addCategory(data) {
    const cat = {
      id: Utils.generateId('cat'),
      isDefault: false,
      is_default: false,
      ...data,
      user_id: Auth.getUser()?.id,
      version: 1,
      last_modified_at: new Date().toISOString(),
      device_id: Utils.getDeviceId(),
      conflict_resolution_strategy: 'last-write-wins'
    };
    const cats = [...this._state.categories, cat];
    this._saveToBoth(this.KEYS.CATEGORIES, cats, 'categories');
    this._logActivity('Category added — ' + cat.name);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('categories', 'insert', cat);
    }
    return cat;
  },

  updateCategory(id, data) {
    const cats = [...this._state.categories];
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...data, version: (cats[idx].version || 1) + 1, last_modified_at: new Date().toISOString(), device_id: Utils.getDeviceId() };
    this._saveToBoth(this.KEYS.CATEGORIES, cats, 'categories');

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('categories', 'update', cats[idx]);
    }
    return cats[idx];
  },

  deleteCategory(id) {
    const cats = [...this._state.categories];
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    if (cats[idx].isDefault || cats[idx].is_default) return null;
    const removed = cats.splice(idx, 1)[0];
    this._saveToBoth(this.KEYS.CATEGORIES, cats, 'categories');
    this._logActivity('Category deleted — ' + removed.name);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('categories', 'delete', { id, user_id: Auth.getUser()?.id });
    }
    return removed;
  },

  // ═══════════════ GOALS ═══════════════
  getGoals() { return this._state.goals; },

  addGoal(data) {
    const goal = {
      id: Utils.generateId('goal'),
      name: data.name,
      target_amount: parseFloat(data.target_amount || data.targetAmount),
      saved_amount: 0,
      deadline: data.deadline,
      icon: data.icon || 'target',
      color: data.color || '#6366f1',
      created_at: new Date().toISOString(),
      user_id: Auth.getUser()?.id,
      version: 1,
      last_modified_at: new Date().toISOString(),
      device_id: Utils.getDeviceId(),
      sync_status: 'pending',
      conflict_resolution_strategy: 'last-write-wins'
    };

    const goals = [...this._state.goals, goal];
    this._saveToBoth(this.KEYS.GOALS, goals, 'goals');
    EventBus.emit('goals:changed');
    this._logActivity('Goal created — ' + goal.name);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('goals', 'insert', goal);
    }
    return goal;
  },

  updateGoal(id, data) {
    const goals = [...this._state.goals];
    const idx = goals.findIndex(g => g.id === id);
    if (idx === -1) return null;
    goals[idx] = { ...goals[idx], ...data, version: (goals[idx].version || 1) + 1, last_modified_at: new Date().toISOString(), device_id: Utils.getDeviceId() };
    this._saveToBoth(this.KEYS.GOALS, goals, 'goals');
    EventBus.emit('goals:changed');

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('goals', 'update', goals[idx]);
    }
    return goals[idx];
  },

  deleteGoal(id) {
    const goals = [...this._state.goals];
    const idx = goals.findIndex(g => g.id === id);
    if (idx === -1) return null;
    const removed = goals.splice(idx, 1)[0];
    this._saveToBoth(this.KEYS.GOALS, goals, 'goals');
    EventBus.emit('goals:changed');
    this._logActivity('Goal deleted — ' + removed.name);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('goals', 'delete', { id, user_id: Auth.getUser()?.id });
    }
    return removed;
  },

  addFundsToGoal(id, amount) {
    const goal = this._state.goals.find(g => g.id === id);
    if (!goal) return null;
    const newSaved = (goal.saved_amount || 0) + parseFloat(amount);
    this._logActivity('₹' + amount + ' added to goal — ' + goal.name);
    return this.updateGoal(id, { saved_amount: newSaved });
  },

  // ═══════════════ DEBTS ═══════════════
  getDebts(type = null) {
    if (type) return this._state.debts.filter(d => d.type === type);
    return this._state.debts;
  },

  addDebt(data) {
    const debt = {
      id: Utils.generateId('debt'),
      name: data.name,
      original_amount: parseFloat(data.original_amount || data.originalAmount),
      remaining_amount: parseFloat(data.original_amount || data.originalAmount),
      description: data.description || '',
      due_date: data.due_date || data.dueDate || null,
      type: data.type,
      settled: false,
      created_at: new Date().toISOString(),
      user_id: Auth.getUser()?.id,
      version: 1,
      last_modified_at: new Date().toISOString(),
      device_id: Utils.getDeviceId(),
      sync_status: 'pending',
      conflict_resolution_strategy: 'last-write-wins'
    };

    const debts = [...this._state.debts, debt];
    this._saveToBoth(this.KEYS.DEBTS, debts, 'debts');
    EventBus.emit('debts:changed');
    this._logActivity('Debt added — ' + debt.name);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('debts', 'insert', debt);
    }
    return debt;
  },

  updateDebt(id, data) {
    const debts = [...this._state.debts];
    const idx = debts.findIndex(d => d.id === id);
    if (idx === -1) return null;
    debts[idx] = { ...debts[idx], ...data, version: (debts[idx].version || 1) + 1, last_modified_at: new Date().toISOString(), device_id: Utils.getDeviceId() };
    this._saveToBoth(this.KEYS.DEBTS, debts, 'debts');
    EventBus.emit('debts:changed');

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('debts', 'update', debts[idx]);
    }
    return debts[idx];
  },

  settleDebt(id, amount) {
    const debt = this._state.debts.find(d => d.id === id);
    if (!debt) return null;
    const newRemaining = Math.max(0, (debt.remaining_amount || 0) - parseFloat(amount));
    const settled = newRemaining <= 0;
    this._logActivity('₹' + amount + ' settled for — ' + debt.name);
    return this.updateDebt(id, { remaining_amount: newRemaining, settled });
  },

  deleteDebt(id) {
    const debts = [...this._state.debts];
    const idx = debts.findIndex(d => d.id === id);
    if (idx === -1) return null;
    const removed = debts.splice(idx, 1)[0];
    this._saveToBoth(this.KEYS.DEBTS, debts, 'debts');
    EventBus.emit('debts:changed');
    this._logActivity('Debt deleted — ' + removed.name);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('debts', 'delete', { id, user_id: Auth.getUser()?.id });
    }
    return removed;
  },

  // ═══════════════ RECURRING ═══════════════
  getRecurring() { return this._state.recurring; },

  addRecurring(data) {
    const template = {
      id: Utils.generateId('rec'),
      type: data.type,
      category: data.category,
      amount: parseFloat(data.amount),
      description: data.description || '',
      frequency: data.frequency,
      next_due: data.next_due || data.nextDue,
      active: true,
      created_at: new Date().toISOString(),
      user_id: Auth.getUser()?.id
    };

    const recurring = [...this._state.recurring, template];
    this._saveToBoth(this.KEYS.RECURRING, recurring, 'recurring');
    this._logActivity('Recurring ' + template.frequency + ' ' + template.type + ' created — ' + template.description);

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('recurring_templates', 'insert', template);
    }
    return template;
  },

  updateRecurring(id, data) {
    const recurring = [...this._state.recurring];
    const idx = recurring.findIndex(r => r.id === id);
    if (idx === -1) return null;
    recurring[idx] = { ...recurring[idx], ...data };
    this._saveToBoth(this.KEYS.RECURRING, recurring, 'recurring');

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('recurring_templates', 'update', recurring[idx]);
    }
    return recurring[idx];
  },

  deleteRecurring(id) {
    const recurring = [...this._state.recurring];
    const idx = recurring.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const removed = recurring.splice(idx, 1)[0];
    this._saveToBoth(this.KEYS.RECURRING, recurring, 'recurring');

    if (!Auth.isGuest() && typeof syncEngine !== 'undefined') {
      syncEngine.pushChange('recurring_templates', 'delete', { id, user_id: Auth.getUser()?.id });
    }
    return removed;
  },

  processRecurring() {
    const today = Utils.today();
    const templates = this._state.recurring.filter(t => t.active);

    templates.forEach(template => {
      if (template.next_due <= today) {
        // Create transaction
        this.addTransaction({
          type: template.type,
          category: template.category,
          amount: template.amount,
          description: template.description,
          date: today,
          recurringId: template.id
        });

        // Advance next_due
        const newDue = Utils.advanceDate(template.next_due, template.frequency);
        this.updateRecurring(template.id, { next_due: newDue });
      }
    });
  },

  // ═══════════════ ACTIVITY LOG ═══════════════
  _logActivity(message) {
    const entry = {
      id: Utils.generateId('log'),
      message,
      timestamp: new Date().toISOString()
    };
    const log = this._state.activityLog || [];
    log.unshift(entry);
    if (log.length > 200) log.splice(200);
    this._state.activityLog = log;
    try { localStorage.setItem(this.KEYS.ACTIVITY_LOG, JSON.stringify(log)); } catch (e) { /* OK */ }
  },

  getActivityLog(limit = 50) {
    return (this._state.activityLog || []).slice(0, limit);
  },

  clearActivityLog() {
    this._state.activityLog = [];
    localStorage.removeItem(this.KEYS.ACTIVITY_LOG);
  },

  // ═══════════════ SETTINGS ═══════════════
  getSettings() { return this._state.settings || this.defaultSettings(); },

  updateSettings(data) {
    const settings = { ...this.getSettings(), ...data };
    this._saveToBoth(this.KEYS.SETTINGS, settings, 'settings');
    EventBus.emit('settings:changed', settings);
    return settings;
  },

  // ═══════════════ DATA MANAGEMENT ═══════════════
  exportData() {
    return JSON.stringify({
      transactions: this._state.transactions,
      categories: this._state.categories,
      budgets: this._state.budgets,
      goals: this._state.goals,
      debts: this._state.debts,
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  importData(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (data.transactions) this._saveToBoth(this.KEYS.TRANSACTIONS, data.transactions, 'transactions');
      if (data.categories) this._saveToBoth(this.KEYS.CATEGORIES, data.categories, 'categories');
      if (data.budgets) this._saveToBoth(this.KEYS.BUDGETS, data.budgets, 'budgets');
      if (data.goals) this._saveToBoth(this.KEYS.GOALS, data.goals, 'goals');
      if (data.debts) this._saveToBoth(this.KEYS.DEBTS, data.debts, 'debts');
      if (data.settings) this._saveToBoth(this.KEYS.SETTINGS, data.settings, 'settings');
      this._logActivity('Data imported successfully');
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  loadDemoData() {
    const existing = [...this._state.transactions];
    const toAdd = SAMPLE_TRANSACTIONS.map(t => ({
      ...t,
      user_id: Auth.getUser()?.id,
      version: 1,
      last_modified_at: new Date().toISOString(),
      device_id: Utils.getDeviceId(),
      sync_status: 'synced',
      conflict_resolution_strategy: 'last-write-wins',
      notes: '',
      split_group_id: null,
      recurring_id: null,
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    const newTxns = [...existing, ...toAdd];
    this._saveToBoth(this.KEYS.TRANSACTIONS, newTxns, 'transactions');

    const existingBudgets = [...this._state.budgets];
    SAMPLE_BUDGETS.forEach(b => {
      if (!existingBudgets.find(eb => eb.month === b.month)) {
        existingBudgets.push({
          ...b,
          user_id: Auth.getUser()?.id,
          version: 1,
          last_modified_at: new Date().toISOString(),
          device_id: Utils.getDeviceId()
        });
      }
    });
    this._saveToBoth(this.KEYS.BUDGETS, existingBudgets, 'budgets');
    this._logActivity('Demo data loaded — ' + toAdd.length + ' transactions added');
  },

  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  }
};

// ═══════════════ EVENT BUS ═══════════════
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
    (this._events[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error('EventBus error in', event, ':', e); }
    });
  }
};
