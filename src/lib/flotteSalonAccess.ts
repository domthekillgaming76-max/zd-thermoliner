/** @deprecated Utiliser room_permissions — re-exports de compatibilité */
import type { ModuleKey } from './roleEngine';
import { DEFAULT_ROOM_PERMISSIONS } from './defaultRoomPermissions';

export { CANONICAL_ROLES, ASSIGNABLE_ROLES } from './accessPolicy';

export type SalonTier = 'visitor' | 'ops' | 'finance' | 'admin_salon' | 'community' | 'recruitment' | 'candidat' | 'commun';
export type ModuleRoleKind = SalonTier;

export const FLOTTE_DENIED_MODULES = [
  'finance', 'invoices', 'salaries', 'accounting', 'bank',
  'administration', 'roles_salons', 'salons_admin', 'admin_integrations', 'recruitment_admin',
] as const;

export const FLOTTE_EXCLUDED_DB_KEYS = FLOTTE_DENIED_MODULES;

export function defaultAllowedRolesForModule(key: ModuleKey | string): string[] {
  const room = DEFAULT_ROOM_PERMISSIONS.find(r => r.room_key === key);
  return room?.visible_to_roles ?? ['admin'];
}

export function rolesForSalonTier(tier: SalonTier): string[] {
  if (tier === 'finance' || tier === 'admin_salon') return ['admin'];
  if (tier === 'candidat' || tier === 'visitor') return ['visiteur'];
  if (tier === 'recruitment') return ['visiteur', 'admin'];
  return ['visiteur', 'chauffeur', 'admin'];
}

/** @deprecated Utiliser rolesForSalonTier */
export function rolesForModule(kind: SalonTier): string[] {
  return rolesForSalonTier(kind);
}
