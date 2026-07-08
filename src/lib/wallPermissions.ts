import { isAdministratorEmail } from './admin';
import { isVisitorRole, isRecruitRole, isSuspendedAccount } from './accessControl';

const MANAGER_ROLES = new Set(['pdg', 'patron', 'admin', 'directeur', 'dispatcher']);

/** Visiteurs : accès lecture + commentaires + réactions (pas de publication). */
export function canAccessWall(
  role: string | null | undefined,
  options?: { isActive?: boolean | null; isSuspended?: boolean | null },
): boolean {
  if (!role) return false;
  if (isSuspendedAccount(role, options?.isActive, options?.isSuspended)) return false;
  if (role === 'banni' || role === 'ancien_membre') return false;
  if (isVisitorRole(role)) return true;
  return true;
}

export function canPublishOnWall(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  if (!role || role === 'banni') return false;
  if (isVisitorRole(role)) return false;
  return true;
}

export function canCommentOnWall(
  role: string | null | undefined,
  options?: { isActive?: boolean | null; isSuspended?: boolean | null },
): boolean {
  return canAccessWall(role, options);
}

export function canReactOnWall(
  role: string | null | undefined,
  options?: { isActive?: boolean | null; isSuspended?: boolean | null },
): boolean {
  return canCommentOnWall(role, options);
}

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
): import('./wallTypes').WallVisibility[] {
  if (isAdministratorEmail(email)) {
    return ['public', 'visitors', 'members', 'drivers', 'admin'];
  }
  if (isVisitorRole(role) || isRecruitRole(role)) {
    return ['public', 'visitors'];
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
): import('./wallTypes').WallPostType[] {
  const base: import('./wallTypes').WallPostType[] = ['text', 'photo', 'video'];
  if (isVisitorRole(role) && !isAdministratorEmail(email)) {
    return base;
  }
  if (isRecruitRole(role)) {
    return [...base, 'poll', 'event'];
  }
  const extended: import('./wallTypes').WallPostType[] = [...base, 'convoy', 'poll', 'event'];
  if (canCreateOfficialPost(role, email)) {
    extended.push('announcement', 'recruitment');
  }
  return extended;
}

export function getDefaultVisibility(
  role: string | null | undefined,
  postType: import('./wallTypes').WallPostType,
): import('./wallTypes').WallVisibility {
  if (postType === 'recruitment') return 'visitors';
  if (postType === 'event' || postType === 'announcement') return 'members';
  if (isVisitorRole(role) || isRecruitRole(role)) return 'public';
  return 'members';
}
