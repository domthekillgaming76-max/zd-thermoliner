import { canUseCapability } from './accessService';

export function canManageUpdates(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_updates');
}
