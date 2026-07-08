-- 049 — Phase 5: Real-time ops, fleet map, notifications, AI dispatch (additive)

-- ── Driver presence (connected drivers / simulated GPS) ─────────────────────
CREATE TABLE IF NOT EXISTS public.driver_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'on_route', 'offline')),
  current_city text,
  current_lat numeric(10,6),
  current_lng numeric(10,6),
  truck_registration text,
  route_summary text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_presence_last_seen ON public.driver_presence(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_driver_presence_status ON public.driver_presence(status);

ALTER TABLE public.driver_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_presence_select" ON public.driver_presence;
CREATE POLICY "driver_presence_select" ON public.driver_presence
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "driver_presence_upsert_own" ON public.driver_presence;
CREATE POLICY "driver_presence_upsert_own" ON public.driver_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "driver_presence_manage" ON public.driver_presence;
CREATE POLICY "driver_presence_manage" ON public.driver_presence
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher') OR public.is_dom76_owner(p.email))
    )
  );

-- ── System health status ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'degraded', 'down')),
  message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_health (component, status, message) VALUES
  ('database', 'ok', 'Supabase connecté'),
  ('freight_engine', 'ok', 'Marché fret opérationnel'),
  ('bank_sync', 'ok', 'Synchronisation bancaire'),
  ('notifications', 'ok', 'Notifications temps réel'),
  ('gps_tracking', 'ok', 'Tracking GPS / simulation')
ON CONFLICT (component) DO NOTHING;

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_health_select" ON public.system_health;
CREATE POLICY "system_health_select" ON public.system_health
  FOR SELECT TO authenticated USING (true);

-- ── Notification RPC (insert for any user — managers/system) ─────────────────
CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id uuid,
  p_title text,
  p_message text DEFAULT NULL,
  p_type text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, read)
  VALUES (p_user_id, p_title, p_message, COALESCE(p_type, 'info'), false)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_users_by_roles(
  p_roles text[],
  p_title text,
  p_message text DEFAULT NULL,
  p_type text DEFAULT 'info'
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_user record;
BEGIN
  FOR v_user IN
    SELECT id FROM public.profiles
    WHERE role = ANY(p_roles)
      AND COALESCE(is_active, true) = true
      AND COALESCE(is_suspended, false) = false
  LOOP
    PERFORM public.create_user_notification(v_user.id, p_title, p_message, p_type);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_users_by_roles(text[], text, text, text) TO authenticated;

COMMENT ON TABLE public.driver_presence IS 'Phase 5 — driver online status and simulated positions';
COMMENT ON TABLE public.system_health IS 'Phase 5 — ERP system component health';
