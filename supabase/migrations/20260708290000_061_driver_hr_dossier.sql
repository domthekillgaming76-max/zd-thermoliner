-- 061 — Dossier RH chauffeur (contrat, carte entreprise, fiches de paie)

-- ── Extend driver_documents for HR dossier ───────────────────────────────────
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.driver_documents DROP CONSTRAINT IF EXISTS driver_documents_doc_type_check;
ALTER TABLE public.driver_documents ADD CONSTRAINT driver_documents_doc_type_check
  CHECK (doc_type IN ('license', 'medical', 'adr', 'identity', 'contract', 'insurance', 'company_card', 'payslip', 'other'));

CREATE INDEX IF NOT EXISTS idx_driver_documents_hr ON public.driver_documents(driver_id, doc_type);

-- ── Company cards (fictional RP) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  bank_name text NOT NULL DEFAULT 'Crédit Agricole',
  holder_name text NOT NULL,
  masked_number text NOT NULL DEFAULT '**** **** **** 2026',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  spending_limit numeric(12,2) NOT NULL DEFAULT 5000,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id)
);

CREATE INDEX IF NOT EXISTS idx_company_cards_driver ON public.company_cards(driver_id);

-- ── Driver payslips ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  km_total numeric(12,2) NOT NULL DEFAULT 0,
  deliveries_total integer NOT NULL DEFAULT 0,
  bonus_amount numeric(12,2) NOT NULL DEFAULT 0,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  deductions_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  bank_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  salary_history_id uuid REFERENCES public.driver_salary_history(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salary_history_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_payslips_driver ON public.driver_payslips(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payslips_period ON public.driver_payslips(year, month);

-- ── HR access helpers ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_hr_manager(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('pdg', 'patron', 'admin', 'directeur', 'hr')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_driver_record(p_driver_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = p_driver_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_hr_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_driver_record(uuid, uuid) TO authenticated;

-- ── RLS company_cards ────────────────────────────────────────────────────────
ALTER TABLE public.company_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_cards_select" ON public.company_cards;
CREATE POLICY "company_cards_select" ON public.company_cards
  FOR SELECT TO authenticated
  USING (public.is_own_driver_record(driver_id) OR public.is_hr_manager());

DROP POLICY IF EXISTS "company_cards_manage" ON public.company_cards;
CREATE POLICY "company_cards_manage" ON public.company_cards
  FOR ALL TO authenticated
  USING (public.is_hr_manager())
  WITH CHECK (public.is_hr_manager());

-- ── RLS driver_payslips ──────────────────────────────────────────────────────
ALTER TABLE public.driver_payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_payslips_select" ON public.driver_payslips;
CREATE POLICY "driver_payslips_select" ON public.driver_payslips
  FOR SELECT TO authenticated
  USING (public.is_own_driver_record(driver_id) OR public.is_hr_manager());

DROP POLICY IF EXISTS "driver_payslips_manage" ON public.driver_payslips;
CREATE POLICY "driver_payslips_manage" ON public.driver_payslips
  FOR ALL TO authenticated
  USING (public.is_hr_manager())
  WITH CHECK (public.is_hr_manager());

COMMENT ON TABLE public.company_cards IS 'Carte entreprise fictive RP — aucun paiement réel';
COMMENT ON TABLE public.driver_payslips IS 'Fiches de paie générées automatiquement lors du versement salaire';
