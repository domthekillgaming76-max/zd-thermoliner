import { isAdministratorEmail } from './admin';
import { isDriverRole, isVisitorRole } from './accessControl';

export function canAccessVault(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isVisitorRole(role)) return false;
  if (isAdministratorEmail(email)) return true;
  return !isVisitorRole(role);
}

export function canManageVaultDocuments(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return isAdministratorEmail(email) || ['pdg', 'patron', 'admin', 'directeur'].includes(role ?? '');
}

export function canApproveVaultDocuments(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canManageVaultDocuments(role, email);
}

export function isVaultDriverUser(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return false;
  return isDriverRole(role);
}
