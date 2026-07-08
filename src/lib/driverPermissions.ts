import { isAdministratorEmail } from './admin';

export function canManageDrivers(profileRole: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return profileRole === 'pdg' || profileRole === 'patron' || profileRole === 'admin' || profileRole === 'directeur';
}

export function canAssignVehicles(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageDrivers(profileRole, email);
}

export function canApproveDocuments(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageDrivers(profileRole, email);
}

export function isHrManager(profileRole: string | null | undefined): boolean {
  return profileRole === 'hr' || profileRole === 'directeur';
}

export function canViewDriverHrDossier(
  profileRole: string | null | undefined,
  email: string | null | undefined,
  currentUserId: string | null | undefined,
  driverUserId: string | null | undefined,
): boolean {
  if (canManageDrivers(profileRole, email)) return true;
  if (isHrManager(profileRole)) return true;
  if (currentUserId && driverUserId && currentUserId === driverUserId) return true;
  return false;
}

export function canManageDriverHr(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageDrivers(profileRole, email);
}
