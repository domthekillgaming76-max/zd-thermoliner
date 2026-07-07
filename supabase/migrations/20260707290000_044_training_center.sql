-- 044 — Rules & Training Center (additive)

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rules_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  required_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'driver'
    CHECK (category IN ('new_recruit', 'driver', 'convoy', 'economy', 'road_sheets', 'fleet', 'safety', 'admin')),
  video_url text,
  content text NOT NULL DEFAULT '',
  duration_minutes int NOT NULL DEFAULT 10,
  required_role text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  progress_percent int NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  lesson_id uuid REFERENCES public.training_lessons(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'driver',
  min_score int NOT NULL DEFAULT 70 CHECK (min_score BETWEEN 0 AND 100),
  max_attempts int NOT NULL DEFAULT 3,
  unlocks_certification text,
  required_role text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice', 'true_false')),
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '{}',
  attempt_number int NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, quiz_id);

CREATE TABLE IF NOT EXISTS public.driver_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  cert_slug text NOT NULL,
  cert_name text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  quiz_attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
  UNIQUE (user_id, cert_slug)
);

CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  rules_accepted_at timestamptz,
  first_quiz_passed_at timestamptz,
  training_completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  require_driver_unlock boolean NOT NULL DEFAULT false,
  driver_unlocked_at timestamptz,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id)
);

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_training_manager(p_user_id uuid DEFAULT auth.uid())
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
        role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher')
        OR public.is_dom76_owner(email)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_training_manager(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_onboarding_checklist(p_user_id uuid, p_application_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_checklists (user_id, application_id, status)
  VALUES (p_user_id, p_application_id, 'pending')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_onboarding_checklist(uuid, uuid) TO authenticated;

-- Extend approve_application: assign onboarding checklist
CREATE OR REPLACE FUNCTION public.approve_application(
  app_id uuid,
  assigned_role text DEFAULT 'chauffeur',
  reviewer_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record public.recruitment_applications%ROWTYPE;
  final_role text;
BEGIN
  SELECT * INTO app_record FROM public.recruitment_applications WHERE id = app_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application introuvable';
  END IF;

  IF app_record.candidate_type IN ('visiteur', 'visitor') THEN
    final_role := 'visitor';
  ELSE
    final_role := COALESCE(NULLIF(assigned_role, ''), 'chauffeur');
  END IF;

  UPDATE public.recruitment_applications
  SET
    status = 'approved',
    assigned_role = final_role,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    admin_notes = COALESCE(reviewer_notes, admin_notes),
    updated_at = now()
  WHERE id = app_id;

  IF app_record.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      role = final_role,
      application_status = 'approved',
      pseudo = COALESCE(app_record.pseudo, pseudo),
      updated_at = now()
    WHERE id = app_record.user_id;

    IF final_role = 'chauffeur' THEN
      INSERT INTO public.drivers (name, user_id, status)
      VALUES (app_record.pseudo, app_record.user_id, 'active')
      ON CONFLICT DO NOTHING;
    END IF;

    PERFORM public.assign_onboarding_checklist(app_record.user_id, app_id);
  END IF;
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.rules_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rules_sections_select" ON public.rules_sections;
CREATE POLICY "rules_sections_select" ON public.rules_sections
  FOR SELECT TO authenticated
  USING (is_public OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "rules_sections_manage" ON public.rules_sections;
CREATE POLICY "rules_sections_manage" ON public.rules_sections
  FOR ALL TO authenticated
  USING (public.is_training_manager(auth.uid()))
  WITH CHECK (public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "training_lessons_select" ON public.training_lessons;
CREATE POLICY "training_lessons_select" ON public.training_lessons
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "training_lessons_manage" ON public.training_lessons;
CREATE POLICY "training_lessons_manage" ON public.training_lessons
  FOR ALL TO authenticated
  USING (public.is_training_manager(auth.uid()))
  WITH CHECK (public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "training_progress_select" ON public.training_progress;
CREATE POLICY "training_progress_select" ON public.training_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "training_progress_upsert" ON public.training_progress;
CREATE POLICY "training_progress_upsert" ON public.training_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_training_manager(auth.uid()))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "training_quizzes_select" ON public.training_quizzes;
CREATE POLICY "training_quizzes_select" ON public.training_quizzes
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "training_quizzes_manage" ON public.training_quizzes;
CREATE POLICY "training_quizzes_manage" ON public.training_quizzes
  FOR ALL TO authenticated
  USING (public.is_training_manager(auth.uid()))
  WITH CHECK (public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "training_questions_select" ON public.training_questions;
CREATE POLICY "training_questions_select" ON public.training_questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "training_questions_manage" ON public.training_questions;
CREATE POLICY "training_questions_manage" ON public.training_questions
  FOR ALL TO authenticated
  USING (public.is_training_manager(auth.uid()))
  WITH CHECK (public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "quiz_attempts_select" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "quiz_attempts_insert" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_insert" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "driver_certifications_select" ON public.driver_certifications;
CREATE POLICY "driver_certifications_select" ON public.driver_certifications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "driver_certifications_manage" ON public.driver_certifications;
CREATE POLICY "driver_certifications_manage" ON public.driver_certifications
  FOR ALL TO authenticated
  USING (public.is_training_manager(auth.uid()))
  WITH CHECK (public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "onboarding_checklists_select" ON public.onboarding_checklists;
CREATE POLICY "onboarding_checklists_select" ON public.onboarding_checklists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "onboarding_checklists_update" ON public.onboarding_checklists;
CREATE POLICY "onboarding_checklists_update" ON public.onboarding_checklists
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_training_manager(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_training_manager(auth.uid()));

DROP POLICY IF EXISTS "onboarding_checklists_insert" ON public.onboarding_checklists;
CREATE POLICY "onboarding_checklists_insert" ON public.onboarding_checklists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_training_manager(auth.uid()));

-- ── Seed rules ────────────────────────────────────────────────────────────────

INSERT INTO public.rules_sections (slug, title, content, sort_order, is_public) VALUES
('general_behavior', 'Comportement général', E'## Comportement général Z&D Thermoliner\n\n- Respecter tous les membres (chauffeurs, dispatch, direction).\n- Pas d''insultes, harcèlement ou propos discriminatoires.\n- Représenter la société avec professionnalisme en convoi et sur Discord.\n- Signaler tout incident à la direction dans les 24h.', 1, true),
('convoy_rules', 'Règles de convoi', E'## Règles de convoi\n\n- Respecter l''ordre de départ et le leader désigné.\n- Interdiction de doubler sauf consigne du leader.\n- Maintenir la distance de sécurité (80-120m selon vitesse).\n- Pas de klaxon excessif ni de feux de détresse abusifs.\n- Pause obligatoire toutes les 2h sur longue distance.', 2, true),
('speed_limits', 'Limitations de vitesse', E'## Limites de vitesse RP\n\n- Agglomération : 50 km/h (60 max avec justification).\n- Route nationale : 80 km/h.\n- Autoroute : 90 km/h (convoi officiel).\n- Zone travaux : 60 km/h.\n- Dépassement = avertissement puis sanction.', 3, true),
('discord_rules', 'Règles Discord', E'## Règles Discord\n\n- Pseudo identique au pseudo ERP.\n- Salons vocaux : push-to-talk en convoi.\n- Pas de spam, pub externe ou liens non autorisés.\n- Canal #dispatch pour les missions uniquement.\n- Présence en vocal obligatoire pendant les convois officiels.', 4, true),
('truckersmp_rules', 'Règles TruckersMP', E'## TruckersMP\n\n- Respecter les règles TMP (pas de troll, collision volontaire).\n- Pas de mods interdits (speed hack, no collision abusif).\n- Signaler les bans actifs lors du recrutement.\n- Comportement exemplaire sur le serveur.', 5, true),
('realistic_driving', 'Conduite réaliste', E'## Conduite réaliste\n\n- Freinage progressif, pas de freinage d''urgence systématique.\n- Respect des feux et panneaux.\n- Pas de téléportation ni de reset abusif.\n- Carburant et dommages gérés de façon réaliste.\n- Stationnement correct aux livraisons.', 6, true),
('road_sheet_rules', 'Feuilles de route', E'## Feuilles de route\n\n- Saisie obligatoire sous 48h après livraison.\n- Km, client, cargo et revenus exacts.\n- Validation dispatch avant paiement.\n- Toute fraude = sanction immédiate.', 7, true),
('bank_salary_rules', 'Banque & salaires', E'## Banque & salaires\n\n- Paiement selon grille salariale validée.\n- Avances sur demande (max 30% du mois).\n- Frais de route remboursés sur justificatif.\n- Compte société consultable dans l''ERP.', 8, true),
('sanctions', 'Sanctions', E'## Sanctions\n\n1. **Avertissement** — manquement mineur\n2. **Suspension 7j** — récidive ou infraction modérée\n3. **Rétrogradation** — fraude feuille de route\n4. **Exclusion** — triche, insultes graves, ban TMP\n\nToute sanction est consignée dans le dossier chauffeur.', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed lessons ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.training_lessons LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.training_lessons (title, description, category, content, duration_minutes, required_role, sort_order) VALUES
  ('Bienvenue Z&D Thermoliner', 'Introduction à la société et ses valeurs', 'new_recruit', E'# Bienvenue\n\nZ&D Thermoliner est une VTC française spécialisée en transport frigorifique et longue distance.\n\n## Nos valeurs\n- Professionnalisme\n- Réalisme\n- Esprit d''équipe', 15, 'all', 1),
  ('Premiers pas chauffeur', 'Comment démarrer en tant que chauffeur', 'driver', E'# Premiers pas\n\n1. Lire toutes les règles\n2. Passer le quiz chauffeur\n3. Obtenir votre licence Z&D\n4. Consulter le dispatch pour votre première mission', 20, 'chauffeur', 2),
  ('Convoi officiel', 'Participer à un convoi Z&D', 'convoy', E'# Convoi officiel\n\n- Rejoindre le vocal Discord 15 min avant\n- Vérifier carburant et dégâts\n- Suivre le leader sans dépasser', 25, 'chauffeur', 3),
  ('Économie & salaires', 'Comprendre le système financier', 'economy', E'# Économie\n\n- Revenus par km selon contrat\n- Frais carburant et péages\n- Salaire mensuel calculé automatiquement', 15, 'all', 4),
  ('Feuilles de route ERP', 'Saisir une feuille de route', 'road_sheets', E'# Feuilles de route\n\n- Menu Feuilles de route\n- Remplir départ, arrivée, km, prix\n- Soumettre pour validation', 20, 'chauffeur', 5),
  ('Gestion flotte', 'Camions et remorques', 'fleet', E'# Flotte\n\n- Consulter votre camion assigné\n- Signaler maintenance\n- ADR si matières dangereuses', 15, 'chauffeur', 6),
  ('Sécurité routière', 'Bonnes pratiques sécurité', 'safety', E'# Sécurité\n\n- Contrôle véhicule avant départ\n- Pause obligatoire\n- Météo et visibilité', 20, 'all', 7),
  ('Dispatch & missions', 'Module dispatch pour admins', 'admin', E'# Dispatch\n\n- Créer missions\n- Assigner chauffeurs\n- Suivi GPS', 30, 'dispatcher', 8);
END $$;

-- ── Seed quizzes + questions ──────────────────────────────────────────────────

DO $$
DECLARE
  quiz_driver uuid;
  quiz_convoy uuid;
  quiz_onboard uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.training_quizzes LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.training_quizzes (title, description, category, min_score, max_attempts, unlocks_certification, required_role, sort_order)
  VALUES ('Quiz Chauffeur Z&D', 'Examen obligatoire pour la licence chauffeur', 'driver', 70, 3, 'zd_driver_license', 'chauffeur', 1)
  RETURNING id INTO quiz_driver;

  INSERT INTO public.training_questions (quiz_id, question_type, question_text, options, correct_answer, sort_order) VALUES
  (quiz_driver, 'true_false', 'La vitesse max en convoi officiel est 90 km/h sur autoroute.', '[]', 'true', 1),
  (quiz_driver, 'multiple_choice', 'Délai pour saisir une feuille de route ?', '["24h", "48h", "72h", "1 semaine"]', '48h', 2),
  (quiz_driver, 'true_false', 'Le dépassement en convoi est autorisé librement.', '[]', 'false', 3),
  (quiz_driver, 'multiple_choice', 'Qui valide les feuilles de route ?', '["Le chauffeur", "Le dispatch", "La banque", "Personne"]', 'Le dispatch', 4),
  (quiz_driver, 'true_false', 'Les insultes sur Discord sont sanctionnées.', '[]', 'true', 5);

  INSERT INTO public.training_quizzes (title, description, category, min_score, max_attempts, unlocks_certification, required_role, sort_order)
  VALUES ('Quiz Convoi Certifié', 'Certification convoi officiel', 'convoy', 80, 2, 'convoy_certified', 'chauffeur', 2)
  RETURNING id INTO quiz_convoy;

  INSERT INTO public.training_questions (quiz_id, question_type, question_text, options, correct_answer, sort_order) VALUES
  (quiz_convoy, 'true_false', 'Le leader de convoi donne l''ordre de départ.', '[]', 'true', 1),
  (quiz_convoy, 'multiple_choice', 'Distance recommandée en convoi ?', '["20m", "80-120m", "500m", "1km"]', '80-120m', 2),
  (quiz_convoy, 'true_false', 'Push-to-talk est recommandé en vocal convoi.', '[]', 'true', 3);

  INSERT INTO public.training_quizzes (title, description, category, min_score, max_attempts, unlocks_certification, required_role, sort_order)
  VALUES ('Quiz Onboarding Recrue', 'Premier quiz obligatoire recrutement', 'new_recruit', 60, 5, 'zd_driver_license', 'all', 0)
  RETURNING id INTO quiz_onboard;

  INSERT INTO public.training_questions (quiz_id, question_type, question_text, options, correct_answer, sort_order) VALUES
  (quiz_onboard, 'true_false', 'J''ai lu et accepté les règles Z&D Thermoliner.', '[]', 'true', 1),
  (quiz_onboard, 'multiple_choice', 'Que faire en cas d''incident en convoi ?', '["Ignorer", "Signaler à la direction", "Quitter le serveur", "Insulter"]', 'Signaler à la direction', 2),
  (quiz_onboard, 'true_false', 'La conduite réaliste est obligatoire chez Z&D.', '[]', 'true', 3);
END $$;

COMMENT ON TABLE public.rules_sections IS 'Company rules sections for training center';
COMMENT ON TABLE public.training_lessons IS 'Training lessons with content and video';
COMMENT ON TABLE public.training_quizzes IS 'Quizzes with scoring and certification unlock';
