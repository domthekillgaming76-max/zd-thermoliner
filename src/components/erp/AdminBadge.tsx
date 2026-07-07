import { Shield } from 'lucide-react';

interface AdminBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function AdminBadge({ className = '', size = 'sm' }: AdminBadgeProps) {
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const icon = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 ${text} ${className}`}
    >
      <Shield className={icon} />
      Administrateur
    </span>
  );
}
