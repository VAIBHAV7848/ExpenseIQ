-- Drop existing RLS policies just in case we need to rerun
DROP POLICY IF EXISTS "Enable read/write for users based on user_id" ON "public"."transactions";
DROP POLICY IF EXISTS "Enable read/write for users based on user_id" ON "public"."budgets";
DROP POLICY IF EXISTS "Enable read/write for users based on user_id" ON "public"."categories";

-- Add user_id column
ALTER TABLE "public"."transactions" ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE "public"."budgets"      ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE "public"."categories"   ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Force RLS on tables
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."budgets"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."categories"   ENABLE ROW LEVEL SECURITY;

-- Transactions Policy
CREATE POLICY "Enable read/write for users based on user_id" ON "public"."transactions"
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Budgets Policy
CREATE POLICY "Enable read/write for users based on user_id" ON "public"."budgets"
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Categories Policy: Users can read default categories OR their own categories
CREATE POLICY "Enable read/write for users based on user_id" ON "public"."categories"
FOR ALL TO authenticated
USING (auth.uid() = user_id OR "isDefault" = true)
WITH CHECK (auth.uid() = user_id);
