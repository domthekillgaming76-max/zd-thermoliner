import { Route } from 'lucide-react';
import type { RoadSheet } from '../../../lib/supabase';
import { fmt, fmtDate } from '../../../lib/format';
import { Panel, PanelHeader } from '../Panel';
import { EmptyState } from '../EmptyState';
import { SkeletonList } from '../Skeleton';

interface RecentRoadSheetsProps {
  sheets: RoadSheet[];
  loading?: boolean;
}

export function RecentRoadSheets({ sheets, loading }: RecentRoadSheetsProps) {
  return (
    <Panel className="h-full">
      <PanelHeader title="Dernières feuilles de route" icon={Route} to="/road-sheets" />
      {loading ? (
        <SkeletonList count={5} />
      ) : sheets.length === 0 ? (
        <EmptyState icon={Route} title="Aucune feuille de route" />
      ) : (
        <div className="space-y-2">
          {sheets.map(sheet => (
            <div
              key={sheet.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
              style={{ border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  sheet.validated ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {sheet.departure || sheet.departure_city || '?'} → {sheet.arrival || sheet.arrival_city || '?'}
                </p>
                <p className="text-[10px] text-white/30 truncate">
                  {sheet.driver_name || 'Chauffeur'} · {fmtDate(sheet.date || sheet.created_at)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-emerald-400">{fmt(Number(sheet.revenue || 0))} €</p>
                <p className={`text-[10px] ${sheet.validated ? 'text-emerald-400/50' : 'text-amber-400/70'}`}>
                  {sheet.validated ? 'Validée' : 'En attente'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
