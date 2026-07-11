import { isAdministratorEmail } from './admin';
import { canManageDrivers } from './driverPermissions';
import { normalizeRole } from './roleEngine';

export function canManageClients(profileRole: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  if (canManageDrivers(profileRole, email)) return true;
  return normalizeRole(profileRole) === 'admin';
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
