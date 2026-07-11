import { canUseCapability } from './accessService';

export function canAccessReports(role: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(role, email, 'manage_ops');
}

export function canExportReports(role: string | null | undefined, email?: string | null): boolean {
  return canAccessReports(role, email);
}
