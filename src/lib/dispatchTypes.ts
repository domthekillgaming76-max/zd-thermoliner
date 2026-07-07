export type MissionStatus = 'draft' | 'planned' | 'assigned' | 'in_progress' | 'delivered' | 'cancelled';
export type MissionPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AlertType =
  | 'late_delivery'
  | 'missing_driver'
  | 'missing_truck'
  | 'overlapping_mission'
  | 'adr_missing'
  | 'temperature_issue';
export type CalendarView = 'day' | 'week' | 'month';

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransportMission {
  id: string;
  client_id: string | null;
  reference: string | null;
  client_name: string | null;
  departure_city: string;
  arrival_city: string;
  loading_date: string | null;
  delivery_date: string;
  cargo: string | null;
  weight_kg: number;
  pallets: number;
  temperature_required: boolean;
  temperature_min: number | null;
  temperature_max: number | null;
  adr_required: boolean;
  distance_km: number;
  price: number;
  priority: MissionPriority;
  status: MissionStatus;
  route_notes: string | null;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  garage_id: string | null;
  road_sheet_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  driver_name?: string | null;
  truck_label?: string | null;
  trailer_label?: string | null;
  garage_name?: string | null;
}

export interface MissionAssignment {
  id: string;
  mission_id: string;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  garage_id: string | null;
  route_notes: string | null;
  assigned_by: string | null;
  assigned_at: string;
  unassigned_at: string | null;
}

export interface PlanningEvent {
  id: string;
  mission_id: string | null;
  title: string;
  event_type: 'mission' | 'loading' | 'delivery' | 'maintenance' | 'other';
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  created_at: string;
  mission?: TransportMission | null;
}

export interface DispatchAlert {
  id: string;
  mission_id: string | null;
  alert_type: AlertType;
  message: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  mission_reference?: string | null;
}

export interface DispatchDashboardStats {
  missionsToday: number;
  missionsPending: number;
  missionsInProgress: number;
  missionsCompleted: number;
  availableDrivers: number;
  availableTrucks: number;
  urgentDeliveries: number;
  monthlyDeliveryVolume: number;
}

export interface MissionFormInput {
  client_id?: string;
  client_name?: string;
  departure_city: string;
  arrival_city: string;
  loading_date?: string;
  delivery_date: string;
  cargo?: string;
  weight_kg?: number;
  pallets?: number;
  temperature_required?: boolean;
  temperature_min?: number;
  temperature_max?: number;
  adr_required?: boolean;
  distance_km?: number;
  price?: number;
  priority?: MissionPriority;
  status?: MissionStatus;
  route_notes?: string;
}

export const MISSION_STATUS_LABELS: Record<MissionStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Brouillon', color: 'text-white/50', bg: 'bg-white/10 border-white/15' },
  planned: { label: 'Planifiée', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' },
  assigned: { label: 'Assignée', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
  in_progress: { label: 'En cours', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
  delivered: { label: 'Livrée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  cancelled: { label: 'Annulée', color: 'text-white/30', bg: 'bg-white/5 border-white/10' },
};

export const MISSION_PRIORITY_LABELS: Record<MissionPriority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-white/40' },
  normal: { label: 'Normale', color: 'text-white/60' },
  high: { label: 'Haute', color: 'text-amber-400' },
  urgent: { label: 'Urgente', color: 'text-red-400' },
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  late_delivery: 'Livraison en retard',
  missing_driver: 'Chauffeur manquant',
  missing_truck: 'Camion manquant',
  overlapping_mission: 'Mission chevauchée',
  adr_missing: 'ADR manquant',
  temperature_issue: 'Problème température',
};

export function missionStatusColor(status: MissionStatus): string {
  const map: Record<MissionStatus, string> = {
    draft: '#6b7280',
    planned: '#3b82f6',
    assigned: '#f59e0b',
    in_progress: '#ef4444',
    delivered: '#10b981',
    cancelled: '#374151',
  };
  return map[status] ?? '#6b7280';
}

export function computeDispatchDashboard(
  missions: TransportMission[],
  drivers: { id: string; status: string; driving_status?: string; is_suspended?: boolean }[],
  trucks: { id: string; status: string; driver_id?: string | null }[],
): DispatchDashboardStats {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const todayMissions = missions.filter(m => m.delivery_date === today || m.loading_date === today);
  const pending = missions.filter(m => ['draft', 'planned'].includes(m.status));
  const inProgress = missions.filter(m => m.status === 'in_progress' || m.status === 'assigned');
  const completed = missions.filter(m => m.status === 'delivered' && m.delivery_date?.startsWith(month));

  const availableDrivers = drivers.filter(
    d => d.status === 'active' && !d.is_suspended && d.driving_status !== 'vacation',
  ).length;
  const availableTrucks = trucks.filter(t => t.status === 'active' && !t.driver_id).length;
  const urgent = missions.filter(
    m => m.priority === 'urgent' && !['delivered', 'cancelled'].includes(m.status),
  ).length;
  const monthlyVolume = missions.filter(
    m => m.status === 'delivered' && m.delivery_date?.startsWith(month),
  ).length;

  return {
    missionsToday: todayMissions.length,
    missionsPending: pending.length,
    missionsInProgress: inProgress.length,
    missionsCompleted: completed.length,
    availableDrivers,
    availableTrucks,
    urgentDeliveries: urgent,
    monthlyDeliveryVolume: monthlyVolume,
  };
}

export function computeDispatchAlerts(missions: TransportMission[], drivers: { id: string; has_adr?: boolean }[]): Omit<DispatchAlert, 'id' | 'created_at' | 'resolved_at'>[] {
  const alerts: Omit<DispatchAlert, 'id' | 'created_at' | 'resolved_at'>[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = missions.filter(m => !['delivered', 'cancelled', 'draft'].includes(m.status));

  for (const m of active) {
    const ref = m.reference ?? m.id.slice(0, 8);

    if (['planned', 'assigned', 'in_progress'].includes(m.status) && !m.driver_id) {
      alerts.push({ mission_id: m.id, alert_type: 'missing_driver', message: `${ref} — aucun chauffeur assigné`, severity: 'high', resolved: false, mission_reference: ref });
    }
    if (['assigned', 'in_progress'].includes(m.status) && !m.truck_id) {
      alerts.push({ mission_id: m.id, alert_type: 'missing_truck', message: `${ref} — aucun camion assigné`, severity: 'high', resolved: false, mission_reference: ref });
    }
    if (m.adr_required && m.driver_id) {
      const driver = drivers.find(d => d.id === m.driver_id);
      if (driver && !driver.has_adr) {
        alerts.push({ mission_id: m.id, alert_type: 'adr_missing', message: `${ref} — chauffeur sans certificat ADR`, severity: 'high', resolved: false, mission_reference: ref });
      }
    }
    if (m.temperature_required && (!m.temperature_min && !m.temperature_max)) {
      alerts.push({ mission_id: m.id, alert_type: 'temperature_issue', message: `${ref} — plage de température non définie`, severity: 'medium', resolved: false, mission_reference: ref });
    }
    if (m.delivery_date) {
      const delivery = new Date(m.delivery_date);
      if (delivery < today && !['delivered', 'cancelled'].includes(m.status)) {
        alerts.push({ mission_id: m.id, alert_type: 'late_delivery', message: `${ref} — livraison en retard`, severity: 'high', resolved: false, mission_reference: ref });
      }
    }
  }

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.driver_id && a.driver_id === b.driver_id && a.delivery_date === b.delivery_date) {
        alerts.push({
          mission_id: a.id,
          alert_type: 'overlapping_mission',
          message: `${a.reference ?? a.id.slice(0, 8)} chevauche ${b.reference ?? b.id.slice(0, 8)} (même chauffeur)`,
          severity: 'medium',
          resolved: false,
          mission_reference: a.reference,
        });
      }
    }
  }

  return alerts;
}

export function buildMissionTimeline(missions: TransportMission[], assignments: MissionAssignment[]): { id: string; date: string; title: string; description: string | null }[] {
  const events: { id: string; date: string; title: string; description: string | null }[] = [];

  for (const m of missions) {
    events.push({
      id: `m-${m.id}`,
      date: m.created_at,
      title: `Mission ${m.reference ?? ''} — ${MISSION_STATUS_LABELS[m.status].label}`,
      description: `${m.departure_city} → ${m.arrival_city}`,
    });
  }
  for (const a of assignments) {
    events.push({
      id: `a-${a.id}`,
      date: a.assigned_at,
      title: 'Affectation ressources',
      description: a.route_notes,
    });
  }

  return events.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
}
