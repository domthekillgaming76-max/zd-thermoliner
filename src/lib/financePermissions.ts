import { canUseCapability } from './accessService';

export function canManageFinance(role: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(role, email, 'manage_finance');
}

export function canAccessFinanceModule(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email);
}

export function canAccessSalariesPage(role: string | null | undefined, email?: string | null): boolean {
  return canManageFinance(role, email);
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
  return canManageFinance(role, email);
}
