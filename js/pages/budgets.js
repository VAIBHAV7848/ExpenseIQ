/* ========================================
   ExpenseIQ — Budgets Page Renderer
   ======================================== */

const Budgets = {
  currentMonth: Utils.toMonthString(new Date()),

  render() {
    const content = document.getElementById('page-content');
    const stats = Store.getBudgetStatus(this.currentMonth);
    
    if (!stats) {
      this.renderEmpty(content);
      return;
    }

    const { totalSpent, totalBudget, totalPct, remaining, daysLeft, categoryStatus } = stats;
    let mainStatus = totalPct >= 100 ? 'over-budget' : totalPct >= 80 ? 'near-limit' : totalPct >= 60 ? 'watch-out' : 'on-track';

    content.innerHTML = `
      <div class="overall-budget-card animate-fade-in-down">
        <div class="overall-budget-header">
          <h2 class="overall-budget-title">Monthly Budget</h2>
          <button class="btn btn-secondary btn-sm" onclick="Budgets.showBudgetModal()">Edit</button>
        </div>
        
        <div class="overall-budget-amounts">
          <div class="overall-budget-spent">${Utils.formatCurrency(totalSpent)}</div>
          <div class="overall-budget-total">/ ${Utils.formatCurrency(totalBudget)}</div>
        </div>
        
        <div class="progress-bar" style="height: 12px;">
          <div class="progress-bar-fill ${mainStatus === 'over-budget'?'overbudget':mainStatus==='on-track'?'green':mainStatus==='watch-out'?'yellow':'red'}" style="width: ${Math.min(totalPct, 100)}%"></div>
        </div>
        
        <div class="overall-budget-meta">
          <div class="budget-meta-item">Used: <strong>${Math.round(totalPct)}%</strong></div>
          <div class="budget-meta-item">Remaining: <strong>${Utils.formatCurrency(remaining)}</strong></div>
          <div class="budget-meta-item">Days Left: <strong>${daysLeft}</strong></div>
          <div class="budget-meta-item">Daily Avg Allowed: <strong>${Utils.formatCurrency(remaining / (daysLeft||1))}</strong></div>
        </div>
      </div>

      <h3 class="section-title" style="margin-bottom: var(--space-4);">Category Budgets</h3>
      <div class="budget-cards-grid stagger-children">
        ${Object.entries(categoryStatus).map(([catId, data]) => {
          const cat = Store.getCategory(catId);
          if(!cat) return '';
          return `
            <div class="budget-card">
              <div class="budget-card-header">
                <div class="budget-card-icon" style="background: ${cat.color}">
                  <i data-lucide="${cat.icon}"></i>
                </div>
                <div class="budget-card-info">
                  <div class="budget-card-name">${cat.name}</div>
                  <div class="budget-card-amounts">${Utils.formatCurrency(data.spent)} / ${Utils.formatCurrency(data.limit)}</div>
                </div>
                <div class="budget-card-status ${data.status}">
                  ${data.status === 'over-budget' ? 'Over Budget' : data.status === 'near-limit' ? 'Near Limit' : data.status === 'watch-out' ? 'Watch Out' : 'On Track'}
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill ${data.status === 'on-track'?'green':data.status==='watch-out'?'yellow':'red'}" style="width: ${Math.min(data.pct, 100)}%"></div>
              </div>
              <div class="budget-card-footer">
                <div class="budget-card-remaining">${Utils.formatCurrency(data.limit - data.spent)} remaining</div>
                <div class="budget-card-pct">${Math.round(data.pct)}%</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  renderEmpty(content) {
    content.innerHTML = `
      <div class="empty-state animate-fade-in-up">
        <div class="empty-state-icon"><i data-lucide="target"></i></div>
        <h3 class="empty-state-title">No budget set</h3>
        <p class="empty-state-message">Set a monthly budget to track your spending limits and get alerts.</p>
        <button class="btn btn-primary" onclick="Budgets.showBudgetModal()" style="margin-top: 24px;">Setup Budget</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  },

  showBudgetModal() {
    const activeBudget = Store.getBudget(this.currentMonth);
    const expCats = Store.getCategories('expense');
    
    // Convert current map to inputs easily
    const limits = activeBudget ? activeBudget.categoryBudgets : {};
    
    Modal.show({
      title: activeBudget ? 'Edit Budget' : 'Setup Budget',
      content: `
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
          Set monthly spending limits for each category. Leave blank for no limit.
        </div>
        ${AI.isAvailable() ? `
        <div style="margin-bottom:16px;">
          <button class="btn btn-secondary btn-sm" id="btn-ai-budget"
            style="width:100%;border:1px dashed var(--accent-primary);">
            <span style="font-size:14px;">✨</span>
            AI Suggest Budget (based on your last 2 months)
          </button>
          <div id="ai-budget-status" style="font-size:11px;
            color:var(--text-secondary);margin-top:4px;
            text-align:center;"></div>
        </div>
        ` : ''}
        <form id="budget-form">
          <div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${expCats.map(cat => `
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 12px; display:flex; align-items:center; gap: 6px;">
                  <span style="color:${cat.color}"><i data-lucide="${cat.icon}" style="width:14px;height:14px;"></i></span>
                  ${cat.name}
                </label>
                <input type="number" name="cat_${cat.id}" class="form-input" style="height: 38px; font-size: 14px;" placeholder="0" value="${limits[cat.id] || ''}">
              </div>
            `).join('')}
          </div>
        </form>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', id: 'cancel-budget-btn' },
        { text: 'Save Budget', class: 'btn-primary', id: 'save-budget-btn' }
      ],
      onRender: (modalEl) => {
        if (window.lucide) lucide.createIcons();
        document.getElementById('cancel-budget-btn').addEventListener('click', () => Modal.close());

        // Gap 8 — AI Budget Suggestion
        document.getElementById('btn-ai-budget')
          ?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-ai-budget');
            const status = document.getElementById('ai-budget-status');
            btn.disabled = true;
            btn.textContent = '⏳ Analyzing your spending...';
            if (status) status.textContent = '';

            const suggested = await AI.suggestBudget();

            btn.disabled = false;
            btn.innerHTML =
              '<span style="font-size:14px;">✨</span>' +
              ' AI Suggest Budget (based on your last 2 months)';

            if (suggested) {
              // Fill all inputs with suggested values
              Object.entries(suggested).forEach(([catId, amt]) => {
                const input = modalEl.querySelector(
                  'input[name="cat_' + catId + '"]');
                if (input) input.value = Math.round(amt);
              });
              if (status) {
                status.textContent =
                  '✓ AI filled in suggested limits — ' +
                  'review and adjust before saving.';
                status.style.color = 'var(--color-income)';
              }
              Toast.info('AI Suggested',
                'Review the suggested limits and click Save.');
            } else {
              if (status) {
                status.textContent =
                  '✕ Not enough data. Add more transactions first.';
                status.style.color = 'var(--color-expense)';
              }
            }
          });
        
        document.getElementById('save-budget-btn').addEventListener('click', () => {
          const form = document.getElementById('budget-form');
          const data = { month: this.currentMonth, totalBudget: 0, categoryBudgets: {} };
          
          Array.from(form.elements).forEach(input => {
            if (input.name && input.value) {
              const id = input.name.replace('cat_', '');
              const val = parseFloat(input.value);
              if (val > 0) {
                data.categoryBudgets[id] = val;
                data.totalBudget += val;
              }
            }
          });
          
          if (data.totalBudget === 0) {
            Toast.error('Error', 'Please enter at least one budget limit.');
            return;
          }
          
          Store.setBudget(data);
          Toast.success('Saved', 'Budget updated successfully.');
          Modal.close();
          this.render();
          Sidebar.render();
          Header.render();
        });
      }
    });
  }
};
