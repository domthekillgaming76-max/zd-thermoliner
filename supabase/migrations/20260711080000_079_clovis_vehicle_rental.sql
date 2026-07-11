-- 079 — Agence de location véhicule Clovis (Renault T, 450 €/jour, prélèvement bancaire RP)

-- ── Catalogue véhicules Clovis ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clovis_rental_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL DEFAULT 'Clovis Location',
  label text NOT NULL,
  brand text NOT NULL DEFAULT 'Renault',
  model text NOT NULL DEFAULT 'T',
  variant text,
  description text,
  daily_rate numeric(12,2) NOT NULL DEFAULT 450 CHECK (daily_rate > 0),
  power_hp integer,
  fuel_type text DEFAULT 'Diesel',
  transmission text DEFAULT 'Optidriver',
  accent_color text DEFAULT '#f59e0b',
  badge text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clovis_catalog_enabled ON public.clovis_rental_catalog(enabled, sort_order);

-- ── Locations actives / historique ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clovis_vehicle_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.clovis_rental_catalog(id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'suspended')),
  daily_rate numeric(12,2) NOT NULL CHECK (daily_rate > 0),
  vehicle_label text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  last_charge_date date,
  total_charged numeric(15,2) NOT NULL DEFAULT 0,
  days_rented integer NOT NULL DEFAULT 0,
  contract_ref text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clovis_one_active_rental_per_driver
  ON public.clovis_vehicle_rentals(driver_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_clovis_rentals_profile ON public.clovis_vehicle_rentals(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_clovis_rentals_active ON public.clovis_vehicle_rentals(status, last_charge_date)
  WHERE status = 'active';

-- ── Journal des prélèvements ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clovis_rental_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES public.clovis_vehicle_rentals(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  charge_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reference text NOT NULL,
  driver_transaction_id uuid REFERENCES public.driver_bank_transactions(id) ON DELETE SET NULL,
  company_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, charge_date)
);

CREATE INDEX IF NOT EXISTS idx_clovis_charges_rental ON public.clovis_rental_charges(rental_id, charge_date DESC);

-- ── Type transaction bancaire chauffeur : location ───────────────────────────
ALTER TABLE public.driver_bank_transactions DROP CONSTRAINT IF EXISTS driver_bank_transactions_type_check;
ALTER TABLE public.driver_bank_transactions ADD CONSTRAINT driver_bank_transactions_type_check
  CHECK (type IN (
    'salary', 'bonus', 'refund', 'advance', 'sanction', 'manual_transfer', 'admin_correction', 'other', 'rental'
  ));

-- ── Prélèvement interne (débit chauffeur → crédit entreprise) ─────────────────
CREATE OR REPLACE FUNCTION public._clovis_charge_rental_day(
  p_rental_id uuid,
  p_profile_id uuid,
  p_driver_id uuid,
  p_amount numeric,
  p_label text,
  p_reference text,
  p_charge_date date DEFAULT CURRENT_DATE
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_account public.driver_bank_accounts%ROWTYPE;
  v_company public.company_bank_account%ROWTYPE;
  v_driver_tx_id uuid;
  v_company_tx_id uuid;
  v_new_driver_balance numeric(15,2);
  v_new_company_balance numeric(15,2);
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant de location invalide';
  END IF;

  SELECT * INTO v_driver_account FROM public.driver_bank_accounts
  WHERE profile_id = p_profile_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte bancaire chauffeur introuvable — ouvrez votre compte RP dans Profil';
  END IF;

  SELECT * INTO v_company FROM public.company_bank_account LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0)
    RETURNING * INTO v_company;
  END IF;

  v_new_driver_balance := GREATEST(0, v_driver_account.balance - p_amount);
  v_new_company_balance := v_company.balance + p_amount;

  INSERT INTO public.transactions (
    user_id, driver_id, type, amount, description, category, date,
    auto_generated, created_by, reference, status
  ) VALUES (
    p_profile_id,
    p_driver_id,
    'rent',
    p_amount,
    p_label || ' — Clovis Location',
    'Location véhicule',
    p_charge_date,
    true,
    p_profile_id,
    p_reference,
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
    'rental',
    'debit',
    p_amount,
    v_new_driver_balance,
    p_label,
    p_reference,
    jsonb_build_object(
      'rental_id', p_rental_id,
      'company_transaction_id', v_company_tx_id,
      'agency', 'Clovis Location',
      'charge_date', p_charge_date
    ),
    p_profile_id
  )
  RETURNING id INTO v_driver_tx_id;

  INSERT INTO public.clovis_rental_charges (
    rental_id, profile_id, charge_date, amount, reference,
    driver_transaction_id, company_transaction_id
  ) VALUES (
    p_rental_id, p_profile_id, p_charge_date, p_amount, p_reference,
    v_driver_tx_id, v_company_tx_id
  )
  ON CONFLICT (rental_id, charge_date) DO NOTHING;

  UPDATE public.driver_bank_accounts
  SET balance = v_new_driver_balance, updated_at = now()
  WHERE id = v_driver_account.id;

  UPDATE public.clovis_vehicle_rentals
  SET
    total_charged = total_charged + p_amount,
    days_rented = days_rented + 1,
    last_charge_date = p_charge_date,
    updated_at = now()
  WHERE id = p_rental_id;

  RETURN v_driver_tx_id;
END;
$$;

-- ── Démarrer une location ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_clovis_rental(p_catalog_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_driver public.drivers%ROWTYPE;
  v_catalog public.clovis_rental_catalog%ROWTYPE;
  v_rental_id uuid;
  v_ref text;
  v_label text;
  v_today date := CURRENT_DATE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE user_id = v_user AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil chauffeur actif requis pour louer un véhicule Clovis';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clovis_vehicle_rentals
    WHERE driver_id = v_driver.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà un véhicule Clovis en location — restituez-le avant d''en louer un autre';
  END IF;

  SELECT * INTO v_catalog FROM public.clovis_rental_catalog
  WHERE id = p_catalog_id AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Véhicule indisponible à la location';
  END IF;

  PERFORM public.ensure_driver_bank_account(v_driver.id, v_user);

  v_ref := 'CLOVIS-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  v_label := 'Location Clovis — ' || v_catalog.label || ' (jour 1)';

  INSERT INTO public.clovis_vehicle_rentals (
    catalog_id, profile_id, driver_id, status, daily_rate, vehicle_label,
    contract_ref, last_charge_date, total_charged, days_rented
  ) VALUES (
    v_catalog.id, v_user, v_driver.id, 'active', v_catalog.daily_rate,
    v_catalog.label, v_ref, NULL, 0, 0
  )
  RETURNING id INTO v_rental_id;

  PERFORM public._clovis_charge_rental_day(
    v_rental_id, v_user, v_driver.id, v_catalog.daily_rate, v_label, v_ref || '-D1', v_today
  );

  RETURN jsonb_build_object(
    'ok', true,
    'rental_id', v_rental_id,
    'contract_ref', v_ref,
    'daily_rate', v_catalog.daily_rate,
    'vehicle_label', v_catalog.label,
    'message', 'Location Clovis activée — prélèvement journalier de ' || v_catalog.daily_rate || ' €'
  );
END;
$$;

-- ── Restituer le véhicule ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.return_clovis_rental(p_rental_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rental public.clovis_vehicle_rentals%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  IF p_rental_id IS NOT NULL THEN
    SELECT * INTO v_rental FROM public.clovis_vehicle_rentals WHERE id = p_rental_id;
  ELSE
    SELECT r.* INTO v_rental
    FROM public.clovis_vehicle_rentals r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE d.user_id = v_user AND r.status = 'active'
    ORDER BY r.started_at DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune location active trouvée';
  END IF;

  IF v_rental.status <> 'active' THEN
    RAISE EXCEPTION 'Cette location n''est plus active';
  END IF;

  IF v_rental.profile_id <> v_user AND NOT public.is_erp_admin(v_user) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE public.clovis_vehicle_rentals
  SET status = 'returned', returned_at = now(), updated_at = now()
  WHERE id = v_rental.id;

  RETURN jsonb_build_object(
    'ok', true,
    'rental_id', v_rental.id,
    'total_charged', v_rental.total_charged,
    'days_rented', v_rental.days_rented,
    'message', 'Véhicule restitué à l''agence Clovis — les prélèvements journaliers sont arrêtés'
  );
END;
$$;

-- ── Prélèvements journaliers (cron) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_daily_clovis_rental_charges(
  p_charge_date date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_ref text;
  v_label text;
  v_day_num integer;
BEGIN
  FOR rec IN
    SELECT r.*, c.label AS catalog_label
    FROM public.clovis_vehicle_rentals r
    JOIN public.clovis_rental_catalog c ON c.id = r.catalog_id
    WHERE r.status = 'active'
      AND (r.last_charge_date IS NULL OR r.last_charge_date < p_charge_date)
  LOOP
    BEGIN
      v_day_num := rec.days_rented + 1;
      v_ref := rec.contract_ref || '-D' || v_day_num;
      v_label := 'Location Clovis — ' || rec.vehicle_label || ' (jour ' || v_day_num || ')';

      PERFORM public._clovis_charge_rental_day(
        rec.id, rec.profile_id, rec.driver_id, rec.daily_rate,
        v_label, v_ref, p_charge_date
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'rental_id', rec.id,
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_errors) = 0,
    'charged', v_count,
    'charge_date', p_charge_date,
    'errors', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_clovis_rental(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_clovis_rental(uuid) TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clovis_rental_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clovis_vehicle_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clovis_rental_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clovis_catalog_select" ON public.clovis_rental_catalog;
CREATE POLICY "clovis_catalog_select" ON public.clovis_rental_catalog
  FOR SELECT TO authenticated USING (enabled = true OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "clovis_catalog_admin" ON public.clovis_rental_catalog;
CREATE POLICY "clovis_catalog_admin" ON public.clovis_rental_catalog
  FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid()))
  WITH CHECK (public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "clovis_rentals_select" ON public.clovis_vehicle_rentals;
CREATE POLICY "clovis_rentals_select" ON public.clovis_vehicle_rentals
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "clovis_charges_select" ON public.clovis_rental_charges;
CREATE POLICY "clovis_charges_select" ON public.clovis_rental_charges
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()));

-- ── Catalogue Renault T Clovis (450 €/jour) ──────────────────────────────────
INSERT INTO public.clovis_rental_catalog (
  label, variant, description, daily_rate, power_hp, fuel_type, transmission,
  accent_color, badge, sort_order
)
SELECT * FROM (VALUES
(
  'Renault T High',
  'High Cab',
  'Cabine haute confort — idéal longue distance thermique. Sellerie cuir, climatisation bi-zone.',
  450, 520, 'Diesel', 'Optidriver 12 vitesses',
  '#3b82f6', 'Best-seller', 10
),
(
  'Renault T Evolution',
  'Evolution',
  'Version évolutive du T — moteur DTI 13, consommation optimisée, look contemporain Clovis.',
  450, 480, 'Diesel', 'Optidriver',
  '#ef4444', 'Nouveauté', 20
),
(
  'Renault T Optifuel',
  'Optifuel',
  'Pack économie carburant — parfait pour les tournées frigo régionales Z&D.',
  450, 460, 'Diesel', 'Optidriver Eco',
  '#22c55e', 'Éco+', 30
),
(
  'Renault T Racing Edition',
  'Racing Edition',
  'Édition limitée Clovis — striping racing, jantes alu, 520 ch. Pour les convois premium.',
  450, 520, 'Diesel', 'Optidriver Sport',
  '#f97316', 'Édition RP', 40
),
(
  'Renault T Crystal',
  'Crystal Line',
  'Finition Crystal — chromes, éclairage LED, cabine premium. Le fleuron de l''agence Clovis.',
  450, 500, 'Diesel', 'Optidriver',
  '#06b6d4', 'Premium', 50
)) AS v(label, variant, description, daily_rate, power_hp, fuel_type, transmission, accent_color, badge, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.clovis_rental_catalog LIMIT 1);

-- ── Salon ERP ────────────────────────────────────────────────────────────────
INSERT INTO public.room_permissions (
  room_key, room_name, description, category, icon, color, route,
  sort_order, enabled, visible_to_roles, admin_critical
) VALUES (
  'clovis_rental',
  'Location Clovis',
  'Agence de location véhicule Renault T — 450 €/jour',
  'ERP',
  'KeyRound',
  '#f59e0b',
  '/clovis-rental',
  55,
  true,
  ARRAY['chauffeur', 'admin'],
  false
)
ON CONFLICT (room_key) DO UPDATE SET
  room_name = EXCLUDED.room_name,
  description = EXCLUDED.description,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  visible_to_roles = EXCLUDED.visible_to_roles,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

INSERT INTO public.app_modules (key, label, category, icon, route, enabled, sort_order, allowed_roles, admin_only)
VALUES (
  'clovis_rental', 'Location Clovis', 'ERP', 'KeyRound', '/clovis-rental', true, 55,
  ARRAY['chauffeur', 'admin'], false
)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  allowed_roles = EXCLUDED.allowed_roles,
  admin_only = EXCLUDED.admin_only,
  icon = EXCLUDED.icon;

COMMENT ON TABLE public.clovis_rental_catalog IS 'Catalogue véhicules agence Clovis Location RP';
COMMENT ON TABLE public.clovis_vehicle_rentals IS 'Locations actives et historique Clovis';
COMMENT ON TABLE public.clovis_rental_charges IS 'Journal prélèvements journaliers location Clovis';
