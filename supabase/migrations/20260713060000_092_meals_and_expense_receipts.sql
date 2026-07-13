-- 092 — Tickets de caisse Banque entreprise + salon Repas chauffeur.

-- Supprime définitivement les données de financement flotte devenues inutiles.
DROP TABLE IF EXISTS public.fleet_loans CASCADE;

-- ── Tickets des dépenses entreprise ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.company_expense_receipt_seq START 1;

CREATE TABLE IF NOT EXISTS public.company_expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  merchant_name text NOT NULL DEFAULT 'Z&D Thermoliner',
  description text NOT NULL,
  category text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.company_expense_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_expense_receipts_admin" ON public.company_expense_receipts;
CREATE POLICY "company_expense_receipts_admin" ON public.company_expense_receipts
  FOR SELECT TO authenticated USING (public.is_erp_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.prepare_company_expense_receipt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_number text;
BEGIN
  IF NEW.type IN (
    'expense', 'salary', 'penalty', 'fuel', 'toll',
    'maintenance', 'rent', 'insurance', 'tax'
  ) AND COALESCE(NEW.status, 'posted') = 'posted' THEN
    v_number := COALESCE(
      NULLIF(NEW.metadata->>'receipt_number', ''),
      'DEP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.company_expense_receipt_seq')::text, 6, '0')
    );
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('receipt_number', v_number);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_company_expense_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IN (
    'expense', 'salary', 'penalty', 'fuel', 'toll',
    'maintenance', 'rent', 'insurance', 'tax'
  ) AND COALESCE(NEW.status, 'posted') = 'posted' THEN
    INSERT INTO public.company_expense_receipts (
      transaction_id, receipt_number, merchant_name, description,
      category, amount, issued_at, metadata
    ) VALUES (
      NEW.id,
      COALESCE(NEW.metadata->>'receipt_number', NEW.reference, 'DEP-' || upper(left(NEW.id::text, 8))),
      COALESCE(NULLIF(NEW.metadata->>'merchant_name', ''), 'Z&D Thermoliner'),
      COALESCE(NULLIF(NEW.description, ''), NEW.type),
      NEW.category,
      NEW.amount,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.metadata, '{}'::jsonb)
    ) ON CONFLICT (transaction_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_company_expense_receipt_trigger ON public.transactions;
CREATE TRIGGER prepare_company_expense_receipt_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.prepare_company_expense_receipt();

DROP TRIGGER IF EXISTS store_company_expense_receipt_trigger ON public.transactions;
CREATE TRIGGER store_company_expense_receipt_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.store_company_expense_receipt();

REVOKE ALL ON FUNCTION public.prepare_company_expense_receipt() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_company_expense_receipt() FROM PUBLIC;

-- ── Restaurants et tickets repas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('meal','formula','drink','dessert','snack')),
  price numeric(10,2) NOT NULL CHECK (price > 0),
  emoji text NOT NULL DEFAULT '🍽️',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant, name)
);

CREATE SEQUENCE IF NOT EXISTS public.meal_receipt_seq START 1;

CREATE TABLE IF NOT EXISTS public.meal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_account_id uuid NOT NULL REFERENCES public.driver_bank_accounts(id) ON DELETE RESTRICT,
  driver_transaction_id uuid REFERENCES public.driver_bank_transactions(id) ON DELETE SET NULL,
  restaurant text NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(15,2) NOT NULL CHECK (total_amount > 0),
  balance_after numeric(15,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'Carte chauffeur',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_orders_profile ON public.meal_orders(profile_id, created_at DESC);

ALTER TABLE public.meal_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_catalog_read" ON public.meal_catalog;
CREATE POLICY "meal_catalog_read" ON public.meal_catalog FOR SELECT TO authenticated USING (enabled = true OR public.is_erp_admin(auth.uid()));
DROP POLICY IF EXISTS "meal_catalog_admin" ON public.meal_catalog;
CREATE POLICY "meal_catalog_admin" ON public.meal_catalog FOR ALL TO authenticated
  USING (public.is_erp_admin(auth.uid())) WITH CHECK (public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "meal_orders_read" ON public.meal_orders;
CREATE POLICY "meal_orders_read" ON public.meal_orders FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()));

INSERT INTO public.meal_catalog (restaurant, name, description, category, price, emoji, sort_order) VALUES
  ('Relais du Routier', 'Steak-frites', 'Steak grillé, frites maison et salade', 'meal', 14.90, '🥩', 10),
  ('Relais du Routier', 'Poulet rôti', 'Poulet rôti, pommes de terre et sauce', 'meal', 13.50, '🍗', 20),
  ('Relais du Routier', 'Formule Routier', 'Plat du jour, dessert et boisson 33 cl', 'formula', 18.90, '🍽️', 30),
  ('Relais du Routier', 'Café gourmand', 'Café et assortiment de mini-desserts', 'dessert', 6.50, '☕', 40),
  ('Truck Burger', 'Classic Burger', 'Bœuf, cheddar, salade, tomate et sauce maison', 'meal', 10.90, '🍔', 10),
  ('Truck Burger', 'Double Truck', 'Double bœuf, double cheddar et bacon', 'meal', 14.50, '🍔', 20),
  ('Truck Burger', 'Menu Classic', 'Classic Burger, frites et boisson 50 cl', 'formula', 15.90, '🍟', 30),
  ('Truck Burger', 'Menu Double', 'Double Truck, grandes frites et boisson 50 cl', 'formula', 19.90, '🥤', 40),
  ('Pizza Express', 'Margherita', 'Tomate, mozzarella et basilic', 'meal', 10.50, '🍕', 10),
  ('Pizza Express', 'Reine', 'Tomate, mozzarella, jambon et champignons', 'meal', 13.50, '🍕', 20),
  ('Pizza Express', 'Formule Pizza', 'Pizza au choix, boisson 33 cl et tiramisu', 'formula', 18.50, '🍕', 30),
  ('Pizza Express', 'Tiramisu', 'Tiramisu italien maison', 'dessert', 5.50, '🍰', 40),
  ('Pause Fraîcheur', 'Salade César', 'Poulet, parmesan, croûtons et sauce César', 'meal', 11.90, '🥗', 10),
  ('Pause Fraîcheur', 'Wrap poulet', 'Wrap poulet crudités et sauce légère', 'meal', 8.90, '🌯', 20),
  ('Pause Fraîcheur', 'Formule Équilibre', 'Salade ou wrap, fruit et eau 50 cl', 'formula', 14.50, '🥗', 30),
  ('Pause Fraîcheur', 'Salade de fruits', 'Fruits frais de saison', 'dessert', 4.90, '🍓', 40),
  ('Boissons & Pause', 'Eau minérale 50 cl', 'Eau plate fraîche', 'drink', 2.00, '💧', 10),
  ('Boissons & Pause', 'Soda 33 cl', 'Cola, orange ou citron', 'drink', 3.00, '🥤', 20),
  ('Boissons & Pause', 'Café', 'Expresso', 'drink', 2.20, '☕', 30),
  ('Boissons & Pause', 'Boisson énergisante', 'Canette 25 cl', 'drink', 4.50, '⚡', 40),
  ('Boissons & Pause', 'Cookie chocolat', 'Cookie aux pépites de chocolat', 'snack', 3.20, '🍪', 50),
  ('Boissons & Pause', 'Sandwich jambon-beurre', 'Baguette, jambon et beurre', 'snack', 6.50, '🥪', 60)
ON CONFLICT (restaurant, name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  emoji = EXCLUDED.emoji,
  sort_order = EXCLUDED.sort_order,
  enabled = true;

CREATE OR REPLACE FUNCTION public.purchase_meal_order(p_item_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_account public.driver_bank_accounts%ROWTYPE;
  v_order public.meal_orders%ROWTYPE;
  v_items jsonb;
  v_total numeric(15,2);
  v_restaurant text;
  v_restaurant_count integer;
  v_requested_count integer;
  v_matched_count integer;
  v_new_balance numeric(15,2);
  v_receipt text;
  v_driver_tx_id uuid;
BEGIN
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  v_requested_count := COALESCE(array_length(p_item_ids, 1), 0);
  IF v_requested_count = 0 THEN RAISE EXCEPTION 'Votre panier est vide'; END IF;
  IF v_requested_count > 30 THEN RAISE EXCEPTION 'Commande limitée à 30 articles'; END IF;

  SELECT * INTO v_account
  FROM public.driver_bank_accounts
  WHERE profile_id = v_profile_id AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte bancaire chauffeur actif requis'; END IF;

  WITH requested AS (
    SELECT item_id, count(*)::integer AS quantity
    FROM unnest(p_item_ids) AS u(item_id)
    GROUP BY item_id
  ), priced AS (
    SELECT c.id, c.restaurant, c.name, c.price, c.sort_order, r.quantity,
           ROUND(c.price * r.quantity, 2) AS line_total
    FROM requested r
    JOIN public.meal_catalog c ON c.id = r.item_id AND c.enabled = true
  )
  SELECT
    jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'quantity', quantity,
      'unit_price', price, 'total', line_total
    ) ORDER BY sort_order, name),
    ROUND(sum(line_total), 2),
    min(restaurant),
    count(DISTINCT restaurant)::integer,
    COALESCE(sum(quantity), 0)::integer
  INTO v_items, v_total, v_restaurant, v_restaurant_count, v_matched_count
  FROM priced;

  IF v_matched_count <> v_requested_count THEN RAISE EXCEPTION 'Un article est indisponible'; END IF;
  IF v_restaurant_count <> 1 THEN RAISE EXCEPTION 'Une commande doit concerner un seul restaurant'; END IF;
  IF COALESCE(v_account.balance, 0) < v_total THEN
    RAISE EXCEPTION 'Solde insuffisant (%.2f € disponible, %.2f € requis)', v_account.balance, v_total;
  END IF;

  v_new_balance := ROUND(v_account.balance - v_total, 2);
  v_receipt := 'REST-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.meal_receipt_seq')::text, 6, '0');

  INSERT INTO public.meal_orders (
    profile_id, driver_account_id, restaurant, receipt_number,
    items, total_amount, balance_after, payment_method
  ) VALUES (
    v_profile_id, v_account.id, v_restaurant, v_receipt,
    v_items, v_total, v_new_balance, 'Carte chauffeur'
  ) RETURNING * INTO v_order;

  INSERT INTO public.driver_bank_transactions (
    account_id, profile_id, type, direction, amount, balance_after,
    label, reference, metadata, created_by
  ) VALUES (
    v_account.id, v_profile_id, 'other', 'debit', v_total, v_new_balance,
    'Repas — ' || v_restaurant, v_receipt,
    jsonb_build_object('meal_order_id', v_order.id, 'restaurant', v_restaurant),
    v_profile_id
  ) RETURNING id INTO v_driver_tx_id;

  UPDATE public.driver_bank_accounts
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_account.id;

  UPDATE public.meal_orders
  SET driver_transaction_id = v_driver_tx_id
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_meal_order(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_meal_order(uuid[]) TO authenticated;

INSERT INTO public.room_permissions (
  room_key, room_name, description, category, icon, color, route,
  sort_order, enabled, visible_to_roles, admin_critical
) VALUES (
  'meals', 'Repas', 'Restaurants, boissons et formules chauffeur', 'ERP',
  'Utensils', '#fb7185', '/meals', 58, true, ARRAY['chauffeur','admin'], false
)
ON CONFLICT (room_key) DO UPDATE SET
  room_name = EXCLUDED.room_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  route = EXCLUDED.route,
  enabled = true,
  visible_to_roles = EXCLUDED.visible_to_roles,
  updated_at = now();

INSERT INTO public.app_modules (key, label, category, icon, route, enabled, sort_order, allowed_roles, admin_only)
VALUES ('meals', 'Repas', 'ERP', 'Utensils', '/meals', true, 58, ARRAY['chauffeur','admin'], false)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  enabled = true,
  allowed_roles = EXCLUDED.allowed_roles,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
