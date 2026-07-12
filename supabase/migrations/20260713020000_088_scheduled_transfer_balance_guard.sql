-- 088 — Un virement programmé reste en attente et ne modifie pas le solde
-- avant son exécution effective.
CREATE OR REPLACE FUNCTION public.post_company_transaction(
  p_type text,
  p_amount numeric,
  p_description text,
  p_category text DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE,
  p_reference text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_road_sheet_id uuid DEFAULT NULL,
  p_truck_id uuid DEFAULT NULL,
  p_garage_id uuid DEFAULT NULL,
  p_auto_generated boolean DEFAULT true,
  p_source text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_user_id, auth.uid());
  v_account public.company_bank_account%ROWTYPE;
  v_delta numeric(15,2);
  v_balance numeric(15,2);
  v_status text;
  v_tx public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  IF p_type NOT IN ('income','expense','salary','bonus','penalty','fuel','toll','maintenance','rent','insurance','tax','transfer') THEN
    RAISE EXCEPTION 'Type de transaction invalide: %', p_type;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à 0';
  END IF;

  SELECT * INTO v_account FROM public.company_bank_account ORDER BY updated_at NULLS LAST LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0)
    RETURNING * INTO v_account;
  END IF;

  v_status := CASE WHEN p_source = 'scheduled_transfer' THEN 'pending' ELSE 'posted' END;
  v_delta := CASE
    WHEN v_status = 'pending' THEN 0
    WHEN p_type IN ('income','bonus') THEN p_amount
    ELSE -p_amount
  END;
  v_balance := ROUND(COALESCE(v_account.balance, 0) + v_delta, 2);

  INSERT INTO public.transactions (
    user_id, driver_id, road_sheet_id, truck_id, garage_id, type, amount,
    description, category, date, auto_generated, created_by, reference,
    balance_after, status, source, metadata
  ) VALUES (
    v_actor, p_driver_id, p_road_sheet_id, p_truck_id, p_garage_id, p_type,
    ROUND(p_amount, 2), p_description, p_category, COALESCE(p_date, CURRENT_DATE),
    COALESCE(p_auto_generated, true), v_actor, p_reference, v_balance,
    v_status, COALESCE(NULLIF(p_source, ''), 'system'), COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING * INTO v_tx;

  IF v_status = 'posted' THEN
    UPDATE public.company_bank_account
    SET balance = v_balance, updated_at = now()
    WHERE id = v_account.id;
  END IF;
  RETURN v_tx;
END;
$$;

NOTIFY pgrst, 'reload schema';
