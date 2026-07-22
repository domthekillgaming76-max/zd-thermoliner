-- 093 — Boutique d'équipements camion et débit du compte personnel chauffeur.

CREATE TABLE IF NOT EXISTS public.truck_equipment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  location text NOT NULL CHECK (location IN ('interior', 'exterior')),
  price numeric(10,2) NOT NULL CHECK (price > 0),
  emoji text NOT NULL DEFAULT '🔧',
  stock integer CHECK (stock IS NULL OR stock >= 0),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.truck_equipment_receipt_seq START 1;

CREATE TABLE IF NOT EXISTS public.driver_truck_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.truck_equipment_catalog(id) ON DELETE RESTRICT,
  driver_account_id uuid NOT NULL REFERENCES public.driver_bank_accounts(id) ON DELETE RESTRICT,
  driver_transaction_id uuid REFERENCES public.driver_bank_transactions(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  category text NOT NULL,
  location text NOT NULL CHECK (location IN ('interior', 'exterior')),
  price_paid numeric(10,2) NOT NULL CHECK (price_paid > 0),
  balance_after numeric(15,2) NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  purchased_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_truck_equipment_profile ON public.driver_truck_equipment(profile_id, purchased_at DESC);
ALTER TABLE public.truck_equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_truck_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "truck_equipment_catalog_read" ON public.truck_equipment_catalog;
CREATE POLICY "truck_equipment_catalog_read" ON public.truck_equipment_catalog FOR SELECT TO authenticated USING (enabled OR public.is_erp_admin(auth.uid()));
DROP POLICY IF EXISTS "truck_equipment_catalog_admin" ON public.truck_equipment_catalog;
CREATE POLICY "truck_equipment_catalog_admin" ON public.truck_equipment_catalog FOR ALL TO authenticated USING (public.is_erp_admin(auth.uid())) WITH CHECK (public.is_erp_admin(auth.uid()));
DROP POLICY IF EXISTS "driver_truck_equipment_read" ON public.driver_truck_equipment;
CREATE POLICY "driver_truck_equipment_read" ON public.driver_truck_equipment FOR SELECT TO authenticated USING (profile_id = auth.uid() OR public.is_erp_admin(auth.uid()));

INSERT INTO public.truck_equipment_catalog (name, description, category, location, price, emoji, sort_order) VALUES
('Housses cuir premium', 'Housses renforcées sur mesure pour les deux sièges', 'Confort cabine', 'interior', 690, '💺', 10),
('Housses tissu Z&D', 'Housses brodées aux couleurs de l’entreprise', 'Confort cabine', 'interior', 320, '🪡', 20),
('Surmatelas mémoire de forme', 'Surmatelas respirant haute densité pour couchette', 'Confort cabine', 'interior', 260, '🛏️', 30),
('Oreiller ergonomique', 'Oreiller cervical spécial longues distances', 'Confort cabine', 'interior', 65, '🛌', 40),
('Rideaux occultants velours', 'Jeu complet cabine et couchette', 'Confort cabine', 'interior', 210, '🪟', 50),
('Tapis cabine sur mesure', 'Tapis épais antidérapants avec broderie', 'Confort cabine', 'interior', 180, '🧶', 60),
('Accoudoirs confort', 'Paire d’accoudoirs rembourrés ajustables', 'Confort cabine', 'interior', 145, '💺', 70),
('Coussin lombaire chauffant', 'Soutien lombaire avec trois températures', 'Confort cabine', 'interior', 89, '🔥', 80),
('Volant cuir perforé', 'Gainage cuir cousu main, finition rouge', 'Poste de conduite', 'interior', 380, '⭕', 10),
('Pommeau de vitesse aluminium', 'Pommeau usiné avec éclairage discret', 'Poste de conduite', 'interior', 125, '🕹️', 20),
('Tablette tableau de bord', 'Tablette antidérapante adaptée au véhicule', 'Poste de conduite', 'interior', 95, '📋', 30),
('Support téléphone magnétique', 'Support renforcé avec charge rapide', 'Poste de conduite', 'interior', 79, '📱', 40),
('Support tablette articulé', 'Bras robuste pour tablette 8 à 13 pouces', 'Poste de conduite', 'interior', 135, '💻', 50),
('Caméra de bord 4K', 'Dashcam avant avec vision nocturne et GPS', 'Poste de conduite', 'interior', 340, '📹', 60),
('GPS poids lourd 7 pouces', 'Navigation Europe et gabarit poids lourd', 'Poste de conduite', 'interior', 549, '🗺️', 70),
('CB longue portée', 'Radio CB multicanal avec micro déporté', 'Communication', 'interior', 289, '📻', 10),
('Antenne CB premium', 'Antenne optimisée et câble faible perte', 'Communication', 'interior', 119, '📡', 20),
('Kit mains libres professionnel', 'Micro antibruit et connexion multipoint', 'Communication', 'interior', 199, '🎧', 30),
('Routeur Wi-Fi 5G', 'Routeur cabine double SIM avec antennes', 'Communication', 'interior', 459, '📶', 40),
('Éclairage LED ambiance RGB', 'Kit complet cabine pilotable par télécommande', 'Éclairage intérieur', 'interior', 149, '🌈', 10),
('Plafonnier étoilé', 'Ciel de cabine à fibres optiques', 'Éclairage intérieur', 'interior', 590, '✨', 20),
('Lampes de lecture orientables', 'Paire de lampes LED tactiles', 'Éclairage intérieur', 'interior', 85, '💡', 30),
('Logo Z&D lumineux cabine', 'Enseigne lumineuse basse consommation', 'Éclairage intérieur', 'interior', 175, '🔴', 40),
('Réfrigérateur cabine 40 L', 'Compression 12/24 V avec compartiment freezer', 'Vie à bord', 'interior', 640, '🧊', 10),
('Micro-ondes 24 V', 'Four compact sécurisé pour poids lourd', 'Vie à bord', 'interior', 475, '♨️', 20),
('Machine à café 24 V', 'Cafetière compacte avec mug isotherme', 'Vie à bord', 'interior', 165, '☕', 30),
('Bouilloire 24 V', 'Bouilloire 1 litre avec arrêt automatique', 'Vie à bord', 'interior', 59, '🫖', 40),
('Convertisseur 24 V 2000 W', 'Convertisseur sinusoïdal avec protections', 'Vie à bord', 'interior', 399, '🔌', 50),
('Télévision connectée 24 pouces', 'Smart TV basse consommation avec support', 'Multimédia', 'interior', 390, '📺', 10),
('Système audio cabine', 'Amplificateur compact et quatre haut-parleurs', 'Multimédia', 'interior', 750, '🔊', 20),
('Caisson de basses compact', 'Caisson actif spécial espace cabine', 'Multimédia', 'interior', 310, '🎵', 30),
('Console de rangement plafond', 'Rangement additionnel sécurisé', 'Rangement', 'interior', 280, '🗄️', 10),
('Organiseur de couchette', 'Poches renforcées et porte-bouteilles', 'Rangement', 'interior', 69, '🎒', 20),
('Coffre-fort cabine', 'Coffre compact à code électronique', 'Sécurité', 'interior', 245, '🔐', 10),
('Extincteur cabine premium', 'Extincteur homologué avec support métal', 'Sécurité', 'interior', 89, '🧯', 20),
('Kit premiers secours Europe', 'Trousse complète conforme trajets européens', 'Sécurité', 'interior', 75, '⛑️', 30),
('Rampe de toit LED', 'Rampe longue portée homologuée route', 'Éclairage extérieur', 'exterior', 890, '🔦', 10),
('Barre pare-chocs LED', 'Éclairage additionnel intégré au pare-chocs', 'Éclairage extérieur', 'exterior', 520, '💡', 20),
('Projecteurs longue portée', 'Paire de projecteurs ronds haute puissance', 'Éclairage extérieur', 'exterior', 445, '🔆', 30),
('Feux de gabarit fumés', 'Kit complet LED à cabochons fumés', 'Éclairage extérieur', 'exterior', 260, '🚨', 40),
('Éclairage de châssis RGB', 'Kit étanche pour animation à l’arrêt', 'Éclairage extérieur', 'exterior', 390, '🌈', 50),
('Enseigne lumineuse personnalisée', 'Caisson de toit avec texte au choix', 'Éclairage extérieur', 'exterior', 680, '✨', 60),
('Pare-buffle inox', 'Protection frontale polie homologuée', 'Protection extérieure', 'exterior', 1850, '🛡️', 10),
('Grille de calandre inox', 'Habillage inox découpé sur mesure', 'Protection extérieure', 'exterior', 740, '🪩', 20),
('Coins de pare-chocs renforcés', 'Paire de protections inox', 'Protection extérieure', 'exterior', 490, '🛡️', 30),
('Déflecteurs de vitres', 'Paire de déflecteurs fumés', 'Carrosserie', 'exterior', 145, '🌬️', 10),
('Déflecteur de toit aérodynamique', 'Réglage adapté à la hauteur de remorque', 'Carrosserie', 'exterior', 980, '💨', 20),
('Carénages latéraux', 'Kit aérodynamique peint couleur cabine', 'Carrosserie', 'exterior', 2350, '🚛', 30),
('Visière de pare-brise', 'Visière teintée avec supports inox', 'Carrosserie', 'exterior', 620, '🕶️', 40),
('Cache-réservoir inox', 'Habillage miroir pour réservoir principal', 'Carrosserie', 'exterior', 790, '🪞', 50),
('Jantes aluminium polies', 'Jeu de deux jantes avant finition miroir', 'Roues', 'exterior', 1690, '🛞', 10),
('Caches-écrous chromés', 'Kit complet avec extracteur', 'Roues', 'exterior', 185, '🔩', 20),
('Anneaux de roues LED', 'Éclairage décoratif utilisable à l’arrêt', 'Roues', 'exterior', 340, '⭕', 30),
('Bavettes personnalisées Z&D', 'Paire de bavettes renforcées avec logo', 'Personnalisation', 'exterior', 240, '🚛', 10),
('Stickers latéraux premium', 'Kit vinyle haute résistance pose comprise', 'Personnalisation', 'exterior', 480, '🎨', 20),
('Peinture métallisée complète', 'Mise en peinture cabine, teinte au choix', 'Personnalisation', 'exterior', 4800, '🖌️', 30),
('Aérographie personnalisée', 'Décor latéral réalisé sur cahier des charges', 'Personnalisation', 'exterior', 3200, '🎨', 40),
('Klaxons pneumatiques chromés', 'Paire de trompes avec compresseur', 'Accessoires extérieurs', 'exterior', 590, '📯', 10),
('Échelle arrière cabine', 'Échelle inox avec fixations renforcées', 'Accessoires extérieurs', 'exterior', 460, '🪜', 20),
('Coffre extérieur inox', 'Coffre étanche verrouillable grand volume', 'Accessoires extérieurs', 'exterior', 760, '🧰', 30),
('Réservoir d’eau extérieur', 'Réservoir 50 L avec robinet et support', 'Accessoires extérieurs', 'exterior', 285, '🚰', 40),
('Caméras angles morts', 'Kit deux caméras latérales et écran cabine', 'Sécurité extérieure', 'exterior', 880, '📷', 10),
('Radar de recul poids lourd', 'Quatre capteurs étanches avec avertisseur', 'Sécurité extérieure', 'exterior', 530, '📡', 20),
('Antivol carburant double', 'Protection des bouchons et crépine anti-siphon', 'Sécurité extérieure', 'exterior', 230, '🔒', 30),
('Chaînes neige automatiques', 'Système pneumatique pour essieu moteur', 'Sécurité extérieure', 'exterior', 2950, '⛓️', 40)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category, location = EXCLUDED.location, price = EXCLUDED.price, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order, enabled = true;

CREATE OR REPLACE FUNCTION public.purchase_truck_equipment(p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_account public.driver_bank_accounts%ROWTYPE;
  v_item public.truck_equipment_catalog%ROWTYPE;
  v_purchase public.driver_truck_equipment%ROWTYPE;
  v_balance numeric(15,2);
  v_receipt text;
  v_tx_id uuid;
BEGIN
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_account FROM public.driver_bank_accounts WHERE profile_id = v_profile_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte bancaire chauffeur actif requis'; END IF;
  SELECT * INTO v_item FROM public.truck_equipment_catalog WHERE id = p_item_id AND enabled = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cet équipement est indisponible'; END IF;
  IF v_item.stock IS NOT NULL AND v_item.stock <= 0 THEN RAISE EXCEPTION 'Cet équipement est épuisé'; END IF;
  IF COALESCE(v_account.balance, 0) < v_item.price THEN RAISE EXCEPTION 'Solde insuffisant (%.2f € disponible, %.2f € requis)', v_account.balance, v_item.price; END IF;

  v_balance := ROUND(v_account.balance - v_item.price, 2);
  v_receipt := 'EQUIP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.truck_equipment_receipt_seq')::text, 6, '0');
  INSERT INTO public.driver_truck_equipment (profile_id, item_id, driver_account_id, item_name, category, location, price_paid, balance_after, receipt_number)
  VALUES (v_profile_id, v_item.id, v_account.id, v_item.name, v_item.category, v_item.location, v_item.price, v_balance, v_receipt)
  RETURNING * INTO v_purchase;
  INSERT INTO public.driver_bank_transactions (account_id, profile_id, type, direction, amount, balance_after, label, reference, metadata, created_by)
  VALUES (v_account.id, v_profile_id, 'other', 'debit', v_item.price, v_balance, 'Équipement camion — ' || v_item.name, v_receipt, jsonb_build_object('truck_equipment_purchase_id', v_purchase.id, 'item_id', v_item.id), v_profile_id)
  RETURNING id INTO v_tx_id;
  UPDATE public.driver_bank_accounts SET balance = v_balance, updated_at = now() WHERE id = v_account.id;
  IF v_item.stock IS NOT NULL THEN UPDATE public.truck_equipment_catalog SET stock = stock - 1 WHERE id = v_item.id; END IF;
  UPDATE public.driver_truck_equipment SET driver_transaction_id = v_tx_id WHERE id = v_purchase.id RETURNING * INTO v_purchase;
  RETURN jsonb_build_object('ok', true, 'purchase', to_jsonb(v_purchase));
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_truck_equipment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_truck_equipment(uuid) TO authenticated;

INSERT INTO public.room_permissions (room_key, room_name, description, category, icon, color, route, sort_order, enabled, visible_to_roles, admin_critical)
VALUES ('truck_shop', 'Boutique camion', 'Décoration et équipements intérieurs et extérieurs', 'ERP', 'ShoppingBag', '#f59e0b', '/truck-shop', 59, true, ARRAY['chauffeur','admin'], false)
ON CONFLICT (room_key) DO UPDATE SET room_name = EXCLUDED.room_name, description = EXCLUDED.description, icon = EXCLUDED.icon, color = EXCLUDED.color, route = EXCLUDED.route, enabled = true, visible_to_roles = EXCLUDED.visible_to_roles, updated_at = now();

INSERT INTO public.app_modules (key, label, category, icon, route, enabled, sort_order, allowed_roles, admin_only)
VALUES ('truck_shop', 'Boutique camion', 'ERP', 'ShoppingBag', '/truck-shop', true, 59, ARRAY['chauffeur','admin'], false)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, route = EXCLUDED.route, enabled = true, allowed_roles = EXCLUDED.allowed_roles, updated_at = now();

NOTIFY pgrst, 'reload schema';
