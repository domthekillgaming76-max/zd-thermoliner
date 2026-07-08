-- 051 — Visitor wall read, comment & react (additive)
-- Visitors may read community wall posts (public, visitors, members),
-- comment on visible posts, and manage their own reactions.
-- They must NOT see drivers-only or admin-only posts.

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
    RETURN p_visibility IN ('public', 'visitors', 'members');
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

-- Re-affirm SELECT policies (depend on can_view_wall_post)
DROP POLICY IF EXISTS "wall_posts_select" ON public.wall_posts;
CREATE POLICY "wall_posts_select" ON public.wall_posts
  FOR SELECT TO authenticated
  USING (public.can_view_wall_post(visibility, post_type, auth.uid()));

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
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wall_posts wp
      WHERE wp.id = post_id
        AND public.can_view_wall_post(wp.visibility, wp.post_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "wall_reactions_select" ON public.wall_reactions;
CREATE POLICY "wall_reactions_select" ON public.wall_reactions
  FOR SELECT TO authenticated USING (true);

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

DROP POLICY IF EXISTS "wall_reactions_update" ON public.wall_reactions;
CREATE POLICY "wall_reactions_update" ON public.wall_reactions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wall_reactions_delete" ON public.wall_reactions;
CREATE POLICY "wall_reactions_delete" ON public.wall_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON FUNCTION public.can_view_wall_post IS
  'RLS helper: visitors/candidats read public+visitors+members wall posts; drivers/admin visibilities restricted';

GRANT EXECUTE ON FUNCTION public.can_view_wall_post(text, text, uuid) TO authenticated;
