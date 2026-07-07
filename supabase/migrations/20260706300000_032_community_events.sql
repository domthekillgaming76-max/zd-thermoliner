-- 032 — Community public events (additive)

CREATE TABLE IF NOT EXISTS public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'convoy'
    CHECK (event_type IN ('convoy', 'meetup', 'tournament', 'training', 'other')),
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  route_label text,
  max_participants integer DEFAULT 0,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_events_start ON public.community_events(start_at);
CREATE INDEX IF NOT EXISTS idx_community_events_status ON public.community_events(status);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_events_select" ON public.community_events;
CREATE POLICY "community_events_select" ON public.community_events
  FOR SELECT TO authenticated
  USING (status IN ('published', 'completed') OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "community_events_manage" ON public.community_events;
CREATE POLICY "community_events_manage" ON public.community_events
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

COMMENT ON TABLE public.community_events IS 'Public community events and convoys for Z&D Thermoliner';
