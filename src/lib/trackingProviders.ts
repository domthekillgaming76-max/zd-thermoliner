/**
 * Future GPS provider adapters — plug TruckersMP, TrucksBook, ETS2 telemetry, or real GPS API.
 */
import type { TrackingSource } from './trackingTypes';
export interface TrackingPositionUpdate {
  truckId: string;
  driverId?: string | null;
  trackingId?: string | null;
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number | null;
  isMoving?: boolean;
  source: TrackingSource;
  recordedAt?: string;
}

export interface TrackingProvider {
  id: TrackingSource;
  label: string;
  enabled: boolean;
  fetchUpdates(): Promise<TrackingPositionUpdate[]>;
}

/** Manual / admin simulation — always available. */
export const manualProvider: TrackingProvider = {
  id: 'manual',
  label: 'Simulation manuelle',
  enabled: true,
  async fetchUpdates() {
    return [];
  },
};

/** Auto-progress from dispatch missions. */
export const simulatedProvider: TrackingProvider = {
  id: 'simulated',
  label: 'Auto-sync missions',
  enabled: true,
  async fetchUpdates() {
    return [];
  },
};

/** Placeholder for TruckersMP live API integration. */
export const truckersMpProvider: TrackingProvider = {
  id: 'truckersmp',
  label: 'TruckersMP',
  enabled: false,
  async fetchUpdates() {
    // TODO: connect TruckersMP API when credentials are configured
    return [];
  },
};

export const trucksBookProvider: TrackingProvider = {
  id: 'trucksbook',
  label: 'TrucksBook',
  enabled: false,
  async fetchUpdates() {
    return [];
  },
};

export const ets2TelemetryProvider: TrackingProvider = {
  id: 'ets2_telemetry',
  label: 'ETS2 Télémétrie',
  enabled: false,
  async fetchUpdates() {
    return [];
  },
};

export const gpsApiProvider: TrackingProvider = {
  id: 'gps_api',
  label: 'GPS API',
  enabled: false,
  async fetchUpdates() {
    return [];
  },
};

export const TRACKING_PROVIDERS: TrackingProvider[] = [
  manualProvider,
  simulatedProvider,
  truckersMpProvider,
  trucksBookProvider,
  ets2TelemetryProvider,
  gpsApiProvider,
];

export function positionUpdateToRow(
  update: TrackingPositionUpdate,
  createdBy: string,
): Record<string, unknown> {
  return {
    tracking_id: update.trackingId ?? null,
    truck_id: update.truckId,
    driver_id: update.driverId ?? null,
    lat: update.lat,
    lng: update.lng,
    speed_kmh: update.speedKmh ?? 0,
    heading: update.heading ?? null,
    is_moving: update.isMoving ?? true,
    source: update.source,
    recorded_at: update.recordedAt ?? new Date().toISOString(),
    created_by: createdBy,
  };
}
