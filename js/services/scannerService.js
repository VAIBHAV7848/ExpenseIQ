/* ========================================
   ExpenseIQ — Scanner Service
   Orchestrates extraction → normalization →
   categorization → validation pipeline.
   ======================================== */

const ScannerService = {

  // ───── Demo Template Raw Data ─────
  // These simulate what an AI/OCR engine would return as raw extraction.
  // They use the strict JSON schema defined in the requirements.
  _demoTemplates: {
    monthly_budget: {
      documentType: 'budget_sheet',
      currency: 'INR',
      title: 'Monthly Household Budget - Family of 4',
      merchant: null,
      date: null,
      monthlyIncome: 22000,
      familyInfo: { adults: 2, kids: 2, totalMembers: 4 },
      summary: {
        subtotal: null, tax: null, discount: null, total: null,
        needsTotal: 21700, wantsTotal: 1800,
        expenseTotal: 23500, netBalance: -1500
      },
      items: [
        { rawText: '1. Groceries & Staples — Needs — ₹5,000', description: 'Groceries & Staples', amount: 5000, type: 'expense', needWantType: 'needs', notes: 'Monthly staple groceries' },
        { rawText: '2. Vegetables & Fruits — Needs — ₹2,000', description: 'Vegetables & Fruits', amount: 2000, type: 'expense', needWantType: 'needs', notes: 'Monthly farm produce' },
        { rawText: '3. Dairy & Eggs — Needs — ₹1,500', description: 'Dairy & Eggs', amount: 1500, type: 'expense', needWantType: 'needs', notes: 'Milk, curd, eggs' },
        { rawText: '4. Breakfast & Snacks — Needs — ₹1,200', description: 'Breakfast & Snacks', amount: 1200, type: 'expense', needWantType: 'needs', notes: 'Morning meals & snacks' },
        { rawText: '5. House Rent — Needs — ₹6,000', description: 'House Rent', amount: 6000, type: 'expense', needWantType: 'needs', notes: 'Monthly rent' },
        { rawText: '6. Electricity Bill — Needs — ₹1,300', description: 'Electricity Bill', amount: 1300, type: 'expense', needWantType: 'needs', notes: 'Monthly utility' },
        { rawText: '7. Water Bill — Needs — ₹400', description: 'Water Bill', amount: 400, type: 'expense', needWantType: 'needs', notes: 'Monthly utility' },
        { rawText: '8. Gas Cylinder — Needs — ₹1,100', description: 'Gas Cylinder', amount: 1100, type: 'expense', needWantType: 'needs', notes: 'LPG refill' },
        { rawText: '9. Mobile Recharge — Needs — ₹500', description: 'Mobile Recharge', amount: 500, type: 'expense', needWantType: 'needs', notes: 'Phone plan' },
        { rawText: '10. Internet — Needs — ₹700', description: 'Internet', amount: 700, type: 'expense', needWantType: 'needs', notes: 'Broadband plan' },
        { rawText: '11. Transport — Needs — ₹2,000', description: 'Transport', amount: 2000, type: 'expense', needWantType: 'needs', notes: 'Commute & fuel' },
        { rawText: '12. Education (Kids) — Wants — ₹1,000', description: 'Education (Kids)', amount: 1000, type: 'expense', needWantType: 'wants', notes: 'School supplies' },
        { rawText: '13. Medicines & Health — Wants — ₹800', description: 'Medicines & Health', amount: 800, type: 'expense', needWantType: 'wants', notes: 'Medical & prescriptions' }
      ],
      warnings: [],
      confidence: 99
    },

    starbucks: {
      documentType: 'receipt',
      currency: 'INR',
      title: 'Starbucks Coffee Receipt',
      merchant: 'Starbucks',
      date: null,
      monthlyIncome: null,
      familyInfo: null,
      summary: { subtotal: 320, tax: null, discount: null, total: 320, needsTotal: null, wantsTotal: null, expenseTotal: 320, netBalance: null },
      items: [
        { rawText: 'Brewed Coffee & Chocolate Chip Cookie', description: 'Starbucks Coffee', amount: 320, type: 'expense', needWantType: 'wants', notes: 'Brewed coffee & chocolate chip cookie' }
      ],
      warnings: [],
      confidence: 98
    },

    uber: {
      documentType: 'receipt',
      currency: 'INR',
      title: 'Uber Ride Invoice',
      merchant: 'Uber',
      date: null,
      monthlyIncome: null,
      familyInfo: null,
      summary: { subtotal: 450, tax: null, discount: null, total: 450, needsTotal: null, wantsTotal: null, expenseTotal: 450, netBalance: null },
      items: [
        { rawText: 'Uber Ride — Premium Sedan', description: 'Uber Ride', amount: 450, type: 'expense', needWantType: 'needs', notes: 'Commute to office (Premium Sedan)' }
      ],
      warnings: [],
      confidence: 96
    },

    walmart: {
      documentType: 'receipt',
      currency: 'INR',
      title: 'Walmart Supercenter Receipt',
      merchant: 'Walmart Supercenter',
      date: null,
      monthlyIncome: null,
      familyInfo: null,
      summary: { subtotal: 3850, tax: null, discount: null, total: 3850, needsTotal: null, wantsTotal: null, expenseTotal: 3850, netBalance: null },
      items: [
        { rawText: 'Weekly groceries & paper supplies', description: 'Walmart Supercenter', amount: 3850, type: 'expense', needWantType: 'needs', notes: 'Weekly groceries & paper supplies' }
      ],
      warnings: [],
      confidence: 94
    }
  },

  // ───── Main Pipeline ─────

  /**
   * Process a raw extraction (from AI, demo, or file) through the full pipeline.
   * @param {object} rawExtraction - Raw extraction data in the strict schema format
   * @param {Array} existingCategories - From Store.getCategories()
   * @returns {object} Fully processed extraction ready for preview
   */
  processExtraction(rawExtraction, existingCategories) {
    if (!rawExtraction || !rawExtraction.items) {
      return {
        documentType: 'unknown',
        items: [],
        summary: {},
        warnings: ['No data could be extracted from this document.'],
        monthlyIncome: null,
        familyInfo: null,
        title: 'Unknown Document',
        confidence: 0
      };
    }

    const today = Utils.today();

    // Process each item through CategoryMapper
    const processedItems = rawExtraction.items.map(item => {
      // Step 1: Normalize description
      const normalizedDesc = CategoryMapper.normalizeDescription(item.description);
      const cleanDesc = item.description || normalizedDesc; // Keep original casing for display

      // Step 2: Parse amount
      const amountResult = CategoryMapper.parseAmount(item.amount);

      // Step 3: Deterministic category mapping (AI suggestion is bonus only)
      const catResult = CategoryMapper.mapCategory(
        item.description,
        existingCategories,
        item.suggestedCategoryId || item.suggestedCategoryName || null
      );

      // Step 4: Classify need/want
      const needWantType = item.needWantType ||
        CategoryMapper.classifyNeedWant(catResult.categoryId, item.type || 'expense');

      return {
        rawText: item.rawText || item.description,
        description: cleanDesc,
        amount: amountResult.value,
        type: item.type || 'expense',
        needWantType: needWantType,
        suggestedCategoryName: catResult.categoryName,
        suggestedCategoryId: catResult.categoryId,
        categoryConfidence: catResult.confidence,
        categoryMatchType: catResult.matchType,
        date: item.date || rawExtraction.date || today,
        notes: item.notes || '',
        extractionConfidence: (rawExtraction.confidence || 90) / 100,
        amountWarning: amountResult.warning
      };
    });

    const result = {
      documentType: rawExtraction.documentType || 'unknown',
      title: rawExtraction.title || 'Scanned Document',
      merchant: rawExtraction.merchant || null,
      currency: rawExtraction.currency || 'INR',
      monthlyIncome: rawExtraction.monthlyIncome || null,
      familyInfo: rawExtraction.familyInfo || null,
      summary: rawExtraction.summary || {},
      items: processedItems,
      warnings: [...(rawExtraction.warnings || [])],
      confidence: rawExtraction.confidence || 0
    };

    // Step 5: Validate
    const validation = ExtractionValidator.validate(result);
    result.warnings = [...result.warnings, ...validation.warnings];
    result.itemFlags = validation.itemFlags;
    result.computedTotals = validation.computedTotals;

    return result;
  },

  /**
   * Build a demo extraction for a preset template, fully processed through the pipeline.
   * @param {string} templateKey - One of 'monthly_budget', 'starbucks', 'uber', 'walmart'
   * @returns {object} Fully processed extraction
   */
  buildDemoExtraction(templateKey) {
    const raw = this._demoTemplates[templateKey];
    if (!raw) return null;

    // Deep clone to avoid mutating template
    const clone = JSON.parse(JSON.stringify(raw));

    // Fill in today's date for items without dates
    const today = Utils.today();
    clone.items.forEach(item => {
      if (!item.date) item.date = today;
    });
    if (!clone.date) clone.date = today;

    return this.processExtraction(clone, Store.getCategories());
  },

  /**
   * Process a raw Groq Vision API response through the pipeline.
   * The AI response is treated as RAW INPUT — its category suggestions are
   * overridden by deterministic matching.
   * @param {object} groqJson - Parsed JSON from Groq Vision response
   * @param {Array} existingCategories - From Store.getCategories()
   * @returns {object} Fully processed extraction
   */
  processGroqResponse(groqJson, existingCategories) {
    // Normalize the Groq response into our schema
    let normalized;

    if (groqJson.items && Array.isArray(groqJson.items)) {
      // Multi-item response (budget sheet or multi-item receipt)
      normalized = {
        documentType: groqJson.documentType || (groqJson.isLedger ? 'budget_sheet' : 'receipt'),
        currency: groqJson.currency || 'INR',
        title: groqJson.title || 'Scanned Document',
        merchant: groqJson.merchant || null,
        date: groqJson.date || null,
        monthlyIncome: groqJson.monthlyIncome || groqJson.income || null,
        familyInfo: groqJson.familyInfo || null,
        summary: groqJson.summary || {
          expenseTotal: groqJson.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)
        },
        items: groqJson.items.map(item => ({
          rawText: item.rawText || item.description || '',
          description: item.description || item.rawText || '',
          amount: item.amount,
          type: item.type || 'expense',
          needWantType: item.needWantType || 'unknown',
          suggestedCategoryName: item.suggestedCategoryName || item.category || null,
          suggestedCategoryId: item.suggestedCategoryId || null,
          notes: item.notes || '',
          date: item.date || groqJson.date || null
        })),
        warnings: groqJson.warnings || [],
        confidence: groqJson.confidence || 85
      };
    } else {
      // Single-item response (single receipt)
      normalized = {
        documentType: groqJson.documentType || 'receipt',
        currency: groqJson.currency || 'INR',
        title: groqJson.title || groqJson.description || 'Scanned Receipt',
        merchant: groqJson.merchant || groqJson.description || null,
        date: groqJson.date || null,
        monthlyIncome: null,
        familyInfo: null,
        summary: { total: groqJson.amount || groqJson.total || null },
        items: [{
          rawText: groqJson.description || '',
          description: groqJson.description || '',
          amount: groqJson.amount || groqJson.total || 0,
          type: groqJson.type || 'expense',
          needWantType: 'unknown',
          suggestedCategoryName: groqJson.category || null,
          suggestedCategoryId: null,
          notes: groqJson.notes || '',
          date: groqJson.date || null
        }],
        warnings: groqJson.warnings || [],
        confidence: groqJson.confidence || 85
      };
    }

    // Run through the full pipeline (which will override AI category suggestions with deterministic matches)
    return this.processExtraction(normalized, existingCategories);
  },

  /**
   * Detect whether a file likely contains a budget sheet based on filename.
   * @param {string} filename
   * @returns {boolean}
   */
  isBudgetFile(filename) {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return ['budget', 'monthly', 'ledger', 'household', 'expense sheet', 'kharcha'].some(k => lower.includes(k));
  },

  /**
   * Get available demo template keys.
   * @returns {string[]}
   */
  getTemplateKeys() {
    return Object.keys(this._demoTemplates);
  }
};
