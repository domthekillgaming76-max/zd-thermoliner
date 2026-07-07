import { AlertTriangle, CheckCircle2, Clock, Package, Truck, Users, Zap } from 'lucide-react';
import type { DispatchDashboardStats } from '../../lib/dispatchTypes';

interface DispatchDashboardProps {
  stats: DispatchDashboardStats;
  loading?: boolean;
}

export function DispatchDashboard({ stats, loading }: DispatchDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="dispatch-glass h-24 shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Missions aujourd\'hui', value: stats.missionsToday, icon: Clock, accent: 'text-white' },
    { label: 'En attente', value: stats.missionsPending, icon: Package, accent: 'text-amber-400' },
    { label: 'En cours', value: stats.missionsInProgress, icon: Truck, accent: 'text-red-400' },
    { label: 'Terminées (mois)', value: stats.missionsCompleted, icon: CheckCircle2, accent: 'text-emerald-400' },
    { label: 'Chauffeurs dispo', value: stats.availableDrivers, icon: Users, accent: 'text-blue-400' },
    { label: 'Camions dispo', value: stats.availableTrucks, icon: Truck, accent: 'text-white/70' },
    { label: 'Livraisons urgentes', value: stats.urgentDeliveries, icon: Zap, accent: 'text-red-400' },
    { label: 'Volume mensuel', value: stats.monthlyDeliveryVolume, icon: Package, accent: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={c.label} className="dispatch-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <c.icon className={`w-5 h-5 mb-2 ${c.accent}`} />
            <p className="text-xl font-black text-white">{c.value}</p>
            <p className="text-[10px] text-white/35 uppercase tracking-wide mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {stats.urgentDeliveries > 0 && (
        <div className="dispatch-glass rounded-xl p-4 flex items-center gap-3 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-200">
            <span className="font-bold">{stats.urgentDeliveries}</span> livraison{stats.urgentDeliveries > 1 ? 's' : ''} urgente{stats.urgentDeliveries > 1 ? 's' : ''} à traiter
          </p>
        </div>
      )}
    </div>
  );
}
