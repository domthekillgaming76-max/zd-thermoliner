-- 040 — App updates: broader publish rights + seed changelog

CREATE OR REPLACE FUNCTION public.can_manage_app_updates(p_user_id uuid DEFAULT auth.uid())
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

GRANT EXECUTE ON FUNCTION public.can_manage_app_updates(uuid) TO authenticated;

DROP POLICY IF EXISTS "updates_insert" ON public.app_updates;
CREATE POLICY "updates_insert" ON public.app_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_app_updates(auth.uid()));

DROP POLICY IF EXISTS "updates_update" ON public.app_updates;
CREATE POLICY "updates_update" ON public.app_updates
  FOR UPDATE TO authenticated
  USING (public.can_manage_app_updates(auth.uid()))
  WITH CHECK (public.can_manage_app_updates(auth.uid()));

DROP POLICY IF EXISTS "updates_delete" ON public.app_updates;
CREATE POLICY "updates_delete" ON public.app_updates
  FOR DELETE TO authenticated
  USING (public.can_manage_app_updates(auth.uid()));

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
    upd.title,
    'info'
  FROM public.profiles p
  WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre')
    AND p.id <> auth.uid();
END;
$$;

-- Seed initial changelog when none published yet
DO $$
DECLARE
  author_id uuid;
BEGIN
  SELECT id INTO author_id
  FROM public.profiles
  WHERE role IN ('pdg', 'patron', 'admin')
     OR public.is_dom76_owner(email)
  ORDER BY CASE role WHEN 'pdg' THEN 0 WHEN 'patron' THEN 1 ELSE 2 END
  LIMIT 1;

  IF author_id IS NULL THEN
    SELECT id INTO author_id FROM public.profiles LIMIT 1;
  END IF;

  IF author_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.app_updates WHERE status = 'publiee'
  ) THEN
    INSERT INTO public.app_updates (title, description, version, update_type, status, created_by, published_at) VALUES
    (
      'GPS & Tracking livraisons',
      E'• Nouveau module /tracking — salle de contrôle Europe\n• Carte interactive, marqueurs camions, alertes retards\n• Simulation GPS manuelle en attendant TruckersMP / ETS2\n• Chauffeurs : suivi de leurs livraisons uniquement',
      'v2.6.0',
      'nouveaute',
      'publiee',
      author_id,
      now() - interval '1 day'
    ),
    (
      'Coffre-fort numérique',
      E'• Gestion documentaire centralisée (/documents)\n• Permis, ADR, contrats, factures, recrutement\n• Validation admin, alertes expiration, URLs signées\n• Stockage privé Supabase',
      'v2.5.0',
      'nouveaute',
      'publiee',
      author_id,
      now() - interval '3 days'
    ),
    (
      'Portail mobile chauffeur',
      E'• Application mobile /driver pour chauffeurs\n• Mission du jour, feuille de route, preuves livraison\n• Documents, salaire estimé, actions rapides\n• Redirection automatique après connexion',
      'v2.4.0',
      'nouveaute',
      'publiee',
      author_id,
      now() - interval '5 days'
    ),
    (
      'Bienvenue sur Z&D Thermoliner ERP',
      E'Plateforme ERP communautaire pour la gestion de la flotte, des chauffeurs, des missions et de la finance.\n\nConsultez cette page pour suivre les nouveautés, corrections et annonces officielles.',
      'v2.0.0',
      'annonce',
      'publiee',
      author_id,
      now() - interval '14 days'
    );
  END IF;
END $$;
