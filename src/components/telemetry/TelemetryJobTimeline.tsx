import { Clock, Gauge, Fuel, MapPin, Pause, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useTelemetryJobTimeline } from '../../hooks/useTelemetryJobs';
import type { TelemetryJob } from '../../lib/telemetryJobTypes';

interface TelemetryJobTimelineProps {
  job: TelemetryJob;
}

const EVENT_ICONS: Record<string, typeof Play> = {
  active: Play,
  paused: Pause,
  on_route: Play,
  driving: Play,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

export function TelemetryJobTimeline({ job }: TelemetryJobTimelineProps) {
  const { data: updates = [], isLoading } = useTelemetryJobTimeline(job.id);

  const events = [
    {
      id: 'start',
      at: job.started_at,
      label: 'Départ',
      detail: `${job.source_city} → ${job.destination_city}`,
      icon: Play,
      color: 'text-emerald-400',
    },
    ...updates.slice(0, 8).map((u) => ({
      id: u.id,
      at: u.created_at,
      label: u.status === 'paused' ? 'Pause' : 'Synchronisation',
      detail: [
        u.speed_kmh != null ? `${Math.round(u.speed_kmh)} km/h` : null,
        u.progress_percent != null ? `${Math.round(u.progress_percent)}%` : null,
        u.distance_remaining_km != null ? `${Math.round(u.distance_remaining_km)} km restants` : null,
      ].filter(Boolean).join(' · ') || 'Mise à jour télémétrie',
      icon: EVENT_ICONS[u.status ?? ''] ?? Gauge,
      color: u.status === 'paused' ? 'text-amber-400' : 'text-blue-400',
    })),
    ...(job.completed_at ? [{
      id: 'end',
      at: job.completed_at,
      label: 'Livraison terminée',
      detail: `${Math.round(Number(job.actual_distance_km ?? job.expected_distance_km ?? 0))} km · ${job.final_income != null ? `${job.final_income} €` : ''}`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    }] : []),
    ...(job.cancelled_at ? [{
      id: 'cancel',
      at: job.cancelled_at,
      label: 'Annulée',
      detail: job.cancel_reason || 'Mission annulée',
      icon: XCircle,
      color: 'text-red-400',
    }] : []),
  ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());

  const durationMin = job.started_at && (job.completed_at || job.last_sync_at)
    ? Math.round((new Date(job.completed_at || job.last_sync_at!).getTime() - new Date(job.started_at).getTime()) / 60000)
    : null;

  return (
    <div className="erp-card rounded-xl p-4 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-400" />
          Timeline livraison
        </h4>
        {durationMin != null && (
          <span className="text-[10px] text-white/40">Durée : {durationMin} min</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-white/30">Chargement…</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {events.map((ev) => (
            <li key={ev.id} className="flex gap-3 text-xs py-1.5 border-b border-white/5 last:border-0">
              <ev.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ev.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-white/80">{ev.label}</span>
                  {ev.at && (
                    <span className="text-white/30 shrink-0">
                      {new Date(ev.at).toLocaleTimeString('fr-FR')}
                    </span>
                  )}
                </div>
                <p className="text-white/40 truncate">{ev.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-white/40">
        <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{job.fuel_used ?? job.fuel_end ?? '—'} L</span>
        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{job.avg_speed_kmh ? `${Math.round(job.avg_speed_kmh)} km/h` : '—'}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.actual_distance_km ?? job.expected_distance_km ?? '—'} km</span>
      </div>
    </div>
  );
}
