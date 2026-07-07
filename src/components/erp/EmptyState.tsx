import type { ElementType } from 'react';

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 text-white/20 mx-auto mb-2" />
      <p className="text-white/30 text-sm">{title}</p>
      {description && <p className="text-white/20 text-xs mt-1">{description}</p>}
    </div>
  );
}
