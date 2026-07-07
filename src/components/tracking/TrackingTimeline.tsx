import type { RouteProgressEntry } from '../../lib/trackingTypes';
import { TRACKING_STATUS_LABELS } from '../../lib/trackingTypes';
import type { TrackingStatus } from '../../lib/trackingTypes';

interface TrackingTimelineProps {
  entries: RouteProgressEntry[];
  trackingId?: string;
}

export function TrackingTimeline({ entries, trackingId }: TrackingTimelineProps) {
  const filtered = trackingId
    ? entries.filter(e => e.tracking_id === trackingId).slice(0, 8)
    : entries.slice(0, 8);

  if (filtered.length === 0) {
    return (
      <div className="tracking-glass rounded-2xl p-4 text-sm text-white/40">
        Aucun historique de progression.
      </div>
    );
  }

  return (
    <div className="tracking-glass rounded-2xl p-4 space-y-0">
      <h3 className="text-sm font-bold text-white mb-3">Timeline</h3>
      {filtered.map((entry, i) => (
        <div key={entry.id} className="tracking-timeline-item flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20" />
            {i < filtered.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
          </div>
          <div className="flex-1 min-w-0 -mt-0.5">
            <p className="text-xs font-semibold text-white">
              {entry.status
                ? TRACKING_STATUS_LABELS[entry.status as TrackingStatus] ?? entry.status
                : 'Mise à jour'}
              {' — '}{entry.progress_percent}%
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {new Date(entry.recorded_at).toLocaleString('fr-FR')} · {entry.remaining_km} km restants
            </p>
            {entry.notes && <p className="text-[10px] text-white/30 mt-0.5">{entry.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
