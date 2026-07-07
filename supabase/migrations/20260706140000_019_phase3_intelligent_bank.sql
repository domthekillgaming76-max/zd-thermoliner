-- 019 — Phase 3: Intelligent Bank Module
-- Aligns road sheet approval banking with stored economics (6 expense lines + income)

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'posted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_status_check
      CHECK (status IS NULL OR status IN ('posted', 'pending'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION process_approved_road_sheet(sheet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sheet record;
  v_km numeric;
  v_revenue numeric;
  v_fuel_cost numeric;
  v_toll_cost numeric;
  v_repair_cost numeric;
  v_insurance_cost numeric;
  v_salary numeric;
  v_net numeric;
  v_driver_name text;
  v_driver_user_id uuid;
  v_today date;
  v_departure text;
  v_arrival text;
  v_ref text;
  v_balance numeric;
BEGIN
  v_today := CURRENT_DATE;

  SELECT rs.*, d.name AS driver_name, d.user_id AS driver_user_id
  INTO v_sheet
  FROM road_sheets rs
  LEFT JOIN drivers d ON d.id = rs.driver_id
  WHERE rs.id = sheet_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sheet not found');
  END IF;

  v_driver_name := COALESCE(v_sheet.driver_name, 'Chauffeur');
  v_driver_user_id := v_sheet.driver_user_id;
  v_departure := COALESCE(v_sheet.departure, v_sheet.departure_city, 'Départ');
  v_arrival := COALESCE(v_sheet.arrival, v_sheet.arrival_city, 'Arrivée');
  v_ref := 'RS-' || LEFT(sheet_id::text, 8);

  v_km := COALESCE(v_sheet.km, v_sheet.total_distance, 0);
  v_revenue := COALESCE(v_sheet.revenue, 0);
  v_fuel_cost := COALESCE(v_sheet.fuel_cost, 0);
  v_toll_cost := COALESCE(NULLIF(v_sheet.toll_cost, 0), v_sheet.toll_cost_calc, 0);
  v_repair_cost := COALESCE(NULLIF(v_sheet.repair_cost, 0), v_sheet.wear_cost, 0);
  v_insurance_cost := COALESCE(v_sheet.insurance_cost, 0);
  v_salary := COALESCE(NULLIF(v_sheet.driver_salary, 0), v_sheet.driver_bonus, 0);
  v_net := COALESCE(
    v_sheet.net_profit,
    v_revenue - v_fuel_cost - v_toll_cost - v_repair_cost - v_insurance_cost - v_salary
  );

  DELETE FROM transactions
  WHERE road_sheet_id = sheet_id AND auto_generated = true;

  SELECT balance INTO v_balance FROM company_bank_account LIMIT 1;
  v_balance := COALESCE(v_balance, 0);

  IF v_revenue > 0 THEN
    v_balance := v_balance + ROUND(v_revenue, 2);
    INSERT INTO transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_driver_user_id, v_sheet.driver_id, sheet_id, 'income', ROUND(v_revenue, 2),
       'Feuille de route ' || v_departure || ' → ' || v_arrival,
       'Transport', COALESCE(v_sheet.date, v_today), true, v_driver_user_id, v_ref, v_balance, 'posted');
  END IF;

  IF v_fuel_cost > 0 THEN
    v_balance := v_balance - ROUND(v_fuel_cost, 2);
    INSERT INTO transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_driver_user_id, v_sheet.driver_id, sheet_id, 'fuel', ROUND(v_fuel_cost, 2),
       'Carburant — ' || v_driver_name, 'Carburant', COALESCE(v_sheet.date, v_today), true, v_driver_user_id, v_ref, v_balance, 'posted');
  END IF;

  IF v_toll_cost > 0 THEN
    v_balance := v_balance - ROUND(v_toll_cost, 2);
    INSERT INTO transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_driver_user_id, v_sheet.driver_id, sheet_id, 'toll', ROUND(v_toll_cost, 2),
       'Péages — ' || v_driver_name, 'Péages', COALESCE(v_sheet.date, v_today), true, v_driver_user_id, v_ref, v_balance, 'posted');
  END IF;

  IF v_repair_cost > 0 THEN
    v_balance := v_balance - ROUND(v_repair_cost, 2);
    INSERT INTO transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_driver_user_id, v_sheet.driver_id, sheet_id, 'maintenance', ROUND(v_repair_cost, 2),
       'Réparations — ' || v_driver_name, 'Réparations', COALESCE(v_sheet.date, v_today), true, v_driver_user_id, v_ref, v_balance, 'posted');
  END IF;

  IF v_insurance_cost > 0 THEN
    v_balance := v_balance - ROUND(v_insurance_cost, 2);
    INSERT INTO transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_driver_user_id, v_sheet.driver_id, sheet_id, 'insurance', ROUND(v_insurance_cost, 2),
       'Assurance — ' || v_driver_name, 'Assurance', COALESCE(v_sheet.date, v_today), true, v_driver_user_id, v_ref, v_balance, 'posted');
  END IF;

  IF v_salary > 0 THEN
    v_balance := v_balance - ROUND(v_salary, 2);
    INSERT INTO transactions
      (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference, balance_after, status)
    VALUES
      (v_driver_user_id, v_sheet.driver_id, sheet_id, 'salary', ROUND(v_salary, 2),
       'Salaire chauffeur — ' || v_driver_name, 'Salaires', COALESCE(v_sheet.date, v_today), true, v_driver_user_id, v_ref, v_balance, 'posted');
  END IF;

  UPDATE company_bank_account
  SET balance = v_balance, updated_at = now()
  WHERE id = (SELECT id FROM company_bank_account LIMIT 1);

  IF NOT FOUND THEN
    INSERT INTO company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', v_balance);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'revenue', v_revenue,
    'fuel_cost', v_fuel_cost,
    'toll_cost', v_toll_cost,
    'repair_cost', v_repair_cost,
    'insurance_cost', v_insurance_cost,
    'driver_salary', v_salary,
    'net_profit', v_net,
    'balance', v_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
