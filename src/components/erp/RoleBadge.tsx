import { getRoleBadgeStyle, shouldShowRoleOnWall } from '../../lib/roles';

interface RoleBadgeProps {
  role?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  hideVisitor?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'text-[9px] px-1.5 py-0.5',
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

const ICON_SIZES = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

export function RoleBadge({
  role,
  size = 'sm',
  showIcon = true,
  hideVisitor = false,
  className = '',
}: RoleBadgeProps) {
  if (!role) return null;
  if (hideVisitor && (role === 'visitor' || role === 'visiteur')) return null;

  const style = getRoleBadgeStyle(role);
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wide rounded-lg border ${SIZE_CLASSES[size]} ${style.className} ${className}`}
    >
      {showIcon && <Icon className={`${ICON_SIZES[size]} shrink-0`} />}
      {style.label}
    </span>
  );
}

/** Wall-specific badge — respects showOnWall flag */
export function WallRoleBadge({ role }: { role?: string | null }) {
  if (!role || !shouldShowRoleOnWall(role)) return null;
  return <RoleBadge role={role} size="xs" />;
}
