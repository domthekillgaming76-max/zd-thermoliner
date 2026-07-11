import { canUseCapability } from './accessService';

export function canAccessBank(role: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(role, email, 'manage_finance');
}
