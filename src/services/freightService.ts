import { supabase } from '../lib/supabase';
import {
  calculateRoadSheetFullEconomics,
  DEFAULT_COEFFICIENTS,
  economicsToDbPayload,
} from '../lib/roadSheetCalculations';
import { canManageFreightOffers } from '../lib/freightPermissions';
import type {
  AcceptFreightChainInput,
  AcceptFreightInput,
  FreightBundle,
  FreightChain,
  FreightChainInput,
  FreightChainLeg,
  FreightDashboard,
  FreightOffer,
  FreightOfferInput,
  FreightProfitability,
} from '../lib/freightTypes';
import { computeChainTotals } from '../lib/freightTypes';
import { assignMission, createMission } from './dispatchService';
import { topUpFreightMarketIfNeeded } from './freightTopUpService';

function isFreightSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

export function computeOfferProfitability(offer: Pick<FreightOffer, 'distance_km' | 'price' | 'price_per_km'>): Omit<FreightProfitability, 'id' | 'offer_id' | 'computed_at'> {
  const km = Math.max(offer.distance_km, 1);
  const pricePerKm = offer.price_per_km || offer.price / km;
  const economics = calculateRoadSheetFullEconomics({
    km,
    pricePerKm,
    fuelConsumptionL100: DEFAULT_COEFFICIENTS.fuelConsumptionL100,
    fuelPricePerLiter: DEFAULT_COEFFICIENTS.fuelPricePerLiter,
    tollCost: Math.round(km * DEFAULT_COEFFICIENTS.tollCoeff * 10) / 10,
    repairCost: Math.round(km * DEFAULT_COEFFICIENTS.repairCoeff * 10) / 10,
    insuranceCost: Math.round(km * 0.04 * 10) / 10,
    otherExpenses: Math.round(offer.price * DEFAULT_COEFFICIENTS.expenseCoeff * 100) / 100,
    driverSalaryMode: 'percentage',
    driverSalaryValue: 20,
  });

  return {
    revenue: economics.revenue,
    fuel_cost: economics.fuelCost,
    toll_estimate: economics.tollCost,
    salary_estimate: economics.driverSalary,
    maintenance_estimate: economics.repairCost,
    insurance_estimate: economics.insuranceCost,
    net_profit: economics.netProfit,
    margin_percent: economics.marginPercent,
    cost_per_km: economics.costPerKm,
    profit_per_km: Math.round((economics.netProfit / km) * 100) / 100,
  };
}

function buildDashboard(offers: FreightOffer[]): FreightDashboard {
  const available = offers.filter(o => o.status === 'available');
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;

  const profits = available.map(o => o.profitability?.profit_per_km ?? computeOfferProfitability(o).profit_per_km);

  return {
    availableOffers: available.length,
    highValueContracts: available.filter(o => o.price >= 5000).length,
    urgentDeliveries: available.filter(o => o.priority === 'urgent').length,
    refrigeratedFreight: available.filter(o => o.temperature_required).length,
    adrFreight: available.filter(o => o.adr_required).length,
    longDistanceJobs: available.filter(o => o.distance_km >= 800).length,
    bestProfitPerKm: profits.length ? Math.max(...profits) : 0,
    expiringOffers: available.filter(o => o.expires_at && new Date(o.expires_at).getTime() <= in24h).length,
  };
}

async function attachProfitabilityToLegs(legs: FreightChainLeg[]): Promise<FreightChainLeg[]> {
  if (!legs.length) return legs;
  const ids = legs.map(l => l.id);
  const { data } = await supabase.from('freight_profitability').select('*').in('offer_id', ids);
  const map = new Map((data ?? []).map(p => [p.offer_id as string, p as FreightProfitability]));
  return legs.map(l => ({
    ...l,
    profitability: map.get(l.id) ?? computeOfferProfitability(l) as FreightProfitability,
  }));
}

async function buildChains(chainRows: Record<string, unknown>[], allOffers: FreightOffer[]): Promise<FreightChain[]> {
  const chains: FreightChain[] = [];
  for (const row of chainRows) {
    const chainId = row.id as string;
    const rawLegs = allOffers
      .filter(o => o.chain_id === chainId)
      .sort((a, b) => (a.leg_order ?? 0) - (b.leg_order ?? 0));

    const legs: FreightChainLeg[] = rawLegs.map(o => ({
      id: o.id,
      leg_order: o.leg_order ?? 1,
      leg_locked: o.leg_locked ?? false,
      departure_city: o.departure_city,
      arrival_city: o.arrival_city,
      cargo: o.cargo,
      distance_km: o.distance_km,
      price: o.price,
      price_per_km: o.price_per_km,
      deadline_at: o.deadline_at,
      delivery_date: o.delivery_date,
      status: o.status,
      mission_id: o.mission_id,
    }));

    const enrichedLegs = await attachProfitabilityToLegs(legs);
    chains.push({
      id: chainId,
      title: row.title as string,
      client_id: (row.client_id as string) ?? null,
      client_name: (row.client_name as string) ?? null,
      status: row.status as FreightChain['status'],
      driver_id: (row.driver_id as string) ?? null,
      truck_id: (row.truck_id as string) ?? null,
      trailer_id: (row.trailer_id as string) ?? null,
      current_leg_order: Number(row.current_leg_order ?? 1),
      total_distance_km: Number(row.total_distance_km ?? 0),
      total_revenue: Number(row.total_revenue ?? 0),
      total_fuel_cost: Number(row.total_fuel_cost ?? 0),
      total_toll_estimate: Number(row.total_toll_estimate ?? 0),
      total_salary_estimate: Number(row.total_salary_estimate ?? 0),
      total_maintenance_estimate: Number(row.total_maintenance_estimate ?? 0),
      total_insurance_estimate: Number(row.total_insurance_estimate ?? 0),
      total_net_profit: Number(row.total_net_profit ?? 0),
      total_margin_percent: Number(row.total_margin_percent ?? 0),
      priority: row.priority as FreightChain['priority'],
      expires_at: (row.expires_at as string) ?? null,
      notes: (row.notes as string) ?? null,
      legs: enrichedLegs,
      created_at: row.created_at as string,
    });
  }
  return chains;
}

async function attachProfitability(offers: FreightOffer[]): Promise<FreightOffer[]> {
  if (!offers.length) return offers;
  const ids = offers.map(o => o.id);
  const { data } = await supabase.from('freight_profitability').select('*').in('offer_id', ids);
  const map = new Map((data ?? []).map(p => [p.offer_id as string, p as FreightProfitability]));
  return offers.map(o => ({
    ...o,
    profitability: map.get(o.id) ?? computeOfferProfitability(o) as FreightProfitability,
  }));
}

async function upsertProfitability(offerId: string, offer: FreightOffer): Promise<void> {
  const calc = computeOfferProfitability(offer);
  await supabase.from('freight_profitability').upsert({
    offer_id: offerId,
    ...calc,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'offer_id' });
}

export async function fetchFreightBundle(
  _userId: string,
  role?: string | null,
  email?: string | null,
): Promise<FreightBundle> {
  const { error: probe } = await supabase.from('freight_offers').select('id').limit(1);
  const migrationRequired = !!probe && isFreightSchemaError(probe);

  if (migrationRequired) {
    return {
      dashboard: {
        availableOffers: 0, highValueContracts: 0, urgentDeliveries: 0,
        refrigeratedFreight: 0, adrFreight: 0, longDistanceJobs: 0,
        bestProfitPerKm: 0, expiringOffers: 0,
      },
      offers: [],
      chains: [],
      clients: [],
      drivers: [],
      trucks: [],
      trailers: [],
      migrationRequired: true,
    };
  }

  if (canManageFreightOffers(role, email)) {
    await supabase.rpc('expire_freight_offers');
  }

  const [offersRes, chainsRes, clientsRes, driversRes, trucksRes, trailersRes] = await Promise.all([
    supabase.from('freight_offers').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('freight_chains').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('drivers').select('id, name, truck_id').eq('is_active_driver', true).order('name'),
    supabase.from('trucks').select('id, registration, brand, model').eq('status', 'active').order('registration'),
    supabase.from('trailers').select('id, registration, type').order('registration'),
  ]);

  if (offersRes.error && !isFreightSchemaError(offersRes.error)) throw offersRes.error;

  const allOffers = await attachProfitability((offersRes.data ?? []) as FreightOffer[]);
  const standaloneOffers = allOffers.filter(o => !o.chain_id);
  const chains = chainsRes.error && isFreightSchemaError(chainsRes.error)
    ? []
    : await buildChains((chainsRes.data ?? []) as Record<string, unknown>[], allOffers);

  return {
    dashboard: buildDashboard([...standaloneOffers, ...allOffers.filter(o => o.chain_id && o.leg_order === 1)]),
    offers: standaloneOffers,
    chains,
    clients: (clientsRes.data ?? []).map(c => ({ id: c.id as string, name: c.name as string })),
    drivers: (driversRes.data ?? []).map(d => ({
      id: d.id as string,
      name: d.name as string,
      truck_id: d.truck_id as string | null,
    })),
    trucks: (trucksRes.data ?? []).map(t => ({
      id: t.id as string,
      label: [t.brand, t.model, t.registration].filter(Boolean).join(' '),
    })),
    trailers: (trailersRes.data ?? []).map(t => ({
      id: t.id as string,
      label: `${t.type} (${t.registration})`,
    })),
    migrationRequired: false,
  };
}

export async function createFreightOffer(
  userId: string,
  input: FreightOfferInput,
): Promise<FreightOffer> {
  const pricePerKm = input.distance_km > 0 ? input.price / input.distance_km : 0;
  const { data, error } = await supabase
    .from('freight_offers')
    .insert({
      ...input,
      price_per_km: Math.round(pricePerKm * 10000) / 10000,
      status: 'available',
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  const offer = data as FreightOffer;
  await upsertProfitability(offer.id, offer);
  return offer;
}

export async function updateFreightOffer(id: string, input: Partial<FreightOfferInput>): Promise<FreightOffer> {
  const payload: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
  if (input.price != null && input.distance_km != null && input.distance_km > 0) {
    payload.price_per_km = Math.round((input.price / input.distance_km) * 10000) / 10000;
  }
  const { data, error } = await supabase.from('freight_offers').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  const offer = data as FreightOffer;
  await upsertProfitability(offer.id, offer);
  return offer;
}

export async function deleteFreightOffer(id: string): Promise<void> {
  const { error } = await supabase.from('freight_offers').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateFreightOffer(id: string, userId: string): Promise<FreightOffer> {
  const { data: src, error } = await supabase.from('freight_offers').select('*').eq('id', id).maybeSingle();
  if (error || !src) throw new Error('Offre introuvable.');
  const row = src as FreightOffer;
  return createFreightOffer(userId, {
    client_id: row.client_id,
    client_name: row.client_name ?? undefined,
    departure_city: row.departure_city,
    arrival_city: row.arrival_city,
    departure_country: row.departure_country,
    arrival_country: row.arrival_country,
    cargo: row.cargo ?? undefined,
    weight_kg: row.weight_kg,
    pallets: row.pallets,
    temperature_required: row.temperature_required,
    temperature_min: row.temperature_min,
    temperature_max: row.temperature_max,
    adr_required: row.adr_required,
    distance_km: row.distance_km,
    price: row.price,
    loading_date: row.loading_date,
    delivery_date: row.delivery_date,
    priority: row.priority,
    deadline_at: row.deadline_at,
    expires_at: row.expires_at,
    notes: row.notes ? `Copie — ${row.notes}` : 'Copie',
  });
}

export async function cancelFreightOffer(id: string): Promise<void> {
  await supabase.from('freight_offers').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

async function createRoadSheetDraft(
  missionId: string,
  offer: FreightOffer,
  driverId: string,
  truckId: string | null,
): Promise<string | null> {
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, name, user_id, salary_mode, salary_base')
    .eq('id', driverId)
    .maybeSingle();
  if (!driver) return null;

  const km = offer.distance_km || 1;
  const economics = calculateRoadSheetFullEconomics({
    km,
    pricePerKm: offer.price_per_km,
    fuelConsumptionL100: 32,
    fuelPricePerLiter: 1.85,
    tollCost: computeOfferProfitability(offer).toll_estimate,
    repairCost: computeOfferProfitability(offer).maintenance_estimate,
    insuranceCost: computeOfferProfitability(offer).insurance_estimate,
    otherExpenses: 0,
    driverSalaryMode: (driver.salary_mode as 'percentage') ?? 'percentage',
    driverSalaryValue: Number(driver.salary_base ?? 20),
  });

  const { data, error } = await supabase.from('road_sheets').insert({
    driver_id: driverId,
    driver_user_id: driver.user_id,
    driver_name: driver.name,
    truck_id: truckId,
    departure: offer.departure_city,
    arrival: offer.arrival_city,
    departure_city: offer.departure_city,
    arrival_city: offer.arrival_city,
    cargo: offer.cargo,
    cargo_type: offer.cargo,
    km,
    total_distance: km,
    price_per_km: offer.price_per_km,
    validated: false,
    status: 'draft',
    notes: `Brouillon auto — Fret ${offer.id.slice(0, 8)} / Mission ${missionId.slice(0, 8)}`,
    date: offer.delivery_date,
    ...economicsToDbPayload(economics),
    revenue: offer.price,
  }).select('id').single();

  if (error) {
    console.error('[Z&D Freight] road sheet draft:', error.message);
    return null;
  }
  return data.id as string;
}

export async function acceptFreightOffer(
  userId: string,
  input: AcceptFreightInput,
  role?: string | null,
  email?: string | null,
): Promise<{ missionId: string; roadSheetId: string | null }> {
  if (!canManageFreightOffers(role, email)) {
    throw new Error('Seuls admin/dispatcher peuvent accepter une offre.');
  }

  const { data: offer, error: fetchErr } = await supabase
    .from('freight_offers')
    .select('*')
    .eq('id', input.offerId)
    .maybeSingle();

  if (fetchErr || !offer) throw new Error('Offre introuvable.');
  const o = offer as FreightOffer;
  if (o.leg_locked) {
    throw new Error('Cette étape est verrouillée — terminez l\'étape précédente d\'abord.');
  }
  if (o.chain_id) {
    throw new Error('Cette offre fait partie d\'une chaîne — acceptez le tour complet.');
  }
  if (!['available', 'reserved'].includes(o.status)) {
    throw new Error('Cette offre n\'est plus disponible.');
  }

  if (!input.driverId) {
    throw new Error('Sélectionnez un chauffeur pour accepter la mission et créer la feuille de route.');
  }

  const mission = await createMission({
    client_id: o.client_id ?? undefined,
    client_name: o.client_name ?? undefined,
    departure_city: o.departure_city,
    arrival_city: o.arrival_city,
    loading_date: o.loading_date ?? undefined,
    delivery_date: o.delivery_date,
    cargo: o.cargo ?? undefined,
    weight_kg: o.weight_kg,
    pallets: o.pallets,
    temperature_required: o.temperature_required,
    temperature_min: o.temperature_min ?? undefined,
    temperature_max: o.temperature_max ?? undefined,
    adr_required: o.adr_required,
    distance_km: o.distance_km,
    price: o.price,
    priority: o.priority,
    status: input.driverId ? 'assigned' : 'planned',
    route_notes: o.notes ?? `Fret ${o.id.slice(0, 8)}`,
  }, userId);

  let roadSheetId: string | null = null;

  if (input.driverId) {
    await assignMission(mission.id, {
      driverId: input.driverId,
      truckId: input.truckId ?? null,
      trailerId: input.trailerId ?? null,
      garageId: null,
      routeNotes: o.notes ?? undefined,
    }, userId);

    roadSheetId = await createRoadSheetDraft(mission.id, o, input.driverId, input.truckId ?? null);

    const { data: driver } = await supabase.from('drivers').select('user_id, name').eq('id', input.driverId).maybeSingle();
    if (driver?.user_id) {
      await supabase.from('notifications').insert({
        user_id: driver.user_id,
        title: 'Nouvelle mission assignée',
        message: `${o.departure_city} → ${o.arrival_city} — ${o.cargo ?? 'Fret'}`,
        type: 'info',
      });
    }
  }

  await supabase.from('freight_offer_assignments').insert({
    offer_id: o.id,
    driver_id: input.driverId ?? null,
    truck_id: input.truckId ?? null,
    trailer_id: input.trailerId ?? null,
    mission_id: mission.id,
    assigned_by: userId,
  });

  await supabase.from('freight_offers').update({
    status: 'assigned',
    mission_id: mission.id,
    road_sheet_id: roadSheetId,
    updated_at: new Date().toISOString(),
  }).eq('id', o.id);

  return { missionId: mission.id, roadSheetId };
}

export async function createFreightChain(
  userId: string,
  input: FreightChainInput,
): Promise<FreightChain> {
  if (input.legs.length < 2) {
    throw new Error('Une chaîne doit contenir au moins 2 étapes.');
  }

  const legs = input.legs.map((leg, i) => {
    if (i > 0 && leg.departure_city.trim().toLowerCase() !== input.legs[i - 1].arrival_city.trim().toLowerCase()) {
      return { ...leg, departure_city: input.legs[i - 1].arrival_city };
    }
    return leg;
  });

  const totals = computeChainTotals(legs.map(l => ({ distance_km: l.distance_km, price: l.price })));

  const { data: chain, error: chainErr } = await supabase
    .from('freight_chains')
    .insert({
      title: input.title,
      client_id: input.client_id ?? null,
      client_name: input.client_name ?? null,
      status: 'available',
      priority: input.priority ?? 'normal',
      expires_at: input.expires_at ?? null,
      notes: input.notes ?? null,
      created_by: userId,
      ...totals,
    })
    .select('*')
    .single();

  if (chainErr || !chain) throw chainErr ?? new Error('Erreur création chaîne.');

  const chainId = chain.id as string;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const pricePerKm = leg.distance_km > 0 ? leg.price / leg.distance_km : 0;
    const { data: offer, error: legErr } = await supabase
      .from('freight_offers')
      .insert({
        chain_id: chainId,
        leg_order: i + 1,
        leg_locked: i > 0,
        client_id: input.client_id ?? null,
        client_name: input.client_name ?? null,
        departure_city: leg.departure_city,
        arrival_city: leg.arrival_city,
        cargo: leg.cargo ?? null,
        distance_km: leg.distance_km,
        price: leg.price,
        price_per_km: Math.round(pricePerKm * 10000) / 10000,
        deadline_at: leg.deadline_at ?? null,
        delivery_date: leg.delivery_date,
        priority: input.priority ?? 'normal',
        status: i === 0 ? 'available' : 'reserved',
        expires_at: input.expires_at ?? null,
        notes: `Étape ${i + 1} — ${input.title}`,
        created_by: userId,
      })
      .select('*')
      .single();

    if (legErr || !offer) throw legErr ?? new Error(`Erreur étape ${i + 1}.`);
    await upsertProfitability(offer.id as string, offer as FreightOffer);
  }

  const bundle = await fetchFreightBundle(userId);
  const created = bundle.chains.find(c => c.id === chainId);
  if (!created) throw new Error('Chaîne créée mais introuvable.');
  return created;
}

export async function acceptFreightChain(
  userId: string,
  input: AcceptFreightChainInput,
  role?: string | null,
  email?: string | null,
): Promise<{ missionIds: string[] }> {
  if (!canManageFreightOffers(role, email)) {
    throw new Error('Seuls admin/dispatcher peuvent accepter une chaîne.');
  }

  const { data: chain, error: chainErr } = await supabase
    .from('freight_chains')
    .select('*')
    .eq('id', input.chainId)
    .maybeSingle();

  if (chainErr || !chain) throw new Error('Chaîne introuvable.');
  if (chain.status !== 'available') throw new Error('Cette chaîne n\'est plus disponible.');

  const { data: legs, error: legsErr } = await supabase
    .from('freight_offers')
    .select('*')
    .eq('chain_id', input.chainId)
    .order('leg_order');

  if (legsErr || !legs?.length) throw new Error('Étapes introuvables.');

  const missionIds: string[] = [];
  const sortedLegs = legs as FreightOffer[];

  for (let i = 0; i < sortedLegs.length; i++) {
    const o = sortedLegs[i];
    const isFirst = i === 0;
    const mission = await createMission({
      client_id: o.client_id ?? undefined,
      client_name: o.client_name ?? undefined,
      departure_city: o.departure_city,
      arrival_city: o.arrival_city,
      loading_date: o.loading_date ?? undefined,
      delivery_date: o.delivery_date,
      cargo: o.cargo ?? undefined,
      weight_kg: o.weight_kg,
      pallets: o.pallets,
      temperature_required: o.temperature_required,
      temperature_min: o.temperature_min ?? undefined,
      temperature_max: o.temperature_max ?? undefined,
      adr_required: o.adr_required,
      distance_km: o.distance_km,
      price: o.price,
      priority: o.priority,
      status: isFirst && input.driverId ? 'assigned' : 'planned',
      route_notes: `Chaîne ${(chain.title as string).slice(0, 20)} — Étape ${i + 1}/${sortedLegs.length}`,
    }, userId);

    missionIds.push(mission.id);

    if (isFirst && input.driverId) {
      await assignMission(mission.id, {
        driverId: input.driverId,
        truckId: input.truckId ?? null,
        trailerId: input.trailerId ?? null,
        garageId: null,
        routeNotes: (chain.notes as string) ?? undefined,
      }, userId);

      await createRoadSheetDraft(mission.id, o, input.driverId, input.truckId ?? null);
    }

    await supabase.from('freight_offer_assignments').insert({
      offer_id: o.id,
      driver_id: input.driverId ?? null,
      truck_id: input.truckId ?? null,
      trailer_id: input.trailerId ?? null,
      mission_id: mission.id,
      assigned_by: userId,
    });

    await supabase.from('freight_offers').update({
      status: isFirst ? 'assigned' : 'reserved',
      leg_locked: !isFirst,
      mission_id: mission.id,
      updated_at: new Date().toISOString(),
    }).eq('id', o.id);
  }

  await supabase.from('freight_chains').update({
    status: 'assigned',
    driver_id: input.driverId ?? null,
    truck_id: input.truckId ?? null,
    trailer_id: input.trailerId ?? null,
    current_leg_order: 1,
    updated_at: new Date().toISOString(),
  }).eq('id', input.chainId);

  if (input.driverId) {
    const first = sortedLegs[0];
    const { data: driver } = await supabase.from('drivers').select('user_id').eq('id', input.driverId).maybeSingle();
    if (driver?.user_id) {
      await supabase.from('notifications').insert({
        user_id: driver.user_id,
        title: 'Tour chaîné assigné',
        message: `${chain.title} — ${sortedLegs.length} étapes. Départ: ${first.departure_city}`,
        type: 'info',
      });
    }
  }

  return { missionIds };
}

export async function completeChainLeg(
  chainId: string,
  legOrder: number,
  role?: string | null,
  email?: string | null,
): Promise<void> {
  if (!canManageFreightOffers(role, email)) {
    throw new Error('Seuls admin/dispatcher peuvent valider une étape.');
  }

  const { data: chain } = await supabase.from('freight_chains').select('current_leg_order').eq('id', chainId).maybeSingle();
  if (!chain) throw new Error('Chaîne introuvable.');
  if (Number(chain.current_leg_order) !== legOrder) {
    throw new Error(`Seule l'étape ${chain.current_leg_order} peut être validée.`);
  }

  const { data: leg } = await supabase
    .from('freight_offers')
    .select('id, mission_id')
    .eq('chain_id', chainId)
    .eq('leg_order', legOrder)
    .maybeSingle();

  if (!leg) throw new Error('Étape introuvable.');

  if (leg.mission_id) {
    await supabase.from('transport_missions').update({
      status: 'delivered',
      updated_at: new Date().toISOString(),
    }).eq('id', leg.mission_id);
  }

  await supabase.rpc('advance_freight_chain_leg', {
    p_chain_id: chainId,
    p_completed_leg: legOrder,
  });

  const nextOrder = legOrder + 1;
  const { data: nextLeg } = await supabase
    .from('freight_offers')
    .select('id, mission_id, departure_city, arrival_city')
    .eq('chain_id', chainId)
    .eq('leg_order', nextOrder)
    .maybeSingle();

  if (nextLeg?.mission_id) {
    const { data: chainFull } = await supabase.from('freight_chains').select('driver_id, truck_id, trailer_id').eq('id', chainId).maybeSingle();
    if (chainFull?.driver_id) {
      await assignMission(nextLeg.mission_id as string, {
        driverId: chainFull.driver_id as string,
        truckId: (chainFull.truck_id as string) ?? null,
        trailerId: (chainFull.trailer_id as string) ?? null,
        garageId: null,
      }, undefined);

      await supabase.from('freight_offers').update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      }).eq('id', nextLeg.id);

      const { data: driver } = await supabase.from('drivers').select('user_id').eq('id', chainFull.driver_id).maybeSingle();
      if (driver?.user_id) {
        await supabase.from('notifications').insert({
          user_id: driver.user_id,
          title: 'Prochaine étape débloquée',
          message: `${nextLeg.departure_city} → ${nextLeg.arrival_city}`,
          type: 'info',
        });
      }
    }
  }

  void topUpFreightMarketIfNeeded().catch(err => {
    console.warn('[Z&D] freight top-up after chain leg:', err);
  });
}

export async function cancelFreightChain(chainId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('freight_chains').update({ status: 'cancelled', updated_at: now }).eq('id', chainId);
  await supabase.from('freight_offers').update({ status: 'cancelled', updated_at: now }).eq('chain_id', chainId);
}

export async function requestFreightAssignment(
  userId: string,
  offerId: string,
  driverId: string,
  message?: string,
): Promise<void> {
  const { error } = await supabase.from('freight_offer_requests').insert({
    offer_id: offerId,
    driver_id: driverId,
    user_id: userId,
    message: message ?? null,
    status: 'pending',
  });
  if (error) throw error;

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['pdg', 'patron', 'admin', 'dispatcher'])
    .limit(5);

  for (const admin of admins ?? []) {
    await supabase.from('notifications').insert({
      user_id: admin.id,
      title: 'Demande d\'assignation fret',
      message: message?.slice(0, 120) ?? 'Un chauffeur souhaite prendre une offre.',
      type: 'info',
    });
  }
}
