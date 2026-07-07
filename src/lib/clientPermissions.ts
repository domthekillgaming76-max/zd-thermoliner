import { isAdministratorEmail } from './admin';
import { canManageDrivers } from './driverPermissions';

const MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'manager', 'dispatcher']);

export function canManageClients(profileRole: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  if (canManageDrivers(profileRole, email)) return true;
  return MANAGER_ROLES.has(profileRole ?? '');
}

export function canViewClientInvoices(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageClients(profileRole, email);
}

export function canMarkInvoicePaid(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageClients(profileRole, email);
}

export function canExportInvoicePdf(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageClients(profileRole, email);
}
