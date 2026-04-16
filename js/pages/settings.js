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
            <div class="settings-row-label">Export Data</div>
            <div class="settings-row-desc">Download a JSON copy of all your data.</div>
          </div>
          <div class="settings-row-control">
             <button class="btn btn-secondary btn-sm" id="btn-export">Download</button>
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

    // Data Management
    document.getElementById('btn-export').addEventListener('click', () => {
      const payload = Store.exportData();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExpenseIQ_Full_Backup.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Export Complete', 'Your data backup is ready.');
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
