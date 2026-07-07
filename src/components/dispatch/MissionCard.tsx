import { MapPin, Package, Thermometer, AlertTriangle, User, Truck as TruckIcon } from 'lucide-react';
import {
  MISSION_STATUS_LABELS,
  MISSION_PRIORITY_LABELS,
  type TransportMission,
} from '../../lib/dispatchTypes';
import { fmtEuro } from '../../lib/format';

interface MissionCardProps {
  mission: TransportMission;
  onSelect?: (mission: TransportMission) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, mission: TransportMission) => void;
}

export function MissionCard({ mission, onSelect, draggable, onDragStart }: MissionCardProps) {
  const st = MISSION_STATUS_LABELS[mission.status];
  const pr = MISSION_PRIORITY_LABELS[mission.priority];

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={e => onDragStart?.(e, mission)}
      onClick={() => onSelect?.(mission)}
      onKeyDown={e => e.key === 'Enter' && onSelect?.(mission)}
      className="dispatch-glass dispatch-card-hover rounded-xl p-4 border border-white/5 cursor-pointer group"
      style={{ borderLeftColor: st.color.includes('red') ? '#ef4444' : undefined, borderLeftWidth: mission.priority === 'urgent' ? 3 : undefined }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs font-mono text-white/35">{mission.reference}</p>
          <p className="text-sm font-bold text-white mt-0.5">{mission.client_name ?? 'Client'}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-white/60 mb-2">
        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
        <span className="truncate">{mission.departure_city} → {mission.arrival_city}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-white/40 mb-2">
        <span>{new Date(mission.delivery_date).toLocaleDateString('fr-FR')}</span>
        {mission.cargo && <span className="flex items-center gap-0.5"><Package className="w-3 h-3" />{mission.cargo}</span>}
        {mission.temperature_required && <Thermometer className="w-3 h-3 text-blue-400" />}
        {mission.adr_required && <AlertTriangle className="w-3 h-3 text-amber-400" />}
        <span className={pr.color}>{pr.label}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-[10px] text-white/35">
          {mission.driver_name && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{mission.driver_name}</span>}
          {mission.truck_label && <span className="flex items-center gap-0.5"><TruckIcon className="w-3 h-3" />{mission.truck_label.split(' ')[0]}</span>}
        </div>
        <span className="text-sm font-bold text-emerald-400">{fmtEuro(mission.price)}</span>
      </div>
    </div>
  );
}
