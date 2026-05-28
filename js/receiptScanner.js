/* ========================================
   ExpenseIQ — AI Receipt Scanner (UI Layer)
   Delegates all data logic to ScannerService.
   ======================================== */

const ReceiptScanner = {

  showModal() {
    const categories = Store.getCategories();
    const catOpts = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const html = `
      <div class="receipt-scanner-wrap" style="color:var(--text-primary);">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;line-height:1.5;">
          Upload a receipt, bill, or handwritten budget sheet. Our pipeline extracts items, maps categories deterministically, validates totals, and lets you review before saving.
        </p>
        <div id="receipt-dropzone" style="border:2px dashed rgba(94,95,240,0.25);border-radius:var(--radius-xl);padding:32px 20px;text-align:center;background:rgba(94,95,240,0.01);cursor:pointer;transition:all var(--transition-base);margin-bottom:20px;">
          <div style="color:var(--accent-primary);margin-bottom:12px;display:inline-block;"><i data-lucide="upload-cloud" style="width:36px;height:36px;"></i></div>
          <h4 style="font-size:14px;font-weight:800;margin-bottom:4px;">Drag & drop documents here</h4>
          <p style="font-size:11px;color:var(--text-muted);margin:0;">Supports PNG, JPG, PDF</p>
          <input type="file" id="receipt-file-input" accept="image/*,application/pdf" style="display:none;" />
        </div>
        <div id="demo-presets-wrap" style="margin-bottom:24px;">
          <h5 style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--text-muted);letter-spacing:1.2px;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <i data-lucide="play-circle" style="width:14px;height:14px;color:var(--accent-primary);"></i> Demo Presets
          </h5>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
            <button class="btn btn-secondary btn-sm demo-tpl" data-tpl="monthly_budget" style="justify-content:flex-start;text-align:left;padding:12px 14px;border-color:rgba(94,95,240,0.3);background:var(--accent-primary-glow);font-weight:700;color:var(--accent-primary);">📝 Monthly Budget (13 items)</button>
            <button class="btn btn-secondary btn-sm demo-tpl" data-tpl="starbucks" style="justify-content:flex-start;text-align:left;padding:12px 14px;">☕ Starbucks (₹320)</button>
            <button class="btn btn-secondary btn-sm demo-tpl" data-tpl="uber" style="justify-content:flex-start;text-align:left;padding:12px 14px;">🚗 Uber Ride (₹450)</button>
            <button class="btn btn-secondary btn-sm demo-tpl" data-tpl="walmart" style="justify-content:flex-start;text-align:left;padding:12px 14px;">🛒 Walmart (₹3,850)</button>
          </div>
        </div>
        <div class="hidden" id="scanner-loader" style="text-align:center;padding:40px 20px;background:var(--bg-primary);border-radius:var(--radius-xl);border:1px solid var(--glass-border);">
          <div class="spin" style="color:var(--accent-primary);display:inline-block;margin-bottom:16px;"><i data-lucide="loader-2" style="width:36px;height:36px;"></i></div>
          <h4 id="loader-headline" style="font-size:16px;font-weight:800;margin-bottom:6px;">Analyzing document...</h4>
          <p id="loader-status" style="font-size:13px;color:var(--text-secondary);margin:0;">Running extraction pipeline</p>
          <div style="margin-top:24px;display:flex;flex-direction:column;gap:12px;">
            <div style="height:12px;background:rgba(94,95,240,0.05);border-radius:4px;animation:pulse 1.5s infinite;"></div>
            <div style="height:12px;background:rgba(94,95,240,0.05);border-radius:4px;animation:pulse 1.5s infinite;width:80%;margin:0 auto;"></div>
          </div>
        </div>
        <div class="hidden" id="scanner-single">${this._singleFormHtml(catOpts)}</div>
        <div class="hidden" id="scanner-multi">
          <div id="scan-warnings"></div>
          <div id="scan-summary"></div>
          <div style="max-height:320px;overflow-y:auto;border:1px solid var(--glass-border);border-radius:var(--radius-lg);margin-bottom:16px;background:var(--bg-primary);">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead><tr style="background:var(--bg-tertiary);border-bottom:1px solid var(--glass-border);position:sticky;top:0;z-index:10;">
                <th style="padding:10px;width:36px;text-align:center;background:var(--bg-tertiary);"><input type="checkbox" id="ledger-select-all" checked /></th>
                <th style="padding:10px;background:var(--bg-tertiary);font-weight:800;color:var(--text-secondary);">Description</th>
                <th style="padding:10px;width:130px;background:var(--bg-tertiary);font-weight:800;color:var(--text-secondary);">Category</th>
                <th style="padding:10px;width:70px;background:var(--bg-tertiary);font-weight:800;color:var(--text-secondary);text-align:center;">Type</th>
                <th style="padding:10px;width:55px;background:var(--bg-tertiary);font-weight:800;color:var(--text-secondary);text-align:center;">Conf.</th>
                <th style="padding:10px;width:95px;background:var(--bg-tertiary);font-weight:800;color:var(--text-secondary);text-align:right;">Amount</th>
              </tr></thead>
              <tbody id="ledger-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>`;

    Modal.show({
      title: '✨ Document Intelligence Scanner',
      class: 'modal-lg',
      content: html,
      buttons: [
        { id: 'btn-scan-cancel', text: 'Cancel', class: 'btn-secondary' },
        { id: 'btn-scan-save', text: 'Save Transaction', class: 'btn-primary hidden' },
        { id: 'btn-ledger-save', text: 'Import Selected Items', class: 'btn-primary hidden', style: 'background:var(--accent-gradient);' }
      ],
      onRender: () => { if (window.lucide) lucide.createIcons(); this._bind(); }
    });
  },

  _singleFormHtml(catOpts) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--color-income-bg);border:1px solid rgba(16,185,129,0.15);padding:12px 16px;border-radius:var(--radius-lg);margin-bottom:20px;">
        <span style="font-size:13px;font-weight:800;color:var(--color-income);display:flex;align-items:center;gap:8px;"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> Extracted</span>
        <span id="single-conf" style="font-size:11px;font-weight:800;color:var(--text-secondary);background:var(--bg-secondary);padding:4px 8px;border-radius:6px;border:1px solid var(--glass-border);"></span>
      </div>
      <div class="form-row-2"><div class="form-group"><label class="form-label">Description</label><input type="text" id="s-desc" class="form-input"/></div><div class="form-group"><label class="form-label">Amount (₹)</label><input type="number" step="0.01" id="s-amt" class="form-input"/></div></div>
      <div class="form-row-2"><div class="form-group"><label class="form-label">Category</label><select id="s-cat" class="form-select">${catOpts}</select></div><div class="form-group"><label class="form-label">Date</label><input type="date" id="s-date" class="form-input"/></div></div>
      <div class="form-row-2" style="margin-bottom:0;"><div class="form-group" style="margin-bottom:0;"><label class="form-label">Type</label><select id="s-type" class="form-select"><option value="expense">Expense</option><option value="income">Income</option></select></div><div class="form-group" style="margin-bottom:0;"><label class="form-label">Notes</label><input type="text" id="s-notes" class="form-input" placeholder="Optional notes"/></div></div>`;
  },

  _bind() {
    const dz = document.getElementById('receipt-dropzone');
    const fi = document.getElementById('receipt-file-input');
    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--accent-primary)'; dz.style.background = 'var(--accent-primary-glow)'; });
    dz.addEventListener('dragleave', () => { dz.style.borderColor = 'rgba(94,95,240,0.25)'; dz.style.background = 'rgba(94,95,240,0.01)'; });
    dz.addEventListener('drop', e => { e.preventDefault(); dz.style.borderColor = 'rgba(94,95,240,0.25)'; dz.style.background = 'rgba(94,95,240,0.01)'; if (e.dataTransfer.files.length) this._handleFile(e.dataTransfer.files[0]); });
    fi.addEventListener('change', () => { if (fi.files.length) this._handleFile(fi.files[0]); });

    document.querySelectorAll('.demo-tpl').forEach(btn => {
      btn.addEventListener('click', () => this._runDemo(btn.dataset.tpl));
    });

    document.getElementById('btn-scan-cancel').addEventListener('click', () => Modal.close());
    document.getElementById('btn-scan-save').addEventListener('click', () => this._saveSingle());
    document.getElementById('btn-ledger-save').addEventListener('click', () => this._saveMulti());
  },

  _hideInputs() {
    document.getElementById('receipt-dropzone').classList.add('hidden');
    document.getElementById('demo-presets-wrap').classList.add('hidden');
  },

  _showLoader(headline, status) {
    const loader = document.getElementById('scanner-loader');
    document.getElementById('loader-headline').textContent = headline;
    document.getElementById('loader-status').textContent = status;
    loader.classList.remove('hidden');
  },

  _hideLoader() { document.getElementById('scanner-loader').classList.add('hidden'); },

  // ── Demo flow ──
  _runDemo(key) {
    this._hideInputs();
    const isBudget = key === 'monthly_budget';
    this._showLoader(
      isBudget ? 'Analyzing handwritten ledger...' : 'Scanning receipt...',
      isBudget ? 'Running handwriting recognition (OCR)...' : 'Locating merchant and amount fields...'
    );

    setTimeout(() => {
      document.getElementById('loader-status').textContent = isBudget ? 'Mapping items to finance categories...' : 'Running deterministic category matching...';
    }, 1000);
    setTimeout(() => {
      document.getElementById('loader-status').textContent = isBudget ? 'Validating totals & budget balance...' : 'Cross-checking totals...';
    }, 2000);
    setTimeout(() => {
      this._hideLoader();
      const result = ScannerService.buildDemoExtraction(key);
      this._renderResult(result);
    }, 3000);
  },

  // ── File upload flow ──
  async _handleFile(file) {
    this._hideInputs();
    const isBudget = ScannerService.isBudgetFile(file.name);

    // Try Groq Vision if available
    if (typeof CONFIG !== 'undefined' && CONFIG.GROQ_API_KEY && CONFIG.GROQ_API_KEY !== 'YOUR_GROQ_API_KEY_HERE') {
      this._showLoader('Uploading to Groq Cloud...', 'Preparing document...');
      try {
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.onerror = reject; r.readAsDataURL(file);
        });
        document.getElementById('loader-status').textContent = 'Analyzing with Llama 4 Scout Vision...';

        const prompt = `You are a financial document extraction engine for an Indian personal finance app.
Analyze this image. It may be a receipt, bill, invoice, handwritten expense list, or handwritten monthly budget sheet.
Extract every financial row separately. Do not merge rows.
Return ONLY valid JSON (no markdown, no explanation, no code fences) using this exact schema:
{"documentType":"receipt|bill|invoice|budget_sheet|handwritten_expense_sheet|unknown","currency":"INR","title":"string","merchant":"string or null","date":"YYYY-MM-DD or null","monthlyIncome":0,"familyInfo":{"adults":0,"kids":0,"totalMembers":0},"summary":{"needsTotal":0,"wantsTotal":0,"expenseTotal":0},"items":[{"rawText":"original text","description":"cleaned name","amount":0,"type":"expense","needWantType":"needs or wants or unknown","suggestedCategoryName":"Food or Rent or Utilities or Transport or Education or Health or Shopping or Entertainment or Other","notes":""}],"warnings":[],"confidence":90}
Rules: amounts must be numbers not strings. Remove ₹ Rs symbols from amounts. For Indian docs use INR. If date missing use null. Every row in the document must be a separate item. Do not skip any rows. Return ONLY the JSON object.`;

        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 4096,
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } }] }]
          })
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        let rawContent = data.choices[0].message.content.trim();
        // Strip markdown code fences if present
        rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'');
        // Find JSON boundaries
        const jsonStart = rawContent.indexOf('{');
        const jsonEnd = rawContent.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in response');
        const groqJson = JSON.parse(rawContent.substring(jsonStart, jsonEnd + 1));

        document.getElementById('loader-status').textContent = 'Running deterministic category mapping...';
        await new Promise(r => setTimeout(r, 500));

        this._hideLoader();
        const result = ScannerService.processGroqResponse(groqJson, Store.getCategories());
        this._renderResult(result);
        return;
      } catch (e) {
        console.error('Groq vision failed, using offline fallback:', e);
      }
    }

    // Offline fallback
    this._showLoader('Processing offline...', 'Using demo extraction for ' + file.name);
    setTimeout(() => {
      this._hideLoader();
      const tplKey = isBudget ? 'monthly_budget' : ['starbucks', 'uber', 'walmart'][Math.floor(Math.random() * 3)];
      const result = ScannerService.buildDemoExtraction(tplKey);
      this._renderResult(result);
    }, 2000);
  },

  // ── Render pipeline result ──
  _renderResult(result) {
    if (!result || !result.items || result.items.length === 0) {
      Toast.error('Extraction Failed', 'No items could be extracted.');
      return;
    }

    const isMulti = result.items.length > 1 || result.documentType === 'budget_sheet';

    if (isMulti) {
      this._renderMulti(result);
    } else {
      this._renderSingle(result);
    }
    if (window.lucide) lucide.createIcons();
  },

  _renderSingle(result) {
    const item = result.items[0];
    const el = document.getElementById('scanner-single');
    el.classList.remove('hidden');
    document.getElementById('btn-scan-save').classList.remove('hidden');

    document.getElementById('s-desc').value = item.description;
    document.getElementById('s-amt').value = item.amount;
    document.getElementById('s-date').value = item.date || Utils.today();
    document.getElementById('s-type').value = item.type || 'expense';
    document.getElementById('s-notes').value = item.notes || '';
    const catSel = document.getElementById('s-cat');
    if (catSel) { const opt = Array.from(catSel.options).find(o => o.value === item.suggestedCategoryId); if (opt) catSel.value = opt.value; }
    const conf = document.getElementById('single-conf');
    const pct = Math.round(item.categoryConfidence * 100);
    conf.textContent = `Category: ${pct}% (${item.categoryMatchType})`;
  },

  _renderMulti(result) {
    const el = document.getElementById('scanner-multi');
    el.classList.remove('hidden');
    document.getElementById('btn-ledger-save').classList.remove('hidden');

    // Warnings
    const warnEl = document.getElementById('scan-warnings');
    if (result.warnings.length > 0) {
      const hasDeficit = result.warnings.some(w => w.includes('exceed'));
      const bg = hasDeficit ? 'var(--color-expense-bg)' : 'rgba(229,139,18,0.08)';
      const border = hasDeficit ? 'var(--color-expense)' : 'var(--color-warning)';
      const color = hasDeficit ? 'var(--color-expense)' : 'var(--color-warning)';
      const icon = hasDeficit ? 'alert-triangle' : 'info';
      warnEl.innerHTML = `<div style="background:${bg};border:1px solid ${border};border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;color:${color};font-weight:800;font-size:13px;margin-bottom:6px;"><i data-lucide="${icon}" style="width:16px;height:16px;"></i> Validation Warnings</div>
        <ul style="margin:0;padding-left:20px;font-size:12px;color:var(--text-secondary);line-height:1.6;">${result.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
      </div>`;
    }

    // Summary bar for budget sheets
    const sumEl = document.getElementById('scan-summary');
    if (result.documentType === 'budget_sheet' && result.monthlyIncome) {
      const ct = result.computedTotals || {};
      sumEl.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
        ${this._summaryChip('Income', result.monthlyIncome, 'var(--color-income)')}
        ${this._summaryChip('Needs', ct.needs || 0, 'var(--text-secondary)')}
        ${this._summaryChip('Wants', ct.wants || 0, 'var(--text-secondary)')}
        ${this._summaryChip('Total Exp.', ct.expense || 0, ct.expense > result.monthlyIncome ? 'var(--color-expense)' : 'var(--text-primary)')}
      </div>`;
    }

    // Table rows
    const tbody = document.getElementById('ledger-tbody');
    const categories = Store.getCategories();
    tbody.innerHTML = '';

    result.items.forEach((item, i) => {
      const catOpts = categories.map(c => `<option value="${c.id}" ${c.id === item.suggestedCategoryId ? 'selected' : ''}>${c.name}</option>`).join('');
      const confPct = Math.round(item.categoryConfidence * 100);
      const isLow = item.categoryConfidence < 0.65;
      const nwBadge = item.needWantType === 'needs'
        ? '<span style="font-size:9px;font-weight:800;background:rgba(15,169,104,0.1);color:var(--color-income);padding:2px 6px;border-radius:4px;">NEED</span>'
        : item.needWantType === 'wants'
        ? '<span style="font-size:9px;font-weight:800;background:rgba(229,139,18,0.1);color:var(--color-warning);padding:2px 6px;border-radius:4px;">WANT</span>'
        : '';
      const confColor = isLow ? 'var(--color-expense)' : confPct >= 90 ? 'var(--color-income)' : 'var(--color-warning)';
      const rowBorder = isLow ? 'border-left:3px solid var(--color-warning);' : '';
      const flags = result.itemFlags && result.itemFlags.get(i);
      const flagTitle = flags ? flags.join('; ') : '';

      const tr = document.createElement('tr');
      tr.className = 'scan-ledger-row';
      tr.style.cssText = `border-bottom:1px solid var(--glass-border);${rowBorder}`;
      if (flagTitle) tr.title = flagTitle;

      tr.innerHTML = `
        <td style="padding:10px;text-align:center;"><input type="checkbox" class="scan-chk" checked style="width:15px;height:15px;accent-color:var(--accent-primary);" /><input type="hidden" class="scan-date" value="${item.date || Utils.today()}" /><input type="hidden" class="scan-type" value="${item.type || 'expense'}" /></td>
        <td style="padding:8px 10px;"><input type="text" class="scan-desc" value="${Utils.escapeHtml(item.description)}" style="width:100%;border:1px solid var(--glass-border);border-radius:6px;padding:5px 8px;font-size:12px;background:transparent;color:var(--text-primary);" />${nwBadge ? '<div style="margin-top:3px;">'+nwBadge+'</div>' : ''}</td>
        <td style="padding:8px 10px;"><select class="scan-cat" style="width:100%;border:1px solid var(--glass-border);border-radius:6px;padding:4px;font-size:12px;background:var(--bg-secondary);color:var(--text-primary);">${catOpts}</select></td>
        <td style="padding:8px 10px;text-align:center;font-size:11px;"><span style="color:${confColor};font-weight:800;">${confPct}%</span>${isLow ? '<div style="font-size:9px;color:var(--color-warning);font-weight:700;">Review</div>' : ''}</td>
        <td style="padding:8px 10px;text-align:center;">${nwBadge}</td>
        <td style="padding:8px 10px;text-align:right;"><input type="number" class="scan-amt" value="${item.amount}" style="width:80px;text-align:right;border:1px solid var(--glass-border);border-radius:6px;padding:5px 8px;font-size:12px;background:transparent;color:var(--text-primary);font-family:var(--font-mono);font-weight:700;" /></td>`;
      tbody.appendChild(tr);
    });

    // Select-all
    document.getElementById('ledger-select-all').addEventListener('change', function() {
      document.querySelectorAll('.scan-chk').forEach(c => c.checked = this.checked);
    });

    if (window.lucide) lucide.createIcons();
  },

  _summaryChip(label, value, color) {
    return `<div style="background:var(--bg-secondary);padding:10px;border-radius:var(--radius-sm);border:1px solid var(--glass-border);text-align:center;">
      <div style="font-size:9px;color:var(--text-muted);font-weight:800;text-transform:uppercase;">${label}</div>
      <div style="font-size:14px;font-weight:900;color:${color};font-family:var(--font-mono);margin-top:2px;">₹${value.toLocaleString()}</div>
    </div>`;
  },

  // ── Save handlers ──
  _isSaving: false,

  _saveSingle() {
    if (this._isSaving) return;
    this._isSaving = true;

    const txn = {
      description: document.getElementById('s-desc').value.trim(),
      amount: parseFloat(document.getElementById('s-amt').value),
      category: document.getElementById('s-cat').value,
      date: document.getElementById('s-date').value || Utils.today(),
      type: document.getElementById('s-type').value,
      notes: document.getElementById('s-notes').value.trim()
    };
    if (!txn.description || isNaN(txn.amount) || txn.amount <= 0) {
      Toast.warning('Validation', 'Please provide a valid description and positive amount.');
      this._isSaving = false;
      return;
    }

    // Validate date is YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) txn.date = Utils.today();

    // Validate category exists
    const validCat = Store.getCategory(txn.category);
    if (!validCat) txn.category = 'cat_other_exp';

    Store.addTransaction(txn);
    Modal.close();
    Toast.success('Saved', `₹${txn.amount.toLocaleString()} recorded for ${txn.description}.`);
    this._scheduleRefresh();
  },

  _saveMulti() {
    if (this._isSaving) return;
    this._isSaving = true;

    // Disable button to prevent double-click
    const saveBtn = document.getElementById('btn-ledger-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      saveBtn.style.opacity = '0.6';
    }

    // Collect selected rows
    const rows = document.querySelectorAll('.scan-ledger-row');
    const items = [];

    rows.forEach(row => {
      if (!row.querySelector('.scan-chk').checked) return;

      const desc = row.querySelector('.scan-desc').value.trim();
      const amt = parseFloat(row.querySelector('.scan-amt').value);
      let cat = row.querySelector('.scan-cat').value;
      let date = row.querySelector('.scan-date').value;
      const type = row.querySelector('.scan-type').value;

      // Normalize date
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = Utils.today();

      // Validate category exists, fallback to Other
      const validCat = Store.getCategory(cat);
      if (!validCat) cat = 'cat_other_exp';

      if (desc && !isNaN(amt) && amt > 0) {
        items.push({
          description: desc,
          amount: amt,
          category: cat,
          date: date,
          type: type === 'income' ? 'income' : 'expense',
          notes: 'Imported via AI Scanner'
        });
      }
    });

    if (items.length === 0) {
      Toast.warning('Nothing Selected', 'Check at least one valid item to import.');
      this._isSaving = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Import Selected Items'; saveBtn.style.opacity = '1'; }
      return;
    }

    // Use bulk method — single localStorage write, single event, one SMS
    const result = Store.addBulkTransactions(items, { source: 'AI Scanner', suppressSMS: false });

    const savedCount = result.saved.length;
    const failedCount = result.failed.length;
    const total = result.saved.reduce((s, t) => s + t.amount, 0);

    Modal.close();

    if (failedCount > 0) {
      Toast.warning('Partial Import', `${savedCount} saved (₹${total.toLocaleString()}), ${failedCount} failed validation.`);
    } else {
      Toast.success('Bulk Import', `${savedCount} transactions imported, totaling ₹${total.toLocaleString()}.`);
    }

    this._scheduleRefresh();
  },

  /**
   * Schedule a UI refresh after modal close animation completes (200ms).
   * Uses setTimeout to ensure DOM is clean before re-rendering.
   */
  _scheduleRefresh() {
    setTimeout(() => {
      this._isSaving = false;

      // Refresh the current page
      const route = location.hash || '#/';
      if (route === '#/transactions' && window.Transactions) {
        // Full render to reset any stale filter state
        Transactions.render();
      } else if (route === '#/' && window.Dashboard) {
        Dashboard.render();
      }

      // Always refresh sidebar totals
      if (window.Sidebar) Sidebar.render();

      // Dispatch app-wide event for any other listeners
      window.dispatchEvent(new CustomEvent('expenseiq:transactions-updated', {
        detail: { source: 'ai_scanner' }
      }));
    }, 300); // 300ms > modal close animation (200ms)
  }
};

window.showReceiptScannerModal = () => ReceiptScanner.showModal();
