import { isAdministratorEmail } from './admin';
import { canUseCapability, isFlotteRole } from './accessService';

export function canAccessFreightMarket(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_ops');
}

export function canManageFreightOffers(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_ops');
}

export function canAdminFreightOffers(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_admin');
}

export function isFreightDriverUser(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return false;
  return isFlotteRole(role);
}
