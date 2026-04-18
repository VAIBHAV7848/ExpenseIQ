/* ========================================
   ExpenseIQ — Settings Page Renderer
   ======================================== */

const Settings = {
  render() {
    const content = document.getElementById('page-content');
    const settings = Store.getSettings();
    const syncStatus = typeof syncEngine !== 'undefined' ? syncEngine.getStatus() : null;

    const user = Auth.getUser();
    const isGuest = Auth.isGuest();
    const email = user?.email || 'Guest User';
    const meta = user?.user_metadata || {};
    const primaryName = meta.full_name || meta.name || (email !== 'Guest User' ? email.split('@')[0] : 'Guest User');
    const avatarUrl = meta.avatar_url || meta.picture || '';

    let avatarHtml = avatarUrl 
      ? \`<img src="\${Utils.escapeHtml(avatarUrl)}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">\`
      : primaryName.charAt(0).toUpperCase();

    content.innerHTML = \`
      <div class="settings-section animate-fade-in-up" style="animation-delay: 30ms;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 class="settings-section-title" style="margin-bottom:0;"><i data-lucide="user"></i> Account Profile</h3>
          \${!isGuest ? '<button class="btn btn-ghost btn-sm" id="btn-edit-profile"><i data-lucide="edit-3"></i> Edit</button>' : ''}
        </div>
        
        <div class="settings-row" id="profile-view-mode">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:56px;height:56px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:24px;color:white;font-weight:bold;box-shadow:0 4px 12px rgba(79,70,229,0.2);">
              \${avatarHtml}
            </div>
            <div>
              <div style="font-weight:600;font-size:18px;color:var(--text-primary);">\${Utils.escapeHtml(primaryName)}</div>
              <div style="font-size:13px;color:var(--text-secondary); margin-top:2px;">\${email}</div>
              <div style="font-size:11px;color:var(--text-muted); margin-top:4px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:\${isGuest ? '#f59e0b' : '#10b981'};margin-right:4px;"></span>
                \${isGuest ? 'Local Account — Data is not synced' : 'Cloud Account — Synced with Supabase'}
              </div>
            </div>
          </div>
          <div class="settings-row-control">
            \${!isGuest ? '<button class="btn btn-secondary btn-sm" id="btn-logout">Sign Out</button>' : '<button class="btn btn-primary btn-sm" onclick="location.hash=\\'#/login\\'">Sign In</button>'}
          </div>
        </div>

        \${!isGuest ? \`
        <div class="settings-row" id="profile-edit-mode" style="display:none; flex-direction:column; align-items:flex-start; gap:12px;">
          <div class="form-group" style="width:100%;">
            <label class="form-label">Display Name</label>
            <input type="text" id="edit-profile-name" class="form-input" value="\${Utils.escapeHtml(primaryName)}">
          </div>
          <div class="form-group" style="width:100%;">
            <label class="form-label">Avatar URL (Optional)</label>
            <input type="text" id="edit-profile-avatar" class="form-input" placeholder="https://..." value="\${Utils.escapeHtml(avatarUrl)}">
          </div>
          <div style="display:flex; gap:8px; width:100%; justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm" id="btn-cancel-profile">Cancel</button>
            <button class="btn btn-primary btn-sm" id="btn-save-profile">Save Changes</button>
          </div>
        </div>
        \` : ''}
      </div>

      <div class="settings-section animate-fade-in-up" style="animation-delay: 50ms;">
        <h3 class="settings-section-title"><i data-lucide="palette"></i> Appearance</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Dark Theme</div>
            <div class="settings-row-desc">Enable dark mode for a better nighttime experience.</div>
          </div>
          <label class="settings-row-control toggle-switch">
             <input type="checkbox" id="set-theme" ${settings.theme === 'dark' ? 'checked' : ''}>
             <div class="toggle-slider"></div>
          </label>
        </div>
      </div>

      <div class="settings-section animate-fade-in-up" style="animation-delay: 80ms;">
        <h3 class="settings-section-title"><i data-lucide="refresh-cw"></i> Sync Status</h3>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Connection</div>
            <div class="settings-row-desc">${syncStatus?.isOnline ? 'Connected to Supabase' : 'Offline — changes queued locally'}</div>
          </div>
          <div class="settings-row-control">
            <span class="sync-badge ${syncStatus?.isOnline ? 'synced' : 'offline'}" style="font-size:12px;">${syncStatus?.isOnline ? '✓ Online' : '⚠ Offline'}</span>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Pending Changes</div>
            <div class="settings-row-desc">${syncStatus?.pendingCount || 0} item(s) waiting to sync</div>
          </div>
          <div class="settings-row-control">
            <button class="btn btn-secondary btn-sm" id="btn-force-sync">Force Sync</button>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Last Synced</div>
            <div class="settings-row-desc">${syncStatus?.lastSyncAt ? Utils.formatRelativeTime(syncStatus.lastSyncAt) : 'Never'}</div>
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
          <label class="settings-row-control toggle-switch">
             <input type="checkbox" id="set-alert" ${settings.notifications.overspending ? 'checked' : ''}>
             <div class="toggle-slider"></div>
          </label>
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
            <div class="settings-row-label">Export JSON</div>
            <div class="settings-row-desc">Download all data as a JSON backup file.</div>
          </div>
          <div class="settings-row-control">
             <button class="btn btn-secondary btn-sm" id="btn-export-json">Export JSON</button>
          </div>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">Import JSON</div>
            <div class="settings-row-desc">Restore data from a previously exported JSON file.</div>
          </div>
          <div class="settings-row-control">
             <input type="file" id="import-file" accept=".json" style="display:none;">
             <button class="btn btn-secondary btn-sm" id="btn-import-json">Import JSON</button>
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
        <h3 class="settings-section-title"><i data-lucide="scroll-text"></i> Activity Log</h3>
        <div id="activity-log-list" style="max-height:300px; overflow-y:auto;"></div>
      </div>

      <div class="settings-section animate-fade-in-up" style="animation-delay: 250ms;">
        <h3 class="settings-section-title"><i data-lucide="info"></i> About</h3>
        <div class="about-info">
          <div><strong>ExpenseIQ</strong> version 2.0.0</div>
          <div>AI-powered, offline-first finance tracker.</div>
          <div>Built with Vanilla JS, Supabase, Chart.js, and Groq AI.</div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.renderActivityLog();
    this.bindEvents();
  },

  renderActivityLog() {
    const list = document.getElementById('activity-log-list');
    if (!list) return;
    const logs = Store.getActivityLog(30);
    if (logs.length === 0) {
      list.innerHTML = '<div class="text-muted" style="padding:12px; font-size:13px;">No activity recorded yet.</div>';
      return;
    }
    list.innerHTML = logs.map(l => `
      <div class="activity-log-item">
        <div class="activity-log-msg">${Utils.escapeHtml(l.message)}</div>
        <div class="activity-log-time">${Utils.formatRelativeTime(l.timestamp)}</div>
      </div>
    `).join('');
  },

  bindEvents() {
    // Profile Editing Events
    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
      document.getElementById('profile-view-mode').style.display = 'none';
      document.getElementById('btn-edit-profile').style.display = 'none';
      document.getElementById('profile-edit-mode').style.display = 'flex';
    });

    document.getElementById('btn-cancel-profile')?.addEventListener('click', () => {
      document.getElementById('profile-edit-mode').style.display = 'none';
      document.getElementById('btn-edit-profile').style.display = 'inline-flex';
      document.getElementById('profile-view-mode').style.display = 'flex';
    });

    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-save-profile');
      btn.textContent = 'Saving...';
      btn.disabled = true;
      const newName = document.getElementById('edit-profile-name').value.trim();
      const newAvatar = document.getElementById('edit-profile-avatar').value.trim();
      const { error } = await Auth.updateProfile({ full_name: newName, avatar_url: newAvatar });
      if (error) {
        Toast.error('Update Failed', error.message);
        btn.textContent = 'Save Changes';
        btn.disabled = false;
      } else {
        Toast.success('Profile Updated', 'Your profile details have been saved.');
        this.render();
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await Auth.signOut();
      location.hash = '#/login';
    });

    document.getElementById('set-theme')?.addEventListener('change', (e) => {
      const t = e.target.checked ? 'dark' : 'light';
      Store.updateSettings({ theme: t });
      document.documentElement.setAttribute('data-theme', t);
      EventBus.emit('theme:changed', t);
    });

    document.getElementById('set-alert')?.addEventListener('change', (e) => {
      const s = Store.getSettings();
      s.notifications.overspending = e.target.checked;
      Store.updateSettings(s);
    });

    document.getElementById('btn-force-sync')?.addEventListener('click', async () => {
      Toast.info('Syncing...', 'Starting full sync...');
      if (typeof syncEngine !== 'undefined') {
        await syncEngine.fullSync();
        Toast.success('Synced', 'Full sync complete.');
        this.render();
      }
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const json = Store.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ExpenseIQ_Backup_' + Utils.today() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      Toast.success('Exported', 'JSON backup downloaded.');
    });

    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      document.getElementById('import-file')?.click();
    });

    document.getElementById('import-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const success = Store.importData(ev.target.result);
        if (success) {
          Toast.success('Imported', 'Data restored successfully. Refreshing...');
          setTimeout(() => location.reload(), 1500);
        } else {
          Toast.error('Import Failed', 'Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    });

    // PDF Export
    document.getElementById('btn-export')?.addEventListener('click', () => {
      const txns = Store.getTransactions({ sortOrder: 'asc' });
      const totals = Store.getTotals();
      const settings = Store.getSettings();

      const element = document.createElement('div');
      element.innerHTML = `
        <style>
          .pdf-container { font-family: 'Inter', sans-serif; color: #1e293b; padding: 20px 40px; background: #fff; }
          .pdf-header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          .pdf-brand { display: flex; align-items: center; gap: 12px; }
          .pdf-logo { width: 48px; height: 48px; background: #0f172a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
          .pdf-title-container h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .pdf-title-container p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
          .pdf-summary-cards { display: flex; gap: 16px; margin-bottom: 30px; }
          .pdf-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .pdf-card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
          .pdf-card-value { font-size: 24px; font-weight: 700; }
          .pdf-card-value.income { color: #10b981; }
          .pdf-card-value.expense { color: #ef4444; }
          .pdf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .pdf-table th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          .pdf-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .pdf-type-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
          .pdf-type-badge.income { background: #d1fae5; color: #059669; }
          .pdf-type-badge.expense { background: #fee2e2; color: #dc2626; }
          .pdf-footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
        <div class="pdf-container">
          <div class="pdf-header">
            <div class="pdf-brand">
              <div class="pdf-logo">💰</div>
              <div class="pdf-title-container"><h1>ExpenseIQ Report</h1><p>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
            </div>
          </div>
          <div class="pdf-summary-cards">
            <div class="pdf-card"><div class="pdf-card-title">Income</div><div class="pdf-card-value income">${settings.currencySymbol}${totals.income.toLocaleString()}</div></div>
            <div class="pdf-card"><div class="pdf-card-title">Expense</div><div class="pdf-card-value expense">${settings.currencySymbol}${totals.expense.toLocaleString()}</div></div>
            <div class="pdf-card"><div class="pdf-card-title">Balance</div><div class="pdf-card-value">${settings.currencySymbol}${totals.balance.toLocaleString()}</div></div>
          </div>
          <table class="pdf-table">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>${txns.map(t => {
              const c = Store.getCategory(t.category);
              return '<tr><td>' + Utils.formatDate(t.date, 'short') + '</td><td>' + Utils.escapeHtml(t.description) + '</td><td>' + (c ? c.name : 'Other') + '</td><td><span class="pdf-type-badge ' + t.type + '">' + t.type + '</span></td><td style="text-align:right;font-weight:600">' + settings.currencySymbol + t.amount.toLocaleString() + '</td></tr>';
            }).join('')}</tbody>
          </table>
          <div class="pdf-footer">Generated by ExpenseIQ v2.0</div>
        </div>
      `;

      Toast.info('Exporting...', 'Generating PDF...');
      html2pdf().set({
        margin: [0,0,0,0], filename: 'ExpenseIQ_Report.pdf',
        image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
      }).from(element).save().then(() => {
        Toast.success('Done', 'PDF downloaded.');
      }).catch(e => Toast.error('Failed', 'PDF generation failed.'));
    });

    document.getElementById('btn-demo')?.addEventListener('click', () => {
      ConfirmDialog.show({
        title: 'Load Demo Data?',
        message: 'This will add 50 sample transactions. Use for testing only.',
        confirmText: 'Load',
        onConfirm: () => {
          Store.loadDemoData();
          Toast.success('Loaded', 'Sample data added. Refreshing...');
          setTimeout(() => location.reload(), 1500);
        }
      });
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      ConfirmDialog.show({
        title: 'Reset Everything?',
        message: 'This is irreversible. All data will be permanently erased.',
        confirmText: 'Yes, Wipe Everything',
        type: 'danger',
        onConfirm: () => { Store.clearAll(); location.reload(); }
      });
    });
  }
};
