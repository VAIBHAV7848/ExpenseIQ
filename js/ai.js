/* ========================================
   ExpenseIQ — AI Integration (Groq API)
   Model: llama3-8b-8192
   All AI features degrade gracefully
   ======================================== */

const AI = {
  _insightCache: {},

  isAvailable() {
    if (!window.CONFIG || !CONFIG.GROQ_API_KEY ||
        CONFIG.GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') return false;
    return true;
  },

  async _call(systemPrompt, userMessage, maxTokens = 500) {
    if (!this.isAvailable()) return null;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + CONFIG.GROQ_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
      if (!response.ok) throw new Error('Groq API ' + response.status);
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI call failed:', error);
      return null;
    }
  },

  async parseTransaction(text) {
    if (!text || !text.trim()) return null;
    const categories = Store.getCategories()
      .map(c => c.name + ' (id: ' + c.id + ')')
      .join(', ');
    const today = Utils.today();
    const result = await this._call(
      'You are a financial data extractor. Extract transaction details from natural language. ' +
      'Available categories: ' + categories + '. ' +
      'Return ONLY a valid JSON object with keys: type (income or expense), amount (positive number), ' +
      'categoryId (must match one of the provided ids), description (short string), date (YYYY-MM-DD). ' +
      'If date unclear use today: ' + today + '. If type unclear default to expense. ' +
      'Never include any text outside the JSON object.',
      text,
      300
    );
    if (!result) return null;
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  },

  async suggestCategory(description, type) {
    if (!description || !description.trim()) return null;
    const categories = Store.getCategories(type)
      .map(c => c.name + ' (id: ' + c.id + ')')
      .join(', ');
    const result = await this._call(
      'You are a transaction categorizer. Return ONLY the category id that best matches ' +
      'the transaction description. Available ' + type + ' categories: ' + categories + '. ' +
      'Reply with ONLY the id string, nothing else.',
      description,
      50
    );
    return result ? result.trim().replace(/['"]/g, '') : null;
  },

  async getFinancialAdvice(userMessage, conversationHistory = []) {
    const month = Utils.toMonthString(new Date());
    const totals = Store.getTotals(month);
    const byCat = Store.getByCategory(month);
    const topCat = Object.entries(byCat)
      .sort((a, b) => b[1].expense - a[1].expense)[0];
    const topCatName = topCat ?
      (Store.getCategory(topCat[0])?.name || 'Unknown') : 'None';
    const savingsRate = Utils.percentage(totals.balance, totals.income);
    const budgetStatus = Store.getBudgetStatus(month);

    const systemPrompt = 'You are ExpenseIQ AI financial advisor. ' +
      'User financial snapshot: ' +
      'Balance: ₹' + totals.balance + ', ' +
      'Monthly Income: ₹' + totals.income + ', ' +
      'Monthly Expense: ₹' + totals.expense + ', ' +
      'Top spending category: ' + topCatName + ', ' +
      'Savings rate: ' + savingsRate + '%, ' +
      'Budget status: ' + (budgetStatus ? budgetStatus.totalPct + '% of budget used' : 'no budget set') + '. ' +
      'Give concise, practical, personalized advice. Be friendly. ' +
      'Keep responses under 80 words. Use INR (₹) and Indian financial context.';

    let history = conversationHistory.slice(-15);
    
    // Assemble raw messages
    const rawMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    // LLaMA API requires: 1. System first. 2. First non-system must be User. 3. Strictly alternating roles.
    const messages = [rawMessages[0]]; // Always starts with system
    
    for (let i = 1; i < rawMessages.length; i++) {
      const msg = rawMessages[i];
      // Skip empty or invalid messages
      if (!msg.content || !msg.content.trim()) continue;
      
      const lastMsg = messages[messages.length - 1];
      
      if (lastMsg.role === 'system' && msg.role !== 'user') {
        // First message after system MUST be user (skip if assistant)
        continue;
      }
      
      if (msg.role === lastMsg.role) {
        // Consecutive same-role messages are combined to prevent 400 errors
        if (msg.content !== lastMsg.content) {
          lastMsg.content += '\\n' + msg.content;
        }
      } else {
        messages.push(msg);
      }
    }

    if (!this.isAvailable()) return null;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + CONFIG.GROQ_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'llama3-8b-8192', max_tokens: 200, messages })
      });
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch { return null; }
  },

  async suggestBudget() {
    const now = new Date();
    const prevMonth = Utils.toMonthString(new Date(now.getFullYear(), now.getMonth() - 1));
    const prevPrevMonth = Utils.toMonthString(new Date(now.getFullYear(), now.getMonth() - 2));
    const cats = Store.getCategories('expense');
    const spending = {};

    cats.forEach(cat => {
      const m1 = Store.getByCategory(prevMonth)[cat.id]?.expense || 0;
      const m2 = Store.getByCategory(prevPrevMonth)[cat.id]?.expense || 0;
      const avg = (m1 + m2) / 2;
      if (avg > 0) spending[cat.id] = Math.round(avg);
    });

    if (Object.keys(spending).length === 0) return null;

    const result = await this._call(
      'You are a budget advisor. Based on average monthly spending, suggest realistic budgets. ' +
      'Apply 20% reduction to the highest spending category, 10% to others. ' +
      'Return ONLY a JSON object where keys are category ids and values are suggested INR amounts (whole numbers). ' +
      'No text outside the JSON.',
      'Spending history: ' + JSON.stringify(spending),
      400
    );
    if (!result) return null;
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  },

  async getSmartInsights() {
    const monthKey = Utils.toMonthString(new Date());
    if (this._insightCache[monthKey]) return this._insightCache[monthKey];

    const totals = Store.getTotals(monthKey);
    const prevMonth = Utils.toMonthString(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    const prevTotals = Store.getTotals(prevMonth);
    const byCat = Store.getByCategory(monthKey);
    const topCat = Object.entries(byCat)
      .sort((a, b) => b[1].expense - a[1].expense)[0];
    const topCatName = topCat ?
      (Store.getCategory(topCat[0])?.name || 'Other') : 'None';
    const expenseChange = Utils.calcTrend(totals.expense, prevTotals.expense);

    const result = await this._call(
      'You are a financial analyst. Give exactly 2 insights as a JSON array of strings. ' +
      'Be specific with numbers. No generic advice. Max 20 words per insight. ' +
      'Return ONLY valid JSON array of 2 strings.',
      'Income: ₹' + totals.income + ', Expense: ₹' + totals.expense +
      ', Top category: ' + topCatName + ' (₹' + (topCat?.[1]?.expense || 0) + ')' +
      ', Savings: ' + Utils.percentage(totals.balance, totals.income) + '%' +
      ', vs last month expenses: ' + (expenseChange.direction === 'up' ? '+' : '-') +
      expenseChange.pct + '%',
      200
    );

    if (!result) return null;
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      const insights = JSON.parse(clean);
      this._insightCache[monthKey] = insights;
      return insights;
    } catch { return null; }
  }
};
