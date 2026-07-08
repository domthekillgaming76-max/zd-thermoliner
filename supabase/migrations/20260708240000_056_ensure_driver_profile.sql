-- 056 — ensure_driver_profile alias + idempotent driver sync from profiles

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Resolve presence from online_presence when available
CREATE OR REPLACE FUNCTION public.resolve_driver_presence_status(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_last_seen timestamptz;
BEGIN
  SELECT status, last_seen_at INTO v_status, v_last_seen
  FROM public.online_presence
  WHERE user_id = p_user_id;

  IF NOT FOUND OR v_last_seen IS NULL OR v_last_seen < now() - interval '30 seconds' THEN
    RETURN 'offline';
  END IF;

  IF v_status = 'online' THEN
    RETURN 'online';
  END IF;

  RETURN 'offline';
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_driver_from_profile(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_driver_id uuid;
  v_name text;
  v_presence text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR NOT public.is_driver_profile_role(v_profile.role) THEN
    RETURN NULL;
  END IF;

  v_name := COALESCE(
    NULLIF(TRIM(v_profile.pseudo), ''),
    NULLIF(TRIM(v_profile.full_name), ''),
    v_profile.email,
    'Chauffeur'
  );
  v_presence := public.resolve_driver_presence_status(v_profile.id);

  INSERT INTO public.drivers (
    user_id, name, pseudo, email, avatar_url, photo_url,
    role, member_role, status, presence_status, is_active_driver, joined_at, updated_at
  )
  VALUES (
    v_profile.id, v_name, v_profile.pseudo, v_profile.email,
    v_profile.avatar_url, COALESCE(v_profile.truck_photo_url, v_profile.avatar_url),
    'chauffeur', 'driver', 'active', v_presence, true, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    pseudo = EXCLUDED.pseudo,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    photo_url = EXCLUDED.photo_url,
    member_role = 'driver',
    role = 'chauffeur',
    is_active_driver = true,
    presence_status = EXCLUDED.presence_status,
    updated_at = now()
  RETURNING id INTO v_driver_id;

  RETURN v_driver_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_driver_profile(p_profile_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ensure_driver_from_profile(p_profile_id);
$$;

GRANT EXECUTE ON FUNCTION public.ensure_driver_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_driver_presence_status(uuid) TO authenticated;

-- Driver can read own driver row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'drivers' AND policyname = 'drivers_select_own'
  ) THEN
    CREATE POLICY "drivers_select_own" ON public.drivers
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Admin/manager can manage all drivers (additive — does not remove existing policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'drivers' AND policyname = 'drivers_admin_manage'
  ) THEN
    CREATE POLICY "drivers_admin_manage" ON public.drivers
      FOR ALL TO authenticated
      USING (public.get_my_role() IN ('pdg', 'patron', 'admin', 'directeur', 'manager'))
      WITH CHECK (public.get_my_role() IN ('pdg', 'patron', 'admin', 'directeur', 'manager'));
  END IF;
END $$;

COMMENT ON FUNCTION public.ensure_driver_profile(uuid) IS 'Idempotent upsert: create/update drivers row from profiles when role is chauffeur/driver/member';
