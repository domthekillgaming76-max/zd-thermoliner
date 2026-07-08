-- 050 — Wall realtime notifications & visitor access (additive)

-- Visitors can see public + visitors-targeted posts
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

  IF v_role IN ('visitor', 'visiteur', 'candidat') THEN
    IF p_post_type = 'recruitment' THEN
      RETURN p_visibility IN ('public', 'visitors');
    END IF;
    RETURN p_visibility IN ('public', 'visitors');
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

-- Notify all eligible users on every new wall post (except author)
CREATE OR REPLACE FUNCTION public.notify_wall_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT
    p.id,
    'Nouvelle publication sur le mur de la société',
    LEFT(COALESCE(NEW.content, ''), 120),
    'wall_post'
  FROM public.profiles p
  WHERE p.id <> NEW.author_id
    AND COALESCE(p.is_active, true) = true
    AND COALESCE(p.is_suspended, false) = false
    AND p.role NOT IN ('banni')
    AND public.can_view_wall_post(NEW.visibility, NEW.post_type, p.id);

  RETURN NEW;
END;
$$;

-- Update comment notification wording
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
BEGIN
  IF TG_TABLE_NAME = 'wall_comments' THEN
    SELECT * INTO v_post FROM public.wall_posts WHERE id = NEW.post_id;
    v_author_id := v_post.author_id;
    IF v_author_id = NEW.author_id THEN RETURN NEW; END IF;
    SELECT COALESCE(pseudo, full_name) INTO v_actor_name FROM public.profiles WHERE id = NEW.author_id;
    v_actor_name := COALESCE(v_actor_name, 'Un membre');
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_author_id,
      'Nouveau commentaire sur votre publication',
      v_actor_name || ' : ' || LEFT(NEW.content, 80),
      'wall_comment'
    );
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wall_reactions' AND NEW.post_id IS NOT NULL THEN
    SELECT * INTO v_post FROM public.wall_posts WHERE id = NEW.post_id;
    v_author_id := v_post.author_id;
    IF v_author_id = NEW.user_id THEN RETURN NEW; END IF;
    SELECT COALESCE(pseudo, full_name) INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
    v_actor_name := COALESCE(v_actor_name, 'Un membre');
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_author_id,
      'Nouvelle réaction',
      v_actor_name || ' a réagi à votre publication.',
      'wall_reaction'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wall_announcement_notify ON public.wall_posts;
DROP TRIGGER IF EXISTS trg_wall_new_post_notify ON public.wall_posts;
CREATE TRIGGER trg_wall_new_post_notify
  AFTER INSERT ON public.wall_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_wall_new_post();

-- Ensure all authenticated users can insert comments/reactions on visible posts
DROP POLICY IF EXISTS "wall_comments_insert" ON public.wall_comments;
CREATE POLICY "wall_comments_insert" ON public.wall_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wall_posts wp
      WHERE wp.id = post_id
        AND public.can_view_wall_post(wp.visibility, wp.post_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "wall_reactions_insert" ON public.wall_reactions;
CREATE POLICY "wall_reactions_insert" ON public.wall_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      post_id IS NULL OR EXISTS (
        SELECT 1 FROM public.wall_posts wp
        WHERE wp.id = post_id
          AND public.can_view_wall_post(wp.visibility, wp.post_type, auth.uid())
      )
    )
  );

COMMENT ON FUNCTION public.notify_wall_new_post IS 'Notifies eligible users when a new wall post is published';
