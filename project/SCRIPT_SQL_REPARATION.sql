-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SCRIPT SQL COMPLET DE REPARATION - Z&D Thermoliner                        ║
-- ║  Date: 2026-07-06                                                          ║
-- ║  A executer dans Supabase SQL Editor (Dashboard > SQL Editor)              ║
-- ║  Ce script est idempotent : il peut etre execute plusieurs fois sans risque║
-- ║  AUCUNE donnee n'est supprimee (comptes, feuilles de route, publications,  ║
-- ║  economie, statistiques sont tous conserves)                                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CORRECTION DU CONSTRAINT profiles_role_check
--    Bug: 'ancien_membre' et 'banni' n'etaient pas dans la liste autorisee.
--    Consequence: leave_company(), fire_member(), ban_member() echouaient tous.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat', 'ancien_membre', 'banni'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CORRECTION DU CONSTRAINT profiles_application_status_check
--    Inclut tous les statuts possibles.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_application_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_application_status_check
  CHECK (application_status IN ('none', 'pending', 'approved', 'rejected', 'left', 'fired', 'banned'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CORRECTION RLS profiles SELECT
--    Bug: L'ancienne policy "select_own_profile" (USING auth.uid() = id)
--    empechait les utilisateurs de voir les profils des autres.
--    Consequence: mur sans noms, page admin vide, salon chauffeurs sans pseudos.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. CORRECTION RLS profiles UPDATE
--    Permet: utilisateur modifie son propre profil OU PDG/Patron modifie tout.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('pdg','patron')))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('pdg','patron')));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. NETTOYAGE DES POLICIES DUPLIQUEES SUR drivers
--    Bug: Les anciennes policies (migration 001) avec USING(true)
--    conflictaient avec les nouvelles (migration 009).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Supprimer les anciennes policies ouvertes
DROP POLICY IF EXISTS "select_drivers" ON drivers;
DROP POLICY IF EXISTS "insert_drivers" ON drivers;
DROP POLICY IF EXISTS "update_drivers" ON drivers;
DROP POLICY IF EXISTS "delete_drivers" ON drivers;

-- Recreer les policies correctes
DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
    )
  );

DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

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

DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. AJOUT COLONNE is_active SUR profiles (si absente)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. AJOUT COLONNE is_active_driver SUR drivers (si absente)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_active_driver') THEN
    ALTER TABLE drivers ADD COLUMN is_active_driver boolean NOT NULL DEFAULT true;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. NORMALISATION DES DONNEES EXISTANTES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 8a. is_active correct pour tous les profils
UPDATE profiles SET is_active = false WHERE role IN ('banni', 'ancien_membre');
UPDATE profiles SET is_active = true WHERE role NOT IN ('banni', 'ancien_membre') AND (is_active IS NULL OR is_active = false);

-- 8b. application_status pour les membres actifs sans statut valide
UPDATE profiles
SET application_status = 'approved'
WHERE role NOT IN ('candidat', 'banni', 'ancien_membre')
  AND (application_status IS NULL OR application_status NOT IN ('none','pending','approved','rejected','left','fired','banned'));

-- 8c. Candidats sans statut
UPDATE profiles
SET application_status = 'none'
WHERE role = 'candidat'
  AND (application_status IS NULL OR application_status NOT IN ('none','pending','approved','rejected','left','fired','banned'));

-- 8d. Remplir pseudo depuis full_name si null
UPDATE profiles SET pseudo = full_name WHERE pseudo IS NULL AND full_name IS NOT NULL AND full_name <> '';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. SUPPRESSION DES FICHES DRIVERS ORPHELINES (user_id IS NULL)
-- ═══════════════════════════════════════════════════════════════════════════════

DELETE FROM drivers WHERE user_id IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. CREATION DES FICHES DRIVERS MANQUANTES
--     Pour tous les membres actifs sans fiche driver.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Contrainte unique sur user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'drivers' AND constraint_name = 'drivers_user_id_key'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Creer les fiches manquantes
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. SYNCHRONISATION DRIVERS <-> PROFILES
--     Met a jour pseudo, avatar, role, is_active_driver depuis profiles.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sync pseudo/name/avatar/role
UPDATE drivers d
SET
  name = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1), d.name),
  pseudo = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  avatar_url = COALESCE(p.avatar_url, d.avatar_url),
  role = CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
              THEN p.role ELSE d.role END
FROM profiles p
WHERE d.user_id = p.id;

-- Activer les drivers des membres actifs
UPDATE drivers d
SET is_active_driver = true, status = 'active'
FROM profiles p
WHERE d.user_id = p.id
  AND p.role NOT IN ('candidat', 'banni', 'ancien_membre')
  AND p.is_active = true
  AND d.is_active_driver = false;

-- Desactiver les drivers des membres bloques
UPDATE drivers d
SET is_active_driver = false, status = 'inactive'
FROM profiles p
WHERE d.user_id = p.id
  AND p.role IN ('banni', 'ancien_membre');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. FONCTION sync_missing_driver_records()
--     Utilisee par le frontend pour auto-creer les fiches manquantes.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_missing_driver_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
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
    AND p.is_active = true
    AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. FONCTION leave_company()
--     Depart volontaire d'un membre.
-- ═══════════════════════════════════════════════════════════════════════════════

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

  UPDATE profiles SET
    role = 'ancien_membre',
    application_status = 'left',
    is_active = false
  WHERE id = auth.uid();

  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = auth.uid();

  INSERT INTO notifications (user_id, title, message, type)
  SELECT id, 'Depart membre',
    COALESCE(caller_profile.pseudo, caller_profile.full_name, caller_profile.email) || ' a quitte l''entreprise.',
    'info'
  FROM profiles WHERE role = 'pdg';

  INSERT INTO posts (user_id, content)
  VALUES (auth.uid(), COALESCE(caller_profile.pseudo, caller_profile.full_name, 'Un membre') || ' a quitte Z&D Thermoliner.');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (auth.uid(), auth.uid(), 'left_company', reason, caller_profile.role, 'ancien_membre');
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. FONCTION fire_member()
--     Licenciement par PDG/Patron.
-- ═══════════════════════════════════════════════════════════════════════════════

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
  VALUES (fire_member.target_user_id, 'Licenciement', 'Vous avez ete licencie de Z&D Thermoliner.', 'error');

  INSERT INTO posts (user_id, content)
  VALUES (auth.uid(), COALESCE(target_profile.pseudo, target_profile.full_name, 'Un membre') || ' ne fait plus partie de Z&D Thermoliner.');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (fire_member.target_user_id, auth.uid(), 'fired', reason, target_profile.role, 'ancien_membre');
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. FONCTION ban_member()
--     Bannissement par PDG uniquement.
-- ═══════════════════════════════════════════════════════════════════════════════

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
  VALUES (ban_member.target_user_id, 'Bannissement', 'Votre acces a Z&D Thermoliner a ete suspendu.', 'error');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (ban_member.target_user_id, auth.uid(), 'banned', reason, target_profile.role, 'banni');
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. FONCTION remove_from_drivers()
--     Retirer du salon sans supprimer le compte.
-- ═══════════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 17. FONCTION restore_member()
--     Restauration par PDG uniquement.
-- ═══════════════════════════════════════════════════════════════════════════════

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

  -- Create driver record if missing after restore
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at, is_active_driver)
  VALUES (
    COALESCE(NULLIF(target_profile.pseudo,''), NULLIF(target_profile.full_name,''), split_part(target_profile.email,'@',1)),
    restore_member.target_user_id,
    COALESCE(NULLIF(target_profile.pseudo,''), NULLIF(target_profile.full_name,''), split_part(target_profile.email,'@',1)),
    target_profile.avatar_url,
    restore_member.restore_role,
    'active',
    COALESCE(target_profile.created_at, now()),
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    is_active_driver = true,
    role = restore_member.restore_role;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (restore_member.target_user_id, 'Compte restaure', 'Votre acces a Z&D Thermoliner a ete restaure.', 'success');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (restore_member.target_user_id, auth.uid(), 'restored', NULL, target_profile.role, restore_member.restore_role);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 18. FONCTION approve_application()
--     Acceptation de candidature avec creation automatique driver.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION approve_application(app_id uuid, assigned_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
  applicant_profile profiles;
BEGIN
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO applicant_profile FROM profiles WHERE id = app_record.user_id;

  UPDATE recruitment_applications
    SET status = 'approved',
        assigned_role = approve_application.assigned_role,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = app_id;

  UPDATE profiles SET
    role = approve_application.assigned_role,
    application_status = 'approved',
    is_active = true,
    pseudo = COALESCE(profiles.pseudo, app_record.pseudo),
    age = COALESCE(profiles.age, app_record.age),
    ets2_experience = COALESCE(profiles.ets2_experience, app_record.ets2_experience),
    has_trucksbook = COALESCE(profiles.has_trucksbook, app_record.has_trucksbook),
    discord = COALESCE(profiles.discord, app_record.discord),
    motivation = COALESCE(profiles.motivation, app_record.motivation),
    preferred_truck = COALESCE(profiles.preferred_truck, app_record.preferred_truck),
    availability = COALESCE(profiles.availability, app_record.availability)
  WHERE id = app_record.user_id;

  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at, is_active_driver)
  VALUES (
    app_record.pseudo,
    app_record.user_id,
    app_record.pseudo,
    applicant_profile.avatar_url,
    approve_application.assigned_role,
    'active',
    now(),
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    pseudo = EXCLUDED.pseudo,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    status = 'active',
    is_active_driver = true,
    joined_at = COALESCE(drivers.joined_at, now());

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    app_record.user_id,
    'Candidature acceptee!',
    'Bienvenue chez Z&D Thermoliner! Tu fais maintenant partie de l''equipe en tant que ' || approve_application.assigned_role || '.',
    'success'
  );

  INSERT INTO posts (user_id, content)
  VALUES (
    auth.uid(),
    'Bienvenue a ' || app_record.pseudo || ' chez Z&D Thermoliner! Un nouveau ' || approve_application.assigned_role || ' rejoint la flotte!'
  );
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 19. POLICY NOTIFICATIONS (permet PDG d'inserer pour d'autres users)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 20. TABLE members_audit_logs (si absente)
-- ═══════════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 21. INDEX POUR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, application_status);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active_driver ON drivers(is_active_driver);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id_active ON drivers(user_id, is_active_driver);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON members_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON members_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 22. VERIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  profiles_count integer;
  drivers_count integer;
  active_drivers integer;
BEGIN
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  SELECT COUNT(*) INTO drivers_count FROM drivers;
  SELECT COUNT(*) INTO active_drivers FROM drivers WHERE is_active_driver = true;

  RAISE NOTICE '=== REPARATION TERMINEE ===';
  RAISE NOTICE 'Profiles: % | Drivers: % | Actifs: %', profiles_count, drivers_count, active_drivers;
  RAISE NOTICE 'Tous les contraints OK, RLS repare, fonctions recrees.';
END $$;
