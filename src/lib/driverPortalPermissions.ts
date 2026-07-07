import { isAdministratorEmail } from './admin';
import { isDriverRole, isVisitorRole } from './accessControl';

export function canAccessDriverPortal(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isVisitorRole(role)) return false;
  if (isAdministratorEmail(email)) return true;
  return isDriverRole(role) || ['pdg', 'patron', 'directeur', 'dispatcher', 'admin'].includes(role ?? '');
}

export function canViewAllDriverPortalActivity(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return isAdministratorEmail(email) || ['pdg', 'patron', 'admin', 'directeur'].includes(role ?? '');
}

export function isDriverPortalUser(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return false;
  return isDriverRole(role);
}
