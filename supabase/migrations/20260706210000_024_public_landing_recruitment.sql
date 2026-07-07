-- 024 — Public landing recruitment: extended applications + visitor role

-- ── Visitor & admin roles ───────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'pdg', 'patron', 'directeur', 'dispatcher', 'chauffeur', 'tractionnaire',
    'candidat', 'visitor', 'admin', 'ancien_membre', 'banni'
  ));

-- ── Extend recruitment_applications ─────────────────────────────────────────
ALTER TABLE public.recruitment_applications
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS candidate_type text DEFAULT 'chauffeur_rp';
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS total_km text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS previous_vtc boolean DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS previous_vtc_reason text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS truckersmp boolean DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS active_bans text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS available_days text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS available_hours text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS play_frequency text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS contribution text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS accepts_rules boolean DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS driving_style text;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS discord_ok boolean DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS long_distance_ok boolean DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS realism_rules_ok boolean DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill experience from legacy column
UPDATE public.recruitment_applications
SET experience = ets2_experience
WHERE experience IS NULL AND ets2_experience IS NOT NULL;

-- ── Approve application (candidate_type aware) ────────────────────────────────
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
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_application(
  app_id uuid,
  reviewer_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.recruitment_applications
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    admin_notes = COALESCE(reviewer_notes, admin_notes),
    updated_at = now()
  WHERE id = app_id;

  UPDATE public.profiles
  SET application_status = 'rejected', updated_at = now()
  WHERE id = (SELECT user_id FROM public.recruitment_applications WHERE id = app_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_application(uuid, text) TO authenticated;
