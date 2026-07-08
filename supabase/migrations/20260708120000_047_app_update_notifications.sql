-- 047 — App update notifications use dedicated type

CREATE OR REPLACE FUNCTION public.publish_update(update_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upd public.app_updates;
BEGIN
  IF NOT public.can_manage_app_updates(auth.uid()) THEN
    RAISE EXCEPTION 'Seuls PDG, patron et administrateurs peuvent publier des mises à jour';
  END IF;

  SELECT * INTO upd FROM public.app_updates WHERE id = publish_update.update_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mise à jour introuvable'; END IF;

  UPDATE public.app_updates
    SET status = 'publiee', published_at = now(), updated_at = now()
    WHERE id = publish_update.update_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT
    p.id,
    'Mise à jour ' || upd.version,
    'Une mise à jour est disponible. Rafraîchissez votre page pour profiter de la dernière version.',
    'app_update'
  FROM public.profiles p
  WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre')
    AND p.id <> auth.uid();
END;
$$;
