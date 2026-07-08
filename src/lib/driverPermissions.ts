import { isAdministratorEmail } from './admin';
import { isCanonicalAdmin, isCanonicalDriver } from './roles';

const DRIVER_PROFILE_ROLES = new Set(['chauffeur', 'driver', 'member', 'tractionnaire']);

export function isDriverProfileRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return isCanonicalDriver(role) || DRIVER_PROFILE_ROLES.has(role);
}

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

export interface HrFolderViewContext {
  viewerRole?: string | null;
  viewerEmail?: string | null;
  viewerUserId?: string | null;
  driverUserId?: string | null;
  /** True on /profile, /driver — viewer consulte son propre espace */
  isOwnProfileContext?: boolean;
  /** Bypass explicite admin (DOM76, isAdministrator AuthContext) */
  isAdministrator?: boolean;
}

/**
 * Détermine si DriverHrFolder doit être visible.
 * - Admin / DOM76 : toujours true
 * - Chauffeur : true sur son propre profil (user_id match ou contexte own)
 */
export function canViewHrFolder(ctx: HrFolderViewContext): boolean {
  const {
    viewerRole,
    viewerEmail,
    viewerUserId,
    driverUserId,
    isOwnProfileContext,
    isAdministrator,
  } = ctx;

  if (isAdministrator) return true;
  if (isAdministratorEmail(viewerEmail)) return true;
  if (canManageDrivers(viewerRole, viewerEmail)) return true;
  if (isHrManager(viewerRole)) return true;
  if (isCanonicalAdmin(viewerRole)) return true;

  if (viewerUserId && driverUserId && viewerUserId === driverUserId) return true;

  if (isOwnProfileContext && isDriverProfileRole(viewerRole)) return true;

  return false;
}

/** Visible on Mon profil / portail chauffeur */
export function canViewOwnHrFolderOnProfile(
  profileRole: string | null | undefined,
  email: string | null | undefined,
  hasDriverRecord?: boolean,
  isAdministrator?: boolean,
): boolean {
  if (
    canViewHrFolder({
      viewerRole: profileRole,
      viewerEmail: email,
      isOwnProfileContext: true,
      isAdministrator,
    })
  ) {
    return true;
  }
  if (hasDriverRecord) return true;
  return false;
}

export function canViewDriverHrDossier(
  profileRole: string | null | undefined,
  email: string | null | undefined,
  currentUserId: string | null | undefined,
  driverUserId: string | null | undefined,
  options?: { isOwnProfilePage?: boolean; hasDriverRecord?: boolean; isAdministrator?: boolean },
): boolean {
  return canViewHrFolder({
    viewerRole: profileRole,
    viewerEmail: email,
    viewerUserId: currentUserId,
    driverUserId,
    isOwnProfileContext: options?.isOwnProfilePage,
    isAdministrator: options?.isAdministrator,
  }) || Boolean(options?.hasDriverRecord && isDriverProfileRole(profileRole));
}

export function canManageDriverHr(profileRole: string | null | undefined, email?: string | null): boolean {
  return canManageDrivers(profileRole, email);
}
