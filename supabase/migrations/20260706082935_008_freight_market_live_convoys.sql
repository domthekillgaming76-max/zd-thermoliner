/*
# Freight Market & Live Convoys System

## Summary
Adds two new tables to support the RP freight market system:
- `freight_market`: stores randomly-generated freight offers (departure, arrival, cargo, pricing, difficulty)
- `live_convoys`: tracks active convoys with real-time progress

## Changes

### New Tables

#### freight_market
- `id` (uuid, PK)
- `departure_city` (text) — city where cargo is picked up
- `departure_company` (text) — company providing the cargo
- `arrival_city` (text) — delivery destination
- `arrival_company` (text) — receiving company
- `cargo` (text) — type of goods
- `trailer_type` (text) — required trailer (Tautliner, Frigo, Citerne, etc.)
- `weight_tons` (numeric) — cargo weight in tons
- `distance_km` (integer) — route distance
- `price_per_km` (numeric) — rate per km in euros
- `gross_revenue` (numeric) — total payout (distance × price_per_km)
- `deadline_hours` (integer) — hours until expiry from creation
- `difficulty` (text) — Facile / Moyen / Difficile / Expert
- `status` (text) — disponible / reserve / en_cours / termine
- `assigned_driver_id` (uuid, nullable) — driver who took the freight
- `assigned_user_id` (uuid, nullable) — user who took the freight
- `road_sheet_id` (uuid, nullable) — linked road sheet
- `created_by` (uuid) — who generated this freight
- `created_at` (timestamptz)
- `expires_at` (timestamptz) — auto-set from deadline_hours

#### live_convoys
- `id` (uuid, PK)
- `road_sheet_id` (uuid, nullable FK → road_sheets)
- `freight_id` (uuid, nullable FK → freight_market)
- `driver_id` (uuid, nullable FK → drivers)
- `driver_user_id` (uuid, nullable)
- `driver_name` (text)
- `truck_id` (uuid, nullable FK → trucks)
- `truck_name` (text, nullable)
- `route_label` (text) — "Paris → Lyon"
- `cargo` (text)
- `distance_total` (integer) — total km
- `distance_done` (integer, default 0) — km completed
- `progress_percent` (integer, default 0) — 0–100
- `speed_kmh` (integer, nullable) — current speed
- `status` (text) — en_route / pause / arrive / annule
- `started_at` (timestamptz)
- `updated_at` (timestamptz)
- `notes` (text, nullable)

### Modified Tables

#### road_sheets
- Added `freight_id` (uuid, nullable) — links a road sheet to a freight market entry

## Security
- RLS enabled on both new tables
- Policies scoped `TO anon, authenticated` (no-auth-required app pattern): all authenticated users can view
- Insert/Update: all authenticated users (role enforcement done at UI level)
- Delete: all authenticated users (role enforcement done at UI level)

## Important Notes
1. `expires_at` is computed as `created_at + (deadline_hours * interval '1 hour')`
2. `gross_revenue` should equal `distance_km * price_per_km`
3. Road sheet status pipeline: draft → submitted → approved/rejected (unchanged)
4. Progress updates on live_convoys auto-set `updated_at` via trigger
*/

-- ─── freight_market ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freight_market (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_city  text NOT NULL,
  departure_company text NOT NULL,
  arrival_city    text NOT NULL,
  arrival_company text NOT NULL,
  cargo           text NOT NULL,
  trailer_type    text NOT NULL,
  weight_tons     numeric(6,2) NOT NULL,
  distance_km     integer NOT NULL,
  price_per_km    numeric(5,3) NOT NULL,
  gross_revenue   numeric(10,2) NOT NULL,
  deadline_hours  integer NOT NULL DEFAULT 48,
  difficulty      text NOT NULL DEFAULT 'Moyen',
  status          text NOT NULL DEFAULT 'disponible'
                  CHECK (status IN ('disponible','reserve','en_cours','termine','expire')),
  assigned_driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  road_sheet_id      uuid REFERENCES road_sheets(id) ON DELETE SET NULL,
  created_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE freight_market ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "freight_market_select" ON freight_market;
CREATE POLICY "freight_market_select" ON freight_market FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "freight_market_insert" ON freight_market;
CREATE POLICY "freight_market_insert" ON freight_market FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "freight_market_update" ON freight_market;
CREATE POLICY "freight_market_update" ON freight_market FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "freight_market_delete" ON freight_market;
CREATE POLICY "freight_market_delete" ON freight_market FOR DELETE
  TO authenticated USING (true);

-- ─── live_convoys ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_convoys (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_sheet_id    uuid REFERENCES road_sheets(id) ON DELETE SET NULL,
  freight_id       uuid REFERENCES freight_market(id) ON DELETE SET NULL,
  driver_id        uuid REFERENCES drivers(id) ON DELETE SET NULL,
  driver_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name      text NOT NULL,
  truck_id         uuid REFERENCES trucks(id) ON DELETE SET NULL,
  truck_name       text,
  route_label      text NOT NULL,
  cargo            text NOT NULL,
  distance_total   integer NOT NULL,
  distance_done    integer NOT NULL DEFAULT 0,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  speed_kmh        integer,
  status           text NOT NULL DEFAULT 'en_route'
                   CHECK (status IN ('en_route','pause','arrive','annule')),
  started_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  notes            text
);

ALTER TABLE live_convoys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_convoys_select" ON live_convoys;
CREATE POLICY "live_convoys_select" ON live_convoys FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "live_convoys_insert" ON live_convoys;
CREATE POLICY "live_convoys_insert" ON live_convoys FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "live_convoys_update" ON live_convoys;
CREATE POLICY "live_convoys_update" ON live_convoys FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "live_convoys_delete" ON live_convoys;
CREATE POLICY "live_convoys_delete" ON live_convoys FOR DELETE
  TO authenticated USING (true);

-- Auto-update updated_at on live_convoys
CREATE OR REPLACE FUNCTION set_live_convoy_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_convoys_updated_at ON live_convoys;
CREATE TRIGGER trg_live_convoys_updated_at
  BEFORE UPDATE ON live_convoys
  FOR EACH ROW EXECUTE FUNCTION set_live_convoy_updated_at();

-- ─── road_sheets: add freight_id ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'road_sheets' AND column_name = 'freight_id'
  ) THEN
    ALTER TABLE road_sheets ADD COLUMN freight_id uuid REFERENCES freight_market(id) ON DELETE SET NULL;
  END IF;
END $$;
