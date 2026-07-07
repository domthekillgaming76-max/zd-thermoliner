const CLIENTS = [
  'Carrefour Supply', 'BASF Chemicals', 'Metro Cash & Carry', 'IKEA Logistics',
  'Leroy Merlin', 'Amazon FBA', 'Danone', 'TotalEnergies', 'Decathlon', 'Auchan',
  'Renault Trucks', 'Monoprix', 'DHL Freight', 'Geodis', 'XPO Logistics',
  'Maersk Logistics', 'Schenker', 'Kuehne+Nagel', 'Colruyt', 'Lactalis',
];

/** Required cargo catalogue for the logistics engine */
export const CARGO_TYPES = [
  { label: 'Flowers', temperature_required: true, temp_min: 2, temp_max: 8, adr_required: false, rate_multiplier: 1.15, weight_kg: 3200, pallets: 18 },
  { label: 'Refrigerated', temperature_required: true, temp_min: 0, temp_max: 6, adr_required: false, rate_multiplier: 1.2, weight_kg: 4800, pallets: 24 },
  { label: 'Frozen', temperature_required: true, temp_min: -25, temp_max: -18, adr_required: false, rate_multiplier: 1.28, weight_kg: 5200, pallets: 22 },
  { label: 'ADR', temperature_required: false, temp_min: null, temp_max: null, adr_required: true, rate_multiplier: 1.48, weight_kg: 6000, pallets: 16 },
  { label: 'Medicine', temperature_required: true, temp_min: 2, temp_max: 8, adr_required: false, rate_multiplier: 1.35, weight_kg: 1800, pallets: 12 },
  { label: 'Food', temperature_required: false, temp_min: null, temp_max: null, adr_required: false, rate_multiplier: 1.0, weight_kg: 5500, pallets: 26 },
  { label: 'Pallets', temperature_required: false, temp_min: null, temp_max: null, adr_required: false, rate_multiplier: 0.92, weight_kg: 7200, pallets: 33 },
  { label: 'Steel', temperature_required: false, temp_min: null, temp_max: null, adr_required: false, rate_multiplier: 1.05, weight_kg: 12000, pallets: 8 },
  { label: 'Cars', temperature_required: false, temp_min: null, temp_max: null, adr_required: false, rate_multiplier: 1.22, weight_kg: 8500, pallets: 6 },
  { label: 'Construction', temperature_required: false, temp_min: null, temp_max: null, adr_required: false, rate_multiplier: 0.95, weight_kg: 9800, pallets: 14 },
];

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const PRIORITY_MULTIPLIER = { low: 0.92, normal: 1.0, high: 1.12, urgent: 1.25 };

/** European hub cities with country for realistic routing */
export const EUROPEAN_HUBS = {
  'Paris': 'France', 'Lyon': 'France', 'Marseille': 'France', 'Lille': 'France',
  'Bordeaux': 'France', 'Toulouse': 'France', 'Nantes': 'France', 'Rennes': 'France',
  'Strasbourg': 'France', 'Le Havre': 'France', 'Nice': 'France',
  'Bruxelles': 'Belgique', 'Anvers': 'Belgique', 'Liège': 'Belgique',
  'Amsterdam': 'Pays-Bas', 'Rotterdam': 'Pays-Bas', 'Eindhoven': 'Pays-Bas',
  'Luxembourg': 'Luxembourg', 'Francfort': 'Allemagne', 'Cologne': 'Allemagne',
  'Hambourg': 'Allemagne', 'Berlin': 'Allemagne', 'Munich': 'Allemagne',
  'Milan': 'Italie', 'Turin': 'Italie', 'Rome': 'Italie', 'Gênes': 'Italie',
  'Barcelone': 'Espagne', 'Madrid': 'Espagne', 'Valence': 'Espagne',
  'Lisbonne': 'Portugal', 'Porto': 'Portugal',
  'Zurich': 'Suisse', 'Bâle': 'Suisse',
  'Vienne': 'Autriche', 'Prague': 'République tchèque',
  'Varsovie': 'Pologne', 'Copenhague': 'Danemark',
};

/** Realistic corridor distances (km) — bidirectional lookup */
const CORRIDOR_KM = {
  'Paris|Lyon': 465, 'Paris|Lille': 220, 'Paris|Bruxelles': 310, 'Paris|Bordeaux': 580,
  'Paris|Strasbourg': 490, 'Paris|Marseille': 775, 'Paris|Nantes': 385, 'Paris|Le Havre': 195,
  'Lyon|Marseille': 315, 'Lyon|Nice': 470, 'Lyon|Turin': 280, 'Lyon|Strasbourg': 490,
  'Lyon|Barcelone': 650, 'Lyon|Milan': 450,
  'Marseille|Nice': 200, 'Marseille|Barcelone': 640, 'Marseille|Turin': 320,
  'Lille|Bruxelles': 120, 'Lille|Anvers': 130, 'Lille|Rotterdam': 280, 'Lille|Luxembourg': 280,
  'Bruxelles|Anvers': 45, 'Bruxelles|Amsterdam': 210, 'Bruxelles|Luxembourg': 190,
  'Anvers|Rotterdam': 100, 'Anvers|Francfort': 380, 'Anvers|Cologne': 210,
  'Rotterdam|Hambourg': 450, 'Rotterdam|Amsterdam': 75, 'Rotterdam|Francfort': 420,
  'Amsterdam|Hambourg': 470, 'Amsterdam|Cologne': 260,
  'Francfort|Cologne': 190, 'Francfort|Strasbourg': 220, 'Francfort|Munich': 390,
  'Francfort|Milan': 650, 'Francfort|Berlin': 550,
  'Cologne|Bruxelles': 210, 'Cologne|Paris': 490,
  'Hambourg|Berlin': 290, 'Hambourg|Copenhague': 360,
  'Munich|Milan': 490, 'Munich|Vienne': 400, 'Munich|Zurich': 310,
  'Milan|Turin': 95, 'Milan|Gênes': 145, 'Milan|Zurich': 220, 'Milan|Nice': 320,
  'Turin|Nice': 180, 'Turin|Lyon': 280,
  'Barcelone|Madrid': 620, 'Barcelone|Toulouse': 390, 'Barcelone|Valence': 350,
  'Madrid|Bordeaux': 540, 'Madrid|Lisbonne': 630,
  'Bordeaux|Toulouse': 245, 'Bordeaux|Nantes': 330,
  'Toulouse|Marseille': 400, 'Nantes|Rennes': 108,
  'Strasbourg|Luxembourg': 220, 'Strasbourg|Zurich': 180, 'Strasbourg|Francfort': 220,
  'Zurich|Bâle': 85, 'Zurich|Milan': 220,
  'Vienne|Prague': 330, 'Vienne|Munich': 400,
  'Varsovie|Berlin': 570, 'Varsovie|Prague': 690,
  'Le Havre|Paris': 195, 'Le Havre|Lille': 280,
};

/** Pre-built multi-leg tours — arrival N = departure N+1 */
export const CHAIN_ROUTES = [
  ['Le Havre', 'Paris', 'Lyon', 'Marseille'],
  ['Rotterdam', 'Anvers', 'Bruxelles', 'Paris', 'Lyon'],
  ['Paris', 'Bruxelles', 'Anvers', 'Francfort', 'Milan', 'Turin'],
  ['Bordeaux', 'Toulouse', 'Barcelone', 'Valence'],
  ['Strasbourg', 'Francfort', 'Cologne', 'Amsterdam', 'Rotterdam'],
  ['Lille', 'Bruxelles', 'Luxembourg', 'Strasbourg', 'Lyon'],
  ['Hambourg', 'Amsterdam', 'Anvers', 'Lille', 'Paris'],
  ['Milan', 'Turin', 'Nice', 'Marseille'],
  ['Nantes', 'Bordeaux', 'Toulouse', 'Marseille'],
  ['Francfort', 'Munich', 'Milan', 'Gênes'],
];

/** Standalone high-volume corridors */
export const SINGLE_CORRIDORS = [
  ['Paris', 'Lyon'], ['Lyon', 'Marseille'], ['Paris', 'Bruxelles'], ['Anvers', 'Milan'],
  ['Rotterdam', 'Strasbourg'], ['Lille', 'Barcelone'], ['Bordeaux', 'Madrid'],
  ['Toulouse', 'Barcelone'], ['Nantes', 'Paris'], ['Marseille', 'Nice'],
  ['Francfort', 'Paris'], ['Hambourg', 'Munich'], ['Milan', 'Zurich'],
  ['Bruxelles', 'Amsterdam'], ['Strasbourg', 'Luxembourg'], ['Le Havre', 'Lille'],
  ['Cologne', 'Francfort'], ['Berlin', 'Hambourg'], ['Valence', 'Madrid'],
  ['Porto', 'Bordeaux'], ['Vienne', 'Munich'], ['Prague', 'Berlin'],
];

export const MIN_OFFERS_PER_RUN = 5;
export const MAX_OFFERS_PER_RUN = 15;

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function corridorDistance(from, to) {
  const key = `${from}|${to}`;
  const rev = `${to}|${from}`;
  return CORRIDOR_KM[key] ?? CORRIDOR_KM[rev] ?? estimateDistance(from, to);
}

function estimateDistance(from, to) {
  const hubs = Object.keys(EUROPEAN_HUBS);
  const fi = hubs.indexOf(from);
  const ti = hubs.indexOf(to);
  if (fi < 0 || ti < 0) return 400;
  return 180 + Math.abs(fi - ti) * 95 + randInt(20, 80);
}

export function hubCountry(city) {
  return EUROPEAN_HUBS[city] ?? 'Europe';
}

export function pickCargo() {
  return pick(CARGO_TYPES);
}

export function calculateRevenue(distanceKm, cargo, priority = 'normal') {
  const baseRate = 1.05 * cargo.rate_multiplier * (PRIORITY_MULTIPLIER[priority] ?? 1);
  const longHaulBonus = distanceKm > 600 ? 1.08 : distanceKm < 150 ? 0.95 : 1;
  const revenue = Math.round(distanceKm * baseRate * longHaulBonus * 100) / 100;
  return Math.max(revenue, Math.round(distanceKm * 0.85 * 100) / 100);
}

/**
 * Full leg economics:
 * distance, revenue, fuel, toll, driver salary, company profit
 */
export function computeLegProfitability(km, price) {
  const fuelLiters = km * 0.32;
  const fuelCost = fuelLiters * 1.85 / 100 * 100; // €/L
  const fuel = km * 0.32 * 1.85 / 100;
  const toll = km * 0.085;
  const salary = price * 0.2;
  const maint = km * 0.05;
  const ins = km * 0.04;
  const overhead = price * 0.02;
  const net = price - fuel - toll - salary - maint - ins - overhead;

  return {
    revenue: price,
    fuel_cost: round2(fuel),
    toll_estimate: round2(toll),
    salary_estimate: round2(salary),
    maintenance_estimate: round2(maint),
    insurance_estimate: round2(ins),
    net_profit: round2(net),
    margin_percent: price > 0 ? round1((net / price) * 100) : 0,
    cost_per_km: km > 0 ? round4((fuel + toll + salary + maint + ins) / km) : 0,
    profit_per_km: km > 0 ? round2(net / km) : 0,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round1(n) { return Math.round(n * 10) / 10; }
function round4(n) { return Math.round(n * 10000) / 10000; }

export function computeChainTotals(legs) {
  const totals = legs.reduce(
    (acc, l) => {
      const p = computeLegProfitability(l.distance_km, l.price);
      return {
        total_distance_km: acc.total_distance_km + l.distance_km,
        total_revenue: acc.total_revenue + l.price,
        total_fuel_cost: acc.total_fuel_cost + p.fuel_cost,
        total_toll_estimate: acc.total_toll_estimate + p.toll_estimate,
        total_salary_estimate: acc.total_salary_estimate + p.salary_estimate,
        total_maintenance_estimate: acc.total_maintenance_estimate + p.maintenance_estimate,
        total_insurance_estimate: acc.total_insurance_estimate + p.insurance_estimate,
        total_net_profit: acc.total_net_profit + p.net_profit,
      };
    },
    {
      total_distance_km: 0, total_revenue: 0, total_fuel_cost: 0, total_toll_estimate: 0,
      total_salary_estimate: 0, total_maintenance_estimate: 0, total_insurance_estimate: 0, total_net_profit: 0,
    },
  );
  totals.total_margin_percent = totals.total_revenue > 0
    ? round1((totals.total_net_profit / totals.total_revenue) * 100)
    : 0;
  return totals;
}

function deliveryDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function expiresIn(hours) {
  return new Date(Date.now() + hours * 3600000).toISOString();
}

export function buildSingleOffer(batchId, corridorIndex) {
  const [dep, arr] = SINGLE_CORRIDORS[corridorIndex % SINGLE_CORRIDORS.length];
  const km = corridorDistance(dep, arr);
  const cargo = pickCargo();
  const priority = pick(PRIORITIES);
  const client = pick(CLIENTS);
  const deliveryDate = deliveryDateOffset(1 + randInt(0, 4));
  const fingerprint = `single:${dep}:${arr}:${deliveryDate}:${cargo.label}`;
  const price = calculateRevenue(km, cargo, priority);

  return {
    fingerprint,
    client_name: client,
    departure_city: dep,
    arrival_city: arr,
    departure_country: hubCountry(dep),
    arrival_country: hubCountry(arr),
    cargo: cargo.label,
    weight_kg: cargo.weight_kg + randInt(-500, 500),
    pallets: cargo.pallets + randInt(-2, 3),
    distance_km: km,
    price,
    price_per_km: km > 0 ? round4(price / km) : 0,
    delivery_date: deliveryDate,
    priority,
    status: 'available',
    expires_at: expiresIn(48),
    notes: `cron:auto:${batchId}`,
    cron_fingerprint: fingerprint,
    temperature_required: cargo.temperature_required,
    temperature_min: cargo.temp_min,
    temperature_max: cargo.temp_max,
    adr_required: cargo.adr_required,
  };
}

/** Build chained tour — each leg arrival connects to next departure */
export function buildChainOffer(batchId, routeIndex) {
  const cities = CHAIN_ROUTES[routeIndex % CHAIN_ROUTES.length];
  const routeKey = cities.join('>');
  const fingerprint = `chain:${routeKey}`;
  const client = pick(CLIENTS);
  const priority = pick(PRIORITIES);
  const sharedCargo = pickCargo();

  const legs = [];
  for (let i = 0; i < cities.length - 1; i++) {
    const dep = cities[i];
    const arr = cities[i + 1];
    const km = corridorDistance(dep, arr);
    const cargo = i === 0 ? sharedCargo : (Math.random() > 0.6 ? sharedCargo : pickCargo());
    const price = calculateRevenue(km, cargo, priority);
    legs.push({
      departure_city: dep,
      arrival_city: arr,
      departure_country: hubCountry(dep),
      arrival_country: hubCountry(arr),
      distance_km: km,
      price,
      cargo: cargo.label,
      weight_kg: cargo.weight_kg,
      pallets: cargo.pallets,
      temperature_required: cargo.temperature_required,
      temperature_min: cargo.temp_min,
      temperature_max: cargo.temp_max,
      adr_required: cargo.adr_required,
      delivery_date: deliveryDateOffset(i + 1),
      deadline_at: expiresIn(24 + i * 12),
    });
  }

  const title = `Tour ${cities[0]} → ${cities[cities.length - 1]} #${batchId.slice(-6)}`;

  return {
    fingerprint,
    title,
    client_name: client,
    priority,
    legs,
    expires_at: expiresIn(72),
    notes: `cron:chain:${batchId}`,
    cron_fingerprint: fingerprint,
    route: cities,
  };
}

export function targetOfferCount() {
  return randInt(MIN_OFFERS_PER_RUN, MAX_OFFERS_PER_RUN);
}
