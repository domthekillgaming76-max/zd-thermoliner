-- 053 — Role Sync Engine: profiles realtime publication (additive, safe)

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure authenticated users can read their own profile (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE public.profiles IS 'User profiles — realtime enabled for Role Sync Engine';
