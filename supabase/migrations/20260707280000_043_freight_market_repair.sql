-- 043 — Repair freight market demo data + safer expiry (additive)

-- Refresh demo offers: keep board populated after client-side expiry
UPDATE public.freight_offers
SET
  status = 'available',
  expires_at = now() + interval '14 days',
  updated_at = now()
WHERE status IN ('available', 'expired', 'reserved')
  AND client_name IN (
    'Carrefour Supply', 'BASF Chemicals', 'Metro Cash & Carry', 'IKEA Logistics',
    'Leroy Merlin', 'Amazon FBA', 'Danone', 'TotalEnergies', 'Decathlon',
    'Auchan', 'Renault Trucks', 'Monoprix'
  );

-- Re-seed if table is still empty (e.g. first install missed 042)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.freight_offers LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.freight_offers (
    client_name, departure_city, arrival_city, departure_country, arrival_country,
    cargo, weight_kg, pallets, temperature_required, temperature_min, temperature_max,
    adr_required, distance_km, price, price_per_km,
    loading_date, delivery_date, priority, status, expires_at, notes
  ) VALUES
  ('Carrefour Supply', 'Lyon', 'Marseille', 'France', 'France', 'Produits frais', 18500, 28, true, 2, 6, false, 315, 1890, 6.0, CURRENT_DATE + 1, CURRENT_DATE + 2, 'urgent', 'available', now() + interval '14 days', 'Demo Z&D'),
  ('BASF Chemicals', 'Rotterdam', 'Strasbourg', 'Pays-Bas', 'France', 'Matières ADR', 22000, 22, false, null, null, true, 620, 5580, 9.0, CURRENT_DATE + 2, CURRENT_DATE + 4, 'high', 'available', now() + interval '14 days', 'Demo Z&D'),
  ('Metro Cash & Carry', 'Paris', 'Bruxelles', 'France', 'Belgique', 'Surgelés', 24000, 33, true, -22, -18, false, 310, 2480, 8.0, CURRENT_DATE + 1, CURRENT_DATE + 3, 'normal', 'available', now() + interval '14 days', 'Demo Z&D'),
  ('IKEA Logistics', 'Malmö', 'Milano', 'Suède', 'Italie', 'Meubles', 28000, 40, false, null, null, false, 1850, 12950, 7.0, CURRENT_DATE + 3, CURRENT_DATE + 6, 'normal', 'available', now() + interval '14 days', 'Demo Z&D'),
  ('Renault Trucks', 'Paris', 'Valence', 'France', 'France', 'Pièces détachées', 6500, 12, false, null, null, false, 650, 6500, 10.0, CURRENT_DATE + 1, CURRENT_DATE + 3, 'high', 'available', now() + interval '14 days', 'Demo Z&D');

  INSERT INTO public.freight_profitability (offer_id, revenue, fuel_cost, toll_estimate, salary_estimate, maintenance_estimate, insurance_estimate, net_profit, margin_percent, cost_per_km, profit_per_km, computed_at)
  SELECT o.id, o.price,
    ROUND(o.distance_km * 0.32 * 1.85 / 100, 2), ROUND(o.distance_km * 0.08, 2),
    ROUND(o.price * 0.20, 2), ROUND(o.distance_km * 0.05, 2), ROUND(o.distance_km * 0.04, 2),
    ROUND(o.price * 0.55, 2), 55, 1.2, 2.5, now()
  FROM public.freight_offers o
  WHERE NOT EXISTS (SELECT 1 FROM public.freight_profitability p WHERE p.offer_id = o.id);
END $$;

-- Server-side expiry function (managers / cron — not client-side)
CREATE OR REPLACE FUNCTION public.expire_freight_offers()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.freight_offers
  SET status = 'expired', updated_at = now()
  WHERE status = 'available'
    AND expires_at IS NOT NULL
    AND expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_freight_offers() TO authenticated;

-- Broader read access: all authenticated users see market offers (available/reserved/expired)
DROP POLICY IF EXISTS "freight_offers_select" ON public.freight_offers;
CREATE POLICY "freight_offers_select" ON public.freight_offers
  FOR SELECT TO authenticated
  USING (
    public.is_freight_manager(auth.uid())
    OR status IN ('available', 'reserved', 'expired')
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
