import { supabase } from '../lib/supabase';
import {
  computeEtaMinutes,
  haversineKm,
  interpolatePosition,
  resolveCityCoords,
} from '../lib/trackingMapCoords';
import { canViewAllTracking } from '../lib/trackingPermissions';
import type {
  DeliveryTracking,
  GpsPosition,
  MapMarker,
  RouteProgressEntry,
  TrackingAlert,
  TrackingAlertType,
  TrackingBundle,
  TrackingDashboard,
  TrackingSource,
  TrackingStatus,
} from '../lib/trackingTypes';
import { fetchDriverByUserId } from './roadSheetService';
import type { TransportMission } from '../lib/dispatchTypes';

function isTrackingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

function missionToTrackingStatus(missionStatus: string, deliveryDate: string): TrackingStatus {
  if (missionStatus === 'cancelled') return 'cancelled';
  if (missionStatus === 'delivered') return 'delivered';
  const late = new Date(deliveryDate) < new Date();
  if (late && missionStatus === 'in_progress') return 'late';
  if (missionStatus === 'in_progress') return 'on_route';
  if (missionStatus === 'assigned') return 'loading';
  if (missionStatus === 'planned') return 'planned';
  return 'planned';
}

function computeProgressFromPosition(
  depLat: number,
  depLng: number,
  arrLat: number,
  arrLng: number,
  curLat: number,
  curLng: number,
  totalKm: number,
): { progress: number; remaining: number } {
  const traveled = haversineKm(depLat, depLng, curLat, curLng);
  const total = totalKm > 0 ? totalKm : haversineKm(depLat, depLng, arrLat, arrLng);
  const progress = total > 0 ? Math.min(100, Math.round((traveled / total) * 1000) / 10) : 0;
  const remaining = Math.max(0, Math.round((total - traveled) * 10) / 10);
  return { progress, remaining };
}

const TRACKING_SALON_REMOVED_STATUSES: TrackingStatus[] = [
  'delivered',
  'cancelled',
  'paused',
  'on_route',
  'late',
];

async function deleteTrackingRecordsByStatus(statuses: TrackingStatus[]): Promise<void> {
  if (statuses.length === 0) return;
  const { error } = await supabase
    .from('delivery_tracking')
    .delete()
    .in('status', statuses);
  if (error && !isTrackingSchemaError(error)) {
    console.warn('[Z&D] deleteTrackingRecordsByStatus', error.message);
  }
}

/** Supprime l'historique livré + tous les fret en pause / en route du salon GPS. */
async function purgeTrackingSalon(): Promise<void> {
  await deleteTrackingRecordsByStatus([
    'delivered',
    'cancelled',
    'paused',
    'on_route',
    'late',
  ]);
}

async function deleteTrackingRecord(trackingId: string): Promise<void> {
  const { error } = await supabase.from('delivery_tracking').delete().eq('id', trackingId);
  if (error) throw error;
}

async function syncMissionsToTracking(missions: TransportMission[]): Promise<void> {
  const active = missions.filter(m =>
    ['planned', 'assigned'].includes(m.status),
  );
  if (active.length === 0) return;

  const { data: existing } = await supabase
    .from('delivery_tracking')
    .select('id, mission_id')
    .in('mission_id', active.map(m => m.id));

  const existingIds = new Set((existing ?? []).map(e => e.mission_id as string));

  for (const mission of active) {
    if (existingIds.has(mission.id)) continue;

    const dep = resolveCityCoords(mission.departure_city);
    const arr = resolveCityCoords(mission.arrival_city);
    const distance = mission.distance_km > 0
      ? mission.distance_km
      : dep && arr
        ? haversineKm(dep.lat, dep.lng, arr.lat, arr.lng)
        : 0;

    const status = missionToTrackingStatus(mission.status, mission.delivery_date);
    const progress = status === 'on_route' || status === 'late' ? 15 : status === 'loading' ? 5 : 0;
    const pos = dep && arr ? interpolatePosition(dep, arr, progress) : dep ?? arr ?? { lat: 48.85, lng: 2.35 };

    await supabase.from('delivery_tracking').insert({
      mission_id: mission.id,
      driver_id: mission.driver_id,
      truck_id: mission.truck_id,
      trailer_id: mission.trailer_id,
      departure_city: mission.departure_city,
      arrival_city: mission.arrival_city,
      departure_lat: dep?.lat ?? null,
      departure_lng: dep?.lng ?? null,
      arrival_lat: arr?.lat ?? null,
      arrival_lng: arr?.lng ?? null,
      current_lat: pos.lat,
      current_lng: pos.lng,
      cargo: mission.cargo,
      distance_km: distance,
      remaining_km: distance * (1 - progress / 100),
      progress_percent: progress,
      status,
      delivery_date: mission.delivery_date,
      eta_at: computeEtaMinutes(distance * (1 - progress / 100), status)
        ? new Date(Date.now() + computeEtaMinutes(distance * (1 - progress / 100), status)! * 60000).toISOString()
        : null,
      source: 'simulated',
      is_active: true,
    });
  }
}

async function enrichDeliveries(rows: DeliveryTracking[]): Promise<DeliveryTracking[]> {
  const driverIds = [...new Set(rows.map(r => r.driver_id).filter(Boolean))] as string[];
  const truckIds = [...new Set(rows.map(r => r.truck_id).filter(Boolean))] as string[];
  const trailerIds = [...new Set(rows.map(r => r.trailer_id).filter(Boolean))] as string[];

  const [driversRes, trucksRes, trailersRes, positionsRes] = await Promise.all([
    driverIds.length ? supabase.from('drivers').select('id, name').in('id', driverIds) : { data: [] },
    truckIds.length ? supabase.from('trucks').select('id, registration, brand, model').in('id', truckIds) : { data: [] },
    trailerIds.length ? supabase.from('trailers').select('id, registration, type').in('id', trailerIds) : { data: [] },
    rows.length
      ? supabase.from('gps_positions').select('tracking_id, is_moving, recorded_at').in('tracking_id', rows.map(r => r.id)).order('recorded_at', { ascending: false })
      : { data: [] },
  ]);

  const driverMap = new Map((driversRes.data ?? []).map(d => [d.id as string, d.name as string]));
  const truckMap = new Map(
    (trucksRes.data ?? []).map(t => [t.id as string, [t.brand, t.model, t.registration].filter(Boolean).join(' ')]),
  );
  const trailerMap = new Map(
    (trailersRes.data ?? []).map(t => [t.id as string, `${t.type} (${t.registration})`]),
  );

  const latestPos = new Map<string, { is_moving: boolean }>();
  for (const p of positionsRes.data ?? []) {
    const tid = p.tracking_id as string;
    if (!latestPos.has(tid)) latestPos.set(tid, { is_moving: Boolean(p.is_moving) });
  }

  return rows.map(row => {
    let status = row.status;
    if (row.delivery_date && new Date(row.delivery_date) < new Date() && !['delivered', 'cancelled', 'arrived'].includes(status)) {
      status = 'late';
    }
    return {
      ...row,
      status,
      driver_name: row.driver_id ? driverMap.get(row.driver_id) ?? null : null,
      truck_label: row.truck_id ? truckMap.get(row.truck_id) ?? null : null,
      trailer_label: row.trailer_id ? trailerMap.get(row.trailer_id) ?? null : null,
      is_moving: latestPos.get(row.id)?.is_moving ?? row.status === 'on_route',
    };
  });
}

function buildDashboard(deliveries: DeliveryTracking[]): TrackingDashboard {
  const active = deliveries.filter(d => d.is_active && !['delivered', 'cancelled'].includes(d.status));
  return {
    activeDeliveries: active.length,
    driversOnRoute: active.filter(d => d.status === 'on_route' || d.status === 'late').length,
    trucksMoving: active.filter(d => d.is_moving).length,
    trucksStopped: active.filter(d => !d.is_moving && ['on_route', 'paused', 'loading'].includes(d.status)).length,
    lateDeliveries: deliveries.filter(d => d.status === 'late').length,
    estimatedArrivals: active.filter(d => d.eta_at).length,
  };
}

async function buildAlerts(deliveries: DeliveryTracking[]): Promise<TrackingAlert[]> {
  const alerts: Omit<TrackingAlert, 'id' | 'created_at'>[] = [];
  const now = Date.now();

  for (const d of deliveries) {
    if (d.status === 'late') {
      alerts.push({
        tracking_id: d.id,
        alert_type: 'late_delivery',
        severity: 'danger',
        message: `${d.departure_city} → ${d.arrival_city} — livraison en retard`,
        acknowledged: false,
      });
    }
    if (d.status === 'paused' && d.paused_at) {
      const pausedMs = now - new Date(d.paused_at).getTime();
      if (pausedMs > 2 * 60 * 60 * 1000) {
        alerts.push({
          tracking_id: d.id,
          alert_type: 'driver_paused',
          severity: 'warning',
          message: `${d.driver_name ?? 'Chauffeur'} en pause prolongée`,
          acknowledged: false,
        });
      }
    }
    if (d.status === 'on_route' && d.is_moving === false) {
      alerts.push({
        tracking_id: d.id,
        alert_type: 'truck_stopped',
        severity: 'warning',
        message: `Camion arrêté — ${d.truck_label ?? 'véhicule'}`,
        acknowledged: false,
      });
    }
    const lastUpdate = now - new Date(d.last_status_at).getTime();
    if (lastUpdate > 4 * 60 * 60 * 1000 && !['delivered', 'cancelled'].includes(d.status)) {
      alerts.push({
        tracking_id: d.id,
        alert_type: 'no_status_update',
        severity: 'info',
        message: `Pas de mise à jour depuis 4h — ${d.driver_name ?? 'chauffeur'}`,
        acknowledged: false,
      });
    }
    if (d.remaining_km > 0 && d.remaining_km < 50 && ['on_route', 'late'].includes(d.status)) {
      alerts.push({
        tracking_id: d.id,
        alert_type: 'arrival_soon',
        severity: 'info',
        message: `Arrivée imminente (${d.remaining_km} km) — ${d.arrival_city}`,
        acknowledged: false,
      });
    }
    if (d.status === 'delivered') {
      continue;
    }
  }

  const { data: stored } = await supabase
    .from('tracking_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(20);

  const storedAlerts = (stored ?? []) as TrackingAlert[];

  if (storedAlerts.length > 0) return storedAlerts;

  return alerts.slice(0, 20).map((a, i) => ({
    ...a,
    id: `computed-${i}`,
    created_at: new Date().toISOString(),
  }));
}

async function ensureMapMarkers(): Promise<MapMarker[]> {
  const { data: existing } = await supabase.from('map_markers').select('id').limit(1);
  if (!existing?.length) {
    const [garagesRes, clientsRes] = await Promise.all([
      supabase.from('garages').select('id, name, city, latitude, longitude').eq('is_active', true),
      supabase.from('clients').select('id, name, city, address'),
    ]);

    const inserts: Record<string, unknown>[] = [];
    for (const g of garagesRes.data ?? []) {
      const coords = g.latitude && g.longitude
        ? { lat: Number(g.latitude), lng: Number(g.longitude) }
        : resolveCityCoords(g.city as string);
      if (coords) {
        inserts.push({
          marker_type: 'garage',
          ref_id: g.id,
          label: g.name,
          city: g.city,
          lat: coords.lat,
          lng: coords.lng,
          icon: 'garage',
        });
      }
    }
    for (const c of clientsRes.data ?? []) {
      const coords = resolveCityCoords(c.city as string ?? '');
      if (coords) {
        inserts.push({
          marker_type: 'client',
          ref_id: c.id,
          label: c.name,
          city: c.city,
          lat: coords.lat,
          lng: coords.lng,
          icon: 'client',
        });
      }
    }
    if (inserts.length) {
      await supabase.from('map_markers').insert(inserts);
    }
  }

  const { data } = await supabase.from('map_markers').select('*').eq('is_active', true);
  return (data ?? []) as MapMarker[];
}

export async function fetchTrackingBundle(
  userId: string,
  role?: string | null,
  email?: string | null,
): Promise<TrackingBundle> {
  const { error: probe } = await supabase.from('delivery_tracking').select('id').limit(1);
  const migrationRequired = !!probe && isTrackingSchemaError(probe);

  if (migrationRequired) {
    return {
      dashboard: {
        activeDeliveries: 0,
        driversOnRoute: 0,
        trucksMoving: 0,
        trucksStopped: 0,
        lateDeliveries: 0,
        estimatedArrivals: 0,
      },
      deliveries: [],
      positions: [],
      alerts: [],
      markers: [],
      progressHistory: [],
      migrationRequired: true,
    };
  }

  const { data: missions } = await supabase
    .from('transport_missions')
    .select('*')
    .in('status', ['planned', 'assigned', 'in_progress']);

  if (canViewAllTracking(role, email)) {
    await purgeTrackingSalon();
    await syncMissionsToTracking((missions ?? []) as TransportMission[]);
  }

  const deliveriesQuery = supabase
    .from('delivery_tracking')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);

  const { data: deliveriesRaw, error: delError } = await deliveriesQuery;
  if (delError && !isTrackingSchemaError(delError)) throw delError;

  let deliveries = await enrichDeliveries((deliveriesRaw ?? []) as DeliveryTracking[]);

  if (!canViewAllTracking(role, email)) {
    const driver = await fetchDriverByUserId(userId);
    if (driver) {
      deliveries = deliveries.filter(d => d.driver_id === driver.id);
    } else {
      deliveries = [];
    }
  } else {
    deliveries = deliveries.filter(
      d => !TRACKING_SALON_REMOVED_STATUSES.includes(d.status),
    );
  }

  const trackingIds = deliveries.map(d => d.id);

  const [positionsRes, progressRes, markers] = await Promise.all([
    trackingIds.length
      ? supabase.from('gps_positions').select('*').in('tracking_id', trackingIds).order('recorded_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    trackingIds.length
      ? supabase.from('route_progress').select('*').in('tracking_id', trackingIds).order('recorded_at', { ascending: false }).limit(100)
      : Promise.resolve({ data: [] }),
    ensureMapMarkers(),
  ]);

  const alerts = await buildAlerts(deliveries);

  return {
    dashboard: buildDashboard(deliveries),
    deliveries,
    positions: (positionsRes.data ?? []) as GpsPosition[],
    alerts,
    markers,
    progressHistory: (progressRes.data ?? []) as RouteProgressEntry[],
    migrationRequired: false,
  };
}

export async function updateDeliveryStatus(
  userId: string,
  trackingId: string,
  status: TrackingStatus,
  role?: string | null,
  email?: string | null,
): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from('delivery_tracking')
    .select('*')
    .eq('id', trackingId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) throw new Error('Suivi introuvable.');

  if (!canViewAllTracking(role, email)) {
    const driver = await fetchDriverByUserId(userId);
    if (!driver || row.driver_id !== driver.id) {
      throw new Error('Vous ne pouvez modifier que vos propres livraisons.');
    }
    if (!['loading', 'on_route', 'paused', 'arrived'].includes(status)) {
      throw new Error('Statut non autorisé pour les chauffeurs.');
    }
  }

  const now = new Date().toISOString();
  const paused_at = status === 'paused' ? now : null;
  const etaMinutes = computeEtaMinutes(Number(row.remaining_km), status);
  const eta_at = etaMinutes ? new Date(Date.now() + etaMinutes * 60000).toISOString() : null;

  if (['delivered', 'cancelled'].includes(status)) {
    if (status === 'delivered' && row.mission_id) {
      await supabase.from('transport_missions').update({ status: 'delivered' }).eq('id', row.mission_id);
    }
    await deleteTrackingRecord(trackingId);
    return;
  }

  const { error } = await supabase
    .from('delivery_tracking')
    .update({
      status,
      last_status_at: now,
      paused_at,
      eta_at,
      updated_at: now,
      is_active: !['delivered', 'cancelled'].includes(status),
    })
    .eq('id', trackingId);

  if (error) throw error;

  await supabase.from('route_progress').insert({
    tracking_id: trackingId,
    progress_percent: row.progress_percent,
    remaining_km: row.remaining_km,
    eta_at,
    status,
    notes: `Statut → ${status}`,
  });
}

export async function updateGpsPosition(
  userId: string,
  trackingId: string,
  lat: number,
  lng: number,
  role?: string | null,
  email?: string | null,
  source: TrackingSource = 'manual',
): Promise<void> {
  if (!canViewAllTracking(role, email)) {
    throw new Error('Seuls admin et chauffeur peuvent mettre à jour la position GPS.');
  }

  const { data: row, error: fetchErr } = await supabase
    .from('delivery_tracking')
    .select('*')
    .eq('id', trackingId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) throw new Error('Suivi introuvable.');

  const depLat = Number(row.departure_lat);
  const depLng = Number(row.departure_lng);
  const arrLat = Number(row.arrival_lat);
  const arrLng = Number(row.arrival_lng);
  const totalKm = Number(row.distance_km);

  const { progress, remaining } =
    depLat && depLng && arrLat && arrLng
      ? computeProgressFromPosition(depLat, depLng, arrLat, arrLng, lat, lng, totalKm)
      : { progress: Number(row.progress_percent), remaining: Number(row.remaining_km) };

  const etaMinutes = computeEtaMinutes(remaining, row.status as TrackingStatus);
  const eta_at = etaMinutes ? new Date(Date.now() + etaMinutes * 60000).toISOString() : null;
  const is_moving = row.status === 'on_route' || row.status === 'late';

  await supabase.from('gps_positions').insert({
    tracking_id: trackingId,
    truck_id: row.truck_id,
    driver_id: row.driver_id,
    lat,
    lng,
    speed_kmh: is_moving ? 65 : 0,
    is_moving,
    source,
    created_by: userId,
  });

  await supabase
    .from('delivery_tracking')
    .update({
      current_lat: lat,
      current_lng: lng,
      progress_percent: progress,
      remaining_km: remaining,
      eta_at,
      updated_at: new Date().toISOString(),
      source,
    })
    .eq('id', trackingId);

  await supabase.from('route_progress').insert({
    tracking_id: trackingId,
    progress_percent: progress,
    remaining_km: remaining,
    eta_at,
    status: row.status,
    notes: 'Position GPS mise à jour',
  });
}

export async function simulateProgress(
  userId: string,
  trackingId: string,
  progressPercent: number,
  role?: string | null,
  email?: string | null,
): Promise<void> {
  const { data: row } = await supabase.from('delivery_tracking').select('*').eq('id', trackingId).maybeSingle();
  if (!row) throw new Error('Suivi introuvable.');

  const depLat = Number(row.departure_lat);
  const depLng = Number(row.departure_lng);
  const arrLat = Number(row.arrival_lat);
  const arrLng = Number(row.arrival_lng);

  if (!depLat || !arrLat) throw new Error('Coordonnées de route manquantes.');

  const pos = interpolatePosition(
    { lat: depLat, lng: depLng },
    { lat: arrLat, lng: arrLng },
    progressPercent,
  );

  await updateGpsPosition(userId, trackingId, pos.lat, pos.lng, role, email, 'simulated');
}

export async function acknowledgeTrackingAlert(alertId: string): Promise<void> {
  if (alertId.startsWith('computed-')) return;
  await supabase.from('tracking_alerts').update({ acknowledged: true }).eq('id', alertId);
}

export async function persistTrackingAlert(
  trackingId: string,
  alertType: TrackingAlertType,
  message: string,
  severity: 'info' | 'warning' | 'danger' = 'warning',
): Promise<void> {
  await supabase.from('tracking_alerts').insert({
    tracking_id: trackingId,
    alert_type: alertType,
    message,
    severity,
  });
}
