-- 031 — Administration & Security module (additive)

-- ── Profile suspension flag ───────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- ── DOM76 owner email constant helper ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_dom76_owner(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_email, ''))) = 'domthekillgaming76@gmail.com';
$$;

-- ── Extended admin check (includes DOM76 email) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.is_erp_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND (
        role IN ('pdg', 'patron', 'admin')
        OR public.is_dom76_owner(email)
      )
  );
$$;

-- ── DOM76 protection trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_dom76_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_dom76_owner(OLD.email) THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role NOT IN ('pdg', 'patron', 'admin') THEN
      NEW.role := OLD.role;
    END IF;
    IF NEW.is_active IS DISTINCT FROM true THEN
      NEW.is_active := true;
    END IF;
    IF NEW.is_suspended IS DISTINCT FROM false THEN
      NEW.is_suspended := false;
    END IF;
    IF NEW.application_status IN ('banned', 'fired', 'left') THEN
      NEW.application_status := OLD.application_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dom76_profile ON public.profiles;
CREATE TRIGGER trg_guard_dom76_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_dom76_profile();

-- ── user_permissions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL
    CHECK (permission_key IN (
      'can_view_dashboard',
      'can_manage_drivers',
      'can_manage_fleet',
      'can_manage_bank',
      'can_validate_road_sheets',
      'can_manage_recruitment',
      'can_manage_reports',
      'can_manage_admin'
    )),
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
CREATE POLICY "user_permissions_select" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "user_permissions_manage" ON public.user_permissions;
CREATE POLICY "user_permissions_manage" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- ── security_logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL
    CHECK (event_type IN (
      'login', 'logout', 'role_change', 'profile_update',
      'road_sheet_validation', 'bank_action', 'failed_access_attempt',
      'account_suspend', 'account_reactivate', 'permission_change', 'account_delete'
    )),
  message text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON public.security_logs(event_type);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_logs_select" ON public.security_logs;
CREATE POLICY "security_logs_select" ON public.security_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "security_logs_insert" ON public.security_logs;
CREATE POLICY "security_logs_insert" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── admin_actions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL
    CHECK (action_type IN (
      'role_change', 'suspend', 'reactivate', 'delete_profile',
      'reset_theme', 'permission_grant', 'permission_revoke', 'promote'
    )),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions(created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_actions_select" ON public.admin_actions;
CREATE POLICY "admin_actions_select" ON public.admin_actions
  FOR SELECT TO authenticated
  USING (public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_actions_insert" ON public.admin_actions;
CREATE POLICY "admin_actions_insert" ON public.admin_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_erp_admin(auth.uid()));

-- ── access_attempts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,
  page text,
  allowed boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_attempts_created ON public.access_attempts(created_at DESC);

ALTER TABLE public.access_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_attempts_select" ON public.access_attempts;
CREATE POLICY "access_attempts_select" ON public.access_attempts
  FOR SELECT TO authenticated
  USING (public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "access_attempts_insert" ON public.access_attempts;
CREATE POLICY "access_attempts_insert" ON public.access_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Safe admin role change RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_email text;
  v_old_role text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  SELECT email, role INTO v_target_email, v_old_role
  FROM public.profiles WHERE id = p_target_user_id;

  IF v_target_email IS NULL THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF public.is_dom76_owner(v_target_email) THEN RAISE EXCEPTION 'Compte propriétaire DOM76 protégé'; END IF;

  UPDATE public.profiles
  SET role = p_new_role, updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, details)
  VALUES (v_actor, p_target_user_id, 'role_change', jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role));

  INSERT INTO public.security_logs (user_id, actor_id, event_type, message, details)
  VALUES (p_target_user_id, v_actor, 'role_change',
    format('Rôle modifié: %s → %s', v_old_role, p_new_role),
    jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role));
END;
$$;

-- ── Suspend / reactivate account ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_target_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_email text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_target_user_id;
  IF public.is_dom76_owner(v_target_email) THEN RAISE EXCEPTION 'Compte propriétaire DOM76 protégé'; END IF;

  UPDATE public.profiles
  SET is_suspended = true, is_active = false, updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, details)
  VALUES (v_actor, p_target_user_id, 'suspend', jsonb_build_object('reason', p_reason));

  INSERT INTO public.security_logs (user_id, actor_id, event_type, message, details)
  VALUES (p_target_user_id, v_actor, 'account_suspend', 'Compte suspendu', jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  UPDATE public.profiles
  SET is_suspended = false, is_active = true, updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type)
  VALUES (v_actor, p_target_user_id, 'reactivate');

  INSERT INTO public.security_logs (user_id, actor_id, event_type, message)
  VALUES (p_target_user_id, v_actor, 'account_reactivate', 'Compte réactivé');
END;
$$;

-- ── Reset profile theme ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reset_profile_theme(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_email text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_target_user_id;
  IF public.is_dom76_owner(v_target_email) THEN RAISE EXCEPTION 'Compte propriétaire DOM76 protégé'; END IF;

  UPDATE public.profiles SET
    profile_theme = 'scania_red',
    primary_color = '#ef4444',
    secondary_color = '#991b1b',
    background_style = 'dark',
    card_style = 'glass',
    theme_color = '#ef4444',
    updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type)
  VALUES (v_actor, p_target_user_id, 'reset_theme');
END;
$$;

-- ── Soft-delete profile ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user_profile(p_target_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_email text;
  v_old_role text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  SELECT email, role INTO v_target_email, v_old_role FROM public.profiles WHERE id = p_target_user_id;
  IF public.is_dom76_owner(v_target_email) THEN RAISE EXCEPTION 'Compte propriétaire DOM76 protégé'; END IF;

  UPDATE public.profiles SET
    role = 'ancien_membre',
    is_active = false,
    is_suspended = false,
    application_status = 'left',
    updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, details)
  VALUES (v_actor, p_target_user_id, 'delete_profile', jsonb_build_object('old_role', v_old_role, 'reason', p_reason));

  INSERT INTO public.security_logs (user_id, actor_id, event_type, message, details)
  VALUES (p_target_user_id, v_actor, 'account_delete', 'Profil archivé', jsonb_build_object('reason', p_reason));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_profile_theme(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_profile(uuid, text) TO authenticated;

COMMENT ON TABLE public.user_permissions IS 'Per-user ERP permission overrides for Z&D Thermoliner';
COMMENT ON TABLE public.security_logs IS 'Security audit trail for Z&D Thermoliner ERP';
COMMENT ON TABLE public.admin_actions IS 'Admin control center action log';
COMMENT ON TABLE public.access_attempts IS 'Failed and allowed page access attempts';
