import { isAdministratorEmail } from './admin';
import { isDriverRole, isRecruitRole, isVisitorRole } from './accessControl';

const FREIGHT_MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

export function canAccessFreightMarket(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isVisitorRole(role) || isRecruitRole(role)) return false;
  if (isAdministratorEmail(email)) return true;
  return true;
}

export function canManageFreightOffers(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return FREIGHT_MANAGER_ROLES.has(role ?? '');
}

export function isFreightDriverUser(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return false;
  return isDriverRole(role);
}
