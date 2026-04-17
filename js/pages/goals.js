/* ========================================
   ExpenseIQ — Savings Goals Page
   ======================================== */

const Goals = {
  render() {
    const content = document.getElementById('page-content');
    const goals = Store.getGoals();

    content.innerHTML = `
      <div class="goals-header animate-fade-in-down">
        <div>
          <p class="text-secondary" style="font-size:14px;">Track your savings targets and visualize your progress.</p>
        </div>
        <button class="btn btn-primary" onclick="Goals.showAddModal()">
          <i data-lucide="plus"></i> New Goal
        </button>
      </div>

      ${goals.length === 0 ? `
        <div class="empty-state animate-fade-in-up">
          <div class="empty-state-icon"><i data-lucide="target"></i></div>
          <h3 class="empty-state-title">No savings goals yet</h3>
          <p class="empty-state-message">Set your first savings target and start tracking your progress!</p>
          <button class="btn btn-primary" onclick="Goals.showAddModal()" style="margin-top:20px;">Create Your First Goal</button>
        </div>
      ` : `
        <div class="goals-summary animate-fade-in-up" style="animation-delay:50ms">
          <div class="stat-card">
            <div class="stat-card-amount" id="goals-total-target">₹0</div>
            <div class="stat-card-label">Total Target</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-amount text-income" id="goals-total-saved">₹0</div>
            <div class="stat-card-label">Total Saved</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-amount text-accent" id="goals-remaining">₹0</div>
            <div class="stat-card-label">Remaining</div>
          </div>
        </div>

        <div class="goals-grid stagger-children" style="animation-delay:100ms">
          ${goals.map(g => this._renderGoalCard(g)).join('')}
        </div>
      `}
    `;

    if (window.lucide) lucide.createIcons();

    if (goals.length > 0) {
      const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
      const totalSaved = goals.reduce((s, g) => s + (g.saved_amount || 0), 0);
      Utils.animateCounter(document.getElementById('goals-total-target'), totalTarget);
      Utils.animateCounter(document.getElementById('goals-total-saved'), totalSaved);
      Utils.animateCounter(document.getElementById('goals-remaining'), totalTarget - totalSaved);
    }
  },

  _renderGoalCard(goal) {
    const pct = Math.min(Utils.percentage(goal.saved_amount || 0, goal.target_amount), 100);
    const remaining = goal.target_amount - (goal.saved_amount || 0);
    const deadline = new Date(goal.deadline);
    const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)));
    const isComplete = pct >= 100;
    const isOverdue = daysLeft <= 0 && !isComplete;

    let statusClass = 'active';
    let statusText = daysLeft + ' days left';
    if (isComplete) { statusClass = 'completed'; statusText = '✓ Completed!'; }
    else if (isOverdue) { statusClass = 'overdue'; statusText = 'Overdue'; }
    else if (daysLeft <= 7) { statusClass = 'urgent'; statusText = daysLeft + ' days left'; }

    return `
      <div class="goal-card ${statusClass}">
        <div class="goal-card-header">
          <div class="goal-card-icon" style="background:${goal.color || '#6366f1'}">
            <i data-lucide="${goal.icon || 'target'}"></i>
          </div>
          <div class="goal-card-info">
            <div class="goal-card-name">${Utils.escapeHtml(goal.name)}</div>
            <div class="goal-card-status ${statusClass}">${statusText}</div>
          </div>
          <div class="goal-card-actions">
            <button class="btn btn-ghost btn-icon" onclick="Goals.showFundModal('${goal.id}')" title="Add Funds">
              <i data-lucide="plus-circle"></i>
            </button>
            <button class="btn btn-ghost btn-icon" onclick="Goals.deleteGoal('${goal.id}')" title="Delete">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
        <div class="goal-card-amounts">
          <span class="text-income">${Utils.formatCurrency(goal.saved_amount || 0)}</span>
          <span class="text-muted">of ${Utils.formatCurrency(goal.target_amount)}</span>
        </div>
        <div class="progress-bar" style="height:10px; margin:12px 0;">
          <div class="progress-bar-fill ${isComplete ? 'green' : pct >= 60 ? 'yellow' : ''}" style="width:${pct}%; background:${goal.color || '#6366f1'}"></div>
        </div>
        <div class="goal-card-footer">
          <span>${pct}% complete</span>
          <span>${Utils.formatCurrency(remaining)} to go</span>
        </div>
      </div>
    `;
  },

  showAddModal() {
    const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4'];
    Modal.show({
      title: 'New Savings Goal',
      content: `
        <div class="form-group">
          <label class="form-label">Goal Name</label>
          <input type="text" id="goal-name" class="form-input" placeholder="e.g. New Laptop, Emergency Fund">
        </div>
        <div class="form-group">
          <label class="form-label">Target Amount (₹)</label>
          <input type="number" id="goal-amount" class="form-input" placeholder="50000" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Deadline</label>
          <input type="date" id="goal-deadline" class="form-input" min="${Utils.today()}">
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <div class="color-picker-grid" id="goal-colors">
            ${colors.map((c, i) => '<div class="color-option' + (i === 0 ? ' selected' : '') + '" data-color="' + c + '" style="background-color:' + c + '"></div>').join('')}
          </div>
          <input type="hidden" id="goal-color" value="${colors[0]}">
        </div>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', id: 'cancel-goal' },
        { text: 'Create Goal', class: 'btn-primary', id: 'save-goal' }
      ],
      onRender: (el) => {
        el.querySelectorAll('.color-option').forEach(opt => {
          opt.addEventListener('click', function() {
            el.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('goal-color').value = this.dataset.color;
          });
        });
        document.getElementById('cancel-goal')?.addEventListener('click', () => Modal.close());
        document.getElementById('save-goal')?.addEventListener('click', () => {
          const name = document.getElementById('goal-name')?.value.trim();
          const amount = document.getElementById('goal-amount')?.value;
          const deadline = document.getElementById('goal-deadline')?.value;
          const color = document.getElementById('goal-color')?.value;

          if (!name || !amount || !deadline) {
            Toast.error('Missing Info', 'Please fill in all fields.'); return;
          }
          if (parseFloat(amount) <= 0) {
            Toast.error('Invalid', 'Amount must be positive.'); return;
          }

          Store.addGoal({ name, target_amount: parseFloat(amount), deadline, color, icon: 'target' });
          Toast.success('Goal Created', name + ' has been added!');
          Modal.close();
          this.render();
        });
      }
    });
  },

  showFundModal(goalId) {
    const goal = Store.getGoals().find(g => g.id === goalId);
    if (!goal) return;

    Modal.show({
      title: 'Add Funds to ' + Utils.escapeHtml(goal.name),
      content: `
        <div class="form-group">
          <label class="form-label">Amount to Add (₹)</label>
          <input type="number" id="fund-amount" class="form-input" placeholder="1000" min="1">
        </div>
        <div class="text-muted" style="font-size:13px; margin-top:8px;">
          Current: ${Utils.formatCurrency(goal.saved_amount || 0)} / ${Utils.formatCurrency(goal.target_amount)}
        </div>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', id: 'cancel-fund' },
        { text: 'Add Funds', class: 'btn-primary', id: 'save-fund' }
      ],
      onRender: () => {
        document.getElementById('cancel-fund')?.addEventListener('click', () => Modal.close());
        document.getElementById('save-fund')?.addEventListener('click', () => {
          const amount = document.getElementById('fund-amount')?.value;
          if (!amount || parseFloat(amount) <= 0) {
            Toast.error('Invalid', 'Enter a positive amount.'); return;
          }
          Store.addFundsToGoal(goalId, parseFloat(amount));
          Toast.success('Funds Added', Utils.formatCurrency(parseFloat(amount)) + ' added!');
          Modal.close();
          this.render();
        });
      }
    });
  },

  deleteGoal(id) {
    ConfirmDialog.show({
      title: 'Delete Goal',
      message: 'Are you sure you want to delete this savings goal? This cannot be undone.',
      confirmText: 'Delete',
      onConfirm: () => {
        Store.deleteGoal(id);
        Toast.success('Deleted', 'Goal removed.');
        this.render();
      }
    });
  }
};
