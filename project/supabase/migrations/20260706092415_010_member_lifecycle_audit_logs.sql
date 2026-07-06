/*
# Member Lifecycle Management: Departure, Firing, Banning, Restoration

## Summary
Adds full member lifecycle management: voluntary departure, firing, banning, and restoration.
Includes audit log table and SECURITY DEFINER functions callable by authorized roles.

## Changes

### New Tables
#### members_audit_logs
- Tracks every moderation action: left_company, fired, banned, removed_from_drivers, restored
- Stores old/new role, reason, and who performed the action

### Modified Tables
#### profiles
- `application_status` CHECK extended to include: 'left', 'fired', 'banned'
- `is_active` boolean column added (false = banned/departed, blocks access)

#### drivers
- `is_active_driver` boolean column added (false = removed from active salon)

### New Functions
- `leave_company(reason text)` — member calls this on themselves
- `fire_member(target_user_id uuid, reason text)` — PDG/Patron fires a member
- `ban_member(target_user_id uuid, reason text)` — PDG only
- `remove_from_drivers(target_driver_id uuid)` — PDG/Patron removes from active list
- `restore_member(target_user_id uuid, restore_role text)` — PDG restores former/banned member

## Security
- leave_company: any authenticated non-candidat, non-banni, acts on own account only
- fire_member: PDG or Patron only
- ban_member: PDG only
- remove_from_drivers: PDG or Patron only
- restore_member: PDG only
- audit_logs: SELECT for PDG/Patron, INSERT via SECURITY DEFINER functions only
*/

-- ─── Extend profiles: add application_status values and is_active ─────────────
DO $$
BEGIN
  -- Drop and recreate the check constraint to include new statuses
  -- (PostgreSQL requires drop/recreate for CHECK constraints on existing columns)
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_application_status_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_application_status_check
    CHECK (application_status IN ('none', 'pending', 'approved', 'rejected', 'left', 'fired', 'banned'));

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Mark existing non-candidat profiles as active (safe default)
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- ─── Extend drivers: is_active_driver ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_active_driver') THEN
    ALTER TABLE drivers ADD COLUMN is_active_driver boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ─── members_audit_logs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members_audit_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_by_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type      text NOT NULL CHECK (action_type IN ('left_company','fired','banned','removed_from_drivers','restored')),
  reason           text,
  old_role         text,
  new_role         text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE members_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON members_audit_logs;
CREATE POLICY "audit_logs_select" ON members_audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

DROP POLICY IF EXISTS "audit_logs_insert" ON members_audit_logs;
CREATE POLICY "audit_logs_insert" ON members_audit_logs FOR INSERT
  TO authenticated WITH CHECK (action_by_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON members_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON members_audit_logs(created_at DESC);

-- ─── leave_company ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION leave_company(reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF caller_profile.role IN ('candidat','banni') THEN
    RAISE EXCEPTION 'Cannot leave company: restricted role';
  END IF;

  -- Deactivate profile
  UPDATE profiles SET
    role = 'ancien_membre',
    application_status = 'left',
    is_active = false
  WHERE id = auth.uid();

  -- Deactivate driver record
  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = auth.uid();

  -- Notify PDG
  INSERT INTO notifications (user_id, title, message, type)
  SELECT id, 'Depart membre',
    COALESCE(caller_profile.pseudo, caller_profile.full_name, caller_profile.email) || ' a quitté l''entreprise.',
    'info'
  FROM profiles WHERE role = 'pdg';

  -- Wall post
  INSERT INTO posts (user_id, content)
  VALUES (auth.uid(), COALESCE(caller_profile.pseudo, caller_profile.full_name, 'Un membre') || ' a quitté Z&D Thermoliner.');

  -- Audit log
  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (auth.uid(), auth.uid(), 'left_company', reason, caller_profile.role, 'ancien_membre');
END;
$$;

-- ─── fire_member ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fire_member(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role NOT IN ('pdg','patron') THEN
    RAISE EXCEPTION 'Insufficient permissions to fire members';
  END IF;

  SELECT * INTO target_profile FROM profiles WHERE id = fire_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user not found'; END IF;

  -- Patron cannot fire PDG
  IF caller_profile.role = 'patron' AND target_profile.role = 'pdg' THEN
    RAISE EXCEPTION 'Patron cannot fire PDG';
  END IF;

  UPDATE profiles SET
    role = 'ancien_membre',
    application_status = 'fired',
    is_active = false
  WHERE id = fire_member.target_user_id;

  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = fire_member.target_user_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (fire_member.target_user_id, 'Licenciement', 'Vous avez été licencié de Z&D Thermoliner.', 'error');

  INSERT INTO posts (user_id, content)
  VALUES (auth.uid(), COALESCE(target_profile.pseudo, target_profile.full_name, 'Un membre') || ' ne fait plus partie de Z&D Thermoliner.');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (fire_member.target_user_id, auth.uid(), 'fired', reason, target_profile.role, 'ancien_membre');
END;
$$;

-- ─── ban_member ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ban_member(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role <> 'pdg' THEN
    RAISE EXCEPTION 'Only PDG can ban members';
  END IF;

  SELECT * INTO target_profile FROM profiles WHERE id = ban_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user not found'; END IF;

  UPDATE profiles SET
    role = 'banni',
    application_status = 'banned',
    is_active = false
  WHERE id = ban_member.target_user_id;

  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = ban_member.target_user_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (ban_member.target_user_id, 'Bannissement', 'Votre accès à Z&D Thermoliner a été suspendu.', 'error');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (ban_member.target_user_id, auth.uid(), 'banned', reason, target_profile.role, 'banni');
END;
$$;

-- ─── remove_from_drivers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION remove_from_drivers(target_driver_id uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_driver drivers;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role NOT IN ('pdg','patron') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO target_driver FROM drivers WHERE id = target_driver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver not found'; END IF;

  UPDATE drivers SET is_active_driver = false WHERE id = target_driver_id;

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (
    COALESCE(target_driver.user_id, auth.uid()),
    auth.uid(),
    'removed_from_drivers',
    reason,
    NULL,
    NULL
  );
END;
$$;

-- ─── restore_member ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION restore_member(target_user_id uuid, restore_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role <> 'pdg' THEN
    RAISE EXCEPTION 'Only PDG can restore members';
  END IF;

  SELECT * INTO target_profile FROM profiles WHERE id = restore_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user not found'; END IF;

  UPDATE profiles SET
    role = restore_member.restore_role,
    application_status = 'approved',
    is_active = true
  WHERE id = restore_member.target_user_id;

  UPDATE drivers SET status = 'active', is_active_driver = true
  WHERE user_id = restore_member.target_user_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (restore_member.target_user_id, 'Compte restauré', 'Votre accès à Z&D Thermoliner a été restauré.', 'success');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (restore_member.target_user_id, auth.uid(), 'restored', NULL, target_profile.role, restore_member.restore_role);
END;
$$;

-- ─── Update RLS on profiles ───────────────────────────────────────────────────
-- Blocked users (banni/ancien_membre) can still read their own profile (for the blocked screen)
-- but no INSERT/UPDATE themselves on role-related fields
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('pdg','patron')))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('pdg','patron')));
