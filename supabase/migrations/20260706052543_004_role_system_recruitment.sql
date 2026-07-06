/*
# Z&D Thermoliner Role System and Recruitment

Step 1: Create role definitions and helper functions
Step 2: Add new columns to profiles
Step 3: Create recruitment_applications table
*/

-- Role definitions table
CREATE TABLE IF NOT EXISTS vtc_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  level integer NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vtc_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_vtc_roles" ON vtc_roles;
CREATE POLICY "select_vtc_roles" ON vtc_roles FOR SELECT
  TO authenticated USING (true);

-- Insert role definitions
INSERT INTO vtc_roles (name, display_name, level, description, permissions) VALUES
('pdg', 'PDG', 100, 'President Directeur General - Acces total', '{"all": true, "manage_roles": true, "manage_pdg": true}'),
('patron', 'Patron', 90, 'Patron - Administration sauf changement PDG', '{"all": true, "manage_roles": true, "manage_pdg": false}'),
('directeur', 'Directeur', 70, 'Directeur - Gestion chauffeurs, flotte, feuilles de route', '{"manage_drivers": true, "manage_fleet": true, "manage_road_sheets": true, "manage_garages": true}'),
('dispatcher', 'Dispatcher', 50, 'Dispatcher - Feuilles de route, planning, missions', '{"manage_road_sheets": true, "view_fleet": true, "assign_missions": true}'),
('chauffeur', 'Chauffeur', 30, 'Chauffeur - Mur, profil, feuilles de route personnelles', '{"wall": true, "profile": true, "own_road_sheets": true, "view_fleet": true, "chat": true}'),
('tractionnaire', 'Tractionnaire', 20, 'Tractionnaire - Profil, camion personnel', '{"profile": true, "own_road_sheets": true, "own_truck": true}'),
('candidat', 'Candidat', 10, 'Candidat - Acces uniquement Nous rejoindre', '{"join_page": true}')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  level = EXCLUDED.level,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- Add new fields to profiles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pseudo') THEN
    ALTER TABLE profiles ADD COLUMN pseudo text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
    ALTER TABLE profiles ADD COLUMN age integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ets2_experience') THEN
    ALTER TABLE profiles ADD COLUMN ets2_experience text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'has_trucksbook') THEN
    ALTER TABLE profiles ADD COLUMN has_trucksbook boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'discord') THEN
    ALTER TABLE profiles ADD COLUMN discord text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_truck') THEN
    ALTER TABLE profiles ADD COLUMN preferred_truck text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'availability') THEN
    ALTER TABLE profiles ADD COLUMN availability text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'motivation') THEN
    ALTER TABLE profiles ADD COLUMN motivation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'application_status') THEN
    ALTER TABLE profiles ADD COLUMN application_status text DEFAULT 'approved' CHECK (application_status IN ('none', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Recruitment applications table
DROP TABLE IF EXISTS recruitment_applications CASCADE;
CREATE TABLE recruitment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  pseudo text NOT NULL,
  email text NOT NULL,
  age integer NOT NULL,
  ets2_experience text NOT NULL,
  has_trucksbook boolean DEFAULT false,
  trucksbook_profile text,
  discord text NOT NULL,
  motivation text NOT NULL,
  preferred_truck text,
  availability text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  assigned_role text DEFAULT 'chauffeur' CHECK (assigned_role IN ('chauffeur', 'tractionnaire')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recruitment_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_applications" ON recruitment_applications;
CREATE POLICY "select_applications" ON recruitment_applications FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')
  ));

DROP POLICY IF EXISTS "insert_applications" ON recruitment_applications;
CREATE POLICY "insert_applications" ON recruitment_applications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_applications" ON recruitment_applications;
CREATE POLICY "update_applications" ON recruitment_applications FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')
  ));

-- Get role level function
CREATE OR REPLACE FUNCTION get_role_level(check_user_id uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT vr.level FROM profiles p JOIN vtc_roles vr ON vr.name = p.role WHERE p.id = check_user_id),
    10
  );
$$;

-- Approve application function
CREATE OR REPLACE FUNCTION approve_application(app_id uuid, assigned_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
BEGIN
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF app_record IS NULL THEN RETURN; END IF;
  
  UPDATE recruitment_applications SET status = 'approved', assigned_role = approve_application.assigned_role, reviewed_at = now() WHERE id = app_id;
  UPDATE profiles SET role = approve_application.assigned_role, application_status = 'approved', pseudo = app_record.pseudo, age = app_record.age, ets2_experience = app_record.ets2_experience, has_trucksbook = app_record.has_trucksbook, discord = app_record.discord, motivation = app_record.motivation, preferred_truck = app_record.preferred_truck, availability = app_record.availability WHERE id = app_record.user_id;
  INSERT INTO notifications (user_id, title, message, type) VALUES (app_record.user_id, 'Candidature acceptee!', 'Bienvenue chez Z&D Thermoliner!', 'success');
  INSERT INTO posts (user_id, content) VALUES (app_record.user_id, 'Bienvenue a ' || app_record.pseudo || ' chez Z&D Thermoliner!');
  IF approve_application.assigned_role = 'chauffeur' THEN INSERT INTO drivers (name, user_id, status) VALUES (app_record.pseudo, app_record.user_id, 'active') ON CONFLICT DO NOTHING; END IF;
END;
$$;

-- Reject application function
CREATE OR REPLACE FUNCTION reject_application(app_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
BEGIN
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF app_record IS NULL THEN RETURN; END IF;
  UPDATE recruitment_applications SET status = 'rejected', reviewed_at = now() WHERE id = app_id;
  UPDATE profiles SET application_status = 'rejected' WHERE id = app_record.user_id;
  INSERT INTO notifications (user_id, title, message, type) VALUES (app_record.user_id, 'Candidature refusee', 'Votre candidature n''a pas ete acceptee.', 'error');
END;
$$;

-- Update handle_new_user for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, application_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'candidat', 'none');
  RETURN NEW;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_status ON recruitment_applications(status);