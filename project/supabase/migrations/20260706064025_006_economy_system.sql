/*
# Z&D Thermoliner - Système Économique RP
# Extend existing tables, add new economy tables
*/

-- ============================================================
-- Extend existing transactions table with economy columns
-- ============================================================
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'salary', 'bonus', 'penalty', 'fuel', 'toll', 'maintenance', 'rent', 'insurance', 'tax', 'transfer'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'driver_id') THEN
    ALTER TABLE transactions ADD COLUMN driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'road_sheet_id') THEN
    ALTER TABLE transactions ADD COLUMN road_sheet_id uuid REFERENCES road_sheets(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'truck_id') THEN
    ALTER TABLE transactions ADD COLUMN truck_id uuid REFERENCES trucks(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'garage_id') THEN
    ALTER TABLE transactions ADD COLUMN garage_id uuid REFERENCES garages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'created_by') THEN
    ALTER TABLE transactions ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reference') THEN
    ALTER TABLE transactions ADD COLUMN reference text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'balance_after') THEN
    ALTER TABLE transactions ADD COLUMN balance_after decimal(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'auto_generated') THEN
    ALTER TABLE transactions ADD COLUMN auto_generated boolean DEFAULT false;
  END IF;
END $$;

-- Update RLS for transactions
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
DROP POLICY IF EXISTS "select_transactions" ON transactions;
DROP POLICY IF EXISTS "insert_transactions" ON transactions;

CREATE POLICY "select_transactions" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_transactions" ON transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')));

-- ============================================================
-- ECONOMY SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS economy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prix_km decimal(8,4) DEFAULT 2.50,
  conso_l_100 decimal(6,2) DEFAULT 32.0,
  prix_litre decimal(6,3) DEFAULT 1.85,
  coeff_peage decimal(6,4) DEFAULT 0.12,
  coeff_usure decimal(6,4) DEFAULT 0.08,
  coeff_assurance decimal(6,4) DEFAULT 0.05,
  coeff_prime_chauffeur decimal(6,4) DEFAULT 0.20,
  loyer_garage_base decimal(10,2) DEFAULT 5000.00,
  entretien_garage_base decimal(10,2) DEFAULT 800.00,
  assurance_garage_base decimal(10,2) DEFAULT 500.00,
  taxe_garage_base decimal(10,2) DEFAULT 200.00,
  salaire_base_chauffeur decimal(10,2) DEFAULT 2000.00,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE economy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_economy_settings" ON economy_settings;
CREATE POLICY "select_economy_settings" ON economy_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_economy_settings" ON economy_settings;
CREATE POLICY "manage_economy_settings" ON economy_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')));

INSERT INTO economy_settings DEFAULT VALUES;

-- ============================================================
-- BANK STATEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  opening_balance decimal(12,2) DEFAULT 0,
  total_income decimal(12,2) DEFAULT 0,
  total_expense decimal(12,2) DEFAULT 0,
  total_salary decimal(12,2) DEFAULT 0,
  total_fuel decimal(12,2) DEFAULT 0,
  total_toll decimal(12,2) DEFAULT 0,
  total_maintenance decimal(12,2) DEFAULT 0,
  total_rent decimal(12,2) DEFAULT 0,
  closing_balance decimal(12,2) DEFAULT 0,
  net_profit decimal(12,2) DEFAULT 0,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_bank_statements" ON bank_statements;
CREATE POLICY "select_bank_statements" ON bank_statements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_bank_statements" ON bank_statements;
CREATE POLICY "manage_bank_statements" ON bank_statements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- TRUCK COSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS truck_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL UNIQUE REFERENCES trucks(id) ON DELETE CASCADE,
  purchase_value decimal(12,2) DEFAULT 0,
  monthly_insurance decimal(10,2) DEFAULT 200.00,
  monthly_tax decimal(10,2) DEFAULT 150.00,
  last_maintenance_cost decimal(10,2) DEFAULT 0,
  last_maintenance_date date,
  next_maintenance_km integer DEFAULT 50000,
  mechanical_state integer DEFAULT 100,
  total_revenue decimal(12,2) DEFAULT 0,
  total_cost decimal(12,2) DEFAULT 0,
  total_km integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE truck_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_truck_costs" ON truck_costs;
CREATE POLICY "select_truck_costs" ON truck_costs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_truck_costs" ON truck_costs;
CREATE POLICY "manage_truck_costs" ON truck_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- GARAGE COSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS garage_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id uuid NOT NULL UNIQUE REFERENCES garages(id) ON DELETE CASCADE,
  monthly_rent decimal(10,2) DEFAULT 5000.00,
  monthly_maintenance decimal(10,2) DEFAULT 800.00,
  monthly_insurance decimal(10,2) DEFAULT 500.00,
  monthly_tax decimal(10,2) DEFAULT 200.00,
  last_paid_month integer,
  last_paid_year integer,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE garage_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_garage_costs" ON garage_costs;
CREATE POLICY "select_garage_costs" ON garage_costs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_garage_costs" ON garage_costs;
CREATE POLICY "manage_garage_costs" ON garage_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DRIVER SANCTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bonus', 'penalty')),
  amount decimal(10,2) NOT NULL,
  reason text NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  applied_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_sanctions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_driver_sanctions" ON driver_sanctions;
CREATE POLICY "select_driver_sanctions" ON driver_sanctions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_driver_sanctions" ON driver_sanctions;
CREATE POLICY "manage_driver_sanctions" ON driver_sanctions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron', 'directeur')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron', 'directeur')));

-- ============================================================
-- MONTHLY RANKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  total_km integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  total_revenue decimal(12,2) DEFAULT 0,
  total_net_profit decimal(12,2) DEFAULT 0,
  driver_bonus decimal(10,2) DEFAULT 0,
  rank_km integer,
  rank_profit integer,
  rank_deliveries integer,
  medal text CHECK (medal IN ('gold', 'silver', 'bronze')),
  computed_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, month, year)
);

ALTER TABLE monthly_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_monthly_rankings" ON monthly_rankings;
CREATE POLICY "select_monthly_rankings" ON monthly_rankings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "manage_monthly_rankings" ON monthly_rankings;
CREATE POLICY "manage_monthly_rankings" ON monthly_rankings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- ROAD SHEETS financial columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'road_sheets' AND column_name = 'truck_id') THEN
    ALTER TABLE road_sheets ADD COLUMN truck_id uuid REFERENCES trucks(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'road_sheets' AND column_name = 'revenue') THEN
    ALTER TABLE road_sheets
      ADD COLUMN revenue decimal(12,2) DEFAULT 0,
      ADD COLUMN fuel_cost decimal(10,2) DEFAULT 0,
      ADD COLUMN toll_cost_calc decimal(10,2) DEFAULT 0,
      ADD COLUMN wear_cost decimal(10,2) DEFAULT 0,
      ADD COLUMN insurance_cost decimal(10,2) DEFAULT 0,
      ADD COLUMN driver_bonus decimal(10,2) DEFAULT 0,
      ADD COLUMN net_profit decimal(12,2) DEFAULT 0,
      ADD COLUMN prix_km_applied decimal(8,4),
      ADD COLUMN economics_calculated boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- DRIVER STATS financial columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_stats' AND column_name = 'monthly_salary') THEN
    ALTER TABLE driver_stats
      ADD COLUMN monthly_salary decimal(10,2) DEFAULT 0,
      ADD COLUMN monthly_bonus decimal(10,2) DEFAULT 0,
      ADD COLUMN monthly_penalty decimal(10,2) DEFAULT 0,
      ADD COLUMN monthly_net_profit decimal(12,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- FUNCTION: Calculate delivery economics
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_delivery_economics(sheet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id uuid;
  v_company text;
  v_date date;
  v_total_km integer := 0;
  v_prix_km decimal(8,4) := 2.50;
  v_conso decimal(6,2) := 32.0;
  v_litre decimal(6,3) := 1.85;
  v_coeff_peage decimal(6,4) := 0.12;
  v_coeff_usure decimal(6,4) := 0.08;
  v_coeff_assurance decimal(6,4) := 0.05;
  v_coeff_prime decimal(6,4) := 0.20;
  v_revenue decimal(12,2);
  v_fuel decimal(10,2);
  v_toll decimal(10,2);
  v_wear decimal(10,2);
  v_insurance decimal(10,2);
  v_bonus decimal(10,2);
  v_profit decimal(12,2);
BEGIN
  SELECT driver_id, company, date INTO v_driver_id, v_company, v_date FROM road_sheets WHERE id = sheet_id;
  IF v_driver_id IS NULL THEN RETURN '{"error":"not found"}'::jsonb; END IF;

  SELECT COALESCE(prix_km,2.50), COALESCE(conso_l_100,32), COALESCE(prix_litre,1.85),
         COALESCE(coeff_peage,0.12), COALESCE(coeff_usure,0.08), COALESCE(coeff_assurance,0.05), COALESCE(coeff_prime_chauffeur,0.20)
  INTO v_prix_km, v_conso, v_litre, v_coeff_peage, v_coeff_usure, v_coeff_assurance, v_coeff_prime
  FROM economy_settings LIMIT 1;

  SELECT COALESCE(SUM(distance), 0) INTO v_total_km FROM route_legs WHERE road_sheet_id = sheet_id;
  IF v_total_km = 0 THEN SELECT COALESCE(total_distance, 0) INTO v_total_km FROM road_sheets WHERE id = sheet_id; END IF;
  IF v_total_km = 0 THEN RETURN '{"error":"no distance"}'::jsonb; END IF;

  v_revenue   := v_total_km * v_prix_km;
  v_fuel      := (v_total_km * v_conso / 100.0) * v_litre;
  v_toll      := v_total_km * v_coeff_peage;
  v_wear      := v_total_km * v_coeff_usure;
  v_insurance := v_total_km * v_coeff_assurance;
  v_bonus     := v_revenue * v_coeff_prime;
  v_profit    := v_revenue - v_fuel - v_toll - v_wear - v_insurance - v_bonus;

  UPDATE road_sheets SET
    total_distance = v_total_km, revenue = v_revenue, fuel_cost = v_fuel, toll_cost_calc = v_toll,
    wear_cost = v_wear, insurance_cost = v_insurance, driver_bonus = v_bonus, net_profit = v_profit,
    prix_km_applied = v_prix_km, economics_calculated = true, updated_at = now()
  WHERE id = sheet_id;

  DELETE FROM transactions WHERE road_sheet_id = sheet_id AND auto_generated = true;

  INSERT INTO transactions (type, amount, description, driver_id, road_sheet_id, date, auto_generated, created_by)
  VALUES
    ('income',      v_revenue,    'Revenu - ' || COALESCE(v_company,'Client'), v_driver_id, sheet_id, v_date, true, auth.uid()),
    ('fuel',       -v_fuel,       'Carburant ' || v_total_km || ' km',          v_driver_id, sheet_id, v_date, true, auth.uid()),
    ('toll',       -v_toll,       'Peages ' || v_total_km || ' km',             v_driver_id, sheet_id, v_date, true, auth.uid()),
    ('maintenance',-v_wear,       'Usure ' || v_total_km || ' km',              v_driver_id, sheet_id, v_date, true, auth.uid()),
    ('salary',     -v_bonus,      'Prime chauffeur 20%',                        v_driver_id, sheet_id, v_date, true, auth.uid());

  RETURN jsonb_build_object('km',v_total_km,'revenue',v_revenue,'fuel',v_fuel,'toll',v_toll,'wear',v_wear,'bonus',v_bonus,'profit',v_profit);
END;
$$;

-- ============================================================
-- FUNCTION: Compute monthly rankings
-- ============================================================
CREATE OR REPLACE FUNCTION compute_monthly_rankings(target_month integer, target_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE rec record; rank_counter integer;
BEGIN
  DELETE FROM monthly_rankings WHERE month = target_month AND year = target_year;

  INSERT INTO monthly_rankings (driver_id, month, year, total_km, total_deliveries, total_revenue, total_net_profit, driver_bonus)
  SELECT d.id, target_month, target_year,
    COALESCE(SUM(rs.total_distance), 0)::integer,
    COUNT(rs.id)::integer,
    COALESCE(SUM(rs.revenue), 0),
    COALESCE(SUM(rs.net_profit), 0),
    COALESCE(SUM(rs.driver_bonus), 0)
  FROM drivers d
  LEFT JOIN road_sheets rs ON rs.driver_id = d.id
    AND EXTRACT(MONTH FROM rs.date)::integer = target_month
    AND EXTRACT(YEAR FROM rs.date)::integer = target_year
  WHERE d.status = 'active'
  GROUP BY d.id;

  rank_counter := 1;
  FOR rec IN SELECT id FROM monthly_rankings WHERE month = target_month AND year = target_year ORDER BY total_km DESC LOOP
    UPDATE monthly_rankings SET rank_km = rank_counter WHERE id = rec.id;
    rank_counter := rank_counter + 1;
  END LOOP;

  rank_counter := 1;
  FOR rec IN SELECT id FROM monthly_rankings WHERE month = target_month AND year = target_year ORDER BY total_net_profit DESC LOOP
    UPDATE monthly_rankings SET rank_profit = rank_counter WHERE id = rec.id;
    rank_counter := rank_counter + 1;
  END LOOP;

  rank_counter := 1;
  FOR rec IN SELECT id FROM monthly_rankings WHERE month = target_month AND year = target_year ORDER BY total_deliveries DESC LOOP
    UPDATE monthly_rankings SET rank_deliveries = rank_counter WHERE id = rec.id;
    rank_counter := rank_counter + 1;
  END LOOP;

  UPDATE monthly_rankings SET medal = 'gold'   WHERE month = target_month AND year = target_year AND rank_km = 1 AND total_km > 0;
  UPDATE monthly_rankings SET medal = 'silver' WHERE month = target_month AND year = target_year AND rank_km = 2 AND total_km > 0;
  UPDATE monthly_rankings SET medal = 'bronze' WHERE month = target_month AND year = target_year AND rank_km = 3 AND total_km > 0;

  INSERT INTO medals (driver_id, type, month, year, distance, deliveries)
  SELECT driver_id, medal, target_month, target_year, total_km, total_deliveries
  FROM monthly_rankings
  WHERE month = target_month AND year = target_year AND medal IS NOT NULL
  ON CONFLICT (driver_id, month, year, type) DO UPDATE SET distance = EXCLUDED.distance, deliveries = EXCLUDED.deliveries;
END;
$$;

-- ============================================================
-- FUNCTION: Generate bank statement
-- ============================================================
CREATE OR REPLACE FUNCTION generate_bank_statement(target_month integer, target_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening decimal(12,2) := 0;
  v_income decimal(12,2); v_salary decimal(12,2); v_fuel decimal(12,2);
  v_toll decimal(12,2); v_maint decimal(12,2); v_rent decimal(12,2);
BEGIN
  SELECT COALESCE(closing_balance, 0) INTO v_opening FROM bank_statements
  WHERE (year = target_year AND month = target_month - 1) OR (target_month = 1 AND year = target_year - 1 AND month = 12)
  ORDER BY year DESC, month DESC LIMIT 1;

  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'salary' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'fuel' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'toll' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'maintenance' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'rent' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO v_income, v_salary, v_fuel, v_toll, v_maint, v_rent
  FROM transactions
  WHERE EXTRACT(MONTH FROM date)::integer = target_month AND EXTRACT(YEAR FROM date)::integer = target_year;

  INSERT INTO bank_statements (month, year, opening_balance, total_income, total_expense, total_salary, total_fuel, total_toll, total_maintenance, total_rent, closing_balance, net_profit)
  VALUES (target_month, target_year, COALESCE(v_opening,0), COALESCE(v_income,0),
    COALESCE(v_salary,0)+COALESCE(v_fuel,0)+COALESCE(v_toll,0)+COALESCE(v_maint,0)+COALESCE(v_rent,0),
    COALESCE(v_salary,0), COALESCE(v_fuel,0), COALESCE(v_toll,0), COALESCE(v_maint,0), COALESCE(v_rent,0),
    COALESCE(v_opening,0) + COALESCE(v_income,0) - COALESCE(v_salary,0) - COALESCE(v_fuel,0) - COALESCE(v_toll,0) - COALESCE(v_maint,0) - COALESCE(v_rent,0),
    COALESCE(v_income,0) - COALESCE(v_salary,0) - COALESCE(v_fuel,0) - COALESCE(v_toll,0) - COALESCE(v_maint,0) - COALESCE(v_rent,0))
  ON CONFLICT (month, year) DO UPDATE SET
    total_income = EXCLUDED.total_income, total_expense = EXCLUDED.total_expense,
    total_salary = EXCLUDED.total_salary, total_fuel = EXCLUDED.total_fuel,
    total_toll = EXCLUDED.total_toll, total_maintenance = EXCLUDED.total_maintenance,
    total_rent = EXCLUDED.total_rent, closing_balance = EXCLUDED.closing_balance,
    net_profit = EXCLUDED.net_profit, generated_at = now();
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_driver ON transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_period ON monthly_rankings(month, year);
CREATE INDEX IF NOT EXISTS idx_driver_sanctions_driver ON driver_sanctions(driver_id);