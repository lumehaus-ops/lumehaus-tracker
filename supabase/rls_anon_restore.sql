-- Lumé Haus — restore public anon access to app_data
-- Run in Supabase SQL Editor: supabase.com → project → SQL Editor → paste → Run
--
-- The app now uses lh4:creds username/password login instead of Supabase Auth.
-- Without a Supabase Auth JWT, all REST calls go as the anon role.
-- This policy allows the anon role to read and write app_data.

-- 1. Drop the authenticated-only policy (if it exists)
DROP POLICY IF EXISTS "authenticated_only" ON app_data;

-- 2. Restore the original public policy
CREATE POLICY "Allow all operations" ON app_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
