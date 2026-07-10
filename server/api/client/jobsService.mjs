import { supabaseAdmin, isSupabaseAdminReady } from '../../lib/supabaseAdmin.mjs';
import { displayDriverName } from './middleware.mjs';

const ACTIVE_STATUSES = new Set(['detected', 'active', 'paused']);
const VALID_GAMES = new Set(['ets2', 'ats']);

function num(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function parsePosition(position) {
  if (!position || typeof position !== 'object') return null;
  const lat = num(position.lat ?? position.latitude);
  const lng = num(position.lng ?? position.longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function normalizeJobPayload(body = {}) {
  const localJobId = str(body.localJobId ?? body.local_job_id);
  const game = str(body.game ?? body.metadata?.game)?.toLowerCase();
  return {
    localJobId,
    game,
    cargo: str(body.cargo ?? body.cargoName ?? body.cargo_name),
    cargoMassKg: num(body.cargoMassKg ?? body.cargo_mass_kg ?? body.mass),
    sourceCity: str(body.sourceCity ?? body.source_city ?? body.departure_city ?? body.from_city),
    sourceCompany: str(body.sourceCompany ?? body.source_company ?? body.departure_company),
    destinationCity: str(body.destinationCity ?? body.destination_city ?? body.arrival_city ?? body.to_city),
    destinationCompany: str(body.destinationCompany ?? body.destination_company ?? body.arrival_company),
    expectedIncome: num(body.expectedIncome ?? body.expected_income ?? body.planned_income ?? body.income ?? body.revenue),
    expectedDistanceKm: num(body.expectedDistanceKm ?? body.expected_distance_km ?? body.planned_distance_km ?? body.distance_km ?? body.distance),
    finalIncome: num(body.finalIncome ?? body.final_income),
    actualDistanceKm: num(body.actualDistanceKm ?? body.actual_distance_km ?? body.distance_driven_km),
    fuelStart: num(body.fuelStart ?? body.fuel_start ?? body.fuel),
    fuelEnd: num(body.fuelEnd ?? body.fuel_end),
    fuelUsed: num(body.fuelUsed ?? body.fuel_used ?? body.fuel_consumed),
    truckName: str(body.truckName ?? body.truck_name ?? body.truck),
    truckPlate: str(body.truckPlate ?? body.truck_plate ?? body.truck_registration),
    trailerName: str(body.trailerName ?? body.trailer_name ?? body.trailer),
    trailerPlate: str(body.trailerPlate ?? body.trailer_plate ?? body.trailer_registration),
    truckDamageStart: num(body.truckDamageStart ?? body.truck_damage_start ?? body.truck_damage),
    truckDamageEnd: num(body.truckDamageEnd ?? body.truck_damage_end),
    trailerDamageEnd: num(body.trailerDamageEnd ?? body.trailer_damage_end ?? body.trailer_damage),
    avgSpeedKmh: num(body.avgSpeedKmh ?? body.avg_speed_kmh ?? body.average_speed),
    maxSpeedKmh: num(body.maxSpeedKmh ?? body.max_speed_kmh ?? body.max_speed),
    speedKmh: num(body.speed ?? body.speed_kmh ?? body.speedKmh),
    distanceRemainingKm: num(body.distanceRemainingKm ?? body.distance_remaining_km ?? body.remaining_km),
    progressPercent: num(body.progressPercent ?? body.progress_percent ?? body.progress),
    etaAt: str(body.etaAt ?? body.eta_at ?? body.eta),
    position: parsePosition(body.position),
    startPosition: parsePosition(body.startPosition ?? body.start_position ?? body.position),
    endPosition: parsePosition(body.endPosition ?? body.end_position ?? body.position),
    status: str(body.status)?.toLowerCase(),
    cancelReason: str(body.cancelReason ?? body.cancel_reason ?? body.reason),
    startedAt: str(body.startedAt ?? body.started_at ?? body.timestamp),
    completedAt: str(body.completedAt ?? body.completed_at),
    event: str(body.event ?? body.type ?? body.mission_event)?.toUpperCase(),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  };
}

export function mapCurrentJobToPayload(telemetry = {}, metadata = {}) {
  const game = str(telemetry.game ?? metadata?.game)?.toLowerCase();
  const job = telemetry.current_job ?? telemetry.currentJob;
  if (!job) return null;

  if (typeof job === 'string') {
    const parts = job.split(/→|->|—| to /i).map((s) => s.trim()).filter(Boolean);
    const localJobId = str(telemetry.local_job_id ?? telemetry.localJobId)
      ?? `route-${parts.join('-').toLowerCase().replace(/\s+/g, '-')}`;
    return {
      ...telemetry,
      localJobId,
      game: game || 'ets2',
      sourceCity: parts[0] ?? null,
      destinationCity: parts[1] ?? null,
      metadata,
    };
  }

  if (typeof job === 'object') {
    return {
      ...telemetry,
      ...job,
      localJobId: str(job.local_job_id ?? job.localJobId ?? job.id ?? telemetry.local_job_id),
      game: game || str(job.game)?.toLowerCase() || 'ets2',
      metadata,
    };
  }

  return null;
}

export function telemetryJobToActiveMission(job) {
  return {
    id: job.mission_id || job.id,
    reference: `TLM-${String(job.local_job_id || job.id).slice(0, 12)}`,
    client_name: job.source_company || 'Télémétrie ETS2/ATS',
    departure_city: job.source_city,
    arrival_city: job.destination_city,
    delivery_date: (job.started_at || new Date().toISOString()).slice(0, 10),
    cargo: job.cargo,
    status: 'in_progress',
    priority: 'normal',
    distance_km: job.expected_distance_km ?? job.actual_distance_km ?? 0,
    source: 'telemetry',
    provider: job.provider || 'zd_telemetry',
    game: job.game,
    telemetry_job_id: job.id,
    local_job_id: job.local_job_id,
    progress_percent: job.metadata?.last_progress_percent ?? null,
    last_sync_at: job.last_sync_at,
  };
}

export async function processSyncJobEvent(profile, driver, body = {}) {
  const event = str(body.event ?? body.type ?? body.job_event ?? body.mission_event ?? body.telemetry?.event ?? body.telemetry?.mission_event)?.toUpperCase();
  const payload = { ...body, ...body.job, ...body.telemetry, metadata: body.metadata };

  if (event === 'JOB_STARTED' || event === 'JOB_START') {
    return await startTelemetryJob(profile, driver, payload);
  }
  if (event === 'JOB_DELIVERED' || event === 'JOB_COMPLETE' || event === 'JOB_COMPLETED') {
    return await completeTelemetryJob(profile, driver, payload);
  }
  if (event === 'JOB_CANCELLED' || event === 'JOB_CANCELED') {
    return await cancelTelemetryJob(profile, driver, payload);
  }
  if (event === 'JOB_UPDATE' || event === 'JOB_UPDATED') {
    return await updateTelemetryJob(profile, driver, payload);
  }

  const telemetry = body.telemetry;
  if (telemetry && typeof telemetry === 'object' && (telemetry.current_job || telemetry.currentJob)) {
    const mapped = mapCurrentJobToPayload(telemetry, body.metadata);
    if (!mapped?.localJobId) return null;

    const resolvedGame = mapped.game && VALID_GAMES.has(mapped.game) ? mapped.game : 'ets2';
    const existing = await findExistingJob(profile.id, mapped.localJobId, resolvedGame);

    if (!existing) {
      if (mapped.sourceCity && mapped.destinationCity) {
        return await startTelemetryJob(profile, driver, { ...mapped, game: resolvedGame });
      }
      return null;
    }

    if (ACTIVE_STATUSES.has(existing.status)) {
      return await updateTelemetryJob(profile, driver, { ...mapped, localJobId: mapped.localJobId, game: resolvedGame });
    }
  }

  return null;
}

function validateStartPayload(payload) {
  if (!payload.localJobId) return 'local_job_id requis';
  if (!payload.game || !VALID_GAMES.has(payload.game)) return 'game doit être ets2 ou ats';
  if (!payload.sourceCity || !payload.destinationCity) return 'villes de départ et arrivée requises';
  if (payload.expectedDistanceKm != null && payload.expectedDistanceKm < 0) return 'distance invalide';
  if (payload.expectedIncome != null && payload.expectedIncome < 0) return 'revenu invalide';
  return null;
}

async function fetchFinanceAutoValidation() {
  const { data } = await supabaseAdmin
    .from('finance_settings')
    .select('validation_automatique_livraisons')
    .limit(1)
    .maybeSingle();
  return data?.validation_automatique_livraisons !== false;
}

async function notifyUser(userId, title, message, type = 'info') {
  try {
    await supabaseAdmin.rpc('create_user_notification', {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: type,
    });
  } catch {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
    });
  }
}

async function notifyAdmins(title, message, type = 'info') {
  try {
    await supabaseAdmin.rpc('notify_users_by_roles', {
      p_roles: ['admin', 'pdg', 'patron', 'dispatcher', 'directeur'],
      p_title: title,
      p_message: message,
      p_type: type,
    });
  } catch { /* ignore */ }
}

async function findExistingJob(profileId, localJobId, game) {
  const { data } = await supabaseAdmin
    .from('telemetry_jobs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('local_job_id', localJobId)
    .eq('game', game)
    .maybeSingle();
  return data;
}

async function findActiveJobForProfile(profileId) {
  const { data } = await supabaseAdmin
    .from('telemetry_jobs')
    .select('*')
    .eq('profile_id', profileId)
    .in('status', [...ACTIVE_STATUSES])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function setDriverDeliveryStatus(driverId, profileId, delivering) {
  if (!driverId) return;
  const now = new Date().toISOString();
  await supabaseAdmin.from('drivers').update({
    driving_status: delivering ? 'driving' : 'resting',
    presence_status: delivering ? 'driving' : 'online',
    updated_at: now,
  }).eq('id', driverId);

  await supabaseAdmin.from('driver_presence').upsert({
    user_id: profileId,
    driver_id: driverId,
    status: delivering ? 'on_route' : 'online',
    last_seen: now,
  }, { onConflict: 'user_id' });
}

async function createRoadSheet(profile, driver, payload, telemetryJobId) {
  const km = payload.expectedDistanceKm || 1;
  const revenue = payload.expectedIncome || km * 1.8;
  const pricePerKm = km > 0 ? revenue / km : 1.8;
  const driverName = displayDriverName(profile, driver, profile.email);

  const { data, error } = await supabaseAdmin.from('road_sheets').insert({
    driver_id: driver?.id ?? null,
    driver_user_id: profile.id,
    driver_name: driverName,
    truck_id: driver?.truck_id ?? null,
    departure: payload.sourceCity,
    arrival: payload.destinationCity,
    departure_city: payload.sourceCity,
    arrival_city: payload.destinationCity,
    cargo: payload.cargo,
    cargo_type: payload.cargo,
    km: Math.round(km),
    total_distance: Math.round(km),
    price_per_km: pricePerKm,
    revenue,
    fuel_consumption_l100: 32,
    fuel_price_per_liter: 1.85,
    fuel_liters: payload.fuelStart,
    repair_cost: (payload.truckDamageStart ?? 0) * 100,
    validated: false,
    status: 'submitted',
    source: 'telemetry',
    game: payload.game,
    local_job_id: payload.localJobId,
    telemetry_job_id: telemetryJobId,
    notes: `Auto télémétrie ${payload.game.toUpperCase()} — ${payload.sourceCity} → ${payload.destinationCity}`,
    date: (payload.startedAt || new Date().toISOString()).slice(0, 10),
    trailer_type: payload.trailerName,
  }).select('id').single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function createTransportMission(profile, driver, payload, roadSheetId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin.from('transport_missions').insert({
    client_name: payload.sourceCompany || 'Télémétrie ETS2/ATS',
    departure_city: payload.sourceCity,
    arrival_city: payload.destinationCity,
    delivery_date: today,
    cargo: payload.cargo,
    weight_kg: payload.cargoMassKg ?? 0,
    distance_km: payload.expectedDistanceKm ?? 0,
    price: payload.expectedIncome ?? 0,
    priority: 'normal',
    status: 'in_progress',
    driver_id: driver?.id ?? null,
    truck_id: driver?.truck_id ?? null,
    road_sheet_id: roadSheetId,
    route_notes: `Mission auto — ${payload.game.toUpperCase()} (${payload.localJobId})`,
    created_by: profile.id,
  }).select('id, reference').single();

  if (error) throw new Error(error.message);
  return data;
}

async function createDeliveryTracking(driver, payload, missionId) {
  const pos = payload.startPosition;
  const { data, error } = await supabaseAdmin.from('delivery_tracking').insert({
    mission_id: missionId,
    driver_id: driver?.id ?? null,
    truck_id: driver?.truck_id ?? null,
    departure_city: payload.sourceCity,
    arrival_city: payload.destinationCity,
    departure_lat: pos?.lat ?? null,
    departure_lng: pos?.lng ?? null,
    current_lat: pos?.lat ?? null,
    current_lng: pos?.lng ?? null,
    cargo: payload.cargo,
    distance_km: payload.expectedDistanceKm ?? 0,
    remaining_km: payload.expectedDistanceKm ?? 0,
    progress_percent: 0,
    status: 'on_route',
    source: 'ets2_telemetry',
    is_active: true,
    last_status_at: new Date().toISOString(),
  }).select('id').single();

  if (error) throw new Error(error.message);
  return data.id;
}

function formatJobResponse(job, extras = {}) {
  return {
    id: job.id,
    localJobId: job.local_job_id,
    game: job.game,
    status: job.status,
    cargo: job.cargo,
    sourceCity: job.source_city,
    destinationCity: job.destination_city,
    expectedDistanceKm: job.expected_distance_km,
    actualDistanceKm: job.actual_distance_km,
    progressPercent: job.metadata?.last_progress_percent ?? null,
    roadSheetId: job.road_sheet_id,
    missionId: job.mission_id,
    trackingId: job.tracking_id,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    lastSyncAt: job.last_sync_at,
    ...extras,
  };
}

export async function startTelemetryJob(profile, driver, body) {
  if (!isSupabaseAdminReady()) {
    const err = new Error('Base de données ERP indisponible (SUPABASE_SERVICE_ROLE_KEY manquante)');
    err.status = 503;
    throw err;
  }

  const payload = normalizeJobPayload(body);
  const validationError = validateStartPayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.status = 400;
    throw err;
  }

  const existing = await findExistingJob(profile.id, payload.localJobId, payload.game);
  if (existing) {
    if (ACTIVE_STATUSES.has(existing.status) || existing.status === 'pending_validation') {
      await supabaseAdmin.from('telemetry_jobs').update({
        status: existing.status === 'detected' ? 'active' : existing.status,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      return { job: existing, created: false, idempotent: true };
    }
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return { job: existing, created: false, idempotent: true, terminal: true };
    }
  }

  const now = new Date().toISOString();
  const startedAt = payload.startedAt || now;

  const { data: job, error: jobError } = await supabaseAdmin.from('telemetry_jobs').insert({
    profile_id: profile.id,
    driver_id: driver?.id ?? null,
    local_job_id: payload.localJobId,
    game: payload.game,
    provider: 'zd_telemetry',
    status: 'active',
    cargo: payload.cargo,
    cargo_mass_kg: payload.cargoMassKg,
    source_city: payload.sourceCity,
    source_company: payload.sourceCompany,
    destination_city: payload.destinationCity,
    destination_company: payload.destinationCompany,
    expected_income: payload.expectedIncome,
    expected_distance_km: payload.expectedDistanceKm,
    fuel_start: payload.fuelStart,
    truck_damage_start: payload.truckDamageStart,
    truck_name: payload.truckName,
    truck_plate: payload.truckPlate,
    trailer_name: payload.trailerName,
    trailer_plate: payload.trailerPlate,
    start_position: payload.startPosition,
    started_at: startedAt,
    last_sync_at: now,
    metadata: { ...payload.metadata, provider: 'zd_telemetry' },
  }).select('*').single();

  if (jobError) {
    if (jobError.code === '23505') {
      const dup = await findExistingJob(profile.id, payload.localJobId, payload.game);
      if (dup) return { job: dup, created: false, idempotent: true };
    }
    throw new Error(jobError.message);
  }

  let roadSheetId = null;
  let missionId = null;
  let trackingId = null;

  try {
    roadSheetId = await createRoadSheet(profile, driver, payload, job.id);
    const mission = await createTransportMission(profile, driver, payload, roadSheetId);
    missionId = mission.id;
    trackingId = await createDeliveryTracking(driver, payload, missionId);

    await supabaseAdmin.from('telemetry_jobs').update({
      road_sheet_id: roadSheetId,
      mission_id: missionId,
      tracking_id: trackingId,
      updated_at: now,
    }).eq('id', job.id);

    await setDriverDeliveryStatus(driver?.id, profile.id, true);

    const routeLabel = `${payload.sourceCity} → ${payload.destinationCity}`;
    const driverLabel = displayDriverName(profile, driver, profile.email);
    await notifyUser(
      profile.id,
      'Livraison détectée',
      `Votre livraison ${routeLabel} a été détectée.`,
      'road_sheet',
    );
    await notifyAdmins(
      'Nouvelle livraison télémétrie',
      `${driverLabel} vient de commencer une livraison (${routeLabel}).`,
      'road_sheet',
    );

    const refreshed = await findExistingJob(profile.id, payload.localJobId, payload.game);
    return { job: refreshed ?? { ...job, road_sheet_id: roadSheetId, mission_id: missionId, tracking_id: trackingId }, created: true };
  } catch (err) {
    await supabaseAdmin.from('telemetry_jobs').update({
      status: 'sync_error',
      metadata: { ...job.metadata, error: err.message },
      updated_at: now,
    }).eq('id', job.id);
    await notifyUser(
      profile.id,
      'Erreur synchronisation',
      'La synchronisation de votre mission a rencontré une erreur.',
      'error',
    );
    throw err;
  }
}

export async function updateTelemetryJob(profile, driver, body) {
  const payload = normalizeJobPayload(body);
  if (!payload.localJobId) {
    const err = new Error('local_job_id requis');
    err.status = 400;
    throw err;
  }

  let job = payload.game
    ? await findExistingJob(profile.id, payload.localJobId, payload.game)
    : null;

  if (!job) {
    job = await findActiveJobForProfile(profile.id);
  }

  if (!job || job.profile_id !== profile.id) {
    const err = new Error('Mission introuvable');
    err.status = 404;
    throw err;
  }

  if (!ACTIVE_STATUSES.has(job.status)) {
    return { job, updated: false, reason: 'mission_not_active' };
  }

  const now = new Date().toISOString();
  const jobStatus = payload.status === 'paused' ? 'paused' : 'active';
  const progress = payload.progressPercent ?? job.metadata?.last_progress_percent ?? null;

  await supabaseAdmin.from('telemetry_job_updates').insert({
    telemetry_job_id: job.id,
    speed_kmh: payload.speedKmh,
    fuel_liters: payload.fuelEnd ?? payload.fuelStart,
    truck_damage: payload.truckDamageEnd ?? payload.truckDamageStart,
    trailer_damage: payload.trailerDamageEnd,
    distance_remaining_km: payload.distanceRemainingKm,
    progress_percent: progress,
    eta_at: payload.etaAt,
    position: payload.position,
    status: payload.status || jobStatus,
  });

  const jobPatch = {
    status: jobStatus,
    last_sync_at: now,
    updated_at: now,
    fuel_end: payload.fuelEnd ?? job.fuel_end,
    truck_damage_end: payload.truckDamageEnd ?? job.truck_damage_end,
    trailer_damage_end: payload.trailerDamageEnd ?? job.trailer_damage_end,
    avg_speed_kmh: payload.avgSpeedKmh ?? job.avg_speed_kmh,
    max_speed_kmh: payload.maxSpeedKmh
      ? Math.max(Number(job.max_speed_kmh ?? 0), payload.maxSpeedKmh)
      : (payload.speedKmh ? Math.max(Number(job.max_speed_kmh ?? 0), payload.speedKmh) : job.max_speed_kmh),
    metadata: {
      ...(job.metadata || {}),
      last_progress_percent: progress,
      last_speed_kmh: payload.speedKmh,
      last_fuel: payload.fuelEnd ?? payload.fuelStart,
      last_sync_status: payload.status || jobStatus,
      last_remaining_km: payload.distanceRemainingKm ?? job.metadata?.last_remaining_km,
      eta_at: payload.etaAt ?? job.metadata?.eta_at,
    },
  };

  if (payload.actualDistanceKm != null) {
    jobPatch.actual_distance_km = payload.actualDistanceKm;
  }

  await supabaseAdmin.from('telemetry_jobs').update(jobPatch).eq('id', job.id);

  if (job.tracking_id) {
    const trackingPatch = {
      current_lat: payload.position?.lat ?? undefined,
      current_lng: payload.position?.lng ?? undefined,
      remaining_km: payload.distanceRemainingKm ?? undefined,
      progress_percent: progress ?? undefined,
      status: jobStatus === 'paused' ? 'paused' : 'on_route',
      eta_at: payload.etaAt ?? undefined,
      last_status_at: now,
      updated_at: now,
    };
    Object.keys(trackingPatch).forEach((k) => trackingPatch[k] === undefined && delete trackingPatch[k]);
    await supabaseAdmin.from('delivery_tracking').update(trackingPatch).eq('id', job.tracking_id);
  }

  if (driver?.id && payload.position) {
    await supabaseAdmin.from('driver_presence').upsert({
      user_id: profile.id,
      driver_id: driver.id,
      status: jobStatus === 'paused' ? 'online' : 'on_route',
      current_lat: payload.position.lat,
      current_lng: payload.position.lng,
      current_city: payload.sourceCity,
      truck_registration: payload.truckPlate || job.truck_plate,
      route_summary: `${job.source_city} → ${job.destination_city}`,
      last_seen: now,
    }, { onConflict: 'user_id' });
  }

  const { data: refreshed } = await supabaseAdmin.from('telemetry_jobs').select('*').eq('id', job.id).single();
  return { job: refreshed, updated: true };
}

async function finalizeRoadSheet(job, autoValidate) {
  if (!job.road_sheet_id) return;

  const km = Math.round(job.actual_distance_km ?? job.expected_distance_km ?? 0);
  const revenue = job.final_income ?? job.expected_income ?? 0;
  const fuelUsed = job.fuel_used ?? (
    job.fuel_start != null && job.fuel_end != null ? Math.max(0, job.fuel_start - job.fuel_end) : null
  );

  const patch = {
    km,
    total_distance: km,
    revenue,
    fuel_liters: fuelUsed,
    fuel_cost: fuelUsed != null ? fuelUsed * 1.85 : null,
    repair_cost: ((job.truck_damage_end ?? 0) + (job.trailer_damage_end ?? 0)) * 100,
    notes: `Télémétrie ${job.game?.toUpperCase()} — ${job.source_city} → ${job.destination_city}`,
    updated_at: new Date().toISOString(),
  };

  if (autoValidate) {
    patch.validated = true;
    patch.status = 'validated';
    patch.approved_at = new Date().toISOString();
  } else {
    patch.status = 'submitted';
    patch.validated = false;
  }

  await supabaseAdmin.from('road_sheets').update(patch).eq('id', job.road_sheet_id);
}

export async function completeTelemetryJob(profile, driver, body) {
  const payload = normalizeJobPayload(body);
  if (!payload.localJobId) {
    const err = new Error('local_job_id requis');
    err.status = 400;
    throw err;
  }

  const game = payload.game;
  let job = game ? await findExistingJob(profile.id, payload.localJobId, game) : null;
  if (!job) job = await findActiveJobForProfile(profile.id);

  if (!job || job.profile_id !== profile.id) {
    const err = new Error('Mission introuvable');
    err.status = 404;
    throw err;
  }

  if (job.status === 'completed' || job.status === 'pending_validation') {
    return { job, idempotent: true };
  }

  const now = new Date().toISOString();
  const fuelUsed = payload.fuelUsed ?? (
    payload.fuelStart != null && payload.fuelEnd != null
      ? Math.max(0, payload.fuelStart - payload.fuelEnd)
      : (job.fuel_start != null && (payload.fuelEnd ?? job.fuel_end) != null
        ? Math.max(0, job.fuel_start - (payload.fuelEnd ?? job.fuel_end))
        : null)
  );

  const actualKm = payload.actualDistanceKm ?? job.actual_distance_km ?? job.expected_distance_km;
  const autoValidate = await fetchFinanceAutoValidation();
  const finalStatus = autoValidate ? 'completed' : 'pending_validation';

  const jobPatch = {
    status: finalStatus,
    final_income: payload.finalIncome ?? payload.expectedIncome ?? job.expected_income,
    actual_distance_km: actualKm,
    fuel_end: payload.fuelEnd ?? job.fuel_end,
    fuel_used: fuelUsed,
    truck_damage_end: payload.truckDamageEnd ?? job.truck_damage_end,
    trailer_damage_end: payload.trailerDamageEnd ?? job.trailer_damage_end,
    avg_speed_kmh: payload.avgSpeedKmh ?? job.avg_speed_kmh,
    max_speed_kmh: payload.maxSpeedKmh ?? job.max_speed_kmh,
    end_position: payload.endPosition ?? payload.position ?? job.end_position,
    completed_at: payload.completedAt || now,
    last_sync_at: now,
    updated_at: now,
    metadata: {
      ...(job.metadata || {}),
      duration_minutes: job.started_at
        ? Math.round((new Date(now).getTime() - new Date(job.started_at).getTime()) / 60000)
        : null,
    },
  };

  await supabaseAdmin.from('telemetry_jobs').update(jobPatch).eq('id', job.id);

  if (job.tracking_id) {
    await supabaseAdmin.from('delivery_tracking').update({
      status: 'delivered',
      progress_percent: 100,
      remaining_km: 0,
      is_active: false,
      current_lat: payload.endPosition?.lat ?? payload.position?.lat,
      current_lng: payload.endPosition?.lng ?? payload.position?.lng,
      last_status_at: now,
      updated_at: now,
    }).eq('id', job.tracking_id);
  }

  if (job.mission_id) {
    await supabaseAdmin.from('transport_missions').update({
      status: 'delivered',
      distance_km: actualKm,
      price: jobPatch.final_income,
      updated_at: now,
    }).eq('id', job.mission_id);
  }

  const { data: refreshed } = await supabaseAdmin.from('telemetry_jobs').select('*').eq('id', job.id).single();
  await finalizeRoadSheet(refreshed, autoValidate);

  if (autoValidate) {
    await supabaseAdmin.rpc('apply_telemetry_job_stats', { p_job_id: job.id });
  }

  await setDriverDeliveryStatus(driver?.id, profile.id, false);

  const kmLabel = Math.round(Number(actualKm) || 0);
  await notifyUser(
    profile.id,
    'Livraison terminée',
    `Livraison terminée : ${kmLabel} km enregistrés.`,
    'success',
  );
  await notifyAdmins(
    'Livraison terminée',
    `${displayDriverName(profile, driver, profile.email)} vient de terminer une livraison (${kmLabel} km).`,
    'success',
  );

  const { data: finalJob } = await supabaseAdmin.from('telemetry_jobs').select('*').eq('id', job.id).single();
  return { job: finalJob, autoValidated: autoValidate };
}

export async function cancelTelemetryJob(profile, driver, body) {
  const payload = normalizeJobPayload(body);
  if (!payload.localJobId) {
    const err = new Error('local_job_id requis');
    err.status = 400;
    throw err;
  }

  let job = payload.game
    ? await findExistingJob(profile.id, payload.localJobId, payload.game)
    : null;
  if (!job) job = await findActiveJobForProfile(profile.id);

  if (!job || job.profile_id !== profile.id) {
    const err = new Error('Mission introuvable');
    err.status = 404;
    throw err;
  }

  if (job.status === 'cancelled') {
    return { job, idempotent: true };
  }

  const now = new Date().toISOString();
  await supabaseAdmin.from('telemetry_jobs').update({
    status: 'cancelled',
    cancel_reason: payload.cancelReason,
    cancelled_at: now,
    last_sync_at: now,
    updated_at: now,
  }).eq('id', job.id);

  if (job.road_sheet_id) {
    await supabaseAdmin.from('road_sheets').update({
      status: 'rejected',
      rejection_reason: payload.cancelReason || 'Mission annulée dans le jeu',
      rejected_at: now,
      updated_at: now,
    }).eq('id', job.road_sheet_id);
  }

  if (job.tracking_id) {
    await supabaseAdmin.from('delivery_tracking').update({
      status: 'cancelled',
      is_active: false,
      updated_at: now,
    }).eq('id', job.tracking_id);
  }

  if (job.mission_id) {
    await supabaseAdmin.from('transport_missions').update({
      status: 'cancelled',
      updated_at: now,
    }).eq('id', job.mission_id);
  }

  await setDriverDeliveryStatus(driver?.id, profile.id, false);

  await notifyUser(
    profile.id,
    'Livraison annulée',
    'Votre livraison a été marquée comme annulée.',
    'warning',
  );

  const { data: finalJob } = await supabaseAdmin.from('telemetry_jobs').select('*').eq('id', job.id).single();
  return { job: finalJob };
}

export async function fetchActiveTelemetryJob(profileId) {
  const { data } = await supabaseAdmin
    .from('telemetry_jobs')
    .select('*')
    .eq('profile_id', profileId)
    .in('status', [...ACTIVE_STATUSES, 'pending_validation'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchTelemetryJobHistory(profileId, limit = 30) {
  const { data } = await supabaseAdmin
    .from('telemetry_jobs')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export { formatJobResponse };
