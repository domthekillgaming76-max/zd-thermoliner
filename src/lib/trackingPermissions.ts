import { isAdministratorEmail } from './admin';
import { isDriverRole, isVisitorRole } from './accessControl';

const TRACKING_MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

export function canAccessTracking(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isVisitorRole(role)) return false;
  if (isAdministratorEmail(email)) return true;
  return isDriverRole(role) || TRACKING_MANAGER_ROLES.has(role ?? '');
}

export function canViewAllTracking(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return TRACKING_MANAGER_ROLES.has(role ?? '');
}

export function canUpdateGpsPosition(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canViewAllTracking(role, email);
}

export function isTrackingDriverUser(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return false;
  return isDriverRole(role);
}
