import { RefreshCw, Truck, Users, Zap, MapPin } from 'lucide-react';

interface PremiumDashboardHeroProps {
  greeting: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
}

export function PremiumDashboardHeroRefactored({
  greeting,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: PremiumDashboardHeroProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Hero banner principal */}
      <div
        className="relative rounded-2xl overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, rgba(31,31,31,0.95) 0%, rgba(15,15,15,0.98) 50%, rgba(25,15,15,0.97) 100%)',
          border: '1px solid rgba(239,68,68,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(239,68,68,0.1)',
        }}
      >
        {/* Grid background effect */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: 0.5,
          }}
        />

        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: Content */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-semibold text-red-400/80 mb-2">Bienvenue dans Z&D Thermoliner</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {greeting}
              </h1>
              <p className="text-lg text-white/60">
                Vous êtes connecté depuis <span className="text-red-400 font-semibold">{timeString}</span>
              </p>
            </div>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">Système en ligne</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold text-cyan-300">Flotte active</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="group/btn px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.08) 100%)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                }}
              >
                <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover/btn:rotate-180'}`} />
                <span className="hidden sm:inline">
                  {isRefreshing ? 'Chargement...' : 'Actualiser'}
                </span>
              </button>
            )}
            {lastUpdated && (
              <p className="text-xs text-white/40 text-center md:text-right">
                Mis à jour: {new Date(lastUpdated).toLocaleTimeString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        {/* Animated border effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(239,68,68,0.15), transparent 70%)',
          }}
        />
      </div>

      {/* KPI Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Missions */}
        <div
          className="p-5 rounded-xl group cursor-pointer transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/15 border border-blue-500/25">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-blue-300 px-2 py-1 rounded bg-blue-500/10">En cours</span>
          </div>
          <p className="text-xs text-white/50 mb-1">Missions actives</p>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-white/40 mt-2">+0 cette semaine</p>
        </div>

        {/* Fleet */}
        <div
          className="p-5 rounded-xl group cursor-pointer transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/25">
              <Truck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-emerald-300 px-2 py-1 rounded bg-emerald-500/10">Actifs</span>
          </div>
          <p className="text-xs text-white/50 mb-1">Véhicules en ligne</p>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-white/40 mt-2">Prêts à partir</p>
        </div>

        {/* Drivers */}
        <div
          className="p-5 rounded-xl group cursor-pointer transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.05) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/15 border border-purple-500/25">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-purple-300 px-2 py-1 rounded bg-purple-500/10">Connectés</span>
          </div>
          <p className="text-xs text-white/50 mb-1">Chauffeurs en ligne</p>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-white/40 mt-2">Depuis ce matin</p>
        </div>

        {/* Network */}
        <div
          className="p-5 rounded-xl group cursor-pointer transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.05) 100%)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/15 border border-orange-500/25">
              <MapPin className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-xs font-semibold text-orange-300 px-2 py-1 rounded bg-orange-500/10">Live</span>
          </div>
          <p className="text-xs text-white/50 mb-1">Positions tracées</p>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-white/40 mt-2">En Europe</p>
        </div>
      </div>
    </div>
  );
}
