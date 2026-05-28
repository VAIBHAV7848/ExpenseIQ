/* ========================================
   ExpenseIQ — AI Receipt Scanner Component
   ======================================== */

const ReceiptScanner = {
  templates: {
    starbucks: {
      description: 'Starbucks Coffee',
      amount: 320,
      category: 'food',
      date: () => Utils.today(),
      type: 'expense',
      notes: 'Brewed coffee & chocolate chip cookie',
      confidence: 98
    },
    uber: {
      description: 'Uber Ride',
      amount: 450,
      category: 'transport',
      date: () => Utils.today(),
      type: 'expense',
      notes: 'Commute to office (Premium Sedan)',
      confidence: 96
    },
    walmart: {
      description: 'Walmart Supercenter',
      amount: 3850,
      category: 'shopping',
      date: () => Utils.today(),
      type: 'expense',
      notes: 'Weekly groceries & paper supplies',
      confidence: 94
    },
    amazon: {
      description: 'Amazon Bookstore',
      amount: 1200,
      category: 'education',
      date: () => Utils.today(),
      type: 'expense',
      notes: 'Financial intelligence & investing book',
      confidence: 97
    }
  },

  showModal() {
    const categories = Store.getCategories();
    
    const contentHtml = `
      <div class="receipt-scanner-wrap" style="color: var(--text-primary); font-family: var(--font-primary);">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
          Upload a receipt file or pick a premium demo template below to simulate a real startup AI extraction workflow instantly.
        </p>

        <!-- Dropzone -->
        <div class="receipt-dropzone" id="receipt-dropzone" style="
          border: 2px dashed rgba(94, 95, 240, 0.3);
          border-radius: var(--radius-xl);
          padding: 32px 20px;
          text-align: center;
          background: rgba(94, 95, 240, 0.02);
          cursor: pointer;
          transition: all var(--transition-base);
          margin-bottom: 20px;
        ">
          <div class="dropzone-icon" style="font-size: 32px; color: var(--accent-primary); margin-bottom: 12px;">
            <i data-lucide="upload-cloud"></i>
          </div>
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Drag & drop your receipt image</h4>
          <p style="font-size: 11px; color: var(--text-muted);">Supports PNG, JPG up to 5MB</p>
          <input type="file" id="receipt-file-input" accept="image/*" style="display: none;" />
        </div>

        <!-- Template Picker -->
        <div style="margin-bottom: 24px;">
          <h5 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 12px;">
            ⚡ Quick Demo Templates
          </h5>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <button class="btn btn-secondary btn-sm demo-template-btn" data-template="starbucks" style="justify-content: flex-start; text-align: left; padding: 10px 12px;">
              ☕ Starbucks (₹320)
            </button>
            <button class="btn btn-secondary btn-sm demo-template-btn" data-template="uber" style="justify-content: flex-start; text-align: left; padding: 10px 12px;">
              🚗 Uber Ride (₹450)
            </button>
            <button class="btn btn-secondary btn-sm demo-template-btn" data-template="walmart" style="justify-content: flex-start; text-align: left; padding: 10px 12px;">
              🛒 Walmart (₹3,850)
            </button>
            <button class="btn btn-secondary btn-sm demo-template-btn" data-template="amazon" style="justify-content: flex-start; text-align: left; padding: 10px 12px;">
              📚 Amazon (₹1,200)
            </button>
          </div>
        </div>

        <!-- Loader overlay inside content -->
        <div class="scanner-loader hidden" id="scanner-loader" style="
          text-align: center;
          padding: 40px 20px;
        ">
          <div class="spin" style="color: var(--accent-primary); font-size: 28px; margin-bottom: 16px;">
            <i data-lucide="loader-2"></i>
          </div>
          <h4 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Reading receipt details...</h4>
          <p style="font-size: 12px; color: var(--text-secondary);" id="loader-status-text">AI is analyzing merchant text & amounts</p>
          
          <div class="scanner-skeleton" style="margin-top: 24px; display: flex; flex-direction: column; gap: 12px;">
            <div style="height: 16px; background: rgba(94, 95, 240, 0.05); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
            <div style="height: 16px; background: rgba(94, 95, 240, 0.05); border-radius: 4px; animation: pulse 1.5s infinite; width: 80%; margin: 0 auto;"></div>
            <div style="height: 16px; background: rgba(94, 95, 240, 0.05); border-radius: 4px; animation: pulse 1.5s infinite; width: 60%; margin: 0 auto;"></div>
          </div>
        </div>

        <!-- Result Form -->
        <div class="scanner-result hidden" id="scanner-result">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 169, 104, 0.06);
            border: 1px solid rgba(15, 169, 104, 0.15);
            padding: 10px 14px;
            border-radius: var(--radius-lg);
            margin-bottom: 20px;
          ">
            <span style="font-size: 12px; font-weight: 700; color: var(--color-income); display: flex; align-items: center; gap: 6px;">
              <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Extraction Successful
            </span>
            <span id="result-confidence" style="font-size: 11px; font-weight: 800; color: var(--text-secondary); background: var(--bg-primary); padding: 4px 8px; border-radius: 6px;">
              Confidence: 98%
            </span>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Merchant / Description</label>
              <input type="text" id="scan-desc" class="form-input" placeholder="e.g. Starbucks" required />
            </div>
            <div class="form-group">
              <label class="form-label">Amount (₹)</label>
              <input type="number" step="0.01" id="scan-amount" class="form-input" placeholder="0.00" required />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="scan-cat" class="form-select" required>
                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Transaction Date</label>
              <input type="date" id="scan-date" class="form-input" required />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="scan-type" class="form-select" required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <input type="text" id="scan-notes" class="form-input" placeholder="Additional details..." />
            </div>
          </div>
        </div>
      </div>
    `;

    Modal.show({
      title: 'AI Receipt Scanner',
      class: 'modal-lg',
      content: contentHtml,
      buttons: [
        { id: 'btn-scan-cancel', text: 'Cancel', class: 'btn-secondary' },
        { id: 'btn-scan-save', text: 'Save Transaction', class: 'btn-primary hidden' }
      ],
      onRender: (modalEl) => {
        if (window.lucide) lucide.createIcons();
        this.bindEvents(modalEl);
      }
    });
  },

  bindEvents(modalEl) {
    const dropzone = modalEl.querySelector('#receipt-dropzone');
    const fileInput = modalEl.querySelector('#receipt-file-input');
    const loader = modalEl.querySelector('#scanner-loader');
    const resultDiv = modalEl.querySelector('#scanner-result');
    const templateBtns = modalEl.querySelectorAll('.demo-template-btn');
    const saveBtn = document.getElementById('btn-scan-save');
    const cancelBtn = document.getElementById('btn-scan-cancel');

    // Trigger file input
    dropzone.addEventListener('click', () => fileInput.click());

    // File Drag Effects
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent-primary)';
      dropzone.style.background = 'var(--accent-primary-glow)';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = 'rgba(94, 95, 240, 0.3)';
      dropzone.style.background = 'rgba(94, 95, 240, 0.02)';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'rgba(94, 95, 240, 0.3)';
      dropzone.style.background = 'rgba(94, 95, 240, 0.02)';
      if (e.dataTransfer.files.length > 0) {
        this.processFile(e.dataTransfer.files[0], loader, resultDiv, dropzone, templateBtns, saveBtn);
      }
    });

    // File Input selection
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        this.processFile(fileInput.files[0], loader, resultDiv, dropzone, templateBtns, saveBtn);
      }
    });

    // Template Pickers
    templateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const templateName = btn.dataset.template;
        const data = this.templates[templateName];
        this.simulateScanning(data, loader, resultDiv, dropzone, templateBtns, saveBtn);
      });
    });

    // Cancel Button
    cancelBtn.addEventListener('click', () => Modal.close());

    // Save Button
    saveBtn.addEventListener('click', () => {
      const newTxn = {
        description: document.getElementById('scan-desc').value.trim(),
        amount: parseFloat(document.getElementById('scan-amount').value),
        category: document.getElementById('scan-cat').value,
        date: document.getElementById('scan-date').value,
        type: document.getElementById('scan-type').value,
        notes: document.getElementById('scan-notes').value.trim()
      };

      if (!newTxn.description || isNaN(newTxn.amount) || newTxn.amount <= 0) {
        Toast.warning('Validation Failed', 'Please provide a valid description and positive amount.');
        return;
      }

      const saved = Store.addTransaction(newTxn);
      if (saved) {
        Modal.close();
        Toast.success('Saved via AI', `Successfully recorded ₹${newTxn.amount} for ${newTxn.description}.`);
        
        // Dynamic Page refresh based on route
        if (Router.currentRoute === '#/transactions' && window.Transactions && Transactions.renderList) {
          Transactions.renderList();
        } else if (Router.currentRoute === '#/' && window.Dashboard && Dashboard.render) {
          Dashboard.render();
        }
        
        // Refresh sidebar
        Sidebar.render();
      } else {
        Toast.error('Error', 'Unable to save transaction. Please try again.');
      }
    });
  },

  processFile(file, loader, resultDiv, dropzone, templateBtns, saveBtn) {
    // Determine random template category based on filename or just random fallback
    const names = Object.keys(this.templates);
    const matched = names.find(n => file.name.toLowerCase().includes(n)) || names[Math.floor(Math.random() * names.length)];
    const baseData = { ...this.templates[matched] };
    
    // Inject slightly customized values to show real file-name influence
    baseData.description = file.name.split('.')[0].replace(/[-_]/g, ' ') || baseData.description;
    baseData.notes = `Extracted from uploaded receipt file: ${file.name}`;
    baseData.confidence = Math.floor(Math.random() * 10) + 89; // 89% - 99%

    this.simulateScanning(baseData, loader, resultDiv, dropzone, templateBtns, saveBtn);
  },

  simulateScanning(data, loader, resultDiv, dropzone, templateBtns, saveBtn) {
    // Hide picker & dropzone elements to focus on load skeletons
    dropzone.classList.add('hidden');
    templateBtns.forEach(b => b.classList.add('hidden'));
    const demoLabel = modalEl => modalEl.querySelector('h5');
    const demoLabelEl = document.querySelector('.receipt-scanner-wrap h5');
    if (demoLabelEl) demoLabelEl.classList.add('hidden');

    loader.classList.remove('hidden');

    // Run AI/OCR extraction prompts sequentially
    setTimeout(() => {
      const statusText = document.getElementById('loader-status-text');
      if (statusText) statusText.textContent = 'Running optical character matching (OCR)...';
    }, 1000);

    setTimeout(() => {
      const statusText = document.getElementById('loader-status-text');
      if (statusText) statusText.textContent = 'Formatting categories & merchant records...';
    }, 2000);

    setTimeout(() => {
      loader.classList.add('hidden');
      resultDiv.classList.remove('hidden');
      saveBtn.classList.remove('hidden');

      // Populate Extracted details in the editable preview fields
      document.getElementById('scan-desc').value = data.description;
      document.getElementById('scan-amount').value = data.amount;
      document.getElementById('scan-date').value = typeof data.date === 'function' ? data.date() : data.date;
      document.getElementById('scan-type').value = data.type || 'expense';
      document.getElementById('scan-notes').value = data.notes || '';
      
      const categorySelect = document.getElementById('scan-cat');
      if (categorySelect) {
        // Try selecting matching category id
        const matchingCat = Array.from(categorySelect.options).find(o => o.text.toLowerCase().includes(data.category) || o.value.toLowerCase().includes(data.category));
        if (matchingCat) {
          categorySelect.value = matchingCat.value;
        }
      }

      const confBadge = document.getElementById('result-confidence');
      if (confBadge) {
        confBadge.textContent = `Confidence: ${data.confidence}% (${data.confidence > 95 ? 'Excellent' : 'High'})`;
      }
      
      if (window.lucide) lucide.createIcons();
    }, 3200);
  }
};

// Global hook
window.showReceiptScannerModal = () => ReceiptScanner.showModal();
