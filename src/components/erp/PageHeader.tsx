import type { ElementType, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  greeting?: string;
  icon: ElementType;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, greeting, icon: Icon, badge, actions }: PageHeaderProps) {
  return (
    <div className="erp-card rounded-2xl p-5 md:p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(239,68,68,0.08) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 0 24px rgba(239,68,68,0.15)',
            }}
          >
            <Icon className="w-6 h-6 text-red-400" />
          </div>
          <div>
            {greeting && <p className="text-white/40 text-sm">{greeting}</p>}
            <h1 className="text-2xl md:text-3xl font-black text-white">{title}</h1>
            {subtitle && <p className="text-white/30 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {badge}
          {actions}
          <span className="text-white/25 text-xs hidden md:block">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
