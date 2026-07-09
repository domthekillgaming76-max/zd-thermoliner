#!/usr/bin/env node
/**
 * Z&D Thermoliner — Driver Integrations Sync Cron
 * Coolify scheduled task (every 5 min): node scripts/sync-integrations-cron.js
 *
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (optional health)
 */

import { createClient } from '@supabase/supabase-js';
import { handleSyncIntegrations } from '../server/cron/syncIntegrations.mjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(msg) {
  console.log(`[integrations-cron] ${new Date().toISOString()} ${msg}`);
}

function logError(msg) {
  console.error(`[integrations-cron] ${new Date().toISOString()} ERROR: ${msg}`);
}

async function main() {
  if (!supabaseUrl || !serviceKey) {
    logError('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  process.env.SUPABASE_URL = process.env.SUPABASE_URL || supabaseUrl;

  const probe = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: connErr } = await probe.from('driver_integrations').select('id').limit(1);
  if (connErr) {
    logError(`Supabase connection failed: ${connErr.message}`);
    process.exit(1);
  }

  log('Starting integrations sync…');
  const result = await handleSyncIntegrations();

  log(`Integrations: ${result.synced}/${result.total} | Deliveries processed: ${result.deliveriesProcessed}`);
  log(`Duration: ${result.duration_ms}ms`);

  if (result.errors.length > 0) {
    for (const err of result.errors) logError(err);
    process.exit(result.synced > 0 ? 0 : 1);
  }

  log('Completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  logError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
