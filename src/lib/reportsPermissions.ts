import { isAdministratorEmail } from './admin';

const MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

export function canAccessReports(role: string | null | undefined, email?: string | null): boolean {
  return isAdministratorEmail(email) || MANAGER_ROLES.has(role ?? '');
}

export function canExportReports(role: string | null | undefined, email?: string | null): boolean {
  return canAccessReports(role, email);
}
