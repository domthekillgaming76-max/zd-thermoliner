-- 094 — Décaissements personnels saisis par les chauffeurs.

CREATE SEQUENCE IF NOT EXISTS public.driver_personal_debit_seq START 1;

CREATE OR REPLACE FUNCTION public.create_driver_personal_debit(
  p_amount numeric,
  p_label text,
  p_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_account public.driver_bank_accounts%ROWTYPE;
  v_transaction public.driver_bank_transactions%ROWTYPE;
  v_amount numeric(15,2);
  v_balance numeric(15,2);
  v_label text;
  v_category text;
  v_reference text;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  v_amount := ROUND(COALESCE(p_amount, 0), 2);
  v_label := trim(COALESCE(p_label, ''));
  v_category := trim(COALESCE(p_category, ''));

  IF v_amount <= 0 OR v_amount > 100000 THEN
    RAISE EXCEPTION 'Le montant doit être compris entre 0,01 € et 100 000 €';
  END IF;
  IF length(v_label) < 3 OR length(v_label) > 120 THEN
    RAISE EXCEPTION 'Le motif doit contenir entre 3 et 120 caractères';
  END IF;
  IF v_category NOT IN (
    'Achats personnels', 'Alimentation', 'Loisirs', 'Logement',
    'Transport personnel', 'Retrait espèces', 'Abonnement', 'Autre'
  ) THEN
    RAISE EXCEPTION 'Catégorie invalide';
  END IF;

  SELECT * INTO v_account
  FROM public.driver_bank_accounts
  WHERE profile_id = v_profile_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte bancaire chauffeur actif requis';
  END IF;
  IF COALESCE(v_account.balance, 0) < v_amount THEN
    RAISE EXCEPTION 'Solde insuffisant (%.2f € disponible, %.2f € demandé)', v_account.balance, v_amount;
  END IF;

  v_balance := ROUND(v_account.balance - v_amount, 2);
  v_reference := 'PERS-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.driver_personal_debit_seq')::text, 6, '0');

  INSERT INTO public.driver_bank_transactions (
    account_id, profile_id, type, direction, amount, balance_after,
    label, reference, metadata, created_by
  ) VALUES (
    v_account.id, v_profile_id, 'other', 'debit', v_amount, v_balance,
    v_label, v_reference,
    jsonb_build_object('category', v_category, 'source', 'driver_personal_debit'),
    v_profile_id
  )
  RETURNING * INTO v_transaction;

  UPDATE public.driver_bank_accounts
  SET balance = v_balance, updated_at = now()
  WHERE id = v_account.id;

  RETURN jsonb_build_object(
    'ok', true,
    'transaction', to_jsonb(v_transaction),
    'balance', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_driver_personal_debit(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_driver_personal_debit(numeric, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
