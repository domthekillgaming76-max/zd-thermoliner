-- Step 1: Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Fix any rows with old role values
UPDATE profiles SET role = 'pdg' WHERE role = 'admin';
UPDATE profiles SET role = 'directeur' WHERE role = 'manager';
UPDATE profiles SET role = 'chauffeur' WHERE role = 'driver';
-- Set 'candidat' for any null or unknown roles
UPDATE profiles SET role = 'candidat', application_status = 'none' WHERE role IS NULL OR role NOT IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat');

-- Step 3: Add the new constraint with full role list
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat'));

-- Step 4: Set the PDG account (replace email if needed)
UPDATE profiles
SET role = 'pdg', application_status = 'approved'
WHERE email = 'domthekillgaming76@gmail.com';