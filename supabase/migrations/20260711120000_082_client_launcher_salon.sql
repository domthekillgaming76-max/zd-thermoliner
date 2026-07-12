-- 082 — Salon « Client Windows » + RLS releases client

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_app_releases_version_unique
  ON public.client_app_releases (version);

-- Corriger la politique admin sur client_app_releases (rôles canoniques)
DROP POLICY IF EXISTS "client_app_releases_manage" ON public.client_app_releases;
CREATE POLICY "client_app_releases_manage" ON public.client_app_releases
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- Mettre à jour la release par défaut si pas de lien
UPDATE public.client_app_releases
SET
  version = '1.0.1',
  changelog = COALESCE(NULLIF(changelog, ''), 'Client Windows Z&D Thermoliner — télémétrie ETS2/ATS, sync ERP, tableau de bord chauffeur.')
WHERE is_latest = true AND (download_url IS NULL OR download_url = '');

INSERT INTO public.client_app_releases (version, download_url, changelog, mandatory, is_latest)
SELECT
  '1.0.1',
  NULL,
  'Client Windows Z&D Thermoliner — installation en un clic, connexion ERP, télémétrie ETS2/ATS.',
  false,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.client_app_releases WHERE is_latest = true);

-- Salon ERP : téléchargement client
INSERT INTO public.room_permissions (
  room_key, room_name, description, category, icon, color, route,
  sort_order, enabled, visible_to_roles, admin_critical
) VALUES (
  'client_launcher',
  'Client Windows',
  'Télécharger et installer le launcher Z&D Thermoliner pour ETS2/ATS',
  'Compte',
  'Download',
  '#3b82f6',
  '/client',
  25,
  true,
  ARRAY['visiteur', 'chauffeur', 'admin'],
  false
)
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
  updated_at = now();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.client_app_releases;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
