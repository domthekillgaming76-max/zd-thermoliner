import type { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({ title, subtitle, children, className = '' }: DashboardSectionProps) {
  return (
    <section className={`space-y-4 md:space-y-5 ${className}`}>
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <h2 className="text-sm md:text-base font-bold text-white tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="hidden sm:block flex-1 max-w-[120px] h-px dashboard-section-line ml-4" />
      </div>
      {children}
    </section>
  );
}

interface DashboardWidgetProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function DashboardWidget({ children, delay = 0, className = '' }: DashboardWidgetProps) {
  return (
    <div
      className={`opacity-0 animate-dashboard-in ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {children}
    </div>
  );
}
