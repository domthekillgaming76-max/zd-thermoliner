import './loadEnv.mjs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyCronAuth } from './lib/auth.mjs';
import { handleGenerateFreight } from './cron/generateFreight.mjs';
import { handleSyncIntegrations } from './cron/syncIntegrations.mjs';
import { handleProcessClovisRentals } from './cron/processClovisRentals.mjs';
import { clientApiRouter } from './api/client/router.mjs';
import { supabaseAdmin, isSupabaseAdminReady } from './lib/supabaseAdmin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
app.set('trust proxy', 1);

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

async function runClovisRentalsCron(req, res) {
  try {
    const result = await handleProcessClovisRentals();
    const status = result.errors.length && result.charged === 0 ? 500 : 200;
    res.status(status).json({ ok: status === 200, ...result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      charged: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    });
  }
}

app.get('/api/cron/process-clovis-rentals', verifyCronAuth, runClovisRentalsCron);
app.post('/api/cron/process-clovis-rentals', verifyCronAuth, runClovisRentalsCron);

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

const downloadsPath = path.join(distPath, 'downloads');

app.get('/downloads/:filename', (req, res, next) => {
  const safeName = path.basename(req.params.filename);
  if (!safeName.endsWith('.exe')) {
    return res.status(404).type('text/plain').send('Fichier introuvable.');
  }
  const filePath = path.resolve(downloadsPath, safeName);
  if (!filePath.startsWith(path.resolve(downloadsPath))) {
    return res.status(404).type('text/plain').send('Fichier introuvable.');
  }
  return res.sendFile(filePath, err => {
    if (err) next(err);
  });
});

app.use('/downloads', express.static(downloadsPath, {
  maxAge: '1d',
  setHeaders(res, filePath) {
    if (filePath.toLowerCase().endsWith('.exe')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  },
}));

app.use(express.static(distPath, {
  maxAge: '7d',
  setHeaders(res, filePath) {
    const base = path.basename(filePath);
    if (base === 'index.html' || base === 'version.json' || base === 'sw.js') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

app.get(/^(?!\/api\/).*/, (req, res, next) => {
  const p = req.path.split('?')[0];
  if (p.startsWith('/downloads/')) {
    return res.status(404).type('text/plain').send('Installateur client introuvable — contactez l\'administration.');
  }
  const looksLikeAsset = /\.[a-z0-9]+$/i.test(p) && !p.endsWith('.html');
  if (looksLikeAsset) {
    return res.status(404).type('text/plain').send('Asset not found — rechargez (Ctrl+F5).');
  }
  return res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.listen(port, () => {
  console.log(`[Z&D] Server listening on :${port}`);
});
