/**
 * Service d'accès unifié — room_permissions + rôles canoniques.
 */
import { isAdministratorEmail } from './admin';
import { getDeniedMessage, getLandingPath, hasCapability, type AccessCapability } from './accessPolicy';
import {
  normalizeRole,
  pathnameToModule,
  roleMatchesVisible,
  type AppRole,
} from './roleEngine';
import type { RoomPermission } from './roomTypes';
import { isRemovedRoomKey } from './removedRooms';

export const VISITOR_RESTRICTED_MESSAGE =
  'Accès réservé aux membres Z&D Thermoliner.';

export const SUSPENDED_MESSAGE =
  'Votre compte est suspendu. Contactez l\'administration.';

const SUSPENDED_ALLOWED = new Set(['profile', 'settings']);
const DEPARTED_ALLOWED = new Set(['profile', 'settings', 'wall']);

const PAGE_ALIASES: Record<string, string> = {
  tracking: 'gps_tracking',
  economy: 'finance',
};

export interface AccessCheckInput {
  role: string | null | undefined;
  email?: string | null;
  moduleOrPage: string;
  pathname?: string;
  rooms?: RoomPermission[];
  isActive?: boolean | null;
  isSuspended?: boolean | null;
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

function resolveRoomKey(moduleOrPage: string, pathname?: string): string | null {
  if (moduleOrPage in PAGE_ALIASES) return PAGE_ALIASES[moduleOrPage];
  if (pathname) {
    const mod = pathnameToModule(pathname);
    if (mod) return mod;
  }
  return moduleOrPage;
}

function findRoom(key: string, rooms: RoomPermission[]): RoomPermission | undefined {
  return rooms.find(r => r.room_key === key);
}

export function canAccessRoom(
  role: string | null | undefined,
  email: string | null | undefined,
  roomKey: string,
  rooms: RoomPermission[],
): boolean {
  if (isRemovedRoomKey(roomKey)) return false;
  if (isAdministratorEmail(email)) return true;

  const room = findRoom(roomKey, rooms);
  if (!room) return true;
  if (!room.enabled) return false;
  return roleMatchesVisible(room.visible_to_roles, role);
}

export function canAccessSalon(input: AccessCheckInput): boolean {
  const { role, email, moduleOrPage, pathname, rooms, isActive, isSuspended } = input;

  const roomKey = resolveRoomKey(moduleOrPage, pathname);
  if (!roomKey) return true;
  if (isRemovedRoomKey(roomKey)) return false;
  if (isAdministratorEmail(email)) return true;

  if (isSuspendedAccount(role, isActive, isSuspended)) {
    return SUSPENDED_ALLOWED.has(roomKey);
  }
  if (role === 'ancien_membre') {
    return DEPARTED_ALLOWED.has(roomKey);
  }
  if (role === 'banni') return false;

  if (rooms && rooms.length > 0) {
    return canAccessRoom(role, email, roomKey, rooms);
  }

  return true;
}

export function canAccessPath(input: Omit<AccessCheckInput, 'moduleOrPage'> & { pathname: string }): boolean {
  const roomKey = pathnameToModule(input.pathname);
  if (!roomKey) return true;
  return canAccessSalon({ ...input, moduleOrPage: roomKey });
}

export function getAccessDeniedReason(input: AccessCheckInput): string {
  if (isSuspendedAccount(input.role, input.isActive, input.isSuspended)) {
    return SUSPENDED_MESSAGE;
  }
  const roomKey = resolveRoomKey(input.moduleOrPage, input.pathname);
  if (!roomKey) return VISITOR_RESTRICTED_MESSAGE;
  return getDeniedMessage(roomKey, normalizeRole(input.role));
}

export function getDefaultLandingPath(role: string | null | undefined): string {
  if (role === 'banni') return '/suspended';
  if (role === 'ancien_membre') return '/departed';
  return getLandingPath(normalizeRole(role));
}

export function isVisiteurRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'visiteur';
}

export function isChauffeurRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'chauffeur';
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'admin';
}

/** @deprecated */
export function isVisitorRole(role: string | null | undefined): boolean {
  return isVisiteurRole(role);
}

/** @deprecated */
export function isFlotteRole(role: string | null | undefined): boolean {
  return isChauffeurRole(role);
}

export function isRecruitRole(_role: string | null | undefined): boolean {
  return false;
}

export function canUseCapability(
  role: string | null | undefined,
  email: string | null | undefined,
  capability: AccessCapability,
): boolean {
  if (isAdministratorEmail(email)) return true;
  return hasCapability(normalizeRole(role), capability);
}

export function requireRole(
  role: string | null | undefined,
  allowed: AppRole[],
  email?: string | null,
): void {
  if (isAdministratorEmail(email)) return;
  const norm = normalizeRole(role);
  if (!allowed.includes(norm)) {
    throw new Error(`Rôle requis : ${allowed.join(', ')}`);
  }
}
