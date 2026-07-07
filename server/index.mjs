import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyCronAuth } from './lib/auth.mjs';
import { handleGenerateFreight } from './cron/generateFreight.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'zd-thermoliner' });
});

app.use(express.static(distPath));

app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[Z&D] Server listening on :${port}`);
});
