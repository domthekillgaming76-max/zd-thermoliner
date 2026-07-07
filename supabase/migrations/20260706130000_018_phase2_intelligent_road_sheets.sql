-- 018 — Phase 2: Intelligent Road Sheets
-- Adds trailer, driver salary mode, and computed snapshot columns

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'road_sheets' AND table_schema = 'public') THEN
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS trailer_type text;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_salary_mode text;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_salary_value numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS fuel_consumption_l100 numeric(10,2) DEFAULT 32;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS fuel_price_per_liter numeric(10,4) DEFAULT 1.85;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS fuel_liters numeric(10,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS total_expenses numeric(12,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS margin_percent numeric(5,2) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS cost_per_km numeric(8,4) DEFAULT 0;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS rejection_reason text;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id);
    ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES drivers(id);
  END IF;
END $$;

-- Salary mode constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'road_sheets_driver_salary_mode_check'
  ) THEN
    ALTER TABLE road_sheets
      ADD CONSTRAINT road_sheets_driver_salary_mode_check
      CHECK (driver_salary_mode IS NULL OR driver_salary_mode IN ('fixed', 'percentage', 'per_km'));
  END IF;
END $$;
