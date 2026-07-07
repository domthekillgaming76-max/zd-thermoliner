import { Trophy, Medal, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Driver } from '../../../../lib/supabase';
import { fmt } from '../../../../lib/format';

interface TeamLeaderboardProps {
  drivers: Driver[];
  loading?: boolean;
}

const PODIUM_STYLES = ['podium-1', 'podium-2', 'podium-3'];
const PODIUM_ICONS = [Trophy, Medal, Award];
const PODIUM_COLORS = ['#eab308', '#94a3b8', '#c2783c'];

export function TeamLeaderboard({ drivers, loading }: TeamLeaderboardProps) {
  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Top chauffeurs</h2>
            <p className="text-[11px] text-white/30">Classement par livraisons</p>
          </div>
        </div>
        <Link
          to="/drivers"
          className="text-xs text-red-400/80 hover:text-red-300 flex items-center gap-0.5 transition-colors"
        >
          Voir <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
          Aucun chauffeur enregistré
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {drivers.map((driver, i) => {
            const isPodium = i < 3;
            const Icon = isPodium ? PODIUM_ICONS[i] : null;
            const color = isPodium ? PODIUM_COLORS[i] : 'rgba(255,255,255,0.3)';

            return (
              <div
                key={driver.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isPodium ? PODIUM_STYLES[i] : 'bg-white/[0.02] border border-white/[0.04]'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-sm"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    color,
                  }}
                >
                  {Icon ? <Icon className="w-4 h-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {driver.name || driver.pseudo || 'Chauffeur'}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {driver.deliveries_count ?? 0} livraisons · {fmt(driver.total_km ?? 0)} km
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color }}>
                    #{i + 1}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
