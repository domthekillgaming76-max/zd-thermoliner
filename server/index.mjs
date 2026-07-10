import './loadEnv.mjs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyCronAuth } from './lib/auth.mjs';
import { handleGenerateFreight } from './cron/generateFreight.mjs';
import { handleSyncIntegrations } from './cron/syncIntegrations.mjs';
import { clientApiRouter } from './api/client/router.mjs';
import { supabaseAdmin, isSupabaseAdminReady } from './lib/supabaseAdmin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Client-Version');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

async function runCron(req, res) {
  try {
    const result = await handleGenerateFreight();
    const status = result.errors.length && result.created === 0 && result.archived === 0 ? 500 : 200;
    res.status(status).json({
      ok: status === 200,
      created: result.created,
      chained: result.chained,
      archived: result.archived,
      errors: result.errors,
      duration_ms: result.duration_ms,
      batch_id: result.batch_id,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      created: 0,
      chained: 0,
      archived: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    });
  }
}

app.get('/api/cron/generate-freight', verifyCronAuth, runCron);
app.post('/api/cron/generate-freight', verifyCronAuth, runCron);

async function runIntegrationsCron(req, res) {
  try {
    const result = await handleSyncIntegrations();
    const status = result.errors.length && result.synced === 0 ? 500 : 200;
    res.status(status).json({ ok: status === 200, ...result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      synced: 0,
      deliveriesProcessed: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    });
  }
}

app.get('/api/cron/sync-integrations', verifyCronAuth, runIntegrationsCron);
app.post('/api/cron/sync-integrations', verifyCronAuth, runIntegrationsCron);

app.get('/api/health', async (_req, res) => {
  const health = {
    ok: true,
    service: 'zd-thermoliner',
    supabaseAdmin: isSupabaseAdminReady(),
    telemetryJobsTable: false,
    timestamp: new Date().toISOString(),
  };

  if (!health.supabaseAdmin) {
    health.ok = false;
    health.error = 'SUPABASE_SERVICE_ROLE_KEY manquante';
    return res.status(503).json(health);
  }

  const { error } = await supabaseAdmin.from('telemetry_jobs').select('id').limit(1);
  if (error) {
    health.ok = false;
    health.telemetryJobsError = error.message;
    health.hint = error.code === '42P01'
      ? 'Exécutez supabase/migrations/20260710000000_066_telemetry_jobs.sql'
      : undefined;
    return res.status(503).json(health);
  }

  health.telemetryJobsTable = true;
  return res.json(health);
});

app.use('/api/client', clientApiRouter);

app.use(express.static(distPath));

app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[Z&D] Server listening on :${port}`);
});
