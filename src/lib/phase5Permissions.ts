import { isAdministratorEmail } from './admin';

import { canUseCapability } from './accessService';

import { normalizeRole } from './roleEngine';



export function canAccessFleetMap(role: string | null | undefined, email?: string | null): boolean {

  return canUseCapability(role, email, 'manage_ops');

}



export function canAccessStatistics(role: string | null | undefined, email?: string | null): boolean {

  return canUseCapability(role, email, 'manage_ops');

}



export function canUseDispatchAi(role: string | null | undefined, email?: string | null): boolean {

  return canUseCapability(role, email, 'manage_ops');

}



export function canAccessLiveOps(role: string | null | undefined, email?: string | null): boolean {

  return canAccessFleetMap(role, email);

}



export function canAccessNotificationsPage(role: string | null | undefined, email?: string | null): boolean {

  if (isAdministratorEmail(email)) return true;

  const norm = normalizeRole(role);

  if (norm === 'visiteur') return false;

  if (role === 'banni' || role === 'ancien_membre') return false;

  return true;

}



export function isDispatcherOnlyRole(_role: string | null | undefined): boolean {

  return false;

}



export function canDispatcherAccessPage(_page: string): boolean {

  return true;

}



export function canViewAllOps(role: string | null | undefined, email?: string | null): boolean {

  return canUseCapability(role, email, 'manage_admin');

}


