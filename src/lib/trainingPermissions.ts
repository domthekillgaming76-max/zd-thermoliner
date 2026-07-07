import { isAdministratorEmail } from './admin';
import { isDriverRole, isRecruitRole, isVisitorRole } from './accessControl';

const TRAINING_MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

export function canAccessTrainingCenter(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  if (isVisitorRole(role)) return true;
  if (isRecruitRole(role)) return true;
  if (isDriverRole(role)) return true;
  if (TRAINING_MANAGER_ROLES.has(role ?? '')) return true;
  if (role === 'ancien_membre') return false;
  return true;
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
  if (isRecruitRole(role)) return true;
  if (applicationStatus === 'pending' || applicationStatus === 'approved') return true;
  return isDriverRole(role);
}

export function canAccessDriverTraining(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return isDriverRole(role) || TRAINING_MANAGER_ROLES.has(role ?? '');
}

export function canManageTraining(
  role: string | null | undefined,
  email?: string | null,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return TRAINING_MANAGER_ROLES.has(role ?? '');
}
