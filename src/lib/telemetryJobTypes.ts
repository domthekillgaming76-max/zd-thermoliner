export type TelemetryJobStatus =
  | 'detected'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'sync_error'
  | 'pending_validation';

export type TelemetryGame = 'ets2' | 'ats';

export interface TelemetryJob {
  id: string;
  profile_id: string;
  driver_id: string | null;
  road_sheet_id: string | null;
  mission_id: string | null;
  tracking_id: string | null;
  local_job_id: string;
  game: TelemetryGame;
  provider: string;
  status: TelemetryJobStatus;
  cargo: string | null;
  cargo_mass_kg: number | null;
  source_city: string | null;
  source_company: string | null;
  destination_city: string | null;
  destination_company: string | null;
  expected_income: number | null;
  final_income: number | null;
  expected_distance_km: number | null;
  actual_distance_km: number | null;
  fuel_start: number | null;
  fuel_end: number | null;
  fuel_used: number | null;
  truck_name: string | null;
  truck_plate: string | null;
  trailer_name: string | null;
  trailer_plate: string | null;
  truck_damage_start: number | null;
  truck_damage_end: number | null;
  trailer_damage_end: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  start_position: { lat: number; lng: number } | null;
  end_position: { lat: number; lng: number } | null;
  cancel_reason: string | null;
  validation_comment: string | null;
  validated_by: string | null;
  validated_at: string | null;
  stats_applied_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  last_sync_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  driver_name?: string | null;
  avatar_url?: string | null;
  presence_status?: string | null;
}

export interface TelemetryJobUpdate {
  id: string;
  telemetry_job_id: string;
  speed_kmh: number | null;
  fuel_liters: number | null;
  truck_damage: number | null;
  trailer_damage: number | null;
  distance_remaining_km: number | null;
  progress_percent: number | null;
  eta_at: string | null;
  position: { lat: number; lng: number } | null;
  status: string | null;
  created_at: string;
}

export interface TelemetryDriverStats {
  totalKm: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  totalRevenue: number;
  fuelUsed: number;
  averageDamage: number;
  lastDeliveryAt: string | null;
}

export const TELEMETRY_STATUS_LABELS: Record<TelemetryJobStatus, { label: string; color: string; bg: string }> = {
  detected: { label: 'Détectée', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  active: { label: 'En livraison', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  paused: { label: 'En pause', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  completed: { label: 'Terminée', color: 'text-white/70', bg: 'bg-white/5 border-white/10' },
  cancelled: { label: 'Annulée', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  sync_error: { label: 'Erreur sync', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  pending_validation: { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
};

export const GAME_BADGE: Record<TelemetryGame, { label: string; className: string }> = {
  ets2: { label: 'ETS2', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  ats: { label: 'ATS', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
};

export function computeTelemetryDriverStats(jobs: TelemetryJob[]): TelemetryDriverStats {
  const completed = jobs.filter(j => j.status === 'completed' || j.status === 'pending_validation');
  const cancelled = jobs.filter(j => j.status === 'cancelled');
  const totalKm = completed.reduce((s, j) => s + Number(j.actual_distance_km ?? j.expected_distance_km ?? 0), 0);
  const totalRevenue = completed.reduce((s, j) => s + Number(j.final_income ?? j.expected_income ?? 0), 0);
  const fuelUsed = completed.reduce((s, j) => s + Number(j.fuel_used ?? 0), 0);
  const damages = completed.map(j => Number(j.truck_damage_end ?? 0) + Number(j.trailer_damage_end ?? 0));
  const averageDamage = damages.length ? damages.reduce((a, b) => a + b, 0) / damages.length : 0;
  const lastDeliveryAt = completed[0]?.completed_at ?? completed[0]?.started_at ?? null;

  return {
    totalKm,
    completedDeliveries: completed.length,
    cancelledDeliveries: cancelled.length,
    totalRevenue,
    fuelUsed,
    averageDamage,
    lastDeliveryAt,
  };
}

export function getJobProgress(job: TelemetryJob): number {
  const meta = job.metadata || {};
  const p = meta.last_progress_percent;
  if (p != null) return Math.min(100, Math.max(0, Number(p)));
  if (job.status === 'completed') return 100;
  if (job.actual_distance_km && job.expected_distance_km) {
    return Math.min(100, Math.round((job.actual_distance_km / job.expected_distance_km) * 100));
  }
  return 0;
}

export function isJobOnline(job: TelemetryJob): boolean {
  if (!job.last_sync_at) return false;
  const age = Date.now() - new Date(job.last_sync_at).getTime();
  return age < 120_000;
}
