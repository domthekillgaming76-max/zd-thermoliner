import { supabase } from '../lib/supabase';
import type {
  DriverIntegration,
  ExternalDelivery,
  IntegrationProvider,
  IntegrationSyncLog,
} from '../lib/integrationTypes';

const PUBLIC_COLUMNS =
  'id, profile_id, provider, external_user_id, external_username, status, metadata, last_sync_at, last_error, created_at, updated_at';

function mapIntegration(row: Record<string, unknown>): DriverIntegration {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    provider: row.provider as DriverIntegration['provider'],
    external_user_id: (row.external_user_id as string) ?? null,
    external_username: (row.external_username as string) ?? null,
    status: row.status as DriverIntegration['status'],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    last_sync_at: (row.last_sync_at as string) ?? null,
    last_error: (row.last_error as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapDelivery(row: Record<string, unknown>): ExternalDelivery {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    integration_id: (row.integration_id as string) ?? null,
    provider: row.provider as ExternalDelivery['provider'],
    external_delivery_id: row.external_delivery_id as string,
    departure_city: (row.departure_city as string) ?? null,
    arrival_city: (row.arrival_city as string) ?? null,
    cargo: (row.cargo as string) ?? null,
    distance_km: Number(row.distance_km ?? 0),
    income: Number(row.income ?? 0),
    fuel_used: Number(row.fuel_used ?? 0),
    damage_percent: Number(row.damage_percent ?? 0),
    truck_name: (row.truck_name as string) ?? null,
    trailer_name: (row.trailer_name as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    raw_data: (row.raw_data as Record<string, unknown>) ?? {},
    sync_status: row.sync_status as ExternalDelivery['sync_status'],
    road_sheet_id: (row.road_sheet_id as string) ?? null,
    salary_credited: Boolean(row.salary_credited),
    salary_amount: Number(row.salary_amount ?? 0),
    created_at: row.created_at as string,
  };
}

export async function fetchDriverIntegrations(profileId: string): Promise<DriverIntegration[]> {
  const { data, error } = await supabase
    .from('driver_integrations')
    .select(PUBLIC_COLUMNS)
    .eq('profile_id', profileId)
    .order('provider');

  if (error) throw error;
  return (data ?? []).map(r => mapIntegration(r as Record<string, unknown>));
}

export async function fetchAllDriverIntegrations(): Promise<DriverIntegration[]> {
  const { data, error } = await supabase
    .from('driver_integrations')
    .select(PUBLIC_COLUMNS)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(r => mapIntegration(r as Record<string, unknown>));
}

export async function connectDriverIntegration(input: {
  provider: IntegrationProvider;
  externalUserId?: string;
  externalUsername?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_driver_integration', {
    p_provider: input.provider,
    p_external_user_id: input.externalUserId ?? null,
    p_external_username: input.externalUsername ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function disconnectDriverIntegration(integrationId: string): Promise<void> {
  const { error } = await supabase.rpc('disconnect_driver_integration', {
    p_integration_id: integrationId,
  });
  if (error) throw new Error(error.message);
}

export async function updateIntegrationSyncState(
  integrationId: string,
  patch: { last_sync_at?: string; last_error?: string | null; status?: DriverIntegration['status'] },
): Promise<void> {
  const { error } = await supabase
    .from('driver_integrations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', integrationId);
  if (error) throw error;
}

export async function fetchExternalDeliveries(
  profileId: string,
  limit = 50,
): Promise<ExternalDelivery[]> {
  const { data, error } = await supabase
    .from('external_deliveries')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(r => mapDelivery(r as Record<string, unknown>));
}

export async function fetchAllExternalDeliveries(limit = 100): Promise<ExternalDelivery[]> {
  const { data, error } = await supabase
    .from('external_deliveries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(r => mapDelivery(r as Record<string, unknown>));
}

export async function fetchIntegrationSyncLogs(
  profileId?: string,
  limit = 30,
): Promise<IntegrationSyncLog[]> {
  let query = supabase
    .from('integration_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (profileId) query = query.eq('profile_id', profileId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as IntegrationSyncLog[];
}

export async function logIntegrationSync(entry: {
  profileId: string;
  integrationId?: string;
  provider: string;
  status: IntegrationSyncLog['status'];
  message?: string;
  deliveriesImported?: number;
  deliveriesSkipped?: number;
  rawError?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from('integration_sync_logs').insert({
    profile_id: entry.profileId,
    integration_id: entry.integrationId ?? null,
    provider: entry.provider,
    status: entry.status,
    message: entry.message ?? null,
    deliveries_imported: entry.deliveriesImported ?? 0,
    deliveries_skipped: entry.deliveriesSkipped ?? 0,
    raw_error: entry.rawError ?? null,
  });
}

export async function fetchProfilesForIntegrations(): Promise<Array<{
  id: string;
  pseudo: string | null;
  full_name: string | null;
  email: string | null;
}>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, pseudo, full_name, email')
    .in('role', ['chauffeur', 'admin']);
  if (error) return [];
  return (data ?? []) as Array<{ id: string; pseudo: string | null; full_name: string | null; email: string | null }>;
}
