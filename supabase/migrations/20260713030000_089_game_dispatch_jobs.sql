-- 089 — ETS2/ATS solo dispatch queue

CREATE TABLE IF NOT EXISTS public.game_dispatch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  freight_offer_id uuid REFERENCES public.freight_offers(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  game text NOT NULL DEFAULT 'ets2' CHECK (game IN ('ets2', 'ats')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'injected', 'failed', 'cancelled')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  client_version text,
  error_code text,
  error_message text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_dispatch_profile_status
  ON public.game_dispatch_jobs(profile_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_dispatch_mission
  ON public.game_dispatch_jobs(mission_id);

ALTER TABLE public.game_dispatch_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_dispatch_select" ON public.game_dispatch_jobs;
CREATE POLICY "game_dispatch_select" ON public.game_dispatch_jobs
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_freight_manager(auth.uid()));

DROP POLICY IF EXISTS "game_dispatch_update_own" ON public.game_dispatch_jobs;
CREATE POLICY "game_dispatch_update_own" ON public.game_dispatch_jobs
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE OR REPLACE FUNCTION public.queue_game_dispatch(
  p_offer_id uuid,
  p_mission_id uuid,
  p_driver_id uuid,
  p_game text DEFAULT 'ets2'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_offer public.freight_offers%ROWTYPE;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_game NOT IN ('ets2', 'ats') THEN RAISE EXCEPTION 'Jeu non pris en charge'; END IF;

  SELECT user_id INTO v_profile_id FROM public.drivers WHERE id = p_driver_id;
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Chauffeur sans compte launcher associé'; END IF;
  IF NOT public.is_freight_manager(auth.uid()) AND v_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO v_offer FROM public.freight_offers
  WHERE id = p_offer_id AND mission_id = p_mission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre ou mission incohérente'; END IF;

  SELECT id INTO v_id FROM public.game_dispatch_jobs
  WHERE mission_id = p_mission_id AND profile_id = v_profile_id
    AND status IN ('pending', 'claimed')
  ORDER BY requested_at DESC LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.game_dispatch_jobs (
      profile_id, driver_id, freight_offer_id, mission_id, game, payload, requested_by
    ) VALUES (
      v_profile_id, p_driver_id, p_offer_id, p_mission_id, p_game,
      jsonb_build_object(
        'departureCity', v_offer.departure_city,
        'arrivalCity', v_offer.arrival_city,
        'cargo', COALESCE(v_offer.cargo, 'Fret'),
        'weightKg', COALESCE(v_offer.weight_kg, 0),
        'distanceKm', COALESCE(v_offer.distance_km, 0),
        'priority', v_offer.priority,
        'adrRequired', v_offer.adr_required,
        'temperatureRequired', v_offer.temperature_required,
        'offerId', v_offer.id,
        'missionId', p_mission_id
      ), auth.uid()
    ) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_game_dispatch(uuid, uuid, uuid, text) TO authenticated;
GRANT SELECT, UPDATE ON public.game_dispatch_jobs TO authenticated;

COMMENT ON TABLE public.game_dispatch_jobs IS
  'Queue sécurisée des missions ERP à injecter dans une sauvegarde ETS2/ATS solo.';
