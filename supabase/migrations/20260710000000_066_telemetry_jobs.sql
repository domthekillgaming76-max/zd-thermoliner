-- 066 — Feuilles de route automatiques depuis télémétrie ETS2/ATS (additive)

-- ── Paramètre validation automatique ─────────────────────────────────────────
ALTER TABLE public.finance_settings
  ADD COLUMN IF NOT EXISTS validation_automatique_livraisons boolean NOT NULL DEFAULT true;

-- ── Statistiques entreprise (singleton) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_km numeric(14,2) NOT NULL DEFAULT 0,
  total_deliveries integer NOT NULL DEFAULT 0,
  total_revenue numeric(14,2) NOT NULL DEFAULT 0,
  total_fuel_cost numeric(14,2) NOT NULL DEFAULT 0,
  estimated_profit numeric(14,2) NOT NULL DEFAULT 0,
  today_km numeric(14,2) NOT NULL DEFAULT 0,
  today_deliveries integer NOT NULL DEFAULT 0,
  today_revenue numeric(14,2) NOT NULL DEFAULT 0,
  stats_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.company_stats (total_km, total_deliveries, total_revenue)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.company_stats LIMIT 1);

-- ── Missions télémétrie ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telemetry_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  tracking_id uuid REFERENCES public.delivery_tracking(id) ON DELETE SET NULL,
  local_job_id text NOT NULL,
  game text NOT NULL CHECK (game IN ('ets2', 'ats')),
  provider text NOT NULL DEFAULT 'zd_telemetry',
  status text NOT NULL DEFAULT 'detected' CHECK (status IN (
    'detected', 'active', 'paused', 'completed', 'cancelled', 'sync_error', 'pending_validation'
  )),
  cargo text,
  cargo_mass_kg numeric(12,2),
  source_city text,
  source_company text,
  destination_city text,
  destination_company text,
  expected_income numeric(12,2),
  final_income numeric(12,2),
  expected_distance_km numeric(10,2),
  actual_distance_km numeric(10,2),
  fuel_start numeric(10,2),
  fuel_end numeric(10,2),
  fuel_used numeric(10,2),
  truck_name text,
  truck_plate text,
  trailer_name text,
  trailer_plate text,
  truck_damage_start numeric(6,3),
  truck_damage_end numeric(6,3),
  trailer_damage_end numeric(6,3),
  avg_speed_kmh numeric(8,2),
  max_speed_kmh numeric(8,2),
  start_position jsonb,
  end_position jsonb,
  cancel_reason text,
  validation_comment text,
  validated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_at timestamptz,
  stats_applied_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telemetry_jobs_profile_local_game_unique UNIQUE (profile_id, local_job_id, game)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_jobs_profile ON public.telemetry_jobs(profile_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_jobs_driver ON public.telemetry_jobs(driver_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_jobs_local_job ON public.telemetry_jobs(local_job_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_jobs_status ON public.telemetry_jobs(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_jobs_created ON public.telemetry_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_jobs_active ON public.telemetry_jobs(driver_id, status)
  WHERE status IN ('detected', 'active', 'paused');

-- ── Mises à jour télémétrie ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telemetry_job_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telemetry_job_id uuid NOT NULL REFERENCES public.telemetry_jobs(id) ON DELETE CASCADE,
  speed_kmh numeric(8,2),
  fuel_liters numeric(10,2),
  truck_damage numeric(6,3),
  trailer_damage numeric(6,3),
  distance_remaining_km numeric(10,2),
  progress_percent numeric(5,2),
  eta_at timestamptz,
  position jsonb,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_job_updates_job ON public.telemetry_job_updates(telemetry_job_id, created_at DESC);

-- ── Colonnes road_sheets (source télémétrie) ─────────────────────────────────
ALTER TABLE public.road_sheets ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.road_sheets ADD COLUMN IF NOT EXISTS telemetry_job_id uuid REFERENCES public.telemetry_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.road_sheets ADD COLUMN IF NOT EXISTS game text;
ALTER TABLE public.road_sheets ADD COLUMN IF NOT EXISTS local_job_id text;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.telemetry_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_job_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telemetry_jobs_select" ON public.telemetry_jobs;
CREATE POLICY "telemetry_jobs_select" ON public.telemetry_jobs
  FOR SELECT TO authenticated USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher') OR public.is_dom76_owner(p.email))
    )
  );

DROP POLICY IF EXISTS "telemetry_jobs_manage" ON public.telemetry_jobs;
CREATE POLICY "telemetry_jobs_manage" ON public.telemetry_jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher') OR public.is_dom76_owner(p.email))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher') OR public.is_dom76_owner(p.email))
    )
  );

DROP POLICY IF EXISTS "telemetry_job_updates_select" ON public.telemetry_job_updates;
CREATE POLICY "telemetry_job_updates_select" ON public.telemetry_job_updates
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.telemetry_jobs tj
      WHERE tj.id = telemetry_job_id
        AND (
          tj.profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (p.role IN ('pdg', 'patron', 'admin', 'directeur', 'dispatcher') OR public.is_dom76_owner(p.email))
          )
        )
    )
  );

DROP POLICY IF EXISTS "company_stats_select" ON public.company_stats;
CREATE POLICY "company_stats_select" ON public.company_stats
  FOR SELECT TO authenticated USING (true);

-- ── RPC : stats idempotentes ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_telemetry_job_stats(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_km numeric;
  v_revenue numeric;
  v_fuel numeric;
  v_damage numeric;
  v_profit numeric;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT * INTO v_job FROM public.telemetry_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.stats_applied_at IS NOT NULL THEN
    RETURN false;
  END IF;
  IF v_job.status NOT IN ('completed', 'pending_validation') OR v_job.road_sheet_id IS NULL THEN
    RETURN false;
  END IF;

  v_km := COALESCE(v_job.actual_distance_km, v_job.expected_distance_km, 0);
  v_revenue := COALESCE(v_job.final_income, v_job.expected_income, 0);
  v_fuel := COALESCE(v_job.fuel_used, 0);
  v_damage := COALESCE(v_job.truck_damage_end, 0) + COALESCE(v_job.trailer_damage_end, 0);
  v_profit := v_revenue - (v_fuel * 1.85);

  IF v_job.driver_id IS NOT NULL THEN
    INSERT INTO public.driver_stats (
      driver_id, total_distance, total_deliveries, total_earnings, total_fuel, last_delivery_date, updated_at
    ) VALUES (
      v_job.driver_id,
      v_km::integer,
      1,
      v_revenue,
      v_fuel,
      COALESCE(v_job.completed_at::date, CURRENT_DATE),
      now()
    )
    ON CONFLICT (driver_id) DO UPDATE SET
      total_distance = driver_stats.total_distance + v_km::integer,
      total_deliveries = driver_stats.total_deliveries + 1,
      total_earnings = driver_stats.total_earnings + v_revenue,
      total_fuel = driver_stats.total_fuel + v_fuel,
      monthly_distance = CASE
        WHEN date_trunc('month', COALESCE(v_job.completed_at, now())) = date_trunc('month', now())
        THEN driver_stats.monthly_distance + v_km::integer
        ELSE driver_stats.monthly_distance
      END,
      monthly_deliveries = CASE
        WHEN date_trunc('month', COALESCE(v_job.completed_at, now())) = date_trunc('month', now())
        THEN driver_stats.monthly_deliveries + 1
        ELSE driver_stats.monthly_deliveries
      END,
      last_delivery_date = COALESCE(v_job.completed_at::date, driver_stats.last_delivery_date),
      updated_at = now();

    UPDATE public.drivers SET
      total_km = COALESCE(total_km, 0) + v_km,
      monthly_km = CASE
        WHEN date_trunc('month', COALESCE(v_job.completed_at, now())) = date_trunc('month', now())
        THEN COALESCE(monthly_km, 0) + v_km
        ELSE monthly_km
      END,
      deliveries_count = COALESCE(deliveries_count, 0) + 1,
      updated_at = now()
    WHERE id = v_job.driver_id;
  END IF;

  UPDATE public.company_stats SET
    total_km = total_km + v_km,
    total_deliveries = total_deliveries + 1,
    total_revenue = total_revenue + v_revenue,
    total_fuel_cost = total_fuel_cost + (v_fuel * 1.85),
    estimated_profit = estimated_profit + v_profit,
    today_km = CASE WHEN stats_date = v_today THEN today_km + v_km ELSE v_km END,
    today_deliveries = CASE WHEN stats_date = v_today THEN today_deliveries + 1 ELSE 1 END,
    today_revenue = CASE WHEN stats_date = v_today THEN today_revenue + v_revenue ELSE v_revenue END,
    stats_date = v_today,
    updated_at = now()
  WHERE id = (SELECT id FROM public.company_stats LIMIT 1);

  UPDATE public.telemetry_jobs SET
    stats_applied_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('average_damage', v_damage),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN true;
END;
$$;

-- ── Realtime ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_jobs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_job_updates;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMENT ON TABLE public.telemetry_jobs IS 'Missions ETS2/ATS détectées par le launcher — feuilles de route automatiques';
