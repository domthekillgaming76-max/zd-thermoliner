-- 062 — Système bancaire RP chauffeur (comptes, transactions, virements admin)

-- ── Comptes bancaires chauffeurs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  rp_iban text NOT NULL,
  bank_name text NOT NULL DEFAULT 'Crédit Agricole Z&D Thermoliner',
  holder_name text NOT NULL,
  holder_pseudo text,
  holder_email text,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id),
  UNIQUE (profile_id),
  UNIQUE (account_number),
  UNIQUE (rp_iban)
);

CREATE INDEX IF NOT EXISTS idx_driver_bank_accounts_profile ON public.driver_bank_accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_bank_accounts_driver ON public.driver_bank_accounts(driver_id);

-- ── Transactions compte chauffeur ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.driver_bank_accounts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'salary', 'bonus', 'refund', 'advance', 'sanction', 'manual_transfer', 'admin_correction', 'other'
  )),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(15,2) NOT NULL DEFAULT 0,
  label text NOT NULL,
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_bank_tx_account ON public.driver_bank_transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_bank_tx_profile ON public.driver_bank_transactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_bank_tx_type ON public.driver_bank_transactions(type);

-- ── Virements admin entreprise → chauffeur ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_account_id uuid REFERENCES public.company_bank_account(id) ON DELETE SET NULL,
  target_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_driver_account_id uuid NOT NULL REFERENCES public.driver_bank_accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'salary', 'bonus', 'refund', 'advance', 'sanction', 'manual_transfer', 'admin_correction'
  )),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  reference text,
  admin_comment text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  company_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  driver_transaction_id uuid REFERENCES public.driver_bank_transactions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_bank_transfers_target ON public.company_bank_transfers(target_profile_id, created_at DESC);

-- ── Étendre driver_payslips ──────────────────────────────────────────────────
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.driver_bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS base_salary numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS km_bonus numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS delivery_bonus numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS extra_bonus numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS deductions numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS payment_transaction_id uuid REFERENCES public.driver_bank_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.driver_payslips ADD COLUMN IF NOT EXISTS pdf_url text;

-- ── Helpers IBAN / numéro compte RP ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_driver_rp_iban(p_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_suffix text;
BEGIN
  v_suffix := upper(substring(replace(p_driver_id::text, '-', '') from 1 for 8));
  RETURN 'ZD76 2026 0000 ' || substring(v_suffix from 1 for 4) || ' ' || substring(v_suffix from 5 for 4);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_driver_account_number(p_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN 'ZD-' || upper(substring(replace(p_driver_id::text, '-', '') from 1 for 12));
END;
$$;

-- ── Création automatique compte chauffeur ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_driver_bank_account(
  p_driver_id uuid,
  p_profile_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver public.drivers%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_account_id uuid;
  v_iban text;
  v_account_number text;
BEGIN
  SELECT * INTO v_driver FROM public.drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_profile FROM public.profiles
  WHERE id = COALESCE(p_profile_id, v_driver.user_id);
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_account_id FROM public.driver_bank_accounts WHERE driver_id = p_driver_id;
  IF v_account_id IS NOT NULL THEN RETURN v_account_id; END IF;

  v_iban := public.generate_driver_rp_iban(p_driver_id);
  v_account_number := public.generate_driver_account_number(p_driver_id);

  INSERT INTO public.driver_bank_accounts (
    profile_id, driver_id, account_number, rp_iban, bank_name,
    holder_name, holder_pseudo, holder_email, balance, status, opened_at
  ) VALUES (
    v_profile.id,
    p_driver_id,
    v_account_number,
    v_iban,
    'Crédit Agricole Z&D Thermoliner',
    COALESCE(v_driver.name, v_profile.full_name, 'Chauffeur'),
    COALESCE(v_driver.pseudo, v_profile.pseudo),
    COALESCE(v_driver.email, v_profile.email),
    0,
    'active',
    now()
  )
  RETURNING id INTO v_account_id;

  RETURN v_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_driver_bank_account(uuid, uuid) TO authenticated;

-- ── Virement admin → chauffeur (atomique) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_transfer_to_driver(
  p_target_profile_id uuid,
  p_type text,
  p_amount numeric,
  p_reason text,
  p_reference text DEFAULT NULL,
  p_admin_comment text DEFAULT NULL,
  p_salary_history_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company public.company_bank_account%ROWTYPE;
  v_driver_account public.driver_bank_accounts%ROWTYPE;
  v_driver_tx_id uuid;
  v_company_tx_id uuid;
  v_transfer_id uuid;
  v_ref text;
  v_new_company_balance numeric(15,2);
  v_new_driver_balance numeric(15,2);
  v_direction text;
  v_driver_label text;
  v_company_desc text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_erp_admin(v_actor) THEN
    RAISE EXCEPTION 'Accès refusé — administrateur requis';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  SELECT * INTO v_driver_account FROM public.driver_bank_accounts
  WHERE profile_id = p_target_profile_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte bancaire chauffeur introuvable ou inactif';
  END IF;

  SELECT * INTO v_company FROM public.company_bank_account LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0)
    RETURNING * INTO v_company;
  END IF;

  v_ref := COALESCE(NULLIF(trim(p_reference), ''), 'TRF-' || upper(substring(gen_random_uuid()::text from 1 for 8)));
  v_direction := CASE WHEN p_type = 'sanction' THEN 'debit' ELSE 'credit' END;
  v_driver_label := COALESCE(NULLIF(trim(p_reason), ''), 'Virement Z&D Thermoliner');
  v_company_desc := v_driver_label || ' — ' || v_driver_account.holder_name;

  IF v_direction = 'credit' AND v_company.balance < p_amount THEN
    RAISE EXCEPTION 'Solde entreprise insuffisant (%.2f € disponible)', v_company.balance;
  END IF;

  v_new_driver_balance := CASE
    WHEN v_direction = 'credit' THEN v_driver_account.balance + p_amount
    ELSE GREATEST(0, v_driver_account.balance - p_amount)
  END;

  v_new_company_balance := CASE
    WHEN v_direction = 'credit' THEN v_company.balance - p_amount
    ELSE v_company.balance + p_amount
  END;

  -- Transaction entreprise
  INSERT INTO public.transactions (
    user_id, driver_id, type, amount, description, category, date,
    auto_generated, created_by, reference, status
  ) VALUES (
    v_actor,
    v_driver_account.driver_id,
    CASE p_type
      WHEN 'salary' THEN 'salary'
      WHEN 'bonus' THEN 'expense'
      WHEN 'sanction' THEN 'expense'
      ELSE 'expense'
    END,
    p_amount,
    v_company_desc,
    CASE p_type WHEN 'salary' THEN 'Salaires' ELSE 'Virements chauffeurs' END,
    CURRENT_DATE,
    true,
    v_actor,
    v_ref,
    'posted'
  )
  RETURNING id INTO v_company_tx_id;

  UPDATE public.company_bank_account
  SET balance = v_new_company_balance, updated_at = now()
  WHERE id = v_company.id;

  -- Transaction chauffeur
  INSERT INTO public.driver_bank_transactions (
    account_id, profile_id, type, direction, amount, balance_after,
    label, reference, metadata, created_by
  ) VALUES (
    v_driver_account.id,
    p_target_profile_id,
    p_type,
    v_direction,
    p_amount,
    v_new_driver_balance,
    v_driver_label,
    v_ref,
    jsonb_build_object(
      'company_transaction_id', v_company_tx_id,
      'salary_history_id', p_salary_history_id,
      'admin_comment', p_admin_comment
    ),
    v_actor
  )
  RETURNING id INTO v_driver_tx_id;

  UPDATE public.driver_bank_accounts
  SET balance = v_new_driver_balance, updated_at = now()
  WHERE id = v_driver_account.id;

  INSERT INTO public.company_bank_transfers (
    company_account_id, target_profile_id, target_driver_account_id,
    type, amount, reason, reference, admin_comment, status,
    company_transaction_id, driver_transaction_id, created_by
  ) VALUES (
    v_company.id, p_target_profile_id, v_driver_account.id,
    p_type, p_amount, p_reason, v_ref, p_admin_comment, 'completed',
    v_company_tx_id, v_driver_tx_id, v_actor
  )
  RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'driver_transaction_id', v_driver_tx_id,
    'company_transaction_id', v_company_tx_id,
    'reference', v_ref,
    'driver_balance', v_new_driver_balance,
    'company_balance', v_new_company_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_transfer_to_driver(uuid, text, numeric, text, text, text, uuid) TO authenticated;

-- ── RLS driver_bank_accounts ─────────────────────────────────────────────────
ALTER TABLE public.driver_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_bank_accounts_select" ON public.driver_bank_accounts;
CREATE POLICY "driver_bank_accounts_select" ON public.driver_bank_accounts
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()) OR public.is_hr_manager());

DROP POLICY IF EXISTS "driver_bank_accounts_admin" ON public.driver_bank_accounts;
CREATE POLICY "driver_bank_accounts_admin" ON public.driver_bank_accounts
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- ── RLS driver_bank_transactions ─────────────────────────────────────────────
ALTER TABLE public.driver_bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_bank_tx_select" ON public.driver_bank_transactions;
CREATE POLICY "driver_bank_tx_select" ON public.driver_bank_transactions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()) OR public.is_hr_manager());

DROP POLICY IF EXISTS "driver_bank_tx_admin" ON public.driver_bank_transactions;
CREATE POLICY "driver_bank_tx_admin" ON public.driver_bank_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- ── RLS company_bank_transfers ───────────────────────────────────────────────
ALTER TABLE public.company_bank_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_bank_transfers_admin" ON public.company_bank_transfers;
CREATE POLICY "company_bank_transfers_admin" ON public.company_bank_transfers
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "company_bank_transfers_own" ON public.company_bank_transfers;
CREATE POLICY "company_bank_transfers_own" ON public.company_bank_transfers
  FOR SELECT TO authenticated
  USING (target_profile_id = auth.uid());

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_bank_transactions;

COMMENT ON TABLE public.driver_bank_accounts IS 'Compte bancaire RP fictif par chauffeur — simulation ETS2/ATS';
COMMENT ON TABLE public.driver_bank_transactions IS 'Historique transactions compte chauffeur RP';
COMMENT ON TABLE public.company_bank_transfers IS 'Virements admin entreprise vers comptes chauffeurs';

-- ── Reset RP : nettoyage comptes chauffeurs ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_driver_bank_rp_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_erp_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF to_regclass('public.company_bank_transfers') IS NOT NULL THEN
    DELETE FROM public.company_bank_transfers;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('company_bank_transfers', v_count);
  END IF;

  IF to_regclass('public.driver_bank_transactions') IS NOT NULL THEN
    DELETE FROM public.driver_bank_transactions;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_bank_transactions', v_count);
  END IF;

  IF to_regclass('public.driver_bank_accounts') IS NOT NULL THEN
    UPDATE public.driver_bank_accounts SET balance = 0, updated_at = now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_bank_accounts_reset', v_count);
  END IF;

  IF to_regclass('public.driver_payslips') IS NOT NULL THEN
    DELETE FROM public.driver_payslips;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_payslips', v_count);
  END IF;

  IF to_regclass('public.company_cards') IS NOT NULL THEN
    DELETE FROM public.company_cards;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('company_cards', v_count);
  END IF;

  IF to_regclass('public.driver_documents') IS NOT NULL THEN
    DELETE FROM public.driver_documents WHERE doc_type IN ('contract', 'company_card', 'payslip');
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_hr_documents', v_count);
  END IF;

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_driver_bank_rp_data() TO authenticated;
