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
        
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-secondary" id="rep-export">
            <i data-lucide="download"></i> Export JSON
          </button>
          <button class="btn btn-secondary" id="rep-export-csv">
            <i data-lucide="file-spreadsheet"></i> CSV
          </button>
          <button class="btn btn-secondary" id="rep-pdf-stmt">
            <i data-lucide="file-text"></i> Statement
          </button>
        </div>
      </div>

      <!-- Gorgeous Animated Cashflow Sankey Stream -->
      <div class="sankey-card animate-fade-in-up" style="animation-delay: 100ms;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
          <h3 class="card-title" style="font-weight: 800; display:flex; align-items:center; gap: 8px; margin: 0;">
            <span style="display:inline-flex; align-items:center; justify-content:center; background: var(--accent-primary-glow); padding: 6px; border-radius: 8px; color: var(--accent-primary);">
              <i data-lucide="git-fork" style="width: 16px; height: 16px;"></i>
            </span>
            Real-Time Cashflow Streams
          </h3>
          <span style="font-size: 10px; background: var(--bg-tertiary); color: var(--text-secondary); padding: 4px 8px; border-radius: 6px; font-weight: 700;">Live Flow Chart</span>
        </div>
        <div class="sankey-container" id="sankey-flow-wrapper">
          <!-- SVG and nodes injected dynamically by renderSankey() -->
        </div>
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

      <div class="chart-card reports-full animate-fade-in-up" style="animation-delay:175ms;" id="heatmap-card">
        <div class="card-header">
          <h3 class="card-title">Daily Spending Heatmap</h3>
          <div style="font-size:11px;color:var(--text-secondary);">
            Darker = more spending on that day
          </div>
        </div>
        <div id="spending-heatmap" style="padding:16px;overflow-x:auto;">
        </div>
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

    // Export JSON (existing)
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

    // Gap 5 — CSV Export from reports
    document.getElementById('rep-export-csv')
      ?.addEventListener('click', () => {
        const year = this.currentMonth.split('-')[0];
        const month = this.viewType === 'yearly'
          ? null : this.currentMonth;
        const filters = month
          ? { startDate: month + '-01',
              endDate: Utils.toDateString(new Date(
                parseInt(year),
                parseInt(month.split('-')[1]), 0)) }
          : { startDate: year + '-01-01',
              endDate: year + '-12-31' };
        const txns = Store.getTransactions(filters);
        if (!txns.length) {
          Toast.warning('No Data', 'No transactions to export.');
          return;
        }
        const header = ['Date','Type','Category',
          'Description','Amount','Notes'];
        const rows = txns.map(t => {
          const cat = Store.getCategory(t.category);
          return [t.date, t.type,
            cat ? cat.name : t.category,
            '"' + (t.description||'').replace(/"/g,'""') + '"',
            t.amount,
            '"' + (t.notes||'').replace(/"/g,'""') + '"'
          ].join(',');
        });
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], {type:'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ExpenseIQ_' + this.getLabel()
          .replace(/\s+/g,'_') + '.csv';
        a.click();
        Toast.success('CSV Exported', txns.length + ' rows saved.');
      });

    // Gap 6 — PDF Statement
    document.getElementById('rep-pdf-stmt')
      ?.addEventListener('click', () => this.downloadStatement());
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

    // Gap 7 — Heatmap visibility
    if (this.viewType === 'monthly') {
      this.renderHeatmap(this.currentMonth);
      const hc = document.getElementById('heatmap-card');
      if (hc) hc.style.display = 'block';
    } else {
      const hc = document.getElementById('heatmap-card');
      if (hc) hc.style.display = 'none';
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
    
    this.renderSankey();
  },

  renderSankey() {
    const wrapper = document.getElementById('sankey-flow-wrapper');
    if (!wrapper) return;

    let totals, byCat;
    if (this.viewType === 'monthly') {
      totals = Store.getTotals(this.currentMonth);
      byCat = Store.getByCategory(this.currentMonth);
    } else {
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
    }

    const inflow = totals.income || 0;
    const outflow = totals.expense || 0;
    const netBal = Math.max(0, totals.balance || 0);

    // Get categories array
    const catArray = Object.entries(byCat).map(([id, data]) => {
      const cat = Store.getCategory(id);
      return { id, name: cat ? cat.name : 'Unknown', color: cat ? cat.color : '#cbd5e1', amount: data.expense };
    }).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).slice(0, 3); // top 3

    // Build Sankey Nodes coordinates in percentage units (for responsive absolute positioning)
    const nodes = [];
    const links = [];

    // Col 1 (Sources): Inflow
    nodes.push({ id: 'inflow', title: 'Inflow Pool', value: inflow, color: 'var(--color-income)', x: 5, y: 50 });

    // Col 2 (Pools): Net Balance & Total Outflow
    nodes.push({ id: 'net_bal', title: 'Net Savings', value: netBal, color: 'var(--accent-primary)', x: 35, y: 25 });
    nodes.push({ id: 'outflow', title: 'Total Outflow', value: outflow, color: 'var(--color-expense)', x: 35, y: 75 });

    // Col 3 (Channels): Top 3 Category spendings
    catArray.forEach((cat, idx) => {
      const yVal = catArray.length === 1 ? 75 : catArray.length === 2 ? 65 + idx * 20 : 55 + idx * 18;
      nodes.push({ id: `cat_${cat.id}`, title: cat.name, value: cat.amount, color: cat.color, x: 68, y: yVal });
    });

    // Col 4 (Targets): Savings Quests
    nodes.push({ id: 'savings_quest', title: 'Savings Quests', value: netBal, color: 'var(--color-warning)', x: 95, y: 25 });

    // Build connections
    const totalFlow = Math.max(inflow, outflow + netBal, 1);

    if (inflow > 0) {
      // Inflow -> Net Savings
      if (netBal > 0) {
        links.push({ from: 'inflow', to: 'net_bal', val: netBal, color: 'var(--accent-primary)' });
      }
      // Inflow -> Total Outflow
      if (outflow > 0) {
        links.push({ from: 'inflow', to: 'outflow', val: outflow, color: 'var(--color-expense)' });
      }
    }

    // Total Outflow -> Categories
    if (outflow > 0) {
      catArray.forEach(cat => {
        links.push({ from: 'outflow', to: `cat_${cat.id}`, val: cat.amount, color: cat.color });
      });
    }

    // Net Savings -> Savings Quests
    if (netBal > 0) {
      links.push({ from: 'net_bal', to: 'savings_quest', val: netBal, color: 'var(--color-warning)' });
    }

    // Render nodes HTML + Bezier links SVG
    let svgHtml = `<svg class="sankey-svg" id="sankey-svg-canvas">`;
    let nodesHtml = '';

    // Calculate node coordinates in SVG space (1000 x 280)
    const svgWidth = 1000;
    const svgHeight = 280;

    const getNodeCoords = (nodeId) => {
      const n = nodes.find(item => item.id === nodeId);
      if (!n) return { x: 0, y: 0 };
      return {
        x: (n.x / 100) * svgWidth,
        y: (n.y / 100) * svgHeight
      };
    };

    // Render Link Paths
    links.forEach((link, idx) => {
      const start = getNodeCoords(link.from);
      const end = getNodeCoords(link.to);
      
      const x1 = start.x + 55; // right edge of source box
      const y1 = start.y;
      const x2 = end.x - 55;  // left edge of target box
      const y2 = end.y;

      const pathStr = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
      const strokeWidth = Math.max(2, Math.min(24, (link.val / totalFlow) * 35));

      // Bezier Link path with dynamic animated dash thread
      svgHtml += `
        <!-- Thicker flow connection line -->
        <path d="${pathStr}" class="sankey-link" stroke="${link.color}" stroke-width="${strokeWidth}" fill="none" />
        
        <!-- Glowing animated stream overlay -->
        <path d="${pathStr}" stroke="${link.color}" stroke-width="2.5" stroke-dasharray="10 18" fill="none" opacity="0.8" style="filter: drop-shadow(0 0 4px ${link.color});">
          <animate attributeName="stroke-dashoffset" values="100;0" dur="2.5s" repeatCount="indefinite" />
        </path>
      `;
    });

    svgHtml += `</svg>`;

    // Render nodes CSS absolute positions
    nodes.forEach(n => {
      nodesHtml += `
        <div class="sankey-node" style="left: ${n.x}%; top: ${n.y}%; border-left: 4px solid ${n.color};">
          <div class="sankey-node-title">${n.title}</div>
          <div class="sankey-node-value">${Utils.formatCurrency(n.value)}</div>
        </div>
      `;
    });

    wrapper.innerHTML = svgHtml + nodesHtml;
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
  },

  // Gap 7 — Heatmap Calendar
  renderHeatmap(monthStr) {
    const container = document.getElementById('spending-heatmap');
    if (!container) return;

    const daily = Store.getDailyTotals(monthStr);
    const maxExp = Math.max(...daily.map(d => d.expense), 1);
    const [y, m] = monthStr.split('-').map(Number);
    const firstDay = new Date(y, m-1, 1).getDay(); // 0=Sun

    // Day labels
    const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let html =
      '<div style="display:inline-block;min-width:300px;">' +
      '<div style="display:grid;' +
        'grid-template-columns:repeat(7,32px);gap:3px;' +
        'margin-bottom:6px;">' +
      dayLabels.map(d =>
        '<div style="text-align:center;font-size:10px;' +
          'color:var(--text-secondary);">' + d + '</div>'
      ).join('') + '</div>' +
      '<div style="display:grid;' +
        'grid-template-columns:repeat(7,32px);gap:3px;">';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div style="width:32px;height:32px;"></div>';
    }

    daily.forEach(d => {
      const intensity = d.expense / maxExp;
      let bg, tc;
      if (d.expense === 0) {
        bg = 'var(--bg-secondary)'; tc = 'var(--text-muted)';
      } else if (intensity < 0.25) {
        bg = '#bbf7d0'; tc = '#14532d';
      } else if (intensity < 0.55) {
        bg = '#4ade80'; tc = '#14532d';
      } else if (intensity < 0.80) {
        bg = '#16a34a'; tc = 'white';
      } else {
        bg = '#14532d'; tc = 'white';
      }
      const tip = d.expense > 0
        ? 'Day ' + d.day + ': ' +
          Utils.formatCurrency(d.expense) + ' spent'
        : 'Day ' + d.day + ': no spending';
      html +=
        '<div title="' + tip + '" style="width:32px;height:32px;' +
          'background:' + bg + ';border-radius:4px;display:flex;' +
          'align-items:center;justify-content:center;' +
          'font-size:9px;font-weight:600;color:' + tc + ';' +
          'cursor:default;">' + d.day + '</div>';
    });

    html += '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;' +
        'margin-top:10px;font-size:11px;' +
        'color:var(--text-secondary);">' +
      '<span>Less</span>' +
      ['var(--bg-secondary)','#bbf7d0','#4ade80',
       '#16a34a','#14532d'].map(c =>
        '<div style="width:14px;height:14px;background:' + c + ';' +
          'border-radius:2px;"></div>'
      ).join('') +
      '<span>More</span></div></div>';

    container.innerHTML = html;
  },

  // Gap 6 — PDF Bank Statement
  downloadStatement() {
    const month = this.currentMonth;
    const label = this.getLabel();
    const txns = Store.getTransactions({
      startDate: month + '-01',
      endDate: Utils.toDateString(new Date(
        parseInt(month.split('-')[0]),
        parseInt(month.split('-')[1]), 0))
    }).sort((a,b) => new Date(a.date) - new Date(b.date));
    const totals = Store.getTotals(month);
    const user = Auth.getUser();
    const email = user?.email || 'Guest User';

    // Build running balance
    let balance = 0;
    const rows = txns.map(t => {
      const cat = Store.getCategory(t.category);
      const amt = t.type === 'income' ? t.amount : -t.amount;
      balance += amt;
      return '<tr style="border-bottom:1px solid #e2e8f0;">' +
        '<td style="padding:6px 8px;">' + t.date + '</td>' +
        '<td style="padding:6px 8px;">' +
          Utils.escapeHtml(t.description) + '</td>' +
        '<td style="padding:6px 8px;">' +
          (cat ? cat.name : '—') + '</td>' +
        '<td style="padding:6px 8px; color:' +
          (t.type==='income'?'#16a34a':'#dc2626') + ';">' +
          (t.type==='income'?'+':'-') +
          Utils.formatCurrency(t.amount) + '</td>' +
        '<td style="padding:6px 8px;">' +
          Utils.formatCurrency(balance) + '</td>' +
        '</tr>';
    }).join('');

    const html =
      '<div style="font-family:Arial,sans-serif;color:#000;' +
        'max-width:700px;margin:0 auto;padding:24px;">' +
      '<div style="display:flex;justify-content:space-between;' +
        'align-items:center;border-bottom:3px solid #4f46e5;' +
        'padding-bottom:16px;margin-bottom:24px;">' +
        '<div>' +
          '<h1 style="margin:0;color:#4f46e5;font-size:24px;">'+
            '💰 ExpenseIQ</h1>' +
          '<p style="margin:4px 0 0;color:#64748b;font-size:14px;">'+
            'Monthly Statement</p></div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:18px;font-weight:bold;color:#000;">' +
            label + '</div>' +
          '<div style="font-size:12px;color:#64748b;">' +
            Utils.escapeHtml(email) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);'+
        'gap:16px;margin-bottom:24px;">' +
        '<div style="background:#f0fdf4;padding:12px;' +
          'border-radius:8px;text-align:center;">' +
          '<div style="color:#16a34a;font-size:11px;' +
            'text-transform:uppercase;">Total Income</div>' +
          '<div style="font-size:18px;font-weight:bold;' +
            'color:#16a34a;">+' +
            Utils.formatCurrency(totals.income) + '</div></div>' +
        '<div style="background:#fef2f2;padding:12px;' +
          'border-radius:8px;text-align:center;">' +
          '<div style="color:#dc2626;font-size:11px;' +
            'text-transform:uppercase;">Total Expenses</div>' +
          '<div style="font-size:18px;font-weight:bold;' +
            'color:#dc2626;">-' +
            Utils.formatCurrency(totals.expense) + '</div></div>' +
        '<div style="background:#eff6ff;padding:12px;' +
          'border-radius:8px;text-align:center;">' +
          '<div style="color:#1d4ed8;font-size:11px;' +
            'text-transform:uppercase;">Net Balance</div>' +
          '<div style="font-size:18px;font-weight:bold;' +
            'color:#1d4ed8;">' +
            Utils.formatCurrency(totals.balance) + '</div></div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;' +
        'font-size:13px;color:#000;">' +
        '<thead><tr style="background:#4f46e5;color:white;">' +
          '<th style="padding:8px;text-align:left;">Date</th>' +
          '<th style="padding:8px;text-align:left;">' +
            'Description</th>' +
          '<th style="padding:8px;text-align:left;">' +
            'Category</th>' +
          '<th style="padding:8px;text-align:left;">' +
            'Amount</th>' +
          '<th style="padding:8px;text-align:left;">' +
            'Balance</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="margin-top:24px;padding-top:12px;' +
        'border-top:1px solid #e2e8f0;text-align:center;' +
        'font-size:11px;color:#94a3b8;">' +
        'Generated by ExpenseIQ on ' +
        new Date().toLocaleDateString('en-IN') + '</div></div>';

    html2pdf().set({
      margin: 10,
      filename: 'ExpenseIQ_Statement_' + month + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(html).save().then(() => {
      Toast.success('Downloaded', 'Statement saved as PDF.');
    });
  }
};
