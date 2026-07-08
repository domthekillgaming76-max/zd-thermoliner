import { isAdministratorEmail } from './admin';
import { isCanonicalVisitor } from './roles';

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

/** Page notifications — tous les membres internes ; visiteurs via la cloche uniquement. */
export function canAccessNotificationsPage(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  if (isCanonicalVisitor(role)) return false;
  if (role === 'banni' || role === 'ancien_membre') return false;
  return true;
}

export function isDispatcherOnlyRole(role: string | null | undefined): boolean {
  return DISPATCHER_ROLES.has(role ?? '');
}

export function canDispatcherAccessPage(page: string): boolean {
  return DISPATCHER_ALLOWED_PAGES.has(page);
}

export function canViewAllOps(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return ['pdg', 'patron', 'admin', 'directeur'].includes(role ?? '');
}
