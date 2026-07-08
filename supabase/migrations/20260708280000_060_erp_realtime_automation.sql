-- 060 — ERP automation: validation cascade, freight top-up, backup logs, trigger fix

-- ── Fix bank trigger for validated status ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_on_road_sheet_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    (NEW.status IN ('approved', 'validated') OR COALESCE(NEW.validated, false) = true)
    AND NOT (
      (OLD.status IN ('approved', 'validated') OR COALESCE(OLD.validated, false) = true)
    )
  ) THEN
    BEGIN
      PERFORM public.process_approved_road_sheet(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Bank sync failed for road sheet %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS road_sheet_approval_trigger ON public.road_sheets;
CREATE TRIGGER road_sheet_approval_trigger
  AFTER UPDATE OF status, validated ON public.road_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_road_sheet_approved();

-- ── Operational stats on validation (driver km, truck mileage) ─────────────────

CREATE OR REPLACE FUNCTION public.sync_operational_stats_from_road_sheet(p_sheet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet public.road_sheets%ROWTYPE;
  v_km integer;
  v_month text;
  v_is_month boolean;
  v_hours numeric;
BEGIN
  SELECT * INTO v_sheet FROM public.road_sheets WHERE id = p_sheet_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT (
    COALESCE(v_sheet.validated, false) = true
    OR v_sheet.status IN ('validated', 'approved')
  ) THEN
    RETURN;
  END IF;

  IF v_sheet.driver_id IS NULL THEN RETURN; END IF;

  v_km := GREATEST(0, COALESCE(v_sheet.km, v_sheet.total_distance, 0)::integer);
  IF v_km <= 0 THEN RETURN; END IF;

  v_month := to_char(now(), 'YYYY-MM');
  v_is_month := left(coalesce(v_sheet.date::text, v_sheet.created_at::text, ''), 7) = v_month;
  v_hours := round((v_km::numeric / 80.0)::numeric, 1);

  UPDATE public.drivers SET
    total_km = COALESCE(total_km, 0) + v_km,
    monthly_km = CASE WHEN v_is_month THEN COALESCE(monthly_km, 0) + v_km ELSE monthly_km END,
    deliveries_count = COALESCE(deliveries_count, 0) + 1,
    driving_hours_month = CASE WHEN v_is_month THEN COALESCE(driving_hours_month, 0) + v_hours ELSE driving_hours_month END,
    updated_at = now()
  WHERE id = v_sheet.driver_id;

  INSERT INTO public.driver_stats (driver_id, total_distance, total_deliveries, total_earnings, total_fuel, total_tolls, monthly_distance, monthly_deliveries, monthly_salary, monthly_net_profit, last_delivery_date)
  VALUES (
    v_sheet.driver_id, v_km, 1,
    COALESCE(v_sheet.driver_salary, v_sheet.revenue, 0),
    COALESCE(v_sheet.fuel_cost, 0),
    COALESCE(v_sheet.toll_cost, v_sheet.toll_cost_calc, 0),
    CASE WHEN v_is_month THEN v_km ELSE 0 END,
    CASE WHEN v_is_month THEN 1 ELSE 0 END,
    CASE WHEN v_is_month THEN COALESCE(v_sheet.driver_salary, 0) ELSE 0 END,
    CASE WHEN v_is_month THEN COALESCE(v_sheet.net_profit, 0) ELSE 0 END,
    COALESCE(v_sheet.date, CURRENT_DATE)
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    total_distance = driver_stats.total_distance + v_km,
    total_deliveries = driver_stats.total_deliveries + 1,
    total_earnings = driver_stats.total_earnings + COALESCE(v_sheet.driver_salary, v_sheet.revenue, 0),
    total_fuel = driver_stats.total_fuel + COALESCE(v_sheet.fuel_cost, 0),
    total_tolls = driver_stats.total_tolls + COALESCE(v_sheet.toll_cost, v_sheet.toll_cost_calc, 0),
    monthly_distance = CASE WHEN v_is_month THEN driver_stats.monthly_distance + v_km ELSE driver_stats.monthly_distance END,
    monthly_deliveries = CASE WHEN v_is_month THEN driver_stats.monthly_deliveries + 1 ELSE driver_stats.monthly_deliveries END,
    monthly_salary = CASE WHEN v_is_month THEN driver_stats.monthly_salary + COALESCE(v_sheet.driver_salary, 0) ELSE driver_stats.monthly_salary END,
    monthly_net_profit = CASE WHEN v_is_month THEN driver_stats.monthly_net_profit + COALESCE(v_sheet.net_profit, 0) ELSE driver_stats.monthly_net_profit END,
    last_delivery_date = COALESCE(v_sheet.date, driver_stats.last_delivery_date),
    updated_at = now();

  IF v_sheet.truck_id IS NOT NULL THEN
    UPDATE public.trucks SET
      mileage = COALESCE(mileage, 0) + v_km,
      updated_at = now()
    WHERE id = v_sheet.truck_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_operational_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    (NEW.status IN ('validated', 'approved') OR COALESCE(NEW.validated, false) = true)
    AND NOT (OLD.status IN ('validated', 'approved') OR COALESCE(OLD.validated, false) = true)
  ) THEN
    PERFORM public.sync_operational_stats_from_road_sheet(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS road_sheet_operational_stats_trigger ON public.road_sheets;
CREATE TRIGGER road_sheet_operational_stats_trigger
  AFTER UPDATE OF status, validated ON public.road_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_operational_stats();

-- ── Freight market minimum top-up ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.top_up_freight_market_min(p_min integer DEFAULT 8)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_created integer := 0;
  v_needed integer;
  v_route record;
BEGIN
  SELECT count(*)::integer INTO v_count
  FROM public.freight_offers
  WHERE status IN ('available', 'reserved') AND chain_id IS NULL;

  IF v_count >= p_min THEN
    RETURN jsonb_build_object('topped', false, 'available', v_count, 'created', 0);
  END IF;

  v_needed := LEAST(p_min - v_count, 5);

  FOR v_route IN
    SELECT * FROM (VALUES
      ('Paris', 'Lyon', 'Alimentaire', 465, 1850),
      ('Marseille', 'Barcelone', 'Conteneur', 520, 2100),
      ('Hambourg', 'Berlin', 'Pièces auto', 290, 980),
      ('Bruxelles', 'Amsterdam', 'Palettes', 210, 750),
      ('Milan', 'Zurich', 'Frigo', 280, 1200),
      ('Londres', 'Calais', 'Express', 120, 620),
      ('Francfort', 'Prague', 'ADR', 410, 1650),
      ('Bordeaux', 'Madrid', 'Vrac', 540, 1980)
    ) AS t(departure_city, arrival_city, cargo, distance_km, price)
    LIMIT v_needed
  LOOP
    INSERT INTO public.freight_offers (
      departure_city, arrival_city, cargo, distance_km, price,
      price_per_km, status, priority, expires_at, notes
    )
    VALUES (
      v_route.departure_city,
      v_route.arrival_city,
      v_route.cargo,
      v_route.distance_km,
      v_route.price,
      round((v_route.price / v_route.distance_km)::numeric, 4),
      'available',
      'normal',
      now() + interval '7 days',
      'Auto-généré — top-up marché fret'
    );
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('topped', true, 'available', v_count, 'created', v_created);
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_up_freight_market_min(integer) TO authenticated;

-- ── ERP backup snapshot log ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.erp_backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_backup_logs_created ON public.erp_backup_logs(created_at DESC);

ALTER TABLE public.erp_backup_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'erp_backup_logs' AND policyname = 'erp_backup_logs_admin'
  ) THEN
    CREATE POLICY "erp_backup_logs_admin" ON public.erp_backup_logs
      FOR ALL TO authenticated
      USING (public.is_erp_admin(auth.uid()))
      WITH CHECK (public.is_erp_admin(auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_erp_backup_snapshot(p_snapshot jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_erp_admin(auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO public.erp_backup_logs (actor_id, snapshot)
  VALUES (auth.uid(), COALESCE(p_snapshot, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_erp_backup_snapshot(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_operational_stats_from_road_sheet(uuid) TO authenticated;

COMMENT ON FUNCTION public.top_up_freight_market_min(integer) IS 'Génère des offres fret si le marché est sous le minimum.';
COMMENT ON TABLE public.erp_backup_logs IS 'Snapshots ERP périodiques (admin).';
