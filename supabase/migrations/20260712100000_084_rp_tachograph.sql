-- 084 — Tachygraphe RP (simulation) — tickets & contrôles

CREATE TABLE IF NOT EXISTS public.rp_tachograph_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  ticket_id text NOT NULL,
  session_id text,
  driver_number text NOT NULL,
  driver_name text NOT NULL,
  body_text text NOT NULL DEFAULT '',
  distance_km numeric NOT NULL DEFAULT 0,
  driving_minutes integer NOT NULL DEFAULT 0,
  break_minutes integer NOT NULL DEFAULT 0,
  rest_minutes integer NOT NULL DEFAULT 0,
  avg_speed_kmh numeric NOT NULL DEFAULT 0,
  max_speed_kmh numeric NOT NULL DEFAULT 0,
  consumption_l100 numeric NOT NULL DEFAULT 0,
  mission_label text,
  status text NOT NULL DEFAULT 'VALIDÉ',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_tacho_tickets_profile ON public.rp_tachograph_tickets(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rp_tacho_tickets_driver ON public.rp_tachograph_tickets(driver_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rp_tacho_tickets_ticket_id ON public.rp_tachograph_tickets(ticket_id);

CREATE TABLE IF NOT EXISTS public.rp_tachograph_control_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rp_tacho_control_target ON public.rp_tachograph_control_requests(target_profile_id, status);

ALTER TABLE public.rp_tachograph_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_tachograph_control_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp_tacho_tickets_select_own" ON public.rp_tachograph_tickets;
CREATE POLICY "rp_tacho_tickets_select_own" ON public.rp_tachograph_tickets
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "rp_tacho_tickets_insert_own" ON public.rp_tachograph_tickets;
CREATE POLICY "rp_tacho_tickets_insert_own" ON public.rp_tachograph_tickets
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "rp_tacho_tickets_admin" ON public.rp_tachograph_tickets;
CREATE POLICY "rp_tacho_tickets_admin" ON public.rp_tachograph_tickets
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "rp_tacho_control_select" ON public.rp_tachograph_control_requests;
CREATE POLICY "rp_tacho_control_select" ON public.rp_tachograph_control_requests
  FOR SELECT TO authenticated
  USING (target_profile_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "rp_tacho_control_admin" ON public.rp_tachograph_control_requests;
CREATE POLICY "rp_tacho_control_admin" ON public.rp_tachograph_control_requests
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- Salon ERP : centre contrôle routier RP (admin)
INSERT INTO public.room_permissions (
  room_key, room_name, description, category, icon, color, route,
  sort_order, enabled, visible_to_roles, admin_critical
) VALUES (
  'rp_control_center',
  'Contrôle routier RP',
  'Supervision chauffeurs connectés, tickets tachygraphe et contrôles RP',
  'Administration',
  'Shield',
  '#eab308',
  '/administration/rp-control',
  20,
  true,
  ARRAY['admin'],
  false
)
ON CONFLICT (room_key) DO UPDATE SET
  room_name = EXCLUDED.room_name,
  description = EXCLUDED.description,
  route = EXCLUDED.route,
  enabled = EXCLUDED.enabled,
  visible_to_roles = EXCLUDED.visible_to_roles,
  updated_at = now();

COMMENT ON TABLE public.rp_tachograph_tickets IS 'Tickets fin de journée tachygraphe RP (simulation Z&D Thermoliner)';
