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
