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
    // Always render — login page hides the shell, router guard handles auth
    try {
      Sidebar.render();
      Header.render();
    } catch (e) { console.warn('Shell render deferred:', e); }

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

    // 12. Setup edit transaction modal (Gap 1)
    this._setupEditModal();

    // 13. Setup voice input (Gap 9)
    this._setupVoiceInput();

    // 14. Init Modals
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

          <div class="form-group" id="split-toggle-wrap">
            <button class="btn btn-secondary btn-sm" id="btn-split-toggle" style="width:100%;">
              <i data-lucide="scissors"></i> Split into multiple categories
            </button>
          </div>

          <div id="split-rows-container" style="display:none;">
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">
              Split amounts must add up to the total above.
              <span id="split-total-indicator" style="font-weight:bold; color:var(--accent-primary);"></span>
            </div>
            <div id="split-rows"></div>
            <button class="btn btn-secondary btn-sm" id="btn-add-split-row" style="margin-top:8px; width:100%;">
              + Add Row
            </button>
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

          <div class="form-group">
            <label class="form-label">Repeat</label>
            <select id="txn-repeat" class="form-input">
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
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

          // Gap 2 — AI Auto-categorize on description input
          const descInput = document.getElementById('txn-desc');
          if (descInput && AI.isAvailable()) {
            let aiCatTimeout;
            descInput.addEventListener('input', () => {
              clearTimeout(aiCatTimeout);
              aiCatTimeout = setTimeout(async () => {
                const desc = descInput.value.trim();
                if (desc.length < 3) return;
                const suggestedId = await AI.suggestCategory(desc, currentType);
                if (suggestedId) {
                  const select = document.getElementById('txn-category');
                  if (select && select.value !== suggestedId) {
                    select.value = suggestedId;
                    // Show subtle "AI suggested" label under the select
                    let lbl = document.getElementById('ai-cat-label');
                    if (!lbl) {
                      lbl = document.createElement('div');
                      lbl.id = 'ai-cat-label';
                      lbl.style.cssText = 'font-size:11px; color:var(--accent-primary);' +
                        'margin-top:4px; opacity:0.8;';
                      select.parentElement.appendChild(lbl);
                    }
                    lbl.textContent = '✨ AI suggested — tap to change';
                    // Remove label if user manually changes category
                    select.addEventListener('change', () => {
                      lbl.textContent = '';
                    }, { once: true });
                  }
                }
              }, 800);
            });
          }

          // Gap 4 — Split transaction logic
          let splitMode = false;
          const expCatOptions = Store.getCategories('expense')
            .map(c => '<option value="' + c.id + '">' +
              Utils.escapeHtml(c.name) + '</option>').join('');

          function addSplitRow() {
            const row = document.createElement('div');
            row.className = 'form-row-2';
            row.style.marginBottom = '8px';
            row.innerHTML =
              '<select class="form-input split-row-cat">' +
                expCatOptions + '</select>' +
              '<div style="display:flex;gap:4px;">' +
                '<input type="number" class="form-input split-row-amount" ' +
                  'placeholder="₹" min="1" step="1">' +
                '<button class="btn btn-ghost btn-icon btn-remove-split" ' +
                  'title="Remove"><i data-lucide="x"></i></button>' +
              '</div>';
            row.querySelector('.btn-remove-split').addEventListener('click',
              () => { row.remove(); updateSplitTotal(); });
            row.querySelector('.split-row-amount').addEventListener('input',
              updateSplitTotal);
            document.getElementById('split-rows').appendChild(row);
            if (window.lucide) lucide.createIcons();
          }

          function updateSplitTotal() {
            const total = [...document.querySelectorAll('.split-row-amount')]
              .reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
            const mainAmt = parseFloat(
              document.getElementById('txn-amount')?.value) || 0;
            const ind = document.getElementById('split-total-indicator');
            if (ind) {
              ind.textContent = Utils.formatCurrency(total) + ' / ' +
                Utils.formatCurrency(mainAmt) + (
                  Math.abs(total - mainAmt) < 0.01 ? ' ✓' :
                  total > mainAmt ? ' (over)' : ' (under)');
              ind.style.color = Math.abs(total - mainAmt) < 0.01
                ? 'var(--color-income)' : 'var(--color-expense)';
            }
          }

          document.getElementById('btn-split-toggle')?.addEventListener(
            'click', () => {
              splitMode = !splitMode;
              const container = document.getElementById(
                'split-rows-container');
              container.style.display = splitMode ? 'block' : 'none';
              if (splitMode && !document.querySelector('.split-row-cat')) {
                addSplitRow(); addSplitRow(); // Start with 2 rows
              }
            });

          document.getElementById('btn-add-split-row')?.addEventListener(
            'click', addSplitRow);

          document.getElementById('txn-amount')?.addEventListener('input',
            updateSplitTotal);

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

            // Gap 4 — Split mode save
            if (splitMode) {
              const rows = document.querySelectorAll(
                '#split-rows .form-row-2');
              const splitAmounts = [];
              rows.forEach(row => {
                const cat = row.querySelector('.split-row-cat')?.value;
                const amt = parseFloat(
                  row.querySelector('.split-row-amount')?.value);
                if (cat && amt > 0) splitAmounts.push({ cat, amt });
              });
              if (splitAmounts.length < 2) {
                Toast.error('Split Error',
                  'Add at least 2 rows for a split transaction.');
                return;
              }
              const totalSplit = splitAmounts.reduce((s, r) => s + r.amt, 0);
              if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
                Toast.error('Split Error',
                  'Split amounts must equal the total amount.');
                return;
              }
              const groupId = Utils.generateId('split');
              splitAmounts.forEach(r => {
                Store.addTransaction({
                  type: currentType, amount: r.amt, category: r.cat,
                  description, date: date || Utils.today(), notes,
                  splitGroupId: groupId
                });
              });
              Toast.success('Split Added',
                description + ' split into ' + splitAmounts.length +
                ' transactions.');
            } else {
              // Original single transaction add (existing code)
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
            }

            // Gap 3 — Recurring transaction
            const repeat = document.getElementById('txn-repeat')?.value;
            if (repeat && repeat !== 'none') {
              Store.addRecurring({
                type: currentType,
                category: document.getElementById('txn-category')?.value,
                amount: parseFloat(amount),
                description,
                frequency: repeat,
                next_due: Utils.advanceDate(date || Utils.today(), repeat),
                active: true
              });
              Toast.info('Recurring Set',
                'Will auto-add every ' + repeat + ' starting ' +
                Utils.advanceDate(date || Utils.today(), repeat));
            }

            Modal.close();

            // Refresh current page
            const route = Router.currentRoute;
            if (route === '#/' && typeof Dashboard !== 'undefined') Dashboard.render();
            else if (route === '#/transactions' && typeof Transactions !== 'undefined') Transactions.render();
            if (typeof Sidebar !== 'undefined') Sidebar.render();
          });

          // Cancel
          document.getElementById('cancel-txn-btn')?.addEventListener('click', () => Modal.close());

          // Lucide icons for split button
          if (window.lucide) lucide.createIcons();
        }
      });
    };
  },

  // Gap 1 — Edit Transaction Modal
  _setupEditModal() {
    window.showEditTransactionModal = (txn) => {
      const categories = Store.getCategories();
      const expCats = categories.filter(c => c.type === 'expense');
      const incCats = categories.filter(c => c.type === 'income');

      Modal.show({
        title: 'Edit Transaction',
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
              <span>or edit manually</span>
            </div>
          ` : ''}

          <div class="type-toggle" id="type-toggle">
            <button class="type-btn ${txn.type === 'expense' ? 'active' : ''} expense-btn" data-type="expense">Expense</button>
            <button class="type-btn ${txn.type === 'income' ? 'active' : ''} income-btn" data-type="income">Income</button>
          </div>

          <div class="form-group">
            <label class="form-label">Amount (₹)</label>
            <input type="number" id="txn-amount" class="form-input form-input-lg" placeholder="0" min="1" step="1" value="${txn.amount}" autofocus>
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="txn-category" class="form-input">
              <optgroup label="Expense" id="txn-expense-opts">
                ${expCats.map(c => '<option value="' + c.id + '"' + (c.id === txn.category ? ' selected' : '') + '>' + Utils.escapeHtml(c.name) + '</option>').join('')}
              </optgroup>
              <optgroup label="Income" id="txn-income-opts">
                ${incCats.map(c => '<option value="' + c.id + '"' + (c.id === txn.category ? ' selected' : '') + '>' + Utils.escapeHtml(c.name) + '</option>').join('')}
              </optgroup>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="txn-desc" class="form-input" placeholder="What was this for?" value="${Utils.escapeHtml(txn.description)}">
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" id="txn-date" class="form-input" value="${txn.date}">
            </div>
            <div class="form-group">
              <label class="form-label">Notes (optional)</label>
              <input type="text" id="txn-notes" class="form-input" placeholder="Extra details..." value="${Utils.escapeHtml(txn.notes || '')}">
            </div>
          </div>
        `,
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', id: 'cancel-txn-btn' },
          { text: 'Save Changes', class: 'btn-primary', id: 'save-txn-btn' }
        ],
        onRender: (modalEl) => {
          let currentType = txn.type;

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

          // AI Smart Add in edit mode
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

          // Gap 2 — AI Auto-categorize on description input (edit mode)
          const descInput = document.getElementById('txn-desc');
          if (descInput && AI.isAvailable()) {
            let aiCatTimeout;
            descInput.addEventListener('input', () => {
              clearTimeout(aiCatTimeout);
              aiCatTimeout = setTimeout(async () => {
                const desc = descInput.value.trim();
                if (desc.length < 3) return;
                const suggestedId = await AI.suggestCategory(desc, currentType);
                if (suggestedId) {
                  const select = document.getElementById('txn-category');
                  if (select && select.value !== suggestedId) {
                    select.value = suggestedId;
                    let lbl = document.getElementById('ai-cat-label');
                    if (!lbl) {
                      lbl = document.createElement('div');
                      lbl.id = 'ai-cat-label';
                      lbl.style.cssText = 'font-size:11px; color:var(--accent-primary);' +
                        'margin-top:4px; opacity:0.8;';
                      select.parentElement.appendChild(lbl);
                    }
                    lbl.textContent = '✨ AI suggested — tap to change';
                    select.addEventListener('change', () => {
                      lbl.textContent = '';
                    }, { once: true });
                  }
                }
              }, 800);
            });
          }

          // Save button — update instead of add
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

            Store.updateTransaction(txn.id, {
              type: currentType,
              amount: parseFloat(amount),
              category,
              description,
              date: date || Utils.today(),
              notes
            });

            Toast.success('Updated',
              Utils.formatCurrency(parseFloat(amount)) + ' — ' + description);
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

  // Gap 9 — Voice Input
  _setupVoiceInput() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Not supported — hide button

    window.startVoiceInput = () => {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      // Show recording indicator
      const indicator = document.getElementById('voice-indicator');
      if (indicator) {
        indicator.style.display = 'flex';
        indicator.classList.add('recording');
      }
      Toast.info('Listening...', 'Speak your transaction now');

      rec.start();

      rec.onresult = async (event) => {
        const transcript =
          event.results[0][0].transcript;
        if (indicator) {
          indicator.style.display = 'none';
          indicator.classList.remove('recording');
        }
        Toast.info('Processing...', '"' + transcript + '"');

        // Open modal and pre-fill via AI
        window.showAddTransactionModal();

        // Wait for modal to render then parse
        setTimeout(async () => {
          if (AI.isAvailable()) {
            const result = await AI.parseTransaction(transcript);
            if (result) {
              if (result.amount)
                document.getElementById('txn-amount').value =
                  result.amount;
              if (result.description)
                document.getElementById('txn-desc').value =
                  result.description;
              if (result.date)
                document.getElementById('txn-date').value =
                  result.date;
              if (result.categoryId)
                document.getElementById('txn-category').value =
                  result.categoryId;
              Toast.success('Voice Parsed',
                'Review and save your transaction.');
            }
          } else {
            // No AI — put raw transcript in description
            const descEl =
              document.getElementById('txn-desc');
            if (descEl) descEl.value = transcript;
          }
        }, 500);
      };

      rec.onerror = (event) => {
        if (indicator) {
          indicator.style.display = 'none';
          indicator.classList.remove('recording');
        }
        const msgs = {
          'no-speech': 'No speech detected. Try again.',
          'audio-capture': 'Microphone not found.',
          'not-allowed': 'Microphone permission denied.',
          'network': 'Network error during recognition.'
        };
        Toast.error('Voice Error',
          msgs[event.error] || 'Voice input failed.');
      };

      rec.onend = () => {
        if (indicator) {
          indicator.style.display = 'none';
          indicator.classList.remove('recording');
        }
      };
    };

    // Show mic button in header now that it's supported
    const micBtn = document.getElementById('voice-mic-btn');
    if (micBtn) micBtn.style.display = 'flex';
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
