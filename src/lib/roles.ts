import {
  Crown, Shield, Truck, Users, Radio, Container, Calculator, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isAdministratorEmail } from './admin';

/** Canonical ERP roles used for permissions & badges */
export type CanonicalRole =
  | 'visitor'
  | 'recruit'
  | 'driver'
  | 'dispatcher'
  | 'fleet_manager'
  | 'manager'
  | 'accountant'
  | 'admin';

const ALIAS_TO_CANONICAL: Record<string, CanonicalRole> = {
  visitor: 'visitor',
  visiteur: 'visitor',
  candidat: 'recruit',
  recruit: 'recruit',
  recruitment: 'recruit',
  chauffeur: 'driver',
  driver: 'driver',
  member: 'driver',
  tractionnaire: 'driver',
  dispatcher: 'dispatcher',
  directeur: 'fleet_manager',
  fleet_manager: 'fleet_manager',
  patron: 'manager',
  manager: 'manager',
  accountant: 'accountant',
  comptable: 'accountant',
  pdg: 'admin',
  admin: 'admin',
  administrator: 'admin',
};

export interface RoleBadgeStyle {
  label: string;
  className: string;
  icon: LucideIcon;
  showOnWall: boolean;
}

export const CANONICAL_BADGE: Record<CanonicalRole, RoleBadgeStyle> = {
  admin: {
    label: 'Administrateur',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Crown,
    showOnWall: true,
  },
  manager: {
    label: 'Manager',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: Users,
    showOnWall: true,
  },
  dispatcher: {
    label: 'Dispatch',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Radio,
    showOnWall: true,
  },
  fleet_manager: {
    label: 'Flotte',
    className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: Container,
    showOnWall: true,
  },
  accountant: {
    label: 'Comptable',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Calculator,
    showOnWall: true,
  },
  driver: {
    label: 'Chauffeur',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: Truck,
    showOnWall: true,
  },
  recruit: {
    label: 'Recrue',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    icon: User,
    showOnWall: true,
  },
  visitor: {
    label: 'Visiteur',
    className: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    icon: User,
    showOnWall: true,
  },
};

const LEGACY_BADGE: Record<string, RoleBadgeStyle> = {
  ancien_membre: {
    label: 'Ancien membre',
    className: 'bg-white/5 text-white/25 border-white/8',
    icon: User,
    showOnWall: false,
  },
  banni: {
    label: 'Banni',
    className: 'bg-red-500/15 text-red-400 border-red-500/25',
    icon: Shield,
    showOnWall: false,
  },
};

export const ROLE_LEVELS: Record<string, number> = {
  pdg: 100,
  patron: 90,
  admin: 90,
  manager: 85,
  directeur: 70,
  fleet_manager: 70,
  accountant: 65,
  comptable: 65,
  dispatcher: 50,
  chauffeur: 30,
  driver: 30,
  member: 30,
  tractionnaire: 25,
  candidat: 10,
  recruit: 10,
  visitor: 5,
  visiteur: 5,
};

export const VALIDATOR_MIN_LEVEL = 70;

/** Single-step promotion ladder for ERP members */
export const ROLE_PROMOTION_CHAIN = [
  'visitor',
  'candidat',
  'chauffeur',
  'dispatcher',
  'directeur',
  'patron',
] as const;

export type PromotableRole = (typeof ROLE_PROMOTION_CHAIN)[number];

/** DOM76 / owner account — minimum assignable roles */
export const DOM76_ADMIN_ROLES = new Set(['pdg', 'patron', 'admin']);

export function normalizeRole(role: string | null | undefined): CanonicalRole | 'legacy' {
  if (!role) return 'visitor';
  if (role in LEGACY_BADGE) return 'legacy';
  return ALIAS_TO_CANONICAL[role] ?? 'visitor';
}

export function getRoleBadgeStyle(role: string | null | undefined): RoleBadgeStyle {
  if (!role) return CANONICAL_BADGE.visitor;
  if (role in LEGACY_BADGE) return LEGACY_BADGE[role];
  const canonical = ALIAS_TO_CANONICAL[role];
  if (canonical) return CANONICAL_BADGE[canonical];
  return {
    label: role.replace(/_/g, ' '),
    className: 'bg-white/5 text-white/40 border-white/10',
    icon: User,
    showOnWall: true,
  };
}

export function getRoleLabel(role: string | null | undefined): string {
  return getRoleBadgeStyle(role).label;
}

export function getRoleBadgeClasses(role: string | null | undefined): string {
  return getRoleBadgeStyle(role).className;
}

export function getRoleIcon(role: string | null | undefined): LucideIcon {
  return getRoleBadgeStyle(role).icon;
}

export function shouldShowRoleOnWall(role: string | null | undefined): boolean {
  return getRoleBadgeStyle(role).showOnWall;
}

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
  return normalizeRole(role) === 'visitor' && role !== 'ancien_membre' && role !== 'banni';
}

export function isCanonicalRecruit(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'recruit';
}

export function isCanonicalDriver(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'driver';
}

export function isCanonicalAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'admin';
}

export function canValidateRoadSheets(roleOrEmail: string | null | undefined): boolean {
  if (!roleOrEmail) return false;
  if (roleOrEmail.includes('@')) return isAdministratorEmail(roleOrEmail);
  return (ROLE_LEVELS[roleOrEmail] ?? 0) >= VALIDATOR_MIN_LEVEL;
}

/** Build ERP_ROLE_LABELS map for admin dropdowns */
export function buildRoleLabelsMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [alias, canonical] of Object.entries(ALIAS_TO_CANONICAL)) {
    map[alias] = CANONICAL_BADGE[canonical].label;
  }
  for (const [legacy, style] of Object.entries(LEGACY_BADGE)) {
    map[legacy] = style.label;
  }
  return map;
}

export function buildRoleColorsMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [alias, canonical] of Object.entries(ALIAS_TO_CANONICAL)) {
    map[alias] = CANONICAL_BADGE[canonical].className;
  }
  for (const [legacy, style] of Object.entries(LEGACY_BADGE)) {
    map[legacy] = style.className;
  }
  return map;
}

export function logRoleState(rawRole: string | null | undefined, context: string): void {
  console.log(`[Z&D Role] ${context}:`, rawRole);
  console.log('[Z&D Role] normalized role:', normalizeRole(rawRole));
}
