import { supabase } from '../lib/supabase';
import type { RoadSheet, Truck } from '../lib/supabase';
import type {
  DriverAssignmentRecord,
  DriverDocument,
  DriverDocType,
  DriverIncident,
  IncidentType,
  DriverProfile,
  DriverSalaryRecord,
  PaymentStatus,
  Trailer,
} from '../lib/driverTypes';

export interface DriverFormInput {
  name: string;
  pseudo?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  photo_url?: string;
  banner_url?: string;
  status: DriverProfile['status'];
  driving_status: DriverProfile['driving_status'];
  presence_status?: DriverProfile['presence_status'];
  member_role?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  date_of_birth?: string;
  discord_name?: string;
  truckersmp_id?: string;
  steam_id?: string;
  employee_number?: string;
  hiring_date?: string;
  license_expires_at?: string;
  eco_driving_score?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  employment_contract?: string;
  salary_mode: DriverProfile['salary_mode'];
  salary_base?: number;
  driver_level?: number;
  experience_years?: number;
  license_categories?: string;
  has_adr?: boolean;
  dangerous_goods_authorized?: boolean;
  profile_description?: string;
  driving_hours_month?: number;
  rest_hours_month?: number;
}

function normalizeDriver(row: Record<string, unknown>): DriverProfile {
  return {
    id: row.id as string,
    user_id: (row.user_id as string) ?? null,
    name: row.name as string,
    pseudo: (row.pseudo as string) ?? null,
    photo_url: (row.photo_url as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    phone: (row.phone as string) ?? null,
    license_number: (row.license_number as string) ?? null,
    truck_id: (row.truck_id as string) ?? null,
    garage_id: (row.garage_id as string) ?? null,
    status: (row.status as DriverProfile['status']) ?? 'active',
    monthly_km: Number(row.monthly_km ?? 0),
    total_km: Number(row.total_km ?? 0),
    deliveries_count: Number(row.deliveries_count ?? 0),
    profile_description: (row.profile_description as string) ?? null,
    joined_at: row.joined_at as string,
    created_at: row.created_at as string,
    email: (row.email as string) ?? null,
    address: (row.address as string) ?? null,
    city: (row.city as string) ?? null,
    postal_code: (row.postal_code as string) ?? null,
    country: (row.country as string) ?? null,
    emergency_contact_name: (row.emergency_contact_name as string) ?? null,
    emergency_contact_phone: (row.emergency_contact_phone as string) ?? null,
    employment_contract: (row.employment_contract as string) ?? null,
    salary_mode: (row.salary_mode as DriverProfile['salary_mode']) ?? 'percentage',
    salary_base: Number(row.salary_base ?? 0),
    driver_level: Number(row.driver_level ?? 1),
    experience_years: Number(row.experience_years ?? 0),
    license_categories: (row.license_categories as string) ?? null,
    license_expires_at: (row.license_expires_at as string) ?? null,
    has_adr: Boolean(row.has_adr),
    dangerous_goods_authorized: Boolean(row.dangerous_goods_authorized),
    driving_status: (row.driving_status as DriverProfile['driving_status']) ?? 'resting',
    presence_status: (row.presence_status as DriverProfile['presence_status']) ?? 'offline',
    member_role: (row.member_role as string) ?? (row.role as string) ?? 'chauffeur',
    trailer_id: (row.trailer_id as string) ?? null,
    driving_hours_month: Number(row.driving_hours_month ?? 0),
    rest_hours_month: Number(row.rest_hours_month ?? 0),
    is_active_driver: row.is_active_driver !== false,
    is_suspended: Boolean(row.is_suspended),
    role: (row.role as string) ?? undefined,
    banner_url: (row.banner_url as string) ?? null,
    date_of_birth: (row.date_of_birth as string) ?? null,
    discord_name: (row.discord_name as string) ?? null,
    truckersmp_id: (row.truckersmp_id as string) ?? null,
    steam_id: (row.steam_id as string) ?? null,
    employee_number: (row.employee_number as string) ?? null,
    hiring_date: (row.hiring_date as string) ?? null,
    eco_driving_score: Number(row.eco_driving_score ?? 0),
    driver_rating: Number(row.driver_rating ?? 0),
    fleet_name: (row.fleet_name as string) ?? 'Z&D Thermoliner',
    last_seen_at: (row.last_seen_at as string) ?? null,
  };
}

function formToPayload(input: DriverFormInput): Record<string, unknown> {
  return {
    name: input.name,
    pseudo: input.pseudo || null,
    phone: input.phone || null,
    email: input.email || null,
    license_number: input.license_number || null,
    photo_url: input.photo_url || null,
    banner_url: input.banner_url || null,
    status: input.status,
    driving_status: input.driving_status,
    presence_status: input.presence_status ?? 'offline',
    member_role: input.member_role || 'chauffeur',
    address: input.address || null,
    city: input.city || null,
    postal_code: input.postal_code || null,
    country: input.country || null,
    date_of_birth: input.date_of_birth || null,
    discord_name: input.discord_name || null,
    truckersmp_id: input.truckersmp_id || null,
    steam_id: input.steam_id || null,
    employee_number: input.employee_number || null,
    hiring_date: input.hiring_date || null,
    license_expires_at: input.license_expires_at || null,
    eco_driving_score: input.eco_driving_score ?? 0,
    emergency_contact_name: input.emergency_contact_name || null,
    emergency_contact_phone: input.emergency_contact_phone || null,
    employment_contract: input.employment_contract || 'CDI',
    salary_mode: input.salary_mode,
    salary_base: input.salary_base ?? 0,
    driver_level: input.driver_level ?? 1,
    experience_years: input.experience_years ?? 0,
    license_categories: input.license_categories || 'C,CE',
    has_adr: input.has_adr ?? false,
    dangerous_goods_authorized: input.dangerous_goods_authorized ?? false,
    profile_description: input.profile_description || null,
    driving_hours_month: input.driving_hours_month ?? 0,
    rest_hours_month: input.rest_hours_month ?? 0,
  };
}

export async function fetchDrivers(): Promise<DriverProfile[]> {
  const { data, error } = await supabase.from('drivers').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(row => normalizeDriver(row as Record<string, unknown>));
}

export async function fetchDriverById(id: string): Promise<DriverProfile | null> {
  const { data, error } = await supabase.from('drivers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeDriver(data as Record<string, unknown>) : null;
}

export async function createDriver(input: DriverFormInput): Promise<DriverProfile> {
  const { data, error } = await supabase.from('drivers').insert(formToPayload(input)).select().single();
  if (error) throw error;
  return normalizeDriver(data as Record<string, unknown>);
}

export async function updateDriver(id: string, input: DriverFormInput): Promise<DriverProfile> {
  const { data, error } = await supabase.from('drivers').update(formToPayload(input)).eq('id', id).select().single();
  if (error) throw error;
  return normalizeDriver(data as Record<string, unknown>);
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDriverRoadSheets(driverId: string): Promise<RoadSheet[]> {
  const { data, error } = await supabase
    .from('road_sheets')
    .select('*')
    .eq('driver_id', driverId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RoadSheet[];
}

export async function fetchAllRoadSheetsForDrivers(): Promise<RoadSheet[]> {
  const { data, error } = await supabase.from('road_sheets').select('*');
  if (error) throw error;
  return (data ?? []) as RoadSheet[];
}

export async function fetchTrucks(): Promise<Truck[]> {
  const { data, error } = await supabase.from('trucks').select('*').order('registration');
  if (error) throw error;
  return (data ?? []) as Truck[];
}

export async function fetchTrailers(): Promise<Trailer[]> {
  const { data, error } = await supabase.from('trailers').select('*').order('registration');
  if (error) {
    return [];
  }
  return (data ?? []) as Trailer[];
}

export async function assignTruckToDriver(driverId: string, truckId: string | null): Promise<void> {
  const driver = await fetchDriverById(driverId);
  if (!driver) throw new Error('Chauffeur introuvable.');

  if (driver.truck_id && driver.truck_id !== truckId) {
    await supabase.from('trucks').update({ driver_id: null }).eq('id', driver.truck_id);
  }

  const { error: driverError } = await supabase.from('drivers').update({ truck_id: truckId }).eq('id', driverId);
  if (driverError) throw driverError;

  if (truckId) {
    await supabase.from('trucks').update({ driver_id: null }).eq('driver_id', driverId).neq('id', truckId);
    const { error: truckError } = await supabase.from('trucks').update({ driver_id: driverId }).eq('id', truckId);
    if (truckError) throw truckError;

    const { data: truck } = await supabase.from('trucks').select('registration, brand, model').eq('id', truckId).maybeSingle();
    const label = truck ? `${truck.brand ?? ''} ${truck.model ?? ''} (${truck.registration})`.trim() : truckId;
    await supabase.from('driver_assignment_history').insert({
      driver_id: driverId,
      asset_type: 'truck',
      asset_id: truckId,
      asset_label: label,
    });
  }
}

export async function assignTrailerToDriver(driverId: string, trailerId: string | null): Promise<void> {
  const driver = await fetchDriverById(driverId);
  if (!driver) throw new Error('Chauffeur introuvable.');

  if (driver.trailer_id && driver.trailer_id !== trailerId) {
    await supabase.from('trailers').update({ driver_id: null }).eq('id', driver.trailer_id);
  }

  const { error } = await supabase.from('drivers').update({ trailer_id: trailerId }).eq('id', driverId);
  if (error) throw error;

  if (trailerId) {
    await supabase.from('trailers').update({ driver_id: null }).eq('driver_id', driverId).neq('id', trailerId);
    await supabase.from('trailers').update({ driver_id: driverId }).eq('id', trailerId);

    const { data: trailer } = await supabase.from('trailers').select('registration, type').eq('id', trailerId).maybeSingle();
    const label = trailer ? `${trailer.type} (${trailer.registration})` : trailerId;
    await supabase.from('driver_assignment_history').insert({
      driver_id: driverId,
      asset_type: 'trailer',
      asset_id: trailerId,
      asset_label: label,
    });
  }
}

export async function fetchDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', driverId)
    .order('expires_at', { ascending: true });
  if (error) return [];
  return (data ?? []) as DriverDocument[];
}

export async function fetchAllDriverDocuments(): Promise<DriverDocument[]> {
  const { data, error } = await supabase.from('driver_documents').select('*');
  if (error) return [];
  return (data ?? []) as DriverDocument[];
}

export async function uploadDriverDocument(
  driverId: string,
  file: File,
  docType: DriverDocType,
  expiresAt?: string,
): Promise<DriverDocument> {
  const ext = file.name.split('.').pop();
  const path = `${driverId}/${docType}-${Date.now()}.${ext}`;
  const { data: upload, error: uploadError } = await supabase.storage
    .from('driver-documents')
    .upload(path, file);

  if (uploadError) throw uploadError;

  const fileUrl = supabase.storage.from('driver-documents').getPublicUrl(upload.path).data.publicUrl;

  const { data, error } = await supabase
    .from('driver_documents')
    .insert({
      driver_id: driverId,
      doc_type: docType,
      file_url: fileUrl,
      file_name: file.name,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverDocument;
}

export async function fetchDriverSalaryHistory(driverId: string): Promise<DriverSalaryRecord[]> {
  const { data, error } = await supabase
    .from('driver_salary_history')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) {
    const { data: sanctions } = await supabase
      .from('driver_sanctions')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    return (sanctions ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      driver_id: driverId,
      period_month: Number(s.month ?? 1),
      period_year: Number(s.year ?? new Date().getFullYear()),
      base_salary: 0,
      bonus: s.type === 'bonus' ? Number(s.amount) : 0,
      penalty: s.type === 'penalty' ? Number(s.amount) : 0,
      net_amount: s.type === 'bonus' ? Number(s.amount) : -Number(s.amount),
      road_sheet_id: null,
      notes: (s.reason as string) ?? null,
      created_at: s.created_at as string,
    }));
  }
  return (data ?? []) as DriverSalaryRecord[];
}

export async function fetchDriverIncidents(driverId: string): Promise<DriverIncident[]> {
  const { data, error } = await supabase
    .from('driver_incidents')
    .select('*')
    .eq('driver_id', driverId)
    .order('incident_date', { ascending: false });
  if (error) return [];
  return (data ?? []) as DriverIncident[];
}

export async function fetchDriverAssignmentHistory(driverId: string): Promise<DriverAssignmentRecord[]> {
  const { data, error } = await supabase
    .from('driver_assignment_history')
    .select('*')
    .eq('driver_id', driverId)
    .order('assigned_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as DriverAssignmentRecord[];
}

export async function syncSalaryFromValidatedRoadSheet(sheet: RoadSheet): Promise<void> {
  if (!sheet.driver_id || !(sheet.validated || sheet.status === 'approved')) return;

  const salary = Number(sheet.driver_salary || sheet.driver_bonus || 0);
  if (salary <= 0) return;

  const d = new Date(sheet.date || sheet.created_at);
  const { error } = await supabase.from('driver_salary_history').insert({
    driver_id: sheet.driver_id,
    period_month: d.getMonth() + 1,
    period_year: d.getFullYear(),
    base_salary: 0,
    bonus: salary,
    penalty: 0,
    net_amount: salary,
    road_sheet_id: sheet.id,
    notes: `Feuille validée — ${sheet.departure ?? ''} → ${sheet.arrival ?? ''}`,
  });

  if (error) console.error('[Z&D] syncSalaryFromValidatedRoadSheet:', error.message);
}

export async function fetchGarages(): Promise<{ id: string; name: string; city: string | null }[]> {
  const { data, error } = await supabase.from('garages').select('id, name, city').order('name');
  if (error) return [];
  return (data ?? []) as { id: string; name: string; city: string | null }[];
}

export async function assignGarageToDriver(driverId: string, garageId: string | null): Promise<void> {
  const { error } = await supabase.from('drivers').update({ garage_id: garageId }).eq('id', driverId);
  if (error) throw error;
}

export async function createDriverIncident(input: {
  driver_id: string;
  incident_type: IncidentType;
  title: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  incident_date?: string;
}): Promise<DriverIncident> {
  const { data, error } = await supabase.from('driver_incidents').insert({
    driver_id: input.driver_id,
    incident_type: input.incident_type,
    title: input.title,
    description: input.description || null,
    severity: input.severity ?? 'low',
    incident_date: input.incident_date ?? new Date().toISOString().slice(0, 10),
  }).select().single();
  if (error) throw error;
  return data as DriverIncident;
}

export async function createSalaryRecord(input: {
  driver_id: string;
  period_month: number;
  period_year: number;
  base_salary?: number;
  bonus?: number;
  penalty?: number;
  notes?: string;
  payment_status?: PaymentStatus;
}): Promise<DriverSalaryRecord> {
  const bonus = input.bonus ?? 0;
  const penalty = input.penalty ?? 0;
  const base = input.base_salary ?? 0;
  const net = base + bonus - penalty;
  const { data, error } = await supabase.from('driver_salary_history').insert({
    driver_id: input.driver_id,
    period_month: input.period_month,
    period_year: input.period_year,
    base_salary: base,
    bonus,
    penalty,
    net_amount: net,
    notes: input.notes || null,
    payment_status: input.payment_status ?? 'pending',
  }).select().single();
  if (error) throw error;
  return data as DriverSalaryRecord;
}

export async function approveDriverDocument(documentId: string, approverId: string): Promise<void> {
  const { error } = await supabase.from('driver_documents').update({
    status: 'valid',
    approved_at: new Date().toISOString(),
    approved_by: approverId,
  }).eq('id', documentId);
  if (error) throw error;
}

export async function suspendDriver(driverId: string, suspended: boolean): Promise<void> {
  const { error } = await supabase.from('drivers').update({ is_suspended: suspended }).eq('id', driverId);
  if (error) throw error;
}

const MEMBER_ROLE_LADDER = [
  'visitor', 'recruitment', 'chauffeur', 'dispatcher', 'directeur', 'hr', 'patron',
] as const;

const MEMBER_ROLE_ALIASES: Record<string, string> = {
  visiteur: 'visitor',
  candidat: 'recruitment',
  driver: 'chauffeur',
  manager: 'directeur',
  admin: 'patron',
  pdg: 'patron',
};

export function describeDriverPromotion(currentRole: string | null | undefined): string {
  const normalized = MEMBER_ROLE_ALIASES[currentRole ?? ''] ?? currentRole ?? 'chauffeur';
  let idx = MEMBER_ROLE_LADDER.indexOf(normalized as typeof MEMBER_ROLE_LADDER[number]);
  if (idx < 0) idx = MEMBER_ROLE_LADDER.indexOf('chauffeur');
  const next = MEMBER_ROLE_LADDER[Math.min(idx + 1, MEMBER_ROLE_LADDER.length - 1)];
  const labels: Record<string, string> = {
    visitor: 'Visiteur', recruitment: 'Recrutement', chauffeur: 'Chauffeur',
    dispatcher: 'Dispatcher', directeur: 'Fleet Manager', hr: 'RH', patron: 'Administrateur',
  };
  return labels[next] ?? next;
}

export async function promoteDriverMemberRole(driverId: string): Promise<DriverProfile> {
  const driver = await fetchDriverById(driverId);
  if (!driver) throw new Error('Chauffeur introuvable.');

  const current = MEMBER_ROLE_ALIASES[driver.member_role ?? ''] ?? driver.member_role ?? 'chauffeur';
  let idx = MEMBER_ROLE_LADDER.indexOf(current as typeof MEMBER_ROLE_LADDER[number]);
  if (idx < 0) idx = MEMBER_ROLE_LADDER.indexOf('chauffeur');
  const nextRole = MEMBER_ROLE_LADDER[Math.min(idx + 1, MEMBER_ROLE_LADDER.length - 1)];

  const { data, error } = await supabase
    .from('drivers')
    .update({ member_role: nextRole })
    .eq('id', driverId)
    .select()
    .single();
  if (error) throw error;
  return normalizeDriver(data as Record<string, unknown>);
}

export async function fetchDriverModuleBundle() {
  const [drivers, roadSheets, trucks, trailers, documents, garages] = await Promise.all([
    fetchDrivers(),
    fetchAllRoadSheetsForDrivers(),
    fetchTrucks(),
    fetchTrailers(),
    fetchAllDriverDocuments(),
    fetchGarages(),
  ]);

  const garageMap = new Map(garages.map(g => [g.id, g.name]));
  const enrichedDrivers = drivers.map(d => ({
    ...d,
    garage_name: d.garage_id ? garageMap.get(d.garage_id) ?? null : null,
  }));

  return { drivers: enrichedDrivers, roadSheets, trucks, trailers, documents, garages };
}

export async function fetchDriverDetailBundle(driverId: string) {
  const [driver, roadSheets, documents, salaryHistory, incidents, assignments, trucks, trailers, garages] =
    await Promise.all([
      fetchDriverById(driverId),
      fetchDriverRoadSheets(driverId),
      fetchDriverDocuments(driverId),
      fetchDriverSalaryHistory(driverId),
      fetchDriverIncidents(driverId),
      fetchDriverAssignmentHistory(driverId),
      fetchTrucks(),
      fetchTrailers(),
      fetchGarages(),
    ]);

  if (!driver) throw new Error('Chauffeur introuvable.');

  const garage = garages.find(g => g.id === driver.garage_id);

  return {
    driver: { ...driver, garage_name: garage?.name ?? null },
    roadSheets,
    documents,
    salaryHistory,
    incidents,
    assignments,
    trucks,
    trailers,
    garages,
  };
}
