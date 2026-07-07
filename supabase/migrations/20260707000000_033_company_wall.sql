-- 033 — Company Wall & Internal Social Network (additive)

-- ─── Core tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type text NOT NULL DEFAULT 'text'
    CHECK (post_type IN ('text', 'photo', 'video', 'convoy', 'announcement', 'poll', 'event', 'recruitment')),
  content text NOT NULL,
  media_url text,
  visibility text NOT NULL DEFAULT 'members'
    CHECK (visibility IN ('public', 'visitors', 'members', 'drivers', 'admin')),
  is_pinned boolean NOT NULL DEFAULT false,
  is_official boolean NOT NULL DEFAULT false,
  share_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wall_posts_created ON public.wall_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wall_posts_pinned ON public.wall_posts(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wall_posts_type ON public.wall_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_wall_posts_visibility ON public.wall_posts(visibility);

CREATE TABLE IF NOT EXISTS public.wall_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wall_comments_post ON public.wall_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS public.wall_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.wall_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like'
    CHECK (reaction_type IN ('like', 'love', 'fire', 'truck', 'celebrate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wall_reactions_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wall_reactions_post_user
  ON public.wall_reactions(post_id, user_id) WHERE comment_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wall_reactions_comment_user
  ON public.wall_reactions(comment_id, user_id) WHERE comment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wall_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  question text NOT NULL,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wall_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.wall_polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wall_poll_options_poll ON public.wall_poll_options(poll_id, sort_order);

CREATE TABLE IF NOT EXISTS public.wall_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.wall_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.wall_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.wall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  event_at timestamptz NOT NULL,
  location text,
  route_label text,
  community_event_id uuid REFERENCES public.community_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wall_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ─── Visibility helper ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_view_wall_post(
  p_visibility text,
  p_post_type text,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  IF public.is_erp_admin(p_user_id) THEN RETURN true; END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_role = 'banni' THEN RETURN false; END IF;

  IF v_role IN ('visitor', 'visiteur') THEN
    IF p_post_type = 'recruitment' THEN
      RETURN p_visibility IN ('public', 'visitors');
    ELSIF p_post_type = 'event' THEN
      RETURN p_visibility = 'public';
    ELSE
      RETURN p_visibility = 'public';
    END IF;
  END IF;

  CASE p_visibility
    WHEN 'public' THEN RETURN true;
    WHEN 'visitors' THEN RETURN true;
    WHEN 'members' THEN RETURN v_role NOT IN ('visitor', 'visiteur');
    WHEN 'drivers' THEN RETURN v_role IN (
      'chauffeur', 'tractionnaire', 'dispatcher', 'directeur', 'patron', 'pdg', 'admin'
    );
    WHEN 'admin' THEN RETURN public.is_erp_admin(p_user_id);
    ELSE RETURN false;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_wall_post(text, text, uuid) TO authenticated;

-- ─── Share count trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.wall_share_increment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wall_posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wall_share_increment ON public.wall_shares;
CREATE TRIGGER trg_wall_share_increment
  AFTER INSERT ON public.wall_shares
  FOR EACH ROW EXECUTE FUNCTION public.wall_share_increment();

-- ─── Notification triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_wall_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.wall_posts;
  v_author_id uuid;
  v_actor_name text;
  v_title text;
  v_message text;
  v_type text;
BEGIN
  IF TG_TABLE_NAME = 'wall_comments' THEN
    SELECT * INTO v_post FROM public.wall_posts WHERE id = NEW.post_id;
    v_author_id := v_post.author_id;
    IF v_author_id = NEW.author_id THEN RETURN NEW; END IF;
    SELECT COALESCE(pseudo, full_name) INTO v_actor_name FROM public.profiles WHERE id = NEW.author_id;
    v_actor_name := COALESCE(v_actor_name, 'Un membre');
    v_title := 'Nouveau commentaire';
    v_message := v_actor_name || ' a commenté votre publication.';
    v_type := 'wall_comment';
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_author_id, v_title, v_message, v_type);
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wall_reactions' AND NEW.post_id IS NOT NULL THEN
    SELECT * INTO v_post FROM public.wall_posts WHERE id = NEW.post_id;
    v_author_id := v_post.author_id;
    IF v_author_id = NEW.user_id THEN RETURN NEW; END IF;
    SELECT COALESCE(pseudo, full_name) INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
    v_actor_name := COALESCE(v_actor_name, 'Un membre');
    v_title := 'Nouvelle réaction';
    v_message := v_actor_name || ' a réagi à votre publication.';
    v_type := 'wall_reaction';
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_author_id, v_title, v_message, v_type);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_wall_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
BEGIN
  IF NEW.post_type NOT IN ('announcement', 'convoy') AND NOT NEW.is_official THEN
    RETURN NEW;
  END IF;

  IF NEW.post_type = 'convoy' THEN
    v_title := 'Nouveau convoi';
    v_message := LEFT(NEW.content, 120);
    v_type := 'wall_convoy';
  ELSE
    v_title := 'Annonce officielle';
    v_message := LEFT(NEW.content, 120);
    v_type := 'wall_announcement';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.id, v_title, v_message, v_type
  FROM public.profiles p
  WHERE p.id <> NEW.author_id
    AND p.role NOT IN ('banni')
    AND public.can_view_wall_post(NEW.visibility, NEW.post_type, p.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wall_comment_notify ON public.wall_comments;
CREATE TRIGGER trg_wall_comment_notify
  AFTER INSERT ON public.wall_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_wall_interaction();

DROP TRIGGER IF EXISTS trg_wall_reaction_notify ON public.wall_reactions;
CREATE TRIGGER trg_wall_reaction_notify
  AFTER INSERT ON public.wall_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_wall_interaction();

DROP TRIGGER IF EXISTS trg_wall_announcement_notify ON public.wall_posts;
CREATE TRIGGER trg_wall_announcement_notify
  AFTER INSERT ON public.wall_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_wall_announcement();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_shares ENABLE ROW LEVEL SECURITY;

-- wall_posts
DROP POLICY IF EXISTS "wall_posts_select" ON public.wall_posts;
CREATE POLICY "wall_posts_select" ON public.wall_posts
  FOR SELECT TO authenticated
  USING (public.can_view_wall_post(visibility, post_type, auth.uid()));

DROP POLICY IF EXISTS "wall_posts_insert" ON public.wall_posts;
CREATE POLICY "wall_posts_insert" ON public.wall_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (NOT is_official OR public.is_erp_admin(auth.uid()))
    AND (visibility <> 'admin' OR public.is_erp_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "wall_posts_update" ON public.wall_posts;
CREATE POLICY "wall_posts_update" ON public.wall_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_erp_admin(auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "wall_posts_delete" ON public.wall_posts;
CREATE POLICY "wall_posts_delete" ON public.wall_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_erp_admin(auth.uid()));

-- wall_comments
DROP POLICY IF EXISTS "wall_comments_select" ON public.wall_comments;
CREATE POLICY "wall_comments_select" ON public.wall_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wall_posts wp
      WHERE wp.id = post_id
        AND public.can_view_wall_post(wp.visibility, wp.post_type, auth.uid())
    )
    AND (NOT is_hidden OR author_id = auth.uid() OR public.is_erp_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "wall_comments_insert" ON public.wall_comments;
CREATE POLICY "wall_comments_insert" ON public.wall_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "wall_comments_update" ON public.wall_comments;
CREATE POLICY "wall_comments_update" ON public.wall_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "wall_comments_delete" ON public.wall_comments;
CREATE POLICY "wall_comments_delete" ON public.wall_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_erp_admin(auth.uid()));

-- wall_reactions
DROP POLICY IF EXISTS "wall_reactions_select" ON public.wall_reactions;
CREATE POLICY "wall_reactions_select" ON public.wall_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wall_reactions_insert" ON public.wall_reactions;
CREATE POLICY "wall_reactions_insert" ON public.wall_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wall_reactions_update" ON public.wall_reactions;
CREATE POLICY "wall_reactions_update" ON public.wall_reactions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wall_reactions_delete" ON public.wall_reactions;
CREATE POLICY "wall_reactions_delete" ON public.wall_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- wall_polls / options / votes / events — inherit post visibility via join in app;
-- allow read for authenticated, write tied to post author or voter
DROP POLICY IF EXISTS "wall_polls_select" ON public.wall_polls;
CREATE POLICY "wall_polls_select" ON public.wall_polls FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "wall_polls_insert" ON public.wall_polls;
CREATE POLICY "wall_polls_insert" ON public.wall_polls
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wall_posts wp WHERE wp.id = post_id AND wp.author_id = auth.uid()));

DROP POLICY IF EXISTS "wall_poll_options_select" ON public.wall_poll_options;
CREATE POLICY "wall_poll_options_select" ON public.wall_poll_options FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "wall_poll_options_insert" ON public.wall_poll_options;
CREATE POLICY "wall_poll_options_insert" ON public.wall_poll_options
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wall_polls p
    JOIN public.wall_posts wp ON wp.id = p.post_id
    WHERE p.id = poll_id AND wp.author_id = auth.uid()
  ));

DROP POLICY IF EXISTS "wall_poll_votes_select" ON public.wall_poll_votes;
CREATE POLICY "wall_poll_votes_select" ON public.wall_poll_votes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "wall_poll_votes_insert" ON public.wall_poll_votes;
CREATE POLICY "wall_poll_votes_insert" ON public.wall_poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wall_events_select" ON public.wall_events;
CREATE POLICY "wall_events_select" ON public.wall_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "wall_events_insert" ON public.wall_events;
CREATE POLICY "wall_events_insert" ON public.wall_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wall_posts wp WHERE wp.id = post_id AND wp.author_id = auth.uid()));

DROP POLICY IF EXISTS "wall_shares_select" ON public.wall_shares;
CREATE POLICY "wall_shares_select" ON public.wall_shares FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "wall_shares_insert" ON public.wall_shares;
CREATE POLICY "wall_shares_insert" ON public.wall_shares
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.wall_posts IS 'Company wall social feed posts';
