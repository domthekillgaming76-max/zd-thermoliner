import type { ElementType } from 'react';

interface DashboardHeroProps {
  greeting: string;
  title: string;
  subtitle: string;
  icon: ElementType;
}

export function DashboardHero({ greeting, title, subtitle, icon: Icon }: DashboardHeroProps) {
  return (
    <div className="erp-hero rounded-2xl p-5 md:p-7 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none erp-hero-grid" />
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(239,68,68,0.08)', transform: 'translate(30%, -30%)' }}
      />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="erp-hero-icon w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-white/40 text-sm">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h1>
            <p className="text-white/30 text-sm mt-1">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 erp-card">
            <span className="live-dot" />
            Système opérationnel
          </div>
          <span className="text-white/25 text-xs hidden sm:block">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
