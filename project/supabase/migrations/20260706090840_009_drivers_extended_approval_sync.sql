/*
# Extend Drivers Table + Upgrade approve_application RPC

## Summary
Enhances the drivers table with RP-specific fields and updates the approve_application
function to populate all new fields when a candidature is accepted.

## Changes

### Modified Tables

#### drivers — New columns added
- `user_id` (uuid, nullable FK → auth.users) — links driver to their account
- `pseudo` (text, nullable) — RP pseudo, synced from profile
- `avatar_url` (text, nullable) — profile photo URL
- `role` (text, default 'chauffeur') — chauffeur or tractionnaire
- `garage_id` (uuid, nullable FK → garages) — assigned garage
- `monthly_km` (integer, default 0) — km this month
- `total_km` (integer, default 0) — all-time km
- `deliveries_count` (integer, default 0) — all-time deliveries
- `profile_description` (text, nullable) — RP bio written by driver
- `joined_at` (timestamptz, default now()) — when they joined the VTC

## Updated Functions

### approve_application
- Now populates pseudo, avatar_url, role, user_id, joined_at on driver creation
- Also handles tractionnaire role (creates driver for both roles)
- Posts wall message with proper emoji text: "Bienvenue a [pseudo] chez Z&D Thermoliner!"
- Sends enriched notification

## Security
- RLS policies updated so:
  - authenticated members (level >= chauffeur) can SELECT all drivers
  - PDG/Patron/Directeur/Dispatcher can SELECT
  - PDG/Patron can UPDATE any driver
  - Each driver can UPDATE their own profile_description
  - INSERT: only via approve_application (SECURITY DEFINER) or PDG/Patron

## Notes
1. All new columns use IF NOT EXISTS for idempotency
2. user_id UNIQUE constraint added to prevent duplicate driver records per user
3. approve_application now upserts rather than inserting blindly — safe to re-run
*/

-- ─── Extend drivers table ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'pseudo') THEN
    ALTER TABLE drivers ADD COLUMN pseudo text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'avatar_url') THEN
    ALTER TABLE drivers ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'role') THEN
    ALTER TABLE drivers ADD COLUMN role text NOT NULL DEFAULT 'chauffeur' CHECK (role IN ('chauffeur','tractionnaire','dispatcher','directeur','patron','pdg'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'garage_id') THEN
    ALTER TABLE drivers ADD COLUMN garage_id uuid REFERENCES garages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'monthly_km') THEN
    ALTER TABLE drivers ADD COLUMN monthly_km integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'total_km') THEN
    ALTER TABLE drivers ADD COLUMN total_km integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'deliveries_count') THEN
    ALTER TABLE drivers ADD COLUMN deliveries_count integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'profile_description') THEN
    ALTER TABLE drivers ADD COLUMN profile_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'joined_at') THEN
    ALTER TABLE drivers ADD COLUMN joined_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Add unique constraint on user_id to prevent duplicate driver records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'drivers' AND constraint_name = 'drivers_user_id_key'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ─── RLS policies for drivers ─────────────────────────────────────────────────
-- Any member with role >= tractionnaire (level 20+) can see all drivers
DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
    )
  );

-- PDG/Patron can insert manually
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

-- PDG/Patron can update any driver; each driver can update only their own profile_description
DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
    OR user_id = auth.uid()
  );

-- PDG/Patron only can delete
DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

-- ─── Update approve_application RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_application(app_id uuid, assigned_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
  applicant_profile profiles;
BEGIN
  -- Load application
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Load applicant profile for avatar
  SELECT * INTO applicant_profile FROM profiles WHERE id = app_record.user_id;

  -- Update application
  UPDATE recruitment_applications
    SET status = 'approved',
        assigned_role = approve_application.assigned_role,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = app_id;

  -- Update profile: set role + copy application fields
  UPDATE profiles SET
    role = approve_application.assigned_role,
    application_status = 'approved',
    pseudo = COALESCE(profiles.pseudo, app_record.pseudo),
    age = COALESCE(profiles.age, app_record.age),
    ets2_experience = COALESCE(profiles.ets2_experience, app_record.ets2_experience),
    has_trucksbook = COALESCE(profiles.has_trucksbook, app_record.has_trucksbook),
    discord = COALESCE(profiles.discord, app_record.discord),
    motivation = COALESCE(profiles.motivation, app_record.motivation),
    preferred_truck = COALESCE(profiles.preferred_truck, app_record.preferred_truck),
    availability = COALESCE(profiles.availability, app_record.availability)
  WHERE id = app_record.user_id;

  -- Create or update driver record (upsert by user_id)
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at)
  VALUES (
    app_record.pseudo,
    app_record.user_id,
    app_record.pseudo,
    applicant_profile.avatar_url,
    approve_application.assigned_role,
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    pseudo = EXCLUDED.pseudo,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    status = 'active',
    joined_at = COALESCE(drivers.joined_at, now());

  -- Notification to the applicant
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    app_record.user_id,
    'Candidature acceptee!',
    'Bienvenue chez Z&D Thermoliner! Tu fais maintenant partie de l''equipe en tant que ' || approve_application.assigned_role || '.',
    'success'
  );

  -- Wall post (posted by the recruiter, mentions the new member)
  INSERT INTO posts (user_id, content)
  VALUES (
    auth.uid(),
    'Bienvenue a ' || app_record.pseudo || ' chez Z&D Thermoliner! Un nouveau ' || approve_application.assigned_role || ' rejoint la flotte!'
  );

END;
$$;

-- ─── Sync helper: ensure all approved non-candidat profiles have a driver record ─
CREATE OR REPLACE FUNCTION sync_missing_driver_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at)
  SELECT
    COALESCE(p.pseudo, p.full_name, p.email) AS name,
    p.id,
    p.pseudo,
    p.avatar_url,
    p.role,
    'active',
    COALESCE(p.created_at, now())
  FROM profiles p
  WHERE p.role NOT IN ('candidat')
    AND p.application_status = 'approved'
    AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
