#!/usr/bin/env node
/**
 * Z&D Thermoliner — Automatic Logistics Engine
 * Coolify scheduled task (every 30 min): node scripts/generate-freight-cron.js
 *
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { handleGenerateFreight } from '../server/cron/generateFreight.mjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(msg) {
  console.log(`[logistics-engine] ${new Date().toISOString()} ${msg}`);
}

function logError(msg) {
  console.error(`[logistics-engine] ${new Date().toISOString()} ERROR: ${msg}`);
}

async function main() {
  if (!supabaseUrl || !serviceKey) {
    logError('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Ensure service-role client env is set for the engine module
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || supabaseUrl;

  const probe = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: connErr } = await probe.from('freight_offers').select('id').limit(1);
  if (connErr) {
    logError(`Supabase connection failed: ${connErr.message}`);
    process.exit(1);
  }

  log('Engine started — generating European freight offers…');

  const result = await handleGenerateFreight();

  log(`Target: ${result.target ?? '—'} | Created: ${result.created} | Chains: ${result.chained ?? 0}`);
  log(`Archived: ${result.archived} | Skipped (duplicates): ${result.skipped ?? 0}`);
  log(`Duration: ${result.duration_ms}ms`);

  if (result.singles?.length) {
    log('Singles:');
    for (const s of result.singles) {
      log(`  • ${s.route} [${s.cargo}] — profit €${s.profit}`);
    }
  }

  if (result.chainDetails?.length) {
    log('Chained tours:');
    for (const c of result.chainDetails) {
      log(`  • ${c.title} (${c.legs} legs) — profit €${c.profit}`);
      log(`    ${c.route}`);
    }
  }

  if (result.errors.length > 0) {
    for (const err of result.errors) logError(err);
    process.exit(1);
  }

  log('Engine completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  logError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
