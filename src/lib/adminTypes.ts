export type PermissionKey =
  | 'can_view_dashboard'
  | 'can_manage_drivers'
  | 'can_manage_fleet'
  | 'can_manage_bank'
  | 'can_validate_road_sheets'
  | 'can_manage_recruitment'
  | 'can_manage_reports'
  | 'can_manage_admin';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'role_change'
  | 'profile_update'
  | 'road_sheet_validation'
  | 'bank_action'
  | 'failed_access_attempt'
  | 'account_suspend'
  | 'account_reactivate'
  | 'permission_change'
  | 'account_delete';

export type AdminActionType =
  | 'role_change'
  | 'suspend'
  | 'reactivate'
  | 'delete_profile'
  | 'reset_theme'
  | 'permission_grant'
  | 'permission_revoke'
  | 'promote';

export type AdminRoleCategory =
  | 'visitor'
  | 'recruit'
  | 'driver'
  | 'dispatcher'
  | 'fleet_manager'
  | 'manager'
  | 'admin';

export type ErpAssignableRole =
  | 'visitor'
  | 'candidat'
  | 'chauffeur'
  | 'tractionnaire'
  | 'dispatcher'
  | 'directeur'
  | 'patron'
  | 'admin'
  | 'pdg';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  pseudo: string | null;
  avatar_url: string | null;
  role: string;
  application_status: string | null;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string | null;
  last_seen_at: string | null;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_key: PermissionKey;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityLog {
  id: string;
  user_id: string | null;
  actor_id: string | null;
  event_type: SecurityEventType;
  message: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string | null;
  actor_email?: string | null;
}

export interface AdminAction {
  id: string;
  admin_id: string | null;
  target_user_id: string | null;
  action_type: AdminActionType;
  details: Record<string, unknown>;
  created_at: string;
  admin_email?: string | null;
  target_email?: string | null;
}

export interface AccessAttempt {
  id: string;
  user_id: string | null;
  email: string | null;
  page: string | null;
  allowed: boolean;
  reason: string | null;
  created_at: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  visitors: number;
  recruits: number;
  drivers: number;
  managers: number;
  admins: number;
  pendingApplications: number;
  pendingRoadSheets: number;
  securityAlerts: number;
  recentActions: number;
}

export const PERMISSION_KEYS: PermissionKey[] = [
  'can_view_dashboard',
  'can_manage_drivers',
  'can_manage_fleet',
  'can_manage_bank',
  'can_validate_road_sheets',
  'can_manage_recruitment',
  'can_manage_reports',
  'can_manage_admin',
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_view_dashboard: 'Tableau de bord',
  can_manage_drivers: 'Gestion chauffeurs',
  can_manage_fleet: 'Gestion flotte',
  can_manage_bank: 'Gestion banque',
  can_validate_road_sheets: 'Validation feuilles de route',
  can_manage_recruitment: 'Gestion recrutement',
  can_manage_reports: 'Rapports',
  can_manage_admin: 'Administration',
};

export const ROLE_CATEGORY_LABELS: Record<AdminRoleCategory, string> = {
  visitor: 'Visiteur',
  recruit: 'Recrue',
  driver: 'Chauffeur',
  dispatcher: 'Dispatcher',
  fleet_manager: 'Fleet Manager',
  manager: 'Manager',
  admin: 'Admin',
};

export const ERP_ROLE_LABELS: Record<string, string> = {
  pdg: 'PDG',
  patron: 'Patron',
  admin: 'Admin',
  directeur: 'Directeur',
  dispatcher: 'Dispatcher',
  chauffeur: 'Chauffeur',
  tractionnaire: 'Tractionnaire',
  candidat: 'Recrue',
  visitor: 'Visiteur',
  visiteur: 'Visiteur',
  ancien_membre: 'Ancien membre',
  banni: 'Banni',
};

export const ERP_ROLE_COLORS: Record<string, string> = {
  pdg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  patron: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  admin: 'bg-red-500/15 text-red-400 border-red-500/25',
  directeur: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  dispatcher: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  chauffeur: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  tractionnaire: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  candidat: 'bg-white/5 text-white/30 border-white/10',
  visitor: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  visiteur: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  ancien_membre: 'bg-white/5 text-white/25 border-white/8',
  banni: 'bg-red-500/15 text-red-400 border-red-500/25',
};

export const SECURITY_EVENT_LABELS: Record<SecurityEventType, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  role_change: 'Changement de rôle',
  profile_update: 'Mise à jour profil',
  road_sheet_validation: 'Validation feuille de route',
  bank_action: 'Action banque',
  failed_access_attempt: 'Accès refusé',
  account_suspend: 'Compte suspendu',
  account_reactivate: 'Compte réactivé',
  permission_change: 'Permission modifiée',
  account_delete: 'Profil archivé',
};

export function roleToCategory(role: string): AdminRoleCategory {
  if (['visitor', 'visiteur'].includes(role)) return 'visitor';
  if (role === 'candidat') return 'recruit';
  if (['chauffeur', 'tractionnaire'].includes(role)) return 'driver';
  if (role === 'dispatcher') return 'dispatcher';
  if (role === 'directeur') return 'fleet_manager';
  if (role === 'patron') return 'manager';
  if (['pdg', 'admin'].includes(role)) return 'admin';
  return 'visitor';
}

export function computeAdminDashboard(
  users: AdminUser[],
  pendingApplications: number,
  pendingRoadSheets: number,
  securityAlerts: number,
  recentActions: number,
): AdminDashboardStats {
  const active = users.filter(u => !['ancien_membre', 'banni'].includes(u.role));
  return {
    totalUsers: users.length,
    visitors: active.filter(u => ['visitor', 'visiteur'].includes(u.role)).length,
    recruits: active.filter(u => u.role === 'candidat').length,
    drivers: active.filter(u => ['chauffeur', 'tractionnaire'].includes(u.role)).length,
    managers: active.filter(u => ['patron', 'directeur', 'pdg'].includes(u.role)).length,
    admins: active.filter(u => ['pdg', 'patron', 'admin'].includes(u.role)).length,
    pendingApplications,
    pendingRoadSheets,
    securityAlerts,
    recentActions,
  };
}
