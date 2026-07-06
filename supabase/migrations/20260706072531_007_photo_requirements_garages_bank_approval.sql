/*
# Migration 007: Delivery Photo Requirements, Garage Enhancements, Company Bank Account & Auto-Approval Trigger

## Summary of changes

### 1. Road Sheets Enhancements
- `delivery_photo_url`: Stores the required delivery photo URL. Submission is blocked without it (enforced frontend-side).
- `price_per_km`: Per-sheet price override for km revenue calculation.
- `fuel_consumption_l100`: Truck fuel consumption rate (L/100km) for this sheet.
- `fuel_price_per_liter`: Fuel price at time of delivery.
- `departure_city` / `arrival_city`: Quick-access fields for origin/destination display.

### 2. Garages Table Enhancements
- `type`: Enum — principal / secondaire / depot / atelier.
- `surface`: Floor area in m².
- `photo_url`: Main garage photo.
- `monthly_rent`, `monthly_insurance`, `monthly_maintenance`, `monthly_tax`: Monthly cost breakdown.
- `is_active`: Active/inactive status flag.

### 3. Company Bank Account (new table)
- Single-row table `company_bank_account` tracking the company RP balance.
- Fields: account_name, iban_rp (fictitious), balance, updated_at.
- Initialized with default row on migration.

### 4. process_approved_road_sheet() function
- Called when a road sheet status changes to 'approved'.
- Calculates: revenue, fuel_cost, toll_cost, wear_cost, driver_bonus, net_profit.
- Creates 5 auto-generated transactions in the transactions table.
- Updates company_bank_account balance.
- Upserts driver_stats (monthly km, deliveries, salary, net profit).
- Creates a notification for the driver.
- Creates a wall post.

### 5. Trigger on road_sheets
- Fires AFTER UPDATE when status transitions to 'approved'.
- Calls process_approved_road_sheet(NEW.id).

### 6. Storage Buckets
- `delivery-photos`: Public bucket for delivery photos (max 10MB, images only).
- `garage-photos`: Public bucket for garage photos (max 10MB, images only).
- RLS policies added to storage.objects for both buckets.

### Security
- company_bank_account: RLS enabled, authenticated read-all, update-all.
- Storage objects: authenticated upload + public read for both buckets.
- All existing RLS on road_sheets, garages, transactions unchanged.
*/

-- ──────────────────────────────────────────────
-- 1. Road Sheets: new columns
-- ──────────────────────────────────────────────
ALTER TABLE road_sheets
  ADD COLUMN IF NOT EXISTS delivery_photo_url text,
  ADD COLUMN IF NOT EXISTS price_per_km numeric(10,4),
  ADD COLUMN IF NOT EXISTS fuel_consumption_l100 numeric(10,2),
  ADD COLUMN IF NOT EXISTS fuel_price_per_liter numeric(10,4),
  ADD COLUMN IF NOT EXISTS departure_city text,
  ADD COLUMN IF NOT EXISTS arrival_city text;

-- ──────────────────────────────────────────────
-- 2. Garages: new columns
-- ──────────────────────────────────────────────
ALTER TABLE garages
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'principal',
  ADD COLUMN IF NOT EXISTS surface numeric(10,2),
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS monthly_rent numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_insurance numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_maintenance numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_tax numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'garages' AND constraint_name = 'garages_type_check'
  ) THEN
    ALTER TABLE garages ADD CONSTRAINT garages_type_check
      CHECK (type IN ('principal', 'secondaire', 'depot', 'atelier'));
  END IF;
END $$;

-- ──────────────────────────────────────────────
-- 3. Company Bank Account
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_bank_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL DEFAULT 'Z&D Thermoliner',
  iban_rp text NOT NULL DEFAULT 'FR76 3000 2999 0000 0000 0000 000',
  balance numeric(15,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO company_bank_account (id, account_name, iban_rp, balance)
SELECT gen_random_uuid(), 'Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0
WHERE NOT EXISTS (SELECT 1 FROM company_bank_account);

ALTER TABLE company_bank_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cba_select" ON company_bank_account;
CREATE POLICY "cba_select" ON company_bank_account FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cba_update" ON company_bank_account;
CREATE POLICY "cba_update" ON company_bank_account FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "cba_insert" ON company_bank_account;
CREATE POLICY "cba_insert" ON company_bank_account FOR INSERT TO authenticated WITH CHECK (true);

-- ──────────────────────────────────────────────
-- 4. process_approved_road_sheet() function
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_approved_road_sheet(sheet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sheet record;
  v_settings record;
  v_prix_km numeric;
  v_conso numeric;
  v_prix_litre numeric;
  v_km numeric;
  v_revenue numeric;
  v_fuel_cost numeric;
  v_toll_cost numeric;
  v_wear_cost numeric;
  v_bonus numeric;
  v_net numeric;
  v_driver_name text;
  v_driver_user_id uuid;
  v_today date;
  v_departure text;
  v_arrival text;
  v_start_city text;
  v_end_city text;
BEGIN
  v_today := CURRENT_DATE;

  -- Get sheet + driver info
  SELECT rs.*, d.name as driver_name, d.user_id as driver_user_id
  INTO v_sheet
  FROM road_sheets rs
  LEFT JOIN drivers d ON d.id = rs.driver_id
  WHERE rs.id = sheet_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sheet not found');
  END IF;

  v_driver_name := COALESCE(v_sheet.driver_name, 'Chauffeur');
  v_driver_user_id := v_sheet.driver_user_id;

  -- Get first / last city from route_legs
  SELECT start_city INTO v_start_city
  FROM route_legs WHERE road_sheet_id = sheet_id ORDER BY created_at ASC LIMIT 1;

  SELECT end_city INTO v_end_city
  FROM route_legs WHERE road_sheet_id = sheet_id ORDER BY created_at DESC LIMIT 1;

  v_departure := COALESCE(v_sheet.departure_city, v_start_city, 'Départ');
  v_arrival   := COALESCE(v_sheet.arrival_city,   v_end_city,   'Arrivée');

  -- Get economy settings fallback
  SELECT * INTO v_settings FROM economy_settings LIMIT 1;

  -- Resolve pricing: sheet override → economy_settings → hardcoded default
  v_km          := COALESCE(v_sheet.total_distance, 0);
  v_prix_km     := COALESCE(v_sheet.price_per_km,          v_settings.prix_km,          1.80);
  v_conso       := COALESCE(v_sheet.fuel_consumption_l100,  v_settings.conso_l_100,       35.0);
  v_prix_litre  := COALESCE(v_sheet.fuel_price_per_liter,   v_settings.prix_litre,        1.65);

  v_revenue    := v_km * v_prix_km;
  v_fuel_cost  := v_km * v_conso / 100.0 * v_prix_litre;
  v_toll_cost  := v_km * COALESCE(v_settings.coeff_peage, 0.12);
  v_wear_cost  := v_km * COALESCE(v_settings.coeff_usure, 0.08);
  v_bonus      := v_revenue * COALESCE(v_settings.coeff_prime_chauffeur, 0.20);
  v_net        := v_revenue - v_fuel_cost - v_toll_cost - v_wear_cost - v_bonus;

  -- Update road_sheet economics
  UPDATE road_sheets SET
    revenue              = v_revenue,
    fuel_cost            = v_fuel_cost,
    toll_cost_calc       = v_toll_cost,
    wear_cost            = v_wear_cost,
    driver_bonus         = v_bonus,
    net_profit           = v_net,
    prix_km_applied      = v_prix_km,
    economics_calculated = true,
    departure_city       = v_departure,
    arrival_city         = v_arrival
  WHERE id = sheet_id;

  -- Remove previous auto-generated transactions for this sheet
  DELETE FROM transactions
  WHERE road_sheet_id = sheet_id AND auto_generated = true;

  -- Insert 5 transactions
  INSERT INTO transactions
    (user_id, driver_id, road_sheet_id, type, amount, description, category, date, auto_generated, created_by, reference)
  VALUES
    (v_driver_user_id, v_sheet.driver_id, sheet_id,
     'income', ROUND(v_revenue, 2),
     'Livraison ' || v_departure || ' → ' || v_arrival || ' (' || COALESCE(v_sheet.cargo_type, '') || ')',
     'Transport', v_today, true, v_driver_user_id,
     'RS-' || LEFT(sheet_id::text, 8)),
    (v_driver_user_id, v_sheet.driver_id, sheet_id,
     'fuel', ROUND(v_fuel_cost, 2),
     'Carburant — ' || v_driver_name,
     'Carburant', v_today, true, v_driver_user_id,
     'RS-' || LEFT(sheet_id::text, 8)),
    (v_driver_user_id, v_sheet.driver_id, sheet_id,
     'toll', ROUND(v_toll_cost, 2),
     'Péages — ' || v_driver_name,
     'Peages', v_today, true, v_driver_user_id,
     'RS-' || LEFT(sheet_id::text, 8)),
    (v_driver_user_id, v_sheet.driver_id, sheet_id,
     'maintenance', ROUND(v_wear_cost, 2),
     'Usure camion — ' || v_driver_name,
     'Usure', v_today, true, v_driver_user_id,
     'RS-' || LEFT(sheet_id::text, 8)),
    (v_driver_user_id, v_sheet.driver_id, sheet_id,
     'salary', ROUND(v_bonus, 2),
     'Prime chauffeur — ' || v_driver_name,
     'Salaires', v_today, true, v_driver_user_id,
     'RS-' || LEFT(sheet_id::text, 8));

  -- Update company balance
  UPDATE company_bank_account
  SET balance    = balance + ROUND(v_net, 2),
      updated_at = now();

  -- Upsert driver_stats
  INSERT INTO driver_stats (driver_id, total_distance, total_deliveries, total_earnings,
    total_fuel, total_tolls, monthly_distance, monthly_deliveries, monthly_salary,
    monthly_net_profit, last_delivery_date, updated_at)
  VALUES (v_sheet.driver_id, v_km, 1, ROUND(v_bonus, 2), ROUND(v_fuel_cost, 2), ROUND(v_toll_cost, 2),
    v_km, 1, ROUND(v_bonus, 2), ROUND(v_net, 2), v_today, now())
  ON CONFLICT (driver_id) DO UPDATE SET
    total_distance    = driver_stats.total_distance    + v_km,
    total_deliveries  = driver_stats.total_deliveries  + 1,
    total_earnings    = driver_stats.total_earnings    + ROUND(v_bonus, 2),
    total_fuel        = driver_stats.total_fuel        + ROUND(v_fuel_cost, 2),
    total_tolls       = driver_stats.total_tolls       + ROUND(v_toll_cost, 2),
    monthly_distance  = driver_stats.monthly_distance  + v_km,
    monthly_deliveries= driver_stats.monthly_deliveries+ 1,
    monthly_salary    = COALESCE(driver_stats.monthly_salary, 0) + ROUND(v_bonus, 2),
    monthly_net_profit= COALESCE(driver_stats.monthly_net_profit, 0) + ROUND(v_net, 2),
    last_delivery_date= v_today,
    updated_at        = now();

  -- Notification for driver
  IF v_driver_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, read)
    VALUES (
      v_driver_user_id,
      'Livraison acceptée !',
      'Votre livraison ' || v_departure || ' → ' || v_arrival || ' a été validée. Prime : ' || ROUND(v_bonus, 2) || ' EUR — Bénéfice net : ' || ROUND(v_net, 0) || ' EUR',
      'success',
      false
    );

    -- Wall post
    INSERT INTO posts (user_id, content)
    VALUES (
      v_driver_user_id,
      v_driver_name || ' a effectué une livraison ' ||
      v_departure || ' → ' || v_arrival ||
      CASE WHEN v_sheet.cargo_type IS NOT NULL AND v_sheet.cargo_type <> ''
           THEN ' (' || v_sheet.cargo_type || ')'
           ELSE '' END ||
      ' — ' || v_km || ' km — Bénéfice : ' || ROUND(v_net, 0) || ' EUR'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'revenue',      v_revenue,
    'fuel_cost',    v_fuel_cost,
    'toll_cost',    v_toll_cost,
    'wear_cost',    v_wear_cost,
    'driver_bonus', v_bonus,
    'net_profit',   v_net
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ──────────────────────────────────────────────
-- 5. Trigger: auto-process when approved
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_on_road_sheet_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    PERFORM process_approved_road_sheet(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS road_sheet_approval_trigger ON road_sheets;
CREATE TRIGGER road_sheet_approval_trigger
  AFTER UPDATE OF status ON road_sheets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_on_road_sheet_approved();

-- ──────────────────────────────────────────────
-- 6. Storage Buckets
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('delivery-photos', 'delivery-photos', true, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic']),
  ('garage-photos',   'garage-photos',   true, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for delivery-photos
DROP POLICY IF EXISTS "delivery_photos_select" ON storage.objects;
CREATE POLICY "delivery_photos_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "delivery_photos_insert" ON storage.objects;
CREATE POLICY "delivery_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "delivery_photos_update" ON storage.objects;
CREATE POLICY "delivery_photos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'delivery-photos') WITH CHECK (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "delivery_photos_delete" ON storage.objects;
CREATE POLICY "delivery_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'delivery-photos');

-- Storage policies for garage-photos
DROP POLICY IF EXISTS "garage_photos_select" ON storage.objects;
CREATE POLICY "garage_photos_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'garage-photos');

DROP POLICY IF EXISTS "garage_photos_insert" ON storage.objects;
CREATE POLICY "garage_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'garage-photos');

DROP POLICY IF EXISTS "garage_photos_update" ON storage.objects;
CREATE POLICY "garage_photos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'garage-photos') WITH CHECK (bucket_id = 'garage-photos');

DROP POLICY IF EXISTS "garage_photos_delete" ON storage.objects;
CREATE POLICY "garage_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'garage-photos');
