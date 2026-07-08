import { supabase } from '../lib/supabase';
import { todayKey } from '../lib/format';
import { isCreditTransaction, isDebitTransaction } from '../lib/bankUtils';
import { fetchAllTransactions } from '../lib/transactionSchema';
import type { FleetMapVehicle, LiveOpsMetrics, SystemHealthRow } from '../lib/liveOpsTypes';
import { fetchTrackingBundle } from './trackingService';

async function fetchSystemHealth(): Promise<SystemHealthRow[]> {
  const { data, error } = await supabase.from('system_health').select('*').order('component');
  if (error) return [];
  return (data ?? []) as SystemHealthRow[];
}

function resolveSystemStatus(rows: SystemHealthRow[]): { status: LiveOpsMetrics['systemStatus']; message: string } {
  if (rows.length === 0) return { status: 'ok', message: 'Système opérationnel' };
  if (rows.some(r => r.status === 'down')) {
    const down = rows.find(r => r.status === 'down');
    return { status: 'down', message: down?.message ?? 'Service indisponible' };
  }
  if (rows.some(r => r.status === 'degraded')) {
    const deg = rows.find(r => r.status === 'degraded');
    return { status: 'degraded', message: deg?.message ?? 'Performance dégradée' };
  }
  return { status: 'ok', message: 'Tous les services opérationnels' };
}

export async function fetchLiveOpsMetrics(): Promise<LiveOpsMetrics> {
  const today = todayKey();

  const [transactions, sheetsRes, missionsRes, freightRes, presenceRes, healthRows] = await Promise.all([
    fetchAllTransactions({ orderBy: 'date', ascending: false }),
    supabase.from('road_sheets').select('id, validated, status'),
    supabase.from('transport_missions').select('id, status').in('status', ['assigned', 'in_progress']),
    supabase.from('freight_offers').select('id, status').eq('status', 'available'),
    supabase.from('driver_presence').select('id, status, last_seen').gte('last_seen', new Date(Date.now() - 30 * 60_000).toISOString()),
    fetchSystemHealth(),
  ]);

  const todayTx = transactions.filter(t => t.date?.startsWith(today) && (!t.status || t.status === 'posted'));
  const revenueToday = todayTx.filter(t => isCreditTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const expensesToday = todayTx.filter(t => isDebitTransaction(t.type)).reduce((s, t) => s + Number(t.amount), 0);

  const sheets = sheetsRes.data ?? [];
  const pendingRoadSheets = sheets.filter(s => !s.validated && s.status !== 'rejected').length;

  const presence = presenceRes.data ?? [];
  const connectedDrivers = presence.filter(p => p.status !== 'offline').length;

  const missions = missionsRes.data ?? [];
  const deliveriesInProgress = missions.length;

  const freight = freightRes.data ?? [];
  const system = resolveSystemStatus(healthRows);

  return {
    connectedDrivers: connectedDrivers || deliveriesInProgress,
    deliveriesInProgress,
    revenueToday: Math.round(revenueToday * 100) / 100,
    expensesToday: Math.round(expensesToday * 100) / 100,
    netProfitToday: Math.round((revenueToday - expensesToday) * 100) / 100,
    pendingRoadSheets,
    activeFreightOffers: freight.length,
    systemStatus: system.status,
    systemMessage: system.message,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchFleetMapVehicles(userId: string, role?: string | null, email?: string | null): Promise<FleetMapVehicle[]> {
  try {
    const bundle = await fetchTrackingBundle(userId, role, email);
    return bundle.deliveries
      .filter(d => d.current_lat != null && d.current_lng != null)
      .map(d => ({
        id: d.id,
        driverId: d.driver_id,
        driverName: d.driver_name ?? 'Chauffeur',
        truckRegistration: d.truck_label ?? null,
        routeSummary: `${d.departure_city} → ${d.arrival_city}`,
        status: d.status,
        lat: Number(d.current_lat),
        lng: Number(d.current_lng),
        lastUpdate: d.updated_at ?? d.created_at,
        progressPercent: Number(d.progress_percent ?? 0),
      }));
  } catch {
    return [];
  }
}

export async function heartbeatDriverPresence(
  userId: string,
  driverId: string,
  payload: Partial<{ status: string; current_city: string; current_lat: number; current_lng: number; route_summary: string; truck_registration: string }>,
): Promise<void> {
  await supabase.from('driver_presence').upsert({
    user_id: userId,
    driver_id: driverId,
    last_seen: new Date().toISOString(),
    ...payload,
  }, { onConflict: 'user_id' });
}
