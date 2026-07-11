import type { AppRole } from './roleEngine';

export {
  CANONICAL_ROLES,
  ASSIGNABLE_ROLES,
  toAssignableRole,
  normalizeRole,
} from './roleEngine';

export const ROLE_LABELS: Record<AppRole, string> = {
  visiteur: 'Visiteur',
  chauffeur: 'Chauffeur',
  admin: 'Admin',
};

/** Salons critiques : l'admin ne peut pas se retirer l'accès */
export const ADMIN_CRITICAL_ROOMS = [
  'administration',
  'roles_salons',
  'profile',
  'settings',
] as const;

export type AccessCapability =
  | 'view_dashboard'
  | 'manage_ops'
  | 'manage_finance'
  | 'manage_admin'
  | 'manage_recruitment'
  | 'manage_training'
  | 'manage_updates'
  | 'view_all_tracking'
  | 'moderate_wall';

const CAPABILITY_ROLES: Record<AccessCapability, readonly AppRole[]> = {
  view_dashboard: ['visiteur', 'chauffeur', 'admin'],
  manage_ops: ['chauffeur', 'admin'],
  manage_finance: ['admin'],
  manage_admin: ['admin'],
  manage_recruitment: ['admin'],
  manage_training: ['admin'],
  manage_updates: ['admin'],
  view_all_tracking: ['chauffeur', 'admin'],
  moderate_wall: ['chauffeur', 'admin'],
};

export function hasCapability(appRole: AppRole, capability: AccessCapability): boolean {
  return CAPABILITY_ROLES[capability].includes(appRole);
}

export function getLandingPath(appRole: AppRole): string {
  if (appRole === 'visiteur') return '/wall';
  return '/dashboard';
}

export function getDeniedMessage(roomKey: string, appRole: AppRole): string {
  if (appRole === 'visiteur') {
    return 'Accès réservé aux membres chauffeurs et administrateurs.';
  }
  if (appRole === 'chauffeur') {
    if (roomKey.startsWith('finance') || roomKey === 'bank' || roomKey === 'administration') {
      return 'Accès réservé aux administrateurs.';
    }
    return 'Accès refusé pour votre rôle.';
  }
  return 'Accès refusé.';
}
