-- ============================================================
-- 016 — Clean simple rebuild: simplified profiles + road_sheets
-- Drop role complexity, keep the existing good tables
-- ============================================================

-- 1. Simplify profiles: drop complex role constraint, add pseudo column if missing
ALTER TABLE profiles
  DROP COLUMN IF EXISTS pseudo,
  DROP COLUMN IF EXISTS age,
  DROP COLUMN IF EXISTS ets2_experience,
  DROP COLUMN IF EXISTS has_trucksbook,
  DROP COLUMN IF EXISTS discord,
  DROP COLUMN IF EXISTS preferred_truck,
  DROP COLUMN IF EXISTS availability,
  DROP COLUMN IF EXISTS motivation,
  DROP COLUMN IF EXISTS application_status,
  DROP COLUMN IF EXISTS is_active;

-- Re-add pseudo as simple column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo text;

-- Drop all existing role-based policies on profiles, replace with simple ones
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Simple profiles policies: see everyone, edit your own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Simplify road_sheets: create clean simple version if it exists with bad schema, else create fresh
-- Check if road_sheets exists and alter it to remove complexity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'road_sheets' AND table_schema = 'public') THEN
    -- Drop all RLS policies on road_sheets
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'road_sheets' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON road_sheets', r.policyname);
      END LOOP;
    END;
    -- Add missing columns if they don't exist
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS departure text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS arrival text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS cargo text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS km integer DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS price_per_km numeric(6,2) DEFAULT 1.80; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS revenue numeric(10,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS delivery_photo_url text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS validated boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_name text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS notes text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  END IF;
END $$;

-- Simple RLS for road_sheets
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'road_sheets' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON road_sheets', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "road_sheets_select" ON road_sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "road_sheets_insert" ON road_sheets FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_user_id OR driver_user_id IS NULL);
CREATE POLICY "road_sheets_update" ON road_sheets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "road_sheets_delete" ON road_sheets FOR DELETE TO authenticated USING (true);

-- 3. Simple transactions policies (everyone sees all company transactions)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'transactions' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (true);

-- 4. Ensure simple RLS for drivers, trucks, garages (already correct in migration 001, just ensure)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename IN ('drivers','trucks','garages') AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, (
      SELECT tablename FROM pg_policies WHERE policyname = r.policyname AND tablename IN ('drivers','trucks','garages') AND schemaname = 'public' LIMIT 1
    ));
  END LOOP;
END $$;

DO $$
BEGIN
  -- drivers
  CREATE POLICY "drivers_select" ON drivers FOR SELECT TO authenticated USING (true);
  CREATE POLICY "drivers_insert" ON drivers FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "drivers_update" ON drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "drivers_delete" ON drivers FOR DELETE TO authenticated USING (true);
  -- trucks
  CREATE POLICY "trucks_select" ON trucks FOR SELECT TO authenticated USING (true);
  CREATE POLICY "trucks_insert" ON trucks FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "trucks_update" ON trucks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "trucks_delete" ON trucks FOR DELETE TO authenticated USING (true);
  -- garages
  CREATE POLICY "garages_select" ON garages FOR SELECT TO authenticated USING (true);
  CREATE POLICY "garages_insert" ON garages FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "garages_update" ON garages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "garages_delete" ON garages FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Update handle_new_user to not set role (simple profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trucks.brand column if not there (some migrations use 'model' for brand+model)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS brand text;
-- Add garages.photo_url column
ALTER TABLE garages ADD COLUMN IF NOT EXISTS photo_url text;
-- Add garages.monthly_rent for reference
ALTER TABLE garages ADD COLUMN IF NOT EXISTS monthly_rent numeric(10,2) DEFAULT 0;
