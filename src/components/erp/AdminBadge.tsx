import { RoleBadge } from './RoleBadge';

interface AdminBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

/** @deprecated Utiliser RoleBadge avec role="admin" */
export function AdminBadge({ className = '', size = 'sm' }: AdminBadgeProps) {
  return (
    <RoleBadge
      role="admin"
      size={size === 'md' ? 'md' : 'sm'}
      className={className}
    />
  );
}
