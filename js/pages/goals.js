/* ========================================
   ExpenseIQ — Savings Goals Page
   ======================================== */

const Goals = {
  render() {
    const content = document.getElementById('page-content');
    const goals = Store.getGoals();

    // RPG Savings Leveling computations
    const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
    const totalSaved = goals.reduce((s, g) => s + (g.saved_amount || 0), 0);
    
    const rpgLevel = Math.floor(totalSaved / 5000) + 1;
    const currentLevelXP = totalSaved % 5000;
    const xpPercent = Math.min(100, Math.floor((currentLevelXP / 5000) * 100));
    
    let levelTitle = 'Saving Novice 🛡️';
    if (rpgLevel === 2) levelTitle = 'Budget Sentinel ⚔️';
    else if (rpgLevel === 3) levelTitle = 'Wealth Guardian 🔮';
    else if (rpgLevel === 4) levelTitle = 'Gold Alchemist ⚗️';
    else if (rpgLevel >= 5) levelTitle = 'Antigravity Wealth Archmage 🌟';

    content.innerHTML = `
      <div class="goals-header animate-fade-in-down">
        <div>
          <p class="text-secondary" style="font-size:14px; margin: 4px 0 0 0;">Level up your financial status by claiming and completing savings quests.</p>
        </div>
        <button class="btn btn-primary" onclick="Goals.showAddModal()">
          <i data-lucide="plus"></i> Add New Quest
        </button>
      </div>

      <!-- RPG Level Progress Emblem Card -->
      <div class="rpg-level-card animate-fade-in-up" style="animation-delay:30ms">
        <div class="rpg-level-emblem-container">
          Lvl ${rpgLevel}
          <div class="rpg-level-emblem-glow"></div>
        </div>
        <div class="rpg-level-info">
          <div class="rpg-level-title-row">
            <div class="rpg-level-number">${levelTitle}</div>
            <div class="rpg-level-title">${totalSaved.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} Total Saved</div>
          </div>
          <div class="rpg-xp-bar-container">
            <div class="rpg-xp-bar-fill" style="width: ${xpPercent}%"></div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; margin-top: 6px; display: flex; justify-content: space-between;">
            <span>XP Progress: ${xpPercent}%</span>
            <span>₹${(5000 - currentLevelXP).toLocaleString()} more to Level Up!</span>
          </div>
        </div>
      </div>

      ${goals.length === 0 ? `
        <div class="empty-state animate-fade-in-up" style="animation-delay:80ms">
          <div class="empty-state-icon"><i data-lucide="compass"></i></div>
          <h3 class="empty-state-title">Your Quest Path is Empty</h3>
          <p class="empty-state-message">Add your custom savings target or claim our default starter pack to unlock the roadmap timeline!</p>
          <div style="display:flex; gap:12px; margin-top:20px; justify-content:center;">
            <button class="btn btn-secondary" onclick="Goals.claimDefaultQuests()">Claim Starter Quests</button>
            <button class="btn btn-primary" onclick="Goals.showAddModal()">Create Custom Quest</button>
          </div>
        </div>
      ` : `
        <div class="goals-summary animate-fade-in-up" style="animation-delay:60ms">
          <div class="stat-card">
            <div class="stat-card-amount" id="goals-total-target">₹0</div>
            <div class="stat-card-label">Total Quest Target</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-amount text-income" id="goals-total-saved">₹0</div>
            <div class="stat-card-label">Total Saved Balance</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-amount text-accent" id="goals-remaining">₹0</div>
            <div class="stat-card-label">Remaining to Victory</div>
          </div>
        </div>

        <!-- Duolingo-style Roadmap connected tree -->
        ${this._renderRoadmap(goals)}
      `}
    `;

    if (window.lucide) lucide.createIcons();

    if (goals.length > 0) {
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

  _renderRoadmap(goals) {
    const sorted = [...goals].sort((a, b) => {
      const aPct = ((a.saved_amount || 0) / a.target_amount) >= 1;
      const bPct = ((b.saved_amount || 0) / b.target_amount) >= 1;
      if (aPct && !bPct) return -1;
      if (!aPct && bPct) return 1;
      return 0;
    });

    let completedCount = 0;
    const roadmapNodes = sorted.map((g, idx) => {
      const pct = Math.min(Utils.percentage(g.saved_amount || 0, g.target_amount), 100);
      const isCompleted = pct >= 100;
      if (isCompleted) completedCount++;
      const isActive = !isCompleted && pct > 0;
      
      const nodeClass = isCompleted ? 'completed' : (isActive ? 'active' : '');
      const alignClass = idx % 2 === 0 ? 'left' : 'right';
      
      let icon = 'target';
      if (g.name.includes('Emergency') || g.name.includes('🛡️')) icon = 'shield';
      else if (g.name.includes('Laptop') || g.name.includes('💻')) icon = 'cpu';
      else if (g.name.includes('Travel') || g.name.includes('✈️')) icon = 'compass';
      
      if (isCompleted) icon = 'check';

      return `
        <div class="quest-node ${alignClass} ${nodeClass} animate-fade-in-up" style="animation-delay: ${idx * 80}ms">
          <div class="quest-node-bubble" onclick="Goals.showFundModal('${g.id}')">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="quest-card-wrapper">
            <div class="quest-card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <h4 style="margin:0; font-size:15px; font-weight:800; color:var(--text-primary);">${Utils.escapeHtml(g.name)}</h4>
                <div style="display:flex; gap:4px;">
                  <button class="btn btn-ghost btn-icon btn-sm" onclick="Goals.showFundModal('${g.id}')" title="Add Funds"><i data-lucide="plus-circle" style="width:16px;height:16px;"></i></button>
                  <button class="btn btn-ghost btn-icon btn-sm" onclick="Goals.deleteGoal('${g.id}')" title="Delete"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
                </div>
              </div>
              <div style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:6px;">
                <span class="text-income">${Utils.formatCurrency(g.saved_amount || 0)}</span>
                <span style="font-size:12px; color:var(--text-muted); font-weight:600;">of ${Utils.formatCurrency(g.target_amount)}</span>
              </div>
              <div class="progress-bar" style="height:6px; margin:8px 0; background:var(--bg-tertiary);">
                <div class="progress-bar-fill" style="width:${pct}%; background:${g.color || 'var(--accent-primary)'}"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:var(--text-secondary);">
                <span>${pct}% Complete</span>
                <span>Deadline: ${Utils.formatDate(g.deadline, 'short')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const trackFillHeight = goals.length > 0 ? (completedCount / goals.length) * 100 : 0;

    return `
      <div class="roadmap-container">
        <div class="roadmap-track"></div>
        <div class="roadmap-track-fill" style="height: ${trackFillHeight}%"></div>
        ${roadmapNodes}
      </div>
    `;
  },

  claimDefaultQuests() {
    Store.addGoal({ name: '🛡️ Shield of Solvency (Emergency Fund)', target_amount: 10000, deadline: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], color: '#10b981', icon: 'shield' });
    Store.addGoal({ name: '💻 Citadel of Code (New Laptop Setup)', target_amount: 50000, deadline: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0], color: '#6366f1', icon: 'cpu' });
    Store.addGoal({ name: '✈️ Navigator’s Haven (Travel Wallet)', target_amount: 25000, deadline: new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0], color: '#f59e0b', icon: 'compass' });
    Toast.success('Quests Claimed!', 'Starter quests added to your timeline.');
    this.render();
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

window.Goals = Goals;
