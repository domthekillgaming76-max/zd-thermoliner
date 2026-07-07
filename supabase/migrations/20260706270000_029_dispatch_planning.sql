-- 029 — Dispatch & Planning module (additive)

-- ── clients ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  country text DEFAULT 'France',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_all" ON public.clients;
CREATE POLICY "clients_all" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── transport_missions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  reference text,
  client_name text,
  departure_city text NOT NULL,
  arrival_city text NOT NULL,
  loading_date date,
  delivery_date date NOT NULL,
  cargo text,
  weight_kg numeric(10,2) DEFAULT 0,
  pallets integer DEFAULT 0,
  temperature_required boolean DEFAULT false,
  temperature_min numeric(5,2),
  temperature_max numeric(5,2),
  adr_required boolean DEFAULT false,
  distance_km numeric(10,2) DEFAULT 0,
  price numeric(12,2) DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planned', 'assigned', 'in_progress', 'delivered', 'cancelled')),
  route_notes text,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers(id) ON DELETE SET NULL,
  garage_id uuid REFERENCES public.garages(id) ON DELETE SET NULL,
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_missions_status ON public.transport_missions(status);
CREATE INDEX IF NOT EXISTS idx_transport_missions_delivery ON public.transport_missions(delivery_date);
CREATE INDEX IF NOT EXISTS idx_transport_missions_driver ON public.transport_missions(driver_id);
CREATE INDEX IF NOT EXISTS idx_transport_missions_priority ON public.transport_missions(priority);

ALTER TABLE public.transport_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transport_missions_all" ON public.transport_missions;
CREATE POLICY "transport_missions_all" ON public.transport_missions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── mission_assignments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.transport_missions(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers(id) ON DELETE SET NULL,
  garage_id uuid REFERENCES public.garages(id) ON DELETE SET NULL,
  route_notes text,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  unassigned_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_assignments_mission ON public.mission_assignments(mission_id);

ALTER TABLE public.mission_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mission_assignments_all" ON public.mission_assignments;
CREATE POLICY "mission_assignments_all" ON public.mission_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── planning_events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'mission'
    CHECK (event_type IN ('mission', 'loading', 'delivery', 'maintenance', 'other')),
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean DEFAULT false,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_events_start ON public.planning_events(start_at);
CREATE INDEX IF NOT EXISTS idx_planning_events_mission ON public.planning_events(mission_id);

ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planning_events_all" ON public.planning_events;
CREATE POLICY "planning_events_all" ON public.planning_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── dispatch_alerts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispatch_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE CASCADE,
  alert_type text NOT NULL
    CHECK (alert_type IN ('late_delivery', 'missing_driver', 'missing_truck', 'overlapping_mission', 'adr_missing', 'temperature_issue')),
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high')),
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_mission ON public.dispatch_alerts(mission_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_open ON public.dispatch_alerts(resolved) WHERE resolved = false;

ALTER TABLE public.dispatch_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dispatch_alerts_all" ON public.dispatch_alerts;
CREATE POLICY "dispatch_alerts_all" ON public.dispatch_alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Auto reference generator ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_mission_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'MSN-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transport_missions_reference ON public.transport_missions;
CREATE TRIGGER trg_transport_missions_reference
  BEFORE INSERT OR UPDATE ON public.transport_missions
  FOR EACH ROW EXECUTE FUNCTION public.generate_mission_reference();

COMMENT ON TABLE public.transport_missions IS 'Dispatch transport missions for Z&D Thermoliner ERP';
