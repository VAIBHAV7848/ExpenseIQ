/* ========================================
   ExpenseIQ — Category Mapper Service
   Deterministic keyword-based category mapping
   with OCR correction and confidence scoring.
   ======================================== */

const CategoryMapper = {

  // ───── OCR / Handwriting Spelling Corrections ─────
  _ocrFixes: {
    'grocories': 'groceries', 'grocerles': 'groceries', 'groceris': 'groceries',
    'vegtables': 'vegetables', 'vegitables': 'vegetables', 'vegetabels': 'vegetables',
    'frults': 'fruits', 'fruils': 'fruits',
    'egqs': 'eggs', 'eqgs': 'eggs',
    'hause': 'house', 'housr': 'house',
    'elecricity': 'electricity', 'electricty': 'electricity', 'electrlcity': 'electricity', 'elctricity': 'electricity',
    'moblle': 'mobile', 'moble': 'mobile',
    'medlcines': 'medicines', 'mediclnes': 'medicines', 'medecines': 'medicines',
    'transpart': 'transport', 'transprt': 'transport', 'lransport': 'transport',
    'educatlon': 'education', 'educalion': 'education',
    'recharqe': 'recharge', 'rechrage': 'recharge',
    'breakfest': 'breakfast', 'brekfast': 'breakfast',
    'cyllnder': 'cylinder', 'cyllinder': 'cylinder', 'cylnder': 'cylinder',
    'lnternet': 'internet', 'intemet': 'internet',
    'snaks': 'snacks', 'snacs': 'snacks',
    'dalry': 'dairy', 'dairv': 'dairy',
    'wafer': 'water', 'waler': 'water',
    'heallh': 'health', 'healih': 'health',
    'klrana': 'kirana', 'klrana': 'kirana',
    'utlllties': 'utilities', 'utilites': 'utilities',
    'investmenl': 'investment', 'investmant': 'investment',
    'sallary': 'salary', 'salry': 'salary',
    'petral': 'petrol', 'pelrol': 'petrol',
    'dlesel': 'diesel', 'diesal': 'diesel',
    'hospltal': 'hospital', 'hospitel': 'hospital',
    'pharmecy': 'pharmacy', 'pharmcy': 'pharmacy',
    'stalionery': 'stationery', 'statlonery': 'stationery',
    'subscrlption': 'subscription', 'subscrption': 'subscription',
    'entertalnment': 'entertainment', 'entertainmant': 'entertainment',
    'maintenence': 'maintenance', 'maintanance': 'maintenance',
    'broadbnd': 'broadband', 'brodband': 'broadband'
  },

  // ───── Keyword → Category ID Alias Map ─────
  // Each key is a keyword/phrase; value is the category ID it maps to.
  _keywordMap: {
    // ── Food & Dining (cat_food) ──
    'grocery': 'cat_food', 'groceries': 'cat_food', 'staples': 'cat_food',
    'kirana': 'cat_food', 'ration': 'cat_food', 'rice': 'cat_food',
    'wheat': 'cat_food', 'atta': 'cat_food', 'dal': 'cat_food',
    'pulses': 'cat_food', 'oil': 'cat_food', 'sugar': 'cat_food',
    'salt': 'cat_food', 'masala': 'cat_food', 'spices': 'cat_food',
    'vegetables': 'cat_food', 'vegetable': 'cat_food', 'fruits': 'cat_food',
    'fruit': 'cat_food', 'dairy': 'cat_food', 'milk': 'cat_food',
    'curd': 'cat_food', 'paneer': 'cat_food', 'cheese': 'cat_food',
    'eggs': 'cat_food', 'egg': 'cat_food', 'butter': 'cat_food',
    'ghee': 'cat_food', 'bread': 'cat_food',
    'breakfast': 'cat_food', 'snacks': 'cat_food', 'snack': 'cat_food',
    'canteen': 'cat_food', 'mess': 'cat_food', 'tiffin': 'cat_food',
    'lunch': 'cat_food', 'dinner': 'cat_food', 'food': 'cat_food',
    'dining': 'cat_food', 'restaurant': 'cat_food', 'zomato': 'cat_food',
    'swiggy': 'cat_food', 'dominos': 'cat_food', 'pizza': 'cat_food',
    'burger': 'cat_food', 'starbucks': 'cat_food', 'cafe': 'cat_food',
    'coffee': 'cat_food', 'tea': 'cat_food', 'chai': 'cat_food',
    'bakery': 'cat_food', 'biscuit': 'cat_food', 'biscuits': 'cat_food',
    'chips': 'cat_food', 'juice': 'cat_food', 'beverage': 'cat_food',
    'meat': 'cat_food', 'chicken': 'cat_food', 'fish': 'cat_food',
    'mutton': 'cat_food', 'non veg': 'cat_food',

    // ── Rent (cat_rent) ──
    'rent': 'cat_rent', 'house rent': 'cat_rent', 'room rent': 'cat_rent',
    'flat rent': 'cat_rent', 'housing': 'cat_rent', 'pg rent': 'cat_rent',
    'hostel': 'cat_rent', 'accommodation': 'cat_rent',
    'maintenance': 'cat_rent', 'society maintenance': 'cat_rent',

    // ── Bills & Utilities (cat_bills) ──
    'electricity': 'cat_bills', 'electric bill': 'cat_bills', 'light bill': 'cat_bills',
    'power bill': 'cat_bills', 'electricity bill': 'cat_bills',
    'water': 'cat_bills', 'water bill': 'cat_bills',
    'gas': 'cat_bills', 'cylinder': 'cat_bills', 'lpg': 'cat_bills',
    'gas cylinder': 'cat_bills', 'cooking gas': 'cat_bills',
    'internet': 'cat_bills', 'wifi': 'cat_bills', 'broadband': 'cat_bills',
    'mobile recharge': 'cat_bills', 'recharge': 'cat_bills',
    'phone bill': 'cat_bills', 'postpaid': 'cat_bills', 'prepaid': 'cat_bills',
    'mobile': 'cat_bills', 'airtel': 'cat_bills', 'jio': 'cat_bills',
    'bsnl': 'cat_bills', 'vi': 'cat_bills',
    'dth': 'cat_bills', 'tata sky': 'cat_bills', 'dish tv': 'cat_bills',
    'utility': 'cat_bills', 'utilities': 'cat_bills', 'bill': 'cat_bills',

    // ── Transport (cat_transport) ──
    'transport': 'cat_transport', 'transportation': 'cat_transport',
    'bus': 'cat_transport', 'train': 'cat_transport', 'auto': 'cat_transport',
    'auto rickshaw': 'cat_transport', 'rickshaw': 'cat_transport',
    'cab': 'cat_transport', 'taxi': 'cat_transport', 'ola': 'cat_transport',
    'uber': 'cat_transport', 'rapido': 'cat_transport',
    'fuel': 'cat_transport', 'petrol': 'cat_transport', 'diesel': 'cat_transport',
    'metro': 'cat_transport', 'commute': 'cat_transport',
    'parking': 'cat_transport', 'toll': 'cat_transport', 'fastag': 'cat_transport',
    'flight': 'cat_transport', 'airline': 'cat_transport',

    // ── Education (cat_education) ──
    'education': 'cat_education', 'school': 'cat_education', 'college': 'cat_education',
    'tuition': 'cat_education', 'coaching': 'cat_education',
    'books': 'cat_education', 'book': 'cat_education', 'notebook': 'cat_education',
    'exam fee': 'cat_education', 'exam': 'cat_education',
    'kids education': 'cat_education', 'stationery': 'cat_education',
    'course': 'cat_education', 'training': 'cat_education',
    'udemy': 'cat_education', 'coursera': 'cat_education',

    // ── Health (cat_health) ──
    'medicine': 'cat_health', 'medicines': 'cat_health', 'medical': 'cat_health',
    'health': 'cat_health', 'doctor': 'cat_health', 'hospital': 'cat_health',
    'clinic': 'cat_health', 'pharmacy': 'cat_health', 'tablets': 'cat_health',
    'health checkup': 'cat_health', 'checkup': 'cat_health',
    'lab test': 'cat_health', 'diagnostic': 'cat_health',
    'dentist': 'cat_health', 'eye care': 'cat_health',
    'apollo': 'cat_health', 'medplus': 'cat_health',
    'wellness': 'cat_health', 'gym': 'cat_health', 'fitness': 'cat_health',

    // ── Shopping (cat_shopping) ──
    'shopping': 'cat_shopping', 'clothes': 'cat_shopping', 'clothing': 'cat_shopping',
    'footwear': 'cat_shopping', 'shoes': 'cat_shopping',
    'household items': 'cat_shopping', 'utensils': 'cat_shopping',
    'accessories': 'cat_shopping', 'jewellery': 'cat_shopping',
    'amazon': 'cat_shopping', 'flipkart': 'cat_shopping', 'myntra': 'cat_shopping',
    'walmart': 'cat_shopping', 'dmart': 'cat_shopping', 'big bazaar': 'cat_shopping',
    'reliance': 'cat_shopping',
    'electronics': 'cat_shopping', 'gadget': 'cat_shopping',
    'cosmetics': 'cat_shopping', 'beauty': 'cat_shopping',

    // ── Entertainment (cat_entertainment) ──
    'movie': 'cat_entertainment', 'movies': 'cat_entertainment',
    'games': 'cat_entertainment', 'gaming': 'cat_entertainment',
    'outing': 'cat_entertainment', 'party': 'cat_entertainment',
    'ott': 'cat_entertainment', 'streaming': 'cat_entertainment',
    'bookmyshow': 'cat_entertainment', 'concert': 'cat_entertainment',
    'vacation': 'cat_entertainment', 'trip': 'cat_entertainment',
    'travel': 'cat_entertainment', 'picnic': 'cat_entertainment',
    'amusement': 'cat_entertainment',

    // ── Subscriptions (cat_subscriptions) ──
    'subscription': 'cat_subscriptions', 'netflix': 'cat_subscriptions',
    'spotify': 'cat_subscriptions', 'hotstar': 'cat_subscriptions',
    'prime': 'cat_subscriptions', 'membership': 'cat_subscriptions',
    'youtube premium': 'cat_subscriptions',

    // ── Income categories ──
    'salary': 'cat_salary', 'income': 'cat_salary',
    'received': 'cat_salary', 'payment received': 'cat_salary',
    'monthly income': 'cat_salary', 'bonus': 'cat_salary', 'wages': 'cat_salary',
    'freelance': 'cat_freelance', 'freelancing': 'cat_freelance', 'gig': 'cat_freelance',
    'investment': 'cat_investment', 'invest': 'cat_investment',
    'sip': 'cat_investment', 'mutual fund': 'cat_investment',
    'deposit': 'cat_investment', 'fd': 'cat_investment', 'rd': 'cat_investment',
    'savings': 'cat_investment', 'dividend': 'cat_investment', 'interest': 'cat_investment',
    'gift': 'cat_gifts', 'gifts': 'cat_gifts', 'donation received': 'cat_gifts'
  },

  // ───── Need/Want Classification ─────
  _needCategories: new Set([
    'cat_food', 'cat_rent', 'cat_bills', 'cat_transport', 'cat_health'
  ]),

  // ───── Public API ─────

  /**
   * Fix common OCR/handwriting misspellings in a text string.
   * @param {string} text
   * @returns {string}
   */
  fixOcrErrors(text) {
    if (!text) return '';
    let result = text.toLowerCase().trim();
    // Word-level replacements
    const words = result.split(/\s+/);
    const fixed = words.map(w => this._ocrFixes[w] || w);
    return fixed.join(' ');
  },

  /**
   * Normalize a raw description for matching.
   * Lowercases, trims, fixes OCR typos, strips noise punctuation.
   * @param {string} rawText
   * @returns {string}
   */
  normalizeDescription(rawText) {
    if (!rawText) return '';
    let text = String(rawText).toLowerCase().trim();
    // Fix OCR errors
    text = this.fixOcrErrors(text);
    // Remove serial numbers like "1.", "2.", "13."
    text = text.replace(/^\d+[\.\)]\s*/, '');
    // Remove currency symbols and amounts embedded in description
    text = text.replace(/[₹$€£]/g, '');
    // Remove excess punctuation but keep meaningful ones like &, -, ()
    text = text.replace(/[^\w\s&\-\(\)\/]/g, ' ');
    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  },

  /**
   * Parse an amount string into a clean number.
   * Handles ₹, Rs., commas, Indian formats.
   * @param {string|number} raw
   * @returns {{ value: number, confidence: number, warning: string|null }}
   */
  parseAmount(raw) {
    if (typeof raw === 'number' && !isNaN(raw) && raw > 0) {
      return { value: raw, confidence: 1.0, warning: null };
    }
    if (raw == null) {
      return { value: 0, confidence: 0, warning: 'Amount is missing' };
    }

    let str = String(raw).trim();
    // Remove currency symbols
    str = str.replace(/[₹$€£]/g, '').replace(/rs\.?\s*/i, '').trim();
    // Remove commas
    str = str.replace(/,/g, '');
    // Remove trailing period or dash noise
    str = str.replace(/[\.\-]+$/, '');

    const num = parseFloat(str);
    if (isNaN(num) || num < 0) {
      return { value: 0, confidence: 0, warning: `Could not parse amount: "${raw}"` };
    }
    if (num > 10000000) {
      return { value: num, confidence: 0.5, warning: `Unusually large amount: ₹${num.toLocaleString()}` };
    }
    if (num === 0) {
      return { value: 0, confidence: 0.3, warning: 'Amount is zero' };
    }
    return { value: num, confidence: 1.0, warning: null };
  },

  /**
   * Map a description to the best matching category.
   * Uses deterministic keyword matching against actual app categories.
   *
   * @param {string} description - Raw or normalized item description
   * @param {Array} existingCategories - From Store.getCategories()
   * @param {string|null} aiSuggestion - Optional AI-suggested category name/id (bonus weight only)
   * @returns {{ categoryId: string, categoryName: string, confidence: number, matchType: string }}
   */
  mapCategory(description, existingCategories, aiSuggestion = null) {
    const normalized = this.normalizeDescription(description);
    if (!normalized) {
      return this._fallback(existingCategories, 'no-input');
    }

    // Build a set of valid category IDs from the app
    const validIds = new Set(existingCategories.map(c => c.id));
    const catById = {};
    existingCategories.forEach(c => { catById[c.id] = c; });

    // ── Phase 1: Exact multi-word phrase match (highest confidence) ──
    // Sort keywords by length descending so longer phrases match first
    const sortedKeywords = Object.keys(this._keywordMap).sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      const catId = this._keywordMap[keyword];
      if (!validIds.has(catId)) continue;

      // Exact full-text match
      if (normalized === keyword) {
        return {
          categoryId: catId,
          categoryName: catById[catId].name,
          confidence: 0.98,
          matchType: 'exact'
        };
      }
    }

    // ── Phase 2: Phrase-contains-keyword (high confidence) ──
    let bestMatch = null;
    let bestScore = 0;

    for (const keyword of sortedKeywords) {
      const catId = this._keywordMap[keyword];
      if (!validIds.has(catId)) continue;

      if (normalized.includes(keyword)) {
        // Score by keyword length relative to description length
        const score = keyword.length / Math.max(normalized.length, 1);
        const conf = 0.80 + (score * 0.15); // 0.80 – 0.95 range
        if (conf > bestScore) {
          bestScore = conf;
          bestMatch = {
            categoryId: catId,
            categoryName: catById[catId].name,
            confidence: Math.min(conf, 0.96),
            matchType: 'phrase-contains'
          };
        }
      }
    }

    if (bestMatch && bestMatch.confidence >= 0.80) {
      return bestMatch;
    }

    // ── Phase 3: Word-level overlap (medium confidence) ──
    const descWords = normalized.split(/\s+/).filter(w => w.length > 2);

    let wordBest = null;
    let wordBestScore = 0;

    for (const keyword of sortedKeywords) {
      const catId = this._keywordMap[keyword];
      if (!validIds.has(catId)) continue;

      const kwWords = keyword.split(/\s+/);
      let matchCount = 0;
      for (const kw of kwWords) {
        if (descWords.some(dw => dw === kw || dw.includes(kw) || kw.includes(dw))) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        const score = matchCount / kwWords.length;
        if (score > wordBestScore) {
          wordBestScore = score;
          wordBest = {
            categoryId: catId,
            categoryName: catById[catId].name,
            confidence: 0.60 + (score * 0.20),
            matchType: 'word-overlap'
          };
        }
      }
    }

    if (wordBest && wordBest.confidence >= 0.65) {
      return wordBest;
    }

    // ── Phase 4: AI suggestion bonus (if deterministic failed) ──
    if (aiSuggestion) {
      const aiNorm = String(aiSuggestion).toLowerCase().trim();
      // Check if AI suggestion is a valid category ID
      if (validIds.has(aiNorm)) {
        return {
          categoryId: aiNorm,
          categoryName: catById[aiNorm].name,
          confidence: 0.65,
          matchType: 'ai-suggestion'
        };
      }
      // Check if AI suggestion matches a category name
      const aiCat = existingCategories.find(c =>
        c.name.toLowerCase().includes(aiNorm) || aiNorm.includes(c.name.toLowerCase()) ||
        c.id.replace('cat_', '') === aiNorm
      );
      if (aiCat) {
        return {
          categoryId: aiCat.id,
          categoryName: aiCat.name,
          confidence: 0.60,
          matchType: 'ai-suggestion'
        };
      }
    }

    // ── Phase 5: Fallback ──
    return this._fallback(existingCategories, 'no-match');
  },

  /**
   * Classify an item as "needs", "wants", "savings", "income", or "unknown".
   * @param {string} categoryId
   * @param {string} type - "expense" or "income"
   * @returns {string}
   */
  classifyNeedWant(categoryId, type) {
    if (type === 'income') return 'income';
    if (categoryId === 'cat_investment') return 'savings';
    if (this._needCategories.has(categoryId)) return 'needs';
    return 'wants';
  },

  // ───── Internals ─────

  _fallback(existingCategories, reason) {
    const other = existingCategories.find(c => c.id === 'cat_other_exp');
    return {
      categoryId: other ? other.id : (existingCategories[0]?.id || 'cat_other_exp'),
      categoryName: other ? other.name : (existingCategories[0]?.name || 'Other'),
      confidence: 0.30,
      matchType: reason
    };
  }
};
