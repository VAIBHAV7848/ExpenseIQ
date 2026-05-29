/* ========================================
   ExpenseIQ — Spotlight Command Center Component
   ======================================== */

const CommandCenter = {
  commands: [
    { title: 'Add Expense', subtitle: 'Record a new spend debit', icon: 'minus-circle', shortcut: 'E', action: () => window.showAddTransactionModal('expense') },
    { title: 'Add Income', subtitle: 'Record a new cash inflow', icon: 'plus-circle', shortcut: 'I', action: () => window.showAddTransactionModal('income') },
    { title: 'Obsidian Dark Mode', subtitle: 'Toggle luxury dark mineral theme', icon: 'moon', shortcut: 'D', action: () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('expenseiq_settings', JSON.stringify({ theme: 'dark' }));
      EventBus.emit('theme:changed', 'dark');
      Toast.success('Theme Switched', 'Obsidian Mineral Dark mode active.');
    } },
    { title: 'Quartz Light Mode', subtitle: 'Toggle warm soft cream theme', icon: 'sun', shortcut: 'L', action: () => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('expenseiq_settings', JSON.stringify({ theme: 'light' }));
      EventBus.emit('theme:changed', 'light');
      Toast.success('Theme Switched', 'Quartz warm ivory mode active.');
    } },
    { title: 'Go to Transactions', subtitle: 'View ledger & AI document scanner', icon: 'list', shortcut: 'G T', action: () => { location.hash = '#/transactions'; } },
    { title: 'Go to Budgets', subtitle: 'Monitor category limits', icon: 'pie-chart', shortcut: 'G B', action: () => { location.hash = '#/budgets'; } },
    { title: 'Go to Reports', subtitle: 'Interactive visual analytics', icon: 'bar-chart-3', shortcut: 'G R', action: () => { location.hash = '#/reports'; } },
    { title: 'Go to Goals', subtitle: 'Track piggy-banks & targets', icon: 'target', shortcut: 'G G', action: () => { location.hash = '#/goals'; } },
    { title: 'Go to Settings', subtitle: 'Configure Twilio SMS profile & data', icon: 'settings', shortcut: 'G S', action: () => { location.hash = '#/settings'; } },
    { title: 'Sync Database', subtitle: 'Force real-time remote sync check', icon: 'refresh-cw', shortcut: 'Y', action: () => {
      if (typeof syncEngine !== 'undefined') {
        syncEngine.sync();
        Toast.success('Sync Triggered', 'Contacting Supabase Cloud...');
      } else {
        Toast.warning('Offline Sandbox', 'Sync is only available when logged in.');
      }
    } }
  ],
  selectedIndex: 0,
  filteredCommands: [],

  init() {
    const overlay = document.getElementById('command-center');
    const input = document.getElementById('command-search-input');
    if (!overlay || !input) return;

    this.filteredCommands = [...this.commands];

    // Global toggle listener
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Handle search input typing & keyboard navigation
    input.addEventListener('input', () => this.filter(input.value));
    input.addEventListener('keydown', (e) => this.handleKeydown(e));

    this.render();
  },

  toggle() {
    const overlay = document.getElementById('command-center');
    if (!overlay) return;

    if (overlay.classList.contains('active')) {
      this.close();
    } else {
      overlay.classList.add('active');
      const input = document.getElementById('command-search-input');
      if (input) {
        input.value = '';
        input.focus();
      }
      this.selectedIndex = 0;
      this.filter('');
    }
  },

  close() {
    const overlay = document.getElementById('command-center');
    if (overlay) overlay.classList.remove('active');
  },

  filter(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.render();
  },

  handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
      this.render();
      this.scrollToSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
      this.render();
      this.scrollToSelected();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = this.filteredCommands[this.selectedIndex];
      if (cmd) {
        this.close();
        cmd.action();
      }
    }
  },

  scrollToSelected() {
    const container = document.getElementById('command-results');
    const selectedEl = container?.querySelector('.command-item.selected');
    if (container && selectedEl) {
      const top = selectedEl.offsetTop;
      const height = selectedEl.offsetHeight;
      const containerHeight = container.offsetHeight;
      if (top + height > container.scrollTop + containerHeight) {
        container.scrollTop = top + height - containerHeight;
      } else if (top < container.scrollTop) {
        container.scrollTop = top;
      }
    }
  },

  render() {
    const results = document.getElementById('command-results');
    if (!results) return;

    if (this.filteredCommands.length === 0) {
      results.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          No commands found matching search.
        </div>
      `;
      return;
    }

    results.innerHTML = this.filteredCommands.map((c, idx) => `
      <div class="command-item ${idx === this.selectedIndex ? 'selected' : ''}" data-index="${idx}">
        <i data-lucide="${c.icon}"></i>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div class="command-item-title">${Utils.escapeHtml(c.title)}</div>
          <div class="command-item-subtitle" style="font-size: 11px; color: var(--text-muted); font-weight: 500;">${Utils.escapeHtml(c.subtitle)}</div>
        </div>
        <kbd class="command-item-shortcut">${c.shortcut}</kbd>
      </div>
    `).join('');

    // Lucide icons
    if (window.lucide) lucide.createIcons({ attrs: { class: 'command-item-icon' } });

    // Click triggers action
    results.querySelectorAll('.command-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const cmd = this.filteredCommands[idx];
        if (cmd) {
          this.close();
          cmd.action();
        }
      });
    });
  }
};
