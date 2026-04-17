/* ========================================
   ExpenseIQ — Filter Panel Component
   ======================================== */

const FilterPanel = {
  _onFilterChange: null,
  _containerId: null,

  render(containerId, onFilterChange) {
    this._containerId = containerId;
    this._onFilterChange = onFilterChange;
    const container = document.getElementById(containerId);
    if (!container) return;

    const cats = Store.getCategories();
    container.innerHTML = `
      <div class="filter-panel">
        <div class="filter-row">
          <div class="filter-search-wrap">
            <i data-lucide="search" class="filter-search-icon"></i>
            <input type="text" id="fp-search" class="form-input" placeholder="Search transactions...">
          </div>
          <div class="type-pills">
            <div class="pill active" data-type="all">All</div>
            <div class="pill" data-type="income">Income</div>
            <div class="pill" data-type="expense">Expense</div>
          </div>
        </div>
        <div class="filter-row">
          <input type="date" id="fp-start" class="form-input filter-date-input" placeholder="From">
          <span class="text-muted" style="padding: 0 4px;">to</span>
          <input type="date" id="fp-end" class="form-input filter-date-input" placeholder="To">
          <input type="number" id="fp-min" class="form-input filter-amount-input" placeholder="Min ₹">
          <input type="number" id="fp-max" class="form-input filter-amount-input" placeholder="Max ₹">
        </div>
        <div class="filter-row">
          <select id="fp-category" class="form-input filter-category-select" multiple>
            ${cats.map(c => '<option value="' + c.id + '">' + Utils.escapeHtml(c.name) + '</option>').join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="fp-reset">Clear Filters</button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    this._bindEvents();
  },

  _bindEvents() {
    const debouncedApply = Utils.debounce(() => this.applyFilters(), 300);
    document.getElementById('fp-search')?.addEventListener('input', debouncedApply);
    document.getElementById('fp-start')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('fp-end')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('fp-min')?.addEventListener('input', debouncedApply);
    document.getElementById('fp-max')?.addEventListener('input', debouncedApply);
    document.getElementById('fp-category')?.addEventListener('change', () => this.applyFilters());

    document.querySelectorAll('.filter-panel .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-panel .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.applyFilters();
      });
    });

    document.getElementById('fp-reset')?.addEventListener('click', () => this.resetFilters());
  },

  applyFilters() {
    const filters = {};
    const search = document.getElementById('fp-search')?.value;
    const type = document.querySelector('.filter-panel .pill.active')?.dataset.type;
    const start = document.getElementById('fp-start')?.value;
    const end = document.getElementById('fp-end')?.value;
    const min = document.getElementById('fp-min')?.value;
    const max = document.getElementById('fp-max')?.value;
    const catSelect = document.getElementById('fp-category');
    const selectedCats = catSelect ? Array.from(catSelect.selectedOptions).map(o => o.value) : [];

    if (search) filters.search = search;
    if (type && type !== 'all') filters.type = type;
    if (start) filters.startDate = start;
    if (end) filters.endDate = end;
    if (min) filters.minAmount = parseFloat(min);
    if (max) filters.maxAmount = parseFloat(max);
    if (selectedCats.length) filters.categories = selectedCats;

    if (this._onFilterChange) this._onFilterChange(filters);
  },

  resetFilters() {
    const container = document.getElementById(this._containerId);
    if (container) {
      container.querySelectorAll('input').forEach(i => { i.value = ''; });
      container.querySelectorAll('select option').forEach(o => { o.selected = false; });
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      container.querySelector('.pill[data-type="all"]')?.classList.add('active');
    }
    if (this._onFilterChange) this._onFilterChange({});
  }
};
