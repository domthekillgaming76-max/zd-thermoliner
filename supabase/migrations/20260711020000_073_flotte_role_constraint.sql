-- 073 — Autoriser le rôle flotte + RPC changement de rôle robuste

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 'flotte', 'visitor', 'visiteur',
    'pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire',
    'candidat', 'ancien_membre', 'banni'
  ));

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
  v_role text;
  v_stored text;
  v_variant text;
  v_variants text[];
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_erp_admin(v_actor) THEN RAISE EXCEPTION 'Accès refusé — administrateur requis'; END IF;

  SELECT email, role INTO v_target_email, v_old_role
  FROM public.profiles WHERE id = p_target_user_id;

  IF v_target_email IS NULL THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF public.is_dom76_owner(v_target_email) THEN RAISE EXCEPTION 'Compte propriétaire DOM76 protégé'; END IF;

  v_role := lower(trim(p_new_role));

  IF v_role IN ('administrator', 'administrateur', 'pdg', 'patron') THEN
    v_role := 'admin';
  ELSIF v_role IN ('visiteur', 'candidat', 'recruit', 'recruitment') THEN
    v_role := 'visitor';
  ELSIF v_role IN (
    'chauffeur', 'driver', 'member', 'tractionnaire', 'dispatcher',
    'directeur', 'fleet_manager', 'manager', 'comptable', 'accountant'
  ) THEN
    v_role := 'flotte';
  END IF;

  IF v_role NOT IN ('admin', 'flotte', 'visitor', 'ancien_membre', 'banni') THEN
    RAISE EXCEPTION 'Rôle invalide : %', p_new_role;
  END IF;

  IF v_role = 'visitor' THEN
    v_variants := ARRAY['visitor', 'visiteur', 'candidat'];
  ELSIF v_role = 'admin' THEN
    v_variants := ARRAY['admin', 'patron', 'pdg'];
  ELSE
    v_variants := ARRAY['chauffeur', 'tractionnaire', 'dispatcher', 'directeur', 'flotte'];
  END IF;

  v_stored := NULL;
  FOREACH v_variant IN ARRAY v_variants LOOP
    BEGIN
      UPDATE public.profiles
      SET role = v_variant, updated_at = now()
      WHERE id = p_target_user_id;
      v_stored := v_variant;
      EXIT;
    EXCEPTION WHEN check_violation THEN
      CONTINUE;
    END;
  END LOOP;

  IF v_stored IS NULL THEN
    RAISE EXCEPTION 'Rôle « % » refusé par la base de données', p_new_role;
  END IF;

  IF v_role = 'flotte' OR v_stored IN ('chauffeur', 'tractionnaire', 'dispatcher', 'directeur', 'flotte') THEN
    UPDATE public.profiles
    SET application_status = 'approved', is_active = true, is_suspended = false
    WHERE id = p_target_user_id;
  END IF;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, details)
  VALUES (v_actor, p_target_user_id, 'role_change', jsonb_build_object(
    'old_role', v_old_role, 'new_role', v_stored, 'requested_role', v_role
  ));

  INSERT INTO public.security_logs (user_id, actor_id, event_type, message, details)
  VALUES (p_target_user_id, v_actor, 'role_change',
    format('Rôle modifié: %s → %s', v_old_role, v_stored),
    jsonb_build_object('old_role', v_old_role, 'new_role', v_stored, 'requested_role', v_role));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, text) TO authenticated;
