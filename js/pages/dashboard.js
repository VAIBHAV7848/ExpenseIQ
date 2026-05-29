/* ========================================
   ExpenseIQ — Dashboard Page Renderer
   ======================================== */

const Dashboard = {
  render() {
    const content = document.getElementById('page-content');
    const month = Utils.toMonthString(new Date());
    const totals = Store.getTotals(month);
    
    // Start SMS Prompt check IMMEDIATELY (Move to top for instant appearance)
    this._checkSMSPrompt();

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
    let healthColor = 'var(--color-expense)';
    if (healthScore >= 80) { healthLabel = 'Excellent'; healthColor = 'var(--color-income)'; }
    else if (healthScore >= 60) { healthLabel = 'Good'; healthColor = 'var(--color-warning)'; }
    else if (healthScore >= 40) { healthLabel = 'Fair'; healthColor = 'var(--accent-secondary)'; }

    const userName = Auth.isAuthenticated() && !Auth.isGuest() 
      ? Utils.escapeHtml(Auth.getUser()?.user_metadata?.full_name || Auth.getUser()?.email?.split('@')[0]) 
      : 'Finance Explorer';

    // Premium Greeting & Calendar Context
    const now = new Date();
    const formattedMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const greetingText = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

    content.innerHTML = `
      <!-- Premium Hero Greeting Card -->
      <div class="dashboard-greeting-wrap animate-fade-in-down" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        flex-wrap: wrap;
        gap: 20px;
      ">
        <div>
          <h1 style="
            font-size: var(--text-3xl);
            font-weight: 900;
            color: var(--text-primary);
            letter-spacing: -1.2px;
            line-height: 1.15;
            margin-bottom: 6px;
          ">${greetingText}, ${userName} <span class="wave-emoji" style="display:inline-block; animation: wave 2s infinite;">👋</span></h1>
          <p style="font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500;">
            Here is your financial status overview for <span style="color: var(--accent-primary); font-weight: 700;">${formattedMonth}</span>. Keep it up!
          </p>
        </div>
        
        <div class="header-action-date-tag" style="
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-sm);
          padding: 10px 18px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        ">
          <span style="
            width: 8px;
            height: 8px;
            background: var(--color-success);
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 10px var(--color-success);
          "></span>
          <span style="
            font-size: 11px;
            font-weight: 800;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.8px;
          ">${Auth.isAuthenticated() && !Auth.isGuest() ? 'Cloud Synced' : 'Offline Sandbox'}</span>
        </div>
      </div>

      <div class="dashboard-stats stagger-children" id="dash-stats">
        <div class="stat-card balance glow-on-hover" style="border-radius: var(--radius-xl);">
          <div class="stat-card-top">
            <div class="stat-card-icon balance" style="background: var(--accent-primary-glow); color: var(--accent-primary);">
              <i data-lucide="wallet"></i>
            </div>
            <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-tertiary); padding: 4px 8px; border-radius: 6px;">Total</span>
          </div>
          <div class="stat-card-amount font-mono" id="st-bal" style="font-size: 28px; font-weight: 800; margin-top: 8px;">0</div>
          <div class="stat-card-label" style="font-size: 11px; letter-spacing: 0.5px; font-weight: 700; color: var(--text-secondary); margin-top: 6px;">Net Worth Pool</div>
        </div>

        <div class="stat-card income glow-on-hover" style="border-radius: var(--radius-xl);">
          <div class="stat-card-top">
            <div class="stat-card-icon income" style="background: var(--color-income-bg); color: var(--color-income);">
              <i data-lucide="trending-up"></i>
            </div>
            <div class="stat-card-trend ${trendInc.direction}" style="
              font-size: 11px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: var(--radius-full);
              background: ${trendInc.direction === 'up' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)'};
              color: ${trendInc.direction === 'up' ? 'var(--color-income)' : 'var(--color-expense)'};
            ">
              <i data-lucide="${trendInc.direction === 'up' ? 'arrow-up-right' : 'arrow-down-right'}" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> ${trendInc.pct}%
            </div>
          </div>
          <div class="stat-card-amount text-income font-mono" id="st-inc" style="font-size: 28px; font-weight: 800; margin-top: 8px;">0</div>
          <div class="stat-card-label" style="font-size: 11px; letter-spacing: 0.5px; font-weight: 700; color: var(--text-secondary); margin-top: 6px;">Inflow Monthly</div>
          <button class="stat-card-action" onclick="window.showAddTransactionModal('income')" title="Add Income">
            <i data-lucide="plus"></i>
          </button>
        </div>

        <div class="stat-card expense glow-on-hover" style="border-radius: var(--radius-xl);">
          <div class="stat-card-top">
            <div class="stat-card-icon expense" style="background: var(--color-expense-bg); color: var(--color-expense);">
              <i data-lucide="trending-down"></i>
            </div>
            <div class="stat-card-trend ${trendExp.direction}" style="
              font-size: 11px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: var(--radius-full);
              background: ${trendExp.direction === 'up' ? 'var(--color-expense-bg)' : 'var(--color-income-bg)'};
              color: ${trendExp.direction === 'up' ? 'var(--color-expense)' : 'var(--color-income)'};
            ">
              <i data-lucide="${trendExp.direction === 'up' ? 'arrow-up-right' : 'arrow-down-right'}" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> ${trendExp.pct}%
            </div>
          </div>
          <div class="stat-card-amount text-expense font-mono" id="st-exp" style="font-size: 28px; font-weight: 800; margin-top: 8px;">0</div>
          <div class="stat-card-label" style="font-size: 11px; letter-spacing: 0.5px; font-weight: 700; color: var(--text-secondary); margin-top: 6px;">Outflow Monthly</div>
          <button class="stat-card-action" onclick="window.showAddTransactionModal('expense')" title="Add Expense">
            <i data-lucide="plus"></i>
          </button>
        </div>

        <div class="stat-card savings glow-on-hover" style="border-radius: var(--radius-xl);">
          <div class="stat-card-top">
            <div class="stat-card-icon savings" style="background: var(--color-warning-bg); color: var(--color-warning);">
              <i data-lucide="piggy-bank"></i>
            </div>
            <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-tertiary); padding: 4px 8px; border-radius: 6px;">Ratio</span>
          </div>
          <div class="stat-card-amount font-mono" id="st-sav" style="font-size: 28px; font-weight: 800; margin-top: 8px;">0%</div>
          <div class="stat-card-label" style="font-size: 11px; letter-spacing: 0.5px; font-weight: 700; color: var(--text-secondary); margin-top: 6px;">Savings Rate</div>
        </div>
      </div>

      <!-- Financial Health Score & Dynamic AI Insights Card -->
      <div class="dashboard-health-row animate-fade-in-up" style="animation-delay:100ms; margin-bottom: 32px;">
        <div class="health-score-card" style="border-radius: var(--radius-xl); padding: 28px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="liquid-sphere">
            <div class="liquid-fill" style="height: ${healthScore}%; --wave-color: ${healthColor};">
              <div class="liquid-wave"></div>
              <div class="liquid-wave-back"></div>
            </div>
            <div class="liquid-score-value">${healthScore}</div>
          </div>
          <div class="health-label" style="color:${healthColor}; font-size: 16px; font-weight: 900; letter-spacing: -0.3px; margin-top: 4px;">${healthLabel}</div>
          <div class="health-sublabel" style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">Financial Health Index</div>
        </div>

        <div class="ai-insights-card" id="ai-insights-card" style="border-radius: var(--radius-xl); flex: 1;">
          <div class="card-header" style="margin-bottom: 14px;">
            <h3 class="card-title" style="font-weight: 800; display:flex; align-items:center; gap: 8px;">
              <span class="pulse-spark" style="display:inline-flex; align-items:center; justify-content:center; background: var(--accent-primary-glow); padding: 6px; border-radius: 8px; color: var(--accent-primary);"><i data-lucide="sparkles" style="width: 16px; height: 16px;"></i></span>
              Smart Financial Assistant
            </h3>
            <span style="font-size: 10px; background: var(--bg-tertiary); color: var(--text-secondary); padding: 4px 8px; border-radius: 6px; font-weight: 700;">Live Feed</span>
          </div>
          <div id="ai-insights-content" class="ai-insights-content" style="display: flex; flex-direction: column; gap: 10px; min-height: 100px;">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>

      <div class="dashboard-charts stagger-children" style="margin-bottom: 32px;">
        <div class="chart-card" style="border-radius: var(--radius-xl);">
          <div class="card-header">
            <h3 class="card-title">Daily Cashflow Trend</h3>
            <div class="pills">
              <div class="pill active" style="font-size: 10px; padding: 4px 12px; font-weight: 800; border-radius: var(--radius-full);">30 Days</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="trendChart"></canvas>
          </div>
        </div>

        <div class="chart-card" style="border-radius: var(--radius-xl);">
          <div class="card-header">
            <h3 class="card-title">Category Allocations</h3>
            <span style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Top Expenses</span>
          </div>
          <div class="chart-container">
            <canvas id="donutChart"></canvas>
          </div>
        </div>
      </div>

      <div class="dashboard-bottom stagger-children" style="margin-bottom: 32px;">
        <div class="recent-transactions-card" style="border-radius: var(--radius-xl);">
          <div class="card-header">
            <h3 class="card-title">Recent Activity</h3>
            <a href="#/transactions" class="section-link" style="font-size: var(--text-xs); font-weight: 700;">View Statement <i data-lucide="arrow-right" style="width:12px; height:12px;"></i></a>
          </div>
          <div class="recent-transactions-list" id="recent-list"></div>
        </div>

        <div class="budget-overview-card" style="border-radius: var(--radius-xl);">
          <div class="card-header">
            <h3 class="card-title">Category Limits</h3>
            <a href="#/budgets" class="section-link"><i data-lucide="arrow-right" style="width:14px; height:14px;"></i></a>
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
    const container = document.getElementById('ai-insights-content');
    if (!container) return;

    let insights = [];

    // Real AI Insights
    if (AI.isAvailable()) {
      try {
        const aiInsights = await AI.getSmartInsights();
        if (aiInsights && aiInsights.length > 0) {
          insights = aiInsights;
        }
      } catch (e) {
        console.warn('Groq AI Insight fetch failed, using smart local rule engine:', e);
      }
    }

    // Local Smart Rule Engine fallback
    if (insights.length === 0) {
      const month = Utils.toMonthString(new Date());
      const totals = Store.getTotals(month);
      const allTxns = Store.getTransactions({ sortBy: 'date' });
      const currentMonthTxns = Store.getTransactions({ startDate: month + '-01', endDate: month + '-31' });
      
      if (currentMonthTxns.length === 0) {
        insights.push("Welcome! Add a transaction manually or click **AI Scanner** on the Transactions page to import a handwritten budget sheet instantly.");
        insights.push("Our Document Intelligence engine parses complex table rows, categories, and values to build your financial overview in seconds.");
      } else {
        const savRate = Utils.percentage(totals.balance, totals.income) || 0;
        
        // Savings rate advice
        if (totals.income > 0) {
          if (savRate > 25) {
            insights.push(`🔥 Excellent job! Your savings rate of **${Math.round(savRate)}%** is well above the standard 20% threshold. You're building wealth rapidly.`);
          } else if (savRate > 10) {
            insights.push(`💡 Consistent Saver: You saved **${Math.round(savRate)}%** of your income this month. Try trimming snack or shopping expenses to reach 20%.`);
          } else if (savRate >= 0) {
            insights.push(`⚠️ Tight Budget: You saved **${Math.round(savRate)}%** of your inflow. Consider auditing recurring bills or subscriptions to build a larger cushion.`);
          } else {
            insights.push(`🚨 Over-budget warning: Your monthly expenses exceed your income by **${Utils.formatCurrency(Math.abs(totals.balance))}**. Review category limits immediately.`);
          }
        } else {
          insights.push("💡 Active Month: Recording your transactions consistently helps our smart rule engine identify spending categories and balance ratios.");
        }

        // Category-specific advice
        const byCat = Store.getByCategory(month);
        let highestExpenseCat = null;
        let highestExpenseAmt = 0;
        
        Object.entries(byCat).forEach(([catId, data]) => {
          if (data.expense > highestExpenseAmt) {
            highestExpenseAmt = data.expense;
            highestExpenseCat = catId;
          }
        });

        if (highestExpenseCat) {
          const cat = Store.getCategory(highestExpenseCat);
          const pctOfTotal = Utils.percentage(highestExpenseAmt, totals.expense);
          if (pctOfTotal > 35 && totals.expense > 0) {
            insights.push(`📊 Concentration Risk: **${cat ? cat.name : 'Other'}** makes up **${Math.round(pctOfTotal)}%** of your total monthly outflow. Try setting a strict category budget.`);
          }
        }

        // Budget Limit Alerts
        const budgetStatus = Store.getBudgetStatus(month);
        if (budgetStatus) {
          let overCount = 0;
          Object.values(budgetStatus.categoryStatus).forEach(s => {
            if (s.status === 'over-budget') overCount++;
          });
          if (overCount > 0) {
            insights.push(`🚨 Limit Warning: You have exceeded the allocated budget in **${overCount}** categories. Tap Budgets to adjust allocations.`);
          }
        }
      }
    }

    // Render insights beautifully
    if (insights.length > 0) {
      container.innerHTML = insights.map((insight, idx) => `
        <div class="ai-insight-item animate-fade-in-up" style="
          animation-delay: ${idx * 80}ms;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          padding: 12px 16px;
          border-radius: var(--radius-lg);
          background: var(--bg-primary);
          border: 1px solid var(--glass-border);
          transition: all var(--transition-fast);
        ">
          <span class="ai-insight-icon" style="font-size: var(--text-lg); flex-shrink: 0; line-height: 1;">💡</span>
          <span style="flex: 1;">${insight.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary); font-weight:700;">$1</strong>')}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="text-muted" style="padding:16px; font-size:13px; text-align:center;">
          Not enough transaction data for insights yet.
        </div>
      `;
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
    console.log('SMS Prompt: Checking eligibility...');
    
    if (sessionStorage.getItem('expenseiq_sms_prompt_v2_dismissed')) {
      console.log('SMS Prompt: Already dismissed in this session.');
      return;
    }
    
    const user = Auth.getUser();
    const settings = Store.getSettings();
    const hasPhone = (user?.user_metadata?.phone_number) || (settings.profile?.phoneNumber);
    
    console.log('SMS Prompt: hasPhone =', !!hasPhone);
    if (hasPhone) return;

    // 2. Show IMMEDIATELY (Removing artificial delay as requested)
    const currentHash = location.hash || '#/';
    console.log('SMS Prompt: Triggering now. Current hash:', currentHash);

    // Re-verify they are still on the dashboard
    if (currentHash !== '#/' && currentHash !== '' && currentHash !== '#') {
      console.log('SMS Prompt: Not on dashboard anymore. aborting.');
      return;
    }
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
        sessionStorage.setItem('expenseiq_sms_prompt_v2_dismissed', 'true');
      };

      document.getElementById('btn-sms-continue').onclick = () => {
        sessionStorage.setItem('expenseiq_trigger_profile_edit', 'true');
        card.remove();
        location.hash = '#/settings';
      };
  }
};
