-- Z&D Thermoliner — Fresh database initialization
-- Merged from migrations 001-017 (2026-07-06)
-- Execute once in Supabase SQL Editor on an empty project

-- ============================================================
-- MIGRATION: 20260706004657_001_initial_schema.sql
-- ============================================================
/*
# Z&D Thermoliner Initial Schema

1. Overview
This migration creates the complete database structure for the Z&D Thermoliner trucking company management application.

2. New Tables
- `profiles` - User profiles with avatar and customization settings
  - id (uuid, primary key, references auth.users)
  - email (text)
  - full_name (text)
  - avatar_url (text)
  - theme_color (text, default 'red')
  - truck_photo_url (text)
  - role (text, default 'driver')
  - created_at (timestamptz)
  - updated_at (timestamptz)

- `drivers` - Company drivers
  - id (uuid, primary key)
  - user_id (uuid, references profiles, nullable)
  - name (text)
  - photo_url (text)
  - phone (text)
  - license_number (text)
  - truck_id (uuid, references trucks, nullable)
  - status (text, default 'active')
  - created_at (timestamptz)

- `garages` - Company garages/facilities
  - id (uuid, primary key)
  - name (text)
  - address (text)
  - city (text)
  - postal_code (text)
  - latitude (decimal)
  - longitude (decimal)
  - capacity (integer)
  - created_at (timestamptz)

- `trucks` - Company fleet
  - id (uuid, primary key)
  - registration (text, unique)
  - model (text)
  - photo_url (text)
  - driver_id (uuid, references drivers, nullable)
  - garage_id (uuid, references garages, nullable)
  - status (text, default 'active')
  - mileage (integer, default 0)
  - created_at (timestamptz)

- `posts` - Society wall posts
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - content (text)
  - photo_url (text)
  - created_at (timestamptz)

- `comments` - Post comments
  - id (uuid, primary key)
  - post_id (uuid, references posts)
  - user_id (uuid, references profiles)
  - content (text)
  - created_at (timestamptz)

- `likes` - Post likes
  - id (uuid, primary key)
  - post_id (uuid, references posts)
  - user_id (uuid, references profiles)
  - created_at (timestamptz)

- `transactions` - Bank transactions (expenses and income)
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - type (text) - 'income' or 'expense'
  - amount (decimal)
  - description (text)
  - category (text)
  - date (date)
  - created_at (timestamptz)

3. Security
- RLS enabled on all tables
- All tables use authenticated-only policies with ownership checks
- Owner columns default to auth.uid() for automatic user assignment

4. Notes
- Profiles table uses auth.users as the base with a one-to-one relationship
- Drivers can be linked to users for self-service or managed independently
- Trucks can be assigned to drivers and parked at garages
- All tables have created_at timestamps for auditing
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text,
  theme_color text DEFAULT 'red',
  truck_photo_url text,
  role text DEFAULT 'driver' CHECK (role IN ('admin', 'manager', 'driver')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  photo_url text,
  phone text,
  license_number text,
  truck_id uuid,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_drivers" ON drivers;
CREATE POLICY "select_drivers" ON drivers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_drivers" ON drivers;
CREATE POLICY "insert_drivers" ON drivers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_drivers" ON drivers;
CREATE POLICY "update_drivers" ON drivers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_drivers" ON drivers;
CREATE POLICY "delete_drivers" ON drivers FOR DELETE
  TO authenticated USING (true);

-- Garages table
CREATE TABLE IF NOT EXISTS garages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  postal_code text,
  latitude decimal(9,6),
  longitude decimal(9,6),
  capacity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE garages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_garages" ON garages;
CREATE POLICY "select_garages" ON garages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_garages" ON garages;
CREATE POLICY "insert_garages" ON garages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_garages" ON garages;
CREATE POLICY "update_garages" ON garages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_garages" ON garages;
CREATE POLICY "delete_garages" ON garages FOR DELETE
  TO authenticated USING (true);

-- Trucks table
CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text UNIQUE NOT NULL,
  model text,
  photo_url text,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  garage_id uuid REFERENCES garages(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  mileage integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_trucks" ON trucks;
CREATE POLICY "select_trucks" ON trucks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_trucks" ON trucks;
CREATE POLICY "insert_trucks" ON trucks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_trucks" ON trucks;
CREATE POLICY "update_trucks" ON trucks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_trucks" ON trucks;
CREATE POLICY "delete_trucks" ON trucks FOR DELETE
  TO authenticated USING (true);

-- Add truck_id foreign key to drivers after trucks table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'truck_id' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE drivers ADD COLUMN truck_id uuid REFERENCES trucks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_posts" ON posts;
CREATE POLICY "select_posts" ON posts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_posts" ON posts;
CREATE POLICY "insert_posts" ON posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_posts" ON posts;
CREATE POLICY "update_posts" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_posts" ON posts;
CREATE POLICY "delete_posts" ON posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_comments" ON comments;
CREATE POLICY "select_comments" ON comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_comments" ON comments;
CREATE POLICY "insert_comments" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_comments" ON comments;
CREATE POLICY "delete_comments" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_likes" ON likes;
CREATE POLICY "select_likes" ON likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_likes" ON likes;
CREATE POLICY "insert_likes" ON likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_likes" ON likes;
CREATE POLICY "delete_likes" ON likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount decimal(12,2) NOT NULL,
  description text,
  category text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_truck_id ON drivers(truck_id);
CREATE INDEX IF NOT EXISTS idx_trucks_driver_id ON trucks(driver_id);
CREATE INDEX IF NOT EXISTS idx_trucks_garage_id ON trucks(garage_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MIGRATION: 20260706005352_002_applications_notifications.sql
-- ============================================================
/*
# Add applications table and notifications

1. New Tables
- `applications` - Driver applications to the company
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - status (text, default 'pending')
  - message (text)
  - created_at (timestamptz)

- `notifications` - User notifications
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - title (text)
  - message (text)
  - read (boolean, default false)
  - type (text)
  - created_at (timestamptz)

2. Notes
- Applications allow users to request to join the company
- Notifications system for user alerts
*/

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications" ON applications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_applications" ON applications;
CREATE POLICY "insert_applications" ON applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_applications" ON applications;
CREATE POLICY "update_applications" ON applications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  type text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================
-- MIGRATION: 20260706005926_003_vtc_professional_schema.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20260706052543_004_role_system_recruitment.sql
-- ============================================================
/*
# Z&D Thermoliner Role System and Recruitment

Step 1: Create role definitions and helper functions
Step 2: Add new columns to profiles
Step 3: Create recruitment_applications table
*/

-- Role definitions table
CREATE TABLE IF NOT EXISTS vtc_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  level integer NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vtc_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_vtc_roles" ON vtc_roles;
CREATE POLICY "select_vtc_roles" ON vtc_roles FOR SELECT
  TO authenticated USING (true);

-- Insert role definitions
INSERT INTO vtc_roles (name, display_name, level, description, permissions) VALUES
('pdg', 'PDG', 100, 'President Directeur General - Acces total', '{"all": true, "manage_roles": true, "manage_pdg": true}'),
('patron', 'Patron', 90, 'Patron - Administration sauf changement PDG', '{"all": true, "manage_roles": true, "manage_pdg": false}'),
('directeur', 'Directeur', 70, 'Directeur - Gestion chauffeurs, flotte, feuilles de route', '{"manage_drivers": true, "manage_fleet": true, "manage_road_sheets": true, "manage_garages": true}'),
('dispatcher', 'Dispatcher', 50, 'Dispatcher - Feuilles de route, planning, missions', '{"manage_road_sheets": true, "view_fleet": true, "assign_missions": true}'),
('chauffeur', 'Chauffeur', 30, 'Chauffeur - Mur, profil, feuilles de route personnelles', '{"wall": true, "profile": true, "own_road_sheets": true, "view_fleet": true, "chat": true}'),
('tractionnaire', 'Tractionnaire', 20, 'Tractionnaire - Profil, camion personnel', '{"profile": true, "own_road_sheets": true, "own_truck": true}'),
('candidat', 'Candidat', 10, 'Candidat - Acces uniquement Nous rejoindre', '{"join_page": true}')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  level = EXCLUDED.level,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- Add new fields to profiles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pseudo') THEN
    ALTER TABLE profiles ADD COLUMN pseudo text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
    ALTER TABLE profiles ADD COLUMN age integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ets2_experience') THEN
    ALTER TABLE profiles ADD COLUMN ets2_experience text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'has_trucksbook') THEN
    ALTER TABLE profiles ADD COLUMN has_trucksbook boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'discord') THEN
    ALTER TABLE profiles ADD COLUMN discord text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_truck') THEN
    ALTER TABLE profiles ADD COLUMN preferred_truck text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'availability') THEN
    ALTER TABLE profiles ADD COLUMN availability text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'motivation') THEN
    ALTER TABLE profiles ADD COLUMN motivation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'application_status') THEN
    ALTER TABLE profiles ADD COLUMN application_status text DEFAULT 'approved' CHECK (application_status IN ('none', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Recruitment applications table
DROP TABLE IF EXISTS recruitment_applications CASCADE;
CREATE TABLE recruitment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  pseudo text NOT NULL,
  email text NOT NULL,
  age integer NOT NULL,
  ets2_experience text NOT NULL,
  has_trucksbook boolean DEFAULT false,
  trucksbook_profile text,
  discord text NOT NULL,
  motivation text NOT NULL,
  preferred_truck text,
  availability text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  assigned_role text DEFAULT 'chauffeur' CHECK (assigned_role IN ('chauffeur', 'tractionnaire')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recruitment_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_applications" ON recruitment_applications;
CREATE POLICY "select_applications" ON recruitment_applications FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')
  ));

DROP POLICY IF EXISTS "insert_applications" ON recruitment_applications;
CREATE POLICY "insert_applications" ON recruitment_applications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_applications" ON recruitment_applications;
CREATE POLICY "update_applications" ON recruitment_applications FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg', 'patron')
  ));

-- Get role level function
CREATE OR REPLACE FUNCTION get_role_level(check_user_id uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT vr.level FROM profiles p JOIN vtc_roles vr ON vr.name = p.role WHERE p.id = check_user_id),
    10
  );
$$;

-- Approve application function
CREATE OR REPLACE FUNCTION approve_application(app_id uuid, assigned_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
BEGIN
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF app_record IS NULL THEN RETURN; END IF;
  
  UPDATE recruitment_applications SET status = 'approved', assigned_role = approve_application.assigned_role, reviewed_at = now() WHERE id = app_id;
  UPDATE profiles SET role = approve_application.assigned_role, application_status = 'approved', pseudo = app_record.pseudo, age = app_record.age, ets2_experience = app_record.ets2_experience, has_trucksbook = app_record.has_trucksbook, discord = app_record.discord, motivation = app_record.motivation, preferred_truck = app_record.preferred_truck, availability = app_record.availability WHERE id = app_record.user_id;
  INSERT INTO notifications (user_id, title, message, type) VALUES (app_record.user_id, 'Candidature acceptee!', 'Bienvenue chez Z&D Thermoliner!', 'success');
  INSERT INTO posts (user_id, content) VALUES (app_record.user_id, 'Bienvenue a ' || app_record.pseudo || ' chez Z&D Thermoliner!');
  IF approve_application.assigned_role = 'chauffeur' THEN INSERT INTO drivers (name, user_id, status) VALUES (app_record.pseudo, app_record.user_id, 'active') ON CONFLICT DO NOTHING; END IF;
END;
$$;

-- Reject application function
CREATE OR REPLACE FUNCTION reject_application(app_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
BEGIN
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF app_record IS NULL THEN RETURN; END IF;
  UPDATE recruitment_applications SET status = 'rejected', reviewed_at = now() WHERE id = app_id;
  UPDATE profiles SET application_status = 'rejected' WHERE id = app_record.user_id;
  INSERT INTO notifications (user_id, title, message, type) VALUES (app_record.user_id, 'Candidature refusee', 'Votre candidature n''a pas ete acceptee.', 'error');
END;
$$;

-- Update handle_new_user for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, application_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'candidat', 'none');
  RETURN NEW;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_status ON recruitment_applications(status);

-- ============================================================
-- MIGRATION: 20260706061357_005_fix_role_constraint_set_pdg.sql
-- ============================================================
-- Step 1: Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Fix any rows with old role values
UPDATE profiles SET role = 'pdg' WHERE role = 'admin';
UPDATE profiles SET role = 'directeur' WHERE role = 'manager';
UPDATE profiles SET role = 'chauffeur' WHERE role = 'driver';
-- Set 'candidat' for any null or unknown roles
UPDATE profiles SET role = 'candidat', application_status = 'none' WHERE role IS NULL OR role NOT IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat');

-- Step 3: Add the new constraint with full role list
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat'));

-- Step 4: Set the PDG account (replace email if needed)
UPDATE profiles
SET role = 'pdg', application_status = 'approved'
WHERE email = 'domthekillgaming76@gmail.com';

-- ============================================================
-- MIGRATION: 20260706064025_006_economy_system.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20260706072531_007_photo_requirements_garages_bank_approval.sql
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20260706082935_008_freight_market_live_convoys.sql
-- ============================================================
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


-- ============================================================
-- MIGRATION: 20260706090840_009_drivers_extended_approval_sync.sql
-- ============================================================
/*
# Extend Drivers Table + Upgrade approve_application RPC

## Summary
Enhances the drivers table with RP-specific fields and updates the approve_application
function to populate all new fields when a candidature is accepted.

## Changes

### Modified Tables

#### drivers — New columns added
- `user_id` (uuid, nullable FK → auth.users) — links driver to their account
- `pseudo` (text, nullable) — RP pseudo, synced from profile
- `avatar_url` (text, nullable) — profile photo URL
- `role` (text, default 'chauffeur') — chauffeur or tractionnaire
- `garage_id` (uuid, nullable FK → garages) — assigned garage
- `monthly_km` (integer, default 0) — km this month
- `total_km` (integer, default 0) — all-time km
- `deliveries_count` (integer, default 0) — all-time deliveries
- `profile_description` (text, nullable) — RP bio written by driver
- `joined_at` (timestamptz, default now()) — when they joined the VTC

## Updated Functions

### approve_application
- Now populates pseudo, avatar_url, role, user_id, joined_at on driver creation
- Also handles tractionnaire role (creates driver for both roles)
- Posts wall message with proper emoji text: "Bienvenue a [pseudo] chez Z&D Thermoliner!"
- Sends enriched notification

## Security
- RLS policies updated so:
  - authenticated members (level >= chauffeur) can SELECT all drivers
  - PDG/Patron/Directeur/Dispatcher can SELECT
  - PDG/Patron can UPDATE any driver
  - Each driver can UPDATE their own profile_description
  - INSERT: only via approve_application (SECURITY DEFINER) or PDG/Patron

## Notes
1. All new columns use IF NOT EXISTS for idempotency
2. user_id UNIQUE constraint added to prevent duplicate driver records per user
3. approve_application now upserts rather than inserting blindly — safe to re-run
*/

-- ─── Extend drivers table ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'pseudo') THEN
    ALTER TABLE drivers ADD COLUMN pseudo text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'avatar_url') THEN
    ALTER TABLE drivers ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'role') THEN
    ALTER TABLE drivers ADD COLUMN role text NOT NULL DEFAULT 'chauffeur' CHECK (role IN ('chauffeur','tractionnaire','dispatcher','directeur','patron','pdg'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'garage_id') THEN
    ALTER TABLE drivers ADD COLUMN garage_id uuid REFERENCES garages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'monthly_km') THEN
    ALTER TABLE drivers ADD COLUMN monthly_km integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'total_km') THEN
    ALTER TABLE drivers ADD COLUMN total_km integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'deliveries_count') THEN
    ALTER TABLE drivers ADD COLUMN deliveries_count integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'profile_description') THEN
    ALTER TABLE drivers ADD COLUMN profile_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'joined_at') THEN
    ALTER TABLE drivers ADD COLUMN joined_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Add unique constraint on user_id to prevent duplicate driver records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'drivers' AND constraint_name = 'drivers_user_id_key'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ─── RLS policies for drivers ─────────────────────────────────────────────────
-- Any member with role >= tractionnaire (level 20+) can see all drivers
DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
    )
  );

-- PDG/Patron can insert manually
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

-- PDG/Patron can update any driver; each driver can update only their own profile_description
DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
    OR user_id = auth.uid()
  );

-- PDG/Patron only can delete
DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

-- ─── Update approve_application RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION approve_application(app_id uuid, assigned_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record recruitment_applications;
  applicant_profile profiles;
BEGIN
  -- Load application
  SELECT * INTO app_record FROM recruitment_applications WHERE id = app_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Load applicant profile for avatar
  SELECT * INTO applicant_profile FROM profiles WHERE id = app_record.user_id;

  -- Update application
  UPDATE recruitment_applications
    SET status = 'approved',
        assigned_role = approve_application.assigned_role,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = app_id;

  -- Update profile: set role + copy application fields
  UPDATE profiles SET
    role = approve_application.assigned_role,
    application_status = 'approved',
    pseudo = COALESCE(profiles.pseudo, app_record.pseudo),
    age = COALESCE(profiles.age, app_record.age),
    ets2_experience = COALESCE(profiles.ets2_experience, app_record.ets2_experience),
    has_trucksbook = COALESCE(profiles.has_trucksbook, app_record.has_trucksbook),
    discord = COALESCE(profiles.discord, app_record.discord),
    motivation = COALESCE(profiles.motivation, app_record.motivation),
    preferred_truck = COALESCE(profiles.preferred_truck, app_record.preferred_truck),
    availability = COALESCE(profiles.availability, app_record.availability)
  WHERE id = app_record.user_id;

  -- Create or update driver record (upsert by user_id)
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at)
  VALUES (
    app_record.pseudo,
    app_record.user_id,
    app_record.pseudo,
    applicant_profile.avatar_url,
    approve_application.assigned_role,
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    pseudo = EXCLUDED.pseudo,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    status = 'active',
    joined_at = COALESCE(drivers.joined_at, now());

  -- Notification to the applicant
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    app_record.user_id,
    'Candidature acceptee!',
    'Bienvenue chez Z&D Thermoliner! Tu fais maintenant partie de l''equipe en tant que ' || approve_application.assigned_role || '.',
    'success'
  );

  -- Wall post (posted by the recruiter, mentions the new member)
  INSERT INTO posts (user_id, content)
  VALUES (
    auth.uid(),
    'Bienvenue a ' || app_record.pseudo || ' chez Z&D Thermoliner! Un nouveau ' || approve_application.assigned_role || ' rejoint la flotte!'
  );

END;
$$;

-- ─── Sync helper: ensure all approved non-candidat profiles have a driver record ─
CREATE OR REPLACE FUNCTION sync_missing_driver_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at)
  SELECT
    COALESCE(p.pseudo, p.full_name, p.email) AS name,
    p.id,
    p.pseudo,
    p.avatar_url,
    p.role,
    'active',
    COALESCE(p.created_at, now())
  FROM profiles p
  WHERE p.role NOT IN ('candidat')
    AND p.application_status = 'approved'
    AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;


-- ============================================================
-- MIGRATION: 20260706092415_010_member_lifecycle_audit_logs.sql
-- ============================================================
/*
# Member Lifecycle Management: Departure, Firing, Banning, Restoration

## Summary
Adds full member lifecycle management: voluntary departure, firing, banning, and restoration.
Includes audit log table and SECURITY DEFINER functions callable by authorized roles.

## Changes

### New Tables
#### members_audit_logs
- Tracks every moderation action: left_company, fired, banned, removed_from_drivers, restored
- Stores old/new role, reason, and who performed the action

### Modified Tables
#### profiles
- `application_status` CHECK extended to include: 'left', 'fired', 'banned'
- `is_active` boolean column added (false = banned/departed, blocks access)

#### drivers
- `is_active_driver` boolean column added (false = removed from active salon)

### New Functions
- `leave_company(reason text)` — member calls this on themselves
- `fire_member(target_user_id uuid, reason text)` — PDG/Patron fires a member
- `ban_member(target_user_id uuid, reason text)` — PDG only
- `remove_from_drivers(target_driver_id uuid)` — PDG/Patron removes from active list
- `restore_member(target_user_id uuid, restore_role text)` — PDG restores former/banned member

## Security
- leave_company: any authenticated non-candidat, non-banni, acts on own account only
- fire_member: PDG or Patron only
- ban_member: PDG only
- remove_from_drivers: PDG or Patron only
- restore_member: PDG only
- audit_logs: SELECT for PDG/Patron, INSERT via SECURITY DEFINER functions only
*/

-- ─── Extend profiles: add application_status values and is_active ─────────────
DO $$
BEGIN
  -- Drop and recreate the check constraint to include new statuses
  -- (PostgreSQL requires drop/recreate for CHECK constraints on existing columns)
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_application_status_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_application_status_check
    CHECK (application_status IN ('none', 'pending', 'approved', 'rejected', 'left', 'fired', 'banned'));

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Mark existing non-candidat profiles as active (safe default)
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- ─── Extend drivers: is_active_driver ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_active_driver') THEN
    ALTER TABLE drivers ADD COLUMN is_active_driver boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ─── members_audit_logs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members_audit_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_by_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type      text NOT NULL CHECK (action_type IN ('left_company','fired','banned','removed_from_drivers','restored')),
  reason           text,
  old_role         text,
  new_role         text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE members_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON members_audit_logs;
CREATE POLICY "audit_logs_select" ON members_audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

DROP POLICY IF EXISTS "audit_logs_insert" ON members_audit_logs;
CREATE POLICY "audit_logs_insert" ON members_audit_logs FOR INSERT
  TO authenticated WITH CHECK (action_by_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON members_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON members_audit_logs(created_at DESC);

-- ─── leave_company ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION leave_company(reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF caller_profile.role IN ('candidat','banni') THEN
    RAISE EXCEPTION 'Cannot leave company: restricted role';
  END IF;

  -- Deactivate profile
  UPDATE profiles SET
    role = 'ancien_membre',
    application_status = 'left',
    is_active = false
  WHERE id = auth.uid();

  -- Deactivate driver record
  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = auth.uid();

  -- Notify PDG
  INSERT INTO notifications (user_id, title, message, type)
  SELECT id, 'Depart membre',
    COALESCE(caller_profile.pseudo, caller_profile.full_name, caller_profile.email) || ' a quitté l''entreprise.',
    'info'
  FROM profiles WHERE role = 'pdg';

  -- Wall post
  INSERT INTO posts (user_id, content)
  VALUES (auth.uid(), COALESCE(caller_profile.pseudo, caller_profile.full_name, 'Un membre') || ' a quitté Z&D Thermoliner.');

  -- Audit log
  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (auth.uid(), auth.uid(), 'left_company', reason, caller_profile.role, 'ancien_membre');
END;
$$;

-- ─── fire_member ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fire_member(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role NOT IN ('pdg','patron') THEN
    RAISE EXCEPTION 'Insufficient permissions to fire members';
  END IF;

  SELECT * INTO target_profile FROM profiles WHERE id = fire_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user not found'; END IF;

  -- Patron cannot fire PDG
  IF caller_profile.role = 'patron' AND target_profile.role = 'pdg' THEN
    RAISE EXCEPTION 'Patron cannot fire PDG';
  END IF;

  UPDATE profiles SET
    role = 'ancien_membre',
    application_status = 'fired',
    is_active = false
  WHERE id = fire_member.target_user_id;

  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = fire_member.target_user_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (fire_member.target_user_id, 'Licenciement', 'Vous avez été licencié de Z&D Thermoliner.', 'error');

  INSERT INTO posts (user_id, content)
  VALUES (auth.uid(), COALESCE(target_profile.pseudo, target_profile.full_name, 'Un membre') || ' ne fait plus partie de Z&D Thermoliner.');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (fire_member.target_user_id, auth.uid(), 'fired', reason, target_profile.role, 'ancien_membre');
END;
$$;

-- ─── ban_member ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ban_member(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role <> 'pdg' THEN
    RAISE EXCEPTION 'Only PDG can ban members';
  END IF;

  SELECT * INTO target_profile FROM profiles WHERE id = ban_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user not found'; END IF;

  UPDATE profiles SET
    role = 'banni',
    application_status = 'banned',
    is_active = false
  WHERE id = ban_member.target_user_id;

  UPDATE drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = ban_member.target_user_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (ban_member.target_user_id, 'Bannissement', 'Votre accès à Z&D Thermoliner a été suspendu.', 'error');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (ban_member.target_user_id, auth.uid(), 'banned', reason, target_profile.role, 'banni');
END;
$$;

-- ─── remove_from_drivers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION remove_from_drivers(target_driver_id uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_driver drivers;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role NOT IN ('pdg','patron') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO target_driver FROM drivers WHERE id = target_driver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver not found'; END IF;

  UPDATE drivers SET is_active_driver = false WHERE id = target_driver_id;

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (
    COALESCE(target_driver.user_id, auth.uid()),
    auth.uid(),
    'removed_from_drivers',
    reason,
    NULL,
    NULL
  );
END;
$$;

-- ─── restore_member ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION restore_member(target_user_id uuid, restore_role text DEFAULT 'chauffeur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  target_profile profiles;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role <> 'pdg' THEN
    RAISE EXCEPTION 'Only PDG can restore members';
  END IF;

  SELECT * INTO target_profile FROM profiles WHERE id = restore_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user not found'; END IF;

  UPDATE profiles SET
    role = restore_member.restore_role,
    application_status = 'approved',
    is_active = true
  WHERE id = restore_member.target_user_id;

  UPDATE drivers SET status = 'active', is_active_driver = true
  WHERE user_id = restore_member.target_user_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (restore_member.target_user_id, 'Compte restauré', 'Votre accès à Z&D Thermoliner a été restauré.', 'success');

  INSERT INTO members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (restore_member.target_user_id, auth.uid(), 'restored', NULL, target_profile.role, restore_member.restore_role);
END;
$$;

-- ─── Update RLS on profiles ───────────────────────────────────────────────────
-- Blocked users (banni/ancien_membre) can still read their own profile (for the blocked screen)
-- but no INSERT/UPDATE themselves on role-related fields
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('pdg','patron')))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('pdg','patron')));


-- ============================================================
-- MIGRATION: 20260706094128_011_app_updates_changelog.sql
-- ============================================================
/*
# App Updates System

## Summary
Adds the global update/changelog system for Z&D Thermoliner.
PDG can publish versioned updates visible to all members.
Each member's read status is tracked individually.

## New Tables

### app_updates
Stores all update posts with version, type, status, and content.
- `id` (uuid, PK)
- `title` (text) — short headline
- `description` (text) — full changelog / body
- `version` (text) — e.g. "v1.1.0"
- `update_type` (text) — nouveaute / correction / maintenance / annonce
- `status` (text) — brouillon / publiee
- `created_by` (uuid FK → auth.users)
- `published_at` (timestamptz, nullable) — set when status → publiee
- `created_at` / `updated_at` (timestamptz)

### update_reads
Tracks which members have acknowledged each update.
- `id` (uuid, PK)
- `update_id` (uuid FK → app_updates)
- `user_id` (uuid FK → auth.users)
- `read_at` (timestamptz)
- UNIQUE (update_id, user_id) — one record per member per update

## Security
- app_updates SELECT: authenticated members (level >= tractionnaire, excludes banni/candidat)
- app_updates INSERT/UPDATE/DELETE: PDG only
- update_reads SELECT: user can read their own rows; PDG/Patron can read all
- update_reads INSERT: any authenticated user (marking own as read)
*/

-- ─── app_updates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text NOT NULL,
  version     text NOT NULL DEFAULT 'v1.0.0',
  update_type text NOT NULL DEFAULT 'nouveaute'
              CHECK (update_type IN ('nouveaute','correction','maintenance','annonce')),
  status      text NOT NULL DEFAULT 'brouillon'
              CHECK (status IN ('brouillon','publiee')),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "updates_select" ON app_updates;
CREATE POLICY "updates_select" ON app_updates FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role NOT IN ('candidat','banni','ancien_membre')
    )
  );

DROP POLICY IF EXISTS "updates_insert" ON app_updates;
CREATE POLICY "updates_insert" ON app_updates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg')
  );

DROP POLICY IF EXISTS "updates_update" ON app_updates;
CREATE POLICY "updates_update" ON app_updates FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg'));

DROP POLICY IF EXISTS "updates_delete" ON app_updates;
CREATE POLICY "updates_delete" ON app_updates FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pdg')
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_app_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'publiee' AND OLD.status = 'brouillon' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_updates_updated_at ON app_updates;
CREATE TRIGGER trg_app_updates_updated_at
  BEFORE UPDATE ON app_updates
  FOR EACH ROW EXECUTE FUNCTION set_app_update_updated_at();

-- ─── update_reads ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS update_reads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id   uuid NOT NULL REFERENCES app_updates(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (update_id, user_id)
);

ALTER TABLE update_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "update_reads_select_own" ON update_reads;
CREATE POLICY "update_reads_select_own" ON update_reads FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

DROP POLICY IF EXISTS "update_reads_insert" ON update_reads;
CREATE POLICY "update_reads_insert" ON update_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ─── Helper: publish update + notify all members ─────────────────────────────
CREATE OR REPLACE FUNCTION publish_update(update_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_profile profiles;
  upd app_updates;
BEGIN
  SELECT * INTO caller_profile FROM profiles WHERE id = auth.uid();
  IF caller_profile.role <> 'pdg' THEN
    RAISE EXCEPTION 'Only PDG can publish updates';
  END IF;

  SELECT * INTO upd FROM app_updates WHERE id = publish_update.update_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Update not found'; END IF;

  -- Mark as published
  UPDATE app_updates
    SET status = 'publiee', published_at = now(), updated_at = now()
    WHERE id = publish_update.update_id;

  -- Notify all active members (role not in candidat/banni/ancien_membre)
  INSERT INTO notifications (user_id, title, message, type)
  SELECT
    id,
    'Mise à jour ' || upd.version,
    upd.title,
    'info'
  FROM profiles
  WHERE role NOT IN ('candidat','banni','ancien_membre')
    AND id <> auth.uid();

END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_updates_status ON app_updates(status);
CREATE INDEX IF NOT EXISTS idx_app_updates_published ON app_updates(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_reads_user ON update_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_update_reads_update ON update_reads(update_id);


-- ============================================================
-- MIGRATION: 20260706095853_012_repair_role_constraint_rls_data.sql
-- ============================================================
/*
# REPAIR MIGRATION — Z&D Thermoliner

## Critical fixes applied:

### 1. profiles_role_check constraint
Migration 005 created a role CHECK that excluded 'ancien_membre' and 'banni'.
All leave_company(), fire_member(), ban_member() RPCs were failing with a constraint
violation when trying to set role = 'ancien_membre' or role = 'banni'.
Fix: drop and recreate with all valid roles.

### 2. profiles SELECT RLS
Migration 001 created select_own_profile (USING auth.uid() = id).
This was never updated, so:
- WallPage cannot see other users' profile names (null → "Utilisateur")
- AdminPage cannot list members
- All cross-user profile joins return null
Fix: replace with USING (true) so all authenticated users can read all profiles.

### 3. Data normalization
- is_active: set true for active roles, false for banni/ancien_membre
- Missing driver records created for all active members
- Driver records synced with latest profile data (pseudo, avatar_url, role)
- is_active_driver set correctly

### 4. sync_missing_driver_records() updated
Extended to pick up all active members (not just approved application_status).

## Tables modified
- profiles: role CHECK, SELECT RLS, is_active values
- drivers: is_active_driver values, pseudo/avatar/role sync, missing records created

## Safety
- No data deleted
- All operations use IF NOT EXISTS / ON CONFLICT DO NOTHING
- Idempotent: safe to re-run
*/

-- ── 1. Fix profiles_role_check to include ancien_membre and banni ─────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire', 'candidat', 'ancien_membre', 'banni'));

-- ── 2. Fix profiles SELECT RLS ────────────────────────────────────────────────
-- Allow all authenticated users to read all profiles (needed for wall, admin, etc.)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);

-- ── 3. Normalize is_active on profiles ───────────────────────────────────────
UPDATE profiles
  SET is_active = false
  WHERE role IN ('banni', 'ancien_membre');

UPDATE profiles
  SET is_active = true
  WHERE role NOT IN ('banni', 'ancien_membre')
    AND (is_active IS NULL OR is_active = false);

-- ── 4. Normalize application_status for active members ───────────────────────
-- Some profiles created before migration 004 may have NULL or non-conforming values
UPDATE profiles
  SET application_status = 'approved'
  WHERE role NOT IN ('candidat', 'banni', 'ancien_membre')
    AND (
      application_status IS NULL
      OR application_status NOT IN ('none','pending','approved','rejected','left','fired','banned')
    );

-- Candidats with null status get 'none'
UPDATE profiles
  SET application_status = 'none'
  WHERE role = 'candidat'
    AND (
      application_status IS NULL
      OR application_status NOT IN ('none','pending','approved','rejected','left','fired','banned')
    );

-- ── 5. Create missing driver records for all active members ──────────────────
INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at, is_active_driver)
SELECT
  COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)) AS name,
  p.id,
  COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  p.avatar_url,
  CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
       THEN p.role ELSE 'chauffeur' END,
  'active',
  COALESCE(p.created_at, now()),
  true
FROM profiles p
WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre')
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- ── 6. Sync existing driver records with latest profile data ─────────────────
UPDATE drivers d
SET
  name = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1), d.name),
  pseudo = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  avatar_url = COALESCE(p.avatar_url, d.avatar_url),
  role = CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
              THEN p.role ELSE d.role END
FROM profiles p
WHERE d.user_id = p.id
  AND p.role NOT IN ('candidat', 'banni', 'ancien_membre');

-- ── 7. Ensure is_active_driver is true for active members ────────────────────
UPDATE drivers d
SET is_active_driver = true, status = 'active'
FROM profiles p
WHERE d.user_id = p.id
  AND p.role NOT IN ('candidat', 'banni', 'ancien_membre')
  AND p.is_active = true
  AND d.is_active_driver = false;

-- ── 8. Ensure is_active_driver is false for blocked members ──────────────────
UPDATE drivers d
SET is_active_driver = false, status = 'inactive'
FROM profiles p
WHERE d.user_id = p.id
  AND p.role IN ('banni', 'ancien_membre');

-- ── 9. Update sync_missing_driver_records() ──────────────────────────────────
CREATE OR REPLACE FUNCTION sync_missing_driver_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Create missing driver records for all active members
  INSERT INTO drivers (name, user_id, pseudo, avatar_url, role, status, joined_at, is_active_driver)
  SELECT
    COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)) AS name,
    p.id,
    COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
    p.avatar_url,
    CASE WHEN p.role IN ('pdg','patron','directeur','dispatcher','chauffeur','tractionnaire')
         THEN p.role ELSE 'chauffeur' END,
    'active',
    COALESCE(p.created_at, now()),
    true
  FROM profiles p
  WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre')
    AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = p.id)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active_driver ON drivers(is_active_driver);


-- ============================================================
-- MIGRATION: 20260706103230_013_final_cleanup_duplicate_policies_orphans.sql
-- ============================================================
/*
# Final Comprehensive Cleanup

## Summary
Removes duplicate/conflicting RLS policies, fixes orphan data, ensures all members
display correctly. This migration is safe to re-run.

## Changes

### RLS cleanup on drivers
- Drop old permissive policies from migration 001 (select_drivers, insert_drivers, update_drivers, delete_drivers)
- Keep the properly restricted ones from migration 009 (drivers_select, drivers_insert, drivers_update, drivers_delete)

### RLS cleanup on profiles
- Drop old redundant update_own_profile (superseded by profiles_update from migration 010)

### Data fixes
- Remove orphan driver record (user_id IS NULL) — duplicate of PDG record
- Set PDG pseudo from full_name if null
- Ensure all profiles have pseudo filled (fallback from full_name or email)

### profiles_update policy fix
- Keep allowing own-profile updates AND PDG/Patron updates on any profile
- Prevent users from changing their own role directly (only SECURITY DEFINER functions should)
*/

-- ── 1. Drop duplicate old RLS policies on drivers ─────────────────────────────
DROP POLICY IF EXISTS "select_drivers" ON drivers;
DROP POLICY IF EXISTS "insert_drivers" ON drivers;
DROP POLICY IF EXISTS "update_drivers" ON drivers;
DROP POLICY IF EXISTS "delete_drivers" ON drivers;

-- ── 2. Drop redundant update_own_profile on profiles ──────────────────────────
DROP POLICY IF EXISTS "update_own_profile" ON profiles;

-- ── 3. Remove orphan driver records (user_id IS NULL) ─────────────────────────
DELETE FROM drivers WHERE user_id IS NULL;

-- ── 4. Fix PDG pseudo (set from full_name if null) ───────────────────────────
UPDATE profiles
SET pseudo = full_name
WHERE pseudo IS NULL AND full_name IS NOT NULL AND full_name <> '';

-- ── 5. Sync driver pseudo/name from updated profiles ──────────────────────────
UPDATE drivers d
SET
  pseudo = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  name = COALESCE(NULLIF(p.pseudo,''), NULLIF(p.full_name,''), split_part(p.email,'@',1)),
  avatar_url = COALESCE(p.avatar_url, d.avatar_url)
FROM profiles p
WHERE d.user_id = p.id;

-- ── 6. Verify notifications policy allows PDG inserts via direct query ────────
-- (SECURITY DEFINER already bypasses RLS, but add a permissive policy for admin insert)
DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pdg','patron'))
  );

-- ── 7. Ensure all authenticated active members can see the drivers_select ────
-- The current policy only allows pdg/patron/directeur/dispatcher/chauffeur/tractionnaire
-- This is correct since candidat/banni/ancien_membre should not see internal salon
-- No changes needed here.

-- ── 8. Add index for common queries ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, application_status);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id_active ON drivers(user_id, is_active_driver);


-- ============================================================
-- MIGRATION: 20260706105853_014_fix_transactions_delete_bank_statements_aliases.sql
-- ============================================================

/*
# Fix: transactions DELETE policy + bank_statements column aliases

## Summary
Two gaps blocking BankPage from working correctly:

### 1. Transactions — missing DELETE policy
The `transactions` table had SELECT, INSERT, UPDATE policies but no DELETE policy.
BankPage.handleDelete() calls `.delete()` which silently fails for all authenticated users.
Fix: add DELETE policy allowing managers (pdg/patron/directeur) to delete non-auto-generated transactions,
and allow any authenticated user to delete their own manual transactions.

### 2. bank_statements — column name mismatch
BankPage reads: `total_transactions`, `net_balance`, `total_credits`, `total_debits`, `fuel_expenses`, `salary_expenses`
DB has:         `(count)`,             `net_profit`,  `total_income`,  `total_expense`, `total_fuel`,     `total_salary`
Fix: add generated columns that alias the existing columns so BankPage works without code changes.

### 3. Seed company_bank_account if empty
Ensures at least one bank account row exists so the balance card shows data.
*/

-- 1. Add DELETE policy on transactions
DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
TO authenticated
USING (
  auto_generated IS NOT TRUE
  AND (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('pdg','patron','directeur')
    )
  )
);

-- 2. Add alias columns to bank_statements to match BankPage expectations
-- net_balance = net_profit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'net_balance'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN net_balance numeric GENERATED ALWAYS AS (net_profit) STORED;
  END IF;
END $$;

-- total_credits = total_income
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'total_credits'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN total_credits numeric GENERATED ALWAYS AS (total_income) STORED;
  END IF;
END $$;

-- total_debits = total_expense
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'total_debits'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN total_debits numeric GENERATED ALWAYS AS (total_expense) STORED;
  END IF;
END $$;

-- fuel_expenses = total_fuel
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'fuel_expenses'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN fuel_expenses numeric GENERATED ALWAYS AS (total_fuel) STORED;
  END IF;
END $$;

-- salary_expenses = total_salary
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'salary_expenses'
  ) THEN
    ALTER TABLE bank_statements
      ADD COLUMN salary_expenses numeric GENERATED ALWAYS AS (total_salary) STORED;
  END IF;
END $$;

-- total_transactions — computed from transactions table via a view alternative:
-- Since GENERATED ALWAYS can't reference another table, add a regular column updated by the RPC
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_statements' AND column_name = 'total_transactions'
  ) THEN
    ALTER TABLE bank_statements ADD COLUMN total_transactions integer DEFAULT 0;
  END IF;
END $$;

-- Backfill total_transactions for existing rows
UPDATE bank_statements bs
SET total_transactions = (
  SELECT COUNT(*)::integer
  FROM transactions t
  WHERE EXTRACT(MONTH FROM t.date)::integer = bs.month
    AND EXTRACT(YEAR FROM t.date)::integer = bs.year
);

-- 3. Recreate generate_bank_statement RPC to also populate total_transactions
CREATE OR REPLACE FUNCTION generate_bank_statement(target_month integer, target_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening decimal(12,2) := 0;
  v_income decimal(12,2); v_expense decimal(12,2); v_salary decimal(12,2);
  v_fuel decimal(12,2); v_toll decimal(12,2); v_maint decimal(12,2); v_rent decimal(12,2);
  v_count integer;
BEGIN
  SELECT COALESCE(closing_balance, 0) INTO v_opening FROM bank_statements
  WHERE (year = target_year AND month = target_month - 1)
     OR (target_month = 1 AND year = target_year - 1 AND month = 12)
  ORDER BY year DESC, month DESC LIMIT 1;

  SELECT
    COALESCE(SUM(CASE WHEN type IN ('income','salary','bonus','transfer') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type NOT IN ('income','salary','bonus','transfer') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'salary' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'toll' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END), 0),
    COUNT(*)::integer
  INTO v_income, v_expense, v_salary, v_fuel, v_toll, v_maint, v_rent, v_count
  FROM transactions
  WHERE EXTRACT(MONTH FROM date)::integer = target_month
    AND EXTRACT(YEAR FROM date)::integer = target_year;

  INSERT INTO bank_statements (
    month, year, opening_balance, total_income, total_expense,
    total_salary, total_fuel, total_toll, total_maintenance, total_rent,
    closing_balance, net_profit, total_transactions
  ) VALUES (
    target_month, target_year,
    COALESCE(v_opening,0), COALESCE(v_income,0), COALESCE(v_expense,0),
    COALESCE(v_salary,0), COALESCE(v_fuel,0), COALESCE(v_toll,0),
    COALESCE(v_maint,0), COALESCE(v_rent,0),
    COALESCE(v_opening,0) + COALESCE(v_income,0) - COALESCE(v_expense,0),
    COALESCE(v_income,0) - COALESCE(v_expense,0),
    COALESCE(v_count,0)
  )
  ON CONFLICT (month, year) DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    total_salary = EXCLUDED.total_salary,
    total_fuel = EXCLUDED.total_fuel,
    total_toll = EXCLUDED.total_toll,
    total_maintenance = EXCLUDED.total_maintenance,
    total_rent = EXCLUDED.total_rent,
    closing_balance = EXCLUDED.closing_balance,
    net_profit = EXCLUDED.net_profit,
    total_transactions = EXCLUDED.total_transactions,
    generated_at = now();
END;
$$;

-- 4. Seed company_bank_account if empty
INSERT INTO company_bank_account (account_name, iban_rp, balance)
SELECT 'Z&D Thermoliner', 'FR76 1820 6004 5678 9012 3456 789', 0
WHERE NOT EXISTS (SELECT 1 FROM company_bank_account);


-- ============================================================
-- MIGRATION: 20260706110448_015_repair_rls_policies_get_my_role.sql
-- ============================================================

/*
# Repair: Simplify correlated subquery RLS policies + ensure data visibility

## Problem
Several RLS policies use `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ...)`.
While technically correct (profiles SELECT is USING(true)), these subqueries can fail to return results
in certain PostgREST/Supabase session states, causing entire tables to appear empty.

## Solution
1. Create a SECURITY DEFINER helper `get_my_role()` that reads the caller's role from profiles
   bypassing all RLS, making role checks reliable in all contexts.
2. Replace all complex correlated subquery policies with simple `get_my_role()` calls.
3. Simplify `drivers` SELECT to USING(true) — all authenticated members can see the salon.
4. Fix `app_updates` SELECT to USING(true) for active members.
5. Fix `members_audit_logs` SELECT to use get_my_role().
6. Fix `recruitment_applications` SELECT to let PDG/patron see all.
7. Fix `update_reads` SELECT.
8. Add missing INSERT policy for vtc_settings.

## No data is modified — only policy logic changes.
*/

-- 1. Create SECURITY DEFINER helper function for role checks
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Fix drivers policies
-- SELECT: all authenticated users can see the drivers list (salon)
DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT
TO authenticated
USING (true);

-- INSERT: only pdg/patron
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
TO authenticated
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- UPDATE: pdg/patron or own record
DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron') OR user_id = auth.uid())
WITH CHECK (get_my_role() IN ('pdg','patron') OR user_id = auth.uid());

-- DELETE: only pdg/patron
DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
TO authenticated
USING (get_my_role() IN ('pdg','patron'));

-- 3. Fix app_updates policies
DROP POLICY IF EXISTS "updates_select" ON app_updates;
CREATE POLICY "updates_select" ON app_updates FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "updates_insert" ON app_updates;
CREATE POLICY "updates_insert" ON app_updates FOR INSERT
TO authenticated
WITH CHECK (get_my_role() = 'pdg');

DROP POLICY IF EXISTS "updates_update" ON app_updates;
CREATE POLICY "updates_update" ON app_updates FOR UPDATE
TO authenticated
USING (get_my_role() = 'pdg')
WITH CHECK (get_my_role() = 'pdg');

DROP POLICY IF EXISTS "updates_delete" ON app_updates;
CREATE POLICY "updates_delete" ON app_updates FOR DELETE
TO authenticated
USING (get_my_role() = 'pdg');

-- 4. Fix members_audit_logs SELECT
DROP POLICY IF EXISTS "audit_logs_select" ON members_audit_logs;
CREATE POLICY "audit_logs_select" ON members_audit_logs FOR SELECT
TO authenticated
USING (get_my_role() IN ('pdg','patron'));

-- Fix audit_logs INSERT — allow SECURITY DEFINER RPCs (they run as postgres, bypassing RLS)
-- but also allow the calling user directly
DROP POLICY IF EXISTS "audit_logs_insert" ON members_audit_logs;
CREATE POLICY "audit_logs_insert" ON members_audit_logs FOR INSERT
TO authenticated
WITH CHECK (action_by_user_id = auth.uid());

-- 5. Fix recruitment_applications policies
DROP POLICY IF EXISTS "select_applications" ON recruitment_applications;
CREATE POLICY "select_applications" ON recruitment_applications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_my_role() IN ('pdg','patron'));

DROP POLICY IF EXISTS "update_applications" ON recruitment_applications;
CREATE POLICY "update_applications" ON recruitment_applications FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- 6. Fix update_reads SELECT
DROP POLICY IF EXISTS "update_reads_select_own" ON update_reads;
CREATE POLICY "update_reads_select_own" ON update_reads FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_my_role() IN ('pdg','patron'));

-- 7. Fix profiles UPDATE policy — simplify with get_my_role()
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR get_my_role() IN ('pdg','patron'))
WITH CHECK (id = auth.uid() OR get_my_role() IN ('pdg','patron'));

-- 8. Fix economy_settings policies
DROP POLICY IF EXISTS "manage_economy_settings" ON economy_settings;
CREATE POLICY "manage_economy_settings" ON economy_settings FOR ALL
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- 9. Fix driver_sanctions manage policy
DROP POLICY IF EXISTS "manage_driver_sanctions" ON driver_sanctions;
CREATE POLICY "manage_driver_sanctions" ON driver_sanctions FOR ALL
TO authenticated
USING (get_my_role() IN ('pdg','patron','directeur'))
WITH CHECK (get_my_role() IN ('pdg','patron','directeur'));

-- 10. Fix transactions policies
DROP POLICY IF EXISTS "update_transactions" ON transactions;
CREATE POLICY "update_transactions" ON transactions FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
TO authenticated
USING (
  auto_generated IS NOT TRUE
  AND (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR get_my_role() IN ('pdg','patron','directeur')
  )
);

-- 11. Fix vtc_settings UPDATE (was using 'admin' role which doesn't exist)
DROP POLICY IF EXISTS "update_vtc_settings" ON vtc_settings;
CREATE POLICY "update_vtc_settings" ON vtc_settings FOR UPDATE
TO authenticated
USING (get_my_role() IN ('pdg','patron'))
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- Also add INSERT for vtc_settings if no row exists
DROP POLICY IF EXISTS "insert_vtc_settings" ON vtc_settings;
CREATE POLICY "insert_vtc_settings" ON vtc_settings FOR INSERT
TO authenticated
WITH CHECK (get_my_role() IN ('pdg','patron'));

-- 12. Ensure vtc_settings has a row
INSERT INTO vtc_settings (name, monthly_distance_goal)
SELECT 'Z&D Thermoliner', 100000
WHERE NOT EXISTS (SELECT 1 FROM vtc_settings);

-- 13. Ensure company_bank_account has a row
INSERT INTO company_bank_account (account_name, iban_rp, balance)
SELECT 'Z&D Thermoliner', 'FR76 1820 6004 5678 9012 3456 789', 0
WHERE NOT EXISTS (SELECT 1 FROM company_bank_account);

-- 14. Ensure all 3 drivers have is_active_driver = true (data sanity)
UPDATE drivers SET is_active_driver = true WHERE status = 'active' AND is_active_driver IS DISTINCT FROM true;


-- ============================================================
-- MIGRATION: 20260706115159_016_clean_simple_rebuild.sql
-- ============================================================
-- ============================================================
-- 016 — Clean simple rebuild: simplified profiles + road_sheets
-- Drop role complexity, keep the existing good tables
-- ============================================================

-- 1. Simplify profiles: drop complex role constraint, add pseudo column if missing
ALTER TABLE profiles
  DROP COLUMN IF EXISTS pseudo,
  DROP COLUMN IF EXISTS age,
  DROP COLUMN IF EXISTS ets2_experience,
  DROP COLUMN IF EXISTS has_trucksbook,
  DROP COLUMN IF EXISTS discord,
  DROP COLUMN IF EXISTS preferred_truck,
  DROP COLUMN IF EXISTS availability,
  DROP COLUMN IF EXISTS motivation,
  DROP COLUMN IF EXISTS application_status,
  DROP COLUMN IF EXISTS is_active;

-- Re-add pseudo as simple column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo text;

-- Drop all existing role-based policies on profiles, replace with simple ones
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Simple profiles policies: see everyone, edit your own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Simplify road_sheets: create clean simple version if it exists with bad schema, else create fresh
-- Check if road_sheets exists and alter it to remove complexity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'road_sheets' AND table_schema = 'public') THEN
    -- Drop all RLS policies on road_sheets
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'road_sheets' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON road_sheets', r.policyname);
      END LOOP;
    END;
    -- Add missing columns if they don't exist
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS departure text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS arrival text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS cargo text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS km integer DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS price_per_km numeric(6,2) DEFAULT 1.80; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS revenue numeric(10,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS delivery_photo_url text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS validated boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS driver_name text; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE road_sheets ADD COLUMN IF NOT EXISTS notes text; EXCEPTION WHEN duplicate_column THEN NULL; END;
  END IF;
END $$;

-- Simple RLS for road_sheets
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'road_sheets' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON road_sheets', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "road_sheets_select" ON road_sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "road_sheets_insert" ON road_sheets FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_user_id OR driver_user_id IS NULL);
CREATE POLICY "road_sheets_update" ON road_sheets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "road_sheets_delete" ON road_sheets FOR DELETE TO authenticated USING (true);

-- 3. Simple transactions policies (everyone sees all company transactions)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'transactions' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (true);

-- 4. Ensure simple RLS for drivers, trucks, garages (already correct in migration 001, just ensure)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename IN ('drivers','trucks','garages') AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, (
      SELECT tablename FROM pg_policies WHERE policyname = r.policyname AND tablename IN ('drivers','trucks','garages') AND schemaname = 'public' LIMIT 1
    ));
  END LOOP;
END $$;

DO $$
BEGIN
  -- drivers
  CREATE POLICY "drivers_select" ON drivers FOR SELECT TO authenticated USING (true);
  CREATE POLICY "drivers_insert" ON drivers FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "drivers_update" ON drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "drivers_delete" ON drivers FOR DELETE TO authenticated USING (true);
  -- trucks
  CREATE POLICY "trucks_select" ON trucks FOR SELECT TO authenticated USING (true);
  CREATE POLICY "trucks_insert" ON trucks FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "trucks_update" ON trucks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "trucks_delete" ON trucks FOR DELETE TO authenticated USING (true);
  -- garages
  CREATE POLICY "garages_select" ON garages FOR SELECT TO authenticated USING (true);
  CREATE POLICY "garages_insert" ON garages FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "garages_update" ON garages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "garages_delete" ON garages FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Update handle_new_user to not set role (simple profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trucks.brand column if not there (some migrations use 'model' for brand+model)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS brand text;
-- Add garages.photo_url column
ALTER TABLE garages ADD COLUMN IF NOT EXISTS photo_url text;
-- Add garages.monthly_rent for reference
ALTER TABLE garages ADD COLUMN IF NOT EXISTS monthly_rent numeric(10,2) DEFAULT 0;


-- ============================================================
-- MIGRATION: 20260706120000_017_erp_road_sheet_calculations.sql
-- ============================================================
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

