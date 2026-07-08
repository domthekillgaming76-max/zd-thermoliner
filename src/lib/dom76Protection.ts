import { ADMIN_EMAIL, isAdministratorEmail } from './admin';

export { ADMIN_EMAIL, isAdministratorEmail };

export function isDom76Protected(email: string | null | undefined): boolean {
  return isAdministratorEmail(email);
}

export type Dom76BlockedAction =
  | 'downgrade_role'
  | 'suspend'
  | 'delete'
  | 'remove_permissions'
  | 'ban'
  | 'fire'
  | 'reset_theme';

export function canModifyProtectedUser(
  targetEmail: string | null | undefined,
  action: Dom76BlockedAction,
): { allowed: boolean; reason?: string } {
  if (!isDom76Protected(targetEmail)) return { allowed: true };
  return {
    allowed: false,
    reason: `Action "${action}" interdite sur le compte propriétaire DOM76 (${ADMIN_EMAIL}).`,
  };
}

export function assertCanAssignRole(
  targetEmail: string | null | undefined,
  newRole: string,
): void {
  if (!isDom76Protected(targetEmail)) return;
  if (!['pdg', 'patron', 'admin'].includes(newRole)) {
    throw new Error(
      `Impossible d'assigner le rôle « ${newRole} » au compte propriétaire DOM76 (${ADMIN_EMAIL}). Rôles administrateur uniquement.`,
    );
  }
}

export function assertCanModifyUser(targetEmail: string | null | undefined, action: Dom76BlockedAction): void {
  const check = canModifyProtectedUser(targetEmail, action);
  if (!check.allowed) throw new Error(check.reason ?? 'Compte DOM76 protégé.');
}

export function filterAssignableRoles(
  roles: string[],
  targetEmail: string | null | undefined,
): string[] {
  if (!isDom76Protected(targetEmail)) return roles;
  return roles.filter(r => ['pdg', 'patron', 'admin'].includes(r));
}
