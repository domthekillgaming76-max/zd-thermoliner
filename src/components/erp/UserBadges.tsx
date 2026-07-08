import { AdminBadge } from './AdminBadge';
import { RoleBadge } from './RoleBadge';
import { isDom76DualRole } from '../../services/driverSyncService';

interface UserBadgesProps {
  isAdministrator?: boolean;
  role?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/** Primary admin badge + optional chauffeur secondary for DOM76 dual role. */
export function UserBadges({
  isAdministrator,
  role,
  email,
  size = 'xs',
  className = '',
}: UserBadgesProps) {
  if (isAdministrator) {
    return (
      <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        <AdminBadge size={size === 'md' ? 'md' : 'sm'} />
        {isDom76DualRole(email) && (
          <RoleBadge role="chauffeur" size={size} />
        )}
      </span>
    );
  }

  if (!role) return null;
  return <RoleBadge role={role} size={size} className={className} />;
}
