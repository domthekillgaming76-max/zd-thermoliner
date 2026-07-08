import { isAdministratorEmail } from './admin';
import { canAccessModule as roleEngineCanAccess } from './roleEngine';
import { normalizeRole, type ModuleKey } from './roleEngine';
import type { AppModuleRecord } from '../services/appModuleService';

export function roleMatchesAllowed(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return allowedRoles.includes('visitor') || allowedRoles.includes('visiteur');
  if (allowedRoles.length === 0) return true;
  const appRole = normalizeRole(userRole);
  return allowedRoles.some(r => r === userRole || normalizeRole(r) === appRole);
}

export function canAccessConfiguredModule(
  role: string | null | undefined,
  email: string | null | undefined,
  moduleKey: string,
  modules: AppModuleRecord[],
): boolean {
  if (isAdministratorEmail(email)) return true;

  const mod = modules.find(m => m.key === moduleKey);
  if (!mod) return roleEngineCanAccess(role, moduleKey as ModuleKey);

  if (!mod.enabled) return false;

  if (mod.admin_only && normalizeRole(role) !== 'admin') return false;

  if (mod.key === 'bank' || mod.key === 'administration') {
    return normalizeRole(role) === 'admin' || isAdministratorEmail(email);
  }

  if (!roleMatchesAllowed(role, mod.allowed_roles)) return false;

  return roleEngineCanAccess(role, moduleKey as ModuleKey);
}

export function isModuleEnabled(moduleKey: string, modules: AppModuleRecord[]): boolean {
  const mod = modules.find(m => m.key === moduleKey);
  if (!mod) return true;
  return mod.enabled;
}

export function isRouteEnabled(pathname: string, modules: AppModuleRecord[]): boolean {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const mod = modules.find(m => {
    const route = m.route.replace(/\/$/, '') || '/';
    return path === route || path.startsWith(`${route}/`);
  });
  if (!mod) return true;
  return mod.enabled;
}
