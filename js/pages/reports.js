/* ========================================
   ExpenseIQ — Reports Page Renderer
   ======================================== */

const Reports = {
  currentMonth: Utils.toMonthString(new Date()),
  viewType: 'monthly', // monthly or yearly

  render() {
    const content = document.getElementById('page-content');
    
    // Header & Period Nav
    content.innerHTML = `
      <div class="reports-period-nav animate-fade-in-down">
        <div class="period-selector">
          <button class="period-btn" id="rep-prev"><i data-lucide="chevron-left"></i></button>
          <div class="period-label" id="rep-label">${this.getLabel()}</div>
          <button class="period-btn" id="rep-next"><i data-lucide="chevron-right"></i></button>
        </div>
        
        <div class="pills">
          <div class="pill ${this.viewType==='monthly'?'active':''}" id="btn-monthly">Monthly</div>
          <div class="pill ${this.viewType==='yearly'?'active':''}" id="btn-yearly">Yearly</div>
        </div>
        
        <button class="btn btn-secondary" id="rep-export">
          <i data-lucide="download"></i> Export Data
        </button>
      </div>

      <div class="reports-grid stagger-children" id="rep-charts-top">
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">Income vs Expense</h3></div>
          <div class="chart-container"><canvas id="repBarChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="card-header"><h3 class="card-title">Category Breakdown</h3></div>
          <div class="chart-container"><canvas id="repDonutChart"></canvas></div>
        </div>
      </div>

      <div class="chart-card reports-full animate-fade-in-up" style="animation-delay: 150ms;">
        <div class="card-header"><h3 class="card-title">Trend</h3></div>
        <div class="chart-container"><canvas id="repLineChart"></canvas></div>
      </div>

      <div class="chart-card reports-full animate-fade-in-up" style="animation-delay: 200ms;">
        <div class="card-header"><h3 class="card-title">Summary Statistics</h3></div>
        <table class="summary-table">
          <thead>
            <tr><th>Metric</th><th>Amount</th></tr>
          </thead>
          <tbody id="rep-summary-body">
          </tbody>
        </table>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
    this.renderData();
  },

  getLabel() {
    const [y, m] = this.currentMonth.split('-');
    if (this.viewType === 'yearly') return y;
    return `${Utils.getMonthName(parseInt(m)-1)} ${y}`;
  },

  bindEvents() {
    document.getElementById('rep-prev').addEventListener('click', () => {
      const parts = this.currentMonth.split('-');
      let y = parseInt(parts[0]), m = parseInt(parts[1]);
      if (this.viewType === 'yearly') {
        y--;
      } else {
        if (m === 1) { m = 12; y--; } else { m--; }
      }
      this.currentMonth = `${y}-${String(m).padStart(2,'0')}`;
      document.getElementById('rep-label').textContent = this.getLabel();
      this.renderData();
    });

    document.getElementById('rep-next').addEventListener('click', () => {
      const parts = this.currentMonth.split('-');
      let y = parseInt(parts[0]), m = parseInt(parts[1]);
      if (this.viewType === 'yearly') {
        y++;
      } else {
        if (m === 12) { m = 1; y++; } else { m++; }
      }
      this.currentMonth = `${y}-${String(m).padStart(2,'0')}`;
      document.getElementById('rep-label').textContent = this.getLabel();
      this.renderData();
    });

    document.getElementById('btn-monthly').addEventListener('click', () => {
      this.viewType = 'monthly';
      this.render();
    });

    document.getElementById('btn-yearly').addEventListener('click', () => {
      this.viewType = 'yearly';
      this.render();
    });

    document.getElementById('rep-export').addEventListener('click', () => {
      const payload = Store.exportData();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExpenseIQ_Export_${this.getLabel().replace(' ','_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Exported', 'Data exported successfully.');
    });
  },

  renderData() {
    let totals, byCat;
    
    if (this.viewType === 'monthly') {
      totals = Store.getTotals(this.currentMonth);
      byCat = Store.getByCategory(this.currentMonth);
      this.renderMonthlyCharts();
    } else {
      // Yearly
      const year = this.currentMonth.split('-')[0];
      const allTxns = Store.getTransactions({ startDate: `${year}-01-01`, endDate: `${year}-12-31` });
      
      let totInc = 0, totExp = 0, cats = {};
      allTxns.forEach(t => {
        if (t.type === 'income') totInc += t.amount;
        else totExp += t.amount;
        if (t.type === 'expense') {
          if(!cats[t.category]) cats[t.category] = { expense: 0 };
          cats[t.category].expense += t.amount;
        }
      });
      totals = { income: totInc, expense: totExp, balance: totInc - totExp };
      byCat = cats;
      this.renderYearlyCharts(year);
    }

    // Update Summary Table
    const tbody = document.getElementById('rep-summary-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td>Total Income</td><td class="text-income">${Utils.formatCurrency(totals.income)}</td></tr>
        <tr><td>Total Expenses</td><td class="text-expense">${Utils.formatCurrency(totals.expense)}</td></tr>
        <tr><td>Net Balance</td><td>${Utils.formatCurrency(totals.balance)}</td></tr>
        <tr><td>Savings Rate</td><td>${Utils.percentage(totals.balance, totals.income)}%</td></tr>
      `;
    }

    // Update Donut
    const catArray = Object.entries(byCat).map(([id, data]) => {
      const cat = Store.getCategory(id);
      return { name: cat ? cat.name : 'Unknown', color: cat ? cat.color : '#ccc', amount: data.expense };
    }).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);
    
    Charts.createDonutChart('repDonutChart', catArray.map(c=>c.name), catArray.map(c=>c.amount), catArray.map(c=>c.color));
  },

  renderMonthlyCharts() {
    const dailyData = Store.getDailyTotals(this.currentMonth);
    
    // Group into weeks for bar chart readability (4-5 weeks max)
    const weeks = [ {inc:0, exp:0}, {inc:0, exp:0}, {inc:0, exp:0}, {inc:0, exp:0}, {inc:0, exp:0} ];
    dailyData.forEach(d => {
      let w = Math.min(Math.floor((d.day - 1)/7), 4);
      weeks[w].inc += d.income;
      weeks[w].exp += d.expense;
    });

    Charts.createBarChart('repBarChart', ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5+'], [
      { label: 'Income', data: weeks.map(w=>w.inc), backgroundColor: '#10b981' },
      { label: 'Expense', data: weeks.map(w=>w.exp), backgroundColor: '#ef4444' }
    ]);

    Charts.createLineChart('repLineChart', dailyData.map(d=>d.day), [
      { label: 'Expense', data: dailyData.map(d=>d.expense), borderColor: '#ef4444', fill: true }
    ]);
  },

  renderYearlyCharts(year) {
    const data = Store.getMonthlyTotals(year);
    
    Charts.createBarChart('repBarChart', data.map(d=>d.label), [
      { label: 'Income', data: data.map(d=>d.income), backgroundColor: '#10b981' },
      { label: 'Expense', data: data.map(d=>d.expense), backgroundColor: '#ef4444' }
    ]);

    Charts.createLineChart('repLineChart', data.map(d=>d.label), [
      { label: 'Income', data: data.map(d=>d.income), borderColor: '#10b981', fill: true },
      { label: 'Expense', data: data.map(d=>d.expense), borderColor: '#ef4444', fill: true }
    ]);
  }
};
