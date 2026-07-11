-- 069 — Gestion salons : droits admin étendus (DOM76 + administrator)

DROP POLICY IF EXISTS "app_modules_admin_manage" ON public.app_modules;
CREATE POLICY "app_modules_admin_manage" ON public.app_modules
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));
