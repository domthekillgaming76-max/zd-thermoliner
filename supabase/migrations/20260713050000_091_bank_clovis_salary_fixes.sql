-- 091 — Banque entreprise : prélèvements Clovis et salaires chauffeurs cohérents.

-- Chaque salaire déjà débité par une feuille de route est crédité sur le compte
-- chauffeur sans créer un deuxième débit sur le compte entreprise.
CREATE OR REPLACE FUNCTION public.credit_road_sheet_salary_to_driver(
  p_company_transaction_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_driver public.drivers%ROWTYPE;
  v_account public.driver_bank_accounts%ROWTYPE;
  v_salary public.driver_salary_history%ROWTYPE;
  v_driver_tx_id uuid;
  v_transfer_id uuid;
  v_company_account_id uuid;
  v_reference text;
  v_label text;
  v_new_balance numeric(15,2);
  v_sheet_date date;
  v_departure text;
  v_arrival text;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_company_transaction_id
  FOR UPDATE;

  IF NOT FOUND OR v_tx.type <> 'salary' OR v_tx.road_sheet_id IS NULL OR COALESCE(v_tx.status, 'posted') <> 'posted' THEN
    RETURN jsonb_build_object('ok', false, 'skipped', true, 'reason', 'not_a_road_sheet_salary');
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE id = v_tx.driver_id;
  IF NOT FOUND OR v_driver.user_id IS NULL THEN
    RAISE EXCEPTION 'Chauffeur ou profil lié introuvable pour la feuille de route %', v_tx.road_sheet_id;
  END IF;

  SELECT * INTO v_salary
  FROM public.driver_salary_history
  WHERE road_sheet_id = v_tx.road_sheet_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_salary.payment_status = 'paid' AND v_salary.transaction_id IS DISTINCT FROM v_tx.id THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'salary_already_paid');
  END IF;

  v_reference := 'RS-SAL-' || replace(v_tx.road_sheet_id::text, '-', '');
  PERFORM pg_advisory_xact_lock(hashtext(v_reference));

  SELECT dbt.id INTO v_driver_tx_id
  FROM public.driver_bank_transactions dbt
  WHERE dbt.profile_id = v_driver.user_id
    AND dbt.reference = v_reference
  LIMIT 1;

  IF v_driver_tx_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'driver_transaction_id', v_driver_tx_id);
  END IF;

  PERFORM public.ensure_driver_bank_account(v_driver.id, v_driver.user_id);

  SELECT * INTO v_account
  FROM public.driver_bank_accounts
  WHERE driver_id = v_driver.id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte bancaire actif introuvable pour %', COALESCE(v_driver.name, 'chauffeur');
  END IF;

  SELECT
    COALESCE(rs.date, CURRENT_DATE),
    COALESCE(rs.departure, rs.departure_city, 'Départ'),
    COALESCE(rs.arrival, rs.arrival_city, 'Arrivée')
  INTO v_sheet_date, v_departure, v_arrival
  FROM public.road_sheets rs
  WHERE rs.id = v_tx.road_sheet_id;

  v_label := 'Salaire livraison ' || COALESCE(v_departure, 'Départ') || ' → ' || COALESCE(v_arrival, 'Arrivée');
  v_new_balance := ROUND(COALESCE(v_account.balance, 0) + v_tx.amount, 2);

  INSERT INTO public.driver_bank_transactions (
    account_id, profile_id, type, direction, amount, balance_after,
    label, reference, metadata, created_by
  ) VALUES (
    v_account.id, v_driver.user_id, 'salary', 'credit', ROUND(v_tx.amount, 2),
    v_new_balance, v_label, v_reference,
    jsonb_build_object(
      'road_sheet_id', v_tx.road_sheet_id,
      'company_transaction_id', v_tx.id,
      'automatic', true
    ),
    COALESCE(v_tx.created_by, v_tx.user_id, v_driver.user_id)
  )
  RETURNING id INTO v_driver_tx_id;

  UPDATE public.driver_bank_accounts
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_account.id;

  IF v_salary.id IS NULL THEN
    INSERT INTO public.driver_salary_history (
      driver_id, period_month, period_year, base_salary, bonus, penalty,
      net_amount, road_sheet_id, notes, payment_status, payment_date,
      transaction_id
    ) VALUES (
      v_driver.id,
      EXTRACT(MONTH FROM COALESCE(v_sheet_date, CURRENT_DATE))::integer,
      EXTRACT(YEAR FROM COALESCE(v_sheet_date, CURRENT_DATE))::integer,
      ROUND(v_tx.amount, 2), 0, 0, ROUND(v_tx.amount, 2), v_tx.road_sheet_id,
      v_label, 'paid', CURRENT_DATE, v_tx.id
    )
    RETURNING * INTO v_salary;
  ELSE
    UPDATE public.driver_salary_history
    SET payment_status = 'paid',
        payment_date = COALESCE(payment_date, CURRENT_DATE),
        transaction_id = v_tx.id,
        net_amount = CASE WHEN COALESCE(net_amount, 0) > 0 THEN net_amount ELSE ROUND(v_tx.amount, 2) END,
        notes = COALESCE(notes, v_label)
    WHERE id = v_salary.id;
  END IF;

  SELECT id INTO v_company_account_id
  FROM public.company_bank_account
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.company_bank_transfers (
    company_account_id, target_profile_id, target_driver_account_id,
    type, amount, reason, reference, status,
    company_transaction_id, driver_transaction_id, created_by
  ) VALUES (
    v_company_account_id, v_driver.user_id, v_account.id,
    'salary', ROUND(v_tx.amount, 2), v_label, v_reference, 'completed',
    v_tx.id, v_driver_tx_id, COALESCE(v_tx.created_by, v_tx.user_id, v_driver.user_id)
  )
  RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'amount', ROUND(v_tx.amount, 2),
    'driver_transaction_id', v_driver_tx_id,
    'transfer_id', v_transfer_id,
    'driver_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_road_sheet_salary_to_driver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_road_sheet_salary_to_driver(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_credit_road_sheet_salary_to_driver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'salary' AND NEW.road_sheet_id IS NOT NULL AND COALESCE(NEW.status, 'posted') = 'posted' THEN
    PERFORM public.credit_road_sheet_salary_to_driver(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_credit_road_sheet_salary_to_driver() FROM PUBLIC;

DROP TRIGGER IF EXISTS credit_road_sheet_salary_to_driver_trigger ON public.transactions;
CREATE TRIGGER credit_road_sheet_salary_to_driver_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_credit_road_sheet_salary_to_driver();

-- Rattrapage idempotent des salaires historiques débités mais non crédités.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id
    FROM public.transactions
    WHERE type = 'salary'
      AND road_sheet_id IS NOT NULL
      AND COALESCE(status, 'posted') = 'posted'
    ORDER BY date, created_at
  LOOP
    BEGIN
      PERFORM public.credit_road_sheet_salary_to_driver(rec.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Crédit chauffeur ignoré pour transaction %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Le traitement Clovis rattrape toutes les dates manquantes, pas seulement la
-- date courante. L'anti-doublon reste assuré par (rental_id, charge_date).
CREATE OR REPLACE FUNCTION public.process_daily_clovis_rental_charges(
  p_charge_date date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_reference text;
  v_label text;
  v_day_num integer;
  v_next_charge_date date;
  v_failed boolean;
BEGIN
  FOR rec IN
    SELECT r.*
    FROM public.clovis_vehicle_rentals r
    WHERE r.status = 'active'
      AND COALESCE(r.last_charge_date, r.created_at::date - 1) < p_charge_date
    ORDER BY r.created_at, r.id
  LOOP
    v_next_charge_date := COALESCE(rec.last_charge_date + 1, rec.created_at::date);
    v_day_num := COALESCE(rec.days_rented, 0) + 1;
    v_failed := false;

    WHILE v_next_charge_date <= p_charge_date LOOP
      v_reference := rec.contract_ref || '-D' || v_day_num;
      v_label := 'Location Clovis — ' || rec.vehicle_label || ' (jour ' || v_day_num || ')';

      BEGIN
        PERFORM public._clovis_charge_rental_day(
          rec.id, rec.profile_id, rec.driver_id, rec.daily_rate,
          v_label, v_reference, v_next_charge_date
        );
        v_count := v_count + 1;
        v_day_num := v_day_num + 1;
        v_next_charge_date := v_next_charge_date + 1;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'rental_id', rec.id,
          'charge_date', v_next_charge_date,
          'error', SQLERRM
        ));
        v_failed := true;
      END;

      EXIT WHEN v_failed;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_errors) = 0,
    'charged', v_count,
    'charge_date', p_charge_date,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_daily_clovis_rental_charges(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_daily_clovis_rental_charges(date) TO service_role;

-- Applique immédiatement les journées manquantes lors du déploiement SQL.
DO $$
BEGIN
  PERFORM public.process_daily_clovis_rental_charges(CURRENT_DATE);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Rattrapage Clovis initial incomplet: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
