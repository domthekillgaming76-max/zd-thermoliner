-- 039 — GPS Map & Delivery Tracking (additive)

-- ── Delivery tracking ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers(id) ON DELETE SET NULL,
  departure_city text NOT NULL,
  arrival_city text NOT NULL,
  departure_lat numeric(9, 6),
  departure_lng numeric(9, 6),
  arrival_lat numeric(9, 6),
  arrival_lng numeric(9, 6),
  current_lat numeric(9, 6),
  current_lng numeric(9, 6),
  cargo text,
  distance_km numeric(10, 2) NOT NULL DEFAULT 0,
  remaining_km numeric(10, 2) NOT NULL DEFAULT 0,
  progress_percent numeric(5, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'loading', 'on_route', 'paused', 'arrived', 'delivered', 'late', 'cancelled')),
  eta_at timestamptz,
  delivery_date timestamptz,
  last_status_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'simulated', 'truckersmp', 'trucksbook', 'ets2_telemetry', 'gps_api')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_mission ON public.delivery_tracking(mission_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_driver ON public.delivery_tracking(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status ON public.delivery_tracking(status);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_active ON public.delivery_tracking(is_active, updated_at DESC);

-- ── GPS positions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gps_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid REFERENCES public.delivery_tracking(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  lat numeric(9, 6) NOT NULL,
  lng numeric(9, 6) NOT NULL,
  speed_kmh numeric(6, 2) DEFAULT 0,
  heading numeric(5, 2),
  is_moving boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'simulated', 'truckersmp', 'trucksbook', 'ets2_telemetry', 'gps_api')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gps_positions_tracking ON public.gps_positions(tracking_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_positions_truck ON public.gps_positions(truck_id, recorded_at DESC);

-- ── Route progress ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.route_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid NOT NULL REFERENCES public.delivery_tracking(id) ON DELETE CASCADE,
  progress_percent numeric(5, 2) NOT NULL DEFAULT 0,
  remaining_km numeric(10, 2) NOT NULL DEFAULT 0,
  eta_at timestamptz,
  status text,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_progress_tracking ON public.route_progress(tracking_id, recorded_at DESC);

-- ── Tracking alerts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tracking_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid REFERENCES public.delivery_tracking(id) ON DELETE CASCADE,
  alert_type text NOT NULL
    CHECK (alert_type IN (
      'late_delivery', 'driver_paused', 'truck_stopped',
      'no_status_update', 'arrival_soon', 'delivery_completed'
    )),
  severity text NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'danger')),
  message text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_alerts_tracking ON public.tracking_alerts(tracking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_open ON public.tracking_alerts(acknowledged, created_at DESC);

-- ── Map markers ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.map_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_type text NOT NULL
    CHECK (marker_type IN ('garage', 'client', 'depot', 'hub')),
  ref_id uuid,
  label text NOT NULL,
  city text,
  lat numeric(9, 6) NOT NULL,
  lng numeric(9, 6) NOT NULL,
  icon text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_markers_type ON public.map_markers(marker_type, is_active);

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_tracking_manager(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND (
        role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher')
        OR public.is_dom76_owner(email)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_tracking_manager(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_owns_tracking(p_driver_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers WHERE id = p_driver_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_tracking(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_access_tracking_row(
  p_driver_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_tracking_manager(p_user_id)
    OR public.user_owns_tracking(p_driver_id, p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_tracking_row(uuid, uuid) TO authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_tracking_select" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_select" ON public.delivery_tracking
  FOR SELECT TO authenticated
  USING (public.user_can_access_tracking_row(driver_id, auth.uid()));

DROP POLICY IF EXISTS "delivery_tracking_insert" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_insert" ON public.delivery_tracking
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tracking_manager(auth.uid()));

DROP POLICY IF EXISTS "delivery_tracking_update" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_update" ON public.delivery_tracking
  FOR UPDATE TO authenticated
  USING (public.user_can_access_tracking_row(driver_id, auth.uid()))
  WITH CHECK (public.user_can_access_tracking_row(driver_id, auth.uid()));

DROP POLICY IF EXISTS "gps_positions_select" ON public.gps_positions;
CREATE POLICY "gps_positions_select" ON public.gps_positions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_tracking dt
      WHERE dt.id = tracking_id
        AND public.user_can_access_tracking_row(dt.driver_id, auth.uid())
    )
    OR public.is_tracking_manager(auth.uid())
  );

DROP POLICY IF EXISTS "gps_positions_insert" ON public.gps_positions;
CREATE POLICY "gps_positions_insert" ON public.gps_positions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tracking_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.delivery_tracking dt
      WHERE dt.id = tracking_id
        AND public.user_owns_tracking(dt.driver_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "route_progress_select" ON public.route_progress;
CREATE POLICY "route_progress_select" ON public.route_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_tracking dt
      WHERE dt.id = tracking_id
        AND public.user_can_access_tracking_row(dt.driver_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "route_progress_insert" ON public.route_progress;
CREATE POLICY "route_progress_insert" ON public.route_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_tracking dt
      WHERE dt.id = tracking_id
        AND public.user_can_access_tracking_row(dt.driver_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_alerts_select" ON public.tracking_alerts;
CREATE POLICY "tracking_alerts_select" ON public.tracking_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_tracking dt
      WHERE dt.id = tracking_id
        AND public.user_can_access_tracking_row(dt.driver_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_alerts_insert" ON public.tracking_alerts;
CREATE POLICY "tracking_alerts_insert" ON public.tracking_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tracking_manager(auth.uid()) OR true);

DROP POLICY IF EXISTS "tracking_alerts_update" ON public.tracking_alerts;
CREATE POLICY "tracking_alerts_update" ON public.tracking_alerts
  FOR UPDATE TO authenticated
  USING (public.is_tracking_manager(auth.uid()));

DROP POLICY IF EXISTS "map_markers_select" ON public.map_markers;
CREATE POLICY "map_markers_select" ON public.map_markers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "map_markers_manage" ON public.map_markers;
CREATE POLICY "map_markers_manage" ON public.map_markers
  FOR ALL TO authenticated
  USING (public.is_tracking_manager(auth.uid()))
  WITH CHECK (public.is_tracking_manager(auth.uid()));

COMMENT ON TABLE public.delivery_tracking IS 'Active delivery GPS tracking records';
COMMENT ON TABLE public.gps_positions IS 'GPS position history for trucks';
COMMENT ON TABLE public.route_progress IS 'Route progress snapshots';
COMMENT ON TABLE public.tracking_alerts IS 'Delivery tracking alerts';
COMMENT ON TABLE public.map_markers IS 'Static map markers for garages and clients';
