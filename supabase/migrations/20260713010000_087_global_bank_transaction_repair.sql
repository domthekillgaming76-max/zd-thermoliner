-- 087 — Correctif global banque / transactions / Location Clovis
-- Toutes les écritures ci-dessous sont atomiques : le mouvement et le solde
-- sont validés ensemble, ou entièrement annulés en cas d'erreur.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.transactions ALTER COLUMN amount SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN date SET DEFAULT CURRENT_DATE;
ALTER TABLE public.transactions ALTER COLUMN status SET DEFAULT 'posted';

UPDATE public.transactions SET status = 'posted' WHERE status IS NULL;
UPDATE public.transactions SET source = CASE
  WHEN reference LIKE 'CLOVIS-%' THEN 'clovis_rental'
  WHEN road_sheet_id IS NOT NULL OR reference LIKE 'RS-%' THEN 'road_sheet'
  WHEN reference LIKE 'SAL-%' THEN 'salary'
  ELSE 'manual'
END
WHERE source IS NULL OR source = 'manual';

CREATE INDEX IF NOT EXISTS idx_transactions_bank_feed
  ON public.transactions(status, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference
  ON public.transactions(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source
  ON public.transactions(source, date DESC);

-- Les utilisateurs connectés autorisés à ouvrir les salons financiers doivent
-- pouvoir lire le journal complet. Les écritures métier passent par des RPC.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.company_bank_account ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cba_select" ON public.company_bank_account;
CREATE POLICY "cba_select" ON public.company_bank_account
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
SELECT 'Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0
WHERE NOT EXISTS (SELECT 1 FROM public.company_bank_account);

-- Point d'écriture commun pour tous les salons.
CREATE OR REPLACE FUNCTION public.post_company_transaction(
  p_type text,
  p_amount numeric,
  p_description text,
  p_category text DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE,
  p_reference text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_road_sheet_id uuid DEFAULT NULL,
  p_truck_id uuid DEFAULT NULL,
  p_garage_id uuid DEFAULT NULL,
  p_auto_generated boolean DEFAULT true,
  p_source text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_user_id, auth.uid());
  v_account public.company_bank_account%ROWTYPE;
  v_delta numeric(15,2);
  v_balance numeric(15,2);
  v_status text;
  v_tx public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  IF p_type NOT IN ('income','expense','salary','bonus','penalty','fuel','toll','maintenance','rent','insurance','tax','transfer') THEN
    RAISE EXCEPTION 'Type de transaction invalide: %', p_type;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à 0';
  END IF;

  SELECT * INTO v_account FROM public.company_bank_account ORDER BY updated_at NULLS LAST LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.company_bank_account (account_name, iban_rp, balance)
    VALUES ('Z&D Thermoliner', 'FR76 3000 2999 0000 0000 0000 000', 0)
    RETURNING * INTO v_account;
  END IF;

  v_status := CASE WHEN p_source = 'scheduled_transfer' THEN 'pending' ELSE 'posted' END;
  v_delta := CASE
    WHEN v_status = 'pending' THEN 0
    WHEN p_type IN ('income','bonus') THEN p_amount
    ELSE -p_amount
  END;
  v_balance := ROUND(COALESCE(v_account.balance, 0) + v_delta, 2);

  INSERT INTO public.transactions (
    user_id, driver_id, road_sheet_id, truck_id, garage_id, type, amount,
    description, category, date, auto_generated, created_by, reference,
    balance_after, status, source, metadata
  ) VALUES (
    v_actor, p_driver_id, p_road_sheet_id, p_truck_id, p_garage_id, p_type,
    ROUND(p_amount, 2), p_description, p_category, COALESCE(p_date, CURRENT_DATE),
    COALESCE(p_auto_generated, true), v_actor, p_reference, v_balance,
    v_status, COALESCE(NULLIF(p_source, ''), 'system'), COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING * INTO v_tx;

  UPDATE public.company_bank_account
  SET balance = v_balance, updated_at = now()
  WHERE id = v_account.id;

  RETURN v_tx;
END;
$$;

REVOKE ALL ON FUNCTION public.post_company_transaction(text,numeric,text,text,date,text,uuid,uuid,uuid,uuid,uuid,boolean,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_company_transaction(text,numeric,text,text,date,text,uuid,uuid,uuid,uuid,uuid,boolean,text,jsonb) TO authenticated, service_role;

-- Suppression atomique d'une écriture manuelle et contre-passation du solde.
CREATE OR REPLACE FUNCTION public.delete_manual_company_transaction(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_account public.company_bank_account%ROWTYPE;
  v_delta numeric(15,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction introuvable'; END IF;
  IF COALESCE(v_tx.auto_generated, false) OR COALESCE(v_tx.source, 'manual') <> 'manual' THEN
    RAISE EXCEPTION 'Une transaction automatique ne peut pas être supprimée';
  END IF;

  SELECT * INTO v_account FROM public.company_bank_account LIMIT 1 FOR UPDATE;
  v_delta := CASE WHEN v_tx.type IN ('income','bonus') THEN -v_tx.amount ELSE v_tx.amount END;
  DELETE FROM public.transactions WHERE id = v_tx.id;
  IF FOUND AND v_account.id IS NOT NULL THEN
    UPDATE public.company_bank_account
    SET balance = ROUND(COALESCE(balance, 0) + v_delta, 2), updated_at = now()
    WHERE id = v_account.id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_manual_company_transaction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_manual_company_transaction(uuid) TO authenticated;

-- Prélèvement Clovis : verrou, anti-doublon puis transaction + solde + charge.
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
  v_rental public.clovis_vehicle_rentals%ROWTYPE;
  v_existing public.clovis_rental_charges%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_holder text;
BEGIN
  SELECT * INTO v_rental FROM public.clovis_vehicle_rentals
  WHERE id = p_rental_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location Clovis introuvable'; END IF;

  SELECT * INTO v_existing FROM public.clovis_rental_charges
  WHERE rental_id = p_rental_id AND charge_date = p_charge_date;
  IF FOUND THEN RETURN v_existing.company_transaction_id; END IF;

  SELECT COALESCE(NULLIF(trim(pseudo), ''), NULLIF(trim(full_name), ''), 'Chauffeur')
  INTO v_holder FROM public.profiles WHERE id = p_profile_id;

  SELECT * INTO v_tx FROM public.post_company_transaction(
    'rent', p_amount, p_label || ' — Clovis Location (' || COALESCE(v_holder, 'Chauffeur') || ')',
    'Location véhicule', p_charge_date, p_reference, p_profile_id, p_driver_id,
    NULL, NULL, NULL, true, 'clovis_rental',
    jsonb_build_object('rental_id', p_rental_id, 'agency', 'Clovis Location')
  );

  INSERT INTO public.clovis_rental_charges (
    rental_id, profile_id, charge_date, amount, reference,
    driver_transaction_id, company_transaction_id
  ) VALUES (
    p_rental_id, p_profile_id, p_charge_date, p_amount, p_reference,
    NULL, v_tx.id
  );

  UPDATE public.clovis_vehicle_rentals
  SET total_charged = COALESCE(total_charged, 0) + p_amount,
      days_rented = COALESCE(days_rented, 0) + 1,
      last_charge_date = p_charge_date,
      updated_at = now()
  WHERE id = p_rental_id;

  RETURN v_tx.id;
END;
$$;

-- Répare les liens de prélèvements historiques lorsque la transaction existe.
UPDATE public.clovis_rental_charges c
SET company_transaction_id = t.id
FROM public.transactions t
WHERE c.company_transaction_id IS NULL
  AND c.reference IS NOT NULL
  AND t.reference = c.reference;

-- Recrée uniquement les lignes de journal réellement manquantes. Le solde n'est
-- pas modifié : ces charges historiques avaient déjà été prélevées par l'ancien RPC.
WITH missing AS (
  SELECT c.*, r.vehicle_label
  FROM public.clovis_rental_charges c
  JOIN public.clovis_vehicle_rentals r ON r.id = c.rental_id
  LEFT JOIN public.transactions t ON t.id = c.company_transaction_id OR t.reference = c.reference
  WHERE t.id IS NULL
), inserted AS (
  INSERT INTO public.transactions (
    user_id, driver_id, type, amount, description, category, date,
    auto_generated, created_by, reference, status, source, metadata
  )
  SELECT m.profile_id, r.driver_id, 'rent', m.amount,
    'Location Clovis — ' || COALESCE(m.vehicle_label, 'Véhicule') || ' (réparation historique)',
    'Location véhicule', m.charge_date, true, m.profile_id, m.reference,
    'posted', 'clovis_rental', jsonb_build_object('rental_id', m.rental_id, 'repaired', true)
  FROM missing m JOIN public.clovis_vehicle_rentals r ON r.id = m.rental_id
  RETURNING id, reference
)
UPDATE public.clovis_rental_charges c
SET company_transaction_id = i.id
FROM inserted i
WHERE c.reference = i.reference AND c.company_transaction_id IS NULL;

-- Publication temps réel explicite, sans erreur si les tables y figurent déjà.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions'
    ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'company_bank_account'
    ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.company_bank_account; END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
