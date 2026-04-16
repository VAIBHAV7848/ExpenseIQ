-- ========================================
-- ExpenseIQ — Supabase Database Schema
-- ========================================
-- Run this entire script in your Supabase SQL Editor to create the necessary tables.

-- 1. Create Categories Table
CREATE TABLE public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' or 'expense'
    "isDefault" BOOLEAN DEFAULT false
);

-- 2. Create Transactions Table
CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'income' or 'expense'
    category TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Budgets Table
CREATE TABLE public.budgets (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL UNIQUE, -- format: 'YYYY-MM'
    "totalBudget" NUMERIC NOT NULL,
    "categoryBudgets" JSONB -- stores { "cat_id": limit_amount, ... }
);

-- 4. Create Settings Table (Optional, for global settings if needed, though usually kept in localStorage per device)
CREATE TABLE public.settings (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    payload JSONB NOT NULL
);

-- 5. Turn Off Row Level Security (RLS) for Lab Testing
-- WARNING: This makes your database publicly readable/writable by anyone with the Anon Key.
-- This is acceptable for a university lab project / portfolio piece without Auth.
-- Do NOT do this for a real production app.
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- 6. Insert Default Categories (Supabase SQL)
INSERT INTO public.categories (id, name, icon, color, type, "isDefault") VALUES
('cat_food', 'Food & Dining', 'utensils', '#f97316', 'expense', true),
('cat_transport', 'Transport', 'car', '#3b82f6', 'expense', true),
('cat_shopping', 'Shopping', 'shopping-bag', '#ec4899', 'expense', true),
('cat_bills', 'Bills & Utilities', 'receipt', '#f59e0b', 'expense', true),
('cat_entertainment', 'Entertainment', 'gamepad-2', '#8b5cf6', 'expense', true),
('cat_health', 'Health', 'heart-pulse', '#10b981', 'expense', true),
('cat_education', 'Education', 'graduation-cap', '#06b6d4', 'expense', true),
('cat_rent', 'Rent', 'home', '#ef4444', 'expense', true),
('cat_subscriptions', 'Subscriptions', 'repeat', '#6366f1', 'expense', true),
('cat_other_exp', 'Other', 'more-horizontal', '#64748b', 'expense', true),
('cat_salary', 'Salary', 'banknote', '#10b981', 'income', true),
('cat_freelance', 'Freelance', 'laptop', '#14b8a6', 'income', true),
('cat_investment', 'Investments', 'trending-up', '#f59e0b', 'income', true),
('cat_gifts', 'Gifts', 'gift', '#ec4899', 'income', true),
('cat_other_inc', 'Other Income', 'more-horizontal', '#64748b', 'income', true)
ON CONFLICT (id) DO NOTHING;
