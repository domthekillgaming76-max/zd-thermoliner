import { useMemo } from 'react';
import { AlertTriangle, Award, Fuel, TrendingUp, Truck, Users } from 'lucide-react';
import { KpiCard } from '../erp/KpiCard';
import { KpiGrid } from '../erp/KpiGrid';
import {
  buildExpirationAlerts,
  buildPerformanceRankings,
  type DocumentExpirationAlert,
  type DriverPerformanceRanking,
  type DriverProfile,
} from '../../lib/driverTypes';
import type { RoadSheet } from '../../lib/supabase';
import type { DriverDocument } from '../../lib/driverTypes';
import { fmtEuro } from '../../lib/format';

interface DriverDashboardProps {
  drivers: DriverProfile[];
  roadSheets: RoadSheet[];
  documents: DriverDocument[];
  loading?: boolean;
}

export function DriverDashboard({ drivers, roadSheets, documents, loading }: DriverDashboardProps) {
  const rankings = useMemo(() => {
    const map = new Map<string, RoadSheet[]>();
    for (const s of roadSheets) {
      if (!s.driver_id) continue;
      const list = map.get(s.driver_id) ?? [];
      list.push(s);
      map.set(s.driver_id, list);
    }
    return buildPerformanceRankings(drivers, map);
  }, [drivers, roadSheets]);

  const alerts = useMemo(() => buildExpirationAlerts(drivers, documents), [drivers, documents]);

  const activeDriving = drivers.filter(d => d.driving_status === 'driving').length;
  const onVacation = drivers.filter(d => d.driving_status === 'vacation' || d.driving_status === 'sick').length;

  return (
    <div className="space-y-6">
      <KpiGrid columns="4">
        <KpiCard label="Chauffeurs actifs" value={String(drivers.filter(d => d.status === 'active').length)} icon={Users} color="#34d399" glow="#34d399" loading={loading} />
        <KpiCard label="En route" value={String(activeDriving)} icon={Truck} color="#60a5fa" glow="#60a5fa" loading={loading} />
        <KpiCard label="Absents" value={String(onVacation)} icon={Users} color="#f59e0b" glow="#f59e0b" loading={loading} />
        <KpiCard label="Alertes documents" value={String(alerts.length)} icon={AlertTriangle} color="#ef4444" glow="#ef4444" loading={loading} />
      </KpiGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RankingCard title="Meilleur kilométrage" icon={Truck} ranking={rankings.bestDriver} metric={r => `${r?.totalKm.toLocaleString('fr-FR')} km`} />
        <RankingCard title="Meilleure rentabilité" icon={TrendingUp} ranking={rankings.bestProfitability} metric={r => fmtEuro(r?.netProfit ?? 0)} />
        <RankingCard title="Moins de carburant / km" icon={Fuel} ranking={rankings.leastFuel} metric={r => `${(r?.fuelPerKm ?? 0).toFixed(2)} €/km`} />
        <RankingCard title="Plus de livraisons" icon={Award} ranking={rankings.mostDeliveries} metric={r => `${r?.deliveries ?? 0} livraisons`} />
      </div>

      <DriverExpirationAlerts alerts={alerts} loading={loading} />
    </div>
  );
}

function RankingCard({
  title,
  icon: Icon,
  ranking,
  metric,
}: {
  title: string;
  icon: typeof Truck;
  ranking: DriverPerformanceRanking | null;
  metric: (r: DriverPerformanceRanking | null) => string;
}) {
  return (
    <div className="erp-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {ranking ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center font-bold text-white">
            {ranking.photoUrl ? <img src={ranking.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : ranking.driverName[0]}
          </div>
          <div>
            <p className="text-white font-semibold">{ranking.driverName}</p>
            <p className="text-emerald-400 text-sm font-bold">{metric(ranking)}</p>
            <p className="text-white/30 text-xs">Niveau {ranking.level}</p>
          </div>
        </div>
      ) : (
        <p className="text-white/30 text-sm">Aucune donnée</p>
      )}
    </div>
  );
}

function DriverExpirationAlerts({ alerts, loading }: { alerts: DocumentExpirationAlert[]; loading?: boolean }) {
  if (loading) return <div className="erp-card rounded-2xl p-5 h-32 shimmer" />;
  return (
    <div className="erp-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Rappels d&apos;expiration</h3>
      </div>
      {alerts.length === 0 ? (
        <p className="text-white/30 text-sm">Aucun document à renouveler dans les 60 prochains jours.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 8).map(a => (
            <li key={`${a.driverId}-${a.docType}`} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
              <span className="text-white/70">{a.driverName} — {a.docType}</span>
              <span className={a.daysLeft <= 14 ? 'text-red-400 font-bold' : 'text-amber-400'}>
                {a.daysLeft <= 0 ? 'Expiré' : `J-${a.daysLeft}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
