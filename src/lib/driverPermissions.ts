import { isAdministratorEmail } from './admin';

import { canUseCapability } from './accessService';

import { isCanonicalAdmin, isCanonicalFlotte } from './roles';

import { normalizeRole } from './roleEngine';



export function isDriverProfileRole(role: string | null | undefined): boolean {

  return isCanonicalFlotte(role);

}



export function canManageDrivers(profileRole: string | null | undefined, email?: string | null): boolean {

  if (isAdministratorEmail(email)) return true;

  return canUseCapability(profileRole, email, 'manage_ops');

}



export function canAssignVehicles(profileRole: string | null | undefined, email?: string | null): boolean {

  return canManageDrivers(profileRole, email);

}



export function canApproveDocuments(profileRole: string | null | undefined, email?: string | null): boolean {

  return canManageDrivers(profileRole, email);

}



export function isHrManager(profileRole: string | null | undefined): boolean {

  return normalizeRole(profileRole) === 'admin';

}



export interface HrFolderViewContext {

  viewerRole?: string | null;

  viewerEmail?: string | null;

  viewerUserId?: string | null;

  driverUserId?: string | null;

  isOwnProfileContext?: boolean;

  isAdministrator?: boolean;

}



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


