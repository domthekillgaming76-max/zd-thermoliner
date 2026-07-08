import { isAdministratorEmail } from './admin';
import { canAccessAdministration } from './adminPermissions';
import { canAccessDriverPortal } from './driverPortalPermissions';
import { canAccessVault } from './vaultPermissions';
import { canAccessTracking } from './trackingPermissions';
import { canAccessFreightMarket } from './freightPermissions';
import { canAccessTrainingCenter } from './trainingPermissions';
import { canAccessFinanceModule, canAccessSalariesPage } from './financePermissions';
import { canAccessBank } from './bankPermissions';
import {
  canAccessFleetMap,
  canAccessStatistics,
  canAccessNotificationsPage,
  isDispatcherOnlyRole,
  canDispatcherAccessPage,
} from './phase5Permissions';
import { canAccessWall } from './wallPermissions';
import { isCanonicalDriver, isCanonicalRecruit, isCanonicalVisitor } from './roles';

export const VISITOR_RESTRICTED_MESSAGE =
  'Accès réservé aux membres Z&D Thermoliner.';

export const SUSPENDED_MESSAGE =
  'Votre compte est suspendu. Contactez l\'administration.';

export const VISITOR_ALLOWED_PAGES = new Set([
  'wall',
  'recruitment',
  'recruitment_applications',
  'profile',
]);

/** Pages ERP explicitement interdites aux visiteurs */
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
  'settings',
  'training_center',
]);

export const RECRUIT_ALLOWED_PAGES = new Set([
  ...VISITOR_ALLOWED_PAGES,
]);

export const DRIVER_ALLOWED_PAGES = new Set([
  'dashboard',
  'wall',
  'profile',
  'road_sheets',
  'freight_market',
]);

export const SUSPENDED_ALLOWED_PAGES = new Set(['profile', 'settings']);

const ADMIN_ONLY_PAGES = new Set(['administration']);

/** Tableau de bord : tous les rôles internes connectés, sauf visiteur. */
export function canAccessDashboard(
  role: string | null | undefined,
  options?: AccessCheckOptions,
): boolean {
  if (options?.email && isAdministratorEmail(options.email)) return true;

  if (isSuspendedAccount(role, options?.isActive, options?.isSuspended)) {
    return false;
  }

  if (role === 'ancien_membre' || role === 'banni' || role === 'candidat') {
    return false;
  }

  if (isVisitorRole(role)) return false;

  return true;
}

export function getAccessDeniedRedirect(
  role: string | null | undefined,
  _page?: string,
): string {
  if (isVisitorRole(role)) return '/wall';
  if (role === 'candidat') return '/join';
  if (role === 'banni') return '/suspended';
  if (role === 'ancien_membre') return '/departed';
  return '/dashboard';
}

export function isVisitorRole(role: string | null | undefined): boolean {
  return isCanonicalVisitor(role);
}

export function isRecruitRole(role: string | null | undefined): boolean {
  return isCanonicalRecruit(role);
}

export function isDriverRole(role: string | null | undefined): boolean {
  return isCanonicalDriver(role);
}

export function isSuspendedAccount(
  role: string | null | undefined,
  isActive?: boolean | null,
  isSuspended?: boolean | null,
): boolean {
  if (role === 'banni') return true;
  if (isSuspended) return true;
  if (isActive === false && role !== 'ancien_membre') return true;
  return false;
}

export interface AccessCheckOptions {
  email?: string | null;
  isActive?: boolean | null;
  isSuspended?: boolean | null;
}

export function canAccessPage(
  role: string | null | undefined,
  page: string,
  options?: AccessCheckOptions,
): boolean {
  if (options?.email && isAdministratorEmail(options.email)) return true;

  if (isSuspendedAccount(role, options?.isActive, options?.isSuspended)) {
    return SUSPENDED_ALLOWED_PAGES.has(page);
  }

  if (role === 'ancien_membre') {
    return ['profile', 'settings', 'wall'].includes(page);
  }

  if (ADMIN_ONLY_PAGES.has(page)) {
    return canAccessAdministration(role, options?.email);
  }

  if (page === 'driver_portal') {
    return canAccessDriverPortal(role, options?.email);
  }

  if (page === 'documents') {
    return canAccessVault(role, options?.email);
  }

  if (page === 'tracking') {
    return canAccessTracking(role, options?.email);
  }

  if (page === 'freight_market') {
    return canAccessFreightMarket(role, options?.email);
  }

  if (page === 'training_center') {
    return canAccessTrainingCenter(role, options?.email);
  }

  if (page === 'salaries') {
    return canAccessSalariesPage(role, options?.email);
  }

  if (page === 'dashboard') {
    return canAccessDashboard(role, options);
  }

  if (page === 'bank') {
    return canAccessBank(role, options?.email);
  }

  if (page === 'finance' || page === 'invoices' || page === 'accounting' || page === 'economy') {
    return canAccessFinanceModule(role, options?.email);
  }

  if (page === 'fleet_map') {
    return canAccessFleetMap(role, options?.email);
  }

  if (page === 'statistics') {
    return canAccessStatistics(role, options?.email);
  }

  if (page === 'notifications') {
    return canAccessNotificationsPage(role, options?.email);
  }

  if (page === 'wall') {
    return canAccessWall(role, {
      isActive: options?.isActive,
      isSuspended: options?.isSuspended,
    });
  }

  if (isVisitorRole(role)) {
    if (VISITOR_DENIED_PAGES.has(page)) return false;
    return VISITOR_ALLOWED_PAGES.has(page);
  }

  if (isDispatcherOnlyRole(role) && !canDispatcherAccessPage(page)) {
    return false;
  }

  if (isRecruitRole(role)) {
    return RECRUIT_ALLOWED_PAGES.has(page);
  }

  if (isDriverRole(role)) {
    return DRIVER_ALLOWED_PAGES.has(page);
  }

  return true;
}

export function getPostLoginPath(role: string | null | undefined): string {
  if (isVisitorRole(role)) return '/wall';
  if (role === 'candidat') return '/recruitment';
  if (isDriverRole(role)) return '/driver';
  return '/dashboard';
}

export function getAccessDeniedReason(
  role: string | null | undefined,
  page: string,
  options?: AccessCheckOptions,
): string {
  if (isSuspendedAccount(role, options?.isActive, options?.isSuspended)) {
    return SUSPENDED_MESSAGE;
  }
  if (ADMIN_ONLY_PAGES.has(page)) {
    return 'Accès réservé aux administrateurs.';
  }
  if (page === 'bank') {
    return 'Accès réservé au rôle administrateur.';
  }
  if (page === 'dashboard') {
    return 'Le tableau de bord est réservé aux membres internes.';
  }
  if (isVisitorRole(role)) return VISITOR_RESTRICTED_MESSAGE;
  if (isDriverRole(role)) return 'Accès réservé — chauffeurs: mur, profil, feuilles de route et missions.';
  return VISITOR_RESTRICTED_MESSAGE;
}
