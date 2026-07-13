export type FreightOfferStatus =
  | 'available'
  | 'reserved'
  | 'assigned'
  | 'in_progress'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export type FreightOfferPriority = 'low' | 'normal' | 'high' | 'urgent';

export type FreightRequestStatus = 'pending' | 'approved' | 'rejected';

export type FreightFilterKey =
  | 'all'
  | 'best_profit'
  | 'short_distance'
  | 'long_distance'
  | 'urgent'
  | 'refrigerated'
  | 'adr'
  | 'expiring'
  | 'high_value'
  | 'chained';

export type FreightChainStatus = 'available' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

export interface FreightChainLeg {
  id: string;
  leg_order: number;
  leg_locked: boolean;
  departure_city: string;
  arrival_city: string;
  cargo: string | null;
  distance_km: number;
  price: number;
  price_per_km: number;
  deadline_at: string | null;
  delivery_date: string;
  status: FreightOfferStatus;
  mission_id: string | null;
  profitability?: FreightProfitability | null;
}

export interface FreightChain {
  id: string;
  title: string;
  client_id: string | null;
  client_name: string | null;
  status: FreightChainStatus;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  current_leg_order: number;
  total_distance_km: number;
  total_revenue: number;
  total_fuel_cost: number;
  total_toll_estimate: number;
  total_salary_estimate: number;
  total_maintenance_estimate: number;
  total_insurance_estimate: number;
  total_net_profit: number;
  total_margin_percent: number;
  priority: FreightOfferPriority;
  expires_at: string | null;
  notes: string | null;
  legs: FreightChainLeg[];
  created_at: string;
}

export interface FreightChainLegInput {
  departure_city: string;
  arrival_city: string;
  cargo?: string;
  distance_km: number;
  price: number;
  deadline_at?: string | null;
  delivery_date: string;
}

export interface FreightChainInput {
  title: string;
  client_id?: string | null;
  client_name?: string;
  legs: FreightChainLegInput[];
  priority?: FreightOfferPriority;
  expires_at?: string | null;
  notes?: string;
}

export interface AcceptFreightChainInput {
  chainId: string;
  driverId?: string | null;
  truckId?: string | null;
  trailerId?: string | null;
}

export interface FreightOffer {
  id: string;
  client_id: string | null;
  client_name: string | null;
  departure_city: string;
  arrival_city: string;
  departure_country: string;
  arrival_country: string;
  cargo: string | null;
  weight_kg: number;
  pallets: number;
  temperature_required: boolean;
  temperature_min: number | null;
  temperature_max: number | null;
  adr_required: boolean;
  distance_km: number;
  price: number;
  price_per_km: number;
  deadline_at: string | null;
  loading_date: string | null;
  delivery_date: string;
  priority: FreightOfferPriority;
  status: FreightOfferStatus;
  mission_id: string | null;
  road_sheet_id: string | null;
  created_by: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  chain_id?: string | null;
  leg_order?: number | null;
  leg_locked?: boolean;
  profitability?: FreightProfitability | null;
}

export interface FreightProfitability {
  id: string;
  offer_id: string;
  revenue: number;
  fuel_cost: number;
  toll_estimate: number;
  salary_estimate: number;
  maintenance_estimate: number;
  insurance_estimate: number;
  net_profit: number;
  margin_percent: number;
  cost_per_km: number;
  profit_per_km: number;
  computed_at: string;
}

export interface FreightDashboard {
  availableOffers: number;
  highValueContracts: number;
  urgentDeliveries: number;
  refrigeratedFreight: number;
  adrFreight: number;
  longDistanceJobs: number;
  bestProfitPerKm: number;
  expiringOffers: number;
}

export interface FreightBundle {
  dashboard: FreightDashboard;
  offers: FreightOffer[];
  chains: FreightChain[];
  clients: { id: string; name: string }[];
  drivers: { id: string; name: string; truck_id: string | null }[];
  trucks: { id: string; label: string }[];
  trailers: { id: string; label: string }[];
  migrationRequired: boolean;
}

export interface FreightOfferInput {
  client_id?: string | null;
  client_name?: string;
  departure_city: string;
  arrival_city: string;
  departure_country?: string;
  arrival_country?: string;
  cargo?: string;
  weight_kg?: number;
  pallets?: number;
  temperature_required?: boolean;
  temperature_min?: number | null;
  temperature_max?: number | null;
  adr_required?: boolean;
  distance_km: number;
  price: number;
  deadline_at?: string | null;
  loading_date?: string | null;
  delivery_date: string;
  priority?: FreightOfferPriority;
  expires_at?: string | null;
  notes?: string;
}

export interface AcceptFreightInput {
  offerId: string;
  driverId?: string | null;
  truckId?: string | null;
  trailerId?: string | null;
  sendToGame?: boolean;
}

export const FREIGHT_STATUS_LABELS: Record<FreightOfferStatus, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  assigned: 'Assigné',
  in_progress: 'En cours',
  delivered: 'Livré',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

export const FREIGHT_STATUS_COLORS: Record<FreightOfferStatus, string> = {
  available: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  reserved: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  assigned: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  in_progress: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  delivered: 'text-white/50 bg-white/5 border-white/10',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/25',
  expired: 'text-white/35 bg-white/5 border-white/10',
};

export const FREIGHT_PRIORITY_LABELS: Record<FreightOfferPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

export function formatFreightCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export function timeUntilExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function computeChainTotals(legs: Pick<FreightChainLeg, 'distance_km' | 'price'>[]): {
  total_distance_km: number;
  total_revenue: number;
  total_fuel_cost: number;
  total_toll_estimate: number;
  total_salary_estimate: number;
  total_maintenance_estimate: number;
  total_insurance_estimate: number;
  total_net_profit: number;
  total_margin_percent: number;
} {
  const total_distance_km = legs.reduce((s, l) => s + l.distance_km, 0);
  const total_revenue = legs.reduce((s, l) => s + l.price, 0);
  const agg = legs.reduce(
    (acc, l) => {
      const p = computeOfferProfitability({ distance_km: l.distance_km, price: l.price, price_per_km: l.distance_km > 0 ? l.price / l.distance_km : 0 });
      return {
        fuel: acc.fuel + p.fuel_cost,
        toll: acc.toll + p.toll_estimate,
        salary: acc.salary + p.salary_estimate,
        maint: acc.maint + p.maintenance_estimate,
        ins: acc.ins + p.insurance_estimate,
        profit: acc.profit + p.net_profit,
      };
    },
    { fuel: 0, toll: 0, salary: 0, maint: 0, ins: 0, profit: 0 },
  );
  return {
    total_distance_km,
    total_revenue,
    total_fuel_cost: Math.round(agg.fuel * 100) / 100,
    total_toll_estimate: Math.round(agg.toll * 100) / 100,
    total_salary_estimate: Math.round(agg.salary * 100) / 100,
    total_maintenance_estimate: Math.round(agg.maint * 100) / 100,
    total_insurance_estimate: Math.round(agg.ins * 100) / 100,
    total_net_profit: Math.round(agg.profit * 100) / 100,
    total_margin_percent: total_revenue > 0 ? Math.round((agg.profit / total_revenue) * 1000) / 10 : 0,
  };
}

// Need computeOfferProfitability import - will be used from freightService in UI, duplicate calc inline here
function computeOfferProfitability(offer: { distance_km: number; price: number; price_per_km: number }) {
  const km = Math.max(offer.distance_km, 1);
  const revenue = offer.price;
  const fuel = km * 0.32 * 1.85 / 100;
  const toll = km * 0.08;
  const salary = revenue * 0.2;
  const maint = km * 0.05;
  const ins = km * 0.04;
  const costs = fuel + toll + salary + maint + ins + revenue * 0.02;
  const net = revenue - costs;
  return {
    fuel_cost: fuel,
    toll_estimate: toll,
    salary_estimate: salary,
    maintenance_estimate: maint,
    insurance_estimate: ins,
    net_profit: net,
  };
}

export function filterFreightOffers(
  offers: FreightOffer[],
  filters: { search: string; filter: FreightFilterKey; clientId: string },
): FreightOffer[] {
  let list = [...offers];

  if (filters.clientId) {
    list = list.filter(o => o.client_id === filters.clientId);
  }

  const q = filters.search.trim().toLowerCase();
  if (q) {
    list = list.filter(o =>
      o.departure_city.toLowerCase().includes(q) ||
      o.arrival_city.toLowerCase().includes(q) ||
      (o.client_name ?? '').toLowerCase().includes(q) ||
      (o.cargo ?? '').toLowerCase().includes(q) ||
      o.departure_country.toLowerCase().includes(q) ||
      o.arrival_country.toLowerCase().includes(q),
    );
  }

  const in24h = Date.now() + 24 * 60 * 60 * 1000;

  switch (filters.filter) {
    case 'best_profit':
      list.sort((a, b) =>
        (b.profitability?.profit_per_km ?? b.price_per_km) -
        (a.profitability?.profit_per_km ?? a.price_per_km),
      );
      break;
    case 'short_distance':
      list = list.filter(o => o.distance_km < 300);
      break;
    case 'long_distance':
      list = list.filter(o => o.distance_km >= 800);
      break;
    case 'urgent':
      list = list.filter(o => o.priority === 'urgent');
      break;
    case 'refrigerated':
      list = list.filter(o => o.temperature_required);
      break;
    case 'adr':
      list = list.filter(o => o.adr_required);
      break;
    case 'expiring':
      list = list.filter(o => o.expires_at && new Date(o.expires_at).getTime() <= in24h);
      break;
    case 'high_value':
      list = list.filter(o => o.price >= 5000);
      break;
    case 'chained':
      list = list.filter(o => o.chain_id);
      break;
    default:
      break;
  }

  return list;
}
