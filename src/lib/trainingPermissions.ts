import { isAdministratorEmail } from './admin';
import { canAccessSalon, canUseCapability, isFlotteRole } from './accessService';

export function canAccessTrainingCenter(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canAccessSalon({ role, email, moduleOrPage: 'training_center' });
}

export function canViewPublicRules(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canAccessTrainingCenter(role, email);
}

export function canAccessOnboarding(
  role: string | null | undefined,
  email?: string | null,
  applicationStatus?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  if (applicationStatus === 'pending' || applicationStatus === 'approved') return true;
  return isFlotteRole(role);
}

export function canAccessDriverTraining(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return isFlotteRole(role) || canUseCapability(role, email, 'manage_ops');
}

export function canManageTraining(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  return canUseCapability(role, email, 'manage_training');
}
