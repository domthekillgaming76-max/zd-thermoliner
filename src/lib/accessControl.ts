/**

 * Contrôle d'accès pages — délègue à accessService (politique unifiée).

 */

export {

  VISITOR_RESTRICTED_MESSAGE,

  SUSPENDED_MESSAGE,

  isSuspendedAccount,

  isVisitorRole,

  isFlotteRole,

  isAdminRole,

  isRecruitRole,

  canAccessSalon,

  canAccessPath,

  canUseCapability,

  getDefaultLandingPath,

} from './accessService';



import {

  canAccessSalon,

  getAccessDeniedReason as resolveDeniedReason,

  getDefaultLandingPath,

  isFlotteRole,

  isSuspendedAccount,

  SUSPENDED_MESSAGE,

} from './accessService';

import type { RoomPermission } from './roomTypes';



/** @deprecated Utiliser isFlotteRole */

export function isDriverRole(role: string | null | undefined): boolean {

  return isFlotteRole(role);

}



export const VISITOR_ALLOWED_PAGES = new Set([

  'wall',

  'recruitment',

  'recruitment_applications',

  'profile',

  'settings',

]);



export const VISITOR_DENIED_PAGES = new Set([

  'dashboard',

  'bank',

  'finance',

  'invoices',

  'accounting',

  'economy',

  'salaries',

  'road_sheets',

  'administration',

  'salons_admin',

  'admin_integrations',

  'dispatch',

  'drivers',

  'fleet',

  'garages',

  'clients',

  'maintenance',

  'reports',

  'assistant',

  'documents',

  'tracking',

  'freight_market',

  'fleet_map',

  'statistics',

  'driver_portal',

  'updates',

  'events',

  'training_center',

  'recruitment_admin',

]);



export const SUSPENDED_ALLOWED_PAGES = new Set(['profile', 'settings']);



export interface AccessCheckOptions {

  email?: string | null;

  isActive?: boolean | null;

  isSuspended?: boolean | null;

  rooms?: RoomPermission[];

}



function toInput(

  role: string | null | undefined,

  page: string,

  options?: AccessCheckOptions,

) {

  return {

    role,

    email: options?.email,

    moduleOrPage: page,

    isActive: options?.isActive,

    isSuspended: options?.isSuspended,

    rooms: options?.rooms,

  };

}



export function canAccessDashboard(

  role: string | null | undefined,

  options?: AccessCheckOptions,

): boolean {

  return canAccessSalon({ ...toInput(role, 'dashboard', options) });

}



export function getAccessDeniedRedirect(

  role: string | null | undefined,

  _page?: string,

): string {

  return getDefaultLandingPath(role);

}



export function canAccessPage(

  role: string | null | undefined,

  page: string,

  options?: AccessCheckOptions,

): boolean {

  return canAccessSalon(toInput(role, page, options));

}



export function getPostLoginPath(role: string | null | undefined): string {

  return getDefaultLandingPath(role);

}



export function getAccessDeniedReason(

  role: string | null | undefined,

  page: string,

  options?: AccessCheckOptions,

): string {

  if (isSuspendedAccount(role, options?.isActive, options?.isSuspended)) {

    return SUSPENDED_MESSAGE;

  }

  return resolveDeniedReason(toInput(role, page, options));

}


