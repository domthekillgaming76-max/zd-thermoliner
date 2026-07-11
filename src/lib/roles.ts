/** Backward-compatible re-exports — canonical source is roleEngine.ts */
export type { AppRole as CanonicalRole, AppRole, ModuleKey, RoleBadgeConfig } from './roleEngine';

export {
  normalizeRole,
  toAssignableRole,
  CANONICAL_ROLES,
  ASSIGNABLE_ROLES,
  getRoleLabel,
  getRoleColor,
  getRoleBadge,
  getRoleBadge as getRoleBadgeStyle,
  shouldShowRoleOnWall,
  canAccessModule,
  canAccessRoute,
  getRoleRedirect,
  dispatchRoleUpdated,
  ROLE_SYNC_EVENT,
  ROUTE_MODULE_RULES,
} from './roleEngine';

import { getRoleLabel, getRoleColor, normalizeRole as normalizeAppRole } from './roleEngine';
import { isAdministratorEmail } from './admin';

export const ROLE_PROMOTION_CHAIN = ['visiteur', 'chauffeur', 'admin'] as const;

export type PromotableRole = (typeof ROLE_PROMOTION_CHAIN)[number];

export const ROLE_LEVELS: Record<string, number> = {
  admin: 100,
  chauffeur: 50,
  visiteur: 5,
  visitor: 5,
  flotte: 50,
  ancien_membre: 0,
  banni: 0,
};

export const VALIDATOR_MIN_LEVEL = 50;
export const DOM76_ADMIN_ROLES = new Set(['admin']);

export function normalizeRoleKey(role: string | null | undefined): string {
  if (!role) return 'visiteur';
  return normalizeAppRole(role);
}

export function getNextPromotionRole(currentRole: string | null | undefined): PromotableRole | null {
  const norm = normalizeRoleKey(currentRole);
  const idx = ROLE_PROMOTION_CHAIN.indexOf(norm as PromotableRole);
  if (idx === -1 || idx >= ROLE_PROMOTION_CHAIN.length - 1) return null;
  return ROLE_PROMOTION_CHAIN[idx + 1];
}

export function canManageRolePromotions(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return normalizeAppRole(role) === 'admin';
}

export function getPromotionButtonLabel(currentRole: string | null | undefined): string | null {
  const next = getNextPromotionRole(currentRole);
  if (!next) return null;
  return `Promouvoir → ${getRoleLabel(next)}`;
}

export function isCanonicalVisitor(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'visiteur';
}

/** @deprecated Les recrues sont des visiteurs */
export function isCanonicalRecruit(_role: string | null | undefined): boolean {
  return false;
}

export function isCanonicalChauffeur(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'chauffeur';
}

/** @deprecated Utiliser isCanonicalChauffeur */
export function isCanonicalFlotte(role: string | null | undefined): boolean {
  return isCanonicalChauffeur(role);
}

/** @deprecated Utiliser isCanonicalChauffeur */
export function isCanonicalDriver(role: string | null | undefined): boolean {
  return isCanonicalChauffeur(role);
}

export function isCanonicalAdmin(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'admin';
}

export function canValidateRoadSheets(roleOrEmail: string | null | undefined): boolean {
  if (!roleOrEmail) return false;
  if (roleOrEmail.includes('@')) return isAdministratorEmail(roleOrEmail);
  return (ROLE_LEVELS[normalizeRoleKey(roleOrEmail)] ?? 0) >= VALIDATOR_MIN_LEVEL;
}

export function buildRoleLabelsMap(): Record<string, string> {
  const roles = [
    'visiteur', 'visitor', 'chauffeur', 'flotte', 'driver', 'admin', 'administrator',
    'ancien_membre', 'banni',
  ];
  const map: Record<string, string> = {};
  for (const r of roles) map[r] = getRoleLabel(r);
  return map;
}

export function buildRoleColorsMap(): Record<string, string> {
  const roles = Object.keys(buildRoleLabelsMap());
  const map: Record<string, string> = {};
  for (const r of roles) map[r] = getRoleColor(r);
  return map;
}

export function logRoleState(rawRole: string | null | undefined, context: string): void {
  console.log(`[Z&D Role] ${context}:`, rawRole, '→', normalizeAppRole(rawRole));
}
