import { RefreshCw, LayoutDashboard } from 'lucide-react';

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

  return (
    <div className="premium-hero rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 premium-hero-grid pointer-events-none" />
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(239,68,68,0.12)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(96,165,250,0.06)' }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="premium-hero-icon w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <p className="text-white/50 text-sm font-medium mb-1">{greeting}</p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Centre de commande
            </h1>
            <p className="text-white/35 text-sm mt-2 max-w-lg">
              Z&D Thermoliner — Pilotage transport, flotte & finances en temps réel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="premium-status-badge flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold">
            <span className="live-dot" />
            <span className="text-emerald-400">Système opérationnel</span>
          </div>

          <span className="text-white/25 text-xs hidden md:block">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="premium-refresh-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="text-white/30">· {timeStr}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
