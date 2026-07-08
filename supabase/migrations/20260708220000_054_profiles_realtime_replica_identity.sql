-- 054 — Role sync: Realtime on profiles + REPLICA IDENTITY for filtered UPDATE events

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles REPLICA IDENTITY FULL;

COMMENT ON TABLE public.profiles IS 'User profiles — Realtime enabled for live role sync (AuthContext)';
