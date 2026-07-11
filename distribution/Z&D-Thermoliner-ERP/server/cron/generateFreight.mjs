import { supabaseAdmin, isSupabaseAdminReady } from '../lib/supabaseAdmin.mjs';
import {
  buildSingleOffer,
  buildChainOffer,
  computeLegProfitability,
  computeChainTotals,
  targetOfferCount,
  CHAIN_ROUTES,
  SINGLE_CORRIDORS,
} from './templates.mjs';

const MAX_MARKET_OFFERS = 80;
const MAX_ATTEMPTS_MULTIPLIER = 4;

async function fingerprintExists(table, fingerprint) {
  const activeStatuses = table === 'freight_chains'
    ? ['available', 'assigned', 'in_progress']
    : ['available', 'reserved', 'assigned', 'in_progress'];

  const { data } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('cron_fingerprint', fingerprint)
    .in('status', activeStatuses)
    .maybeSingle();

  return !!data;
}

async function archiveExpired() {
  const now = new Date().toISOString();
  let archived = 0;
  const errors = [];

  const { data: expiredOffers, error: expErr } = await supabaseAdmin
    .from('freight_offers')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'available')
    .is('chain_id', null)
    .lt('expires_at', now)
    .select('id');

  if (expErr) errors.push(`archive offers: ${expErr.message}`);
  else archived += expiredOffers?.length ?? 0;

  const { data: expiredChains, error: chainErr } = await supabaseAdmin
    .from('freight_chains')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'available')
    .lt('expires_at', now)
    .select('id');

  if (chainErr) errors.push(`archive chains: ${chainErr.message}`);
  else archived += expiredChains?.length ?? 0;

  await supabaseAdmin
    .from('freight_offers')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'available')
    .not('chain_id', 'is', null)
    .lt('expires_at', now);

  return { archived, errors };
}

async function countActiveOffers() {
  const { count, error } = await supabaseAdmin
    .from('freight_offers')
    .select('id', { count: 'exact', head: true })
    .in('status', ['available', 'reserved']);
  if (error) throw error;
  return count ?? 0;
}

async function createSingleOffer(offer, batchId) {
  const { fingerprint, ...payload } = offer;
  if (await fingerprintExists('freight_offers', fingerprint)) {
    return { skipped: true, reason: 'duplicate route' };
  }

  const { data, error } = await supabaseAdmin
    .from('freight_offers')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;

  const profit = computeLegProfitability(payload.distance_km, payload.price);
  await supabaseAdmin.from('freight_profitability').upsert({
    offer_id: data.id,
    ...profit,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'offer_id' });

  return {
    created: true,
    id: data.id,
    route: `${payload.departure_city} → ${payload.arrival_city}`,
    cargo: payload.cargo,
    economics: profit,
    batchId,
  };
}

async function createChain(chainData, batchId) {
  const { fingerprint, legs, title, client_name, priority, expires_at, notes } = chainData;

  if (await fingerprintExists('freight_chains', fingerprint)) {
    return { skipped: true, reason: 'duplicate chain' };
  }

  const totals = computeChainTotals(legs);

  const { data: chain, error: chainErr } = await supabaseAdmin
    .from('freight_chains')
    .insert({
      title,
      client_name,
      status: 'available',
      priority,
      expires_at,
      notes,
      cron_fingerprint: fingerprint,
      ...totals,
    })
    .select('id')
    .single();

  if (chainErr) throw chainErr;

  const legResults = [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const pricePerKm = leg.distance_km > 0 ? leg.price / leg.distance_km : 0;
    const legFp = `${fingerprint}:leg${i + 1}`;

    const { data: offer, error: legErr } = await supabaseAdmin
      .from('freight_offers')
      .insert({
        chain_id: chain.id,
        leg_order: i + 1,
        leg_locked: i > 0,
        client_name,
        departure_city: leg.departure_city,
        arrival_city: leg.arrival_city,
        departure_country: leg.departure_country,
        arrival_country: leg.arrival_country,
        cargo: leg.cargo,
        weight_kg: leg.weight_kg,
        pallets: leg.pallets,
        distance_km: leg.distance_km,
        price: leg.price,
        price_per_km: Math.round(pricePerKm * 10000) / 10000,
        deadline_at: leg.deadline_at ?? null,
        delivery_date: leg.delivery_date,
        priority,
        status: i === 0 ? 'available' : 'reserved',
        expires_at,
        notes: `Étape ${i + 1}/${legs.length} — ${title}`,
        cron_fingerprint: legFp,
        temperature_required: leg.temperature_required ?? false,
        temperature_min: leg.temperature_min ?? null,
        temperature_max: leg.temperature_max ?? null,
        adr_required: leg.adr_required ?? false,
      })
      .select('id')
      .single();

    if (legErr) throw legErr;

    const profit = computeLegProfitability(leg.distance_km, leg.price);
    await supabaseAdmin.from('freight_profitability').upsert({
      offer_id: offer.id,
      ...profit,
      computed_at: new Date().toISOString(),
    }, { onConflict: 'offer_id' });

    legResults.push({
      leg: i + 1,
      route: `${leg.departure_city} → ${leg.arrival_city}`,
      cargo: leg.cargo,
      economics: profit,
    });
  }

  return {
    created: true,
    id: chain.id,
    legs: legs.length,
    title,
    legResults,
    totals,
    batchId,
  };
}

async function logExecution(result) {
  await supabaseAdmin.from('freight_cron_logs').insert({
    created_count: result.created,
    chained_count: result.chained,
    archived_count: result.archived,
    errors: result.errors,
    duration_ms: result.duration_ms,
    summary: {
      target: result.target,
      singles: result.singles,
      chains: result.chainDetails,
      batch_id: result.batch_id,
      skipped: result.skipped,
    },
  });
}

export async function handleGenerateFreight() {
  const start = Date.now();
  const batchId = new Date().toISOString().replace(/[:.]/g, '-');
  const errors = [];
  let created = 0;
  let chained = 0;
  let skipped = 0;

  if (!isSupabaseAdminReady()) {
    return {
      created: 0,
      chained: 0,
      archived: 0,
      skipped: 0,
      target: 0,
      errors: ['VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured'],
      duration_ms: Date.now() - start,
    };
  }

  const { archived, errors: archiveErrors } = await archiveExpired();
  errors.push(...archiveErrors);

  const target = targetOfferCount();
  const singles = [];
  const chainDetails = [];

  try {
    const activeCount = await countActiveOffers();
    const capacity = Math.max(0, MAX_MARKET_OFFERS - activeCount);
    const effectiveTarget = Math.min(target, capacity);

    let attempts = 0;
    const maxAttempts = effectiveTarget * MAX_ATTEMPTS_MULTIPLIER;
    let singleIdx = Math.floor(Math.random() * SINGLE_CORRIDORS.length);
    let chainIdx = Math.floor(Math.random() * CHAIN_ROUTES.length);

    while (created < effectiveTarget && attempts < maxAttempts) {
      attempts++;
      const preferChain = created < effectiveTarget && Math.random() < 0.35 && chained < 3;

      if (preferChain) {
        try {
          const chain = buildChainOffer(`${batchId}-c${chainIdx}`, chainIdx);
          chainIdx = (chainIdx + 1) % CHAIN_ROUTES.length;
          const result = await createChain(chain, batchId);

          if (result.skipped) {
            skipped++;
            continue;
          }
          if (result.created) {
            const legCount = result.legs;
            const room = effectiveTarget - created;
            if (legCount <= room) {
              chained++;
              created += legCount;
              chainDetails.push({
                title: result.title,
                legs: legCount,
                route: chain.route.join(' → '),
                profit: result.totals.total_net_profit,
              });
            }
          }
        } catch (e) {
          errors.push(`chain: ${e.message}`);
        }
      } else {
        try {
          const offer = buildSingleOffer(`${batchId}-s${singleIdx}`, singleIdx);
          singleIdx = (singleIdx + 1) % SINGLE_CORRIDORS.length;
          const result = await createSingleOffer(offer, batchId);

          if (result.skipped) {
            skipped++;
            continue;
          }
          if (result.created) {
            created++;
            singles.push({
              route: result.route,
              cargo: result.cargo,
              profit: result.economics.net_profit,
            });
          }
        } catch (e) {
          errors.push(`single: ${e.message}`);
        }
      }
    }

    const result = {
      created,
      chained,
      archived,
      skipped,
      target: effectiveTarget,
      errors,
      duration_ms: Date.now() - start,
      batch_id: batchId,
      singles,
      chainDetails,
    };

    await logExecution(result).catch(e => errors.push(`log: ${e.message}`));

    return {
      created,
      chained,
      archived,
      skipped,
      target: effectiveTarget,
      errors,
      duration_ms: result.duration_ms,
      batch_id: batchId,
      singles,
      chainDetails,
    };
  } catch (e) {
    const result = {
      created,
      chained,
      archived,
      skipped,
      target,
      errors: [...errors, e.message],
      duration_ms: Date.now() - start,
      batch_id: batchId,
      singles,
      chainDetails,
    };
    await logExecution(result).catch(() => {});
    return result;
  }
}
