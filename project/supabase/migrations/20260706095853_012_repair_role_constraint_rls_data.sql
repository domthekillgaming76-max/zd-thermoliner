/*
# REPAIR MIGRATION — Z&D Thermoliner

## Critical fixes applied:

### 1. profiles_role_check constraint
Migration 005 created a role CHECK that excluded 'ancien_membre' and 'banni'.
All leave_company(), fire_member(), ban_member() RPCs were failing with a constraint
violation when trying to set role = 'ancien_membre' or role = 'banni'.
Fix: drop and recreate with all valid roles.

### 2. profiles SELECT RLS
Migration 001 created select_own_profile (USING auth.uid() = id).
This was never updated, so:
- WallPage cannot see other users' profile names (null → "Utilisateur")
- AdminPage cannot list members
- All cross-user profile joins return null
Fix: replace with USING (true) so all authenticated users can read all profiles.

### 3. Data normalization
- is_active: set true for active roles, false for banni/ancien_membre
- Missing driver records created for all active members
- Driver records synced with latest profile data (pseudo, avatar_url, role)
- is_active_driver set correctly

### 4. sync_missing_driver_records() updated
Extended to pick up all active members (not just approved application_status).

## Tables modified
- profiles: role CHECK, SELECT RLS, is_active values
- drivers: is_active_driver values, pseudo/avatar/role sync, missing records created

## Safety
- No data deleted
- All operations use IF NOT EXISTS / ON CONFLICT DO NOTHING
- Idempotent: safe to re-run
*/

-- ── 1. Fix profiles_role_check to include ancien_membre and banni ─────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat', 'ancien_membre', 'banni'));

-- ── 2. Fix profiles SELECT RLS ────────────────────────────────────────────────
-- Allow all authenticated users to read all profiles (needed for wall, admin, etc.)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);

-- ── 3. Normalize is_active on profiles ───────────────────────────────────────
UPDATE profiles
  SET is_active = false
  WHERE role IN ('banni', 'ancien_membre');

UPDATE profiles
  SET is_active = true
  WHERE role NOT IN ('banni', 'ancien_membre')
    AND (is_active IS NULL OR is_active = false);

-- ── 4. Normalize application_status for active members ───────────────────────
-- Some profiles created before migration 004 may have NULL or non-conforming values
UPDATE profiles
  SET application_status = 'approved'
  WHERE role NOT IN ('candidat', 'banni', 'ancien_membre')
    AND (
      application_status IS NULL
      OR application_status NOT IN ('none','pending','approved','rejected','left','fired','banned')
    );

-- Candidats with null status get 'none'
UPDATE profiles
  SET application_status = 'none'
  WHERE role = 'candidat'
    AND (
      application_status IS NULL
      OR application_status NOT IN ('none','pending','approved','rejected','left','fired','banned')
    );

-- ── 5. Create missing driver records for all active members ──────────────────
INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at, is_active_driver)
SELECT
  COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)) AS name,
  p.id,
  COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  p.avatar_url,
  CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
       THEN p.role ELSE 'chauffeur' END,
  'active',
  COALESCE(p.created_at, now()),
  true
FROM profiles p
WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre')
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- ── 6. Sync existing driver records with latest profile data ─────────────────
UPDATE drivers d
SET
  name = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1), d.name),
  pseudo = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  avatar_url = COALESCE(p.avatar_url, d.avatar_url),
  role = CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
              THEN p.role ELSE d.role END
FROM profiles p
WHERE d.user_id = p.id
  AND p.role NOT IN ('candidat', 'banni', 'ancien_membre');

-- ── 7. Ensure is_active_driver is true for active members ────────────────────
UPDATE drivers d
SET is_active_driver = true, status = 'active'
FROM profiles p
WHERE d.user_id = p.id
  AND p.role NOT IN ('candidat', 'banni', 'ancien_membre')
  AND p.is_active = true
  AND d.is_active_driver = false;

-- ── 8. Ensure is_active_driver is false for blocked members ──────────────────
UPDATE drivers d
SET is_active_driver = false, status = 'inactive'
FROM profiles p
WHERE d.user_id = p.id
  AND p.role IN ('banni', 'ancien_membre');

-- ── 9. Update sync_missing_driver_records() ──────────────────────────────────
CREATE OR REPLACE FUNCTION sync_missing_driver_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Create missing driver records for all active members
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at, is_active_driver)
  SELECT
    COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)) AS name,
    p.id,
    COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
    p.avatar_url,
    CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
         THEN p.role ELSE 'chauffeur' END,
    'active',
    COALESCE(p.created_at, now()),
    true
  FROM profiles p
  WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre')
    AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active_driver ON drivers(is_active_driver);
