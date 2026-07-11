-- 074 — Synchroniser app_modules avec accessPolicy (rôles canoniques)

DO $$
DECLARE
  rec record;
  new_roles text[];
BEGIN
  FOR rec IN SELECT key FROM public.app_modules LOOP
    new_roles := CASE rec.key
      WHEN 'wall' THEN ARRAY['admin', 'flotte', 'visitor']
      WHEN 'profile' THEN ARRAY['admin', 'flotte', 'visitor']
      WHEN 'settings' THEN ARRAY['admin', 'flotte', 'visitor']
      WHEN 'recruitment' THEN ARRAY['admin', 'visitor']
      WHEN 'recruitment_applications' THEN ARRAY['visitor']
      WHEN 'recruitment_admin' THEN ARRAY['admin']
      WHEN 'administration' THEN ARRAY['admin']
      WHEN 'salons_admin' THEN ARRAY['admin']
      WHEN 'admin_integrations' THEN ARRAY['admin']
      WHEN 'bank' THEN ARRAY['admin']
      WHEN 'finance' THEN ARRAY['admin']
      WHEN 'invoices' THEN ARRAY['admin']
      WHEN 'salaries' THEN ARRAY['admin']
      WHEN 'accounting' THEN ARRAY['admin']
      ELSE ARRAY['admin', 'flotte']
    END;

    UPDATE public.app_modules
    SET
      allowed_roles = new_roles,
      admin_only = rec.key IN (
        'bank', 'finance', 'invoices', 'salaries', 'accounting',
        'administration', 'salons_admin', 'admin_integrations', 'recruitment_admin'
      ),
      updated_at = now()
    WHERE key = rec.key;
  END LOOP;
END $$;
