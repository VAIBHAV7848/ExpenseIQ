/* ========================================
   ExpenseIQ — Dashboard Page Renderer
   ======================================== */

const Dashboard = {
  render() {
    const content = document.getElementById('page-content');
    const month = Utils.toMonthString(new Date());
    const totals = Store.getTotals(month);
    const balanceAll = Store.getTotals().balance; // All time balance
    
    const trendInc = Utils.calcTrend(totals.income, Store.getTotals(Utils.toMonthString(new Date(new Date().setMonth(new Date().getMonth()-1)))).income);
    const trendExp = Utils.calcTrend(totals.expense, Store.getTotals(Utils.toMonthString(new Date(new Date().setMonth(new Date().getMonth()-1)))).expense);
    
    const savRate = Utils.percentage(totals.balance, totals.income) || 0;

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
          <div class="recent-transactions-list" id="recent-list">
            <!-- Filled dynamically -->
          </div>
        </div>
        
        <div class="budget-overview-card">
          <div class="card-header">
            <h3 class="card-title">Budgets</h3>
            <a href="#/budgets" class="section-link"><i data-lucide="chevron-right"></i></a>
          </div>
          <div id="budget-mini-list">
            <!-- Filled dynamically -->
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Animate stats
    Utils.animateCounter(document.getElementById('st-bal'), balanceAll);
    Utils.animateCounter(document.getElementById('st-inc'), totals.income);
    Utils.animateCounter(document.getElementById('st-exp'), totals.expense);
    this._animateSavRate(document.getElementById('st-sav'), savRate);

    this.renderCharts();
    this.renderRecentTransactions();
    this.renderBudgetMini();
  },

  _animateSavRate(el, target) {
    const start = performance.now();
    const update = (now) => {
      const p = Math.min((now - start) / 1000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + '%';
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  renderCharts() {
    const month = Utils.toMonthString(new Date());
    
    // Trend Line Chart (Last 30 days demo data)
    const dailyData = Store.getDailyTotals(month);
    const labels = dailyData.map(d => d.day);
    const incData = dailyData.map(d => d.income);
    const expData = dailyData.map(d => d.expense);

    Charts.createLineChart('trendChart', labels, [
      { label: 'Income', data: incData, borderColor: '#10b981', tension: 0.4, fill: true },
      { label: 'Expense', data: expData, borderColor: '#ef4444', tension: 0.4, fill: true }
    ]);

    // Donut Chart Top 5 Categories
    const byCat = Store.getByCategory(month);
    const catArray = Object.entries(byCat).map(([id, data]) => {
      const cat = Store.getCategory(id);
      return { name: cat ? cat.name : 'Other', color: cat ? cat.color : '#cbd5e1', amount: data.expense };
    }).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).slice(0, 5);

    if (catArray.length === 0) {
      // Empty state handler can be placed here if needed
      return;
    }

    const dLabels = catArray.map(c => c.name);
    const dData = catArray.map(c => c.amount);
    const dColors = catArray.map(c => c.color);
    
    Charts.createDonutChart('donutChart', dLabels, dData, dColors);
  },

  renderRecentTransactions() {
    const txns = Store.getTransactions({ sortBy: 'date' }).slice(0, 7);
    const list = document.getElementById('recent-list');
    
    if (txns.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding: 40px 20px;">
        <p class="text-muted">No recent transactions</p>
      </div>`;
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
    
    if (!stats || Object.keys(stats.categoryStatus).length === 0) {
      list.innerHTML = `<div class="text-muted text-center" style="padding: 20px 0; font-size: 14px;">No budgets set for this month.</div>`;
      return;
    }

    // Get top 4 closest to limit
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
  }
};
