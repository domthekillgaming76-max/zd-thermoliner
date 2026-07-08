export type DriverPresenceStatus = 'online' | 'on_route' | 'offline';
export type SystemHealthStatus = 'ok' | 'degraded' | 'down';

export interface DriverPresence {
  id: string;
  user_id: string | null;
  driver_id: string | null;
  driver_name?: string;
  status: DriverPresenceStatus;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  truck_registration: string | null;
  route_summary: string | null;
  last_seen: string;
}

export interface SystemHealthRow {
  component: string;
  status: SystemHealthStatus;
  message: string | null;
  updated_at: string;
}

export interface LiveOpsMetrics {
  connectedDrivers: number;
  deliveriesInProgress: number;
  revenueToday: number;
  expensesToday: number;
  netProfitToday: number;
  pendingRoadSheets: number;
  activeFreightOffers: number;
  systemStatus: SystemHealthStatus;
  systemMessage: string;
  lastUpdated: string;
}

export interface FleetMapVehicle {
  id: string;
  driverId: string | null;
  driverName: string;
  truckRegistration: string | null;
  routeSummary: string;
  status: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  progressPercent: number;
}

export interface LiveNotification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  created_at: string;
  read: boolean;
}

export const LIVE_OPS_STATUS_COLORS: Record<SystemHealthStatus, string> = {
  ok: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  degraded: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  down: 'text-red-400 bg-red-500/10 border-red-500/25',
};

export function formatLiveEuro(n: number): string {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}
