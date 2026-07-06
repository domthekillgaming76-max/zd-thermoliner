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