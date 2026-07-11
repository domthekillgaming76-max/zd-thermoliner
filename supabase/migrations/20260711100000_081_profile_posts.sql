-- 081 — Fil d'actualité profil (photos / posts personnels)

CREATE TABLE IF NOT EXISTS public.profile_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  media_url text,
  media_type text NOT NULL DEFAULT 'text' CHECK (media_type IN ('text', 'photo', 'video')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_posts_author_created
  ON public.profile_posts(author_id, created_at DESC);

ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_posts_select" ON public.profile_posts;
CREATE POLICY "profile_posts_select" ON public.profile_posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profile_posts_insert" ON public.profile_posts;
CREATE POLICY "profile_posts_insert" ON public.profile_posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "profile_posts_update" ON public.profile_posts;
CREATE POLICY "profile_posts_update" ON public.profile_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "profile_posts_delete" ON public.profile_posts;
CREATE POLICY "profile_posts_delete" ON public.profile_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_erp_admin(auth.uid()));

COMMENT ON TABLE public.profile_posts IS 'Fil d''actualité personnel sur /profile';
