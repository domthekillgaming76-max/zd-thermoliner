/** Backward-compatible re-exports — canonical source is roleEngine.ts */
export type { AppRole as CanonicalRole, AppRole, ModuleKey, RoleBadgeConfig } from './roleEngine';

export {
  normalizeRole,
  getRoleLabel,
  getRoleColor,
  getRoleBadge,
  getRoleBadge as getRoleBadgeStyle,
  shouldShowRoleOnWall,
  getAllowedModules,
  canAccessModule,
  canAccessRoute,
  getRoleRedirect,
  logRoleSync,
  logRoleSyncNormalized,
  dispatchRoleUpdated,
  ROLE_SYNC_EVENT,
  ALL_MODULES,
  ROUTE_MODULE_RULES,
} from './roleEngine';

import { getRoleLabel, getRoleColor, normalizeRole as normalizeAppRole, logRoleSync, logRoleSyncNormalized } from './roleEngine';
import { isAdministratorEmail } from './admin';

export const ROLE_PROMOTION_CHAIN = [
  'visitor',
  'candidat',
  'chauffeur',
  'dispatcher',
  'directeur',
  'patron',
] as const;

export type PromotableRole = (typeof ROLE_PROMOTION_CHAIN)[number];

export const ROLE_LEVELS: Record<string, number> = {
  pdg: 100, patron: 90, admin: 90, manager: 85, directeur: 70, fleet_manager: 70,
  accountant: 65, comptable: 65, dispatcher: 50, chauffeur: 30, driver: 30, member: 30,
  tractionnaire: 25, candidat: 10, recruit: 10, visitor: 5, visiteur: 5,
};

export const VALIDATOR_MIN_LEVEL = 70;
export const DOM76_ADMIN_ROLES = new Set(['pdg', 'patron', 'admin']);

export function normalizeRoleKey(role: string | null | undefined): string {
  if (!role) return 'visitor';
  if (role === 'visiteur') return 'visitor';
  if (role === 'member') return 'chauffeur';
  if (role === 'administrator') return 'admin';
  return role;
}

export function getNextPromotionRole(currentRole: string | null | undefined): PromotableRole | null {
  const norm = normalizeRoleKey(currentRole);
  const idx = ROLE_PROMOTION_CHAIN.indexOf(norm as PromotableRole);
  if (idx === -1 || idx >= ROLE_PROMOTION_CHAIN.length - 1) return null;
  return ROLE_PROMOTION_CHAIN[idx + 1];
}

export function canManageRolePromotions(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return role === 'pdg' || role === 'patron' || role === 'admin';
}

export function getPromotionButtonLabel(currentRole: string | null | undefined): string | null {
  const next = getNextPromotionRole(currentRole);
  if (!next) return null;
  return `Promouvoir → ${getRoleLabel(next)}`;
}

export function isCanonicalVisitor(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'visitor';
}

export function isCanonicalRecruit(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'recruit';
}

export function isCanonicalDriver(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'driver';
}

export function isCanonicalAdmin(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'admin';
}

export function canValidateRoadSheets(roleOrEmail: string | null | undefined): boolean {
  if (!roleOrEmail) return false;
  if (roleOrEmail.includes('@')) return isAdministratorEmail(roleOrEmail);
  return (ROLE_LEVELS[roleOrEmail] ?? 0) >= VALIDATOR_MIN_LEVEL;
}

export function buildRoleLabelsMap(): Record<string, string> {
  const roles = [
    'visitor', 'visiteur', 'candidat', 'recruit', 'chauffeur', 'driver', 'member', 'tractionnaire',
    'dispatcher', 'directeur', 'fleet_manager', 'patron', 'manager', 'accountant', 'comptable',
    'pdg', 'admin', 'administrator', 'ancien_membre', 'banni',
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
  logRoleSync(`${context}:`, rawRole);
  logRoleSyncNormalized(rawRole);
}
