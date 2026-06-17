-- Lumé Haus — lock app_data to authenticated users only
-- Run in Supabase SQL Editor: supabase.com → project → SQL Editor → paste → Run
--
-- This replaces the original "allow all" policy (which let anyone read/write)
-- with a policy that requires a valid Supabase Auth session.

-- 1. Drop the old permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON app_data;

-- 2. Create authenticated-only policy (covers SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "authenticated_only" ON app_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS is already enabled on app_data from the original setup SQL.
-- If you're starting fresh, also run:
--   ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
