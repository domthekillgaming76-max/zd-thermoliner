-- 024 — Profile customization columns (idempotent repair migration)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS truckersmp_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_truck text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_trailer text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_theme text DEFAULT 'zd_thermoliner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#ef4444';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#14b8a6';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_style text DEFAULT 'dark';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'glass';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- Ensure updated_at exists (initial schema should already have it)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Users edit own profile; admins retain read-all via profiles_select
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN public.profiles.profile_theme IS 'Truck-inspired profile theme key';
COMMENT ON COLUMN public.profiles.background_style IS 'dark | gradient | grid | truck';
COMMENT ON COLUMN public.profiles.card_style IS 'glass | solid | bordered | glow';
