import { isAdministratorEmail } from './admin';
import { isVisitorRole } from './accessControl';
import type { WallPostType, WallVisibility } from './wallTypes';

const MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

export function canModerateWall(role: string | null | undefined, email?: string | null): boolean {
  return isAdministratorEmail(email) || MANAGER_ROLES.has(role ?? '');
}

export function canPinWallPosts(role: string | null | undefined, email?: string | null): boolean {
  return canModerateWall(role, email);
}

export function canCreateOfficialPost(role: string | null | undefined, email?: string | null): boolean {
  return canModerateWall(role, email);
}

export function getAllowedVisibilities(
  role: string | null | undefined,
  email?: string | null,
): WallVisibility[] {
  if (isAdministratorEmail(email)) {
    return ['public', 'visitors', 'members', 'drivers', 'admin'];
  }
  if (isVisitorRole(role)) {
    return ['public'];
  }
  if (role === 'chauffeur' || role === 'tractionnaire') {
    return ['public', 'visitors', 'members', 'drivers'];
  }
  if (MANAGER_ROLES.has(role ?? '')) {
    return ['public', 'visitors', 'members', 'drivers', 'admin'];
  }
  return ['public', 'visitors', 'members'];
}

export function getAllowedPostTypes(
  role: string | null | undefined,
  email?: string | null,
): WallPostType[] {
  const base: WallPostType[] = ['text', 'photo', 'video'];
  if (isVisitorRole(role) && !isAdministratorEmail(email)) {
    return base;
  }
  const extended: WallPostType[] = [...base, 'convoy', 'poll', 'event'];
  if (canCreateOfficialPost(role, email)) {
    extended.push('announcement', 'recruitment');
  }
  return extended;
}

export function getDefaultVisibility(
  role: string | null | undefined,
  postType: WallPostType,
): WallVisibility {
  if (postType === 'recruitment') return 'visitors';
  if (postType === 'event' || postType === 'announcement') return 'members';
  if (isVisitorRole(role)) return 'public';
  return 'members';
}
