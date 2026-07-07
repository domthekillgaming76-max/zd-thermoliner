import { Truck, Gauge, Wrench, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fmtEuro } from '../../lib/format';
import type { FleetDashboardStats } from '../../lib/fleetTypes';

interface FleetDashboardProps {
  stats: FleetDashboardStats;
  loading?: boolean;
}

export function FleetDashboard({ stats, loading }: FleetDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="fleet-glass h-24 shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total camions', value: stats.totalTrucks, icon: Truck, accent: 'text-white' },
    { label: 'Disponibles', value: stats.availableTrucks, icon: CheckCircle2, accent: 'text-emerald-400' },
    { label: 'En service', value: stats.inServiceTrucks, icon: Truck, accent: 'text-red-400' },
    { label: 'Maintenance', value: stats.maintenanceTrucks, icon: Wrench, accent: 'text-amber-400' },
    { label: 'Retirés', value: stats.retiredTrucks, icon: Truck, accent: 'text-white/40' },
    { label: 'Km moyen', value: stats.averageMileage.toLocaleString('fr-FR'), icon: Gauge, accent: 'text-white' },
    { label: 'Coût mensuel', value: fmtEuro(stats.monthlyFleetCost), icon: TrendingUp, accent: 'text-amber-400' },
    { label: 'Rentabilité flotte', value: fmtEuro(stats.fleetProfitability), icon: TrendingUp, accent: stats.fleetProfitability >= 0 ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={c.label} className="fleet-stat-card rounded-xl p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <c.icon className={`w-5 h-5 mb-2 ${c.accent}`} />
            <p className="text-xl font-black text-white">{c.value}</p>
            <p className="text-[10px] text-white/35 uppercase tracking-wide mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {stats.maintenanceAlerts > 0 && (
        <div className="fleet-glass rounded-xl p-4 flex items-center gap-3 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            <span className="font-bold">{stats.maintenanceAlerts}</span> alerte{stats.maintenanceAlerts > 1 ? 's' : ''} maintenance / assurance à traiter
          </p>
        </div>
      )}
    </div>
  );
}
