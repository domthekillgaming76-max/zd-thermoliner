import { isAdministratorEmail } from './admin';
import { canUseCapability, isFlotteRole, isRecruitRole, isSuspendedAccount, isVisitorRole } from './accessService';

export function canAccessWall(
  role: string | null | undefined,
  options?: { isActive?: boolean | null; isSuspended?: boolean | null },
): boolean {
  if (isSuspendedAccount(role, options?.isActive, options?.isSuspended)) return false;
  if (role === 'banni' || role === 'ancien_membre') return false;
  return true;
}

export function canPublishOnWall(
  role: string | null | undefined,
  email?: string | null,
  options?: { isActive?: boolean | null; isSuspended?: boolean | null },
): boolean {
  if (isAdministratorEmail(email)) return true;
  return canAccessWall(role, options);
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
  return canUseCapability(role, email, 'moderate_wall');
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
  if (isFlotteRole(role)) {
    return ['public', 'visitors', 'members', 'drivers'];
  }
  if (canModerateWall(role, email)) {
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
