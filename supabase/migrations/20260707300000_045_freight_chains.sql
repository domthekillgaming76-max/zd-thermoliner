-- 045 — Chained freight routes (additive)

CREATE TABLE IF NOT EXISTS public.freight_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired')),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers(id) ON DELETE SET NULL,
  current_leg_order int NOT NULL DEFAULT 1,
  total_distance_km numeric(12, 2) NOT NULL DEFAULT 0,
  total_revenue numeric(12, 2) NOT NULL DEFAULT 0,
  total_fuel_cost numeric(12, 2) NOT NULL DEFAULT 0,
  total_toll_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  total_salary_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  total_maintenance_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  total_insurance_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  total_net_profit numeric(12, 2) NOT NULL DEFAULT 0,
  total_margin_percent numeric(6, 2) NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freight_chains_status ON public.freight_chains(status, created_at DESC);

ALTER TABLE public.freight_offers
  ADD COLUMN IF NOT EXISTS chain_id uuid REFERENCES public.freight_chains(id) ON DELETE CASCADE;

ALTER TABLE public.freight_offers
  ADD COLUMN IF NOT EXISTS leg_order int;

ALTER TABLE public.freight_offers
  ADD COLUMN IF NOT EXISTS leg_locked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_freight_offers_chain ON public.freight_offers(chain_id, leg_order);

-- ── RLS freight_chains ────────────────────────────────────────────────────────

ALTER TABLE public.freight_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "freight_chains_select" ON public.freight_chains;
CREATE POLICY "freight_chains_select" ON public.freight_chains
  FOR SELECT TO authenticated
  USING (
    public.is_freight_manager(auth.uid())
    OR status IN ('available', 'assigned', 'in_progress')
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "freight_chains_insert" ON public.freight_chains;
CREATE POLICY "freight_chains_insert" ON public.freight_chains
  FOR INSERT TO authenticated
  WITH CHECK (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_chains_update" ON public.freight_chains;
CREATE POLICY "freight_chains_update" ON public.freight_chains
  FOR UPDATE TO authenticated
  USING (public.is_freight_manager(auth.uid()))
  WITH CHECK (public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "freight_chains_delete" ON public.freight_chains;
CREATE POLICY "freight_chains_delete" ON public.freight_chains
  FOR DELETE TO authenticated
  USING (public.is_freight_manager(auth.uid()));

-- Unlock next leg when previous is delivered
CREATE OR REPLACE FUNCTION public.advance_freight_chain_leg(p_chain_id uuid, p_completed_leg int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_leg int;
BEGIN
  next_leg := p_completed_leg + 1;

  UPDATE public.freight_offers
  SET status = 'delivered', leg_locked = false, updated_at = now()
  WHERE chain_id = p_chain_id AND leg_order = p_completed_leg;

  UPDATE public.freight_offers
  SET leg_locked = false, status = 'assigned', updated_at = now()
  WHERE chain_id = p_chain_id AND leg_order = next_leg;

  UPDATE public.freight_chains
  SET
    current_leg_order = next_leg,
    status = CASE
      WHEN EXISTS (SELECT 1 FROM public.freight_offers WHERE chain_id = p_chain_id AND leg_order = next_leg)
      THEN 'in_progress'
      ELSE 'completed'
    END,
    updated_at = now()
  WHERE id = p_chain_id;

  IF NOT EXISTS (SELECT 1 FROM public.freight_offers WHERE chain_id = p_chain_id AND leg_order = next_leg) THEN
    UPDATE public.freight_chains SET status = 'completed', updated_at = now() WHERE id = p_chain_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_freight_chain_leg(uuid, int) TO authenticated;

-- Demo chained route (idempotent)
DO $$
DECLARE
  cid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.freight_chains WHERE title = 'Tour Nord-Italie Z&D') THEN
    RETURN;
  END IF;

  INSERT INTO public.freight_chains (
    title, client_name, status, total_distance_km, total_revenue,
    total_fuel_cost, total_toll_estimate, total_salary_estimate,
    total_maintenance_estimate, total_insurance_estimate,
    total_net_profit, total_margin_percent, priority, expires_at, notes
  ) VALUES (
    'Tour Nord-Italie Z&D', 'IKEA Logistics', 'available',
    1065, 7455, 630, 85, 1491, 53, 43, 5153, 69.1,
    'high', now() + interval '14 days', 'Chaîne demo — Le Havre → Turin'
  ) RETURNING id INTO cid;

  INSERT INTO public.freight_offers (
    chain_id, leg_order, leg_locked, client_name,
    departure_city, arrival_city, cargo, distance_km, price, price_per_km,
    delivery_date, priority, status, deadline_at
  ) VALUES
  (cid, 1, false, 'IKEA Logistics', 'Le Havre', 'Paris', 'Meubles emballés', 195, 1365, 7.0, CURRENT_DATE + 1, 'high', 'available', now() + interval '3 days'),
  (cid, 2, true, 'IKEA Logistics', 'Paris', 'Lyon', 'Meubles emballés', 465, 2325, 5.0, CURRENT_DATE + 2, 'high', 'reserved', now() + interval '4 days'),
  (cid, 3, true, 'IKEA Logistics', 'Lyon', 'Milan', 'Meubles emballés', 310, 2480, 8.0, CURRENT_DATE + 3, 'high', 'reserved', now() + interval '5 days'),
  (cid, 4, true, 'IKEA Logistics', 'Milan', 'Turin', 'Meubles emballés', 95, 1285, 13.5, CURRENT_DATE + 4, 'high', 'reserved', now() + interval '6 days');
END $$;

COMMENT ON TABLE public.freight_chains IS 'Multi-leg chained freight delivery tours';
