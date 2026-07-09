import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function syncTruckersMpProfile(supabase, integration) {
  const steamId = integration.external_user_id?.trim();
  if (!steamId) return { ok: false, message: 'Steam ID manquant' };

  const res = await fetch(`https://api.truckersmp.com/v2/player/${steamId}`);
  if (!res.ok) throw new Error(`TruckersMP API ${res.status}`);
  const json = await res.json();
  const player = json?.response;
  if (!player?.name) throw new Error('Joueur introuvable');

  await supabase.from('driver_integrations').update({
    external_username: player.name,
    metadata: {
      ...(integration.metadata ?? {}),
      truckersmp_id: player.id,
      last_api_check: new Date().toISOString(),
    },
    last_sync_at: new Date().toISOString(),
    last_error: null,
    status: 'connected',
    updated_at: new Date().toISOString(),
  }).eq('id', integration.id);

  return { ok: true, message: `TruckersMP — ${player.name}` };
}

async function processPendingDeliveries(supabase, profileId) {
  const { data: pending } = await supabase
    .from('external_deliveries')
    .select('id, profile_id, income, distance_km, departure_city, arrival_city, salary_credited')
    .eq('profile_id', profileId)
    .eq('sync_status', 'pending')
    .is('road_sheet_id', null)
    .limit(30);

  let processed = 0;
  for (const row of pending ?? []) {
    const { data: sheetId, error: sheetErr } = await supabase.rpc('create_integration_road_sheet', {
      p_delivery_id: row.id,
    });
    if (sheetErr) continue;

    const settingsRes = await supabase.from('finance_settings').select('delivery_bonus_eur, default_salary_per_km').limit(1).maybeSingle();
    const deliveryBonus = Number(settingsRes.data?.delivery_bonus_eur ?? 25);
    const kmRate = Number(settingsRes.data?.default_salary_per_km ?? 0.35);
    const km = Number(row.distance_km ?? 0);
    const income = Number(row.income ?? 0);
    const salary = Math.round((Math.max(income * 0.2, km * kmRate) + deliveryBonus) * 100) / 100;

    if (salary > 0 && !row.salary_credited) {
      await supabase.rpc('integration_credit_driver_salary', {
        p_profile_id: profileId,
        p_amount: salary,
        p_delivery_id: row.id,
        p_reason: `Salaire livraison ${row.departure_city ?? ''} → ${row.arrival_city ?? ''}`,
      });
    }

    if (sheetId) processed += 1;
  }
  return processed;
}

export async function handleSyncIntegrations() {
  const started = Date.now();
  const supabase = getAdmin();
  const errors = [];
  let synced = 0;
  let deliveriesProcessed = 0;

  const { data: integrations, error } = await supabase
    .from('driver_integrations')
    .select('id, profile_id, provider, external_user_id, external_username, status, metadata')
    .in('status', ['connected', 'pending']);

  if (error) throw error;

  for (const integration of integrations ?? []) {
    try {
      if (integration.provider === 'truckersmp') {
        await syncTruckersMpProfile(supabase, integration);
      } else {
        await supabase.from('driver_integrations').update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', integration.id);
      }

      const processed = await processPendingDeliveries(supabase, integration.profile_id);
      deliveriesProcessed += processed;
      synced += 1;

      await supabase.from('integration_sync_logs').insert({
        profile_id: integration.profile_id,
        integration_id: integration.id,
        provider: integration.provider,
        status: 'success',
        message: `Cron sync OK — ${processed} livraison(s) traitée(s)`,
        deliveries_imported: 0,
        deliveries_skipped: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${integration.provider}/${integration.profile_id}: ${msg}`);
      await supabase.from('driver_integrations').update({
        last_error: msg,
        status: 'error',
        updated_at: new Date().toISOString(),
      }).eq('id', integration.id);
      await supabase.from('integration_sync_logs').insert({
        profile_id: integration.profile_id,
        integration_id: integration.id,
        provider: integration.provider,
        status: 'error',
        message: msg,
        raw_error: { error: msg },
      });
    }
  }

  return {
    synced,
    deliveriesProcessed,
    errors,
    duration_ms: Date.now() - started,
    total: integrations?.length ?? 0,
  };
}
