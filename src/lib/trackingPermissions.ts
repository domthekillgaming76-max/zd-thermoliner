import { isAdministratorEmail } from './admin';
import { canAccessSalon, canUseCapability, isFlotteRole } from './accessService';

export function canAccessTracking(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canAccessSalon({ role, email, moduleOrPage: 'gps_tracking' });
}

export function canViewAllTracking(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'view_all_tracking');
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
  return isFlotteRole(role);
}
