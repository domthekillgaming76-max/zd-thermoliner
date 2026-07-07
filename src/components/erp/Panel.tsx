import { Link } from 'react-router-dom';
import type { ElementType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon: ElementType;
  to?: string;
  linkLabel?: string;
  action?: ReactNode;
}

export function PanelHeader({ title, icon: Icon, to, linkLabel, action }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-red-400 flex-shrink-0" />
        <h2 className="text-sm font-bold text-white truncate">{title}</h2>
      </div>
      {action ?? (to && (
        <Link
          to={to}
          className="text-xs text-red-400/80 hover:text-red-300 flex items-center gap-0.5 transition-colors flex-shrink-0"
        >
          {linkLabel ?? 'Voir tout'} <ChevronRight className="w-3 h-3" />
        </Link>
      ))}
    </div>
  );
}

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div className={`erp-card rounded-2xl p-4 md:p-5 ${className}`}>
      {children}
    </div>
  );
}
