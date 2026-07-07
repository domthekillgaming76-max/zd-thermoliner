import { isAdministratorEmail } from './admin';

/** Single-step promotion ladder for ERP members */
export const ROLE_PROMOTION_CHAIN = [
  'visitor',
  'candidat',
  'chauffeur',
  'dispatcher',
  'directeur',
  'patron',
] as const;

export type PromotableRole = typeof ROLE_PROMOTION_CHAIN[number];

export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  visitor: 'Visiteur',
  visiteur: 'Visiteur',
  candidat: 'Recrue',
  chauffeur: 'Chauffeur',
  dispatcher: 'Dispatcher',
  directeur: 'Manager',
  patron: 'Administrateur',
  pdg: 'PDG',
  admin: 'Administrateur',
  tractionnaire: 'Tractionnaire',
  ancien_membre: 'Ancien membre',
  banni: 'Banni',
};

export function normalizeRoleKey(role: string | null | undefined): string {
  if (!role) return 'visitor';
  if (role === 'visiteur') return 'visitor';
  if (role === 'admin') return 'patron';
  return role;
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Visiteur';
  return ROLE_DISPLAY_LABELS[role] ?? role.replace('_', ' ');
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
