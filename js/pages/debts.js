/* ========================================
   ExpenseIQ — Debt Tracker Page
   ======================================== */

const Debts = {
  currentTab: 'owe',

  render() {
    const content = document.getElementById('page-content');
    const allDebts = Store.getDebts();
    const oweDebts = allDebts.filter(d => d.type === 'owe');
    const lendDebts = allDebts.filter(d => d.type === 'lend');

    const totalOwe = oweDebts.filter(d => !d.settled).reduce((s, d) => s + (d.remaining_amount || 0), 0);
    const totalLend = lendDebts.filter(d => !d.settled).reduce((s, d) => s + (d.remaining_amount || 0), 0);

    content.innerHTML = `
      <div class="debts-header animate-fade-in-down">
        <div class="debts-summary-row">
          <div class="debt-summary-card owe">
            <div class="debt-summary-label">I Owe</div>
            <div class="debt-summary-amount text-expense">${Utils.formatCurrency(totalOwe)}</div>
          </div>
          <div class="debt-summary-card lend">
            <div class="debt-summary-label">Owed to Me</div>
            <div class="debt-summary-amount text-income">${Utils.formatCurrency(totalLend)}</div>
          </div>
          <div class="debt-summary-card net">
            <div class="debt-summary-label">Net Balance</div>
            <div class="debt-summary-amount ${totalLend - totalOwe >= 0 ? 'text-income' : 'text-expense'}">${Utils.formatCurrency(totalLend - totalOwe)}</div>
          </div>
        </div>
      </div>

      <div class="debts-tabs animate-fade-in-up" style="animation-delay:50ms">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="pills">
            <div class="pill ${this.currentTab === 'owe' ? 'active' : ''}" id="tab-owe">I Owe (${oweDebts.length})</div>
            <div class="pill ${this.currentTab === 'lend' ? 'active' : ''}" id="tab-lend">Owed to Me (${lendDebts.length})</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Debts.showAddModal()">
            <i data-lucide="plus"></i> Add Debt
          </button>
        </div>
      </div>

      <div id="debts-list" class="debts-list stagger-children" style="animation-delay:100ms"></div>
    `;

    if (window.lucide) lucide.createIcons();
    document.getElementById('tab-owe')?.addEventListener('click', () => { this.currentTab = 'owe'; this.render(); });
    document.getElementById('tab-lend')?.addEventListener('click', () => { this.currentTab = 'lend'; this.render(); });
    this.renderList();
  },

  renderList() {
    const list = document.getElementById('debts-list');
    if (!list) return;

    const debts = Store.getDebts(this.currentTab);
    const active = debts.filter(d => !d.settled);
    const settled = debts.filter(d => d.settled);

    if (debts.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding:40px;">
          <div class="empty-state-icon"><i data-lucide="${this.currentTab === 'owe' ? 'arrow-up-right' : 'arrow-down-left'}"></i></div>
          <h3 class="empty-state-title">No ${this.currentTab === 'owe' ? 'debts' : 'loans'} recorded</h3>
          <p class="empty-state-message">Track money you ${this.currentTab === 'owe' ? 'owe to others' : 'lent to others'} here.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    let html = '';

    if (active.length > 0) {
      html += '<div class="debts-section-label">Active</div>';
      html += active.map(d => this._renderDebtCard(d)).join('');
    }
    if (settled.length > 0) {
      html += '<div class="debts-section-label" style="margin-top: 24px;">Settled</div>';
      html += settled.map(d => this._renderDebtCard(d)).join('');
    }

    list.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  },

  _renderDebtCard(debt) {
    const pct = Utils.percentage(debt.original_amount - debt.remaining_amount, debt.original_amount);
    const isOverdue = debt.due_date && new Date(debt.due_date) < new Date() && !debt.settled;

    return `
      <div class="debt-card ${debt.settled ? 'settled' : ''} ${isOverdue ? 'overdue' : ''}">
        <div class="debt-card-header">
          <div class="debt-card-left">
            <div class="debt-card-avatar ${debt.type}">
              <i data-lucide="${debt.type === 'owe' ? 'arrow-up-right' : 'arrow-down-left'}"></i>
            </div>
            <div>
              <div class="debt-card-name">${Utils.escapeHtml(debt.name)}</div>
              <div class="debt-card-desc">${Utils.escapeHtml(debt.description || '')}</div>
            </div>
          </div>
          <div class="debt-card-right">
            <div class="debt-card-amount ${debt.type === 'owe' ? 'text-expense' : 'text-income'}">${Utils.formatCurrency(debt.remaining_amount)}</div>
            ${debt.settled ? '<span class="debt-badge settled">Settled</span>' :
              isOverdue ? '<span class="debt-badge overdue">Overdue</span>' : ''}
          </div>
        </div>
        ${!debt.settled ? `
          <div class="progress-bar" style="height:6px; margin:12px 0 8px;">
            <div class="progress-bar-fill ${pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : ''}" style="width:${pct}%"></div>
          </div>
          <div class="debt-card-footer">
            <span class="text-muted text-xs">Paid: ${Utils.formatCurrency(debt.original_amount - debt.remaining_amount)} of ${Utils.formatCurrency(debt.original_amount)} (${pct}%)</span>
            <div class="debt-card-actions">
              ${debt.due_date ? '<span class="text-muted text-xs">Due: ' + Utils.formatDate(debt.due_date, 'short') + '</span>' : ''}
              <button class="btn btn-primary btn-sm" onclick="Debts.showSettleModal('${debt.id}')">Pay</button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="Debts.deleteDebt('${debt.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        ` : `
          <div class="debt-card-footer" style="margin-top:8px;">
            <span class="text-muted text-xs">Original: ${Utils.formatCurrency(debt.original_amount)}</span>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="Debts.deleteDebt('${debt.id}')" title="Delete">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `}
      </div>
    `;
  },

  showAddModal() {
    Modal.show({
      title: 'Add Debt',
      content: `
        <div class="form-group">
          <label class="form-label">Person Name</label>
          <input type="text" id="debt-name" class="form-input" placeholder="Who?">
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select id="debt-type" class="form-input">
            <option value="owe" ${this.currentTab === 'owe' ? 'selected' : ''}>I Owe Them</option>
            <option value="lend" ${this.currentTab === 'lend' ? 'selected' : ''}>They Owe Me</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹)</label>
          <input type="number" id="debt-amount" class="form-input" placeholder="5000" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <input type="text" id="debt-desc" class="form-input" placeholder="What for?">
        </div>
        <div class="form-group">
          <label class="form-label">Due Date (optional)</label>
          <input type="date" id="debt-due" class="form-input">
        </div>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', id: 'cancel-debt' },
        { text: 'Save', class: 'btn-primary', id: 'save-debt' }
      ],
      onRender: () => {
        document.getElementById('cancel-debt')?.addEventListener('click', () => Modal.close());
        document.getElementById('save-debt')?.addEventListener('click', () => {
          const name = document.getElementById('debt-name')?.value.trim();
          const type = document.getElementById('debt-type')?.value;
          const amount = document.getElementById('debt-amount')?.value;
          const desc = document.getElementById('debt-desc')?.value.trim();
          const due = document.getElementById('debt-due')?.value;

          if (!name || !amount || parseFloat(amount) <= 0) {
            Toast.error('Missing Info', 'Name and a positive amount are required.'); return;
          }

          Store.addDebt({
            name, type, original_amount: parseFloat(amount),
            description: desc, due_date: due || null
          });
          Toast.success('Added', 'Debt recorded.');
          Modal.close();
          this.render();
        });
      }
    });
  },

  showSettleModal(debtId) {
    const debt = Store.getDebts().find(d => d.id === debtId);
    if (!debt) return;

    Modal.show({
      title: 'Settle: ' + Utils.escapeHtml(debt.name),
      content: `
        <div class="form-group">
          <label class="form-label">Payment Amount (₹)</label>
          <input type="number" id="settle-amount" class="form-input" placeholder="${debt.remaining_amount}" max="${debt.remaining_amount}" min="1">
        </div>
        <div class="text-muted" style="font-size:13px;">Remaining: ${Utils.formatCurrency(debt.remaining_amount)}</div>
        <div style="margin-top:12px;">
          <button class="btn btn-secondary btn-sm" id="settle-full" style="font-size:12px;">
            Settle Full Amount (${Utils.formatCurrency(debt.remaining_amount)})
          </button>
        </div>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', id: 'cancel-settle' },
        { text: 'Pay', class: 'btn-primary', id: 'save-settle' }
      ],
      onRender: () => {
        document.getElementById('settle-full')?.addEventListener('click', () => {
          document.getElementById('settle-amount').value = debt.remaining_amount;
        });
        document.getElementById('cancel-settle')?.addEventListener('click', () => Modal.close());
        document.getElementById('save-settle')?.addEventListener('click', () => {
          const amount = parseFloat(document.getElementById('settle-amount')?.value);
          if (!amount || amount <= 0) {
            Toast.error('Invalid', 'Enter a positive amount.'); return;
          }
          if (amount > debt.remaining_amount) {
            Toast.error('Too Much', 'Amount exceeds remaining balance.'); return;
          }
          Store.settleDebt(debtId, amount);
          Toast.success('Payment Recorded', Utils.formatCurrency(amount) + ' settled!');
          Modal.close();
          this.render();
        });
      }
    });
  },

  deleteDebt(id) {
    ConfirmDialog.show({
      title: 'Delete Debt',
      message: 'Are you sure? This cannot be undone.',
      confirmText: 'Delete',
      onConfirm: () => {
        Store.deleteDebt(id);
        Toast.success('Deleted', 'Debt removed.');
        this.render();
      }
    });
  }
};
