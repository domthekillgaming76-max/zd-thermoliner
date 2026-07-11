import { supabaseAdmin, isSupabaseAdminReady } from '../lib/supabaseAdmin.mjs';

export async function handleProcessClovisRentals() {
  const started = Date.now();

  if (!isSupabaseAdminReady()) {
    return {
      ok: false,
      charged: 0,
      charge_date: new Date().toISOString().slice(0, 10),
      errors: ['Supabase admin client not configured'],
      duration_ms: Date.now() - started,
    };
  }

  const { data, error } = await supabaseAdmin.rpc('process_daily_clovis_rental_charges', {
    p_charge_date: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return {
      ok: false,
      charged: 0,
      charge_date: new Date().toISOString().slice(0, 10),
      errors: [error.message],
      duration_ms: Date.now() - started,
    };
  }

  const result = data ?? {};
  const errors = Array.isArray(result.errors)
    ? result.errors.map(e => (typeof e === 'object' && e?.error ? String(e.error) : String(e)))
    : [];

  return {
    ok: Boolean(result.ok ?? errors.length === 0),
    charged: Number(result.charged ?? 0),
    charge_date: result.charge_date ?? new Date().toISOString().slice(0, 10),
    errors,
    duration_ms: Date.now() - started,
  };
}
