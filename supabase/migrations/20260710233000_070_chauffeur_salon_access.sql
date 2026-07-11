-- 070 — Accès chauffeur : tous les salons sauf finance, recrutement, administration

DO $$
DECLARE
  excluded text[] := ARRAY[
    'finance', 'invoices', 'salaries', 'accounting', 'bank',
    'recruitment', 'recruitment_applications', 'recruitment_admin',
    'administration', 'salons_admin', 'admin_integrations'
  ];
  driver_roles text[] := ARRAY['chauffeur', 'driver', 'member'];
  rec record;
  role_item text;
  new_roles text[];
BEGIN
  FOR rec IN SELECT key, allowed_roles FROM public.app_modules LOOP
    new_roles := ARRAY[]::text[];

    FOREACH role_item IN ARRAY rec.allowed_roles LOOP
      IF rec.key = ANY(excluded) THEN
        IF NOT (role_item = ANY(driver_roles)) THEN
          new_roles := array_append(new_roles, role_item);
        END IF;
      ELSE
        new_roles := array_append(new_roles, role_item);
      END IF;
    END LOOP;

    IF NOT (rec.key = ANY(excluded)) THEN
      FOREACH role_item IN ARRAY driver_roles LOOP
        IF NOT (role_item = ANY(new_roles)) THEN
          new_roles := array_append(new_roles, role_item);
        END IF;
      END LOOP;
    END IF;

    UPDATE public.app_modules
    SET allowed_roles = new_roles, updated_at = now()
    WHERE key = rec.key;
  END LOOP;
END $$;
