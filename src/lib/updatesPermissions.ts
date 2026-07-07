import { isAdministratorEmail } from './admin';

const UPDATE_MANAGER_ROLES = new Set(['pdg', 'patron', 'admin']);

export function canManageUpdates(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return UPDATE_MANAGER_ROLES.has(role ?? '');
}
