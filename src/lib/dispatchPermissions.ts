import { canUseCapability } from './accessService';

export function canManageDispatch(profileRole: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(profileRole, email, 'manage_ops');
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
