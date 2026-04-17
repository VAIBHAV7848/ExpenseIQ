/* ========================================
   ExpenseIQ — Application Entry Point
   ======================================== */

const App = {
  async init() {
    console.log('%c ExpenseIQ v2.0 ', 'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; font-size: 16px; padding: 8px 16px; border-radius: 8px; font-weight: bold;');

    // 1. Apply theme
    const savedTheme = localStorage.getItem('expenseiq_settings');
    try {
      const s = JSON.parse(savedTheme);
      if (s?.theme) document.documentElement.setAttribute('data-theme', s.theme);
    } catch (e) { /* Use default dark */ }

    // 2. Init Auth
    await Auth.init();

    // 3. Init Store (loads from localStorage + optionally from Supabase)
    await Store.init();

    // 4. Register routes
    Router.addRoute('#/login', () => Login.render());
    Router.addRoute('#/', () => Dashboard.render());
    Router.addRoute('#/transactions', () => Transactions.render());
    Router.addRoute('#/reports', () => Reports.render());
    Router.addRoute('#/budgets', () => Budgets.render());
    Router.addRoute('#/categories', () => Categories.render());
    Router.addRoute('#/settings', () => Settings.render());
    Router.addRoute('#/goals', () => Goals.render());
    Router.addRoute('#/debts', () => Debts.render());

    // 5. Init Router
    Router.init();

    // 5b. Ensure app shell renders (sidebar + header)
    if (Auth.isAuthenticated() || Auth.isGuest()) {
      Sidebar.render();
      Header.render();
      document.getElementById('app').style.display = 'flex';
    }

    // 6. Init Sync Engine (non-blocking)
    try { await syncEngine.init(); } catch (e) { console.warn('SyncEngine init skipped:', e); }

    // 7. Init Subscriptions
    if (Auth.isAuthenticated()) {
      try { await subscriptionManager.init(); } catch (e) { console.warn('Subscriptions init skipped:', e); }
    }

    // 8. Init AI Chat Widget
    try { AiChat.init(); } catch (e) { console.warn('AiChat init skipped:', e); }

    // 9. Process recurring transactions
    Store.processRecurring();

    // 10. Global event listeners
    this._setupGlobalEvents();

    // 11. Setup transaction modal global handler
    this._setupTransactionModal();

    // 12. Init Modals
    Modal.init();
  },

  _setupGlobalEvents() {
    // Re-render charts on theme change
    EventBus.on('theme:changed', () => {
      if (typeof Charts !== 'undefined') Charts.updateAllThemes();
    });

    // Refresh current page on major data changes
    EventBus.on('transaction:added', (txn) => {
      const alerts = Store.checkBudgetAlerts(txn);
      alerts.forEach(a => Toast[a.type === 'error' ? 'error' : 'warning'](a.title, a.message));
    });
  },

  _setupTransactionModal() {
    window.showAddTransactionModal = (defaultType) => {
      const categories = Store.getCategories();
      const expCats = categories.filter(c => c.type === 'expense');
      const incCats = categories.filter(c => c.type === 'income');

      Modal.show({
        title: 'Add Transaction',
        class: 'modal-lg',
        content: `
          ${AI.isAvailable() ? `
            <div class="form-group ai-smart-add">
              <label class="form-label" style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:16px;">✨</span> Smart Add (AI)
              </label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="smart-add-input" class="form-input" placeholder='Type naturally: "Spent ₹500 on groceries yesterday"' style="flex:1;">
                <button class="btn btn-primary btn-sm" id="smart-add-btn" style="white-space:nowrap;">Parse</button>
              </div>
              <div id="smart-add-status" class="text-muted" style="font-size:12px; margin-top:4px;"></div>
            </div>
            <div class="form-divider">
              <span>or fill manually</span>
            </div>
          ` : ''}

          <div class="type-toggle" id="type-toggle">
            <button class="type-btn ${(defaultType || 'expense') === 'expense' ? 'active' : ''} expense-btn" data-type="expense">Expense</button>
            <button class="type-btn ${defaultType === 'income' ? 'active' : ''} income-btn" data-type="income">Income</button>
          </div>

          <div class="form-group">
            <label class="form-label">Amount (₹)</label>
            <input type="number" id="txn-amount" class="form-input form-input-lg" placeholder="0" min="1" step="1" autofocus>
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="txn-category" class="form-input">
              <optgroup label="Expense" id="txn-expense-opts">
                ${expCats.map(c => '<option value="' + c.id + '">' + Utils.escapeHtml(c.name) + '</option>').join('')}
              </optgroup>
              <optgroup label="Income" id="txn-income-opts">
                ${incCats.map(c => '<option value="' + c.id + '">' + Utils.escapeHtml(c.name) + '</option>').join('')}
              </optgroup>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="txn-desc" class="form-input" placeholder="What was this for?">
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" id="txn-date" class="form-input" value="${Utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label">Notes (optional)</label>
              <input type="text" id="txn-notes" class="form-input" placeholder="Extra details...">
            </div>
          </div>
        `,
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', id: 'cancel-txn-btn' },
          { text: 'Save Transaction', class: 'btn-primary', id: 'save-txn-btn' }
        ],
        onRender: (modalEl) => {
          let currentType = defaultType || 'expense';

          // Type toggle
          modalEl.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              modalEl.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              currentType = btn.dataset.type;
              this._filterCategoryOptions(currentType);
            });
          });

          // Initial filter
          this._filterCategoryOptions(currentType);

          // AI Smart Add
          document.getElementById('smart-add-btn')?.addEventListener('click', async () => {
            const input = document.getElementById('smart-add-input');
            const status = document.getElementById('smart-add-status');
            const text = input?.value.trim();
            if (!text) return;

            status.textContent = 'Parsing with AI...';
            status.style.color = 'var(--accent-primary)';

            const result = await AI.parseTransaction(text);
            if (result) {
              if (result.amount) document.getElementById('txn-amount').value = result.amount;
              if (result.description) document.getElementById('txn-desc').value = result.description;
              if (result.date) document.getElementById('txn-date').value = result.date;
              if (result.categoryId) document.getElementById('txn-category').value = result.categoryId;
              if (result.type) {
                currentType = result.type;
                modalEl.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                modalEl.querySelector('.type-btn[data-type="' + result.type + '"]')?.classList.add('active');
                this._filterCategoryOptions(result.type);
              }
              status.textContent = '✓ Parsed successfully! Review and save.';
              status.style.color = 'var(--color-income)';
            } else {
              status.textContent = '✕ Could not parse. Please fill manually.';
              status.style.color = 'var(--color-expense)';
            }
          });

          // Save button
          document.getElementById('save-txn-btn')?.addEventListener('click', () => {
            const amount = document.getElementById('txn-amount')?.value;
            const category = document.getElementById('txn-category')?.value;
            const description = document.getElementById('txn-desc')?.value.trim();
            const date = document.getElementById('txn-date')?.value;
            const notes = document.getElementById('txn-notes')?.value.trim();

            if (!amount || parseFloat(amount) <= 0) {
              Toast.error('Invalid Amount', 'Please enter a positive amount.'); return;
            }
            if (!description) {
              Toast.error('Missing Description', 'Please describe this transaction.'); return;
            }

            const txn = Store.addTransaction({
              type: currentType,
              amount: parseFloat(amount),
              category,
              description,
              date: date || Utils.today(),
              notes
            });

            Toast.success(currentType === 'income' ? 'Income Added' : 'Expense Added',
              Utils.formatCurrency(txn.amount) + ' — ' + txn.description
            );
            Modal.close();

            // Refresh current page
            const route = Router.currentRoute;
            if (route === '#/' && typeof Dashboard !== 'undefined') Dashboard.render();
            else if (route === '#/transactions' && typeof Transactions !== 'undefined') Transactions.render();
            if (typeof Sidebar !== 'undefined') Sidebar.render();
          });

          // Cancel
          document.getElementById('cancel-txn-btn')?.addEventListener('click', () => Modal.close());
        }
      });
    };
  },

  _filterCategoryOptions(type) {
    const expOpts = document.getElementById('txn-expense-opts');
    const incOpts = document.getElementById('txn-income-opts');
    if (expOpts) expOpts.style.display = type === 'expense' ? '' : 'none';
    if (incOpts) incOpts.style.display = type === 'income' ? '' : 'none';

    // Select first option of visible group
    const select = document.getElementById('txn-category');
    if (select) {
      const visibleOpts = select.querySelectorAll('optgroup[style=""] option, optgroup:not([style]) option');
      if (visibleOpts.length > 0) select.value = visibleOpts[0].value;
    }
  }
};

// Boot the application
document.addEventListener('DOMContentLoaded', () => App.init());
