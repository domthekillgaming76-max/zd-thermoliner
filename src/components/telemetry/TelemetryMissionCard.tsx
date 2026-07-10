import {
  Fuel, Gauge, MapPin, Radio, Truck, AlertTriangle, Clock, Wifi, WifiOff,
} from 'lucide-react';
import {
  GAME_BADGE,
  TELEMETRY_STATUS_LABELS,
  getJobProgress,
  isJobOnline,
  type TelemetryJob,
} from '../../lib/telemetryJobTypes';
import { fmtEuro } from '../../lib/format';
import { DEFAULT_AVATAR_URL } from '../../lib/profileDefaults';

interface TelemetryMissionCardProps {
  job: TelemetryJob;
  onSelect?: (job: TelemetryJob) => void;
  compact?: boolean;
}

export function TelemetryMissionCard({ job, onSelect, compact }: TelemetryMissionCardProps) {
  const st = TELEMETRY_STATUS_LABELS[job.status] ?? TELEMETRY_STATUS_LABELS.active;
  const game = GAME_BADGE[job.game];
  const progress = getJobProgress(job);
  const online = isJobOnline(job);
  const speed = Number(job.metadata?.last_speed_kmh ?? job.avg_speed_kmh ?? 0);
  const fuel = job.fuel_end ?? job.fuel_start;
  const damage = Number(job.truck_damage_end ?? job.truck_damage_start ?? 0)
    + Number(job.trailer_damage_end ?? 0);
  const remaining = job.metadata?.last_remaining_km ?? job.expected_distance_km;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(job)}
      onKeyDown={e => e.key === 'Enter' && onSelect?.(job)}
      className="dispatch-glass rounded-xl p-4 border border-red-500/10 hover:border-red-500/25 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <img
          src={job.avatar_url || DEFAULT_AVATAR_URL}
          alt=""
          className="w-10 h-10 rounded-full border border-white/10 object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{job.driver_name ?? 'Chauffeur'}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${game.className}`}>{game.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50 mt-1">
            {online ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-white/25" />}
            <span>{online ? 'En ligne' : 'Hors ligne'}</span>
            {job.last_sync_at && (
              <span className="text-white/30">· sync {new Date(job.last_sync_at).toLocaleTimeString('fr-FR')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-white/70 mb-2">
        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
        <span className="truncate">{job.source_city} → {job.destination_city}</span>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2 text-[10px] text-white/40 mb-3">
          {job.truck_name && <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" />{job.truck_name}</span>}
          {job.cargo && <span>{job.cargo}</span>}
          {job.expected_income != null && <span className="text-emerald-400/80">{fmtEuro(job.expected_income)}</span>}
        </div>
      )}

      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-white/40 mb-1">
          <span>Progression</span>
          <span className="text-red-300 font-semibold">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="flex items-center gap-1 text-white/50">
          <Gauge className="w-3 h-3 text-red-400" />
          <span>{Math.round(speed)} km/h</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <Fuel className="w-3 h-3 text-amber-400" />
          <span>{fuel != null ? `${Math.round(fuel)} L` : '—'}</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          <span>{(damage * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <Radio className="w-3 h-3 text-blue-400" />
          <span>{remaining != null ? `${Math.round(Number(remaining))} km` : '—'}</span>
        </div>
      </div>

      {typeof job.metadata?.eta_at === 'string' && !compact && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-white/35">
          <Clock className="w-3 h-3" />
          ETA {new Date(job.metadata.eta_at).toLocaleTimeString('fr-FR')}
        </div>
      )}
    </div>
  );
}
