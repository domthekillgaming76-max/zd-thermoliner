import { useMemo, useState } from 'react';
import { MapPin, Calendar, Package } from 'lucide-react';
import type { TransportMission, MissionStatus } from '../../lib/dispatchTypes';
import { MISSION_STATUS_COLORS, MISSION_STATUS_LABELS } from '../../lib/driverPortalTypes';

const TRACK_STATUSES: MissionStatus[] = ['planned', 'assigned', 'in_progress', 'delivered', 'cancelled'];

interface DriverMissionsPanelProps {
  missions: TransportMission[];
}

export function DriverMissionsPanel({ missions }: DriverMissionsPanelProps) {
  const [filter, setFilter] = useState<'all' | MissionStatus>('all');

  const filtered = useMemo(() => {
    const list = [...missions].sort(
      (a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime(),
    );
    if (filter === 'all') return list;
    return list.filter(m => m.status === filter);
  }, [missions, filter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: missions.length };
    for (const s of TRACK_STATUSES) {
      map[s] = missions.filter(m => m.status === s).length;
    }
    return map;
  }, [missions]);

  return (
    <div className="space-y-4 driver-portal-fade-in">
      <div>
        <h2 className="text-lg font-black text-white">Suivi missions</h2>
        <p className="text-xs text-white/40 mt-0.5">Planifiées, en cours, livrées et annulées</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <FilterChip
          label={`Toutes (${counts.all})`}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {TRACK_STATUSES.map(status => (
          <FilterChip
            key={status}
            label={`${MISSION_STATUS_LABELS[status]} (${counts[status] ?? 0})`}
            active={filter === status}
            onClick={() => setFilter(status)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="driver-portal-glass rounded-2xl p-8 text-center">
          <p className="text-sm text-white/45">Aucune mission dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mission, i) => (
            <article
              key={mission.id}
              className="driver-portal-mission-card rounded-2xl p-4 space-y-3"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-white/35 font-mono">{mission.reference ?? mission.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="font-bold text-white truncate">
                      {mission.departure_city} → {mission.arrival_city}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border font-bold shrink-0 ${MISSION_STATUS_COLORS[mission.status]}`}>
                  {MISSION_STATUS_LABELS[mission.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-white/45">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(mission.delivery_date).toLocaleDateString('fr-FR')}
                </span>
                {mission.cargo && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {mission.cargo}
                  </span>
                )}
                {mission.distance_km > 0 && (
                  <span>{mission.distance_km} km</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
          : 'bg-white/5 text-white/40 border border-white/8'
      }`}
    >
      {label}
    </button>
  );
}
