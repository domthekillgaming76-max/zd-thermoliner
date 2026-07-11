import { Crown, Eye, Shield, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Rôles officiels Z&D Thermoliner */
export type AppRole = 'visiteur' | 'chauffeur' | 'admin';

export type ModuleKey =
  | 'wall' | 'profile' | 'settings' | 'updates'
  | 'recruitment' | 'recruitment_applications' | 'recruitment_admin'
  | 'dashboard' | 'road_sheets' | 'freight_market' | 'dispatch'
  | 'gps_tracking' | 'fleet' | 'maintenance' | 'drivers' | 'reports'
  | 'finance' | 'invoices' | 'salaries' | 'accounting' | 'bank'
  | 'administration' | 'roles_salons' | 'salons_admin' | 'admin_integrations'
  | 'training_center' | 'driver_portal' | 'documents' | 'notifications'
  | 'fleet_map' | 'statistics' | 'assistant' | 'garages' | 'clients'
  | 'driver_integrations' | 'events' | 'join';

const RAW_TO_APP_ROLE: Record<string, AppRole> = {
  visiteur: 'visiteur', visitor: 'visiteur', invité: 'visiteur', invite: 'visiteur',
  guest: 'visiteur', candidat: 'visiteur', recruit: 'visiteur', recruitment: 'visiteur',
  recruteur: 'visiteur', recrue: 'visiteur',
  chauffeur: 'chauffeur', driver: 'chauffeur', conducteur: 'chauffeur', member: 'chauffeur',
  membre: 'chauffeur', flotte: 'chauffeur', dispatcher: 'chauffeur', directeur: 'chauffeur',
  fleet_manager: 'chauffeur', manager: 'chauffeur', tractionnaire: 'chauffeur',
  responsable: 'chauffeur', modérateur: 'chauffeur', moderateur: 'chauffeur',
  comptable: 'chauffeur', accountant: 'chauffeur',
  admin: 'admin', administrator: 'admin', administrateur: 'admin',
  owner: 'admin', superadmin: 'admin', pdg: 'admin', patron: 'admin',
};

export const CANONICAL_ROLES: AppRole[] = ['visiteur', 'chauffeur', 'admin'];
export const ASSIGNABLE_ROLES: AppRole[] = CANONICAL_ROLES;

export interface RoleBadgeConfig {
  label: string;
  className: string;
  icon: LucideIcon;
  showOnWall: boolean;
}

const BADGE: Record<AppRole, RoleBadgeConfig> = {
  visiteur: {
    label: 'Visiteur',
    className: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    icon: Eye,
    showOnWall: true,
  },
  chauffeur: {
    label: 'Chauffeur',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: Truck,
    showOnWall: true,
  },
  admin: {
    label: 'Admin',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Crown,
    showOnWall: true,
  },
};

const LEGACY_BADGE: Record<string, RoleBadgeConfig> = {
  ancien_membre: {
    label: 'Ancien membre',
    className: 'bg-white/5 text-white/25 border-white/8',
    icon: Eye,
    showOnWall: false,
  },
  banni: {
    label: 'Banni',
    className: 'bg-red-500/15 text-red-400 border-red-500/25',
    icon: Shield,
    showOnWall: false,
  },
};

export const ROUTE_MODULE_RULES: { prefix: string; module: ModuleKey }[] = [
  { prefix: '/recruitment/applications', module: 'recruitment_applications' },
  { prefix: '/recruitment/admin', module: 'recruitment_admin' },
  { prefix: '/recruitment', module: 'recruitment' },
  { prefix: '/administration/roles-salons', module: 'roles_salons' },
  { prefix: '/administration/salons', module: 'salons_admin' },
  { prefix: '/administration/integrations', module: 'admin_integrations' },
  { prefix: '/administration', module: 'administration' },
  { prefix: '/road-sheets', module: 'road_sheets' },
  { prefix: '/fleet-map', module: 'fleet_map' },
  { prefix: '/dashboard', module: 'dashboard' },
  { prefix: '/drivers', module: 'drivers' },
  { prefix: '/driver', module: 'driver_portal' },
  { prefix: '/fleet', module: 'fleet' },
  { prefix: '/dispatch', module: 'dispatch' },
  { prefix: '/freight', module: 'freight_market' },
  { prefix: '/tracking', module: 'gps_tracking' },
  { prefix: '/training', module: 'training_center' },
  { prefix: '/documents', module: 'documents' },
  { prefix: '/clients', module: 'clients' },
  { prefix: '/garages', module: 'garages' },
  { prefix: '/finance', module: 'finance' },
  { prefix: '/invoices', module: 'invoices' },
  { prefix: '/salaries', module: 'salaries' },
  { prefix: '/accounting', module: 'accounting' },
  { prefix: '/bank', module: 'bank' },
  { prefix: '/maintenance', module: 'maintenance' },
  { prefix: '/reports', module: 'reports' },
  { prefix: '/assistant', module: 'assistant' },
  { prefix: '/statistics', module: 'statistics' },
  { prefix: '/notifications', module: 'notifications' },
  { prefix: '/integrations', module: 'driver_integrations' },
  { prefix: '/settings', module: 'settings' },
  { prefix: '/profile', module: 'profile' },
  { prefix: '/wall', module: 'wall' },
  { prefix: '/updates', module: 'updates' },
  { prefix: '/events', module: 'events' },
];

export const ROLE_SYNC_EVENT = 'zd:role-updated';

export function normalizeRole(role: string | null | undefined): AppRole {
  if (!role) return 'visiteur';
  const key = role.trim().toLowerCase();
  return RAW_TO_APP_ROLE[key] ?? 'visiteur';
}

export function toAssignableRole(role: string | null | undefined): AppRole {
  return normalizeRole(role);
}

export function getRoleLabel(role: string | null | undefined): string {
  return getRoleBadge(role).label;
}

export function getRoleColor(role: string | null | undefined): string {
  return getRoleBadge(role).className;
}

export function getRoleBadge(role: string | null | undefined): RoleBadgeConfig {
  if (!role) return BADGE.visiteur;
  if (role in LEGACY_BADGE) return LEGACY_BADGE[role];
  return BADGE[normalizeRole(role)];
}

export function shouldShowRoleOnWall(role: string | null | undefined): boolean {
  return getRoleBadge(role).showOnWall;
}

export function pathnameToModule(pathname: string): ModuleKey | null {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const sorted = [...ROUTE_MODULE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of sorted) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.module;
    }
  }
  return null;
}

export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  const moduleKey = pathnameToModule(pathname);
  if (!moduleKey) return true;
  return canAccessModule(role, moduleKey);
}

export function canAccessModule(role: string | null | undefined, _moduleKey: ModuleKey): boolean {
  void _moduleKey;
  void role;
  return true;
}

export function getRoleRedirect(role: string | null | undefined): string {
  if (role === 'banni') return '/suspended';
  if (role === 'ancien_membre') return '/departed';
  const appRole = normalizeRole(role);
  if (appRole === 'visiteur') return '/wall';
  return '/dashboard';
}

export function dispatchRoleUpdated(profile: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROLE_SYNC_EVENT, { detail: profile }));
  }
}

export function roleMatchesVisible(roles: string[], userRole: string | null | undefined): boolean {
  const appRole = normalizeRole(userRole);
  return roles.some(r => normalizeRole(r) === appRole || r === userRole);
}
