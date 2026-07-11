import { isAdministratorEmail } from './admin';
import { canAccessSalon, canUseCapability, isFlotteRole } from './accessService';

export function canAccessVault(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canAccessSalon({ role, email, moduleOrPage: 'documents' });
}

export function canManageVaultDocuments(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_ops');
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
  return isFlotteRole(role);
}
