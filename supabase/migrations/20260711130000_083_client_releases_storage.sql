-- 083 — Bucket public pour installateur client Windows

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-releases',
  'client-releases',
  true,
  104857600,
  ARRAY[
    'application/octet-stream',
    'application/x-msdownload',
    'application/vnd.microsoft.portable-executable'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "client_releases_select" ON storage.objects;
CREATE POLICY "client_releases_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'client-releases');

DROP POLICY IF EXISTS "client_releases_insert" ON storage.objects;
CREATE POLICY "client_releases_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-releases'
    AND public.is_erp_admin(auth.uid())
  );

DROP POLICY IF EXISTS "client_releases_update" ON storage.objects;
CREATE POLICY "client_releases_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-releases' AND public.is_erp_admin(auth.uid()))
  WITH CHECK (bucket_id = 'client-releases' AND public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "client_releases_delete" ON storage.objects;
CREATE POLICY "client_releases_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-releases' AND public.is_erp_admin(auth.uid()));
