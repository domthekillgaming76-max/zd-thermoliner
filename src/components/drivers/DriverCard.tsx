import { Edit, Trash2, ChevronRight, Circle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DRIVING_STATUS_LABELS,
  PRESENCE_STATUS_LABELS,
  getMemberRoleLabel,
  type DriverProfile,
} from '../../lib/driverTypes';

interface DriverCardProps {
  driver: DriverProfile;
  truckLabel?: string;
  onEdit?: (driver: DriverProfile) => void;
  onDelete?: (id: string) => void;
}

export function DriverCard({ driver, truckLabel, onEdit, onDelete }: DriverCardProps) {
  const driving = DRIVING_STATUS_LABELS[driver.driving_status] ?? DRIVING_STATUS_LABELS.resting;
  const presence = PRESENCE_STATUS_LABELS[driver.presence_status] ?? PRESENCE_STATUS_LABELS.offline;

  return (
    <div className="driver-glass driver-card-hover rounded-2xl p-4 group border border-white/5">
      <div className="flex items-start gap-3 mb-3">
        <Link to={`/drivers/${driver.id}`} className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-lg text-white driver-avatar-glow"
          style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)' }}>
          {driver.photo_url || driver.avatar_url
            ? <img src={driver.photo_url ?? driver.avatar_url ?? ''} alt="" className="w-full h-full object-cover" />
            : driver.name[0]?.toUpperCase()}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/drivers/${driver.id}`} className="text-white font-bold truncate block hover:text-red-300 transition-colors">
            {driver.name}
          </Link>
          {driver.pseudo && <p className="text-white/40 text-xs">@{driver.pseudo}</p>}
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-red-500/10 text-red-400 border-red-500/20">
              {getMemberRoleLabel(driver.member_role)}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${driving.color}`}>{driving.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${presence.color}`}>
              <Circle className={`w-1.5 h-1.5 fill-current ${presence.dot}`} />
              {presence.label}
            </span>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button type="button" onClick={() => onEdit(driver)} className="w-7 h-7 hover:bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Edit className="w-3.5 h-3.5 text-white/30 hover:text-blue-400" />
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(driver.id)} className="w-7 h-7 hover:bg-red-500/10 rounded-lg flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5 text-white/30 hover:text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
        <div><p className="text-white font-bold">{driver.total_km.toLocaleString('fr-FR')}</p><p className="text-white/30">km</p></div>
        <div><p className="text-white font-bold">{driver.deliveries_count}</p><p className="text-white/30">livraisons</p></div>
        <div className="flex flex-col items-center">
          <p className="text-white font-bold flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{driver.driver_rating || '—'}</p>
          <p className="text-white/30">note</p>
        </div>
      </div>
      {driver.country && <p className="text-[10px] text-white/35 truncate mb-1">📍 {driver.country}</p>}
      {truckLabel && <p className="text-[10px] text-white/35 truncate mb-2">🚛 {truckLabel}</p>}
      <Link to={`/drivers/${driver.id}`} className="flex items-center justify-center gap-1 text-xs text-red-400 font-semibold hover:text-red-300">
        Voir le profil <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
