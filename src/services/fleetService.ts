import { supabase } from '../lib/supabase';
import type { Garage } from '../lib/supabase';
import type {
  FleetMaintenance,
  FleetTruck,
  MaintenanceType,
  TruckAssignment,
  TruckCosts,
  TruckDocument,
  TruckDocType,
} from '../lib/fleetTypes';
import type { Trailer } from '../lib/driverTypes';

export interface TruckFormInput {
  registration: string;
  brand?: string;
  model?: string;
  vin?: string;
  year?: number;
  mileage?: number;
  fuel_consumption?: number;
  status: FleetTruck['status'];
  garage_id?: string;
  trailer_id?: string;
  photo_url?: string;
  insurance_date?: string;
  technical_inspection_date?: string;
}

function normalizeTruck(row: Record<string, unknown>): FleetTruck {
  return {
    id: row.id as string,
    registration: row.registration as string,
    brand: (row.brand as string) ?? null,
    model: (row.model as string) ?? null,
    photo_url: (row.photo_url as string) ?? null,
    driver_id: (row.driver_id as string) ?? null,
    garage_id: (row.garage_id as string) ?? null,
    status: (row.status as FleetTruck['status']) ?? 'active',
    mileage: Number(row.mileage ?? 0),
    created_at: row.created_at as string,
    vin: (row.vin as string) ?? null,
    year: row.year != null ? Number(row.year) : null,
    fuel_consumption: Number(row.fuel_consumption ?? 0),
    trailer_id: (row.trailer_id as string) ?? null,
    insurance_date: (row.insurance_date as string) ?? null,
    technical_inspection_date: (row.technical_inspection_date as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
  };
}

function formToPayload(input: TruckFormInput): Record<string, unknown> {
  return {
    registration: input.registration,
    brand: input.brand || null,
    model: input.model || null,
    vin: input.vin || null,
    year: input.year ?? null,
    mileage: input.mileage ?? 0,
    fuel_consumption: input.fuel_consumption ?? 0,
    status: input.status,
    garage_id: input.garage_id || null,
    trailer_id: input.trailer_id || null,
    photo_url: input.photo_url || null,
    insurance_date: input.insurance_date || null,
    technical_inspection_date: input.technical_inspection_date || null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchFleetTrucks(): Promise<FleetTruck[]> {
  const { data, error } = await supabase.from('trucks').select('*').order('registration');
  if (error) throw error;
  return (data ?? []).map(r => normalizeTruck(r as Record<string, unknown>));
}

export async function fetchFleetTruckById(id: string): Promise<FleetTruck | null> {
  const { data, error } = await supabase.from('trucks').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeTruck(data as Record<string, unknown>) : null;
}

export async function createFleetTruck(input: TruckFormInput): Promise<FleetTruck> {
  const { data, error } = await supabase.from('trucks').insert(formToPayload(input)).select().single();
  if (error) throw error;
  return normalizeTruck(data as Record<string, unknown>);
}

export async function updateFleetTruck(id: string, input: TruckFormInput): Promise<FleetTruck> {
  const { data, error } = await supabase.from('trucks').update(formToPayload(input)).eq('id', id).select().single();
  if (error) throw error;
  return normalizeTruck(data as Record<string, unknown>);
}

export async function deleteFleetTruck(id: string): Promise<void> {
  const { error } = await supabase.from('trucks').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTruckCosts(): Promise<TruckCosts[]> {
  const { data, error } = await supabase.from('truck_costs').select('*');
  if (error) return [];
  return (data ?? []) as TruckCosts[];
}

export async function fetchTruckCostByTruckId(truckId: string): Promise<TruckCosts | null> {
  const { data, error } = await supabase.from('truck_costs').select('*').eq('truck_id', truckId).maybeSingle();
  if (error) return null;
  return data as TruckCosts | null;
}

export async function fetchFleetMaintenance(truckId?: string): Promise<FleetMaintenance[]> {
  let q = supabase.from('fleet_maintenance').select('*').order('scheduled_date', { ascending: true });
  if (truckId) q = q.eq('truck_id', truckId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as FleetMaintenance[];
}

export async function createFleetMaintenance(input: {
  truck_id: string;
  maintenance_type: MaintenanceType;
  title: string;
  description?: string;
  scheduled_date?: string;
  estimated_cost?: number;
}): Promise<FleetMaintenance> {
  const { data, error } = await supabase.from('fleet_maintenance').insert({
    truck_id: input.truck_id,
    maintenance_type: input.maintenance_type,
    title: input.title,
    description: input.description || null,
    scheduled_date: input.scheduled_date || null,
    estimated_cost: input.estimated_cost ?? 0,
    status: 'scheduled',
  }).select().single();
  if (error) throw error;
  return data as FleetMaintenance;
}

export async function validateFleetMaintenance(id: string, approverId: string, actualCost?: number): Promise<void> {
  const { error } = await supabase.from('fleet_maintenance').update({
    validated: true,
    validated_by: approverId,
    validated_at: new Date().toISOString(),
    status: 'completed',
    completed_date: new Date().toISOString().slice(0, 10),
    actual_cost: actualCost,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function fetchTruckAssignments(truckId: string): Promise<TruckAssignment[]> {
  const { data, error } = await supabase
    .from('truck_assignments')
    .select('*')
    .eq('truck_id', truckId)
    .order('assigned_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as TruckAssignment[];
}

export async function fetchTruckDocuments(truckId: string): Promise<TruckDocument[]> {
  const { data, error } = await supabase
    .from('truck_documents')
    .select('*')
    .eq('truck_id', truckId)
    .order('expires_at', { ascending: true });
  if (error) return [];
  return (data ?? []) as TruckDocument[];
}

export async function assignTruckFleet(
  truckId: string,
  driverId: string | null,
  trailerId: string | null,
  garageId: string | null,
): Promise<void> {
  await supabase.from('truck_assignments').update({ unassigned_at: new Date().toISOString() })
    .eq('truck_id', truckId).is('unassigned_at', null);

  if (driverId) {
    const { data: driver } = await supabase.from('drivers').select('truck_id').eq('id', driverId).maybeSingle();
    if (driver?.truck_id && driver.truck_id !== truckId) {
      await supabase.from('trucks').update({ driver_id: null }).eq('id', driver.truck_id);
    }
    await supabase.from('drivers').update({ truck_id: truckId }).eq('id', driverId);
    await supabase.from('trucks').update({ driver_id: driverId, trailer_id: trailerId, garage_id: garageId, updated_at: new Date().toISOString() }).eq('id', truckId);
  } else {
    await supabase.from('trucks').update({ driver_id: null, trailer_id: trailerId, garage_id: garageId, updated_at: new Date().toISOString() }).eq('id', truckId);
  }

  if (trailerId) {
    await supabase.from('trailers').update({ driver_id: driverId }).eq('id', trailerId);
  }

  await supabase.from('truck_assignments').insert({
    truck_id: truckId,
    driver_id: driverId,
    trailer_id: trailerId,
    garage_id: garageId,
  });
}

export async function fetchGaragesList(): Promise<Garage[]> {
  const { data, error } = await supabase.from('garages').select('*').order('name');
  if (error) return [];
  return (data ?? []) as Garage[];
}

export async function fetchTrailersList(): Promise<Trailer[]> {
  const { data, error } = await supabase.from('trailers').select('*').order('registration');
  if (error) return [];
  return (data ?? []) as Trailer[];
}

export async function fetchDriversList(): Promise<{ id: string; name: string; pseudo: string | null }[]> {
  const { data, error } = await supabase.from('drivers').select('id, name, pseudo').order('name');
  if (error) return [];
  return (data ?? []) as { id: string; name: string; pseudo: string | null }[];
}

async function enrichTrucks(trucks: FleetTruck[]): Promise<FleetTruck[]> {
  const [drivers, trailers, garages] = await Promise.all([
    fetchDriversList(),
    fetchTrailersList(),
    fetchGaragesList(),
  ]);
  const driverMap = new Map(drivers.map(d => [d.id, d.name]));
  const trailerMap = new Map(trailers.map(t => [t.id, `${t.registration} (${t.type})`]));
  const garageMap = new Map(garages.map(g => [g.id, g.name]));

  return trucks.map(t => ({
    ...t,
    driver_name: t.driver_id ? driverMap.get(t.driver_id) ?? null : null,
    trailer_label: t.trailer_id ? trailerMap.get(t.trailer_id) ?? null : null,
    garage_name: t.garage_id ? garageMap.get(t.garage_id) ?? null : null,
  }));
}

export async function fetchFleetModuleBundle() {
  const [trucks, costs, maintenance, garages, trailers, drivers] = await Promise.all([
    fetchFleetTrucks(),
    fetchTruckCosts(),
    fetchFleetMaintenance(),
    fetchGaragesList(),
    fetchTrailersList(),
    fetchDriversList(),
  ]);

  const enrichedTrucks = await enrichTrucks(trucks);

  return { trucks: enrichedTrucks, costs, maintenance, garages, trailers, drivers };
}

export async function fetchFleetTruckDetail(truckId: string) {
  const [truck, costs, maintenance, assignments, documents, garages, trailers, drivers] = await Promise.all([
    fetchFleetTruckById(truckId),
    fetchTruckCostByTruckId(truckId),
    fetchFleetMaintenance(truckId),
    fetchTruckAssignments(truckId),
    fetchTruckDocuments(truckId),
    fetchGaragesList(),
    fetchTrailersList(),
    fetchDriversList(),
  ]);

  if (!truck) throw new Error('Camion introuvable.');

  const [enriched] = await enrichTrucks([truck]);
  const driverMap = new Map(drivers.map(d => [d.id, d.name]));
  const trailerMap = new Map(trailers.map(t => [t.id, `${t.registration} (${t.type})`]));
  const garageMap = new Map(garages.map(g => [g.id, g.name]));

  const enrichedAssignments = assignments.map(a => ({
    ...a,
    driver_name: a.driver_id ? driverMap.get(a.driver_id) ?? null : null,
    trailer_label: a.trailer_id ? trailerMap.get(a.trailer_id) ?? null : null,
    garage_name: a.garage_id ? garageMap.get(a.garage_id) ?? null : null,
  }));

  return {
    truck: enriched,
    costs,
    maintenance,
    assignments: enrichedAssignments,
    documents,
    garages,
    trailers,
    drivers,
  };
}

export async function uploadTruckDocument(
  truckId: string,
  file: File,
  docType: TruckDocType,
  expiresAt?: string,
): Promise<TruckDocument> {
  const ext = file.name.split('.').pop();
  const path = `${truckId}/${docType}-${Date.now()}.${ext}`;
  const { data: upload, error: uploadError } = await supabase.storage
    .from('driver-documents')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const fileUrl = supabase.storage.from('driver-documents').getPublicUrl(upload.path).data.publicUrl;
  const { data, error } = await supabase.from('truck_documents').insert({
    truck_id: truckId,
    doc_type: docType,
    file_url: fileUrl,
    file_name: file.name,
    expires_at: expiresAt || null,
    status: 'valid',
  }).select().single();
  if (error) throw error;
  return data as TruckDocument;
}
