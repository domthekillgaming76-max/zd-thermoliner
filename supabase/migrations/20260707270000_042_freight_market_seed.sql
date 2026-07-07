-- 042 — Seed demo freight offers for dispatch board (additive, idempotent)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.freight_offers LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.freight_offers (
    client_name, departure_city, arrival_city, departure_country, arrival_country,
    cargo, weight_kg, pallets, temperature_required, temperature_min, temperature_max,
    adr_required, distance_km, price, price_per_km,
    loading_date, delivery_date, priority, status, expires_at, notes
  ) VALUES
  (
    'Carrefour Supply', 'Lyon', 'Marseille', 'France', 'France',
    'Produits frais — DLC courte', 18500, 28, true, 2, 6,
    false, 315, 1890, 6.0,
    CURRENT_DATE + 1, CURRENT_DATE + 2, 'urgent', 'available',
    now() + interval '6 hours',
    'Chargement 06h00 — priorité absolue'
  ),
  (
    'BASF Chemicals', 'Rotterdam', 'Strasbourg', 'Pays-Bas', 'France',
    'Matières ADR classe 3', 22000, 22, false, null, null,
    true, 620, 5580, 9.0,
    CURRENT_DATE + 2, CURRENT_DATE + 4, 'high', 'available',
    now() + interval '36 hours',
    'ADR obligatoire — équipement complet requis'
  ),
  (
    'Metro Cash & Carry', 'Paris', 'Bruxelles', 'France', 'Belgique',
    'Surgelés — chaîne du froid', 24000, 33, true, -22, -18,
    false, 310, 2480, 8.0,
    CURRENT_DATE + 1, CURRENT_DATE + 3, 'normal', 'available',
    now() + interval '48 hours',
    'Contrôle température toutes les 2h'
  ),
  (
    'IKEA Logistics', 'Malmö', 'Milano', 'Suède', 'Italie',
    'Meubles emballés — longue distance', 28000, 40, false, null, null,
    false, 1850, 12950, 7.0,
    CURRENT_DATE + 3, CURRENT_DATE + 6, 'normal', 'available',
    now() + interval '72 hours',
    'Traversée ferry incluse dans le prix'
  ),
  (
    'Leroy Merlin', 'Toulouse', 'Bordeaux', 'France', 'France',
    'Matériaux construction', 12000, 18, false, null, null,
    false, 245, 735, 3.0,
    CURRENT_DATE + 1, CURRENT_DATE + 2, 'low', 'available',
    now() + interval '24 hours',
    'Courte distance — retour possible'
  ),
  (
    'Amazon FBA', 'Le Havre', 'Lille', 'France', 'France',
    'Colis e-commerce — hub nord', 8500, 45, false, null, null,
    false, 280, 1540, 5.5,
    CURRENT_DATE, CURRENT_DATE + 1, 'urgent', 'available',
    now() + interval '4 hours',
    'Créneau livraison 14h-18h impératif'
  ),
  (
    'Danone', 'Rennes', 'Nantes', 'France', 'France',
    'Yaourts & produits laitiers', 16000, 24, true, 4, 8,
    false, 108, 648, 6.0,
    CURRENT_DATE + 1, CURRENT_DATE + 1, 'high', 'available',
    now() + interval '18 hours',
    'Frigo multi-compartiments'
  ),
  (
    'TotalEnergies', 'Anvers', 'Lyon', 'Belgique', 'France',
    'Lubrifiants industriels ADR', 18000, 20, false, null, null,
    true, 780, 7020, 9.0,
    CURRENT_DATE + 2, CURRENT_DATE + 5, 'high', 'available',
    now() + interval '60 hours',
    'Contrat premium — meilleure marge/km'
  ),
  (
    'Decathlon', 'Lille', 'Barcelone', 'France', 'Espagne',
    'Équipements sportifs', 14000, 32, false, null, null,
    false, 1250, 8750, 7.0,
    CURRENT_DATE + 4, CURRENT_DATE + 7, 'normal', 'available',
    now() + interval '96 hours',
    'Longue distance internationale'
  ),
  (
    'Auchan', 'Strasbourg', 'Luxembourg', 'France', 'Luxembourg',
    'Denrées alimentaires', 11000, 20, true, 0, 4,
    false, 220, 1100, 5.0,
    CURRENT_DATE + 2, CURRENT_DATE + 3, 'normal', 'available',
    now() + interval '30 hours',
    'Palette standard EUR'
  ),
  (
    'Renault Trucks', 'Boulogne-Billancourt', 'Valence', 'France', 'France',
    'Pièces détachées — haute valeur', 6500, 12, false, null, null,
    false, 650, 6500, 10.0,
    CURRENT_DATE + 1, CURRENT_DATE + 3, 'high', 'available',
    now() + interval '40 hours',
    'Contrat premium > 5000 €'
  ),
  (
    'Monoprix', 'Nantes', 'Rennes', 'France', 'France',
    'Réappro magasins — express', 4200, 14, false, null, null,
    false, 108, 540, 5.0,
    CURRENT_DATE, CURRENT_DATE + 1, 'urgent', 'available',
    now() + interval '8 hours',
    'Double rotation possible'
  );

  -- Pre-compute profitability for seeded offers
  INSERT INTO public.freight_profitability (
    offer_id, revenue, fuel_cost, toll_estimate, salary_estimate,
    maintenance_estimate, insurance_estimate, net_profit, margin_percent,
    cost_per_km, profit_per_km, computed_at
  )
  SELECT
    o.id,
    o.price,
    ROUND(o.distance_km * 0.32 * 1.85 / 100, 2),
    ROUND(o.distance_km * 0.08, 2),
    ROUND(o.price * 0.20, 2),
    ROUND(o.distance_km * 0.05, 2),
    ROUND(o.distance_km * 0.04, 2),
    ROUND(o.price - (o.distance_km * 0.32 * 1.85 / 100) - (o.distance_km * 0.08) - (o.price * 0.20) - (o.distance_km * 0.05) - (o.distance_km * 0.04), 2),
    ROUND(((o.price - (o.distance_km * 0.32 * 1.85 / 100) - (o.distance_km * 0.08) - (o.price * 0.20) - (o.distance_km * 0.05) - (o.distance_km * 0.04)) / NULLIF(o.price, 0)) * 100, 2),
    ROUND((o.distance_km * 0.32 * 1.85 / 100 + o.distance_km * 0.08 + o.price * 0.20 + o.distance_km * 0.05 + o.distance_km * 0.04) / NULLIF(o.distance_km, 0), 4),
    ROUND((o.price - (o.distance_km * 0.32 * 1.85 / 100) - (o.distance_km * 0.08) - (o.price * 0.20) - (o.distance_km * 0.05) - (o.distance_km * 0.04)) / NULLIF(o.distance_km, 0), 4),
    now()
  FROM public.freight_offers o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.freight_profitability p WHERE p.offer_id = o.id
  );

END $$;
