import { isAdministratorEmail } from './admin';

const OPS_MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher', 'manager', 'fleet_manager']);

const DISPATCHER_ROLES = new Set(['dispatcher']);

const DISPATCHER_ALLOWED_PAGES = new Set([
  'dashboard',
  'dispatch',
  'fleet_map',
  'freight_market',
  'road_sheets',
  'tracking',
  'wall',
  'updates',
  'events',
  'profile',
  'settings',
  'notifications',
  'training_center',
]);

export function canAccessFleetMap(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  if (OPS_MANAGER_ROLES.has(role ?? '')) return true;
  return false;
}

export function canAccessStatistics(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return OPS_MANAGER_ROLES.has(role ?? '');
}

export function canUseDispatchAi(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return OPS_MANAGER_ROLES.has(role ?? '');
}

export function canAccessLiveOps(role: string | null | undefined, email?: string | null): boolean {
  return canAccessFleetMap(role, email);
}

export function canAccessNotificationsPage(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  if (isVisitorRole(role)) return false;
  if (role === 'candidat' || role === 'banni' || role === 'ancien_membre') return false;
  return true;
}

export function isDispatcherOnlyRole(role: string | null | undefined): boolean {
  return DISPATCHER_ROLES.has(role ?? '');
}

export function canDispatcherAccessPage(page: string): boolean {
  return DISPATCHER_ALLOWED_PAGES.has(page);
}

function isVisitorRole(role: string | null | undefined): boolean {
  return role === 'visitor' || role === 'visiteur';
}

export function canViewAllOps(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return ['pdg', 'patron', 'admin', 'directeur'].includes(role ?? '');
}
