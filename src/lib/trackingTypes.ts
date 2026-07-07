export type TrackingStatus =
  | 'planned'
  | 'loading'
  | 'on_route'
  | 'paused'
  | 'arrived'
  | 'delivered'
  | 'late'
  | 'cancelled';

export type TrackingAlertType =
  | 'late_delivery'
  | 'driver_paused'
  | 'truck_stopped'
  | 'no_status_update'
  | 'arrival_soon'
  | 'delivery_completed';

export type TrackingSource =
  | 'manual'
  | 'simulated'
  | 'truckersmp'
  | 'trucksbook'
  | 'ets2_telemetry'
  | 'gps_api';

export type MapMarkerType = 'garage' | 'client' | 'depot' | 'hub';

export interface DeliveryTracking {
  id: string;
  mission_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  departure_city: string;
  arrival_city: string;
  departure_lat: number | null;
  departure_lng: number | null;
  arrival_lat: number | null;
  arrival_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  cargo: string | null;
  distance_km: number;
  remaining_km: number;
  progress_percent: number;
  status: TrackingStatus;
  eta_at: string | null;
  delivery_date: string | null;
  last_status_at: string;
  paused_at: string | null;
  source: TrackingSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  driver_name?: string | null;
  truck_label?: string | null;
  trailer_label?: string | null;
  is_moving?: boolean;
}

export interface GpsPosition {
  id: string;
  tracking_id: string | null;
  truck_id: string | null;
  driver_id: string | null;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number | null;
  is_moving: boolean;
  source: TrackingSource;
  recorded_at: string;
}

export interface RouteProgressEntry {
  id: string;
  tracking_id: string;
  progress_percent: number;
  remaining_km: number;
  eta_at: string | null;
  status: string | null;
  notes: string | null;
  recorded_at: string;
}

export interface TrackingAlert {
  id: string;
  tracking_id: string | null;
  alert_type: TrackingAlertType;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export interface MapMarker {
  id: string;
  marker_type: MapMarkerType;
  ref_id: string | null;
  label: string;
  city: string | null;
  lat: number;
  lng: number;
  icon: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface TrackingDashboard {
  activeDeliveries: number;
  driversOnRoute: number;
  trucksMoving: number;
  trucksStopped: number;
  lateDeliveries: number;
  estimatedArrivals: number;
}

export interface TrackingBundle {
  dashboard: TrackingDashboard;
  deliveries: DeliveryTracking[];
  positions: GpsPosition[];
  alerts: TrackingAlert[];
  markers: MapMarker[];
  progressHistory: RouteProgressEntry[];
  migrationRequired: boolean;
}

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  planned: 'Planifiée',
  loading: 'Chargement',
  on_route: 'En route',
  paused: 'En pause',
  arrived: 'Arrivée',
  delivered: 'Livrée',
  late: 'En retard',
  cancelled: 'Annulée',
};

export const TRACKING_STATUS_COLORS: Record<TrackingStatus, string> = {
  planned: '#94a3b8',
  loading: '#fbbf24',
  on_route: '#22d3ee',
  paused: '#f97316',
  arrived: '#a78bfa',
  delivered: '#34d399',
  late: '#ef4444',
  cancelled: '#6b7280',
};

export const TRACKING_ALERT_LABELS: Record<TrackingAlertType, string> = {
  late_delivery: 'Livraison en retard',
  driver_paused: 'Chauffeur en pause prolongée',
  truck_stopped: 'Camion à l\'arrêt',
  no_status_update: 'Pas de mise à jour',
  arrival_soon: 'Arrivée imminente',
  delivery_completed: 'Livraison terminée',
};

export const DRIVER_STATUS_OPTIONS: TrackingStatus[] = [
  'loading',
  'on_route',
  'paused',
  'arrived',
];

export function formatEta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
