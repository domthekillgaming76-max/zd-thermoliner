import { Edit, Trash2, ChevronRight, Truck as TruckIcon, User, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TRUCK_STATUS_LABELS, type FleetTruck } from '../../lib/fleetTypes';

interface TruckCardProps {
  truck: FleetTruck;
  onEdit?: (truck: FleetTruck) => void;
  onDelete?: (id: string) => void;
}

export function TruckCard({ truck, onEdit, onDelete }: TruckCardProps) {
  const st = TRUCK_STATUS_LABELS[truck.status] ?? TRUCK_STATUS_LABELS.active;

  return (
    <div className="fleet-glass fleet-card-hover rounded-2xl overflow-hidden group border border-white/5">
      <div className="h-40 relative overflow-hidden bg-black/40">
        {truck.photo_url ? (
          <img src={truck.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TruckIcon className="w-14 h-14 text-white/10" />
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.color}`}>
          {st.label}
        </span>
        {(onEdit || onDelete) && (
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button type="button" onClick={() => onEdit(truck)} className="w-7 h-7 bg-black/70 rounded-lg flex items-center justify-center hover:bg-blue-500/30">
                <Edit className="w-3.5 h-3.5 text-white/70" />
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(truck.id)} className="w-7 h-7 bg-black/70 rounded-lg flex items-center justify-center hover:bg-red-500/30">
                <Trash2 className="w-3.5 h-3.5 text-white/70" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-white font-bold truncate">
          {[truck.brand, truck.model].filter(Boolean).join(' ') || 'Camion'}
        </p>
        <p className="text-white/40 text-xs font-mono mt-0.5">{truck.registration}</p>
        <div className="flex flex-wrap gap-3 text-[11px] text-white/40 mt-3">
          <span>{truck.mileage.toLocaleString('fr-FR')} km</span>
          {truck.fuel_consumption > 0 && <span>{truck.fuel_consumption} L/100</span>}
        </div>
        {truck.driver_name && (
          <p className="text-[11px] text-white/50 mt-2 flex items-center gap-1 truncate">
            <User className="w-3 h-3 text-red-400" /> {truck.driver_name}
          </p>
        )}
        {truck.garage_name && (
          <p className="text-[11px] text-white/35 mt-1 flex items-center gap-1 truncate">
            <Building2 className="w-3 h-3" /> {truck.garage_name}
          </p>
        )}
        <Link to={`/fleet/${truck.id}`} className="mt-3 flex items-center justify-center gap-1 text-xs text-red-400 font-semibold hover:text-red-300">
          Voir le profil <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
