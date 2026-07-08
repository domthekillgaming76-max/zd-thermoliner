-- 048 — Phase 4 Professional Finance Module (additive)

-- ── Finance settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_rate numeric(5,2) NOT NULL DEFAULT 20,
  delivery_bonus_eur numeric(10,2) NOT NULL DEFAULT 25,
  default_salary_per_km numeric(8,4) NOT NULL DEFAULT 0.35,
  invoice_prefix text NOT NULL DEFAULT 'ZD',
  auto_invoice_on_validation boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.finance_settings (vat_rate, delivery_bonus_eur, default_salary_per_km)
SELECT 20, 25, 0.35
WHERE NOT EXISTS (SELECT 1 FROM public.finance_settings LIMIT 1);

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_settings_select" ON public.finance_settings;
CREATE POLICY "finance_settings_select" ON public.finance_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "finance_settings_manage" ON public.finance_settings;
CREATE POLICY "finance_settings_manage" ON public.finance_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('pdg', 'patron', 'admin') OR public.is_dom76_owner(p.email))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('pdg', 'patron', 'admin') OR public.is_dom76_owner(p.email))
    )
  );

-- ── Extend invoices ────────────────────────────────────────────────────────────
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS route_summary text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS distance_km numeric(12,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cargo_type text;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_status_check
  CHECK (payment_status IN ('draft', 'sent', 'paid', 'late', 'overdue', 'cancelled'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_transaction_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_transaction_id_fkey
      FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Extend driver salary history ─────────────────────────────────────────────
ALTER TABLE public.driver_salary_history ADD COLUMN IF NOT EXISTS km_rate numeric(8,4) DEFAULT 0;
ALTER TABLE public.driver_salary_history ADD COLUMN IF NOT EXISTS km_total numeric(12,2) DEFAULT 0;
ALTER TABLE public.driver_salary_history ADD COLUMN IF NOT EXISTS delivery_bonus numeric(12,2) DEFAULT 0;
ALTER TABLE public.driver_salary_history ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

-- ── Invoice number generator: ZD-YYYY-MM-0001 ────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_zd_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  seq int;
BEGIN
  prefix := 'ZD-' || to_char(now(), 'YYYY-MM');
  SELECT COUNT(*) + 1 INTO seq
  FROM public.invoices
  WHERE invoice_number LIKE prefix || '-%';
  RETURN prefix || '-' || lpad(seq::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_zd_invoice_number() TO authenticated;

COMMENT ON FUNCTION public.generate_zd_invoice_number IS 'Generates sequential invoice numbers ZD-YYYY-MM-0001';
