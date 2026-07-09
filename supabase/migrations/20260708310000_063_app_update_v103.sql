-- 063 — Correctif v1.0.3 : banque RP chauffeur + dossier profil + notifications membres

DO $$
DECLARE
  v_author uuid;
  v_update_id uuid;
BEGIN
  SELECT id INTO v_author
  FROM public.profiles
  WHERE public.is_dom76_owner(email)
  LIMIT 1;

  IF v_author IS NULL THEN
    SELECT id INTO v_author
    FROM public.profiles
    WHERE role IN ('pdg', 'patron', 'admin')
    ORDER BY CASE role WHEN 'pdg' THEN 0 WHEN 'patron' THEN 1 ELSE 2 END
    LIMIT 1;
  END IF;

  IF v_author IS NULL THEN
    SELECT id INTO v_author FROM public.profiles LIMIT 1;
  END IF;

  IF v_author IS NULL THEN
    RAISE NOTICE '063: aucun profil — publication v1.0.3 ignorée';
    RETURN;
  END IF;

  INSERT INTO public.app_updates (
    title,
    description,
    version,
    update_type,
    status,
    created_by,
    published_at
  )
  VALUES (
    'Correctif banque RP & dossier chauffeur',
    E'• Compte bancaire RP par chauffeur (Crédit Agricole Z&D)\n• Onglet Mon compte bancaire sur /profile\n• Virements admin et salaires réels RP\n• Dossier chauffeur corrigé sur la page profil\n• Cliquez « Télécharger la mise à jour » pour installer v1.0.3',
    'v1.0.3',
    'correction',
    'publiee',
    v_author,
    now()
  )
  RETURNING id INTO v_update_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT
    p.id,
    'Mise à jour v1.0.3 disponible',
    'Correctif important : banque RP chauffeur, dossier profil et salaires. Téléchargez la mise à jour maintenant.',
    'app_update'
  FROM public.profiles p
  WHERE p.role NOT IN ('candidat', 'banni', 'ancien_membre');
END $$;
