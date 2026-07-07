import { isAdministratorEmail } from './admin';

const DISPATCH_MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

export function canManageDispatch(profileRole: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return DISPATCH_MANAGER_ROLES.has(profileRole ?? '');
}

export function canViewAllMissions(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageDispatch(profileRole, email);
}

export function canMarkMissionDelivered(
  profileRole: string | null | undefined,
  email: string | null | undefined,
  missionDriverId: string | null,
  linkedDriverIds: string[],
): boolean {
  if (canManageDispatch(profileRole, email)) return true;
  if (!missionDriverId) return false;
  return linkedDriverIds.includes(missionDriverId);
}
