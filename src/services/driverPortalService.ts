import { supabase } from '../lib/supabase';
import { monthKey } from '../lib/format';
import type { DriverDocument, DriverProfile, DriverSalaryRecord } from '../lib/driverTypes';
import {
  fetchDriverLinkedIds,
  fetchTransportMissions,
  filterMissionsForUser,
  startMission,
  deliverMission,
} from './dispatchService';
import { fetchDriverDocuments, fetchDriverSalaryHistory } from './driverService';
import { createRoadSheet, fetchDriverByUserId, type RoadSheetFormData } from './roadSheetService';
import type {
  DriverPortalBundle,
  DriverPortalHome,
  DriverPortalNotification,
  DriverPresenceStatus,
} from '../lib/driverPortalTypes';
import { canViewAllDriverPortalActivity } from '../lib/driverPortalPermissions';

function isPortalSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist');
}

async function touchMobileSession(userId: string, driverId: string | null): Promise<void> {
  const { data: existing } = await supabase
    .from('driver_mobile_sessions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    driver_id: driverId,
    last_active_at: new Date().toISOString(),
    device_info: { ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'server' },
  };

  if (existing?.id) {
    await supabase.from('driver_mobile_sessions').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('driver_mobile_sessions').insert(payload);
  }
}

export async function fetchDriverPortalBundle(
  userId: string,
  role: string | null | undefined,
  email?: string | null,
): Promise<DriverPortalBundle> {
  const { error: probe } = await supabase.from('driver_mobile_sessions').select('id').limit(1);
  const migrationRequired = !!probe && isPortalSchemaError(probe);

  const driver = await fetchDriverByUserId(userId) as DriverProfile | null;
  const canViewAll = canViewAllDriverPortalActivity(role, email);

  if (!driver && !canViewAll) {
    throw new Error('Aucun profil chauffeur lié à votre compte.');
  }

  if (driver) {
    void touchMobileSession(userId, driver.id);
  }

  const linkedIds = driver ? [driver.id] : await fetchDriverLinkedIds(userId);

  const [missions, docs, payslips, notifsRes, truckRes, trailerRes, statusRes, sheetsRes] = await Promise.all([
    fetchTransportMissions(),
    driver ? fetchDriverDocuments(driver.id) : Promise.resolve([] as DriverDocument[]),
    driver ? fetchDriverSalaryHistory(driver.id) : Promise.resolve([] as DriverSalaryRecord[]),
    supabase.from('notifications').select('id, title, message, type, read, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
    driver?.truck_id
      ? supabase.from('trucks').select('registration, brand, model').eq('id', driver.truck_id).maybeSingle()
      : Promise.resolve({ data: null }),
    driver?.trailer_id
      ? supabase.from('trailers').select('registration, type').eq('id', driver.trailer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    driver
      ? supabase.from('driver_status_logs').select('status').eq('driver_id', driver.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    driver
      ? supabase.from('road_sheets').select('km, date').eq('driver_id', driver.id).limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  let missionList = missions;
  if (!canViewAll) {
    missionList = filterMissionsForUser(missionList, false, linkedIds);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayMission = missionList.find(m =>
    m.delivery_date?.startsWith(today) && !['delivered', 'cancelled'].includes(m.status),
  ) ?? missionList.find(m => !['delivered', 'cancelled'].includes(m.status)) ?? null;

  const month = monthKey(new Date());
  const monthlyKm = (sheetsRes.data ?? [])
    .filter(s => (s.date as string)?.startsWith(month))
    .reduce((sum, s) => sum + Number(s.km ?? 0), 0);

  const salaryEstimate = computeSalaryEstimate(driver, monthlyKm, payslips);

  const truck = truckRes.data;
  const trailer = trailerRes.data;

  const home: DriverPortalHome = {
    driverId: driver?.id ?? '',
    driverName: driver?.name ?? 'Chauffeur',
    truckId: driver?.truck_id ?? null,
    trailerType: trailer?.type ?? null,
    presenceStatus: (statusRes.data?.status as DriverPresenceStatus) ?? (driver?.presence_status as DriverPresenceStatus) ?? 'available',
    monthlyKm: Math.round(monthlyKm),
    salaryEstimate,
    truckLabel: truck ? [truck.brand, truck.model, truck.registration].filter(Boolean).join(' ') : null,
    trailerLabel: trailer ? `${trailer.type} (${trailer.registration})` : null,
    todayMission,
    unreadNotifications: (notifsRes.data ?? []).filter(n => !n.read).length,
  };

  return {
    home,
    missions: missionList,
    documents: docs,
    payslips,
    notifications: (notifsRes.data ?? []) as DriverPortalNotification[],
    migrationRequired,
  };
}

function computeSalaryEstimate(
  driver: { salary_mode?: string; salary_base?: number } | null,
  monthlyKm: number,
  payslips: DriverSalaryRecord[],
): number {
  if (payslips.length > 0) return Number(payslips[0].net_amount ?? 0);
  if (!driver) return 0;
  const base = Number(driver.salary_base ?? 0);
  if (driver.salary_mode === 'per_km') return Math.round(base * monthlyKm * 100) / 100;
  if (driver.salary_mode === 'percentage') return Math.round(base * 100) / 100;
  return base;
}

export async function logDriverStatus(
  driverId: string,
  userId: string,
  status: DriverPresenceStatus,
  notes?: string,
  missionId?: string,
): Promise<void> {
  const { error } = await supabase.from('driver_status_logs').insert({
    driver_id: driverId,
    user_id: userId,
    status,
    notes: notes ?? null,
    mission_id: missionId ?? null,
  });
  if (error && !isPortalSchemaError(error)) throw error;
  await supabase.from('drivers').update({ presence_status: status === 'on_mission' ? 'driving' : status }).eq('id', driverId);
}

export async function submitMobileRoadSheet(
  userId: string,
  form: RoadSheetFormData,
): Promise<void> {
  const driver = await fetchDriverByUserId(userId) as DriverProfile | null;
  if (!driver) throw new Error('Profil chauffeur introuvable.');
  await createRoadSheet(
    { ...form, driver_id: driver.id },
    driver.name,
    driver.user_id ?? userId,
  );
  await logDriverStatus(driver.id, userId, 'available', 'Feuille de route soumise');
}

export async function uploadDeliveryProof(
  userId: string,
  driverId: string,
  file: File,
  missionId?: string,
  roadSheetId?: string,
  notes?: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${driverId}/proof-${Date.now()}.${ext}`;
  const { data: upload, error: uploadError } = await supabase.storage
    .from('driver-documents')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const photoUrl = supabase.storage.from('driver-documents').getPublicUrl(upload.path).data.publicUrl;

  const { error } = await supabase.from('delivery_proofs').insert({
    driver_id: driverId,
    user_id: userId,
    photo_url: photoUrl,
    mission_id: missionId ?? null,
    road_sheet_id: roadSheetId ?? null,
    notes: notes ?? null,
  });
  if (error && !isPortalSchemaError(error)) throw error;

  if (roadSheetId) {
    await supabase.from('road_sheets').update({ delivery_photo_url: photoUrl }).eq('id', roadSheetId);
  }

  return photoUrl;
}

export async function reportTruckIssue(
  driverId: string,
  userId: string,
  title: string,
  description: string,
): Promise<void> {
  await supabase.from('driver_incidents').insert({
    driver_id: driverId,
    incident_date: new Date().toISOString().slice(0, 10),
    title,
    description,
    severity: 'medium',
    incident_type: 'note',
    resolved: false,
  });
  await logDriverStatus(driverId, userId, 'issue_reported', title);

  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(5);
  for (const admin of admins ?? []) {
    await supabase.from('notifications').insert({
      user_id: admin.id,
      title: 'Problème camion signalé',
      message: `${title} — ${description.slice(0, 100)}`,
      type: 'warning',
    });
  }
}

export async function contactAdmin(userId: string, driverName: string, message: string): Promise<void> {
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(5);
  for (const admin of admins ?? []) {
    await supabase.from('notifications').insert({
      user_id: admin.id,
      title: `Message chauffeur — ${driverName}`,
      message: message.slice(0, 200),
      type: 'info',
    });
  }
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Message envoyé',
    message: 'Votre message a été transmis à l\'administration.',
    type: 'success',
  });
}

export { startMission, deliverMission };
