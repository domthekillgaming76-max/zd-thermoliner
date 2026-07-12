import { getSupabaseAuth, isSupabaseAuthReady } from '../../lib/supabaseAuth.mjs';
import { supabaseAdmin, isSupabaseAdminReady } from '../../lib/supabaseAdmin.mjs';
import { resolveRoutePosition } from '../../lib/trackingMapCoords.mjs';
import { loadClientContext, displayDriverName, displayCompany } from './middleware.mjs';
import {
  fetchActiveTelemetryJob,
  formatJobResponse,
  processSyncJobEvent,
  telemetryJobToActiveMission,
} from './jobsService.mjs';

const ERP_VERSION = process.env.ERP_VERSION || '2.6.1';

function parsePosition(position) {
  if (!position || typeof position !== 'object') return { lat: null, lng: null };
  const lat = position.lat ?? position.latitude ?? null;
  const lng = position.lng ?? position.longitude ?? null;
  return {
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
  };
}

function mapPresenceStatus(gameRunning, speed, status) {
  if (!gameRunning) return 'offline';
  if (status === 'on_route' || status === 'driving') return 'on_route';
  if (Number(speed) > 5) return 'on_route';
  return 'online';
}

function normalizeTruckLabel(body) {
  if (body.truck) return String(body.truck);
  const brand = body.truckBrand || body.truck_brand || '';
  const model = body.truckModel || body.truck_model || '';
  const label = [brand, model].filter(Boolean).join(' ').trim();
  return label || null;
}

function isGameRunning(body) {
  if (body.game_running != null) return Boolean(body.game_running);
  const game = body.game || body.metadata?.game;
  return game === 'ets2' || game === 'ats';
}

async function storeClientTelemetry(profile, driver, body) {
  const rawPos = parsePosition(body.position);
  const mapPos = resolveRoutePosition(
    body.departure_city,
    body.arrival_city,
    Number(body.progress ?? body.progress_percent ?? 5),
    rawPos.lat != null && rawPos.lng != null ? { lat: rawPos.lat, lng: rawPos.lng } : null,
  );
  const lat = mapPos.lat;
  const lng = mapPos.lng;
  const speed = body.speed != null ? Number(body.speed) : 0;
  const gameRunning = isGameRunning(body);
  const presenceStatus = mapPresenceStatus(gameRunning, speed, body.status);
  const now = body.timestamp || new Date().toISOString();
  const routeSummary = body.current_job
    || (body.departure_city && body.arrival_city ? `${body.departure_city} → ${body.arrival_city}` : null)
    || (body.odometer != null ? `Odomètre ${body.odometer} km` : null);
  const truckRegistration = normalizeTruckLabel(body);
  const city = body.city || body.departure_city || null;
  const stored = { driver_presence: false, gps_position: false };

  const driverId = driver?.id ?? null;

  await supabaseAdmin.from('driver_presence').upsert({
    user_id: profile.id,
    driver_id: driverId,
    status: presenceStatus,
    current_city: city,
    current_lat: lat,
    current_lng: lng,
    truck_registration: truckRegistration,
    route_summary: routeSummary,
    last_seen: now,
  }, { onConflict: 'user_id' });
  stored.driver_presence = true;

  if (lat != null && lng != null) {
    let trackingId = null;
    if (driverId) {
      const { data: tracking } = await supabaseAdmin
        .from('delivery_tracking')
        .select('id')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      trackingId = tracking?.id ?? null;
    }

    if (!trackingId && body.local_job_id) {
      const { data: telemetryJob } = await supabaseAdmin
        .from('telemetry_jobs')
        .select('tracking_id')
        .eq('profile_id', profile.id)
        .eq('local_job_id', body.local_job_id)
        .in('status', ['detected', 'active', 'paused'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      trackingId = telemetryJob?.tracking_id ?? null;
    }

    await supabaseAdmin.from('gps_positions').insert({
      tracking_id: trackingId,
      driver_id: driverId,
      truck_id: driver?.truck_id ?? null,
      lat,
      lng,
      speed_kmh: speed,
      is_moving: speed > 2,
      source: 'ets2_telemetry',
      recorded_at: now,
      created_by: profile.id,
    });
    stored.gps_position = true;

    if (trackingId && ['paused', 'error', 'late'].includes(body.status)) {
      const alertType = body.status === 'paused' ? 'driver_paused'
        : body.status === 'late' ? 'late_delivery'
          : 'no_status_update';

      await supabaseAdmin.from('tracking_alerts').insert({
        tracking_id: trackingId,
        alert_type: alertType,
        severity: body.status === 'error' ? 'danger' : 'warning',
        message: `Client ETS2/ATS — statut ${body.status} (${body.game || 'unknown'})`,
      });
    }
  }

  return stored;
}

async function resolveCompanyStatus() {
  const { data: health } = await supabaseAdmin.from('system_health').select('status');
  if (!health?.length) return 'active';
  if (health.some((h) => h.status === 'down')) return 'down';
  if (health.some((h) => h.status === 'degraded')) return 'degraded';
  return 'active';
}

async function fetchActiveMissions(driverId) {
  if (!driverId) return [];
  const { data } = await supabaseAdmin
    .from('transport_missions')
    .select('id, reference, client_name, departure_city, arrival_city, delivery_date, cargo, status, priority, distance_km')
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'in_progress'])
    .order('delivery_date', { ascending: true })
    .limit(20);
  return data ?? [];
}

async function fetchLatestClientRelease() {
  try {
    const { data, error } = await supabaseAdmin
      .from('client_app_releases')
      .select('version, download_url, changelog, mandatory')
      .eq('is_latest', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

function compareVersions(a, b) {
  const pa = String(a || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function handleClientLogin(req, res) {
  try {
    if (!isSupabaseAuthReady()) {
      return res.status(503).json({ error: 'Authentification non configurée', message: 'SUPABASE_ANON_KEY requis' });
    }

    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const authClient = getSupabaseAuth();
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const { profile, driver } = await loadClientContext(data.session.user.id, data.session.access_token);

    return res.json({
      token: data.session.access_token,
      driverName: displayDriverName(profile, driver, email),
      company: displayCompany(driver),
      email: profile.email,
      role: profile.role,
      profileId: profile.id,
      driverId: driver?.id ?? null,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur de connexion' });
  }
}

export async function handleClientLogout(req, res) {
  try {
    const token = req.clientToken;
    if (token) {
      await supabaseAdmin.auth.admin.signOut(token, 'global');
    }
    return res.status(204).send();
  } catch {
    return res.status(204).send();
  }
}

export async function handleClientMe(req, res) {
  try {
    const { profile, driver } = await loadClientContext(req.clientUser.id, req.clientToken);
    return res.json({
      email: profile.email,
      driverName: displayDriverName(profile, driver, profile.email),
      company: displayCompany(driver),
      role: profile.role,
      profileId: profile.id,
      driverId: driver?.id ?? null,
      driverStatus: driver?.status ?? 'active',
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur profil' });
  }
}

export async function handleClientTelemetry(req, res) {
  try {
    const { profile, driver } = await loadClientContext(req.clientUser.id, req.clientToken);
    const body = req.body ?? {};

    const profileId = body.profile_id || profile.id;
    if (profileId !== profile.id) {
      return res.status(403).json({ error: 'profile_id ne correspond pas au token' });
    }

    const stored = await storeClientTelemetry(profile, driver, body);

    let jobResult = null;
    let jobError = null;
    const missionEvent = body.mission_event || body.event;
    const gameRunning = isGameRunning(body);
    try {
      if (missionEvent && missionEvent !== 'JOB_UPDATE') {
        jobResult = await processSyncJobEvent(profile, driver, {
          ...body,
          event: missionEvent,
          job: body,
        });
      } else if (body.local_job_id && gameRunning) {
        const activeJob = await fetchActiveTelemetryJob(profile.id);
        if (activeJob?.local_job_id === body.local_job_id) {
          jobResult = await processSyncJobEvent(profile, driver, {
            ...body,
            event: 'JOB_UPDATE',
          });
        } else if (body.departure_city && body.arrival_city) {
          jobResult = await processSyncJobEvent(profile, driver, {
            ...body,
            event: 'JOB_STARTED',
          });
        }
      } else if (missionEvent === 'JOB_UPDATE' && body.local_job_id) {
        jobResult = await processSyncJobEvent(profile, driver, {
          ...body,
          event: 'JOB_UPDATE',
        });
      }
    } catch (err) {
      jobError = err.message || 'Erreur synchronisation mission';
      console.error('[Z&D] handleClientTelemetry job:', jobError);
    }

    return res.json({
      ok: true,
      stored,
      job: jobResult,
      jobError,
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur télémétrie' });
  }
}

export async function handleClientSync(req, res) {
  try {
    const { profile, driver } = await loadClientContext(req.clientUser.id, req.clientToken);
    const body = req.body ?? {};
    let telemetryStored = null;

    if (body.telemetry && typeof body.telemetry === 'object') {
      telemetryStored = await storeClientTelemetry(profile, driver, {
        ...body.telemetry,
        metadata: body.metadata,
        game: body.telemetry.game || body.metadata?.game,
      });
    }

    let jobResult = null;
    let jobError = null;
    try {
      jobResult = await processSyncJobEvent(profile, driver, body);
    } catch (err) {
      jobError = err.message || 'Erreur synchronisation mission';
      console.error('[Z&D] handleClientSync job:', jobError);
    }

    const companyStatus = await resolveCompanyStatus();
    let activeMissions = await fetchActiveMissions(driver?.id);
    const telemetryJob = await fetchActiveTelemetryJob(profile.id);

    if (telemetryJob) {
      const telemetryMission = telemetryJobToActiveMission(telemetryJob);
      const alreadyListed = activeMissions.some(
        (m) => m.id === telemetryMission.id || m.telemetry_job_id === telemetryJob.id,
      );
      if (!alreadyListed) {
        activeMissions = [telemetryMission, ...activeMissions];
      }
    }

    const formattedJob = telemetryJob ? formatJobResponse(telemetryJob) : null;

    return res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      profile: {
        id: profile.id,
        email: profile.email,
        driverName: displayDriverName(profile, driver, profile.email),
        role: profile.role,
        driverId: driver?.id ?? null,
      },
      role: profile.role,
      companyStatus,
      company: displayCompany(driver),
      erpVersion: ERP_VERSION,
      activeMissions,
      activeMission: activeMissions[0] ?? null,
      telemetryJob: formattedJob,
      currentJob: formattedJob,
      telemetryStored,
      job: jobResult,
      jobError,
      message: jobError ? 'Synchronisation partielle (erreur mission)' : 'Synchronisation réussie',
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur synchronisation', success: false });
  }
}

export async function handleClientUpdates(req, res) {
  try {
    const currentVersion = req.query.version || req.headers['x-client-version'] || '0.0.0';

    const dbRelease = await fetchLatestClientRelease();
    if (!dbRelease?.version) {
      return res.json({
        available: false,
        version: currentVersion,
        latest_version: currentVersion,
        releaseNotes: '',
        changelog: '',
        mandatory: false,
      });
    }

    const latestVersion = dbRelease.version;
    const downloadUrl = dbRelease.download_url || '';
    const changelog = dbRelease.changelog || '';
    const mandatory = dbRelease.mandatory ?? false;
    const available = compareVersions(latestVersion, currentVersion) > 0;

    return res.json({
      available,
      latest_version: latestVersion,
      version: latestVersion,
      download_url: downloadUrl,
      downloadUrl,
      changelog,
      releaseNotes: changelog,
      mandatory,
    });
  } catch (err) {
    return res.status(500).json({
      available: false,
      error: err instanceof Error ? err.message : 'Erreur mises à jour',
    });
  }
}

export async function handleClientHealth(req, res) {
  const health = {
    ok: true,
    supabaseAdmin: isSupabaseAdminReady(),
    telemetryJobsTable: false,
    erpVersion: ERP_VERSION,
    timestamp: new Date().toISOString(),
  };

  if (!health.supabaseAdmin) {
    health.ok = false;
    health.error = 'SUPABASE_SERVICE_ROLE_KEY manquante sur le serveur ERP';
    return res.status(503).json(health);
  }

  const { error } = await supabaseAdmin.from('telemetry_jobs').select('id').limit(1);
  if (error) {
    health.ok = false;
    health.telemetryJobsError = error.message;
    health.hint = error.code === '42P01'
      ? 'Exécutez la migration supabase/migrations/20260710000000_066_telemetry_jobs.sql'
      : undefined;
    return res.status(503).json(health);
  }

  health.telemetryJobsTable = true;
  return res.json(health);
}
