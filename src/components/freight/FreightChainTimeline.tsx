import { CheckCircle, Lock, MapPin } from 'lucide-react';
import type { FreightChainLeg } from '../../lib/freightTypes';
import { FREIGHT_STATUS_LABELS, formatFreightCurrency } from '../../lib/freightTypes';

interface FreightChainTimelineProps {
  legs: FreightChainLeg[];
  currentLegOrder?: number;
}

export function FreightChainTimeline({ legs, currentLegOrder = 1 }: FreightChainTimelineProps) {
  return (
    <div className="freight-chain-timeline space-y-0">
      {legs.map((leg, i) => {
        const isActive = leg.leg_order === currentLegOrder && !leg.leg_locked && leg.status !== 'delivered';
        const isDone = leg.status === 'delivered';
        const isLocked = leg.leg_locked && !isDone;

        return (
          <div key={leg.id} className="freight-chain-leg flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                isDone ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                isActive ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                isLocked ? 'bg-white/5 border-white/10 text-white/25' :
                'bg-white/5 border-white/15 text-white/40'
              }`}>
                {isDone ? <CheckCircle className="w-4 h-4" /> :
                 isLocked ? <Lock className="w-3.5 h-3.5" /> :
                 <span className="text-xs font-black">{leg.leg_order}</span>}
              </div>
              {i < legs.length - 1 && <div className="freight-chain-line w-0.5 flex-1 min-h-[24px] my-1" />}
            </div>
            <div className={`flex-1 pb-4 ${isLocked ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-white/35">Étape {leg.leg_order}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                  isDone ? 'text-emerald-400 border-emerald-500/25' :
                  isLocked ? 'text-white/30 border-white/10' :
                  'text-blue-400 border-blue-500/25'
                }`}>
                  {isLocked ? 'Verrouillé' : FREIGHT_STATUS_LABELS[leg.status]}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-sm font-bold text-white">{leg.departure_city} → {leg.arrival_city}</p>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{leg.cargo ?? '—'} · {leg.distance_km} km · {formatFreightCurrency(leg.price)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
