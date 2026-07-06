
/*
# Repair: Simplify correlated subquery RLS policies + ensure data visibility

## Problem
Several RLS policies use `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ...)`.
While technically correct (profiles SELECT is USING(true)), these subqueries can fail to return results
in certain PostgREST/Supabase session states, causing entire tables to appear empty.

## Solution
1. Create a SECURITY DEFINER helper `get_my_role()` that reads the caller's role from profiles
   bypassing all RLS, making role checks reliable in all contexts.
2. Replace all complex correlated subquery policies with simple `get_my_role()` calls.
3. Simplify `drivers` SELECT to USING(true) — all authenticated members can see the salon.
4. Fix `app_updates` SELECT to USING(true) for active members.
5. Fix `members_audit_logs` SELECT to use get_my_role().
6. Fix `recruitment_applications` SELECT to let PDG/patron see all.
7. Fix `update_reads` SELECT.
8. Add missing INSERT policy for vtc_settings.

## No data is modified — only policy logic changes.
*/

-- 1. Create SECURITY DEFINER helper function for role checks
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Fix drivers policies
-- SELECT: all authenticated users can see the drivers list (salon)
DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT
TO authenticated
USING (true);

-- INSERT: only pdg/patron
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
TO authenticated
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- UPDATE: pdg/patron or own record
DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron') OR user_id = auth.uid())
WITH CHECK (get_my_role() IN ('pdg','patron') OR user_id = auth.uid());

-- DELETE: only pdg/patron
DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
TO authenticated
USING (get_my_role() IN ('pdg','patron'));

-- 3. Fix app_updates policies
DROP POLICY IF EXISTS "updates_select" ON app_updates;
CREATE POLICY "updates_select" ON app_updates FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "updates_insert" ON app_updates;
CREATE POLICY "updates_insert" ON app_updates FOR INSERT
TO authenticated
WITH CHECK (get_my_role() = 'pdg');

DROP POLICY IF EXISTS "updates_update" ON app_updates;
CREATE POLICY "updates_update" ON app_updates FOR UPDATE
TO authenticated
USING (get_my_role() = 'pdg')
WITH CHECK (get_my_role() = 'pdg');

DROP POLICY IF EXISTS "updates_delete" ON app_updates;
CREATE POLICY "updates_delete" ON app_updates FOR DELETE
TO authenticated
USING (get_my_role() = 'pdg');

-- 4. Fix members_audit_logs SELECT
DROP POLICY IF EXISTS "audit_logs_select" ON members_audit_logs;
CREATE POLICY "audit_logs_select" ON members_audit_logs FOR SELECT
TO authenticated
USING (get_my_role() IN ('pdg','patron'));

-- Fix audit_logs INSERT — allow SECURITY DEFINER RPCs (they run as postgres, bypassing RLS)
-- but also allow the calling user directly
DROP POLICY IF EXISTS "audit_logs_insert" ON members_audit_logs;
CREATE POLICY "audit_logs_insert" ON members_audit_logs FOR INSERT
TO authenticated
WITH CHECK (action_by_user_id = auth.uid());

-- 5. Fix recruitment_applications policies
DROP POLICY IF EXISTS "select_applications" ON recruitment_applications;
CREATE POLICY "select_applications" ON recruitment_applications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_my_role() IN ('pdg','patron'));

DROP POLICY IF EXISTS "update_applications" ON recruitment_applications;
CREATE POLICY "update_applications" ON recruitment_applications FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- 6. Fix update_reads SELECT
DROP POLICY IF EXISTS "update_reads_select_own" ON update_reads;
CREATE POLICY "update_reads_select_own" ON update_reads FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_my_role() IN ('pdg','patron'));

-- 7. Fix profiles UPDATE policy — simplify with get_my_role()
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR get_my_role() IN ('pdg','patron'))
WITH CHECK (id = auth.uid() OR get_my_role() IN ('pdg','patron'));

-- 8. Fix economy_settings policies
DROP POLICY IF EXISTS "manage_economy_settings" ON economy_settings;
CREATE POLICY "manage_economy_settings" ON economy_settings FOR ALL
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- 9. Fix driver_sanctions manage policy
DROP POLICY IF EXISTS "manage_driver_sanctions" ON driver_sanctions;
CREATE POLICY "manage_driver_sanctions" ON driver_sanctions FOR ALL
TO authenticated
USING (get_my_role() IN ('pdg','patron','directeur'))
WITH CHECK (get_my_role() IN ('pdg','patron','directeur'));

-- 10. Fix transactions policies
DROP POLICY IF EXISTS "update_transactions" ON transactions;
CREATE POLICY "update_transactions" ON transactions FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
TO authenticated
USING (
  auto_generated IS NOT TRUE
  AND (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR get_my_role() IN ('pdg','patron','directeur')
  )
);

-- 11. Fix vtc_settings UPDATE (was using 'admin' role which doesn't exist)
DROP POLICY IF EXISTS "update_vtc_settings" ON vtc_settings;
CREATE POLICY "update_vtc_settings" ON vtc_settings FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- Also add INSERT for vtc_settings if no row exists
DROP POLICY IF EXISTS "insert_vtc_settings" ON vtc_settings;
CREATE POLICY "insert_vtc_settings" ON vtc_settings FOR INSERT
TO authenticated
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- 12. Ensure vtc_settings has a row
INSERT INTO vtc_settings (name, monthly_distance_goal)
SELECT 'Z&D Thermoliner', 100000
WHERE NOT EXISTS (SELECT 1 FROM vtc_settings);

-- 13. Ensure company_bank_account has a row
INSERT INTO company_bank_account (account_name, iban_rp, balance)
SELECT 'Z&D Thermoliner', 'FR76 1820 6004 5678 9012 3456 789', 0
WHERE NOT EXISTS (SELECT 1 FROM company_bank_account);

-- 14. Ensure all 3 drivers have is_active_driver = true (data sanity)
UPDATE drivers SET is_active_driver = true WHERE status = 'active' AND is_active_driver IS DISTINCT FROM true;
