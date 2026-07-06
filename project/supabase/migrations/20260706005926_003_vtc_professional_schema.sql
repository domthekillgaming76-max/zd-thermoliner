/*
# VTC Euro Truck Simulator Professional Platform Schema

1. Overview
Complete database schema for a professional VTC management platform with real-time features, 
road sheets, automatic calculations, medals, and comprehensive driver management.

2. New Tables
- `vtc_settings` - Company configuration (name, budget, settings)
- `road_sheets` - Driver road sheets with routes
- `route_legs` - Individual segments of a road sheet
- `chat_rooms` - Chat channels
- `chat_messages` - Real-time chat messages
- `medals` - Awarded medals to drivers
- `company_budget` - Financial tracking for the company
- `company_expenses` - Company-wide expenses
- `deliveries` - Delivery records
- `events` - Company events and missions
- `event_participants` - Event participation
- `driver_stats` - Aggregated driver statistics

3. Functions
- `calculate_monthly_stats()` - Auto-calculate km per driver
- `award_monthly_medals()` - Automatic medal attribution
- `update_driver_stats()` - Update stats on delivery

4. Triggers
- Auto-update driver stats on delivery completion

5. Notes
- All tables have proper RLS policies
- Optimized for real-time updates
*/

-- VTC Settings (Company configuration)
CREATE TABLE IF NOT EXISTS vtc_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Z&D Thermoliner',
  description text,
  logo_url text,
  monthly_distance_goal integer DEFAULT 100000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vtc_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_vtc_settings" ON vtc_settings;
CREATE POLICY "select_vtc_settings" ON vtc_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_vtc_settings" ON vtc_settings;
CREATE POLICY "update_vtc_settings" ON vtc_settings FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

INSERT INTO vtc_settings (name) VALUES ('Z&D Thermoliner') ON CONFLICT DO NOTHING;

-- Road Sheets (Feuilles de route)
CREATE TABLE IF NOT EXISTS road_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  driver_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_distance integer DEFAULT 0,
  total_fuel decimal(8,2) DEFAULT 0,
  total_tolls decimal(10,2) DEFAULT 0,
  cargo_type text,
  company text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE road_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_road_sheets" ON road_sheets;
CREATE POLICY "select_road_sheets" ON road_sheets FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_road_sheets" ON road_sheets;
CREATE POLICY "insert_road_sheets" ON road_sheets FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_road_sheets" ON road_sheets;
CREATE POLICY "update_road_sheets" ON road_sheets FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_road_sheets" ON road_sheets;
CREATE POLICY "delete_road_sheets" ON road_sheets FOR DELETE
  TO authenticated USING (true);

-- Route Legs (Segments of road sheet)
CREATE TABLE IF NOT EXISTS route_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_sheet_id uuid NOT NULL REFERENCES road_sheets(id) ON DELETE CASCADE,
  start_city text NOT NULL,
  end_city text NOT NULL,
  distance integer NOT NULL,
  fuel_used decimal(8,2) DEFAULT 0,
  toll_cost decimal(10,2) DEFAULT 0,
  arrival_time timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE route_legs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_route_legs" ON route_legs;
CREATE POLICY "select_route_legs" ON route_legs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_route_legs" ON route_legs;
CREATE POLICY "insert_route_legs" ON route_legs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_route_legs" ON route_legs;
CREATE POLICY "delete_route_legs" ON route_legs FOR DELETE
  TO authenticated USING (true);

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_chat_rooms" ON chat_rooms;
CREATE POLICY "select_chat_rooms" ON chat_rooms FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_rooms" ON chat_rooms;
CREATE POLICY "insert_chat_rooms" ON chat_rooms FOR INSERT
  TO authenticated WITH CHECK (true);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_chat_messages" ON chat_messages;
CREATE POLICY "delete_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Medals
CREATE TABLE IF NOT EXISTS medals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('gold', 'silver', 'bronze')),
  month integer NOT NULL,
  year integer NOT NULL,
  distance integer DEFAULT 0,
  deliveries integer DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, month, year, type)
);

ALTER TABLE medals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_medals" ON medals;
CREATE POLICY "select_medals" ON medals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_medals" ON medals;
CREATE POLICY "insert_medals" ON medals FOR INSERT
  TO authenticated WITH CHECK (true);

-- Company Budget
CREATE TABLE IF NOT EXISTS company_budget (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  opening_balance decimal(12,2) NOT NULL DEFAULT 0,
  income decimal(12,2) NOT NULL DEFAULT 0,
  expenses decimal(12,2) NOT NULL DEFAULT 0,
  closing_balance decimal(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE company_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_company_budget" ON company_budget;
CREATE POLICY "select_company_budget" ON company_budget FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_company_budget" ON company_budget;
CREATE POLICY "manage_company_budget" ON company_budget FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Company Expenses
CREATE TABLE IF NOT EXISTS company_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount decimal(10,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  receipt_url text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_company_expenses" ON company_expenses;
CREATE POLICY "select_company_expenses" ON company_expenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_company_expenses" ON company_expenses;
CREATE POLICY "manage_company_expenses" ON company_expenses FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  truck_id uuid REFERENCES trucks(id) ON DELETE SET NULL,
  cargo_type text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  distance integer DEFAULT 0,
  earnings decimal(10,2) DEFAULT 0,
  fuel_used decimal(8,2) DEFAULT 0,
  tolls_paid decimal(10,2) DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_deliveries" ON deliveries;
CREATE POLICY "select_deliveries" ON deliveries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_deliveries" ON deliveries;
CREATE POLICY "insert_deliveries" ON deliveries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_deliveries" ON deliveries;
CREATE POLICY "update_deliveries" ON deliveries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'convoy' CHECK (event_type IN ('convoy', 'meeting', 'competition', 'other')),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  image_url text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  max_participants integer,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_events" ON events;
CREATE POLICY "select_events" ON events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events" ON events FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_events" ON events;
CREATE POLICY "update_events" ON events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_events" ON events;
CREATE POLICY "delete_events" ON events FOR DELETE
  TO authenticated USING (true);

-- Event Participants
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_event_participants" ON event_participants;
CREATE POLICY "select_event_participants" ON event_participants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "join_events" ON event_participants;
CREATE POLICY "join_events" ON event_participants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "leave_events" ON event_participants;
CREATE POLICY "leave_events" ON event_participants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Driver Stats
CREATE TABLE IF NOT EXISTS driver_stats (
  driver_id uuid PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  total_distance integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  total_earnings decimal(12,2) DEFAULT 0,
  total_fuel decimal(10,2) DEFAULT 0,
  total_tolls decimal(10,2) DEFAULT 0,
  monthly_distance integer DEFAULT 0,
  monthly_deliveries integer DEFAULT 0,
  reputation integer DEFAULT 0,
  last_delivery_date date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE driver_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_driver_stats" ON driver_stats;
CREATE POLICY "select_driver_stats" ON driver_stats FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_driver_stats" ON driver_stats;
CREATE POLICY "update_driver_stats" ON driver_stats FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Function to update driver stats
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO driver_stats (driver_id, total_distance, total_deliveries, total_earnings, last_delivery_date)
  VALUES (
    NEW.driver_id,
    COALESCE(NEW.distance, 0),
    1,
    COALESCE(NEW.earnings, 0),
    NEW.date
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    total_distance = driver_stats.total_distance + COALESCE(NEW.distance, 0),
    total_deliveries = driver_stats.total_deliveries + 1,
    total_earnings = driver_stats.total_earnings + COALESCE(NEW.earnings, 0),
    total_fuel = driver_stats.total_fuel + COALESCE(NEW.fuel_used, 0),
    total_tolls = driver_stats.total_tolls + COALESCE(NEW.tolls_paid, 0),
    last_delivery_date = GREATEST(driver_stats.last_delivery_date, NEW.date),
    updated_at = now()
  WHERE NEW.completed = true;
  RETURN NEW;
END;
$$;

-- Trigger for deliveries
DROP TRIGGER IF EXISTS on_delivery_complete ON deliveries;
CREATE TRIGGER on_delivery_complete
  AFTER INSERT OR UPDATE ON deliveries
  FOR EACH ROW WHEN (NEW.completed = true)
  EXECUTE FUNCTION update_driver_stats();

-- Function to calculate monthly stats
CREATE OR REPLACE FUNCTION calculate_monthly_stats(target_month integer, target_year integer)
RETURNS TABLE (
  driver_id uuid,
  name text,
  distance integer,
  deliveries_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    COALESCE(SUM(rl.distance), 0)::integer as distance,
    COUNT(rl.id) as deliveries_count
  FROM drivers d
  LEFT JOIN road_sheets rs ON rs.driver_id = d.id 
    AND EXTRACT(MONTH FROM rs.date) = target_month 
    AND EXTRACT(YEAR FROM rs.date) = target_year
  LEFT JOIN route_legs rl ON rl.road_sheet_id = rs.id
  WHERE d.status = 'active'
  GROUP BY d.id, d.name
  ORDER BY distance DESC;
END;
$$;

-- Function to award monthly medals
CREATE OR REPLACE FUNCTION award_monthly_medals(target_month integer, target_year integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec record;
  rank_num integer := 0;
BEGIN
  FOR rec IN
    SELECT 
      driver_id,
      name,
      distance,
      deliveries_count
    FROM calculate_monthly_stats(target_month, target_year)
    WHERE distance > 0
    ORDER BY distance DESC
    LIMIT 3
  LOOP
    rank_num := rank_num + 1;
    
    INSERT INTO medals (driver_id, type, month, year, distance, deliveries)
    VALUES (
      rec.driver_id,
      CASE 
        WHEN rank_num = 1 THEN 'gold'
        WHEN rank_num = 2 THEN 'silver'
        WHEN rank_num = 3 THEN 'bronze'
      END,
      target_month,
      target_year,
      rec.distance,
      rec.deliveries_count
    )
    ON CONFLICT (driver_id, month, year, type) DO UPDATE SET
      distance = rec.distance,
      deliveries = rec.deliveries_count;
  END LOOP;
END;
$$;

-- Create default chat rooms
INSERT INTO chat_rooms (name, description, type) VALUES
  ('General', 'Discussion generale de la VTC', 'public'),
  ('Routes', 'Partage dinfos sur les routes', 'public'),
  ('Evenements', 'Organisation des convois', 'public')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_road_sheets_driver ON road_sheets(driver_id);
CREATE INDEX IF NOT EXISTS idx_road_sheets_date ON road_sheets(date);
CREATE INDEX IF NOT EXISTS idx_route_legs_road_sheet ON route_legs(road_sheet_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(date);
CREATE INDEX IF NOT EXISTS idx_medals_driver ON medals(driver_id);
CREATE INDEX IF NOT EXISTS idx_company_budget_month_year ON company_budget(month, year);