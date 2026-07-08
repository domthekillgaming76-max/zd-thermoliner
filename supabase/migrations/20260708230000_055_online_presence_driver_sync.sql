-- 055 — Online presence + auto driver sync from profile role

CREATE TABLE IF NOT EXISTS public.online_presence (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_online_presence_last_seen ON public.online_presence(last_seen_at DESC);

ALTER TABLE public.online_presence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'online_presence' AND policyname = 'online_presence_select'
  ) THEN
    CREATE POLICY "online_presence_select" ON public.online_presence
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'online_presence' AND policyname = 'online_presence_upsert_own'
  ) THEN
    CREATE POLICY "online_presence_upsert_own" ON public.online_presence
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'online_presence' AND policyname = 'online_presence_admin_all'
  ) THEN
    CREATE POLICY "online_presence_admin_all" ON public.online_presence
      FOR ALL TO authenticated
      USING (public.get_my_role() IN ('pdg', 'patron', 'admin'))
      WITH CHECK (public.get_my_role() IN ('pdg', 'patron', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.online_presence;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.online_presence REPLICA IDENTITY FULL;

-- Auto-create/update drivers row when profile becomes chauffeur/driver/member
CREATE OR REPLACE FUNCTION public.is_driver_profile_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_role, '') IN (
    'chauffeur', 'driver', 'member', 'tractionnaire'
  );
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
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR NOT public.is_driver_profile_role(v_profile.role) THEN
    RETURN NULL;
  END IF;

  v_name := COALESCE(NULLIF(TRIM(v_profile.pseudo), ''), NULLIF(TRIM(v_profile.full_name), ''), v_profile.email, 'Chauffeur');

  INSERT INTO public.drivers (
    user_id, name, pseudo, email, avatar_url, photo_url,
    role, member_role, status, presence_status, is_active_driver, joined_at
  )
  VALUES (
    v_profile.id, v_name, v_profile.pseudo, v_profile.email,
    v_profile.avatar_url, COALESCE(v_profile.truck_photo_url, v_profile.avatar_url),
    'chauffeur', 'driver', 'active', 'online', true, now()
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
    presence_status = COALESCE(public.drivers.presence_status, 'online')
  RETURNING id INTO v_driver_id;

  RETURN v_driver_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_driver_on_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.role IS DISTINCT FROM NEW.role) THEN
    IF public.is_driver_profile_role(NEW.role) THEN
      PERFORM public.ensure_driver_from_profile(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_driver_on_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_driver_on_profile_role
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_driver_on_profile_role_change();

GRANT EXECUTE ON FUNCTION public.ensure_driver_from_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver_profile_role(text) TO authenticated;

COMMENT ON TABLE public.online_presence IS 'Live member presence — heartbeat + Realtime';
