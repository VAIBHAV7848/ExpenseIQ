/* ========================================
   ExpenseIQ — Categories Page Renderer
   ======================================== */

const Categories = {
  currentTab: 'expense',

  render() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <div class="pills animate-fade-in-down">
          <div class="pill ${this.currentTab === 'expense' ? 'active' : ''}" id="tab-exp">Expenses</div>
          <div class="pill ${this.currentTab === 'income' ? 'active' : ''}" id="tab-inc">Income</div>
        </div>
        <button class="btn btn-primary btn-sm animate-fade-in-right" onclick="Categories.showAddModal()">
          <i data-lucide="plus"></i> Add
        </button>
      </div>

      <div class="categories-grid stagger-children" id="cat-grid">
        <!-- Rendered by renderGrid -->
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    document.getElementById('tab-exp').addEventListener('click', () => { this.currentTab = 'expense'; this.render(); });
    document.getElementById('tab-inc').addEventListener('click', () => { this.currentTab = 'income'; this.render(); });

    this.renderGrid();
  },

  renderGrid() {
    const grid = document.getElementById('cat-grid');
    const cats = Store.getCategories(this.currentTab);
    const totals = Store.getByCategory(); // All time totals for stats display
    
    grid.innerHTML = cats.map(c => {
      const stats = totals[c.id] || { count: 0, expense: 0, income: 0 };
      const amt = this.currentTab === 'expense' ? stats.expense : stats.income;
      
      return `
        <div class="category-card">
          ${c.isDefault ? '<div class="badge badge-default">Def</div>' : ''}
          <div class="category-card-icon" style="background: ${c.color}">
            <i data-lucide="${c.icon}"></i>
          </div>
          <div class="category-card-name">${c.name}</div>
          <div class="category-card-stats">${Utils.formatCurrency(amt)} total</div>
          <div class="category-card-count">${stats.count} transactions</div>
          <div class="category-card-actions">
            <!-- Cannot edit/delete defaults for simplicity in this demo, but custom ones could be -->
            ${!c.isDefault ? `
              <button class="btn btn-secondary btn-sm" onclick="Categories.deleteCat('${c.id}')">Delete</button>
            ` : `<span class="text-xs text-muted" style="padding-top:10px;">Default Category</span>`}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  deleteCat(id) {
    ConfirmDialog.show({
      title: 'Delete Category',
      message: 'Are you sure? Transactions using this category might lose their icon styling.',
      confirmText: 'Delete',
      onConfirm: () => {
        Store.deleteCategory(id);
        Toast.success('Deleted', 'Category removed successfully');
        this.renderGrid();
      }
    });
  },

  showAddModal() {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#64748b'];
    
    Modal.show({
      title: 'New Category',
      content: `
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" id="cat-name" class="form-input" placeholder="E.g. Travel">
        </div>
        
        <div class="form-group">
          <label class="form-label">Color</label>
          <div class="color-picker-grid" id="cat-colors">
            ${colors.map(c => `<div class="color-option" data-color="${c}" style="background-color: ${c}"></div>`).join('')}
          </div>
          <input type="hidden" id="cat-color" value="">
        </div>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', id: 'cancel-cat' },
        { text: 'Add', class: 'btn-primary', id: 'save-cat' }
      ],
      onRender: (modalEl) => {
        const colorOpts = modalEl.querySelectorAll('.color-option');
        colorOpts.forEach(opt => {
          opt.addEventListener('click', function() {
            colorOpts.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('cat-color').value = this.dataset.color;
          });
        });

        document.getElementById('cancel-cat').addEventListener('click', () => Modal.close());
        document.getElementById('save-cat').addEventListener('click', () => {
          const name = document.getElementById('cat-name').value.trim();
          const color = document.getElementById('cat-color').value;
          
          if (!name || !color) {
            Toast.error('Error', 'Please provide a name and select a color.');
            return;
          }
          
          Store.addCategory({ name, color, icon: 'tag', type: this.currentTab });
          Toast.success('Added', 'Category added');
          Modal.close();
          this.render();
        });
      }
    });
  }
};
