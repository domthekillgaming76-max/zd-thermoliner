import { RoleBadge } from './RoleBadge';
import { normalizeRole } from '../../lib/roleEngine';
import { isDom76DualRole } from '../../services/driverSyncService';

interface UserBadgesProps {
  isAdministrator?: boolean;
  role?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/** Badges unifiés — visiteur / chauffeur / admin (+ chauffeur pour DOM76 dual). */
export function UserBadges({
  isAdministrator,
  role,
  email,
  size = 'xs',
  className = '',
}: UserBadgesProps) {
  const displayRole = isAdministrator ? 'admin' : normalizeRole(role);
  if (!displayRole) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <RoleBadge role={displayRole} size={size} />
      {isDom76DualRole(email) && displayRole === 'admin' && (
        <RoleBadge role="chauffeur" size={size} />
      )}
    </span>
  );
}
