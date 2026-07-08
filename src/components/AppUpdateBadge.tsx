import { useAppUpdateBadge } from '../contexts/AppUpdateContext';

interface AppUpdateBadgeProps {
  className?: string;
  showCount?: boolean;
}

export function AppUpdateBadge({ className = '', showCount = false }: AppUpdateBadgeProps) {
  const visible = useAppUpdateBadge();
  if (!visible) return null;

  return (
    <span
      className={`inline-flex items-center justify-center bg-red-500 text-white font-bold rounded-full ${className}`}
      aria-label="Mise à jour disponible"
    >
      {showCount ? '1' : ''}
    </span>
  );
}
