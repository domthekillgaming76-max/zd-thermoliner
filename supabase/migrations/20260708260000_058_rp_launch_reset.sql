-- 058 — Lancement RP officiel : reset économie + DOM76 admin/chauffeur dual role

-- ── DOM76 : profil chauffeur même si rôle admin/pdg ───────────────────────────

CREATE OR REPLACE FUNCTION public.should_sync_driver_profile(p_role text, p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.is_driver_profile_role(p_role)
    OR public.is_dom76_owner(p_email);
$$;

CREATE OR REPLACE FUNCTION public.ensure_driver_from_profile(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_driver_id uuid;
  v_name text;
  v_presence text;
  v_member_role text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR NOT public.should_sync_driver_profile(v_profile.role, v_profile.email) THEN
    RETURN NULL;
  END IF;

  v_name := COALESCE(
    NULLIF(TRIM(v_profile.pseudo), ''),
    NULLIF(TRIM(v_profile.full_name), ''),
    v_profile.email,
    'Chauffeur'
  );
  v_presence := public.resolve_driver_presence_status(v_profile.id);
  v_member_role := CASE
    WHEN public.is_dom76_owner(v_profile.email) THEN 'admin'
    ELSE 'driver'
  END;

  INSERT INTO public.drivers (
    user_id, name, pseudo, email, avatar_url, photo_url,
    role, member_role, status, presence_status, is_active_driver, joined_at, updated_at
  )
  VALUES (
    v_profile.id, v_name, v_profile.pseudo, v_profile.email,
    v_profile.avatar_url, COALESCE(v_profile.truck_photo_url, v_profile.avatar_url),
    'chauffeur', v_member_role, 'active', v_presence, true, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    pseudo = EXCLUDED.pseudo,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    photo_url = EXCLUDED.photo_url,
    member_role = EXCLUDED.member_role,
    role = 'chauffeur',
    is_active_driver = true,
    presence_status = EXCLUDED.presence_status,
    updated_at = now()
  RETURNING id INTO v_driver_id;

  -- Ensure driver_stats row exists
  INSERT INTO public.driver_stats (driver_id)
  VALUES (v_driver_id)
  ON CONFLICT (driver_id) DO NOTHING;

  RETURN v_driver_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_driver_on_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role IS DISTINCT FROM NEW.role)
       OR public.is_dom76_owner(NEW.email) THEN
      IF public.should_sync_driver_profile(NEW.role, NEW.email) THEN
        PERFORM public.ensure_driver_from_profile(NEW.id);
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF public.should_sync_driver_profile(NEW.role, NEW.email) THEN
      PERFORM public.ensure_driver_from_profile(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_driver_on_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_driver_on_profile_role
  AFTER INSERT OR UPDATE OF role, pseudo, full_name, avatar_url, truck_photo_url, email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_driver_on_profile_role_change();

-- Ensure DOM76 driver row now
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.profiles WHERE public.is_dom76_owner(email) LIMIT 1;
  IF v_id IS NOT NULL THEN
    PERFORM public.ensure_driver_from_profile(v_id);
  END IF;
END $$;

-- ── Extend admin_actions for RP reset ─────────────────────────────────────────

ALTER TABLE public.admin_actions DROP CONSTRAINT IF EXISTS admin_actions_action_type_check;
ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_action_type_check
  CHECK (action_type IN (
    'role_change', 'suspend', 'reactivate', 'delete_profile',
    'reset_theme', 'permission_grant', 'permission_revoke', 'promote', 'rp_reset'
  ));

-- ── RP economy reset (preserves accounts, profiles, modules, fleet structure) ─

CREATE OR REPLACE FUNCTION public.admin_reset_rp_economy(p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT public.is_erp_admin(v_actor) THEN
    RAISE EXCEPTION 'Accès refusé — administrateur requis';
  END IF;

  IF trim(coalesce(p_confirmation, '')) <> 'RESET RP' THEN
    RAISE EXCEPTION 'Confirmation invalide — saisissez exactement : RESET RP';
  END IF;

  -- GPS / tracking children
  DELETE FROM public.gps_positions WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('gps_positions', v_count);

  DELETE FROM public.route_progress WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('route_progress', v_count);

  DELETE FROM public.tracking_alerts WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('tracking_alerts', v_count);

  DELETE FROM public.delivery_tracking WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('delivery_tracking', v_count);

  -- Invoicing
  DELETE FROM public.payment_reminders WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('payment_reminders', v_count);

  IF to_regclass('public.invoice_lines') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.invoice_lines';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('invoice_lines', v_count);
  END IF;

  DELETE FROM public.invoices WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoices', v_count);

  -- Freight market
  IF to_regclass('public.freight_offer_assignments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_offer_assignments';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_offer_assignments', v_count);
  END IF;

  IF to_regclass('public.freight_offer_requests') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_offer_requests';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_offer_requests', v_count);
  END IF;

  IF to_regclass('public.freight_profitability') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_profitability';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_profitability', v_count);
  END IF;

  IF to_regclass('public.freight_offers') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_offers';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_offers', v_count);
  END IF;

  IF to_regclass('public.freight_chains') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_chains';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_chains', v_count);
  END IF;

  IF to_regclass('public.freight_cron_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_cron_logs';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_cron_logs', v_count);
  END IF;

  IF to_regclass('public.freight_market') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.freight_market';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('freight_market', v_count);
  END IF;

  IF to_regclass('public.live_convoys') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.live_convoys';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('live_convoys', v_count);
  END IF;

  -- Dispatch
  IF to_regclass('public.mission_assignments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.mission_assignments';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('mission_assignments', v_count);
  END IF;

  IF to_regclass('public.transport_missions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.transport_missions';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('transport_missions', v_count);
  END IF;

  -- Driver mobile / history
  IF to_regclass('public.delivery_proofs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.delivery_proofs';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('delivery_proofs', v_count);
  END IF;

  IF to_regclass('public.driver_status_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.driver_status_logs';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_status_logs', v_count);
  END IF;

  IF to_regclass('public.driver_assignment_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.driver_assignment_history';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_assignment_history', v_count);
  END IF;

  IF to_regclass('public.driver_incidents') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.driver_incidents';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_incidents', v_count);
  END IF;

  IF to_regclass('public.driver_salary_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.driver_salary_history';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_salary_history', v_count);
  END IF;

  IF to_regclass('public.driver_sanctions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.driver_sanctions';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('driver_sanctions', v_count);
  END IF;

  IF to_regclass('public.report_exports') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.report_exports';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('report_exports', v_count);
  END IF;

  -- Road sheets & deliveries
  DELETE FROM public.route_legs WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('route_legs', v_count);

  DELETE FROM public.road_sheets WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('road_sheets', v_count);

  DELETE FROM public.deliveries WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deliveries', v_count);

  -- Bank / finance history
  DELETE FROM public.transactions WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('transactions', v_count);

  DELETE FROM public.bank_statements WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('bank_statements', v_count);

  DELETE FROM public.company_expenses WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('company_expenses', v_count);

  DELETE FROM public.company_budget WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('company_budget', v_count);

  IF to_regclass('public.truck_costs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.truck_costs';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('truck_costs', v_count);
  END IF;

  IF to_regclass('public.garage_costs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.garage_costs';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('garage_costs', v_count);
  END IF;

  DELETE FROM public.monthly_rankings WHERE true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('monthly_rankings', v_count);

  -- Reset aggregates (keep rows)
  UPDATE public.company_bank_account
  SET balance = 0, updated_at = now();

  UPDATE public.drivers SET
    monthly_km = 0,
    total_km = 0,
    deliveries_count = 0,
    driving_hours_month = 0,
    eco_driving_score = 0,
    rest_hours_month = 0,
    driver_rating = 0,
    salary_base = 0,
    updated_at = now();

  UPDATE public.driver_stats SET
    total_distance = 0,
    total_deliveries = 0,
    total_earnings = 0,
    total_fuel = 0,
    total_tolls = 0,
    monthly_distance = 0,
    monthly_deliveries = 0,
    monthly_salary = 0,
    monthly_net_profit = 0,
    reputation = 0,
    last_delivery_date = NULL,
    updated_at = now();

  IF to_regclass('public.clients') IS NOT NULL THEN
    EXECUTE 'UPDATE public.clients SET total_revenue = 0 WHERE total_revenue IS NOT NULL AND total_revenue <> 0';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('clients_revenue_reset', v_count);
  END IF;

  -- Re-ensure DOM76 driver after reset
  PERFORM public.ensure_driver_from_profile(p.id)
  FROM public.profiles p
  WHERE public.is_dom76_owner(p.email);

  INSERT INTO public.admin_actions (admin_id, action_type, details)
  VALUES (v_actor, 'rp_reset', jsonb_build_object('deleted', v_deleted, 'confirmation', 'RESET RP'));

  INSERT INTO public.security_logs (actor_id, event_type, message, details)
  VALUES (
    v_actor,
    'rp_reset',
    'Réinitialisation RP officielle — économie et statistiques remises à zéro',
    jsonb_build_object('deleted', v_deleted)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Réinitialisation RP terminée',
    'deleted', v_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.should_sync_driver_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_rp_economy(text) TO authenticated;

COMMENT ON FUNCTION public.admin_reset_rp_economy(text) IS
  'Remet à zéro économie/stats RP. Requiert confirmation exacte RESET RP et rôle admin ERP.';
