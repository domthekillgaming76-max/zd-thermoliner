-- 080 — Location Clovis : débit compte entreprise + photos catalogue

ALTER TABLE public.clovis_rental_catalog
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Photos catalogue (fichiers servis depuis /public/clovis/)
UPDATE public.clovis_rental_catalog SET photo_url = '/clovis/renault-t-high.webp' WHERE label = 'Renault T High';
UPDATE public.clovis_rental_catalog SET photo_url = '/clovis/renault-t-evolution.webp' WHERE label = 'Renault T Evolution';
UPDATE public.clovis_rental_catalog SET photo_url = '/clovis/renault-t-optifuel.webp' WHERE label = 'Renault T Optifuel';
UPDATE public.clovis_rental_catalog SET photo_url = '/clovis/renault-t-racing.webp' WHERE label = 'Renault T Racing Edition';
UPDATE public.clovis_rental_catalog SET photo_url = '/clovis/renault-t-crystal.webp' WHERE label = 'Renault T Crystal';

-- Solde entreprise (lecture chauffeur/admin pour le salon Clovis)
CREATE OR REPLACE FUNCTION public.get_clovis_company_balance()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(15,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  SELECT balance INTO v_balance FROM public.company_bank_account LIMIT 1;
  RETURN COALESCE(v_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clovis_company_balance() TO authenticated;

-- Prélèvement sur le compte ENTREPRISE (plus sur le compte chauffeur)
CREATE OR REPLACE FUNCTION public._clovis_charge_rental_day(
  p_rental_id uuid,
  p_profile_id uuid,
  p_driver_id uuid,
  p_amount numeric,
  p_label text,
  p_reference text,
  p_charge_date date DEFAULT CURRENT_DATE
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company public.company_bank_account%ROWTYPE;
  v_company_tx_id uuid;
  v_new_company_balance numeric(15,2);
  v_holder_name text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant de location invalide';
  END IF;

  SELECT * INTO v_company FROM public.company_bank_account LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0)
    RETURNING * INTO v_company;
  END IF;

  IF v_company.balance < p_amount THEN
    RAISE EXCEPTION 'Solde entreprise insuffisant (%.2f € disponible, %.2f € requis)', v_company.balance, p_amount;
  END IF;

  SELECT COALESCE(NULLIF(trim(pseudo), ''), NULLIF(trim(full_name), ''), 'Chauffeur')
  INTO v_holder_name
  FROM public.profiles WHERE id = p_profile_id;

  v_new_company_balance := v_company.balance - p_amount;

  INSERT INTO public.transactions (
    user_id, driver_id, type, amount, description, category, date,
    auto_generated, created_by, reference, status
  ) VALUES (
    p_profile_id,
    p_driver_id,
    'rent',
    p_amount,
    p_label || ' — Clovis Location (' || v_holder_name || ')',
    'Location véhicule',
    p_charge_date,
    true,
    p_profile_id,
    p_reference,
    'posted'
  )
  RETURNING id INTO v_company_tx_id;

  UPDATE public.company_bank_account
  SET balance = v_new_company_balance, updated_at = now()
  WHERE id = v_company.id;

  INSERT INTO public.clovis_rental_charges (
    rental_id, profile_id, charge_date, amount, reference,
    driver_transaction_id, company_transaction_id
  ) VALUES (
    p_rental_id, p_profile_id, p_charge_date, p_amount, p_reference,
    NULL, v_company_tx_id
  )
  ON CONFLICT (rental_id, charge_date) DO NOTHING;

  UPDATE public.clovis_vehicle_rentals
  SET
    total_charged = total_charged + p_amount,
    days_rented = days_rented + 1,
    last_charge_date = p_charge_date,
    updated_at = now()
  WHERE id = p_rental_id;

  RETURN v_company_tx_id;
END;
$$;

-- Démarrer location : plus besoin du compte bancaire chauffeur
CREATE OR REPLACE FUNCTION public.start_clovis_rental(p_catalog_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_driver public.drivers%ROWTYPE;
  v_catalog public.clovis_rental_catalog%ROWTYPE;
  v_company_balance numeric(15,2);
  v_rental_id uuid;
  v_ref text;
  v_label text;
  v_today date := CURRENT_DATE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE user_id = v_user AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil chauffeur actif requis pour louer un véhicule Clovis';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clovis_vehicle_rentals
    WHERE driver_id = v_driver.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà un véhicule Clovis en location — restituez-le avant d''en louer un autre';
  END IF;

  SELECT * INTO v_catalog FROM public.clovis_rental_catalog
  WHERE id = p_catalog_id AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Véhicule indisponible à la location';
  END IF;

  SELECT balance INTO v_company_balance FROM public.company_bank_account LIMIT 1;
  v_company_balance := COALESCE(v_company_balance, 0);
  IF v_company_balance < v_catalog.daily_rate THEN
    RAISE EXCEPTION 'Solde entreprise insuffisant (%.2f € disponible, %.2f € requis pour la 1ère journée)',
      v_company_balance, v_catalog.daily_rate;
  END IF;

  v_ref := 'CLOVIS-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  v_label := 'Location Clovis — ' || v_catalog.label || ' (jour 1)';

  INSERT INTO public.clovis_vehicle_rentals (
    catalog_id, profile_id, driver_id, status, daily_rate, vehicle_label,
    contract_ref, last_charge_date, total_charged, days_rented
  ) VALUES (
    v_catalog.id, v_user, v_driver.id, 'active', v_catalog.daily_rate,
    v_catalog.label, v_ref, NULL, 0, 0
  )
  RETURNING id INTO v_rental_id;

  PERFORM public._clovis_charge_rental_day(
    v_rental_id, v_user, v_driver.id, v_catalog.daily_rate, v_label, v_ref || '-D1', v_today
  );

  RETURN jsonb_build_object(
    'ok', true,
    'rental_id', v_rental_id,
    'contract_ref', v_ref,
    'daily_rate', v_catalog.daily_rate,
    'vehicle_label', v_catalog.label,
    'message', 'Location Clovis activée — ' || v_catalog.daily_rate || ' € prélevés sur le compte entreprise'
  );
END;
$$;

COMMENT ON FUNCTION public._clovis_charge_rental_day IS
  'Débit journalier location Clovis sur company_bank_account (charge fixe entreprise)';
