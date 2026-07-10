import { loadClientContext } from './middleware.mjs';
import {
  startTelemetryJob,
  updateTelemetryJob,
  completeTelemetryJob,
  cancelTelemetryJob,
  fetchActiveTelemetryJob,
  fetchTelemetryJobHistory,
  formatJobResponse,
} from './jobsService.mjs';

async function withClientContext(req, res, handler) {
  try {
    const { profile, driver } = await loadClientContext(req.clientUser.id, req.clientToken);
    const result = await handler(profile, driver, req.body ?? {});
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur serveur', success: false });
  }
}

export async function handleJobStart(req, res) {
  return withClientContext(req, res, async (profile, driver, body) => {
    const { job, created, idempotent, terminal } = await startTelemetryJob(profile, driver, body);
    return {
      success: true,
      created: created ?? false,
      idempotent: idempotent ?? false,
      terminal: terminal ?? false,
      job: formatJobResponse(job),
    };
  });
}

export async function handleJobUpdate(req, res) {
  return withClientContext(req, res, async (profile, driver, body) => {
    const { job, updated, reason } = await updateTelemetryJob(profile, driver, body);
    return {
      success: true,
      updated: updated ?? true,
      reason: reason ?? null,
      job: formatJobResponse(job),
    };
  });
}

export async function handleJobComplete(req, res) {
  return withClientContext(req, res, async (profile, driver, body) => {
    const { job, idempotent, autoValidated } = await completeTelemetryJob(profile, driver, body);
    return {
      success: true,
      idempotent: idempotent ?? false,
      autoValidated: autoValidated ?? false,
      job: formatJobResponse(job),
    };
  });
}

export async function handleJobCancel(req, res) {
  return withClientContext(req, res, async (profile, driver, body) => {
    const { job, idempotent } = await cancelTelemetryJob(profile, driver, body);
    return {
      success: true,
      idempotent: idempotent ?? false,
      job: formatJobResponse(job),
    };
  });
}

export async function handleJobActive(req, res) {
  try {
    const { profile } = await loadClientContext(req.clientUser.id, req.clientToken);
    const job = await fetchActiveTelemetryJob(profile.id);
    return res.json({
      success: true,
      job: job ? formatJobResponse(job) : null,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur serveur', success: false });
  }
}

export async function handleJobHistory(req, res) {
  try {
    const { profile } = await loadClientContext(req.clientUser.id, req.clientToken);
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const jobs = await fetchTelemetryJobHistory(profile.id, limit);
    return res.json({
      success: true,
      jobs: jobs.map((j) => formatJobResponse(j)),
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur serveur', success: false });
  }
}
