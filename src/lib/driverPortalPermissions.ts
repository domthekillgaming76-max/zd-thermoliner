import { isAdministratorEmail } from './admin';
import { canAccessSalon, canUseCapability, isFlotteRole } from './accessService';

export function canAccessDriverPortal(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canAccessSalon({ role, email, moduleOrPage: 'driver_portal' });
}

export function canViewAllDriverPortalActivity(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_ops');
}

export function isDriverPortalUser(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return false;
  return isFlotteRole(role);
}
