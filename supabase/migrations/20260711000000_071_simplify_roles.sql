-- 071 — Simplification des rôles : admin, flotte, visitor (+ ancien_membre, banni)

-- 1. Migrer les profils existants vers les 3 rôles canoniques
UPDATE public.profiles SET role = 'admin'
WHERE role IN ('admin', 'administrator', 'administrateur', 'pdg', 'patron');

UPDATE public.profiles SET role = 'visitor'
WHERE role IN ('visitor', 'visiteur', 'candidat', 'recruit', 'recruitment');

UPDATE public.profiles SET role = 'flotte'
WHERE role NOT IN ('admin', 'flotte', 'visitor', 'ancien_membre', 'banni');

-- 2. Contrainte profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'flotte', 'visitor', 'ancien_membre', 'banni'));

-- 3. is_erp_admin — uniquement admin + DOM76
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
      AND (role = 'admin' OR public.is_dom76_owner(email))
  );
$$;

-- 4. Protection DOM76 — rôle admin uniquement
CREATE OR REPLACE FUNCTION public.guard_dom76_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_dom76_owner(OLD.email) THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role <> 'admin' THEN
      NEW.role := OLD.role;
    END IF;
    NEW.is_active := true;
    NEW.is_suspended := false;
    IF NEW.application_status IN ('banned', 'fired', 'left') THEN
      NEW.application_status := COALESCE(OLD.application_status, 'approved');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Mur — visibilités avec les nouveaux rôles
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

  IF v_role = 'visitor' THEN
    IF p_post_type = 'recruitment' THEN
      RETURN p_visibility IN ('public', 'visitors');
    END IF;
    RETURN p_visibility IN ('public', 'visitors', 'members');
  END IF;

  CASE p_visibility
    WHEN 'public' THEN RETURN true;
    WHEN 'visitors' THEN RETURN true;
    WHEN 'members' THEN RETURN v_role IN ('flotte', 'admin');
    WHEN 'drivers' THEN RETURN v_role IN ('flotte', 'admin');
    WHEN 'admin' THEN RETURN public.is_erp_admin(p_user_id);
    ELSE RETURN false;
  END CASE;
END;
$$;

-- 6. allowed_roles des salons — admin / flotte / visitor
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
    SET allowed_roles = new_roles, updated_at = now()
    WHERE key = rec.key;
  END LOOP;
END $$;

-- 7. RPC cycle de vie — admin uniquement (is_erp_admin)
CREATE OR REPLACE FUNCTION public.fire_member(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile public.profiles;
BEGIN
  IF NOT public.is_erp_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Administrateur requis';
  END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = fire_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF public.is_dom76_owner(target_profile.email) THEN
    RAISE EXCEPTION 'Compte DOM76 protégé';
  END IF;

  UPDATE public.profiles SET role = 'ancien_membre', application_status = 'fired', is_active = false
  WHERE id = fire_member.target_user_id;

  UPDATE public.drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = fire_member.target_user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (fire_member.target_user_id, 'Licenciement', 'Vous avez été licencié de Z&D Thermoliner.', 'error');

  INSERT INTO public.members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (fire_member.target_user_id, auth.uid(), 'fired', reason, target_profile.role, 'ancien_membre');
END;
$$;

CREATE OR REPLACE FUNCTION public.ban_member(target_user_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile public.profiles;
BEGIN
  IF NOT public.is_erp_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Administrateur requis';
  END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = ban_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF public.is_dom76_owner(target_profile.email) THEN
    RAISE EXCEPTION 'Compte DOM76 protégé';
  END IF;

  UPDATE public.profiles SET role = 'banni', application_status = 'banned', is_active = false, is_suspended = true
  WHERE id = ban_member.target_user_id;

  UPDATE public.drivers SET status = 'inactive', is_active_driver = false
  WHERE user_id = ban_member.target_user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (ban_member.target_user_id, 'Bannissement', 'Votre accès à Z&D Thermoliner a été suspendu.', 'error');

  INSERT INTO public.members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (ban_member.target_user_id, auth.uid(), 'banned', reason, target_profile.role, 'banni');
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_member(target_user_id uuid, restore_role text DEFAULT 'flotte')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile public.profiles;
  v_role text := restore_member.restore_role;
BEGIN
  IF NOT public.is_erp_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Administrateur requis';
  END IF;

  IF v_role IN ('chauffeur', 'tractionnaire', 'dispatcher', 'directeur', 'patron', 'pdg') THEN
    v_role := 'flotte';
  END IF;
  IF v_role NOT IN ('admin', 'flotte', 'visitor') THEN
    v_role := 'flotte';
  END IF;

  SELECT * INTO target_profile FROM public.profiles WHERE id = restore_member.target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;

  UPDATE public.profiles SET role = v_role, application_status = 'approved', is_active = true, is_suspended = false
  WHERE id = restore_member.target_user_id;

  UPDATE public.drivers SET status = 'active', is_active_driver = true
  WHERE user_id = restore_member.target_user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (restore_member.target_user_id, 'Compte restauré', 'Votre accès à Z&D Thermoliner a été restauré.', 'success');

  INSERT INTO public.members_audit_logs (target_user_id, action_by_user_id, action_type, reason, old_role, new_role)
  VALUES (restore_member.target_user_id, auth.uid(), 'restored', NULL, target_profile.role, v_role);
END;
$$;

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_erp_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_erp_admin(auth.uid()));
