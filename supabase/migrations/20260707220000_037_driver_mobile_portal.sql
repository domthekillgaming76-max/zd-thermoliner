-- 037 — Driver Mobile Portal (additive)

CREATE TABLE IF NOT EXISTS public.driver_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'on_mission', 'driving', 'resting', 'issue_reported', 'offline')),
  notes text,
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_status_logs_driver ON public.driver_status_logs(driver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_driver ON public.delivery_proofs(driver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.driver_mobile_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  device_info jsonb DEFAULT '{}',
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_mobile_sessions_user ON public.driver_mobile_sessions(user_id);

-- ─── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.driver_owns_record(p_driver_id uuid, p_user_id uuid DEFAULT auth.uid())
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

GRANT EXECUTE ON FUNCTION public.driver_owns_record(uuid, uuid) TO authenticated;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.driver_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_mobile_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_status_logs_select" ON public.driver_status_logs;
CREATE POLICY "driver_status_logs_select" ON public.driver_status_logs
  FOR SELECT TO authenticated
  USING (public.driver_owns_record(driver_id) OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "driver_status_logs_insert" ON public.driver_status_logs;
CREATE POLICY "driver_status_logs_insert" ON public.driver_status_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.driver_owns_record(driver_id));

DROP POLICY IF EXISTS "delivery_proofs_select" ON public.delivery_proofs;
CREATE POLICY "delivery_proofs_select" ON public.delivery_proofs
  FOR SELECT TO authenticated
  USING (public.driver_owns_record(driver_id) OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "delivery_proofs_insert" ON public.delivery_proofs;
CREATE POLICY "delivery_proofs_insert" ON public.delivery_proofs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.driver_owns_record(driver_id));

DROP POLICY IF EXISTS "driver_mobile_sessions_select" ON public.driver_mobile_sessions;
CREATE POLICY "driver_mobile_sessions_select" ON public.driver_mobile_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "driver_mobile_sessions_upsert" ON public.driver_mobile_sessions;
CREATE POLICY "driver_mobile_sessions_insert" ON public.driver_mobile_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "driver_mobile_sessions_update" ON public.driver_mobile_sessions;
CREATE POLICY "driver_mobile_sessions_update" ON public.driver_mobile_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

COMMENT ON TABLE public.driver_status_logs IS 'Driver presence and mission status history';
COMMENT ON TABLE public.delivery_proofs IS 'Mobile delivery photo proofs';
COMMENT ON TABLE public.driver_mobile_sessions IS 'Driver mobile portal session tracking';
