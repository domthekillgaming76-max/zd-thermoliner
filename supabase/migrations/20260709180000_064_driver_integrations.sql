-- 064 — Intégrations chauffeurs (TrucksBook, WoT, TruckersMP, Discord)

-- ── Intégrations chauffeur ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('trucksbook', 'world_of_trucks', 'truckersmp', 'discord')),
  external_user_id text,
  external_username text,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'pending', 'error')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_driver_integrations_profile ON public.driver_integrations(profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_integrations_provider ON public.driver_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_driver_integrations_status ON public.driver_integrations(status);

-- ── Livraisons externes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.external_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.driver_integrations(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('trucksbook', 'world_of_trucks', 'truckersmp', 'discord', 'manual')),
  external_delivery_id text NOT NULL,
  departure_city text,
  arrival_city text,
  cargo text,
  distance_km numeric(12,2) NOT NULL DEFAULT 0,
  income numeric(12,2) NOT NULL DEFAULT 0,
  fuel_used numeric(12,2) NOT NULL DEFAULT 0,
  damage_percent numeric(5,2) NOT NULL DEFAULT 0,
  truck_name text,
  trailer_name text,
  started_at timestamptz,
  completed_at timestamptz,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processed', 'error', 'skipped')),
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  salary_credited boolean NOT NULL DEFAULT false,
  salary_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, provider, external_delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_external_deliveries_profile ON public.external_deliveries(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_deliveries_integration ON public.external_deliveries(integration_id);
CREATE INDEX IF NOT EXISTS idx_external_deliveries_sync ON public.external_deliveries(sync_status);
CREATE INDEX IF NOT EXISTS idx_external_deliveries_road_sheet ON public.external_deliveries(road_sheet_id);

ALTER TABLE public.road_sheets
  ADD COLUMN IF NOT EXISTS external_delivery_id uuid REFERENCES public.external_deliveries(id) ON DELETE SET NULL;

-- ── Logs synchronisation ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  integration_id uuid REFERENCES public.driver_integrations(id) ON DELETE SET NULL,
  provider text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'partial', 'skipped')),
  message text,
  deliveries_imported integer NOT NULL DEFAULT 0,
  deliveries_skipped integer NOT NULL DEFAULT 0,
  raw_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_profile ON public.integration_sync_logs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_created ON public.integration_sync_logs(created_at DESC);

-- ── Vue publique sans tokens ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.driver_integrations_public AS
SELECT
  id, profile_id, provider, external_user_id, external_username,
  status, metadata, last_sync_at, last_error, created_at, updated_at
FROM public.driver_integrations;

GRANT SELECT ON public.driver_integrations_public TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.driver_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_integrations_select" ON public.driver_integrations;
CREATE POLICY "driver_integrations_select" ON public.driver_integrations
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "driver_integrations_insert" ON public.driver_integrations;
CREATE POLICY "driver_integrations_insert" ON public.driver_integrations
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "driver_integrations_update" ON public.driver_integrations;
CREATE POLICY "driver_integrations_update" ON public.driver_integrations
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "driver_integrations_delete" ON public.driver_integrations;
CREATE POLICY "driver_integrations_delete" ON public.driver_integrations
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "external_deliveries_select" ON public.external_deliveries;
CREATE POLICY "external_deliveries_select" ON public.external_deliveries
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "external_deliveries_insert" ON public.external_deliveries;
CREATE POLICY "external_deliveries_insert" ON public.external_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "external_deliveries_update" ON public.external_deliveries;
CREATE POLICY "external_deliveries_update" ON public.external_deliveries
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "integration_sync_logs_select" ON public.integration_sync_logs;
CREATE POLICY "integration_sync_logs_select" ON public.integration_sync_logs
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_erp_admin(auth.uid())
    OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "integration_sync_logs_insert" ON public.integration_sync_logs;
CREATE POLICY "integration_sync_logs_insert" ON public.integration_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── RPC connect / disconnect ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_driver_integration(
  p_provider text,
  p_external_user_id text DEFAULT NULL,
  p_external_username text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  INSERT INTO public.driver_integrations (
    profile_id, provider, external_user_id, external_username,
    status, metadata, updated_at
  ) VALUES (
    v_profile_id,
    p_provider,
    NULLIF(trim(p_external_user_id), ''),
    NULLIF(trim(p_external_username), ''),
    'connected',
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  )
  ON CONFLICT (profile_id, provider) DO UPDATE SET
    external_user_id = EXCLUDED.external_user_id,
    external_username = EXCLUDED.external_username,
    status = 'connected',
    metadata = driver_integrations.metadata || EXCLUDED.metadata,
    last_error = NULL,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.disconnect_driver_integration(p_integration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  UPDATE public.driver_integrations
  SET
    status = 'disconnected',
    access_token_encrypted = NULL,
    refresh_token_encrypted = NULL,
    updated_at = now()
  WHERE id = p_integration_id
    AND (
      profile_id = v_profile_id
      OR public.is_erp_admin(v_profile_id)
      OR public.is_dom76_owner((SELECT email FROM public.profiles WHERE id = v_profile_id))
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intégration introuvable';
  END IF;
END;
$$;

-- ── RPC crédit salaire intégration (sans auth admin) ─────────────────────────
CREATE OR REPLACE FUNCTION public.integration_credit_driver_salary(
  p_profile_id uuid,
  p_amount numeric,
  p_delivery_id uuid,
  p_reason text DEFAULT 'Salaire livraison intégration'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.external_deliveries%ROWTYPE;
  v_driver_account public.driver_bank_accounts%ROWTYPE;
  v_company public.company_bank_account%ROWTYPE;
  v_ref text;
  v_new_driver_balance numeric(15,2);
  v_new_company_balance numeric(15,2);
  v_driver_tx_id uuid;
  v_company_tx_id uuid;
  v_system_actor uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Montant invalide');
  END IF;

  SELECT * INTO v_delivery FROM public.external_deliveries WHERE id = p_delivery_id;
  IF NOT FOUND OR v_delivery.profile_id <> p_profile_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Livraison introuvable');
  END IF;

  IF v_delivery.salary_credited THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  SELECT id INTO v_system_actor FROM public.profiles
  WHERE public.is_dom76_owner(email) OR role IN ('pdg', 'admin')
  ORDER BY CASE WHEN public.is_dom76_owner(email) THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT * INTO v_driver_account FROM public.driver_bank_accounts
  WHERE profile_id = p_profile_id AND status = 'active';
  IF NOT FOUND THEN
    PERFORM public.ensure_driver_bank_account(
      (SELECT id FROM public.drivers WHERE user_id = p_profile_id LIMIT 1),
      p_profile_id
    );
    SELECT * INTO v_driver_account FROM public.driver_bank_accounts
    WHERE profile_id = p_profile_id AND status = 'active';
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Compte bancaire chauffeur introuvable');
  END IF;

  SELECT * INTO v_company FROM public.company_bank_account LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0)
    RETURNING * INTO v_company;
  END IF;

  IF v_company.balance < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solde entreprise insuffisant');
  END IF;

  v_ref := 'INT-' || upper(substring(replace(p_delivery_id::text, '-', '') from 1 for 8));
  v_new_driver_balance := v_driver_account.balance + p_amount;
  v_new_company_balance := v_company.balance - p_amount;

  INSERT INTO public.transactions (
    user_id, driver_id, type, amount, description, category, date,
    auto_generated, created_by, reference, status
  ) VALUES (
    v_system_actor,
    v_driver_account.driver_id,
    'salary',
    p_amount,
    p_reason || ' — ' || v_driver_account.holder_name,
    'Salaires',
    CURRENT_DATE,
    true,
    v_system_actor,
    v_ref,
    'posted'
  )
  RETURNING id INTO v_company_tx_id;

  UPDATE public.company_bank_account
  SET balance = v_new_company_balance, updated_at = now()
  WHERE id = v_company.id;

  INSERT INTO public.driver_bank_transactions (
    account_id, profile_id, type, direction, amount, balance_after,
    label, reference, metadata, created_by
  ) VALUES (
    v_driver_account.id,
    p_profile_id,
    'salary',
    'credit',
    p_amount,
    v_new_driver_balance,
    p_reason,
    v_ref,
    jsonb_build_object('external_delivery_id', p_delivery_id),
    v_system_actor
  )
  RETURNING id INTO v_driver_tx_id;

  UPDATE public.driver_bank_accounts
  SET balance = v_new_driver_balance, updated_at = now()
  WHERE id = v_driver_account.id;

  UPDATE public.external_deliveries
  SET salary_credited = true, salary_amount = p_amount
  WHERE id = p_delivery_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reference', v_ref,
    'driver_transaction_id', v_driver_tx_id,
    'company_transaction_id', v_company_tx_id,
    'amount', p_amount
  );
END;
$$;

-- ── RPC feuille de route depuis livraison externe ────────────────────────────
CREATE OR REPLACE FUNCTION public.create_integration_road_sheet(p_delivery_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.external_deliveries%ROWTYPE;
  v_driver public.drivers%ROWTYPE;
  v_sheet_id uuid;
  v_km numeric(12,2);
  v_revenue numeric(12,2);
  v_date date;
  v_system_actor uuid;
BEGIN
  SELECT * INTO v_delivery FROM public.external_deliveries WHERE id = p_delivery_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Livraison externe introuvable';
  END IF;

  IF v_delivery.road_sheet_id IS NOT NULL THEN
    RETURN v_delivery.road_sheet_id;
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE user_id = v_delivery.profile_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil chauffeur introuvable';
  END IF;

  SELECT id INTO v_system_actor FROM public.profiles
  WHERE public.is_dom76_owner(email) OR role IN ('pdg', 'admin')
  ORDER BY CASE WHEN public.is_dom76_owner(email) THEN 0 ELSE 1 END
  LIMIT 1;

  v_km := GREATEST(0, COALESCE(v_delivery.distance_km, 0));
  v_revenue := GREATEST(0, COALESCE(v_delivery.income, 0));
  v_date := COALESCE(v_delivery.completed_at, v_delivery.started_at, now())::date;

  INSERT INTO public.road_sheets (
    driver_id, driver_user_id, driver_name,
    departure, arrival, departure_city, arrival_city,
    cargo, cargo_type, km, total_distance,
    price_per_km, revenue, fuel_cost, toll_cost,
    validated, status, approved_by, approved_at,
    date, notes, external_delivery_id
  ) VALUES (
    v_driver.id,
    v_delivery.profile_id,
    COALESCE(v_driver.name, 'Chauffeur'),
    v_delivery.departure_city,
    v_delivery.arrival_city,
    v_delivery.departure_city,
    v_delivery.arrival_city,
    v_delivery.cargo,
    v_delivery.cargo,
    v_km,
    v_km,
    CASE WHEN v_km > 0 THEN ROUND(v_revenue / v_km, 4) ELSE 0 END,
    v_revenue,
    COALESCE(v_delivery.fuel_used, 0) * 1.85,
    0,
    true,
    'validated',
    v_system_actor,
    now(),
    v_date,
    'Import intégration ' || v_delivery.provider || ' — ' || COALESCE(v_delivery.truck_name, ''),
    p_delivery_id
  )
  RETURNING id INTO v_sheet_id;

  UPDATE public.external_deliveries
  SET road_sheet_id = v_sheet_id, sync_status = 'processed'
  WHERE id = p_delivery_id;

  RETURN v_sheet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_driver_integration(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_driver_integration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.integration_credit_driver_salary(uuid, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_integration_road_sheet(uuid) TO authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_integrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.external_deliveries;

-- ── Modules navigation ───────────────────────────────────────────────────────
INSERT INTO public.app_modules (key, label, category, icon, route, enabled, sort_order, allowed_roles, admin_only)
VALUES
  (
    'driver_integrations',
    'Mes intégrations',
    'Compte',
    'Plug',
    '/integrations',
    true,
    15,
    ARRAY['driver', 'chauffeur', 'member', 'tractionnaire', 'dispatcher', 'admin', 'pdg', 'patron'],
    false
  ),
  (
    'admin_integrations',
    'Intégrations',
    'Administration',
    'Plug',
    '/administration/integrations',
    true,
    15,
    ARRAY['admin', 'pdg', 'patron'],
    true
  )
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  route = EXCLUDED.route,
  enabled = EXCLUDED.enabled,
  allowed_roles = EXCLUDED.allowed_roles,
  admin_only = EXCLUDED.admin_only;
