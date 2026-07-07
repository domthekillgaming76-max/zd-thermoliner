-- 028 — Professional Fleet Management (additive)

-- ── Extend trucks ─────────────────────────────────────────────────────────────
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS vin text;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS fuel_consumption numeric(5,2) DEFAULT 0;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS trailer_id uuid;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS insurance_date date;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS technical_inspection_date date;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trucks_trailer_id_fkey') THEN
    ALTER TABLE public.trucks
      ADD CONSTRAINT trucks_trailer_id_fkey
      FOREIGN KEY (trailer_id) REFERENCES public.trailers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── fleet_maintenance ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL DEFAULT 'other'
    CHECK (maintenance_type IN ('oil', 'tires', 'brakes', 'engine', 'transmission', 'other')),
  title text NOT NULL,
  description text,
  scheduled_date date,
  completed_date date,
  estimated_cost decimal(10,2) DEFAULT 0,
  actual_cost decimal(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  validated boolean DEFAULT false,
  validated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_truck ON public.fleet_maintenance(truck_id);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_status ON public.fleet_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_scheduled ON public.fleet_maintenance(scheduled_date);

ALTER TABLE public.fleet_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fleet_maintenance_all" ON public.fleet_maintenance;
CREATE POLICY "fleet_maintenance_all" ON public.fleet_maintenance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── truck_assignments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.truck_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers(id) ON DELETE SET NULL,
  garage_id uuid REFERENCES public.garages(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  unassigned_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truck_assignments_truck ON public.truck_assignments(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_assignments_active ON public.truck_assignments(truck_id) WHERE unassigned_at IS NULL;

ALTER TABLE public.truck_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "truck_assignments_all" ON public.truck_assignments;
CREATE POLICY "truck_assignments_all" ON public.truck_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── truck_documents ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.truck_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('insurance', 'inspection', 'registration', 'maintenance', 'other')),
  file_url text,
  file_name text,
  expires_at date,
  status text DEFAULT 'valid' CHECK (status IN ('pending', 'valid', 'expired', 'rejected')),
  uploaded_at timestamptz DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_truck_documents_truck ON public.truck_documents(truck_id);

ALTER TABLE public.truck_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "truck_documents_all" ON public.truck_documents;
CREATE POLICY "truck_documents_all" ON public.truck_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Ensure truck_costs row on truck insert ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_truck_costs_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.truck_costs (truck_id)
  VALUES (NEW.id)
  ON CONFLICT (truck_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_truck_costs ON public.trucks;
CREATE TRIGGER trg_ensure_truck_costs
  AFTER INSERT ON public.trucks
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_truck_costs_row();

-- Backfill truck_costs for existing trucks
INSERT INTO public.truck_costs (truck_id)
SELECT id FROM public.trucks
WHERE id NOT IN (SELECT truck_id FROM public.truck_costs)
ON CONFLICT (truck_id) DO NOTHING;

COMMENT ON TABLE public.fleet_maintenance IS 'Truck maintenance records and alerts';
COMMENT ON TABLE public.truck_assignments IS 'Truck driver/trailer/garage assignment history';
