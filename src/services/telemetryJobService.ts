import { supabase } from '../lib/supabase';
import type { TelemetryJob, TelemetryJobUpdate } from '../lib/telemetryJobTypes';

function normalizeJob(row: Record<string, unknown>): TelemetryJob {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    driver_id: (row.driver_id as string) ?? null,
    road_sheet_id: (row.road_sheet_id as string) ?? null,
    mission_id: (row.mission_id as string) ?? null,
    tracking_id: (row.tracking_id as string) ?? null,
    local_job_id: row.local_job_id as string,
    game: row.game as TelemetryJob['game'],
    provider: (row.provider as string) ?? 'zd_telemetry',
    status: row.status as TelemetryJob['status'],
    cargo: (row.cargo as string) ?? null,
    cargo_mass_kg: row.cargo_mass_kg != null ? Number(row.cargo_mass_kg) : null,
    source_city: (row.source_city as string) ?? null,
    source_company: (row.source_company as string) ?? null,
    destination_city: (row.destination_city as string) ?? null,
    destination_company: (row.destination_company as string) ?? null,
    expected_income: row.expected_income != null ? Number(row.expected_income) : null,
    final_income: row.final_income != null ? Number(row.final_income) : null,
    expected_distance_km: row.expected_distance_km != null ? Number(row.expected_distance_km) : null,
    actual_distance_km: row.actual_distance_km != null ? Number(row.actual_distance_km) : null,
    fuel_start: row.fuel_start != null ? Number(row.fuel_start) : null,
    fuel_end: row.fuel_end != null ? Number(row.fuel_end) : null,
    fuel_used: row.fuel_used != null ? Number(row.fuel_used) : null,
    truck_name: (row.truck_name as string) ?? null,
    truck_plate: (row.truck_plate as string) ?? null,
    trailer_name: (row.trailer_name as string) ?? null,
    trailer_plate: (row.trailer_plate as string) ?? null,
    truck_damage_start: row.truck_damage_start != null ? Number(row.truck_damage_start) : null,
    truck_damage_end: row.truck_damage_end != null ? Number(row.truck_damage_end) : null,
    trailer_damage_end: row.trailer_damage_end != null ? Number(row.trailer_damage_end) : null,
    avg_speed_kmh: row.avg_speed_kmh != null ? Number(row.avg_speed_kmh) : null,
    max_speed_kmh: row.max_speed_kmh != null ? Number(row.max_speed_kmh) : null,
    start_position: (row.start_position as TelemetryJob['start_position']) ?? null,
    end_position: (row.end_position as TelemetryJob['end_position']) ?? null,
    cancel_reason: (row.cancel_reason as string) ?? null,
    validation_comment: (row.validation_comment as string) ?? null,
    validated_by: (row.validated_by as string) ?? null,
    validated_at: (row.validated_at as string) ?? null,
    stats_applied_at: (row.stats_applied_at as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    cancelled_at: (row.cancelled_at as string) ?? null,
    last_sync_at: (row.last_sync_at as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    driver_name: (row.driver_name as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    presence_status: (row.presence_status as string) ?? null,
  };
}

async function enrichJobs(jobs: TelemetryJob[]): Promise<TelemetryJob[]> {
  const driverIds = [...new Set(jobs.map(j => j.driver_id).filter(Boolean))] as string[];
  const profileIds = [...new Set(jobs.map(j => j.profile_id))];

  const [driversRes, profilesRes, presenceRes] = await Promise.all([
    driverIds.length
      ? supabase.from('drivers').select('id, name, user_id').in('id', driverIds)
      : Promise.resolve({ data: [] }),
    supabase.from('profiles').select('id, full_name, pseudo, avatar_url').in('id', profileIds),
    supabase.from('driver_presence').select('user_id, status, last_seen').in('user_id', profileIds),
  ]);

  const driverMap = new Map((driversRes.data ?? []).map(d => [d.id, d]));
  const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
  const presenceMap = new Map((presenceRes.data ?? []).map(p => [p.user_id, p]));

  return jobs.map(job => {
    const driver = job.driver_id ? driverMap.get(job.driver_id) : null;
    const profile = profileMap.get(job.profile_id);
    const presence = presenceMap.get(job.profile_id);
    return {
      ...job,
      driver_name: driver?.name ?? profile?.pseudo ?? profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      presence_status: presence?.status ?? null,
    };
  });
}

export async function fetchActiveTelemetryJobs(): Promise<TelemetryJob[]> {
  const { data, error } = await supabase
    .from('telemetry_jobs')
    .select('*')
    .in('status', ['detected', 'active', 'paused', 'sync_error'])
    .order('last_sync_at', { ascending: false });
  if (error) {
    console.warn('[Z&D] fetchActiveTelemetryJobs:', error.message);
    return [];
  }
  return enrichJobs((data ?? []).map(r => normalizeJob(r as Record<string, unknown>)));
}

export async function fetchPendingValidationJobs(): Promise<TelemetryJob[]> {
  const { data, error } = await supabase
    .from('telemetry_jobs')
    .select('*')
    .eq('status', 'pending_validation')
    .order('completed_at', { ascending: false });
  if (error) return [];
  return enrichJobs((data ?? []).map(r => normalizeJob(r as Record<string, unknown>)));
}

export async function fetchDriverTelemetryJobs(driverUserId: string, limit = 50): Promise<TelemetryJob[]> {
  const { data, error } = await supabase
    .from('telemetry_jobs')
    .select('*')
    .eq('profile_id', driverUserId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return enrichJobs((data ?? []).map(r => normalizeJob(r as Record<string, unknown>)));
}

export async function fetchTelemetryJobUpdates(jobId: string, limit = 30): Promise<TelemetryJobUpdate[]> {
  const { data, error } = await supabase
    .from('telemetry_job_updates')
    .select('*')
    .eq('telemetry_job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as TelemetryJobUpdate[];
}

export async function validateTelemetryJob(
  jobId: string,
  validatorId: string,
  comment?: string,
): Promise<void> {
  const { data: job, error: fetchErr } = await supabase
    .from('telemetry_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  if (fetchErr || !job) throw new Error('Mission introuvable.');

  const now = new Date().toISOString();
  const { error: jobErr } = await supabase.from('telemetry_jobs').update({
    status: 'completed',
    validation_comment: comment ?? null,
    validated_by: validatorId,
    validated_at: now,
    updated_at: now,
  }).eq('id', jobId);
  if (jobErr) throw jobErr;

  if (job.road_sheet_id) {
    await supabase.from('road_sheets').update({
      validated: true,
      status: 'validated',
      approved_by: validatorId,
      approved_at: now,
      notes: comment ? `Validé — ${comment}` : undefined,
      updated_at: now,
    }).eq('id', job.road_sheet_id);
  }

  await supabase.rpc('apply_telemetry_job_stats', { p_job_id: jobId });
}

export async function rejectTelemetryJob(
  jobId: string,
  validatorId: string,
  reason: string,
): Promise<void> {
  const { data: job } = await supabase.from('telemetry_jobs').select('road_sheet_id').eq('id', jobId).maybeSingle();
  const now = new Date().toISOString();

  await supabase.from('telemetry_jobs').update({
    status: 'cancelled',
    validation_comment: reason,
    validated_by: validatorId,
    validated_at: now,
    cancelled_at: now,
    cancel_reason: reason,
    updated_at: now,
  }).eq('id', jobId);

  if (job?.road_sheet_id) {
    await supabase.from('road_sheets').update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_by: validatorId,
      rejected_at: now,
      updated_at: now,
    }).eq('id', job.road_sheet_id);
  }
}

export async function correctTelemetryJobData(
  jobId: string,
  patch: Partial<Pick<TelemetryJob, 'actual_distance_km' | 'final_income' | 'fuel_used' | 'truck_damage_end' | 'trailer_damage_end'>>,
): Promise<void> {
  const { error } = await supabase.from('telemetry_jobs').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', jobId);
  if (error) throw error;

  const { data: job } = await supabase.from('telemetry_jobs').select('road_sheet_id').eq('id', jobId).maybeSingle();
  if (job?.road_sheet_id) {
    await supabase.from('road_sheets').update({
      km: patch.actual_distance_km != null ? Math.round(patch.actual_distance_km) : undefined,
      total_distance: patch.actual_distance_km != null ? Math.round(patch.actual_distance_km) : undefined,
      revenue: patch.final_income ?? undefined,
      fuel_liters: patch.fuel_used ?? undefined,
      updated_at: new Date().toISOString(),
    }).eq('id', job.road_sheet_id);
  }
}

export async function fetchCompanyTelemetryStats(): Promise<{
  total_km: number;
  total_deliveries: number;
  total_revenue: number;
  total_fuel_cost: number;
  estimated_profit: number;
  today_km: number;
  today_deliveries: number;
  today_revenue: number;
} | null> {
  const { data, error } = await supabase.from('company_stats').select('*').limit(1).maybeSingle();
  if (error || !data) return null;
  return {
    total_km: Number(data.total_km ?? 0),
    total_deliveries: Number(data.total_deliveries ?? 0),
    total_revenue: Number(data.total_revenue ?? 0),
    total_fuel_cost: Number(data.total_fuel_cost ?? 0),
    estimated_profit: Number(data.estimated_profit ?? 0),
    today_km: Number(data.today_km ?? 0),
    today_deliveries: Number(data.today_deliveries ?? 0),
    today_revenue: Number(data.today_revenue ?? 0),
  };
}
