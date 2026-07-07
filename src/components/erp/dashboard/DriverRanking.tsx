import { Trophy, Users } from 'lucide-react';
import type { Driver } from '../../../lib/supabase';
import { fmt } from '../../../lib/format';
import { Panel, PanelHeader } from '../Panel';
import { EmptyState } from '../EmptyState';
import { SkeletonList } from '../Skeleton';

interface DriverRankingProps {
  drivers: Driver[];
  loading?: boolean;
}

export function DriverRanking({ drivers, loading }: DriverRankingProps) {
  return (
    <Panel className="h-full">
      <PanelHeader title="Classement chauffeurs" icon={Trophy} to="/drivers" />
      {loading ? (
        <SkeletonList count={5} height="h-12" />
      ) : drivers.length === 0 ? (
        <EmptyState icon={Users} title="Aucun chauffeur" />
      ) : (
        <div className="space-y-2">
          {drivers.map((driver, idx) => {
            const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
            const rankColor = idx < 3 ? rankColors[idx] : 'text-white/30';
            return (
              <div
                key={driver.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className={`w-6 text-center text-sm font-black ${rankColor}`}>#{idx + 1}</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {(driver.pseudo || driver.name)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{driver.pseudo || driver.name}</p>
                  <p className="text-[10px] text-white/30">
                    {driver.deliveries_count ?? 0} livraisons · {fmt(driver.total_km)} km
                  </p>
                </div>
                {idx === 0 && <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
