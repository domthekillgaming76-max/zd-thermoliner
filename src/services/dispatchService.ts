import { supabase } from '../lib/supabase';
import {
  calculateRoadSheetFullEconomics,
  economicsToDbPayload,
} from '../lib/roadSheetCalculations';
import type {
  Client,
  DispatchAlert,
  MissionAssignment,
  MissionFormInput,
  MissionStatus,
  PlanningEvent,
  TransportMission,
} from '../lib/dispatchTypes';
import { computeDispatchAlerts } from '../lib/dispatchTypes';
import { topUpFreightMarketIfNeeded } from './freightTopUpService';

export type { MissionFormInput };

function isDispatchSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

function logDispatchSchemaWarning(context: string, error: { message?: string }) {
  console.warn(
    `[Z&D] Dispatch schema missing (${context}) — apply migration 029_dispatch_planning.sql`,
    error.message,
  );
}

function normalizeMission(row: Record<string, unknown>): TransportMission {
  return {
    id: row.id as string,
    client_id: (row.client_id as string) ?? null,
    reference: (row.reference as string) ?? null,
    client_name: (row.client_name as string) ?? null,
    departure_city: row.departure_city as string,
    arrival_city: row.arrival_city as string,
    loading_date: (row.loading_date as string) ?? null,
    delivery_date: row.delivery_date as string,
    cargo: (row.cargo as string) ?? null,
    weight_kg: Number(row.weight_kg ?? 0),
    pallets: Number(row.pallets ?? 0),
    temperature_required: Boolean(row.temperature_required),
    temperature_min: row.temperature_min != null ? Number(row.temperature_min) : null,
    temperature_max: row.temperature_max != null ? Number(row.temperature_max) : null,
    adr_required: Boolean(row.adr_required),
    distance_km: Number(row.distance_km ?? 0),
    price: Number(row.price ?? 0),
    priority: (row.priority as TransportMission['priority']) ?? 'normal',
    status: (row.status as MissionStatus) ?? 'draft',
    route_notes: (row.route_notes as string) ?? null,
    driver_id: (row.driver_id as string) ?? null,
    truck_id: (row.truck_id as string) ?? null,
    trailer_id: (row.trailer_id as string) ?? null,
    garage_id: (row.garage_id as string) ?? null,
    road_sheet_id: (row.road_sheet_id as string) ?? null,
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? null,
  };
}

function formToPayload(input: MissionFormInput): Record<string, unknown> {
  return {
    client_id: input.client_id || null,
    client_name: input.client_name || null,
    departure_city: input.departure_city,
    arrival_city: input.arrival_city,
    loading_date: input.loading_date || null,
    delivery_date: input.delivery_date,
    cargo: input.cargo || null,
    weight_kg: input.weight_kg ?? 0,
    pallets: input.pallets ?? 0,
    temperature_required: input.temperature_required ?? false,
    temperature_min: input.temperature_min ?? null,
    temperature_max: input.temperature_max ?? null,
    adr_required: input.adr_required ?? false,
    distance_km: input.distance_km ?? 0,
    price: input.price ?? 0,
    priority: input.priority ?? 'normal',
    status: input.status ?? 'draft',
    route_notes: input.route_notes || null,
    updated_at: new Date().toISOString(),
  };
}

async function enrichMissions(missions: TransportMission[]): Promise<TransportMission[]> {
  const [drivers, trucks, trailers, garages] = await Promise.all([
    supabase.from('drivers').select('id, name'),
    supabase.from('trucks').select('id, registration, brand, model'),
    supabase.from('trailers').select('id, registration, type'),
    supabase.from('garages').select('id, name'),
  ]);

  const driverMap = new Map((drivers.data ?? []).map(d => [d.id as string, d.name as string]));
  const truckMap = new Map((trucks.data ?? []).map(t => [t.id as string, `${t.registration} ${t.brand ?? ''}`.trim()]));
  const trailerMap = new Map((trailers.data ?? []).map(t => [t.id as string, `${t.registration} (${t.type})`]));
  const garageMap = new Map((garages.data ?? []).map(g => [g.id as string, g.name as string]));

  return missions.map(m => ({
    ...m,
    driver_name: m.driver_id ? driverMap.get(m.driver_id) ?? null : null,
    truck_label: m.truck_id ? truckMap.get(m.truck_id) ?? null : null,
    trailer_label: m.trailer_id ? trailerMap.get(m.trailer_id) ?? null : null,
    garage_name: m.garage_id ? garageMap.get(m.garage_id) ?? null : null,
  }));
}

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) return [];
  return (data ?? []) as Client[];
}

export async function fetchTransportMissions(): Promise<TransportMission[]> {
  const { data, error } = await supabase.from('transport_missions').select('*').order('delivery_date', { ascending: true });
  if (error) {
    if (isDispatchSchemaError(error)) {
      logDispatchSchemaWarning('transport_missions', error);
      return [];
    }
    throw error;
  }
  return enrichMissions((data ?? []).map(r => normalizeMission(r as Record<string, unknown>)));
}

export async function fetchMissionById(id: string): Promise<TransportMission | null> {
  const { data, error } = await supabase.from('transport_missions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [enriched] = await enrichMissions([normalizeMission(data as Record<string, unknown>)]);
  return enriched;
}

export async function createMission(input: MissionFormInput, createdBy?: string): Promise<TransportMission> {
  const { data, error } = await supabase
    .from('transport_missions')
    .insert({ ...formToPayload(input), created_by: createdBy ?? null })
    .select()
    .single();
  if (error) throw error;
  const mission = normalizeMission(data as Record<string, unknown>);
  await syncPlanningEventForMission(mission);
  const [enriched] = await enrichMissions([mission]);
  return enriched;
}

export async function updateMission(id: string, input: MissionFormInput): Promise<TransportMission> {
  const { data, error } = await supabase.from('transport_missions').update(formToPayload(input)).eq('id', id).select().single();
  if (error) throw error;
  const mission = normalizeMission(data as Record<string, unknown>);
  await syncPlanningEventForMission(mission);
  const [enriched] = await enrichMissions([mission]);
  return enriched;
}

export async function updateMissionStatus(id: string, status: MissionStatus): Promise<TransportMission> {
  const { data, error } = await supabase
    .from('transport_missions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const [enriched] = await enrichMissions([normalizeMission(data as Record<string, unknown>)]);
  return enriched;
}

export async function cancelMission(id: string): Promise<void> {
  await updateMissionStatus(id, 'cancelled');
}

export async function assignMission(
  missionId: string,
  assignment: {
    driverId: string | null;
    truckId: string | null;
    trailerId: string | null;
    garageId: string | null;
    routeNotes?: string;
  },
  assignedBy?: string,
): Promise<TransportMission> {
  await supabase.from('mission_assignments').update({ unassigned_at: new Date().toISOString() })
    .eq('mission_id', missionId).is('unassigned_at', null);

  const status: MissionStatus = assignment.driverId ? 'assigned' : 'planned';

  const { data, error } = await supabase.from('transport_missions').update({
    driver_id: assignment.driverId,
    truck_id: assignment.truckId,
    trailer_id: assignment.trailerId,
    garage_id: assignment.garageId,
    route_notes: assignment.routeNotes ?? null,
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', missionId).select().single();

  if (error) throw error;

  await supabase.from('mission_assignments').insert({
    mission_id: missionId,
    driver_id: assignment.driverId,
    truck_id: assignment.truckId,
    trailer_id: assignment.trailerId,
    garage_id: assignment.garageId,
    route_notes: assignment.routeNotes ?? null,
    assigned_by: assignedBy ?? null,
  });

  if (assignment.driverId && assignment.truckId) {
    await supabase.from('drivers').update({ truck_id: assignment.truckId }).eq('id', assignment.driverId);
    await supabase.from('trucks').update({ driver_id: assignment.driverId }).eq('id', assignment.truckId);
  }

  const mission = normalizeMission(data as Record<string, unknown>);
  await syncPlanningEventForMission(mission);

  if (assignment.driverId && !mission.road_sheet_id) {
    const roadSheetId = await createRoadSheetFromMission(mission);
    if (roadSheetId) {
      await supabase.from('transport_missions').update({
        road_sheet_id: roadSheetId,
        updated_at: new Date().toISOString(),
      }).eq('id', missionId);
      mission.road_sheet_id = roadSheetId;
    }
  }

  const [enriched] = await enrichMissions([mission]);
  return enriched;
}

export async function startMission(missionId: string): Promise<TransportMission> {
  return updateMissionStatus(missionId, 'in_progress');
}

async function createRoadSheetFromMission(mission: TransportMission): Promise<string | null> {
  if (!mission.driver_id) return null;

  const { data: driver } = await supabase
    .from('drivers')
    .select('id, name, user_id, salary_mode, salary_base')
    .eq('id', mission.driver_id)
    .maybeSingle();

  if (!driver) return null;

  const km = mission.distance_km || 1;
  const pricePerKm = km > 0 ? mission.price / km : 0;

  const calcInput = {
    km,
    price_per_km: pricePerKm,
    fuel_price_per_liter: 1.85,
    fuel_consumption_l100: 32,
    toll_cost: 0,
    repair_cost: 0,
    insurance_cost: 0,
    other_expenses: 0,
    driver_salary_mode: (driver.salary_mode as 'percentage' | 'fixed' | 'per_km') ?? 'percentage',
    driver_salary_value: Number(driver.salary_base ?? 20) || 20,
  };

  const economics = calculateRoadSheetFullEconomics(calcInput);
  const economicsPayload = economicsToDbPayload(economics);

  const payload = {
    driver_id: mission.driver_id,
    driver_user_id: driver.user_id ?? null,
    driver_name: driver.name,
    truck_id: mission.truck_id,
    trailer_type: mission.trailer_label ?? null,
    departure: mission.departure_city,
    arrival: mission.arrival_city,
    departure_city: mission.departure_city,
    arrival_city: mission.arrival_city,
    cargo: mission.cargo,
    cargo_type: mission.cargo,
    km,
    total_distance: km,
    price_per_km: pricePerKm,
    validated: false,
    status: 'submitted',
    notes: `Auto — Mission ${mission.reference ?? mission.id.slice(0, 8)}`,
    date: mission.delivery_date,
    ...economicsPayload,
    revenue: mission.price,
  };

  const { data, error } = await supabase.from('road_sheets').insert(payload).select('id').single();
  if (error) {
    console.error('[Z&D] createRoadSheetFromMission:', error.message);
    return null;
  }
  return data.id as string;
}

export async function deliverMission(missionId: string): Promise<TransportMission> {
  const mission = await fetchMissionById(missionId);
  if (!mission) throw new Error('Mission introuvable.');

  let roadSheetId = mission.road_sheet_id;
  if (!roadSheetId) {
    roadSheetId = await createRoadSheetFromMission(mission);
  }

  const { data, error } = await supabase.from('transport_missions').update({
    status: 'delivered',
    road_sheet_id: roadSheetId,
    updated_at: new Date().toISOString(),
  }).eq('id', missionId).select().single();

  if (error) throw error;
  const [enriched] = await enrichMissions([normalizeMission(data as Record<string, unknown>)]);

  void topUpFreightMarketIfNeeded().catch(err => {
    console.warn('[Z&D] freight top-up after delivery:', err);
  });

  return enriched;
}

export async function fetchMissionAssignments(missionId: string): Promise<MissionAssignment[]> {
  const { data, error } = await supabase
    .from('mission_assignments')
    .select('*')
    .eq('mission_id', missionId)
    .order('assigned_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as MissionAssignment[];
}

export async function fetchPlanningEvents(from?: string, to?: string): Promise<PlanningEvent[]> {
  let q = supabase.from('planning_events').select('*').order('start_at');
  if (from) q = q.gte('start_at', from);
  if (to) q = q.lte('start_at', to);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as PlanningEvent[];
}

export async function syncPlanningEventForMission(mission: TransportMission): Promise<void> {
  const title = `${mission.reference ?? 'Mission'} — ${mission.departure_city} → ${mission.arrival_city}`;
  const startAt = `${mission.loading_date ?? mission.delivery_date}T08:00:00`;
  const endAt = `${mission.delivery_date}T18:00:00`;

  const { data: existing } = await supabase
    .from('planning_events')
    .select('id')
    .eq('mission_id', mission.id)
    .maybeSingle();

  const payload = {
    mission_id: mission.id,
    title,
    event_type: 'mission' as const,
    start_at: startAt,
    end_at: endAt,
    all_day: false,
    color: null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from('planning_events').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('planning_events').insert(payload);
  }
}

export async function reschedulePlanningEvent(eventId: string, newStartAt: string, newEndAt?: string): Promise<void> {
  const { error } = await supabase.from('planning_events').update({
    start_at: newStartAt,
    end_at: newEndAt ?? newStartAt,
    updated_at: new Date().toISOString(),
  }).eq('id', eventId);
  if (error) throw error;
}

export async function rescheduleMissionDate(missionId: string, deliveryDate: string, loadingDate?: string): Promise<TransportMission> {
  const { data, error } = await supabase.from('transport_missions').update({
    delivery_date: deliveryDate,
    loading_date: loadingDate ?? deliveryDate,
    updated_at: new Date().toISOString(),
  }).eq('id', missionId).select().single();
  if (error) throw error;
  const mission = normalizeMission(data as Record<string, unknown>);
  await syncPlanningEventForMission(mission);
  const [enriched] = await enrichMissions([mission]);
  return enriched;
}

export async function fetchDispatchAlertsFromDb(): Promise<DispatchAlert[]> {
  const { data, error } = await supabase
    .from('dispatch_alerts')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as DispatchAlert[];
}

export async function syncDispatchAlerts(missions: TransportMission[]): Promise<DispatchAlert[]> {
  const { data: drivers } = await supabase.from('drivers').select('id, has_adr');
  const computed = computeDispatchAlerts(missions, (drivers ?? []) as { id: string; has_adr?: boolean }[]);

  for (const alert of computed) {
    const { data: existing } = await supabase
      .from('dispatch_alerts')
      .select('id')
      .eq('mission_id', alert.mission_id)
      .eq('alert_type', alert.alert_type)
      .eq('resolved', false)
      .maybeSingle();

    if (!existing) {
      await supabase.from('dispatch_alerts').insert({
        mission_id: alert.mission_id,
        alert_type: alert.alert_type,
        message: alert.message,
        severity: alert.severity,
      });
    }
  }

  return fetchDispatchAlertsFromDb();
}

export async function fetchDispatchModuleBundle() {
  const { error: tableProbe } = await supabase.from('transport_missions').select('id').limit(1);
  const migrationRequired = !!tableProbe && isDispatchSchemaError(tableProbe);

  const driversRes = await supabase.from('drivers').select('id, name, status, driving_status, is_suspended, has_adr, truck_id');
  const driversData = driversRes.error?.code === 'PGRST204'
    ? (await supabase.from('drivers').select('id, name, status, truck_id')).data ?? []
    : driversRes.error ? [] : (driversRes.data ?? []);

  const [missions, clients, trucks, trailers, garages, events, assignmentsRaw] = await Promise.all([
    fetchTransportMissions(),
    fetchClients(),
    supabase.from('trucks').select('id, registration, brand, model, status, driver_id'),
    supabase.from('trailers').select('id, registration, type'),
    supabase.from('garages').select('id, name, city'),
    fetchPlanningEvents(),
    supabase.from('mission_assignments').select('*').order('assigned_at', { ascending: false }).limit(200),
  ]);

  if (assignmentsRaw.error && isDispatchSchemaError(assignmentsRaw.error)) {
    logDispatchSchemaWarning('mission_assignments', assignmentsRaw.error);
  }

  let alerts: DispatchAlert[] = [];
  try {
    alerts = await syncDispatchAlerts(missions);
  } catch (err) {
    console.warn('[Z&D] syncDispatchAlerts failed:', err);
  }

  return {
    missions,
    clients: clients as Client[],
    drivers: driversData,
    trucks: trucks.error ? [] : (trucks.data ?? []),
    trailers: trailers.error ? [] : (trailers.data ?? []),
    garages: garages.error ? [] : (garages.data ?? []),
    planningEvents: events,
    assignments: assignmentsRaw.error ? [] : ((assignmentsRaw.data ?? []) as MissionAssignment[]),
    alerts,
    migrationRequired,
  };
}

export async function fetchDriverLinkedIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from('drivers').select('id').eq('user_id', userId);
  return (data ?? []).map(d => d.id as string);
}

export function filterMissionsForUser(
  missions: TransportMission[],
  canViewAll: boolean,
  linkedDriverIds: string[],
): TransportMission[] {
  if (canViewAll) return missions;
  return missions.filter(m => m.driver_id && linkedDriverIds.includes(m.driver_id));
}
