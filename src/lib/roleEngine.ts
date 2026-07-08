import {
  Crown, Shield, Truck, Users, Radio, Container, Calculator, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Canonical application roles */
export type AppRole =
  | 'visitor'
  | 'recruit'
  | 'driver'
  | 'dispatcher'
  | 'fleet_manager'
  | 'manager'
  | 'accountant'
  | 'admin';

export type ModuleKey =
  | 'wall'
  | 'profile'
  | 'recruitment'
  | 'recruitment_applications'
  | 'dashboard'
  | 'road_sheets'
  | 'freight_market'
  | 'dispatch'
  | 'gps_tracking'
  | 'fleet'
  | 'maintenance'
  | 'drivers'
  | 'reports'
  | 'finance'
  | 'invoices'
  | 'salaries'
  | 'accounting'
  | 'bank'
  | 'administration'
  | 'settings'
  | 'updates'
  | 'events'
  | 'training_center'
  | 'driver_portal'
  | 'documents'
  | 'notifications'
  | 'fleet_map'
  | 'statistics'
  | 'assistant'
  | 'garages'
  | 'clients'
  | 'join';

const RAW_TO_APP_ROLE: Record<string, AppRole> = {
  visitor: 'visitor',
  visiteur: 'visitor',
  candidat: 'recruit',
  recruit: 'recruit',
  recruitment: 'recruit',
  chauffeur: 'driver',
  driver: 'driver',
  member: 'driver',
  tractionnaire: 'driver',
  dispatcher: 'dispatcher',
  directeur: 'fleet_manager',
  fleet_manager: 'fleet_manager',
  patron: 'manager',
  manager: 'manager',
  accountant: 'accountant',
  comptable: 'accountant',
  pdg: 'admin',
  admin: 'admin',
  administrator: 'admin',
};

const COMMUNITY_MODULES: ModuleKey[] = ['wall', 'updates', 'events'];

export const ALL_MODULES: ModuleKey[] = [
  'wall', 'profile', 'recruitment', 'recruitment_applications', 'dashboard',
  'road_sheets', 'freight_market', 'dispatch', 'gps_tracking', 'fleet', 'maintenance',
  'drivers', 'reports', 'finance', 'invoices', 'salaries', 'accounting', 'bank',
  'administration', 'settings', 'updates', 'events', 'training_center', 'driver_portal',
  'documents', 'notifications', 'fleet_map', 'statistics', 'assistant', 'garages', 'clients', 'join',
];

const ROLE_MODULES: Record<AppRole, readonly ModuleKey[]> = {
  visitor: ['wall', 'profile', 'recruitment', 'recruitment_applications'],
  recruit: ['wall', 'profile', 'recruitment', 'recruitment_applications', 'join'],
  driver: ['dashboard', 'wall', 'profile', 'road_sheets', 'freight_market', 'driver_portal'],
  dispatcher: ['dashboard', 'wall', 'profile', 'dispatch', 'freight_market', 'road_sheets', 'gps_tracking'],
  fleet_manager: [
    'dashboard', ...COMMUNITY_MODULES, 'profile', 'fleet', 'maintenance', 'gps_tracking',
    'fleet_map', 'statistics', 'garages', 'reports', 'settings',
  ],
  manager: ['dashboard', 'wall', 'profile', 'drivers', 'fleet', 'reports', 'freight_market'],
  accountant: ['dashboard', 'wall', 'profile', 'finance', 'invoices', 'salaries'],
  admin: ALL_MODULES,
};

export interface RoleBadgeConfig {
  label: string;
  className: string;
  icon: LucideIcon;
  showOnWall: boolean;
}

const BADGE: Record<AppRole, RoleBadgeConfig> = {
  admin: {
    label: 'Administrateur',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Crown,
    showOnWall: true,
  },
  manager: {
    label: 'Manager',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: Users,
    showOnWall: true,
  },
  dispatcher: {
    label: 'Dispatch',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Radio,
    showOnWall: true,
  },
  fleet_manager: {
    label: 'Flotte',
    className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: Container,
    showOnWall: true,
  },
  accountant: {
    label: 'Comptable',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Calculator,
    showOnWall: true,
  },
  driver: {
    label: 'Chauffeur',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: Truck,
    showOnWall: true,
  },
  recruit: {
    label: 'Recrue',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    icon: User,
    showOnWall: true,
  },
  visitor: {
    label: 'Visiteur',
    className: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    icon: User,
    showOnWall: true,
  },
};

const LEGACY_BADGE: Record<string, RoleBadgeConfig> = {
  ancien_membre: {
    label: 'Ancien membre',
    className: 'bg-white/5 text-white/25 border-white/8',
    icon: User,
    showOnWall: false,
  },
  banni: {
    label: 'Banni',
    className: 'bg-red-500/15 text-red-400 border-red-500/25',
    icon: Shield,
    showOnWall: false,
  },
};

/** Route prefix → module (longest match wins) */
export const ROUTE_MODULE_RULES: { prefix: string; module: ModuleKey }[] = [
  { prefix: '/recruitment/applications', module: 'recruitment_applications' },
  { prefix: '/recruitment/admin', module: 'recruitment' },
  { prefix: '/recruitment', module: 'recruitment' },
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
  { prefix: '/administration', module: 'administration' },
  { prefix: '/settings', module: 'settings' },
  { prefix: '/profile', module: 'profile' },
  { prefix: '/wall', module: 'wall' },
  { prefix: '/updates', module: 'updates' },
  { prefix: '/events', module: 'events' },
  { prefix: '/join', module: 'join' },
];

export const ROLE_SYNC_EVENT = 'zd:role-updated';

export function normalizeRole(role: string | null | undefined): AppRole {
  if (!role) return 'visitor';
  return RAW_TO_APP_ROLE[role] ?? 'visitor';
}

export function getRoleLabel(role: string | null | undefined): string {
  return getRoleBadge(role).label;
}

export function getRoleColor(role: string | null | undefined): string {
  return getRoleBadge(role).className;
}

export function getRoleBadge(role: string | null | undefined): RoleBadgeConfig {
  if (!role) return BADGE.visitor;
  if (role in LEGACY_BADGE) return LEGACY_BADGE[role];
  const appRole = normalizeRole(role);
  return BADGE[appRole];
}

export function shouldShowRoleOnWall(role: string | null | undefined): boolean {
  return getRoleBadge(role).showOnWall;
}

export function getAllowedModules(role: string | null | undefined): ModuleKey[] {
  const appRole = normalizeRole(role);
  return Array.from(new Set<ModuleKey>(ROLE_MODULES[appRole]));
}

export function canAccessModule(role: string | null | undefined, moduleKey: ModuleKey): boolean {
  const appRole = normalizeRole(role);

  if (moduleKey === 'bank' || moduleKey === 'administration') {
    return appRole === 'admin';
  }

  if (moduleKey === 'dashboard') {
    return appRole !== 'visitor' && appRole !== 'recruit';
  }

  if (moduleKey === 'wall' || moduleKey === 'profile') {
    return true;
  }

  return getAllowedModules(role).includes(moduleKey);
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

export function getRoleRedirect(role: string | null | undefined): string {
  const appRole = normalizeRole(role);
  if (appRole === 'visitor') return '/wall';
  if (appRole === 'recruit') return '/recruitment';
  return '/dashboard';
}

export function logRoleSync(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[Z&D RoleSync] ${message}`, detail);
  } else {
    console.log(`[Z&D RoleSync] ${message}`);
  }
}

export function logRoleSyncNormalized(role: string | null | undefined): void {
  logRoleSync('normalized role', normalizeRole(role));
}

export function dispatchRoleUpdated(profile: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROLE_SYNC_EVENT, { detail: profile }));
  }
}
