-- 059 — Reset statistiques RP étendu (flotte, notifications, mur optionnel)

CREATE OR REPLACE FUNCTION public.admin_reset_rp_economy(
  p_confirmation text,
  p_delete_wall_posts boolean DEFAULT false,
  p_delete_notifications boolean DEFAULT true
)
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

  -- Notifications de test
  IF p_delete_notifications AND to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.notifications';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('notifications', v_count);
  END IF;

  -- Mur société (optionnel — cascade comments/reactions/polls)
  IF p_delete_wall_posts AND to_regclass('public.wall_posts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.wall_posts';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('wall_posts', v_count);
  END IF;

  -- GPS / tracking
  IF to_regclass('public.gps_positions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.gps_positions';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('gps_positions', v_count);
  END IF;

  IF to_regclass('public.route_progress') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.route_progress';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('route_progress', v_count);
  END IF;

  IF to_regclass('public.tracking_alerts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.tracking_alerts';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('tracking_alerts', v_count);
  END IF;

  IF to_regclass('public.delivery_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.delivery_tracking';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('delivery_tracking', v_count);
  END IF;

  -- Invoicing
  IF to_regclass('public.payment_reminders') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payment_reminders';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('payment_reminders', v_count);
  END IF;

  IF to_regclass('public.invoice_lines') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.invoice_lines';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('invoice_lines', v_count);
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.invoices';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('invoices', v_count);
  END IF;

  -- Marché du fret
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

  -- Dispatch / missions
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

  -- Chauffeur mobile / historique
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

  -- Feuilles de route
  IF to_regclass('public.route_legs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.route_legs';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('route_legs', v_count);
  END IF;

  IF to_regclass('public.road_sheets') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.road_sheets';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('road_sheets', v_count);
  END IF;

  IF to_regclass('public.deliveries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.deliveries';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('deliveries', v_count);
  END IF;

  -- Banque / finance
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.transactions';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('transactions', v_count);
  END IF;

  IF to_regclass('public.bank_statements') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.bank_statements';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('bank_statements', v_count);
  END IF;

  IF to_regclass('public.company_expenses') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.company_expenses';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('company_expenses', v_count);
  END IF;

  IF to_regclass('public.company_budget') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.company_budget';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('company_budget', v_count);
  END IF;

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

  IF to_regclass('public.monthly_rankings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.monthly_rankings';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('monthly_rankings', v_count);
  END IF;

  -- Flotte : historique maintenance & affectations (conserver camions/remorques)
  IF to_regclass('public.fleet_maintenance') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.fleet_maintenance';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('fleet_maintenance', v_count);
  END IF;

  IF to_regclass('public.truck_assignments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.truck_assignments';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('truck_assignments', v_count);
  END IF;

  IF to_regclass('public.fleet_loans') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.fleet_loans';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('fleet_loans', v_count);
  END IF;

  -- Agrégats entreprise
  IF to_regclass('public.company_bank_account') IS NOT NULL THEN
    EXECUTE 'UPDATE public.company_bank_account SET balance = 0, updated_at = now()';
  END IF;

  IF to_regclass('public.drivers') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.drivers SET
        monthly_km = 0,
        total_km = 0,
        deliveries_count = 0,
        driving_hours_month = 0,
        eco_driving_score = 0,
        rest_hours_month = 0,
        driver_rating = 0,
        salary_base = 0,
        updated_at = now()
    $sql$;
  END IF;

  IF to_regclass('public.driver_stats') IS NOT NULL THEN
    EXECUTE $sql$
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
        updated_at = now()
    $sql$;
  END IF;

  IF to_regclass('public.trucks') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.trucks SET
        mileage = 0,
        updated_at = now()
      WHERE mileage IS NOT NULL AND mileage <> 0
    $sql$;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('trucks_mileage_reset', v_count);
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    EXECUTE 'UPDATE public.clients SET total_revenue = 0 WHERE total_revenue IS NOT NULL AND total_revenue <> 0';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('clients_revenue_reset', v_count);
  END IF;

  -- DOM76 chauffeur après reset
  PERFORM public.ensure_driver_from_profile(p.id)
  FROM public.profiles p
  WHERE public.is_dom76_owner(p.email);

  INSERT INTO public.admin_actions (admin_id, action_type, details)
  VALUES (
    v_actor,
    'rp_reset',
    jsonb_build_object(
      'deleted', v_deleted,
      'confirmation', 'RESET RP',
      'delete_wall_posts', p_delete_wall_posts,
      'delete_notifications', p_delete_notifications
    )
  );

  INSERT INTO public.security_logs (actor_id, event_type, message, details)
  VALUES (
    v_actor,
    'rp_reset',
    'Réinitialisation statistiques RP — lancement officiel',
    jsonb_build_object(
      'deleted', v_deleted,
      'delete_wall_posts', p_delete_wall_posts,
      'delete_notifications', p_delete_notifications
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Statistiques RP réinitialisées — tableau de bord prêt pour le lancement officiel',
    'deleted', v_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_rp_economy(text, boolean, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_reset_rp_economy(text, boolean, boolean) IS
  'Reset complet stats RP : entreprise, chauffeurs, flotte, fret, FDR. Mur optionnel. Confirmation RESET RP requise.';
