import type { DriverDocument, DriverSalaryRecord } from './driverTypes';
import type { TransportMission, MissionStatus } from './dispatchTypes';

export type DriverPortalTab = 'home' | 'missions' | 'sheet' | 'docs' | 'hr_folder' | 'bank_account';

export type DriverPresenceStatus =
  | 'available'
  | 'on_mission'
  | 'driving'
  | 'resting'
  | 'issue_reported'
  | 'offline';

export interface DriverPortalNotification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string;
}

export interface DriverPortalHome {
  driverId: string;
  driverName: string;
  truckId: string | null;
  trailerType: string | null;
  presenceStatus: DriverPresenceStatus;
  monthlyKm: number;
  salaryEstimate: number;
  truckLabel: string | null;
  trailerLabel: string | null;
  todayMission: TransportMission | null;
  unreadNotifications: number;
}

export interface DriverPortalBundle {
  home: DriverPortalHome;
  missions: TransportMission[];
  documents: DriverDocument[];
  payslips: DriverSalaryRecord[];
  notifications: DriverPortalNotification[];
  migrationRequired: boolean;
}

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  draft: 'Brouillon',
  planned: 'Planifiée',
  assigned: 'Assignée',
  in_progress: 'En cours',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  draft: 'text-white/40 bg-white/5 border-white/10',
  planned: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  assigned: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  in_progress: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  delivered: 'text-white/50 bg-white/5 border-white/10',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/25',
};

export const DRIVER_PRESENCE_LABELS: Record<DriverPresenceStatus, string> = {
  available: 'Disponible',
  on_mission: 'En mission',
  driving: 'En route',
  resting: 'Au repos',
  issue_reported: 'Problème signalé',
  offline: 'Hors ligne',
};

export const DRIVER_PRESENCE_COLORS: Record<DriverPresenceStatus, string> = {
  available: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  on_mission: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  driving: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  resting: 'text-white/50 bg-white/5 border-white/10',
  issue_reported: 'text-red-400 bg-red-500/10 border-red-500/25',
  offline: 'text-white/40 bg-white/5 border-white/10',
};

export const DRIVER_PORTAL_TAB_LABELS: Record<DriverPortalTab, string> = {
  home: 'Accueil',
  missions: 'Missions',
  sheet: 'Feuille',
  docs: 'Documents',
  hr_folder: 'Dossier',
  bank_account: 'Banque',
};

export function formatDriverCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}
