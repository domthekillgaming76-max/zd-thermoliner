-- 078 — Mur société : corriger visibilité RLS (rôles chauffeur/visiteur) + bucket médias

-- Restaurer can_view_wall_post (071 utilisait encore « flotte » / « visitor »)
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
    WHEN 'members' THEN RETURN v_role NOT IN ('visitor', 'visiteur', 'candidat');
    WHEN 'drivers' THEN RETURN v_role IN (
      'chauffeur', 'tractionnaire', 'dispatcher', 'directeur', 'patron', 'pdg', 'admin', 'flotte'
    );
    WHEN 'admin' THEN RETURN public.is_erp_admin(p_user_id);
    ELSE RETURN false;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.can_view_wall_post IS
  'RLS mur : visiteurs/candidats = public+visitors+members ; chauffeurs = members+drivers';

GRANT EXECUTE ON FUNCTION public.can_view_wall_post(text, text, uuid) TO authenticated;

-- L''auteur voit toujours sa publication (évite « Publication créée mais introuvable »)
DROP POLICY IF EXISTS "wall_posts_select" ON public.wall_posts;
CREATE POLICY "wall_posts_select" ON public.wall_posts
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR public.can_view_wall_post(visibility, post_type, auth.uid())
  );

-- Bucket public pour photos / vidéos du mur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wall-media',
  'wall-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "wall_media_select" ON storage.objects;
CREATE POLICY "wall_media_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'wall-media');

DROP POLICY IF EXISTS "wall_media_insert" ON storage.objects;
CREATE POLICY "wall_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wall-media');

DROP POLICY IF EXISTS "wall_media_update" ON storage.objects;
CREATE POLICY "wall_media_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'wall-media')
  WITH CHECK (bucket_id = 'wall-media');

DROP POLICY IF EXISTS "wall_media_delete" ON storage.objects;
CREATE POLICY "wall_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'wall-media');
