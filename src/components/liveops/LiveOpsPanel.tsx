import {
  Users, Truck, TrendingUp, TrendingDown, Wallet, FileText, Container, Activity, RefreshCw,
} from 'lucide-react';
import type { LiveOpsMetrics } from '../../lib/liveOpsTypes';
import { formatLiveEuro, LIVE_OPS_STATUS_COLORS } from '../../lib/liveOpsTypes';

interface LiveOpsPanelProps {
  metrics: LiveOpsMetrics;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const KPIS = [
  { key: 'connectedDrivers', label: 'Chauffeurs connectés', icon: Users, color: 'text-cyan-400', format: (n: number) => String(n) },
  { key: 'deliveriesInProgress', label: 'Livraisons en cours', icon: Truck, color: 'text-orange-400', format: (n: number) => String(n) },
  { key: 'revenueToday', label: 'Revenus du jour', icon: TrendingUp, color: 'text-emerald-400', format: formatLiveEuro },
  { key: 'expensesToday', label: 'Dépenses du jour', icon: TrendingDown, color: 'text-red-400', format: formatLiveEuro },
  { key: 'netProfitToday', label: 'Bénéfice net jour', icon: Wallet, color: 'text-blue-400', format: formatLiveEuro },
  { key: 'pendingRoadSheets', label: 'Feuilles en attente', icon: FileText, color: 'text-amber-400', format: (n: number) => String(n) },
  { key: 'activeFreightOffers', label: 'Offres fret actives', icon: Container, color: 'text-purple-400', format: (n: number) => String(n) },
] as const;

export function LiveOpsPanel({ metrics, loading, onRefresh, refreshing }: LiveOpsPanelProps) {
  const statusBadge = LIVE_OPS_STATUS_COLORS[metrics.systemStatus];

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
            <Activity className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Opérations temps réel</h2>
            <p className="text-[11px] text-white/30">Mise à jour automatique</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusBadge}`}>
            {metrics.systemStatus === 'ok' ? 'Système OK' : metrics.systemStatus === 'degraded' ? 'Dégradé' : 'Incident'}
          </span>
          {onRefresh && (
            <button type="button" onClick={onRefresh} disabled={refreshing}
              className="btn-secondary p-2 rounded-xl">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KPIS.map(kpi => {
              const value = metrics[kpi.key as keyof LiveOpsMetrics] as number;
              return (
                <div key={kpi.key} className="erp-card rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                    <p className="text-[9px] uppercase tracking-wide text-white/35 font-semibold">{kpi.label}</p>
                  </div>
                  <p className="text-lg font-bold text-white">{kpi.format(value)}</p>
                </div>
              );
            })}
            <div className="erp-card rounded-xl p-3 col-span-2 lg:col-span-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-[9px] uppercase tracking-wide text-white/35 font-semibold">Statut système</p>
              </div>
              <p className="text-xs text-white/60 line-clamp-2">{metrics.systemMessage}</p>
            </div>
          </div>
          <p className="text-[10px] text-white/25 mt-3 text-right">
            Dernière MAJ : {new Date(metrics.lastUpdated).toLocaleTimeString('fr-FR')}
          </p>
        </>
      )}
    </div>
  );
}
