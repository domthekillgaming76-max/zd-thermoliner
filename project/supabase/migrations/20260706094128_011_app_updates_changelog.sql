/*
# App Updates System

## Summary
Adds the global update/changelog system for Z&D Thermoliner.
PDG can publish versioned updates visible to all members.
Each member's read status is tracked individually.

## New Tables

### app_updates
Stores all update posts with version, type, status, and content.
- `id` (uuid, PK)
- `title` (text) — short headline
- `description` (text) — full changelog / body
- `version` (text) — e.g. "v1.1.0"
- `update_type` (text) — nouveaute / correction / maintenance / annonce
- `status` (text) — brouillon / publiee
- `created_by` (uuid FK → auth.users)
- `published_at` (timestamptz, nullable) — set when status → publiee
- `created_at` / `updated_at` (timestamptz)

### update_reads
Tracks which members have acknowledged each update.
- `id` (uuid, PK)
- `update_id` (uuid FK → app_updates)
- `user_id` (uuid FK → auth.users)
- `read_at` (timestamptz)
- UNIQUE (update_id, user_id) — one record per member per update

## Security
- app_updates SELECT: authenticated members (level >= tractionnaire, excludes banni/candidat)
- app_updates INSERT/UPDATE/DELETE: PDG only
- update_reads SELECT: user can read their own rows; PDG/Patron can read all
- update_reads INSERT: any authenticated user (marking own as read)
*/

-- ─── app_updates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text NOT NULL,
  version     text NOT NULL DEFAULT 'v1.0.0',
  update_type text NOT NULL DEFAULT 'nouveaute'
              CHECK (update_type IN ('nouveaute','correction','maintenance','annonce')),
  status      text NOT NULL DEFAULT 'brouillon'
              CHECK (status IN ('brouillon','publiee')),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "updates_select" ON app_updates;
CREATE POLICY "updates_select" ON app_updates FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role NOT IN ('candidat','banni','ancien_membre')
    )
  );

DROP POLICY IF EXISTS "updates_insert" ON app_updates;
CREATE POLICY "updates_insert" ON app_updates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg')
  );

DROP POLICY IF EXISTS "updates_update" ON app_updates;
CREATE POLICY "updates_update" ON app_updates FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg'));

DROP POLICY IF EXISTS "updates_delete" ON app_updates;
CREATE POLICY "updates_delete" ON app_updates FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg')
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_app_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'publiee' AND OLD.status = 'brouillon' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_updates_updated_at ON app_updates;
CREATE TRIGGER trg_app_updates_updated_at
  BEFORE UPDATE ON app_updates
  FOR EACH ROW EXECUTE FUNCTION set_app_update_updated_at();

-- ─── update_reads ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS update_reads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id   uuid NOT NULL REFERENCES app_updates(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (update_id, user_id)
);

ALTER TABLE update_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "update_reads_select_own" ON update_reads;
CREATE POLICY "update_reads_select_own" ON update_reads FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

DROP POLICY IF EXISTS "update_reads_insert" ON update_reads;
CREATE POLICY "update_reads_insert" ON update_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ─── Helper: publish update + notify all members ─────────────────────────────
CREATE OR REPLACE FUNCTION publish_update(update_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  upd app_updates;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role <> 'pdg' THEN
    RAISE EXCEPTION 'Only PDG can publish updates';
  END IF;

  SELECT * INTO upd FROM app_updates WHERE id = publish_update.update_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Update not found'; END IF;

  -- Mark as published
  UPDATE app_updates
    SET status = 'publiee', published_at = now(), updated_at = now()
    WHERE id = publish_update.update_id;

  -- Notify all active members (role not in candidat/banni/ancien_membre)
  INSERT INTO notifications (user_id, title, message, type)
  SELECT
    id,
    'Mise à jour ' || upd.version,
    upd.title,
    'info'
  FROM profiles
  WHERE role NOT IN ('candidat','banni','ancien_membre')
    AND id <> auth.uid();

END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_updates_status ON app_updates(status);
CREATE INDEX IF NOT EXISTS idx_app_updates_published ON app_updates(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_reads_user ON update_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_update_reads_update ON update_reads(update_id);
