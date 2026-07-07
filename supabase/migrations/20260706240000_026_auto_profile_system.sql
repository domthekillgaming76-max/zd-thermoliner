-- 026 — Automatic profile system (additive)

-- ── Ensure customization columns exist ────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS truckersmp_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_truck text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_trailer text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_theme text DEFAULT 'scania_red';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#ef4444';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#991b1b';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_style text DEFAULT 'dark';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'glass';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ── Role constraint (visitor included) ────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire',
    'candidat', 'visitor', 'visiteur', 'admin', 'ancien_membre', 'banni'
  ));

-- ── Admin helper ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_erp_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('pdg', 'patron', 'admin')
  );
$$;

-- ── Role promotion chain helper ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_next_promotion_role(p_current_role text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_chain text[] := ARRAY['visitor', 'visiteur', 'candidat', 'chauffeur', 'dispatcher', 'directeur', 'patron'];
  v_norm text;
  v_idx int;
BEGIN
  v_norm := CASE
    WHEN p_current_role IN ('visiteur') THEN 'visitor'
    WHEN p_current_role IN ('admin') THEN 'patron'
    ELSE p_current_role
  END;

  v_idx := array_position(v_chain, v_norm);
  IF v_idx IS NULL OR v_idx >= array_length(v_chain, 1) THEN
    RETURN NULL;
  END IF;
  RETURN v_chain[v_idx + 1];
END;
$$;

-- ── Admin-only single-step promotion ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promote_member_role(p_target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_current text;
  v_next text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT public.is_erp_admin(v_actor) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent promouvoir un membre';
  END IF;

  SELECT role INTO v_current FROM public.profiles WHERE id = p_target_user_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  v_next := public.get_next_promotion_role(v_current);
  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Aucune promotion disponible pour le rôle %', v_current;
  END IF;

  UPDATE public.profiles
  SET role = v_next, updated_at = now()
  WHERE id = p_target_user_id;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_member_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_erp_admin(uuid) TO authenticated;

-- ── Prevent non-admins from changing roles ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.profiles_guard_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_erp_admin(auth.uid()) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role ON public.profiles;
CREATE TRIGGER trg_profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_change();

-- ── Automatic profile on signup ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    theme_color,
    profile_theme,
    primary_color,
    secondary_color,
    background_style,
    card_style,
    avatar_url,
    truck_photo_url,
    banner_url,
    created_at,
    updated_at,
    last_seen_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'visitor',
    'red',
    'scania_red',
    '#ef4444',
    '#991b1b',
    'dark',
    'glass',
    NULL,
    NULL,
    NULL,
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Backfill missing defaults (do not overwrite existing roles) ───────────────
UPDATE public.profiles SET profile_theme = 'scania_red' WHERE profile_theme IS NULL;
UPDATE public.profiles SET primary_color = '#ef4444' WHERE primary_color IS NULL;
UPDATE public.profiles SET secondary_color = '#991b1b' WHERE secondary_color IS NULL;
UPDATE public.profiles SET background_style = 'dark' WHERE background_style IS NULL;
UPDATE public.profiles SET card_style = 'glass' WHERE card_style IS NULL;
UPDATE public.profiles SET theme_color = 'red' WHERE theme_color IS NULL OR theme_color = '';
UPDATE public.profiles SET last_seen_at = COALESCE(last_seen_at, created_at, now()) WHERE last_seen_at IS NULL;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates visitor profile with Scania Red defaults on auth signup';
COMMENT ON FUNCTION public.promote_member_role(uuid) IS 'Admin-only: visitor→candidat→chauffeur→dispatcher→directeur→patron';
