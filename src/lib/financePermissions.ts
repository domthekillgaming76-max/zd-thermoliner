import { isAdministratorEmail } from './admin';

const FINANCE_ADMIN_ROLES = new Set(['pdg', 'patron', 'admin']);

export function canManageFinance(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return FINANCE_ADMIN_ROLES.has(role ?? '');
}

export function canAccessFinanceModule(role: string | null | undefined, email?: string | null): boolean {
  if (canManageFinance(role, email)) return true;
  const managerRoles = new Set(['directeur', 'manager', 'dispatcher', 'fleet_manager']);
  return managerRoles.has(role ?? '');
}

export function canAccessSalariesPage(role: string | null | undefined, email?: string | null): boolean {
  if (canManageFinance(role, email)) return true;
  if (canAccessFinanceModule(role, email)) return true;
  return role === 'chauffeur' || role === 'tractionnaire';
}

export function canMarkInvoicePaid(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email);
}

export function canPayDriverSalary(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email);
}

export function canEditFinanceSettings(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email);
}

export function canExportAccounting(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email);
}

export function canViewAllSalaries(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email) || canAccessFinanceModule(role, email);
}
