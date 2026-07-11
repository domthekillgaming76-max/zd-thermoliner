-- 077 — Refonte rôles : visiteur / chauffeur / admin + table room_permissions

-- 1. Migrer les profils vers les 3 rôles officiels
UPDATE public.profiles SET role = 'admin'
WHERE lower(role) IN (
  'admin', 'administrator', 'administrateur', 'owner', 'superadmin',
  'pdg', 'patron', 'proprietaire', 'propriétaire'
);

UPDATE public.profiles SET role = 'chauffeur'
WHERE lower(role) IN (
  'chauffeur', 'driver', 'conducteur', 'member', 'membre',
  'flotte', 'dispatcher', 'directeur', 'fleet_manager', 'manager',
  'tractionnaire', 'responsable', 'moderateur', 'modérateur',
  'comptable', 'accountant', 'hr', 'rh'
);

UPDATE public.profiles SET role = 'visiteur'
WHERE lower(role) IN (
  'visiteur', 'visitor', 'invité', 'invite', 'guest', 'candidat',
  'recruit', 'recruitment', 'recruteur', 'recrue'
);

UPDATE public.profiles SET role = 'chauffeur'
WHERE role NOT IN ('admin', 'chauffeur', 'visiteur', 'ancien_membre', 'banni')
  AND role IS NOT NULL;

-- 2. Contrainte profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'chauffeur', 'visiteur', 'ancien_membre', 'banni'));

-- 3. is_erp_admin
CREATE OR REPLACE FUNCTION public.is_erp_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND (role = 'admin' OR public.is_dom76_owner(email))
  );
$$;

-- 4. Table room_permissions
CREATE TABLE IF NOT EXISTS public.room_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key text NOT NULL UNIQUE,
  room_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'ERP',
  icon text NOT NULL DEFAULT 'HelpCircle',
  color text NOT NULL DEFAULT '#64748b',
  route text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  visible_to_roles text[] NOT NULL DEFAULT ARRAY['admin']::text[],
  admin_critical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_permissions_sort ON public.room_permissions (category, sort_order);
CREATE INDEX IF NOT EXISTS idx_room_permissions_enabled ON public.room_permissions (enabled);

ALTER TABLE public.room_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_permissions_select" ON public.room_permissions;
CREATE POLICY "room_permissions_select" ON public.room_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "room_permissions_write" ON public.room_permissions;
CREATE POLICY "room_permissions_write" ON public.room_permissions
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- 5. Seed salons (idempotent)
INSERT INTO public.room_permissions (
  room_key, room_name, description, category, icon, color, route,
  sort_order, enabled, visible_to_roles, admin_critical
) VALUES
  ('wall', 'Mur société', 'Fil d''actualité de l''entreprise', 'Communauté', 'MessageSquare', '#3b82f6', '/wall', 10, true, ARRAY['visiteur','chauffeur','admin'], false),
  ('profile', 'Profil', 'Mon profil et personnalisation', 'Compte', 'User', '#8b5cf6', '/profile', 10, true, ARRAY['visiteur','chauffeur','admin'], true),
  ('settings', 'Paramètres', 'Préférences du compte', 'Compte', 'Settings', '#64748b', '/settings', 20, true, ARRAY['visiteur','chauffeur','admin'], true),
  ('updates', 'À propos', 'Mises à jour et informations', 'Communauté', 'Bell', '#06b6d4', '/updates', 20, true, ARRAY['visiteur','chauffeur','admin'], false),
  ('dashboard', 'Tableau de bord', 'Vue d''ensemble ERP', 'ERP', 'LayoutDashboard', '#ef4444', '/dashboard', 10, true, ARRAY['visiteur','chauffeur','admin'], false),
  ('driver_portal', 'Portail chauffeur', 'Espace mobile chauffeur', 'ERP', 'Smartphone', '#f97316', '/driver', 220, true, ARRAY['chauffeur','admin'], false),
  ('freight_market', 'Marché Fret', 'Offres et missions fret', 'ERP', 'Container', '#f97316', '/freight', 60, true, ARRAY['chauffeur','admin'], false),
  ('road_sheets', 'Feuilles de route', 'FDR et validations', 'ERP', 'Route', '#f97316', '/road-sheets', 110, true, ARRAY['chauffeur','admin'], false),
  ('dispatch', 'Dispatch', 'Missions et affectations', 'ERP', 'Radio', '#f97316', '/dispatch', 50, true, ARRAY['chauffeur','admin'], false),
  ('gps_tracking', 'GPS Tracking', 'Suivi positions', 'ERP', 'Map', '#f97316', '/tracking', 70, true, ARRAY['chauffeur','admin'], false),
  ('fleet_map', 'Carte flotte', 'Carte live chauffeurs', 'ERP', 'Map', '#f97316', '/fleet-map', 80, true, ARRAY['chauffeur','admin'], false),
  ('documents', 'Dossier chauffeur', 'Coffre-fort et documents', 'ERP', 'Archive', '#f97316', '/documents', 210, true, ARRAY['chauffeur','admin'], false),
  ('driver_integrations', 'Mes intégrations', 'Connexions jeu / télémétrie', 'Compte', 'Plug', '#f97316', '/integrations', 15, true, ARRAY['chauffeur','admin'], false),
  ('drivers', 'Gestion chauffeurs', 'Annuaire et dossiers RH', 'ERP', 'Users', '#eab308', '/drivers', 20, true, ARRAY['admin'], false),
  ('fleet', 'Flotte', 'Camions et affectations', 'ERP', 'Truck', '#eab308', '/fleet', 30, true, ARRAY['admin'], false),
  ('garages', 'Garages', 'Garages et ateliers', 'ERP', 'Building2', '#eab308', '/garages', 40, true, ARRAY['admin'], false),
  ('clients', 'Clients', 'Clients et facturation', 'ERP', 'Receipt', '#eab308', '/clients', 100, true, ARRAY['admin'], false),
  ('maintenance', 'Maintenance', 'Entretien véhicules', 'ERP', 'Wrench', '#eab308', '/maintenance', 170, true, ARRAY['admin'], false),
  ('reports', 'Rapports', 'Statistiques et exports', 'ERP', 'FileBarChart', '#eab308', '/reports', 180, true, ARRAY['admin'], false),
  ('statistics', 'Statistiques', 'KPI avancés', 'ERP', 'FileBarChart', '#eab308', '/statistics', 90, true, ARRAY['admin'], false),
  ('finance', 'Finance', 'Pilotage financier', 'ERP', 'BarChart3', '#eab308', '/finance', 120, true, ARRAY['admin'], false),
  ('invoices', 'Factures', 'Facturation clients', 'ERP', 'Receipt', '#eab308', '/invoices', 130, true, ARRAY['admin'], false),
  ('salaries', 'Salaires', 'Paie chauffeurs', 'ERP', 'Users', '#eab308', '/salaries', 140, true, ARRAY['admin'], false),
  ('accounting', 'Comptabilité', 'Comptabilité générale', 'ERP', 'Calculator', '#eab308', '/accounting', 150, true, ARRAY['admin'], false),
  ('bank', 'Banque entreprise', 'Trésorerie et crédits', 'ERP', 'Banknote', '#eab308', '/bank', 160, true, ARRAY['admin'], false),
  ('training_center', 'Formation', 'Règles et onboarding', 'ERP', 'GraduationCap', '#eab308', '/training', 200, true, ARRAY['chauffeur','admin'], false),
  ('assistant', 'Assistant IA', 'Assistant intelligent', 'ERP', 'Bot', '#eab308', '/assistant', 190, true, ARRAY['admin'], false),
  ('notifications', 'Notifications', 'Centre de notifications', 'ERP', 'Bell', '#64748b', '/notifications', 230, true, ARRAY['chauffeur','admin'], false),
  ('events', 'Événements', 'Événements RP', 'Communauté', 'Calendar', '#64748b', '/events', 30, true, ARRAY['chauffeur','admin'], false),
  ('recruitment', 'Recrutement', 'Candidature à la flotte', 'Recrutement', 'Briefcase', '#3b82f6', '/recruitment', 10, true, ARRAY['visiteur','admin'], false),
  ('recruitment_applications', 'Mes candidatures', 'Suivi candidatures', 'Recrutement', 'FileText', '#3b82f6', '/recruitment/applications', 20, true, ARRAY['visiteur'], false),
  ('recruitment_admin', 'Candidatures admin', 'Gestion recrutement', 'Recrutement', 'Shield', '#eab308', '/recruitment/admin', 30, true, ARRAY['admin'], false),
  ('administration', 'Administration', 'Centre de contrôle', 'Administration', 'Shield', '#eab308', '/administration', 10, true, ARRAY['admin'], true),
  ('roles_salons', 'Rôles et salons', 'Permissions par salon', 'Administration', 'KeyRound', '#eab308', '/administration/roles-salons', 15, true, ARRAY['admin'], true),
  ('salons_admin', 'Gestion des salons', 'Organisation legacy', 'Administration', 'Settings', '#eab308', '/administration/salons', 20, true, ARRAY['admin'], true),
  ('admin_integrations', 'Intégrations admin', 'Intégrations système', 'Administration', 'Plug', '#eab308', '/administration/integrations', 25, true, ARRAY['admin'], true)
ON CONFLICT (room_key) DO UPDATE SET
  room_name = EXCLUDED.room_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  visible_to_roles = EXCLUDED.visible_to_roles,
  admin_critical = EXCLUDED.admin_critical,
  updated_at = now();

-- 6. RPC changement de rôle
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_email text;
  v_old_role text;
  v_role text;
  v_stored text;
  v_variant text;
  v_variants text[];
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé — administrateur requis'; END IF;

  SELECT email, role INTO v_target_email, v_old_role
  FROM public.profiles WHERE id = p_target_user_id;
  IF v_target_email IS NULL THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF public.is_dom76_owner(v_target_email) AND lower(trim(p_new_role)) NOT IN ('admin', 'administrator', 'administrateur') THEN
    RAISE EXCEPTION 'Compte DOM76 protégé — rôle admin uniquement';
  END IF;

  v_role := lower(trim(p_new_role));
  IF v_role IN ('administrator', 'administrateur', 'owner', 'superadmin', 'pdg', 'patron') THEN
    v_role := 'admin';
  ELSIF v_role IN ('visitor', 'invité', 'invite', 'guest', 'candidat', 'recruit', 'recruitment', 'recruteur') THEN
    v_role := 'visiteur';
  ELSIF v_role IN ('chauffeur', 'driver', 'conducteur', 'member', 'flotte', 'dispatcher', 'directeur', 'manager', 'responsable') THEN
    v_role := 'chauffeur';
  END IF;

  IF v_role NOT IN ('admin', 'chauffeur', 'visiteur', 'ancien_membre', 'banni') THEN
    RAISE EXCEPTION 'Rôle invalide : %', p_new_role;
  END IF;

  v_variants := CASE v_role
    WHEN 'visiteur' THEN ARRAY['visiteur']
    WHEN 'admin' THEN ARRAY['admin']
    ELSE ARRAY['chauffeur']
  END;

  v_stored := NULL;
  FOREACH v_variant IN ARRAY v_variants LOOP
    BEGIN
      UPDATE public.profiles SET role = v_variant, updated_at = now() WHERE id = p_target_user_id;
      v_stored := v_variant;
      EXIT;
    EXCEPTION WHEN check_violation THEN CONTINUE;
    END;
  END LOOP;

  IF v_stored IS NULL THEN RAISE EXCEPTION 'Rôle « % » refusé par la base', p_new_role; END IF;

  IF v_stored = 'chauffeur' THEN
    UPDATE public.profiles SET application_status = 'approved', is_active = true, is_suspended = false
    WHERE id = p_target_user_id;
    UPDATE public.drivers SET status = 'active', is_active_driver = true
    WHERE user_id = p_target_user_id;
  ELSIF v_stored = 'admin' THEN
    UPDATE public.profiles SET application_status = 'approved', is_active = true, is_suspended = false
    WHERE id = p_target_user_id;
  ELSIF v_stored = 'visiteur' THEN
    UPDATE public.drivers SET status = 'inactive', is_active_driver = false
    WHERE user_id = p_target_user_id;
  END IF;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, details)
  VALUES (v_actor, p_target_user_id, 'role_change', jsonb_build_object('old_role', v_old_role, 'new_role', v_stored));

  INSERT INTO public.security_logs (user_id, actor_id, event_type, message, details)
  VALUES (p_target_user_id, v_actor, 'role_change',
    format('Rôle modifié: %s → %s', v_old_role, v_stored),
    jsonb_build_object('old_role', v_old_role, 'new_role', v_stored));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, text) TO authenticated;

-- 7. Freight manager
CREATE OR REPLACE FUNCTION public.is_freight_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role IN ('admin', 'chauffeur') OR public.is_dom76_owner(email))
  );
$$;

-- 8. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_permissions;
