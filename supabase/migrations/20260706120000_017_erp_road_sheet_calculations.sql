-- 017 — ERP road sheet calculation columns
-- Ensures all financial fields exist for automatic calculations

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'road_sheets' AND table_schema = 'public') THEN
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS fuel_cost numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS toll_cost_calc numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS toll_cost numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS repair_cost numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS wear_cost numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS other_expenses numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS insurance_cost numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_salary numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_bonus numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS net_profit numeric(12,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS economics_calculated boolean DEFAULT false;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS km integer DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS price_per_km numeric(6,2) DEFAULT 1.80;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS revenue numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Sync toll_cost alias from toll_cost_calc where empty
UPDATE road_sheets
SET toll_cost = toll_cost_calc
WHERE toll_cost = 0 AND toll_cost_calc > 0;

-- Sync repair_cost from wear_cost where empty
UPDATE road_sheets
SET repair_cost = wear_cost
WHERE repair_cost = 0 AND wear_cost > 0;

-- Sync driver_salary from driver_bonus where empty
UPDATE road_sheets
SET driver_salary = driver_bonus
WHERE driver_salary = 0 AND driver_bonus > 0;

-- Recalculate net_profit for rows with revenue but no profit
UPDATE road_sheets
SET net_profit = COALESCE(revenue, 0)
  - COALESCE(fuel_cost, 0)
  - COALESCE(NULLIF(toll_cost, 0), toll_cost_calc, 0)
  - COALESCE(NULLIF(repair_cost, 0), wear_cost, 0)
  - COALESCE(NULLIF(other_expenses, 0), insurance_cost, 0)
  - COALESCE(NULLIF(driver_salary, 0), driver_bonus, 0)
WHERE COALESCE(revenue, 0) > 0 AND COALESCE(net_profit, 0) = 0;
