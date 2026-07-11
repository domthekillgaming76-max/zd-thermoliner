-- 072 — Marché fret : rôles admin/flotte pour is_freight_manager

CREATE OR REPLACE FUNCTION public.is_freight_manager(p_user_id uuid DEFAULT auth.uid())
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
        role IN ('admin', 'flotte')
        OR public.is_dom76_owner(email)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_freight_manager(uuid) TO authenticated;
