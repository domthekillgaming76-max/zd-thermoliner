-- 057 — Dynamic app modules / salons configuration

CREATE TABLE IF NOT EXISTS public.app_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'ERP',
  icon text NOT NULL DEFAULT 'HelpCircle',
  route text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  allowed_roles text[] NOT NULL DEFAULT '{}',
  admin_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_modules_category_order ON public.app_modules(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_app_modules_enabled ON public.app_modules(enabled);

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_modules' AND policyname = 'app_modules_select'
  ) THEN
    CREATE POLICY "app_modules_select" ON public.app_modules
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_modules' AND policyname = 'app_modules_admin_manage'
  ) THEN
    CREATE POLICY "app_modules_admin_manage" ON public.app_modules
      FOR ALL TO authenticated
      USING (public.get_my_role() IN ('pdg', 'patron', 'admin'))
      WITH CHECK (public.get_my_role() IN ('pdg', 'patron', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_modules;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.app_modules REPLICA IDENTITY FULL;

-- Seed default modules (idempotent)
INSERT INTO public.app_modules (key, label, category, icon, route, enabled, sort_order, allowed_roles, admin_only) VALUES
  ('dashboard', 'Tableau de bord', 'ERP', 'LayoutDashboard', '/dashboard', true, 10, ARRAY['driver','dispatcher','fleet_manager','manager','accountant','admin','chauffeur','directeur','patron','pdg','comptable'], false),
  ('drivers', 'Chauffeurs', 'ERP', 'Users', '/drivers', true, 20, ARRAY['manager','admin','patron','pdg','directeur'], false),
  ('fleet', 'Flotte', 'ERP', 'Truck', '/fleet', true, 30, ARRAY['fleet_manager','manager','admin','directeur','patron','pdg'], false),
  ('garages', 'Garages', 'ERP', 'Building2', '/garages', true, 40, ARRAY['fleet_manager','admin','directeur','patron','pdg'], false),
  ('dispatch', 'Dispatch', 'ERP', 'Radio', '/dispatch', true, 50, ARRAY['dispatcher','admin','directeur','patron','pdg'], false),
  ('freight_market', 'Marché Fret', 'ERP', 'Container', '/freight', true, 60, ARRAY['driver','dispatcher','manager','admin','chauffeur','member','patron','pdg'], false),
  ('gps_tracking', 'GPS Tracking', 'ERP', 'Map', '/tracking', true, 70, ARRAY['dispatcher','fleet_manager','admin','directeur','patron','pdg'], false),
  ('fleet_map', 'Carte flotte', 'ERP', 'Map', '/fleet-map', true, 80, ARRAY['fleet_manager','admin','directeur','patron','pdg'], false),
  ('statistics', 'Statistiques', 'ERP', 'FileBarChart', '/statistics', true, 90, ARRAY['fleet_manager','admin','directeur','patron','pdg'], false),
  ('clients', 'Clients & Factures', 'ERP', 'Receipt', '/clients', true, 100, ARRAY['admin','patron','pdg','directeur'], false),
  ('road_sheets', 'Feuilles de route', 'ERP', 'Route', '/road-sheets', true, 110, ARRAY['driver','dispatcher','admin','chauffeur','member','patron','pdg'], false),
  ('finance', 'Finance', 'ERP', 'BarChart3', '/finance', true, 120, ARRAY['accountant','admin','comptable','patron','pdg'], false),
  ('invoices', 'Factures', 'ERP', 'Receipt', '/invoices', true, 130, ARRAY['accountant','admin','comptable','patron','pdg'], false),
  ('salaries', 'Salaires', 'ERP', 'Users', '/salaries', true, 140, ARRAY['accountant','admin','comptable','patron','pdg'], false),
  ('accounting', 'Comptabilité', 'ERP', 'Calculator', '/accounting', true, 150, ARRAY['accountant','admin','comptable','patron','pdg'], false),
  ('bank', 'Banque', 'ERP', 'Banknote', '/bank', true, 160, ARRAY['admin','pdg','patron'], true),
  ('maintenance', 'Maintenance', 'ERP', 'Wrench', '/maintenance', true, 170, ARRAY['fleet_manager','admin','directeur','patron','pdg'], false),
  ('reports', 'Rapports', 'ERP', 'FileBarChart', '/reports', true, 180, ARRAY['manager','fleet_manager','admin','patron','pdg','directeur'], false),
  ('assistant', 'Assistant IA', 'ERP', 'Bot', '/assistant', true, 190, ARRAY['admin','patron','pdg','directeur'], false),
  ('training_center', 'Formation & Règles', 'ERP', 'GraduationCap', '/training', true, 200, ARRAY['admin','patron','pdg'], false),
  ('documents', 'Coffre-fort', 'ERP', 'Archive', '/documents', true, 210, ARRAY['admin','patron','pdg','directeur'], false),
  ('driver_portal', 'Portail mobile', 'ERP', 'Smartphone', '/driver', true, 220, ARRAY['driver','admin','chauffeur','member','patron','pdg'], false),
  ('notifications', 'Notifications', 'ERP', 'Bell', '/notifications', true, 230, ARRAY['admin','patron','pdg','directeur','dispatcher'], false),
  ('wall', 'Mur de la société', 'Communauté', 'MessageSquare', '/wall', true, 10, ARRAY['visitor','recruit','driver','dispatcher','fleet_manager','manager','accountant','admin','visiteur','candidat','chauffeur','member','patron','pdg'], false),
  ('updates', 'Mises à jour', 'Communauté', 'Bell', '/updates', true, 20, ARRAY['driver','dispatcher','fleet_manager','manager','accountant','admin','patron','pdg'], false),
  ('events', 'Événements', 'Communauté', 'Calendar', '/events', true, 30, ARRAY['driver','dispatcher','fleet_manager','manager','accountant','admin','patron','pdg'], false),
  ('recruitment', 'Recrutement', 'Recrutement', 'Briefcase', '/recruitment', true, 10, ARRAY['visitor','recruit','admin','visiteur','candidat','patron','pdg'], false),
  ('recruitment_applications', 'Mes candidatures', 'Recrutement', 'FileText', '/recruitment/applications', true, 20, ARRAY['visitor','recruit','visiteur','candidat'], false),
  ('recruitment_admin', 'Toutes les candidatures', 'Recrutement', 'Shield', '/recruitment/admin', true, 30, ARRAY['admin','patron','pdg'], true),
  ('profile', 'Profil', 'Compte', 'User', '/profile', true, 10, ARRAY['visitor','recruit','driver','dispatcher','fleet_manager','manager','accountant','admin','visiteur','candidat','chauffeur','member','patron','pdg'], false),
  ('settings', 'Paramètres', 'Compte', 'Settings', '/settings', true, 20, ARRAY['visitor','recruit','driver','dispatcher','fleet_manager','manager','accountant','admin','visiteur','candidat','chauffeur','member','patron','pdg'], false),
  ('administration', 'Administration', 'Administration', 'Shield', '/administration', true, 10, ARRAY['admin','patron','pdg'], true),
  ('salons_admin', 'Gestion des salons', 'Administration', 'Settings', '/administration/salons', true, 20, ARRAY['admin','patron','pdg'], true)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_modules IS 'Configurable application modules/salons for dynamic navigation';
