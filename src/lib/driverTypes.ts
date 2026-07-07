import type { Driver, RoadSheet } from './supabase';

export type DrivingStatus = 'driving' | 'resting' | 'vacation' | 'sick' | 'rest';
export type PresenceStatus = 'online' | 'offline' | 'driving' | 'rest' | 'vacation';
export type MemberRole =
  | 'visitor' | 'visiteur' | 'candidat' | 'recruitment' | 'chauffeur' | 'driver'
  | 'dispatcher' | 'directeur' | 'manager' | 'patron' | 'pdg' | 'admin' | 'hr';
export type DriverDocType = 'license' | 'medical' | 'adr' | 'identity' | 'contract' | 'insurance' | 'other';
export type DocumentStatus = 'pending' | 'valid' | 'expired' | 'rejected';
export type IncidentType = 'accident' | 'fine' | 'late_delivery' | 'damage' | 'positive_feedback' | 'manager_note' | 'note';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface DriverProfile extends Driver {
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  employment_contract: string | null;
  salary_mode: 'fixed' | 'percentage' | 'per_km';
  salary_base: number;
  driver_level: number;
  experience_years: number;
  license_categories: string | null;
  license_expires_at: string | null;
  has_adr: boolean;
  dangerous_goods_authorized: boolean;
  driving_status: DrivingStatus;
  presence_status: PresenceStatus;
  member_role: MemberRole | string;
  trailer_id: string | null;
  driving_hours_month: number;
  rest_hours_month: number;
  is_active_driver: boolean;
  is_suspended: boolean;
  role?: string;
  banner_url: string | null;
  date_of_birth: string | null;
  discord_name: string | null;
  truckersmp_id: string | null;
  steam_id: string | null;
  employee_number: string | null;
  hiring_date: string | null;
  eco_driving_score: number;
  driver_rating: number;
  fleet_name: string | null;
  last_seen_at: string | null;
  garage_name?: string | null;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  doc_type: DriverDocType;
  file_url: string | null;
  file_name: string | null;
  expires_at: string | null;
  uploaded_at: string;
  notes: string | null;
  status?: DocumentStatus;
  reminder_sent?: boolean;
  approved_at?: string | null;
}

export interface DriverSalaryRecord {
  id: string;
  driver_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  bonus: number;
  penalty: number;
  net_amount: number;
  road_sheet_id: string | null;
  notes: string | null;
  created_at: string;
  payment_status?: PaymentStatus;
  payment_date?: string | null;
}

export interface DriverIncident {
  id: string;
  driver_id: string;
  incident_date: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  created_at: string;
  incident_type?: IncidentType;
}

export interface DriverAssignmentRecord {
  id: string;
  driver_id: string;
  asset_type: 'truck' | 'trailer';
  asset_id: string;
  asset_label: string | null;
  assigned_at: string;
  unassigned_at: string | null;
}

export interface Trailer {
  id: string;
  registration: string;
  type: string;
  brand: string | null;
  status: 'active' | 'maintenance' | 'retired';
  driver_id: string | null;
  created_at: string;
}

export interface DriverStatistics {
  totalKm: number;
  monthlyKm: number;
  revenueGenerated: number;
  fuelConsumed: number;
  fuelAverage: number;
  deliveries: number;
  roadSheetsCompleted: number;
  netProfitability: number;
  averageProfit: number;
  averageSalary: number;
  averageDeliveryTimeHours: number;
  acceptedDeliveries: number;
  cancelledDeliveries: number;
  rejectedDeliveries: number;
  driverRating: number;
  drivingHours: number;
}

export interface DriverPerformanceRanking {
  driverId: string;
  driverName: string;
  photoUrl: string | null;
  totalKm: number;
  deliveries: number;
  netProfit: number;
  fuelPerKm: number;
  revenue: number;
  level: number;
}

export interface DocumentExpirationAlert {
  driverId: string;
  driverName: string;
  docType: DriverDocType;
  expiresAt: string;
  daysLeft: number;
}

export interface DriverTimelineEvent {
  id: string;
  date: string;
  type: 'road_sheet' | 'salary' | 'incident' | 'assignment' | 'document';
  title: string;
  description: string | null;
  amount?: number;
}

export function computeDriverStatistics(
  driver: DriverProfile,
  roadSheets: RoadSheet[],
  salaryHistory: DriverSalaryRecord[] = [],
): DriverStatistics {
  const validated = roadSheets.filter(s => s.validated || s.status === 'approved' || s.status === 'validated');
  const rejected = roadSheets.filter(s => s.status === 'rejected');
  const cancelled = roadSheets.filter(s => s.status === 'draft' || s.status === 'rejected');
  const month = new Date().toISOString().slice(0, 7);
  const monthSheets = validated.filter(s => s.date?.startsWith(month));

  const totalKm = validated.reduce((s, r) => s + Number(r.km || r.total_distance || 0), 0);
  const monthlyKm = monthSheets.reduce((s, r) => s + Number(r.km || r.total_distance || 0), 0);
  const revenueGenerated = validated.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalFuel = validated.reduce((s, r) => s + Number(r.fuel_cost || 0), 0);
  const fuelAverage = totalKm > 0 ? totalFuel / totalKm : 0;
  const netProfitability = validated.reduce((s, r) => s + Number(r.net_profit || 0), 0);
  const averageProfit = validated.length > 0 ? netProfitability / validated.length : 0;

  const paidSalaries = salaryHistory.filter(s => s.payment_status !== 'cancelled');
  const averageSalary = paidSalaries.length > 0
    ? paidSalaries.reduce((s, r) => s + Number(r.net_amount || 0), 0) / paidSalaries.length
    : 0;

  const deliveryTimes = validated
    .map(r => Number((r as Record<string, unknown>).driving_time_hours ?? (r as Record<string, unknown>).duration_hours ?? 0))
    .filter(h => h > 0);
  const averageDeliveryTimeHours = deliveryTimes.length > 0
    ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
    : 0;

  const baseRating = driver.driver_rating || 0;
  const computedRating = validated.length > 0
    ? Math.min(5, Math.max(1, 3 + (netProfitability / Math.max(validated.length, 1)) / 500))
    : baseRating;

  return {
    totalKm: driver.total_km || totalKm,
    monthlyKm: driver.monthly_km || monthlyKm,
    revenueGenerated,
    fuelConsumed: totalFuel,
    fuelAverage: Math.round(fuelAverage * 100) / 100,
    deliveries: driver.deliveries_count || validated.length,
    roadSheetsCompleted: validated.length,
    netProfitability,
    averageProfit: Math.round(averageProfit * 100) / 100,
    averageSalary: Math.round(averageSalary * 100) / 100,
    averageDeliveryTimeHours: Math.round(averageDeliveryTimeHours * 10) / 10,
    acceptedDeliveries: validated.length,
    cancelledDeliveries: cancelled.length,
    rejectedDeliveries: rejected.length,
    driverRating: Math.round((baseRating || computedRating) * 10) / 10,
    drivingHours: Number(driver.driving_hours_month || 0),
  };
}

export function buildPerformanceRankings(
  drivers: DriverProfile[],
  roadSheetsByDriver: Map<string, RoadSheet[]>,
): {
  bestDriver: DriverPerformanceRanking | null;
  bestProfitability: DriverPerformanceRanking | null;
  leastFuel: DriverPerformanceRanking | null;
  mostDeliveries: DriverPerformanceRanking | null;
  all: DriverPerformanceRanking[];
} {
  const all: DriverPerformanceRanking[] = drivers.map(d => {
    const sheets = roadSheetsByDriver.get(d.id) ?? [];
    const validated = sheets.filter(s => s.validated || s.status === 'approved');
    const totalKm = validated.reduce((s, r) => s + Number(r.km || 0), 0);
    const totalFuel = validated.reduce((s, r) => s + Number(r.fuel_cost || 0), 0);
    return {
      driverId: d.id,
      driverName: d.name,
      photoUrl: d.photo_url ?? d.avatar_url,
      totalKm: d.total_km || totalKm,
      deliveries: d.deliveries_count || validated.length,
      netProfit: validated.reduce((s, r) => s + Number(r.net_profit || 0), 0),
      fuelPerKm: totalKm > 0 ? totalFuel / totalKm : 999,
      revenue: validated.reduce((s, r) => s + Number(r.revenue || 0), 0),
      level: d.driver_level ?? 1,
    };
  });

  const pick = (arr: DriverPerformanceRanking[], key: keyof DriverPerformanceRanking, asc = false) =>
    [...arr].sort((a, b) => {
      const av = a[key] as number;
      const bv = b[key] as number;
      return asc ? av - bv : bv - av;
    })[0] ?? null;

  return {
    all: all.sort((a, b) => b.netProfit - a.netProfit),
    bestDriver: pick(all, 'totalKm'),
    bestProfitability: pick(all, 'netProfit'),
    leastFuel: pick(all, 'fuelPerKm', true),
    mostDeliveries: pick(all, 'deliveries'),
  };
}

export function buildExpirationAlerts(
  drivers: DriverProfile[],
  documents: DriverDocument[],
): DocumentExpirationAlert[] {
  const today = new Date();
  const driverMap = new Map(drivers.map(d => [d.id, d.name]));
  return documents
    .filter(doc => doc.expires_at)
    .map(doc => {
      const exp = new Date(doc.expires_at!);
      const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        driverId: doc.driver_id,
        driverName: driverMap.get(doc.driver_id) ?? 'Chauffeur',
        docType: doc.doc_type,
        expiresAt: doc.expires_at!,
        daysLeft,
      };
    })
    .filter(a => a.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function buildDriverTimeline(
  roadSheets: RoadSheet[],
  salaryRecords: DriverSalaryRecord[],
  incidents: DriverIncident[],
  assignments: DriverAssignmentRecord[],
): DriverTimelineEvent[] {
  const events: DriverTimelineEvent[] = [];

  for (const s of roadSheets) {
    events.push({
      id: `rs-${s.id}`,
      date: s.date || s.created_at,
      type: 'road_sheet',
      title: s.validated ? 'Feuille validée' : 'Feuille de route',
      description: `${s.departure ?? s.departure_city ?? '?'} → ${s.arrival ?? s.arrival_city ?? '?'}`,
      amount: Number(s.net_profit || 0),
    });
  }
  for (const r of salaryRecords) {
    events.push({
      id: `sal-${r.id}`,
      date: r.created_at,
      type: 'salary',
      title: 'Salaire / prime',
      description: r.notes,
      amount: Number(r.net_amount),
    });
  }
  for (const i of incidents) {
    events.push({
      id: `inc-${i.id}`,
      date: i.incident_date,
      type: 'incident',
      title: i.title,
      description: i.description,
    });
  }
  for (const a of assignments) {
    events.push({
      id: `asg-${a.id}`,
      date: a.assigned_at,
      type: 'assignment',
      title: `Affectation ${a.asset_type}`,
      description: a.asset_label,
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const DRIVING_STATUS_LABELS: Record<DrivingStatus, { label: string; color: string }> = {
  driving: { label: 'En route', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  resting: { label: 'Au repos', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  rest: { label: 'Repos', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  vacation: { label: 'En vacances', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  sick: { label: 'Arrêt maladie', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export const PRESENCE_STATUS_LABELS: Record<PresenceStatus, { label: string; color: string; dot: string }> = {
  online: { label: 'En ligne', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  offline: { label: 'Hors ligne', color: 'text-white/30', dot: 'bg-white/20' },
  driving: { label: 'Conduite', color: 'text-red-400', dot: 'bg-red-400' },
  rest: { label: 'Repos', color: 'text-blue-400', dot: 'bg-blue-400' },
  vacation: { label: 'Vacances', color: 'text-amber-400', dot: 'bg-amber-400' },
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  visitor: 'Visiteur',
  visiteur: 'Visiteur',
  candidat: 'Recrutement',
  recruitment: 'Recrutement',
  chauffeur: 'Chauffeur',
  driver: 'Chauffeur',
  dispatcher: 'Dispatcher',
  directeur: 'Fleet Manager',
  manager: 'Manager',
  hr: 'RH',
  patron: 'Administrateur',
  pdg: 'PDG',
  admin: 'Administrateur',
};

export function getMemberRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Chauffeur';
  return MEMBER_ROLE_LABELS[role] ?? role;
}

export function getPresenceLabel(status: string | null | undefined): string {
  if (!status) return 'Hors ligne';
  return PRESENCE_STATUS_LABELS[status as PresenceStatus]?.label ?? status;
}

export const DOC_TYPE_LABELS: Record<DriverDocType, string> = {
  license: 'Permis de conduire',
  medical: 'Certificat médical',
  adr: 'Certificat ADR',
  identity: "Carte d'identité",
  contract: 'Contrat de travail',
  insurance: 'Assurance',
  other: 'Autre document',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  accident: 'Accident',
  fine: 'Amende',
  late_delivery: 'Retard livraison',
  damage: 'Dommage',
  positive_feedback: 'Feedback positif',
  manager_note: 'Note manager',
  note: 'Note',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'En attente',
  valid: 'Valide',
  expired: 'Expiré',
  rejected: 'Rejeté',
};
