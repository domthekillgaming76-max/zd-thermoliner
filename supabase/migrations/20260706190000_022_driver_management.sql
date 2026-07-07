-- 022 — Professional Driver Management module (safe/idempotent extensions)

-- ── Extend drivers profile ──────────────────────────────────────────────────
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS employment_contract text DEFAULT 'CDI';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS salary_mode text DEFAULT 'percentage';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS salary_base decimal(10,2) DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driver_level integer DEFAULT 1;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_categories text DEFAULT 'C,CE';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS has_adr boolean DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS dangerous_goods_authorized boolean DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driving_status text DEFAULT 'resting';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS trailer_id uuid;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driving_hours_month numeric(8,2) DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_active_driver boolean DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_driving_status_check') THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_driving_status_check
      CHECK (driving_status IN ('driving', 'resting', 'vacation', 'sick'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_salary_mode_check') THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_salary_mode_check
      CHECK (salary_mode IN ('fixed', 'percentage', 'per_km'));
  END IF;
END $$;

-- ── Trailers (for assignment) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text UNIQUE NOT NULL,
  type text DEFAULT 'bache',
  brand text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trailers_select" ON public.trailers;
CREATE POLICY "trailers_select" ON public.trailers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "trailers_manage" ON public.trailers;
CREATE POLICY "trailers_manage" ON public.trailers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'drivers_trailer_id_fkey'
  ) THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_trailer_id_fkey
      FOREIGN KEY (trailer_id) REFERENCES public.trailers(id) ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO public.trailers (registration, type, brand, status)
SELECT 'TR-' || LPAD(gs::text, 4, '0'), 'frigo', 'Schmitz', 'active'
FROM generate_series(1, 3) gs
WHERE NOT EXISTS (SELECT 1 FROM public.trailers LIMIT 1);

-- ── Driver documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('license', 'medical', 'adr', 'identity', 'other')),
  file_url text,
  file_name text,
  expires_at date,
  uploaded_at timestamptz DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver ON public.driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expires ON public.driver_documents(expires_at);

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_documents_all" ON public.driver_documents;
CREATE POLICY "driver_documents_all" ON public.driver_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Driver salary history ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  base_salary decimal(10,2) DEFAULT 0,
  bonus decimal(10,2) DEFAULT 0,
  penalty decimal(10,2) DEFAULT 0,
  net_amount decimal(10,2) DEFAULT 0,
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_salary_history_driver ON public.driver_salary_history(driver_id);

ALTER TABLE public.driver_salary_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_salary_history_all" ON public.driver_salary_history;
CREATE POLICY "driver_salary_history_all" ON public.driver_salary_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Driver incidents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.driver_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_incidents_all" ON public.driver_incidents;
CREATE POLICY "driver_incidents_all" ON public.driver_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Assignment history ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('truck', 'trailer')),
  asset_id uuid NOT NULL,
  asset_label text,
  assigned_at timestamptz DEFAULT now(),
  unassigned_at timestamptz
);

ALTER TABLE public.driver_assignment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_assignment_history_all" ON public.driver_assignment_history;
CREATE POLICY "driver_assignment_history_all" ON public.driver_assignment_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Storage bucket for driver documents ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "driver_documents_storage_select" ON storage.objects;
CREATE POLICY "driver_documents_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents');

DROP POLICY IF EXISTS "driver_documents_storage_insert" ON storage.objects;
CREATE POLICY "driver_documents_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-documents');

DROP POLICY IF EXISTS "driver_documents_storage_delete" ON storage.objects;
CREATE POLICY "driver_documents_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'driver-documents');
