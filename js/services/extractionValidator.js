/* ========================================
   ExpenseIQ — Extraction Validator Service
   Cross-checks totals, flags issues, adds warnings.
   ======================================== */

const ExtractionValidator = {

  /**
   * Validate a fully processed extraction result.
   * @param {object} extraction - The normalized extraction from ScannerService
   *   { documentType, items[], summary, monthlyIncome, ... }
   * @returns {{ isValid: boolean, warnings: string[], itemFlags: Map<index, string[]> }}
   */
  validate(extraction) {
    const warnings = [];
    const itemFlags = new Map(); // index → array of flag strings

    if (!extraction || !extraction.items || extraction.items.length === 0) {
      return { isValid: false, warnings: ['No items were extracted from the document.'], itemFlags };
    }

    // ── Row-level validation ──
    extraction.items.forEach((item, i) => {
      const flags = [];

      if (!item.amount || item.amount <= 0) {
        flags.push('Missing or zero amount');
      }
      if (!item.description || item.description.trim().length < 2) {
        flags.push('Missing description');
      }
      if (item.categoryConfidence < 0.65) {
        flags.push('Low category confidence — review suggested category');
      }
      if (item.extractionConfidence < 0.70) {
        flags.push('Low extraction confidence');
      }
      if (item.amountWarning) {
        flags.push(item.amountWarning);
      }

      if (flags.length > 0) {
        itemFlags.set(i, flags);
      }
    });

    // ── Date validation ──
    const hasDate = extraction.items.some(it => it.date && it.date !== Utils.today());
    if (!hasDate && extraction.items.length > 0) {
      warnings.push("No date was detected. Today's date will be used unless edited.");
    }

    // ── Total validation ──
    const computedExpenseTotal = extraction.items
      .filter(it => it.type === 'expense')
      .reduce((sum, it) => sum + (it.amount || 0), 0);

    const computedIncomeTotal = extraction.items
      .filter(it => it.type === 'income')
      .reduce((sum, it) => sum + (it.amount || 0), 0);

    // Budget sheet specific
    if (extraction.documentType === 'budget_sheet') {
      // Check expense total vs declared total
      if (extraction.summary && extraction.summary.expenseTotal) {
        const declared = extraction.summary.expenseTotal;
        const diff = Math.abs(computedExpenseTotal - declared);
        if (diff > 1) {
          warnings.push(
            `Extracted item total (₹${computedExpenseTotal.toLocaleString()}) ` +
            `differs from written total (₹${declared.toLocaleString()}) by ₹${diff.toLocaleString()}.`
          );
        }
      }

      // Check needs/wants subtotals
      if (extraction.summary && extraction.summary.needsTotal) {
        const computedNeeds = extraction.items
          .filter(it => it.needWantType === 'needs')
          .reduce((sum, it) => sum + (it.amount || 0), 0);
        const diff = Math.abs(computedNeeds - extraction.summary.needsTotal);
        if (diff > 1) {
          warnings.push(
            `Needs subtotal mismatch: computed ₹${computedNeeds.toLocaleString()} vs written ₹${extraction.summary.needsTotal.toLocaleString()}.`
          );
        }
      }

      if (extraction.summary && extraction.summary.wantsTotal) {
        const computedWants = extraction.items
          .filter(it => it.needWantType === 'wants')
          .reduce((sum, it) => sum + (it.amount || 0), 0);
        const diff = Math.abs(computedWants - extraction.summary.wantsTotal);
        if (diff > 1) {
          warnings.push(
            `Wants subtotal mismatch: computed ₹${computedWants.toLocaleString()} vs written ₹${extraction.summary.wantsTotal.toLocaleString()}.`
          );
        }
      }

      // Income vs expense deficit check
      if (extraction.monthlyIncome && extraction.monthlyIncome > 0) {
        const deficit = computedExpenseTotal - extraction.monthlyIncome;
        if (deficit > 0) {
          warnings.push(`Expenses exceed income by ₹${deficit.toLocaleString()}.`);
        }
      }
    }

    // Receipt specific
    if (extraction.documentType === 'receipt' || extraction.documentType === 'bill' || extraction.documentType === 'invoice') {
      if (extraction.summary && extraction.summary.total) {
        const declared = extraction.summary.total;
        const diff = Math.abs(computedExpenseTotal - declared);
        // Allow small rounding/tax differences
        if (diff > 5 && diff > declared * 0.05) {
          warnings.push(
            `Item sum (₹${computedExpenseTotal.toLocaleString()}) differs from receipt total (₹${declared.toLocaleString()}). Please verify.`
          );
        }
      }
    }

    // Low confidence rows warning
    const lowConfCount = extraction.items.filter(it => it.categoryConfidence < 0.65).length;
    if (lowConfCount > 0) {
      warnings.push(`${lowConfCount} item(s) have low category confidence and may need review.`);
    }

    return {
      isValid: warnings.length === 0 && itemFlags.size === 0,
      warnings,
      itemFlags,
      computedTotals: {
        expense: computedExpenseTotal,
        income: computedIncomeTotal,
        needs: extraction.items.filter(it => it.needWantType === 'needs').reduce((s, it) => s + (it.amount || 0), 0),
        wants: extraction.items.filter(it => it.needWantType === 'wants').reduce((s, it) => s + (it.amount || 0), 0)
      }
    };
  }
};
