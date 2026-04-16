/* ========================================
   ExpenseIQ — Settings Page Renderer
   ======================================== */

const Settings = {
  render() {
    const content = document.getElementById('page-content');
    const settings = Store.getSettings();

    content.innerHTML = `
      <div class="settings-section animate-fade-in-up" style="animation-delay: 50ms;">
        <h3 class="settings-section-title"><i data-lucide="palette"></i> Appearance</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Dark Theme</div>
            <div class="settings-row-desc">Enable dark mode for a better nighttime experience.</div>
          </div>
          <div class="settings-row-control toggle-switch">
             <input type="checkbox" id="set-theme" ${settings.theme === 'dark' ? 'checked' : ''}>
             <div class="toggle-slider"></div>
          </div>
        </div>
      </div>

      <div class="settings-section animate-fade-in-up" style="animation-delay: 100ms;">
        <h3 class="settings-section-title"><i data-lucide="bell"></i> Notifications</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Overspending Alerts</div>
            <div class="settings-row-desc">Show warnings when nearing budget limits.</div>
          </div>
          <div class="settings-row-control toggle-switch">
             <input type="checkbox" id="set-alert" ${settings.notifications.overspending ? 'checked' : ''}>
             <div class="toggle-slider"></div>
          </div>
        </div>
      </div>

      <div class="settings-section animate-fade-in-up" style="animation-delay: 150ms;">
        <h3 class="settings-section-title"><i data-lucide="database"></i> Data Management</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Export Data (PDF)</div>
            <div class="settings-row-desc">Download a PDF copy of all your financial data.</div>
          </div>
          <div class="settings-row-control">
             <button class="btn btn-secondary btn-sm" id="btn-export">Export PDF</button>
          </div>
        </div>
        
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Demo Data</div>
            <div class="settings-row-desc">Populate the app with 50 sample transactions.</div>
          </div>
          <div class="settings-row-control">
             <button class="btn btn-primary btn-sm" id="btn-demo">Load Demo Data</button>
          </div>
        </div>
        
        <div class="settings-row">
          <div>
            <div class="settings-row-label" style="color: var(--color-expense)">Erase Everything</div>
            <div class="settings-row-desc">Permanently delete all data from this browser.</div>
          </div>
          <div class="settings-row-control">
             <button class="btn btn-danger btn-sm" id="btn-reset">Reset App</button>
          </div>
        </div>
      </div>
      
      <div class="settings-section animate-fade-in-up" style="animation-delay: 200ms;">
        <h3 class="settings-section-title"><i data-lucide="info"></i> About</h3>
        <div class="about-info">
          <div><strong>ExpenseIQ</strong> version 1.0.0</div>
          <div>Developed by Group 7 (Web Technology Lab, 2nd Year CSE)</div>
          <div>Built with raw HTML5, CSS3, and Vanilla JavaScript.</div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.bindEvents();
  },

  bindEvents() {
    // Theme toggle
    document.getElementById('set-theme').addEventListener('change', (e) => {
      const t = e.target.checked ? 'dark' : 'light';
      Store.updateSettings({ theme: t });
      document.documentElement.setAttribute('data-theme', t);
      EventBus.emit('theme:changed', t);
    });

    // Alert toggle
    document.getElementById('set-alert').addEventListener('change', (e) => {
      const s = Store.getSettings();
      s.notifications.overspending = e.target.checked;
      Store.updateSettings(s);
    });

    // Data Management (Premium PDF Export)
    document.getElementById('btn-export').addEventListener('click', () => {
      const txns = Store.getTransactions({ sortOrder: 'asc' });
      const totals = Store.getTotals();
      const settings = Store.getSettings();
      
      const element = document.createElement('div');
      element.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          .pdf-container {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            padding: 40px;
            background: #ffffff;
            box-sizing: border-box;
          }
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .pdf-brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .pdf-logo {
            width: 48px;
            height: 48px;
            background: #0f172a;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .pdf-title-container h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .pdf-title-container p {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #64748b;
          }
          .pdf-meta {
            text-align: right;
            font-size: 13px;
            color: #64748b;
          }
          .pdf-summary-cards {
            display: flex;
            gap: 20px;
            margin-bottom: 40px;
          }
          .pdf-card {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
          }
          .pdf-card-title {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 8px;
          }
          .pdf-card-value {
            font-size: 32px;
            font-weight: 700;
            color: #0f172a;
          }
          .pdf-card-value.income { color: #10b981; }
          .pdf-card-value.expense { color: #ef4444; }
          .pdf-section-title {
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
          }
          .pdf-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 14px;
          }
          .pdf-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            text-align: left;
            padding: 12px 16px;
            border-bottom: 2px solid #cbd5e1;
          }
          .pdf-table th:first-child { border-top-left-radius: 8px; }
          .pdf-table th:last-child { border-top-right-radius: 8px; }
          .pdf-table td {
            padding: 14px 16px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          .pdf-table tr:last-child td { border-bottom: none; }
          .pdf-type-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .pdf-type-badge.income {
            background: #d1fae5;
            color: #059669;
          }
          .pdf-type-badge.expense {
            background: #fee2e2;
            color: #dc2626;
          }
          .pdf-footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
          }
        </style>
        <div class="pdf-container">
          <div class="pdf-header">
            <div class="pdf-brand">
              <div class="pdf-logo">💰</div>
              <div class="pdf-title-container">
                <h1>ExpenseIQ</h1>
                <p>Comprehensive Financial Report</p>
              </div>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div><strong>Currency:</strong> ${settings.currency} (${settings.currencySymbol})</div>
            </div>
          </div>

          <div class="pdf-summary-cards">
            <div class="pdf-card">
              <div class="pdf-card-title">Total Income</div>
              <div class="pdf-card-value income">${settings.currencySymbol}${totals.income.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="pdf-card">
              <div class="pdf-card-title">Total Expense</div>
              <div class="pdf-card-value expense">${settings.currencySymbol}${totals.expense.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="pdf-card">
              <div class="pdf-card-title">Net Balance</div>
              <div class="pdf-card-value">${settings.currencySymbol}${totals.balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
          </div>

          <h2 class="pdf-section-title">Transaction History</h2>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txns.map(t => {
                const catInfo = Store.getCategory(t.category) || { name: 'Unknown' };
                return `
                <tr>
                  <td style="color: #64748b; white-space: nowrap;">${Utils.formatDate(t.date, 'short')}</td>
                  <td style="font-weight: 500;">${Utils.escapeHtml(t.description)}</td>
                  <td style="color: #64748b;">${catInfo.name}</td>
                  <td><span class="pdf-type-badge ${t.type}">${t.type}</span></td>
                  <td style="text-align: right; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${settings.currencySymbol}${t.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          
          <div class="pdf-footer">
            Generated securely by ExpenseIQ Tracker &bull; expense-iq-gold.vercel.app
          </div>
        </div>
      `;

      const opt = {
        margin:       [0, 0, 0, 0], // CSS handles margins
        filename:     'ExpenseIQ_Report.pdf',
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 3, useCORS: true, logging: false },
        jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
      };

      Toast.success('Exporting...', 'Generating your premium PDF...', 2000);
      html2pdf().set(opt).from(element).save().then(() => {
        Toast.success('Export Complete', 'Your report has been downloaded.');
      }).catch(err => {
        console.error(err);
        Toast.error('Export Failed', 'Unable to generate PDF.');
      });
    });

    document.getElementById('btn-demo').addEventListener('click', () => {
      ConfirmDialog.show({
        title: 'Load Demo Data?',
        message: 'This will add 50 sample transactions and budgets to your app. Use this only for testing purposes.',
        confirmText: 'Load Demo Data',
        onConfirm: () => {
          Store.loadDemoData();
          Toast.success('Demo Loaded', 'Sample data was added successfully. Refreshing views...', 3000);
          setTimeout(() => location.reload(), 2000);
        }
      });
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      ConfirmDialog.show({
        title: 'Reset Everything?',
        message: 'This action is irreversible. It will wipe all transactions, budgets, custom categories, and settings from your browser.',
        confirmText: 'Yes, Wipe Everything',
        type: 'danger',
        onConfirm: () => {
          Store.clearAll();
          location.reload();
        }
      });
    });
  }
};
