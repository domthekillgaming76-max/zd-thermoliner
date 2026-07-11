import { RefreshCw, LayoutDashboard, Sparkles } from 'lucide-react';

interface PremiumDashboardHeroProps {
  greeting: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date;
}

export function PremiumDashboardHero({
  greeting,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: PremiumDashboardHeroProps) {
  const timeStr = lastUpdated.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="premium-hero rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden opacity-0 animate-dashboard-in" style={{ animationFillMode: 'forwards' }}>
      <div className="absolute inset-0 premium-hero-grid pointer-events-none" />
      <div className="absolute inset-0 premium-hero-shine pointer-events-none" />
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none animate-pulse-red"
        style={{ background: 'rgba(239,68,68,0.1)', animationDuration: '4s' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(96,165,250,0.06)' }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="premium-hero-icon w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-2xl flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-400/70" />
              <p className="text-white/55 text-sm font-medium">{greeting}</p>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Tableau de bord
            </h1>
            <p className="text-white/40 text-sm mt-2 max-w-xl leading-relaxed">
              Vue d&apos;ensemble de votre activité — flotte, finances et opérations en temps réel
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="premium-status-badge flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold">
            <span className="live-dot" />
            <span className="text-emerald-400">En ligne</span>
            <span className="text-white/20 hidden sm:inline">·</span>
            <span className="text-white/40 capitalize hidden sm:inline">{dateStr}</span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="premium-refresh-btn flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
            <span className="text-white/30 tabular-nums">{timeStr}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
