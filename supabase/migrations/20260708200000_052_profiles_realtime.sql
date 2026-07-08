-- 052 — Enable Supabase Realtime on profiles (role updates without page refresh)

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.profiles IS 'User profiles — realtime enabled for live role/menu updates';
