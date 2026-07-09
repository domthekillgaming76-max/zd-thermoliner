import { supabase } from '../lib/supabase';
import type { RoadSheet } from '../lib/supabase';
import type {
  DriverIntegration,
  ExternalDelivery,
  IntegrationProvider,
  ParsedExternalDelivery,
} from '../lib/integrationTypes';
import { getProviderConfig } from '../lib/integrationTypes';
import { safeUuid } from '../lib/safeUuid';
import { syncOperationalStatsFromValidatedRoadSheet } from './roadSheetCascadeService';
import { syncSalaryFromValidatedRoadSheet } from './driverService';
import { syncRoadSheetToBank } from './bankSyncService';
import {
  fetchDriverIntegrations,
  logIntegrationSync,
  updateIntegrationSyncState,
} from './integrationService';
import {
  notifyIntegrationConnected,
  notifyIntegrationDeliveryDetected,
  notifyIntegrationRoadSheetCreated,
  notifyIntegrationSalaryCredited,
  notifyIntegrationSyncError,
} from './notificationService';

export interface SyncResult {
  provider: IntegrationProvider | 'manual';
  imported: number;
  skipped: number;
  processed: number;
  errors: string[];
  message?: string;
}

const CSV_ALIASES: Record<string, keyof ParsedExternalDelivery> = {
  id: 'external_delivery_id',
  delivery_id: 'external_delivery_id',
  job_id: 'external_delivery_id',
  departure: 'departure_city',
  departure_city: 'departure_city',
  from: 'departure_city',
  source: 'departure_city',
  arrival: 'arrival_city',
  arrival_city: 'arrival_city',
  to: 'arrival_city',
  destination: 'arrival_city',
  cargo: 'cargo',
  freight: 'cargo',
  distance: 'distance_km',
  distance_km: 'distance_km',
  km: 'distance_km',
  income: 'income',
  revenue: 'income',
  earnings: 'income',
  payment: 'income',
  fuel: 'fuel_used',
  fuel_used: 'fuel_used',
  damage: 'damage_percent',
  damage_percent: 'damage_percent',
  truck: 'truck_name',
  truck_name: 'truck_name',
  trailer: 'trailer_name',
  trailer_name: 'trailer_name',
  started_at: 'started_at',
  completed_at: 'completed_at',
  date: 'completed_at',
};

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDeliveryRow(
  row: Record<string, unknown>,
  provider: IntegrationProvider | 'manual',
): ParsedExternalDelivery | null {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const alias = CSV_ALIASES[key.trim().toLowerCase()];
    if (alias) mapped[alias] = value;
  }

  const externalId = String(
    mapped.external_delivery_id
    ?? row.external_delivery_id
    ?? row.id
    ?? row.delivery_id
    ?? row.job_id
    ?? '',
  ).trim();

  if (!externalId) return null;

  return {
    external_delivery_id: externalId,
    departure_city: String(mapped.departure_city ?? row.departure_city ?? row.departure ?? '').trim() || undefined,
    arrival_city: String(mapped.arrival_city ?? row.arrival_city ?? row.arrival ?? '').trim() || undefined,
    cargo: String(mapped.cargo ?? row.cargo ?? '').trim() || undefined,
    distance_km: parseNumber(mapped.distance_km ?? row.distance_km ?? row.distance ?? row.km),
    income: parseNumber(mapped.income ?? row.income ?? row.revenue ?? row.earnings),
    fuel_used: parseNumber(mapped.fuel_used ?? row.fuel_used ?? row.fuel),
    damage_percent: parseNumber(mapped.damage_percent ?? row.damage_percent ?? row.damage),
    truck_name: String(mapped.truck_name ?? row.truck_name ?? row.truck ?? '').trim() || undefined,
    trailer_name: String(mapped.trailer_name ?? row.trailer_name ?? row.trailer ?? '').trim() || undefined,
    started_at: String(mapped.started_at ?? row.started_at ?? '').trim() || undefined,
    completed_at: String(mapped.completed_at ?? row.completed_at ?? row.date ?? '').trim() || undefined,
    raw_data: { ...row, provider },
  };
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? '';
    });
    return row;
  });
}

function parseJsonDeliveries(text: string): Record<string, unknown>[] {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.deliveries)) return obj.deliveries as Record<string, unknown>[];
    if (Array.isArray(obj.jobs)) return obj.jobs as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

export function parseDeliveriesFile(
  content: string,
  filename: string,
  provider: IntegrationProvider | 'manual',
): ParsedExternalDelivery[] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  let rows: Record<string, unknown>[] = [];

  if (ext === 'json') {
    rows = parseJsonDeliveries(content);
  } else {
    rows = parseCsv(content);
  }

  return rows
    .map(row => normalizeDeliveryRow(row, provider))
    .filter((d): d is ParsedExternalDelivery => d !== null);
}

export async function upsertExternalDelivery(
  profileId: string,
  provider: IntegrationProvider | 'manual',
  delivery: ParsedExternalDelivery,
  integrationId?: string,
): Promise<'imported' | 'skipped'> {
  const { data: existing } = await supabase
    .from('external_deliveries')
    .select('id')
    .eq('profile_id', profileId)
    .eq('provider', provider)
    .eq('external_delivery_id', delivery.external_delivery_id)
    .maybeSingle();

  if (existing?.id) return 'skipped';

  const { error } = await supabase.from('external_deliveries').insert({
    profile_id: profileId,
    integration_id: integrationId ?? null,
    provider,
    external_delivery_id: delivery.external_delivery_id,
    departure_city: delivery.departure_city ?? null,
    arrival_city: delivery.arrival_city ?? null,
    cargo: delivery.cargo ?? null,
    distance_km: delivery.distance_km ?? 0,
    income: delivery.income ?? 0,
    fuel_used: delivery.fuel_used ?? 0,
    damage_percent: delivery.damage_percent ?? 0,
    truck_name: delivery.truck_name ?? null,
    trailer_name: delivery.trailer_name ?? null,
    started_at: delivery.started_at ?? null,
    completed_at: delivery.completed_at ?? null,
    raw_data: delivery.raw_data ?? {},
    sync_status: 'pending',
  });

  if (error) throw error;
  return 'imported';
}

export async function createRoadSheetFromExternalDelivery(deliveryId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_integration_road_sheet', {
    p_delivery_id: deliveryId,
  });

  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

async function fetchRoadSheetById(sheetId: string): Promise<RoadSheet | null> {
  const { data, error } = await supabase.from('road_sheets').select('*').eq('id', sheetId).maybeSingle();
  if (error || !data) return null;
  return data as RoadSheet;
}

export async function creditSalaryForDelivery(
  profileId: string,
  delivery: ExternalDelivery,
): Promise<boolean> {
  if (delivery.salary_credited) return false;

  const settingsRes = await supabase
    .from('finance_settings')
    .select('delivery_bonus_eur, default_salary_per_km')
    .limit(1)
    .maybeSingle();

  const deliveryBonus = Number(settingsRes.data?.delivery_bonus_eur ?? 25);
  const kmRate = Number(settingsRes.data?.default_salary_per_km ?? 0.35);
  const km = Number(delivery.distance_km ?? 0);
  const income = Number(delivery.income ?? 0);

  const salary = Math.round((Math.max(income * 0.2, km * kmRate) + deliveryBonus) * 100) / 100;
  if (salary <= 0) return false;

  const { data, error } = await supabase.rpc('integration_credit_driver_salary', {
    p_profile_id: profileId,
    p_amount: salary,
    p_delivery_id: delivery.id,
    p_reason: `Salaire livraison ${delivery.departure_city ?? ''} → ${delivery.arrival_city ?? ''}`,
  });

  if (error) throw new Error(error.message);
  const result = data as { ok?: boolean; skipped?: boolean };
  return Boolean(result?.ok && !result?.skipped);
}

export async function processExternalDelivery(
  profileId: string,
  deliveryId: string,
): Promise<{ roadSheetId: string | null; salaryCredited: boolean }> {
  const { data: deliveryRow, error } = await supabase
    .from('external_deliveries')
    .select('*')
    .eq('id', deliveryId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !deliveryRow) {
    throw new Error('Livraison externe introuvable');
  }

  const delivery = deliveryRow as ExternalDelivery;
  let roadSheetId = delivery.road_sheet_id;

  if (!roadSheetId) {
    roadSheetId = await createRoadSheetFromExternalDelivery(deliveryId);
    if (roadSheetId) {
      const sheet = await fetchRoadSheetById(roadSheetId);
      if (sheet) {
        try { await syncRoadSheetToBank(roadSheetId); } catch { /* non-blocking */ }
        try { await syncSalaryFromValidatedRoadSheet(sheet); } catch { /* non-blocking */ }
        try { await syncOperationalStatsFromValidatedRoadSheet(sheet); } catch { /* non-blocking */ }
        void notifyIntegrationRoadSheetCreated(
          profileId,
          `${delivery.departure_city ?? '?'} → ${delivery.arrival_city ?? '?'}`,
        );
      }
    }
  }

  let salaryCredited = false;
  const refreshed = await supabase.from('external_deliveries').select('*').eq('id', deliveryId).maybeSingle();
  const freshDelivery = refreshed.data as ExternalDelivery | null;
  if (freshDelivery && !freshDelivery.salary_credited) {
    salaryCredited = await creditSalaryForDelivery(profileId, freshDelivery);
    if (salaryCredited) {
      void notifyIntegrationSalaryCredited(profileId, freshDelivery.salary_amount || 0);
    }
  }

  return { roadSheetId, salaryCredited };
}

export async function importDeliveriesFromCsv(
  profileId: string,
  file: File,
  provider: IntegrationProvider | 'manual' = 'trucksbook',
): Promise<SyncResult> {
  const content = await file.text();
  const parsed = parseDeliveriesFile(content, file.name, provider);
  const integration = (await fetchDriverIntegrations(profileId)).find(i => i.provider === provider);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const delivery of parsed) {
    try {
      const result = await upsertExternalDelivery(profileId, provider, delivery, integration?.id);
      if (result === 'imported') {
        imported += 1;
        const { data: row } = await supabase
          .from('external_deliveries')
          .select('id')
          .eq('profile_id', profileId)
          .eq('provider', provider)
          .eq('external_delivery_id', delivery.external_delivery_id)
          .maybeSingle();

        if (row?.id) {
          void notifyIntegrationDeliveryDetected(
            profileId,
            `${delivery.departure_city ?? '?'} → ${delivery.arrival_city ?? '?'}`,
          );
          try {
            await processExternalDelivery(profileId, row.id as string);
          } catch (err) {
            errors.push(err instanceof Error ? err.message : 'Erreur traitement livraison');
          }
        }
      } else {
        skipped += 1;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Erreur import');
    }
  }

  if (integration) {
    await updateIntegrationSyncState(integration.id, {
      last_sync_at: new Date().toISOString(),
      last_error: errors[0] ?? null,
      status: errors.length ? 'error' : 'connected',
    });
  }

  await logIntegrationSync({
    profileId,
    integrationId: integration?.id,
    provider,
    status: errors.length ? (imported > 0 ? 'partial' : 'error') : 'success',
    message: `Import ${file.name}: ${imported} livraison(s)`,
    deliveriesImported: imported,
    deliveriesSkipped: skipped,
    rawError: errors.length ? { errors } : undefined,
  });

  return { provider, imported, skipped, processed: imported, errors };
}

export async function syncTruckersMP(profileId: string, integration: DriverIntegration): Promise<SyncResult> {
  const steamId = integration.external_user_id?.trim();
  if (!steamId) {
    return { provider: 'truckersmp', imported: 0, skipped: 0, processed: 0, errors: ['Steam ID manquant'] };
  }

  const errors: string[] = [];
  try {
    const res = await fetch(`https://api.truckersmp.com/v2/player/${steamId}`);
    if (!res.ok) throw new Error(`TruckersMP API ${res.status}`);
    const json = await res.json() as {
      response?: {
        id?: number;
        name?: string;
        steamID64?: string;
        avatar?: string;
        joinDate?: string;
      };
    };

    const player = json.response;
    if (!player?.name) throw new Error('Joueur TruckersMP introuvable');

    await supabase
      .from('driver_integrations')
      .update({
        external_username: player.name,
        metadata: {
          ...integration.metadata,
          truckersmp_id: player.id,
          avatar: player.avatar,
          join_date: player.joinDate,
          last_api_check: new Date().toISOString(),
        },
        last_sync_at: new Date().toISOString(),
        last_error: null,
        status: 'connected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    await logIntegrationSync({
      profileId,
      integrationId: integration.id,
      provider: 'truckersmp',
      status: 'success',
      message: `Profil TruckersMP synchronisé — ${player.name}. L'historique livraisons nécessite un import CSV/JSON.`,
      deliveriesImported: 0,
      deliveriesSkipped: 0,
    });

    return {
      provider: 'truckersmp',
      imported: 0,
      skipped: 0,
      processed: 0,
      errors: [],
      message: `Profil ${player.name} vérifié via API officielle TruckersMP.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur TruckersMP';
    errors.push(msg);
    await updateIntegrationSyncState(integration.id, { last_error: msg, status: 'error' });
    await logIntegrationSync({
      profileId,
      integrationId: integration.id,
      provider: 'truckersmp',
      status: 'error',
      message: msg,
      rawError: { error: msg },
    });
    void notifyIntegrationSyncError(profileId, 'TruckersMP', msg);
    return { provider: 'truckersmp', imported: 0, skipped: 0, processed: 0, errors };
  }
}

export async function syncTrucksBook(profileId: string, integration: DriverIntegration): Promise<SyncResult> {
  const message = getProviderConfig('trucksbook').pendingMessage ?? 'API TrucksBook indisponible';
  await updateIntegrationSyncState(integration.id, {
    status: 'pending',
    last_sync_at: new Date().toISOString(),
    last_error: null,
  });
  await logIntegrationSync({
    profileId,
    integrationId: integration.id,
    provider: 'trucksbook',
    status: 'skipped',
    message,
  });
  return {
    provider: 'trucksbook',
    imported: 0,
    skipped: 0,
    processed: 0,
    errors: [],
    message,
  };
}

export async function syncWorldOfTrucks(profileId: string, integration: DriverIntegration): Promise<SyncResult> {
  const message = getProviderConfig('world_of_trucks').pendingMessage ?? 'Import JSON requis';
  await updateIntegrationSyncState(integration.id, {
    status: 'pending',
    last_sync_at: new Date().toISOString(),
  });
  await logIntegrationSync({
    profileId,
    integrationId: integration.id,
    provider: 'world_of_trucks',
    status: 'skipped',
    message,
  });
  return {
    provider: 'world_of_trucks',
    imported: 0,
    skipped: 0,
    processed: 0,
    errors: [],
    message,
  };
}

export async function syncDiscord(profileId: string, integration: DriverIntegration): Promise<SyncResult> {
  await updateIntegrationSyncState(integration.id, {
    status: 'connected',
    last_sync_at: new Date().toISOString(),
    last_error: null,
  });
  await logIntegrationSync({
    profileId,
    integrationId: integration.id,
    provider: 'discord',
    status: 'success',
    message: `Discord lié — ${integration.external_username ?? 'compte'}`,
  });
  return {
    provider: 'discord',
    imported: 0,
    skipped: 0,
    processed: 0,
    errors: [],
    message: 'Compte Discord enregistré. OAuth complet bientôt disponible.',
  };
}

export async function syncDriverIntegration(
  profileId: string,
  integration: DriverIntegration,
): Promise<SyncResult> {
  switch (integration.provider) {
    case 'truckersmp':
      return syncTruckersMP(profileId, integration);
    case 'trucksbook':
      return syncTrucksBook(profileId, integration);
    case 'world_of_trucks':
      return syncWorldOfTrucks(profileId, integration);
    case 'discord':
      return syncDiscord(profileId, integration);
    default:
      return {
        provider: integration.provider,
        imported: 0,
        skipped: 0,
        processed: 0,
        errors: ['Provider inconnu'],
      };
  }
}

export async function syncDriverIntegrations(profileId: string): Promise<SyncResult[]> {
  const integrations = await fetchDriverIntegrations(profileId);
  const connected = integrations.filter(i => i.status === 'connected' || i.status === 'pending');

  const results: SyncResult[] = [];
  for (const integration of connected) {
    results.push(await syncDriverIntegration(profileId, integration));
  }
  return results;
}

export async function processPendingDeliveries(profileId: string): Promise<number> {
  const { data, error } = await supabase
    .from('external_deliveries')
    .select('id')
    .eq('profile_id', profileId)
    .eq('sync_status', 'pending')
    .is('road_sheet_id', null)
    .limit(50);

  if (error) return 0;

  let processed = 0;
  for (const row of data ?? []) {
    try {
      await processExternalDelivery(profileId, row.id as string);
      processed += 1;
    } catch {
      /* continue */
    }
  }
  return processed;
}

export function buildManualDeliveryFromForm(input: {
  departure: string;
  arrival: string;
  cargo: string;
  distanceKm: number;
  income: number;
}): ParsedExternalDelivery {
  return {
    external_delivery_id: `manual-${safeUuid()}`,
    departure_city: input.departure,
    arrival_city: input.arrival,
    cargo: input.cargo,
    distance_km: input.distanceKm,
    income: input.income,
    raw_data: { source: 'manual_form' },
  };
}

export async function notifyIntegrationConnectedSafe(
  profileId: string,
  providerLabel: string,
): Promise<void> {
  try {
    await notifyIntegrationConnected(profileId, providerLabel);
  } catch {
    /* non-blocking */
  }
}
