-- 041 — Freight Market & Automatic Missions (additive)

CREATE TABLE IF NOT EXISTS public.freight_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  departure_city text NOT NULL,
  arrival_city text NOT NULL,
  departure_country text NOT NULL DEFAULT 'France',
  arrival_country text NOT NULL DEFAULT 'France',
  cargo text,
  weight_kg numeric(12, 2) NOT NULL DEFAULT 0,
  pallets int NOT NULL DEFAULT 0,
  temperature_required boolean NOT NULL DEFAULT false,
  temperature_min numeric(5, 2),
  temperature_max numeric(5, 2),
  adr_required boolean NOT NULL DEFAULT false,
  distance_km numeric(10, 2) NOT NULL DEFAULT 0,
  price numeric(12, 2) NOT NULL DEFAULT 0,
  price_per_km numeric(8, 4) NOT NULL DEFAULT 0,
  deadline_at timestamptz,
  loading_date date,
  delivery_date date NOT NULL,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'assigned', 'in_progress', 'delivered', 'cancelled', 'expired')),
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freight_offers_status ON public.freight_offers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_freight_offers_priority ON public.freight_offers(priority);
CREATE INDEX IF NOT EXISTS idx_freight_offers_expires ON public.freight_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_freight_offers_client ON public.freight_offers(client_id);

CREATE TABLE IF NOT EXISTS public.freight_profitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.freight_offers(id) ON DELETE CASCADE,
  revenue numeric(12, 2) NOT NULL DEFAULT 0,
  fuel_cost numeric(12, 2) NOT NULL DEFAULT 0,
  toll_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  salary_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  maintenance_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  insurance_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  net_profit numeric(12, 2) NOT NULL DEFAULT 0,
  margin_percent numeric(6, 2) NOT NULL DEFAULT 0,
  cost_per_km numeric(8, 4) NOT NULL DEFAULT 0,
  profit_per_km numeric(8, 4) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id)
);

CREATE TABLE IF NOT EXISTS public.freight_offer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.freight_offers(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freight_assignments_offer ON public.freight_offer_assignments(offer_id);

CREATE TABLE IF NOT EXISTS public.freight_offer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.freight_offers(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_freight_requests_driver ON public.freight_offer_requests(driver_id, status);

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_freight_manager(p_user_id uuid DEFAULT auth.uid())
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

GRANT EXECUTE ON FUNCTION public.is_freight_manager(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_owns_freight_request(p_driver_id uuid, p_user_id uuid DEFAULT auth.uid())
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

GRANT EXECUTE ON FUNCTION public.driver_owns_freight_request(uuid, uuid) TO authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.freight_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_offer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_offer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "freight_offers_select" ON public.freight_offers;
CREATE POLICY "freight_offers_select" ON public.freight_offers
  FOR SELECT TO authenticated
  USING (
    public.is_freight_manager(auth.uid())
    OR status IN ('available', 'reserved')
    OR EXISTS (
      SELECT 1 FROM public.freight_offer_assignments a
      JOIN public.drivers d ON d.id = a.driver_id
      WHERE a.offer_id = freight_offers.id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.freight_offer_requests r
      WHERE r.offer_id = freight_offers.id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "freight_offers_insert" ON public.freight_offers;
CREATE POLICY "freight_offers_insert" ON public.freight_offers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_offers_update" ON public.freight_offers;
CREATE POLICY "freight_offers_update" ON public.freight_offers
  FOR UPDATE TO authenticated
  USING (public.is_freight_manager(auth.uid()))
  WITH CHECK (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_offers_delete" ON public.freight_offers;
CREATE POLICY "freight_offers_delete" ON public.freight_offers
  FOR DELETE TO authenticated
  USING (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_profitability_select" ON public.freight_profitability;
CREATE POLICY "freight_profitability_select" ON public.freight_profitability
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "freight_profitability_manage" ON public.freight_profitability;
CREATE POLICY "freight_profitability_manage" ON public.freight_profitability
  FOR ALL TO authenticated
  USING (public.is_freight_manager(auth.uid()))
  WITH CHECK (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_assignments_select" ON public.freight_offer_assignments;
CREATE POLICY "freight_assignments_select" ON public.freight_offer_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "freight_assignments_manage" ON public.freight_offer_assignments;
CREATE POLICY "freight_assignments_manage" ON public.freight_offer_assignments
  FOR ALL TO authenticated
  USING (public.is_freight_manager(auth.uid()))
  WITH CHECK (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_requests_select" ON public.freight_offer_requests;
CREATE POLICY "freight_requests_select" ON public.freight_offer_requests
  FOR SELECT TO authenticated
  USING (public.is_freight_manager(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "freight_requests_insert" ON public.freight_offer_requests;
CREATE POLICY "freight_requests_insert" ON public.freight_offer_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.driver_owns_freight_request(driver_id, auth.uid()));

DROP POLICY IF EXISTS "freight_requests_update" ON public.freight_offer_requests;
CREATE POLICY "freight_requests_update" ON public.freight_offer_requests
  FOR UPDATE TO authenticated
  USING (public.is_freight_manager(auth.uid()));

COMMENT ON TABLE public.freight_offers IS 'Professional freight market dispatch board offers';
COMMENT ON TABLE public.freight_profitability IS 'Computed profitability per freight offer';
COMMENT ON TABLE public.freight_offer_assignments IS 'Driver/truck assignments for accepted offers';
COMMENT ON TABLE public.freight_offer_requests IS 'Driver assignment requests';
