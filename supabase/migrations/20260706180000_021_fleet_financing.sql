-- 021 — Fleet financing for Bank enterprise module

CREATE TABLE IF NOT EXISTS public.fleet_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL CHECK (asset_type IN ('truck', 'trailer')),
  asset_name text NOT NULL,
  lender text DEFAULT 'Crédit Flotte Z&D',
  principal decimal(12,2) NOT NULL,
  remaining_capital decimal(12,2) NOT NULL,
  monthly_payment decimal(12,2) NOT NULL,
  interest_rate decimal(5,2) DEFAULT 3.50,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paid', 'default')),
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fleet_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fleet_loans" ON public.fleet_loans;
CREATE POLICY "select_fleet_loans" ON public.fleet_loans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_fleet_loans" ON public.fleet_loans;
CREATE POLICY "manage_fleet_loans" ON public.fleet_loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fleet_loans_status ON public.fleet_loans(status);
CREATE INDEX IF NOT EXISTS idx_fleet_loans_asset_type ON public.fleet_loans(asset_type);

-- Seed sample loans from trucks when table is empty
INSERT INTO public.fleet_loans (asset_type, asset_name, lender, principal, remaining_capital, monthly_payment, interest_rate, truck_id, end_date)
SELECT
  'truck',
  COALESCE(NULLIF(TRIM(COALESCE(t.model, '')), ''), t.registration, 'Camion'),
  'Crédit Flotte Z&D',
  ROUND(85000::numeric, 2),
  ROUND((85000 * 0.72)::numeric, 2),
  ROUND((85000 * 0.018)::numeric, 2),
  3.20,
  t.id,
  (CURRENT_DATE + INTERVAL '36 months')::date
FROM public.trucks t
WHERE NOT EXISTS (SELECT 1 FROM public.fleet_loans LIMIT 1)
  AND t.status IN ('active', 'maintenance')
LIMIT 6;

INSERT INTO public.fleet_loans (asset_type, asset_name, lender, principal, remaining_capital, monthly_payment, interest_rate, end_date)
SELECT 'trailer', 'Semi-remorque frigo #1', 'Crédit Flotte Z&D', 42000, 30240, 756, 2.90, (CURRENT_DATE + INTERVAL '48 months')::date
WHERE NOT EXISTS (SELECT 1 FROM public.fleet_loans WHERE asset_type = 'trailer');

INSERT INTO public.fleet_loans (asset_type, asset_name, lender, principal, remaining_capital, monthly_payment, interest_rate, end_date)
SELECT 'trailer', 'Semi-remorque bâchée #2', 'Crédit Flotte Z&D', 38000, 26600, 684, 2.90, (CURRENT_DATE + INTERVAL '42 months')::date
WHERE (SELECT COUNT(*) FROM public.fleet_loans WHERE asset_type = 'trailer') < 2;
