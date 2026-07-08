import { supabase } from '../lib/supabase';

const MIN_MARKET_OFFERS = 8;

export async function countAvailableFreightOffers(): Promise<number> {
  const { count, error } = await supabase
    .from('freight_offers')
    .select('id', { count: 'exact', head: true })
    .in('status', ['available', 'reserved'])
    .is('chain_id', null);

  if (error) {
    console.warn('[Z&D Freight] count offers:', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Request server-side top-up when market is low (after mission complete). */
export async function topUpFreightMarketIfNeeded(): Promise<{ topped: boolean; created?: number }> {
  const available = await countAvailableFreightOffers();
  if (available >= MIN_MARKET_OFFERS) {
    return { topped: false };
  }

  const { data, error } = await supabase.rpc('top_up_freight_market_min', {
    p_min: MIN_MARKET_OFFERS,
  });

  if (error) {
    console.warn('[Z&D Freight] top-up RPC:', error.message);
    return { topped: false };
  }

  const payload = (data ?? {}) as { created?: number; topped?: boolean };
  return { topped: true, created: payload.created ?? 0 };
}
