-- ========================================
-- ExpenseIQ — Complete Supabase Database Schema
-- ========================================
-- Run this entire script fresh in your Supabase SQL Editor.
-- This will create all tables, enable RLS, create policies, triggers, and indexes.

-- ============== DROP EXISTING (for fresh start) ==============
DROP TABLE IF EXISTS public.sync_conflicts CASCADE;
DROP TABLE IF EXISTS public.recurring_templates CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP FUNCTION IF EXISTS update_last_modified CASCADE;

-- ============== TABLES ==============

-- 1. Categories
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  is_default BOOLEAN DEFAULT false,
  version BIGINT DEFAULT 1 NOT NULL,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict')),
  device_id TEXT NOT NULL DEFAULT 'unknown',
  conflict_resolution_strategy TEXT DEFAULT 'last-write-wins'
);

-- 2. Transactions
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  split_group_id TEXT DEFAULT NULL,
  recurring_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version BIGINT DEFAULT 1 NOT NULL,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict')),
  device_id TEXT NOT NULL DEFAULT 'unknown',
  conflict_resolution_strategy TEXT DEFAULT 'last-write-wins'
);

-- 3. Budgets
CREATE TABLE public.budgets (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  total_budget NUMERIC NOT NULL,
  category_budgets JSONB DEFAULT '{}',
  version BIGINT DEFAULT 1 NOT NULL,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict')),
  device_id TEXT NOT NULL DEFAULT 'unknown',
  conflict_resolution_strategy TEXT DEFAULT 'last-write-wins',
  UNIQUE (user_id, month)
);

-- 4. Savings Goals
CREATE TABLE public.goals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC DEFAULT 0,
  deadline DATE NOT NULL,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version BIGINT DEFAULT 1 NOT NULL,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict')),
  device_id TEXT NOT NULL DEFAULT 'unknown',
  conflict_resolution_strategy TEXT DEFAULT 'last-write-wins'
);

-- 5. Debts
CREATE TABLE public.debts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  original_amount NUMERIC NOT NULL CHECK (original_amount > 0),
  remaining_amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  type TEXT NOT NULL CHECK (type IN ('owe','lend')),
  settled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version BIGINT DEFAULT 1 NOT NULL,
  last_modified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NULL,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict')),
  device_id TEXT NOT NULL DEFAULT 'unknown',
  conflict_resolution_strategy TEXT DEFAULT 'last-write-wins'
);

-- 6. Recurring Templates
CREATE TABLE public.recurring_templates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  next_due DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sync Conflicts Log
CREATE TABLE public.sync_conflicts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  local_version JSONB NOT NULL,
  remote_version JSONB NOT NULL,
  resolution_strategy TEXT NOT NULL,
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  resolved_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== ENABLE RLS ON ALL TABLES ==============
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

-- ============== RLS POLICIES ==============
CREATE POLICY "user_own_rows_transactions" ON public.transactions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_rows_categories" ON public.categories
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_rows_budgets" ON public.budgets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_rows_goals" ON public.goals
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_rows_debts" ON public.debts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_rows_recurring_templates" ON public.recurring_templates
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_rows_sync_conflicts" ON public.sync_conflicts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============== AUTO-UPDATE TRIGGER ==============
CREATE OR REPLACE FUNCTION update_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all main tables
CREATE TRIGGER transactions_modified_trigger
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_last_modified();

CREATE TRIGGER categories_modified_trigger
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_last_modified();

CREATE TRIGGER budgets_modified_trigger
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_last_modified();

CREATE TRIGGER goals_modified_trigger
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_last_modified();

CREATE TRIGGER debts_modified_trigger
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_last_modified();

-- ============== PERFORMANCE INDEXES ==============
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_category ON public.transactions (user_id, category);
CREATE INDEX idx_transactions_last_modified ON public.transactions (user_id, last_modified_at DESC);
CREATE INDEX idx_budgets_user_month ON public.budgets (user_id, month);
CREATE INDEX idx_goals_user ON public.goals (user_id);
CREATE INDEX idx_debts_user ON public.debts (user_id);

-- ============== DEFAULT CATEGORIES ==============
-- Note: user_id is NULL for system defaults — RLS policy allows reading these
INSERT INTO public.categories (id, user_id, name, icon, color, type, is_default, device_id)
VALUES
  ('cat_food', NULL, 'Food & Dining', 'utensils', '#f97316', 'expense', true, 'system'),
  ('cat_transport', NULL, 'Transport', 'car', '#3b82f6', 'expense', true, 'system'),
  ('cat_shopping', NULL, 'Shopping', 'shopping-bag', '#ec4899', 'expense', true, 'system'),
  ('cat_bills', NULL, 'Bills & Utilities', 'receipt', '#f59e0b', 'expense', true, 'system'),
  ('cat_entertainment', NULL, 'Entertainment', 'gamepad-2', '#8b5cf6', 'expense', true, 'system'),
  ('cat_health', NULL, 'Health', 'heart-pulse', '#10b981', 'expense', true, 'system'),
  ('cat_education', NULL, 'Education', 'graduation-cap', '#06b6d4', 'expense', true, 'system'),
  ('cat_rent', NULL, 'Rent', 'home', '#ef4444', 'expense', true, 'system'),
  ('cat_subscriptions', NULL, 'Subscriptions', 'repeat', '#6366f1', 'expense', true, 'system'),
  ('cat_other_exp', NULL, 'Other', 'more-horizontal', '#64748b', 'expense', true, 'system'),
  ('cat_salary', NULL, 'Salary', 'banknote', '#10b981', 'income', true, 'system'),
  ('cat_freelance', NULL, 'Freelance', 'laptop', '#14b8a6', 'income', true, 'system'),
  ('cat_investment', NULL, 'Investments', 'trending-up', '#f59e0b', 'income', true, 'system'),
  ('cat_gifts', NULL, 'Gifts', 'gift', '#ec4899', 'income', true, 'system'),
  ('cat_other_inc', NULL, 'Other Income', 'more-horizontal', '#64748b', 'income', true, 'system')
ON CONFLICT (id) DO NOTHING;

-- ============== ENABLE REALTIME ==============
-- Run these in Supabase Dashboard > Database > Replication
-- Or uncomment below if using SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE categories;
-- ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
-- ALTER PUBLICATION supabase_realtime ADD TABLE goals;
-- ALTER PUBLICATION supabase_realtime ADD TABLE debts;
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   P u s h   S u b s c r i p t i o n s  
 - -   S t o r e s   W e b   P u s h   b r o w s e r   e n d p o i n t s   u n i q u e l y   t i e d   t o   u s e r s  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . p u s h _ s u b s c r i p t i o n s   (  
         i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
         u s e r _ i d   U U I D   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E   N O T   N U L L ,  
         e n d p o i n t   T E X T   N O T   N U L L ,  
         p 2 5 6 d h _ k e y   T E X T   N O T   N U L L ,  
         a u t h _ k e y   T E X T   N O T   N U L L ,  
         c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   N O T   N U L L ,  
         U N I Q U E ( e n d p o i n t )  
 ) ;  
  
 A L T E R   T A B L E   p u b l i c . p u s h _ s u b s c r i p t i o n s   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   i n s e r t   t h e i r   o w n   s u b s c r i p t i o n s "  
         O N   p u b l i c . p u s h _ s u b s c r i p t i o n s   F O R   I N S E R T  
         W I T H   C H E C K   ( a u t h . u i d ( )   =   u s e r _ i d ) ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   v i e w   t h e i r   o w n   s u b s c r i p t i o n s "  
         O N   p u b l i c . p u s h _ s u b s c r i p t i o n s   F O R   S E L E C T  
         U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d ) ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   d e l e t e   t h e i r   o w n   s u b s c r i p t i o n s "  
         O N   p u b l i c . p u s h _ s u b s c r i p t i o n s   F O R   D E L E T E  
         U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d ) ;  
 