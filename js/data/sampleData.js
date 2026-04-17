/* ========================================
   ExpenseIQ — Sample / Demo Data
   ======================================== */

const SAMPLE_TRANSACTIONS = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const gen = (type, cat, amount, desc, daysAgo) => ({
    id: 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    type, category: cat, amount, description: desc,
    date: Utils.toDateString(new Date(y, m, now.getDate() - daysAgo)),
    createdAt: new Date(y, m, now.getDate() - daysAgo).toISOString()
  });
  return [
    gen('income', 'cat_salary', 65000, 'Monthly Salary', 25),
    gen('income', 'cat_freelance', 15000, 'Web design project', 20),
    gen('income', 'cat_investment', 3200, 'Mutual Fund Dividend', 18),
    gen('income', 'cat_gifts', 5000, 'Birthday Gift', 12),
    gen('income', 'cat_freelance', 8000, 'SEO Consulting', 8),
    gen('expense', 'cat_rent', 15000, 'Monthly Rent', 26),
    gen('expense', 'cat_bills', 3500, 'Electricity Bill', 24),
    gen('expense', 'cat_bills', 1200, 'WiFi Subscription', 24),
    gen('expense', 'cat_food', 850, 'Grocery Store', 23),
    gen('expense', 'cat_food', 420, 'Zomato Order', 22),
    gen('expense', 'cat_transport', 2500, 'Petrol', 21),
    gen('expense', 'cat_food', 650, 'Restaurant Dinner', 20),
    gen('expense', 'cat_shopping', 3200, 'Amazon - Headphones', 19),
    gen('expense', 'cat_subscriptions', 199, 'Spotify Premium', 18),
    gen('expense', 'cat_health', 1500, 'Doctor Visit', 17),
    gen('expense', 'cat_food', 380, 'Swiggy Order', 16),
    gen('expense', 'cat_entertainment', 600, 'Movie Tickets', 15),
    gen('expense', 'cat_transport', 450, 'Uber Rides', 14),
    gen('expense', 'cat_food', 720, 'Weekly Groceries', 13),
    gen('expense', 'cat_education', 2000, 'Udemy Course', 12),
    gen('expense', 'cat_bills', 800, 'Mobile Recharge', 11),
    gen('expense', 'cat_food', 550, 'Pizza Hut', 10),
    gen('expense', 'cat_shopping', 4500, 'Myntra - Clothes', 9),
    gen('expense', 'cat_transport', 350, 'Metro Card', 8),
    gen('expense', 'cat_food', 280, 'Street Food', 7),
    gen('expense', 'cat_entertainment', 1200, 'Concert Ticket', 6),
    gen('expense', 'cat_health', 750, 'Pharmacy', 5),
    gen('expense', 'cat_food', 950, 'Grocery Run', 4),
    gen('expense', 'cat_transport', 600, 'Ola Cabs', 3),
    gen('expense', 'cat_subscriptions', 649, 'Netflix', 3),
    gen('expense', 'cat_food', 180, 'Tea & Snacks', 2),
    gen('expense', 'cat_shopping', 2800, 'Electronics Store', 1),
    gen('expense', 'cat_food', 520, 'Dominos', 0),
    gen('expense', 'cat_transport', 200, 'Auto Rickshaw', 0),
    gen('income', 'cat_other_inc', 2000, 'Referral Bonus', 5),
    gen('expense', 'cat_bills', 2100, 'Gas Bill', 15),
    gen('expense', 'cat_entertainment', 350, 'YouTube Premium', 10),
    gen('expense', 'cat_education', 1500, 'Book Purchase', 7),
    gen('expense', 'cat_food', 1100, 'Birthday Party', 3),
    gen('expense', 'cat_other_exp', 500, 'Miscellaneous', 1),
    gen('income', 'cat_salary', 65000, 'Monthly Salary (prev)', 55),
    gen('expense', 'cat_rent', 15000, 'Monthly Rent (prev)', 56),
    gen('expense', 'cat_food', 780, 'Grocery', 50),
    gen('expense', 'cat_transport', 1800, 'Petrol', 48),
    gen('expense', 'cat_bills', 3200, 'Electricity', 45),
    gen('expense', 'cat_shopping', 6500, 'Flipkart Sale', 42),
    gen('expense', 'cat_entertainment', 1500, 'Gaming', 40),
    gen('expense', 'cat_health', 3000, 'Dentist', 38),
    gen('expense', 'cat_food', 620, 'Cafe Visit', 35),
    gen('expense', 'cat_subscriptions', 299, 'iCloud Storage', 33)
  ];
})();

const SAMPLE_BUDGETS = (() => {
  const now = new Date();
  const month = Utils.toMonthString(now);
  return [{
    id: 'demo_budget_1', month,
    totalBudget: 40000, total_budget: 40000,
    categoryBudgets: {
      'cat_food': 8000, 'cat_transport': 4000, 'cat_shopping': 6000,
      'cat_bills': 5000, 'cat_entertainment': 3000, 'cat_health': 3000,
      'cat_education': 3000, 'cat_subscriptions': 2000, 'cat_other_exp': 2000
    },
    category_budgets: {
      'cat_food': 8000, 'cat_transport': 4000, 'cat_shopping': 6000,
      'cat_bills': 5000, 'cat_entertainment': 3000, 'cat_health': 3000,
      'cat_education': 3000, 'cat_subscriptions': 2000, 'cat_other_exp': 2000
    }
  }];
})();
