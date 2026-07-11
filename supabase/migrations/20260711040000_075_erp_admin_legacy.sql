-- 075 — is_erp_admin : DOM76 + rôles legacy admin pendant la transition

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
        role IN ('admin', 'patron', 'pdg')
        OR public.is_dom76_owner(email)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_erp_admin(uuid) TO authenticated;
