-- 065 — Client Windows releases (Z&D Thermoliner Client)

CREATE TABLE IF NOT EXISTS public.client_app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  download_url text,
  changelog text NOT NULL DEFAULT '',
  mandatory boolean NOT NULL DEFAULT false,
  is_latest boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_app_releases
  ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_app_releases_latest
  ON public.client_app_releases (is_latest)
  WHERE is_latest = true;

CREATE INDEX IF NOT EXISTS idx_client_app_releases_version ON public.client_app_releases(version);

ALTER TABLE public.client_app_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_app_releases_select" ON public.client_app_releases;
CREATE POLICY "client_app_releases_select" ON public.client_app_releases
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "client_app_releases_manage" ON public.client_app_releases;
CREATE POLICY "client_app_releases_manage" ON public.client_app_releases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('pdg', 'patron', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('pdg', 'patron', 'admin')
    )
  );

INSERT INTO public.client_app_releases (version, download_url, changelog, mandatory, is_latest)
SELECT
  '1.0.0',
  NULL,
  'Version initiale du client Windows Z&D Thermoliner — connexion ERP, télémétrie ETS2/ATS, synchronisation.',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_app_releases WHERE version = '1.0.0'
);

COMMENT ON TABLE public.client_app_releases IS 'Releases du client Windows Z&D Thermoliner (.exe)';
