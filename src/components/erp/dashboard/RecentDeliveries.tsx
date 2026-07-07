import { PackageCheck, Route } from 'lucide-react';
import type { RoadSheet } from '../../../lib/supabase';
import { fmt, fmtDate } from '../../../lib/format';
import { Panel, PanelHeader } from '../Panel';
import { EmptyState } from '../EmptyState';

interface RecentDeliveriesProps {
  deliveries: RoadSheet[];
  loading?: boolean;
}

export function RecentDeliveries({ deliveries, loading }: RecentDeliveriesProps) {
  return (
    <Panel className="h-full">
      <PanelHeader title="Livraisons récentes" icon={PackageCheck} to="/road-sheets" />
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <EmptyState icon={Route} title="Aucune livraison validée" description="Les livraisons apparaîtront ici une fois validées." />
      ) : (
        <div className="space-y-2">
          {deliveries.map(sheet => (
            <div
              key={sheet.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03] group"
              style={{ border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
              >
                <PackageCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {sheet.departure || sheet.departure_city || '?'} → {sheet.arrival || sheet.arrival_city || '?'}
                </p>
                <p className="text-[10px] text-white/30 truncate">
                  {sheet.driver_name || 'Chauffeur'} · {fmtDate(sheet.date || sheet.created_at)}
                  {sheet.km ? ` · ${fmt(sheet.km)} km` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-emerald-400">{fmt(Number(sheet.revenue || 0))} €</p>
                <p className="text-[10px] text-emerald-400/50">Validée</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
