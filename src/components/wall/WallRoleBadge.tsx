import { getRoleLabel } from '../../lib/rolePromotion';

interface WallRoleBadgeProps {
  role?: string | null;
}

export function WallRoleBadge({ role }: WallRoleBadgeProps) {
  if (!role || role === 'visitor' || role === 'visiteur') return null;

  const adminRoles = new Set(['pdg', 'patron', 'admin', 'directeur']);
  const isAdmin = adminRoles.has(role);

  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
        isAdmin
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
          : 'text-red-400/80 bg-red-500/8 border-red-500/20'
      }`}
    >
      {getRoleLabel(role)}
    </span>
  );
}
