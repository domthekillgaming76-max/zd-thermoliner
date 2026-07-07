import {
  calculateRoadSheetFullEconomics,
  economicsToDbPayload,
  type RoadSheetCalculationInput,
} from '../lib/roadSheetCalculations';
import { isAdministratorEmail } from '../lib/admin';
import {
  canApproveRoadSheets,
  canUserEditRoadSheet,
  isRoadSheetLocked,
  ROAD_SHEET_VALIDATOR_ERROR,
} from '../lib/roadSheetAccess';
import { supabase, type Driver, type RoadSheet, type Truck } from '../lib/supabase';
import type { DriverProfile } from '../lib/driverTypes';
import type { DriverSalaryMode } from '../components/road-sheets/constants';

export interface RoadSheetFormData {
  driver_id: string;
  truck_id: string;
  trailer_type: string;
  departure: string;
  arrival: string;
  cargo: string;
  km: number;
  price_per_km: number;
  fuel_price_per_liter: number;
  fuel_consumption_l100: number;
  toll_cost: number;
  repair_cost: number;
  insurance_cost: number;
  other_expenses: number;
  driver_salary_mode: DriverSalaryMode;
  driver_salary_value: number;
  notes: string;
  date: string;
  delivery_photo_url?: string | null;
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Vous devez être connecté.');
  }
  return data.user;
}

async function assertRoadSheetValidator(): Promise<{ id: string }> {
  const user = await getAuthenticatedUser();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, pseudo')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('Profil introuvable. Impossible de valider la feuille de route.');
  }

  if (!canApproveRoadSheets(profile)) {
    throw new Error(ROAD_SHEET_VALIDATOR_ERROR);
  }

  return { id: profile.id as string };
}

async function assertAdministrator(): Promise<{ id: string; email: string }> {
  const user = await getAuthenticatedUser();
  if (!isAdministratorEmail(user.email)) {
    throw new Error('Action réservée à l\'administrateur principal.');
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !profile) {
    throw new Error('Profil introuvable.');
  }
  return { id: profile.id as string, email: user.email! };
}

async function fetchLinkedDriverIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('drivers').select('id').eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map(row => row.id as string);
}

async function fetchRoadSheetById(sheetId: string): Promise<RoadSheet> {
  const { data, error } = await supabase.from('road_sheets').select('*').eq('id', sheetId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Feuille de route introuvable.');
  return data as RoadSheet;
}

export function roadSheetToFormData(sheet: RoadSheet): RoadSheetFormData {
  return {
    driver_id: sheet.driver_id ?? '',
    truck_id: sheet.truck_id ?? '',
    trailer_type: sheet.trailer_type ?? '',
    departure: sheet.departure ?? sheet.departure_city ?? '',
    arrival: sheet.arrival ?? sheet.arrival_city ?? '',
    cargo: sheet.cargo ?? sheet.cargo_type ?? '',
    km: sheet.km || sheet.total_distance || 0,
    price_per_km: sheet.price_per_km ?? 0,
    fuel_price_per_liter: sheet.fuel_price_per_liter ?? 1.85,
    fuel_consumption_l100: sheet.fuel_consumption_l100 ?? 32,
    toll_cost: sheet.toll_cost ?? 0,
    repair_cost: sheet.repair_cost ?? sheet.wear_cost ?? 0,
    insurance_cost: sheet.insurance_cost ?? 0,
    other_expenses: sheet.other_expenses ?? 0,
    driver_salary_mode: sheet.driver_salary_mode ?? 'percentage',
    driver_salary_value: sheet.driver_salary_value ?? 20,
    notes: sheet.notes ?? '',
    date: sheet.date,
    delivery_photo_url: sheet.delivery_photo_url,
  };
}

export async function fetchRoadSheets(): Promise<RoadSheet[]> {
  const user = await getAuthenticatedUser();
  const isAdmin = isAdministratorEmail(user.email);

  let query = supabase.from('road_sheets').select('*').order('date', { ascending: false });

  if (!isAdmin) {
    const linkedDriverIds = await fetchLinkedDriverIds(user.id);
    if (linkedDriverIds.length > 0) {
      query = query.or(
        `driver_user_id.eq.${user.id},driver_id.in.(${linkedDriverIds.join(',')})`,
      );
    } else {
      query = query.eq('driver_user_id', user.id);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RoadSheet[];
}

export async function fetchDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data ?? []) as Driver[];
}

export async function fetchTrucks(): Promise<Truck[]> {
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .neq('status', 'retired')
    .order('registration');

  if (error) throw error;
  return (data ?? []) as Truck[];
}

export async function fetchUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return (data?.role as string) ?? null;
}

function formToCalculationInput(form: RoadSheetFormData): RoadSheetCalculationInput {
  return {
    km: form.km,
    pricePerKm: form.price_per_km,
    fuelConsumptionL100: form.fuel_consumption_l100,
    fuelPricePerLiter: form.fuel_price_per_liter,
    tollCost: form.toll_cost,
    repairCost: form.repair_cost,
    insuranceCost: form.insurance_cost,
    otherExpenses: form.other_expenses,
    driverSalaryMode: form.driver_salary_mode,
    driverSalaryValue: form.driver_salary_value,
  };
}

const OPTIONAL_INSERT_COLUMNS = [
  'fuel_liters',
  'margin_percent',
  'cost_per_km',
  'total_expenses',
  'trailer_type',
  'driver_salary_mode',
  'driver_salary_value',
  'fuel_consumption_l100',
  'fuel_price_per_liter',
] as const;

function stripOptionalColumns<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const key of OPTIONAL_INSERT_COLUMNS) {
    delete next[key];
  }
  return next;
}

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = error.message?.toLowerCase() ?? '';
  if (msg.includes('not-null') || msg.includes('null value') || msg.includes('violates')) {
    return false;
  }
  return (
    error.code === 'PGRST204' ||
    msg.includes('schema cache') ||
    msg.includes('could not find') ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

export function isValidDriverUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolvedDriver = {
  driverId: string;
  driverName: string;
  driverUserId: string | null;
};

export async function resolveProfileUserId(userId: string | null | undefined): Promise<string | null> {
  if (!userId || !UUID_RE.test(userId)) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data?.id) {
    console.warn('[Z&D] resolveProfileUserId: no profile for user_id', userId, error?.message);
    return null;
  }

  return data.id;
}

export async function fetchDriverById(driverId: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .maybeSingle();

  if (error) {
    console.error('[Z&D] fetchDriverById error:', error);
    return null;
  }

  return (data as Driver) ?? null;
}

async function resolveDriverUserId(driverId: string, drivers: Driver[]): Promise<string | null> {
  const driver = drivers.find(d => d.id === driverId) ?? await fetchDriverById(driverId);
  if (!driver) return null;
  return resolveProfileUserId(driver.user_id);
}

export function resolveDriverForInsert(
  form: RoadSheetFormData,
  drivers: Driver[],
  userId?: string,
): Omit<ResolvedDriver, 'driverUserId'> | null {
  if (isValidDriverUuid(form.driver_id)) {
    const selected = drivers.find(d => d.id === form.driver_id);
    if (selected) {
      return { driverId: selected.id, driverName: selected.name };
    }
  }

  if (drivers.length === 1) {
    return { driverId: drivers[0].id, driverName: drivers[0].name };
  }

  if (userId) {
    const ownDriver = drivers.find(d => d.user_id === userId);
    if (ownDriver) {
      return { driverId: ownDriver.id, driverName: ownDriver.name };
    }
  }

  return null;
}

export async function fetchDriverByUserId(userId: string): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Z&D] fetchDriverByUserId error:', error);
    return null;
  }
  return (data as DriverProfile) ?? null;
}

export async function resolveDriverForInsertAsync(
  form: RoadSheetFormData,
  drivers: Driver[],
  userId?: string,
): Promise<ResolvedDriver | null> {
  const local = resolveDriverForInsert(form, drivers, userId);
  if (local) {
    const driverUserId = await resolveDriverUserId(local.driverId, drivers);
    return { ...local, driverUserId };
  }

  if (userId) {
    const linked = await fetchDriverByUserId(userId);
    if (linked) {
      const driverUserId = await resolveProfileUserId(linked.user_id);
      return { driverId: linked.id, driverName: linked.name, driverUserId };
    }
  }

  return null;
}

export async function createRoadSheet(
  form: RoadSheetFormData,
  driverName: string,
  driverUserId: string | null,
): Promise<RoadSheet> {
  if (!form.driver_id || !isValidDriverUuid(form.driver_id)) {
    throw new Error('Sélectionnez un chauffeur valide dans la liste avant d\'enregistrer.');
  }

  const economics = calculateRoadSheetFullEconomics(formToCalculationInput(form));
  const economicsPayload = economicsToDbPayload(economics);

  const payload = {
    driver_id: form.driver_id,
    driver_user_id: driverUserId,
    driver_name: driverName,
    truck_id: form.truck_id || null,
    trailer_type: form.trailer_type || null,
    departure: form.departure || null,
    arrival: form.arrival || null,
    departure_city: form.departure || null,
    arrival_city: form.arrival || null,
    cargo: form.cargo || null,
    cargo_type: form.cargo || null,
    km: form.km,
    total_distance: form.km,
    price_per_km: form.price_per_km,
    fuel_consumption_l100: form.fuel_consumption_l100,
    fuel_price_per_liter: form.fuel_price_per_liter,
    driver_salary_mode: form.driver_salary_mode,
    driver_salary_value: form.driver_salary_value,
    delivery_photo_url: form.delivery_photo_url ?? null,
    validated: false,
    status: 'submitted',
    notes: form.notes || null,
    date: form.date,
    ...economicsPayload,
  };

  console.log('[Z&D] RoadSheets insert payload:', payload);

  let result = await supabase.from('road_sheets').insert(payload).select().single();

  console.log('[Z&D] RoadSheets insert response:', {
    data: result.data,
    error: result.error,
    count: result.count,
    status: result.status,
    statusText: result.statusText,
  });

  if (result.error && isMissingColumnError(result.error)) {
    console.warn('[Z&D] RoadSheets insert: retrying without optional columns', result.error.message);
    const minimalPayload = stripOptionalColumns(payload);
    console.log('[Z&D] RoadSheets insert retry payload:', minimalPayload);
    result = await supabase.from('road_sheets').insert(minimalPayload).select().single();
    console.log('[Z&D] RoadSheets insert retry response:', {
      data: result.data,
      error: result.error,
      count: result.count,
      status: result.status,
      statusText: result.statusText,
    });
  }

  if (result.error) {
    console.error('[Z&D] RoadSheets insert error:', {
      message: result.error.message,
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
      driver_id: payload.driver_id,
      payload,
    });
    throw new Error(result.error.message || 'Impossible d\'enregistrer la feuille de route.');
  }

  if (!result.data?.id) {
    console.error('[Z&D] RoadSheets insert: no row returned', result);
    throw new Error('Aucune feuille de route créée — vérifiez les permissions Supabase (RLS).');
  }

  console.log('[Z&D] RoadSheets insert success, id:', result.data.id);
  return result.data as RoadSheet;
}

export async function updateRoadSheet(
  sheetId: string,
  form: RoadSheetFormData,
  driverName: string,
  driverUserId: string | null,
): Promise<RoadSheet> {
  const user = await getAuthenticatedUser();
  const isAdmin = isAdministratorEmail(user.email);
  const sheet = await fetchRoadSheetById(sheetId);
  const linkedDriverIds = await fetchLinkedDriverIds(user.id);

  if (!canUserEditRoadSheet(sheet, user.id, isAdmin, linkedDriverIds)) {
    throw new Error('Cette feuille de route ne peut plus être modifiée.');
  }

  if (!form.driver_id || !isValidDriverUuid(form.driver_id)) {
    throw new Error('Sélectionnez un chauffeur valide dans la liste.');
  }

  const economics = calculateRoadSheetFullEconomics(formToCalculationInput(form));
  const economicsPayload = economicsToDbPayload(economics);

  const payload = {
    driver_id: form.driver_id,
    driver_user_id: driverUserId,
    driver_name: driverName,
    truck_id: form.truck_id || null,
    trailer_type: form.trailer_type || null,
    departure: form.departure || null,
    arrival: form.arrival || null,
    departure_city: form.departure || null,
    arrival_city: form.arrival || null,
    cargo: form.cargo || null,
    cargo_type: form.cargo || null,
    km: form.km,
    total_distance: form.km,
    price_per_km: form.price_per_km,
    fuel_consumption_l100: form.fuel_consumption_l100,
    fuel_price_per_liter: form.fuel_price_per_liter,
    driver_salary_mode: form.driver_salary_mode,
    driver_salary_value: form.driver_salary_value,
    delivery_photo_url: form.delivery_photo_url ?? sheet.delivery_photo_url,
    notes: form.notes || null,
    date: form.date,
    validated: false,
    status: 'submitted' as const,
    ...economicsPayload,
  };

  const { data, error } = await supabase
    .from('road_sheets')
    .update(payload)
    .eq('id', sheetId)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Impossible de modifier la feuille de route.');
  return data as RoadSheet;
}

export async function validateRoadSheet(sheet: RoadSheet): Promise<{ sheetId: string }> {
  const validator = await assertRoadSheetValidator();

  if (isRoadSheetLocked(sheet)) {
    throw new Error('Cette feuille de route est déjà validée.');
  }

  const economics = calculateRoadSheetFullEconomics({
    km: sheet.km,
    pricePerKm: sheet.price_per_km,
    fuelConsumptionL100: sheet.fuel_consumption_l100 ?? 32,
    fuelPricePerLiter: sheet.fuel_price_per_liter ?? 1.85,
    tollCost: sheet.toll_cost ?? 0,
    repairCost: sheet.repair_cost ?? 0,
    insuranceCost: sheet.insurance_cost ?? 0,
    otherExpenses: sheet.other_expenses ?? 0,
    driverSalaryMode: sheet.driver_salary_mode ?? 'percentage',
    driverSalaryValue: sheet.driver_salary_value ?? 20,
  });

  const { error } = await supabase
    .from('road_sheets')
    .update({
      validated: true,
      status: 'validated',
      approved_by: validator.id,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      ...economicsToDbPayload(economics),
    })
    .eq('id', sheet.id);

  if (error) {
    console.error('[Z&D] validateRoadSheet validation error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || 'Impossible de valider la feuille de route.');
  }

  return { sheetId: sheet.id };
}

export async function rejectRoadSheet(sheetId: string, reason: string): Promise<void> {
  const validator = await assertRoadSheetValidator();
  const sheet = await fetchRoadSheetById(sheetId);

  if (isRoadSheetLocked(sheet)) {
    throw new Error('Impossible de rejeter une feuille déjà validée.');
  }

  const { error } = await supabase
    .from('road_sheets')
    .update({
      validated: false,
      status: 'rejected',
      rejected_by: validator.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      approved_by: null,
      approved_at: null,
    })
    .eq('id', sheetId);

  if (error) throw error;
}

export async function deleteRoadSheet(id: string): Promise<void> {
  await assertAdministrator();
  const { error } = await supabase.from('road_sheets').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDeliveryPhoto(file: File): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('delivery-photos').upload(path, file);
    if (error || !data) return null;
    return supabase.storage.from('delivery-photos').getPublicUrl(data.path).data.publicUrl;
  } catch {
    return null;
  }
}
