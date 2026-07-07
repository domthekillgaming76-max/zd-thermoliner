-- 020_fix_transactions_bank_schema.sql
-- Align transactions table with Bank module expectations (safe/idempotent).

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'income', 'expense', 'salary', 'bonus', 'penalty', 'fuel', 'toll',
    'maintenance', 'rent', 'insurance', 'tax', 'transfer'
  ));

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS garage_id uuid REFERENCES public.garages(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_after decimal(12,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS auto_generated boolean DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'posted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_status_check
      CHECK (status IS NULL OR status IN ('posted', 'pending'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_auto_road_sheet_type
  ON public.transactions (road_sheet_id, type)
  WHERE auto_generated = true AND road_sheet_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recalculate_company_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN type IN ('income', 'bonus', 'transfer') THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type IN (
        'expense', 'fuel', 'toll', 'maintenance', 'insurance', 'salary', 'rent', 'tax', 'penalty'
      ) THEN amount ELSE 0 END), 0)
  INTO v_balance
  FROM public.transactions
  WHERE COALESCE(status, 'posted') = 'posted';

  UPDATE public.company_bank_account
  SET balance = ROUND(v_balance, 2), updated_at = now()
  WHERE id = (SELECT id FROM public.company_bank_account LIMIT 1);

  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', ROUND(v_balance, 2));
  END IF;

  RETURN ROUND(v_balance, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_approved_road_sheet(sheet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet record;
  v_revenue numeric;
  v_fuel_cost numeric;
  v_toll_cost numeric;
  v_repair_cost numeric;
  v_insurance_cost numeric;
  v_salary numeric;
  v_other_cost numeric;
  v_net numeric;
  v_driver_name text;
  v_actor_user_id uuid;
  v_today date;
  v_departure text;
  v_arrival text;
  v_ref text;
  v_balance numeric;
BEGIN
  v_today := CURRENT_DATE;

  SELECT rs.*, d.name AS driver_name, d.user_id AS driver_user_id
  INTO v_sheet
  FROM public.road_sheets rs
  LEFT JOIN public.drivers d ON d.id = rs.driver_id
  WHERE rs.id = sheet_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sheet not found');
  END IF;

  IF NOT (COALESCE(v_sheet.validated, false) = true OR v_sheet.status = 'approved') THEN
    RETURN jsonb_build_object('error', 'Sheet not validated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE road_sheet_id = sheet_id AND auto_generated = true
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_processed');
  END IF;

  v_driver_name := COALESCE(v_sheet.driver_name, 'Chauffeur');
  v_actor_user_id := COALESCE(v_sheet.approved_by, v_sheet.driver_user_id, auth.uid());

  IF v_actor_user_id IS NULL THEN
    SELECT id INTO v_actor_user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_actor_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No user available for transaction ownership');
  END IF;

  v_departure := COALESCE(v_sheet.departure, v_sheet.departure_city, 'Départ');
  v_arrival := COALESCE(v_sheet.arrival, v_sheet.arrival_city, 'Arrivée');
  v_ref := 'RS-' || LEFT(sheet_id::text, 8);

  v_revenue := COALESCE(v_sheet.revenue, 0);
  v_fuel_cost := COALESCE(v_sheet.fuel_cost, 0);
  v_toll_cost := COALESCE(NULLIF(v_sheet.toll_cost, 0), v_sheet.toll_cost_calc, 0);
  v_repair_cost := COALESCE(NULLIF(v_sheet.repair_cost, 0), v_sheet.wear_cost, 0);
  v_insurance_cost := COALESCE(v_sheet.insurance_cost, 0);
  v_salary := COALESCE(NULLIF(v_sheet.driver_salary, 0), v_sheet.driver_bonus, 0);
  v_other_cost := COALESCE(v_sheet.other_expenses, 0);
  v_net := COALESCE(
    v_sheet.net_profit,
    v_revenue - v_fuel_cost - v_toll_cost - v_repair_cost - v_insurance_cost - v_salary - v_other_cost
  );

  SELECT balance INTO v_balance FROM public.company_bank_account LIMIT 1;
  v_balance := COALESCE(v_balance, 0);

  IF v_revenue > 0 THEN
    v_balance := v_balance + ROUND(v_revenue, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'income', ROUND(v_revenue, 2),
       'Feuille de route ' || v_departure || ' → ' || v_arrival,
       'Transport', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  IF v_fuel_cost > 0 THEN
    v_balance := v_balance - ROUND(v_fuel_cost, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'fuel', ROUND(v_fuel_cost, 2),
       'Carburant — ' || v_driver_name, 'Carburant', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  IF v_toll_cost > 0 THEN
    v_balance := v_balance - ROUND(v_toll_cost, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'toll', ROUND(v_toll_cost, 2),
       'Péages — ' || v_driver_name, 'Péages', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  IF v_repair_cost > 0 THEN
    v_balance := v_balance - ROUND(v_repair_cost, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'maintenance', ROUND(v_repair_cost, 2),
       'Réparations — ' || v_driver_name, 'Réparations', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  IF v_insurance_cost > 0 THEN
    v_balance := v_balance - ROUND(v_insurance_cost, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'insurance', ROUND(v_insurance_cost, 2),
       'Assurance — ' || v_driver_name, 'Assurance', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  IF v_salary > 0 THEN
    v_balance := v_balance - ROUND(v_salary, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'salary', ROUND(v_salary, 2),
       'Salaire chauffeur — ' || v_driver_name, 'Salaires', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  IF v_other_cost > 0 THEN
    v_balance := v_balance - ROUND(v_other_cost, 2);
    INSERT INTO public.transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_actor_user_id, v_sheet.driver_id, sheet_id, 'expense', ROUND(v_other_cost, 2),
       'Autres dépenses — ' || v_driver_name, 'Autres', COALESCE(v_sheet.date, v_today), true, v_actor_user_id, v_ref, ROUND(v_balance, 2), 'posted');
  END IF;

  UPDATE public.company_bank_account
  SET balance = ROUND(v_balance, 2), updated_at = now()
  WHERE id = (SELECT id FROM public.company_bank_account LIMIT 1);

  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', ROUND(v_balance, 2));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'skipped', false,
    'revenue', v_revenue,
    'fuel_cost', v_fuel_cost,
    'toll_cost', v_toll_cost,
    'repair_cost', v_repair_cost,
    'insurance_cost', v_insurance_cost,
    'driver_salary', v_salary,
    'other_expenses', v_other_cost,
    'net_profit', v_net,
    'balance', ROUND(v_balance, 2)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_validated_road_sheets_bank()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet record;
  v_processed int := 0;
  v_skipped int := 0;
  v_result jsonb;
BEGIN
  FOR v_sheet IN
    SELECT rs.id
    FROM public.road_sheets rs
    WHERE (COALESCE(rs.validated, false) = true OR rs.status = 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.road_sheet_id = rs.id AND t.auto_generated = true
      )
    ORDER BY COALESCE(rs.date, rs.created_at::date) ASC, rs.created_at ASC
  LOOP
    v_result := public.process_approved_road_sheet(v_sheet.id);
    IF COALESCE((v_result->>'skipped')::boolean, false) THEN
      v_skipped := v_skipped + 1;
    ELSIF v_result ? 'error' THEN
      RAISE WARNING 'sync_validated_road_sheets_bank sheet %: %', v_sheet.id, v_result->>'error';
    ELSE
      v_processed := v_processed + 1;
    END IF;
  END LOOP;

  PERFORM public.recalculate_company_balance();

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'skipped', v_skipped
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_on_road_sheet_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    BEGIN
      PERFORM public.process_approved_road_sheet(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Bank sync failed for road sheet %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS road_sheet_approval_trigger ON public.road_sheets;
CREATE TRIGGER road_sheet_approval_trigger
  AFTER UPDATE OF status ON public.road_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_road_sheet_approved();

GRANT EXECUTE ON FUNCTION public.recalculate_company_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_approved_road_sheet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_validated_road_sheets_bank() TO authenticated;

NOTIFY pgrst, 'reload schema';
