/* ========================================
   ExpenseIQ — Dashboard Page Renderer
   ======================================== */

const Dashboard = {
  render() {
    const content = document.getElementById('page-content');
    const month = Utils.toMonthString(new Date());
    const totals = Store.getTotals(month);
    const balanceAll = Store.getTotals().balance;

    const trendInc = Utils.calcTrend(totals.income, Store.getTotals(Utils.toMonthString(new Date(new Date().setMonth(new Date().getMonth()-1)))).income);
    const trendExp = Utils.calcTrend(totals.expense, Store.getTotals(Utils.toMonthString(new Date(new Date().setMonth(new Date().getMonth()-1)))).expense);

    const savRate = Utils.percentage(totals.balance, totals.income) || 0;

    // Financial Health Score (simple scoring)
    let healthScore = 50;
    if (savRate > 30) healthScore += 20;
    else if (savRate > 15) healthScore += 10;
    else if (savRate < 0) healthScore -= 20;
    const budgetStatus = Store.getBudgetStatus(month);
    if (budgetStatus) {
      if (budgetStatus.totalPct < 80) healthScore += 15;
      else if (budgetStatus.totalPct > 100) healthScore -= 15;
    }
    healthScore = Math.max(0, Math.min(100, healthScore));
    let healthLabel = 'Needs Work';
    let healthColor = '#ef4444';
    if (healthScore >= 80) { healthLabel = 'Excellent'; healthColor = '#10b981'; }
    else if (healthScore >= 60) { healthLabel = 'Good'; healthColor = '#f59e0b'; }
    else if (healthScore >= 40) { healthLabel = 'Fair'; healthColor = '#f97316'; }

    content.innerHTML = `
      <div class="dashboard-stats stagger-children" id="dash-stats">
        <div class="stat-card balance">
          <div class="stat-card-top">
            <div class="stat-card-icon balance"><i data-lucide="wallet"></i></div>
          </div>
          <div class="stat-card-amount" id="st-bal">0</div>
          <div class="stat-card-label">Total Balance</div>
        </div>

        <div class="stat-card income glow-on-hover">
          <div class="stat-card-top">
            <div class="stat-card-icon income"><i data-lucide="trending-up"></i></div>
            <div class="stat-card-trend ${trendInc.direction}">
              <i data-lucide="${trendInc.direction === 'up' ? 'arrow-up-right' : 'arrow-down-right'}"></i> ${trendInc.pct}%
            </div>
          </div>
          <div class="stat-card-amount text-income" id="st-inc">0</div>
          <div class="stat-card-label">Income This Month</div>
          <button class="stat-card-action" onclick="window.showAddTransactionModal('income')" title="Add Income">
            <i data-lucide="plus"></i>
          </button>
        </div>

        <div class="stat-card expense glow-on-hover">
          <div class="stat-card-top">
            <div class="stat-card-icon expense"><i data-lucide="trending-down"></i></div>
            <div class="stat-card-trend ${trendExp.direction}">
              <i data-lucide="${trendExp.direction === 'up' ? 'arrow-up-right' : 'arrow-down-right'}"></i> ${trendExp.pct}%
            </div>
          </div>
          <div class="stat-card-amount text-expense" id="st-exp">0</div>
          <div class="stat-card-label">Expenses This Month</div>
          <button class="stat-card-action" onclick="window.showAddTransactionModal('expense')" title="Add Expense">
            <i data-lucide="plus"></i>
          </button>
        </div>

        <div class="stat-card savings">
          <div class="stat-card-top">
            <div class="stat-card-icon savings"><i data-lucide="piggy-bank"></i></div>
          </div>
          <div class="stat-card-amount" id="st-sav">0%</div>
          <div class="stat-card-label">Savings Rate</div>
        </div>
      </div>

      <!-- Financial Health Score -->
      <div class="dashboard-health-row animate-fade-in-up" style="animation-delay:100ms">
        <div class="health-score-card">
          <div class="health-gauge">
            <svg viewBox="0 0 120 65" class="health-svg">
              <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--glass-border)" stroke-width="10" stroke-linecap="round"/>
              <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="${healthColor}" stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${healthScore * 1.57} 157" class="health-arc"/>
            </svg>
            <div class="health-score-value">${healthScore}</div>
          </div>
          <div class="health-label" style="color:${healthColor}">${healthLabel}</div>
          <div class="health-sublabel">Financial Health Score</div>
        </div>

        <div class="ai-insights-card" id="ai-insights-card">
          <div class="card-header">
            <h3 class="card-title"><span style="font-size:16px;">✨</span> AI Insights</h3>
          </div>
          <div id="ai-insights-content" class="ai-insights-content">
            <div class="text-muted" style="padding:16px; font-size:14px;">
              ${AI.isAvailable() ? 'Loading insights...' : 'Enable Groq API key in config.js for AI insights.'}
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-charts stagger-children">
        <div class="chart-card">
          <div class="card-header">
            <h3 class="card-title">Spending Trend</h3>
            <div class="pills">
              <div class="pill active">30 Days</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="trendChart"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <h3 class="card-title">Top Categories</h3>
          </div>
          <div class="chart-container">
            <canvas id="donutChart"></canvas>
          </div>
        </div>
      </div>

      <div class="dashboard-bottom stagger-children">
        <div class="recent-transactions-card">
          <div class="card-header">
            <h3 class="card-title">Recent Transactions</h3>
            <a href="#/transactions" class="section-link">View All <i data-lucide="chevron-right"></i></a>
          </div>
          <div class="recent-transactions-list" id="recent-list"></div>
        </div>

        <div class="budget-overview-card">
          <div class="card-header">
            <h3 class="card-title">Budgets</h3>
            <a href="#/budgets" class="section-link"><i data-lucide="chevron-right"></i></a>
          </div>
          <div id="budget-mini-list"></div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    Utils.animateCounter(document.getElementById('st-bal'), balanceAll);
    Utils.animateCounter(document.getElementById('st-inc'), totals.income);
    Utils.animateCounter(document.getElementById('st-exp'), totals.expense);
    this._animateSavRate(document.getElementById('st-sav'), savRate);

    this.renderCharts();
    this.renderRecentTransactions();
    this.renderBudgetMini();
    this.loadAIInsights();
    this._checkOnboarding();
    this._checkSMSPrompt();
  },

  _animateSavRate(el, target) {
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
      const p = Math.min((now - start) / 1000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + '%';
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  async loadAIInsights() {
    if (!AI.isAvailable()) return;
    const container = document.getElementById('ai-insights-content');
    if (!container) return;

    const insights = await AI.getSmartInsights();
    if (insights && insights.length > 0) {
      container.innerHTML = insights.map(i =>
        '<div class="ai-insight-item"><span class="ai-insight-icon">💡</span><span>' + Utils.escapeHtml(i) + '</span></div>'
      ).join('');
    } else {
      container.innerHTML = '<div class="text-muted" style="padding:16px; font-size:14px;">Not enough data for insights yet.</div>';
    }
  },

  renderCharts() {
    const month = Utils.toMonthString(new Date());
    const dailyData = Store.getDailyTotals(month);
    const labels = dailyData.map(d => d.day);
    const incData = dailyData.map(d => d.income);
    const expData = dailyData.map(d => d.expense);

    Charts.createLineChart('trendChart', labels, [
      { label: 'Income', data: incData, borderColor: '#10b981', tension: 0.4, fill: true },
      { label: 'Expense', data: expData, borderColor: '#ef4444', tension: 0.4, fill: true }
    ]);

    const byCat = Store.getByCategory(month);
    const catArray = Object.entries(byCat).map(([id, data]) => {
      const cat = Store.getCategory(id);
      return { name: cat ? cat.name : 'Other', color: cat ? cat.color : '#cbd5e1', amount: data.expense };
    }).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).slice(0, 5);

    if (catArray.length === 0) return;

    Charts.createDonutChart('donutChart', catArray.map(c => c.name), catArray.map(c => c.amount), catArray.map(c => c.color));
  },

  renderRecentTransactions() {
    const txns = Store.getTransactions({ sortBy: 'date' }).slice(0, 7);
    const list = document.getElementById('recent-list');
    if (!list) return;

    if (txns.length === 0) {
      list.innerHTML = '<div class="empty-state" style="padding: 40px 20px;"><p class="text-muted">No recent transactions</p></div>';
      return;
    }

    list.innerHTML = txns.map(t => {
      const cat = Store.getCategory(t.category);
      return `
        <div class="transaction-row">
          <div class="transaction-icon" style="background-color: ${cat ? cat.color : '#94a3b8'}">
            <i data-lucide="${cat ? cat.icon : 'tag'}"></i>
          </div>
          <div class="transaction-details">
            <div class="transaction-name">${Utils.escapeHtml(t.description)}</div>
            <div class="transaction-category">${cat ? cat.name : 'Other'}</div>
          </div>
          <div class="transaction-date">${Utils.formatRelativeDate(t.date)}</div>
          <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  renderBudgetMini() {
    const month = Utils.toMonthString(new Date());
    const stats = Store.getBudgetStatus(month);
    const list = document.getElementById('budget-mini-list');
    if (!list) return;

    if (!stats || Object.keys(stats.categoryStatus).length === 0) {
      list.innerHTML = '<div class="text-muted text-center" style="padding: 20px 0; font-size: 14px;">No budgets set for this month.</div>';
      return;
    }

    const sortedCats = Object.entries(stats.categoryStatus)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);

    list.innerHTML = sortedCats.map(c => {
      const cat = Store.getCategory(c.id);
      let colorClass = 'green';
      if (c.pct >= 100) colorClass = 'overbudget';
      else if (c.pct >= 80) colorClass = 'red';
      else if (c.pct >= 60) colorClass = 'yellow';

      return `
        <div class="budget-mini-item">
          <div class="budget-mini-header">
            <div class="budget-mini-label">
              <span class="cat-dot" style="background: ${cat ? cat.color : '#ccc'}"></span>
              ${cat ? cat.name : 'Unknown'}
            </div>
            <div class="budget-mini-amount">${Utils.formatCurrency(c.spent)} / ${Utils.formatCurrency(c.limit)}</div>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill ${colorClass}" style="width: ${Math.min(c.pct, 100)}%"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Gap 10 — Onboarding Tooltip Sequence
  _checkOnboarding() {
    if (localStorage.getItem('expenseiq_onboarded')) return;
    const txnCount = Store.getTransactions().length;
    if (txnCount > 5) return; // Skip for returning users with data

    setTimeout(() => {
      const steps = [
        {
          targetId: null,
          title: '👋 Welcome to ExpenseIQ!',
          text: 'Your AI-powered personal finance tracker.' +
            ' Let\'s take a quick tour.',
          btnText: 'Start Tour →'
        },
        {
          targetId: 'sidebar',
          title: '📊 Navigate Pages',
          text: 'Use the sidebar to access Transactions, ' +
            'Reports, Budgets, Goals, and Debts.',
          btnText: 'Next →'
        },
        {
          targetId: 'header',
          title: '🔄 Real-Time Sync',
          text: 'Changes sync instantly across all your devices. ' +
            'The badge shows sync status.',
          btnText: 'Next →'
        },
        {
          targetId: 'ai-chat-fab',
          title: '✨ AI Advisor',
          text: 'Tap the chat bubble to ask your AI advisor ' +
            'anything about your finances.',
          btnText: 'Done!'
        }
      ];

      let current = 0;

      const overlay = document.createElement('div');
      overlay.id = 'onboarding-overlay';
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.5);' +
        'z-index:10000;display:flex;align-items:center;' +
        'justify-content:center;';

      const box = document.createElement('div');
      box.style.cssText =
        'background:var(--bg-primary,#1e293b);' +
        'border:1px solid var(--accent-primary,#6366f1);' +
        'border-radius:12px;padding:24px;max-width:320px;' +
        'width:90%;text-align:center;' +
        'box-shadow:0 20px 60px rgba(0,0,0,0.5);';
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const render = () => {
        const step = steps[current];
        box.innerHTML =
          '<div style="font-size:28px;margin-bottom:12px;">' +
            step.title.split(' ')[0] + '</div>' +
          '<h3 style="margin:0 0 8px;color:var(--text-primary,#f1f5f9);' +
            'font-size:16px;">' +
            step.title.slice(step.title.indexOf(' ')+1) + '</h3>' +
          '<p style="color:var(--text-secondary,#94a3b8);' +
            'font-size:13px;margin:0 0 20px;line-height:1.5;">' +
            step.text + '</p>' +
          '<div style="display:flex;gap:8px;justify-content:center;">' +
            '<button id="ob-skip" style="padding:8px 16px;' +
              'background:transparent;border:1px solid ' +
              'var(--border,#334155);color:var(--text-secondary,#94a3b8);' +
              'border-radius:6px;cursor:pointer;font-size:12px;">' +
              'Skip</button>' +
            '<button id="ob-next" style="padding:8px 20px;' +
              'background:var(--accent-primary,#6366f1);color:white;' +
              'border:none;border-radius:6px;cursor:pointer;' +
              'font-size:13px;font-weight:600;">' +
              step.btnText + '</button>' +
          '</div>' +
          '<div style="margin-top:12px;font-size:11px;' +
            'color:var(--text-muted,#475569);">' +
            (current+1) + ' / ' + steps.length + '</div>';

        document.getElementById('ob-next').onclick = () => {
          current++;
          if (current >= steps.length) {
            document.body.removeChild(overlay);
            localStorage.setItem('expenseiq_onboarded', 'true');
          } else {
            render();
          }
        };
        document.getElementById('ob-skip').onclick = () => {
          document.body.removeChild(overlay);
          localStorage.setItem('expenseiq_onboarded', 'true');
        };
      };

      render();
    }, 1500); // Delay so dashboard renders first
  },

  _checkSMSPrompt() {
    // 1. Check if number is already set or prompt was dismissed in this session
    if (sessionStorage.getItem('expenseiq_sms_prompt_dismissed')) return;
    
    const user = Auth.getUser();
    const settings = Store.getSettings();
    const hasPhone = (user?.user_metadata?.phone_number) || (settings.profile?.phoneNumber);
    
    if (hasPhone) return;

    // 2. Wait 10 seconds before showing
    setTimeout(() => {
      // Re-verify they are still on the dashboard
      if (location.hash !== '#/' && location.hash !== '') return;
      if (document.getElementById('sms-prompt-card')) return;

      const card = document.createElement('div');
      card.id = 'sms-prompt-card';
      card.className = 'sms-prompt-card';
      card.innerHTML = `
        <div class="sms-prompt-header">
          <div class="sms-prompt-icon"><i data-lucide="message-square"></i></div>
          <div class="sms-prompt-title">Enable SMS Alerts</div>
        </div>
        <div class="sms-prompt-text">
          Want real-time bank-style alerts for your transactions? Set up your phone number now.
        </div>
        <div class="sms-prompt-actions">
          <button class="btn btn-ghost btn-sm" id="btn-sms-later">Maybe Later</button>
          <button class="btn btn-primary btn-sm" id="btn-sms-continue">Continue Setup</button>
        </div>
      `;

      document.body.appendChild(card);
      if (window.lucide) lucide.createIcons();

      // 3. Bind Events
      document.getElementById('btn-sms-later').onclick = () => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => card.remove(), 300);
        sessionStorage.setItem('expenseiq_sms_prompt_dismissed', 'true');
      };

      document.getElementById('btn-sms-continue').onclick = () => {
        sessionStorage.setItem('expenseiq_trigger_profile_edit', 'true');
        card.remove();
        location.hash = '#/settings';
      };
    }, 10000);
  }
};
