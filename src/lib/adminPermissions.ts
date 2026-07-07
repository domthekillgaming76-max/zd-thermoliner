import { isAdministratorEmail } from './admin';
import type { AdminRoleCategory, PermissionKey } from './adminTypes';
import { PERMISSION_KEYS, roleToCategory } from './adminTypes';

const ADMIN_ROLES = new Set(['pdg', 'patron', 'admin']);

export function canAccessAdministration(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return ADMIN_ROLES.has(role ?? '');
}

export function canManageUsers(role: string | null | undefined, email?: string | null): boolean {
  return canAccessAdministration(role, email);
}

const DEFAULT_PERMISSIONS: Record<AdminRoleCategory, PermissionKey[]> = {
  visitor: [],
  recruit: [],
  driver: [],
  dispatcher: ['can_view_dashboard', 'can_manage_drivers'],
  fleet_manager: [
    'can_view_dashboard',
    'can_manage_drivers',
    'can_manage_fleet',
    'can_validate_road_sheets',
    'can_manage_reports',
  ],
  manager: [
    'can_view_dashboard',
    'can_manage_drivers',
    'can_manage_fleet',
    'can_manage_bank',
    'can_validate_road_sheets',
    'can_manage_recruitment',
    'can_manage_reports',
  ],
  admin: [
    'can_view_dashboard',
    'can_manage_drivers',
    'can_manage_fleet',
    'can_manage_bank',
    'can_validate_road_sheets',
    'can_manage_recruitment',
    'can_manage_reports',
    'can_manage_admin',
  ],
};

export function getDefaultPermissionsForRole(role: string): PermissionKey[] {
  if (isAdministratorEmail(role)) return DEFAULT_PERMISSIONS.admin;
  return DEFAULT_PERMISSIONS[roleToCategory(role)] ?? [];
}

export function resolveUserPermissions(
  role: string,
  overrides: { permission_key: PermissionKey; granted: boolean }[],
  email?: string | null,
): Record<PermissionKey, boolean> {
  const defaults = getDefaultPermissionsForRole(isAdministratorEmail(email) ? 'admin' : role);
  const result = {} as Record<PermissionKey, boolean>;

  for (const key of PERMISSION_KEYS) {
    result[key] = defaults.includes(key);
  }

  for (const o of overrides) {
    result[o.permission_key] = o.granted;
  }

  if (isAdministratorEmail(email)) {
    for (const key of PERMISSION_KEYS) {
      result[key] = true;
    }
  }

  return result;
}

export function hasPermission(
  role: string,
  permission: PermissionKey,
  overrides: { permission_key: PermissionKey; granted: boolean }[] = [],
  email?: string | null,
): boolean {
  const perms = resolveUserPermissions(role, overrides, email);
  return perms[permission] ?? false;
}
