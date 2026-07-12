import { supabase } from '../lib/supabase';
import type {
  ClovisActiveRental,
  ClovisCatalogItem,
  ClovisRentalBundle,
  ClovisRentalCharge,
  ClovisRentalStartResult,
} from '../lib/clovisRentalTypes';

function isSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

export async function fetchClovisCompanyBalance(): Promise<number> {
  const { data, error } = await supabase.rpc('get_clovis_company_balance');
  if (error) {
    if (isSchemaError(error)) return 0;
    throw error;
  }
  return Number(data ?? 0);
}

export async function fetchClovisRentalBundle(profileId: string): Promise<ClovisRentalBundle> {
  const { error: probe } = await supabase.from('clovis_rental_catalog').select('id').limit(1);
  if (probe && isSchemaError(probe)) {
    return { catalog: [], activeRental: null, recentCharges: [], companyBalance: null, migrationRequired: true };
  }

  const [catalogRes, rentalRes, companyBalance] = await Promise.all([
    supabase
      .from('clovis_rental_catalog')
      .select('*')
      .eq('enabled', true)
      .order('sort_order'),
    supabase
      .from('clovis_vehicle_rentals')
      .select('*, catalog:clovis_rental_catalog(*)')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .maybeSingle(),
    fetchClovisCompanyBalance().catch(() => null),
  ]);

  if (catalogRes.error && isSchemaError(catalogRes.error)) {
    return { catalog: [], activeRental: null, recentCharges: [], companyBalance: null, migrationRequired: true };
  }
  if (catalogRes.error) throw catalogRes.error;
  if (rentalRes.error && !isSchemaError(rentalRes.error)) throw rentalRes.error;

  const activeRaw = rentalRes.data as (ClovisActiveRental & { catalog?: ClovisCatalogItem }) | null;
  let recentCharges: ClovisRentalCharge[] = [];

  if (activeRaw?.id) {
    const { data: charges } = await supabase
      .from('clovis_rental_charges')
      .select('id, rental_id, charge_date, amount, reference, created_at')
      .eq('rental_id', activeRaw.id)
      .order('charge_date', { ascending: false })
      .limit(10);
    recentCharges = (charges ?? []) as ClovisRentalCharge[];
  }

  const activeRental = activeRaw
    ? { ...activeRaw, catalog: activeRaw.catalog ?? undefined }
    : null;

  return {
    catalog: (catalogRes.data ?? []) as ClovisCatalogItem[],
    activeRental,
    recentCharges,
    companyBalance,
    migrationRequired: false,
  };
}

export async function startClovisRental(catalogId: string): Promise<ClovisRentalStartResult> {
  const { data, error } = await supabase.rpc('start_clovis_rental', { p_catalog_id: catalogId });
  if (error) throw error;
  const result = data as ClovisRentalStartResult & { ok?: boolean; message?: string };
  if (!result?.ok) throw new Error(result?.message ?? 'Impossible de démarrer la location');
  return {
    ok: true,
    rental_id: result.rental_id,
    contract_ref: result.contract_ref,
    daily_rate: Number(result.daily_rate),
    vehicle_label: result.vehicle_label,
    message: result.message ?? 'Location activée',
  };
}

export async function returnClovisRental(rentalId?: string): Promise<string> {
  const { data, error } = await supabase.rpc('return_clovis_rental', {
    p_rental_id: rentalId ?? null,
  });
  if (error) throw error;
  const result = data as { ok?: boolean; message?: string };
  if (!result?.ok) throw new Error('Impossible de restituer le véhicule');
  return result.message ?? 'Véhicule restitué';
}
