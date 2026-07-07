import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import type { Truck } from '../../../lib/supabase';
import { fmt } from '../../../lib/format';
import { Panel, PanelHeader } from '../Panel';
import { SkeletonList } from '../Skeleton';

interface MaintenanceAlertsProps {
  trucks: Truck[];
  loading?: boolean;
}

export function MaintenanceAlerts({ trucks, loading }: MaintenanceAlertsProps) {
  return (
    <Panel className="h-full">
      <PanelHeader title="Alertes maintenance" icon={Wrench} to="/fleet" />
      {loading ? (
        <SkeletonList count={3} height="h-16" />
      ) : trucks.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle className="w-10 h-10 text-emerald-400/30 mx-auto mb-3" />
          <p className="text-white/40 text-sm font-medium">Flotte opérationnelle</p>
          <p className="text-white/20 text-xs mt-1">Aucun véhicule en maintenance</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trucks.slice(0, 5).map(truck => (
            <div
              key={truck.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.12)' }}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{truck.registration}</p>
                <p className="text-[10px] text-white/35 truncate">
                  {[truck.brand, truck.model].filter(Boolean).join(' ') || 'Véhicule'} · {fmt(truck.mileage)} km
                </p>
              </div>
              <span
                className="text-[10px] font-semibold text-amber-400 px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                En cours
              </span>
            </div>
          ))}
          {trucks.length > 5 && (
            <Link to="/fleet" className="block text-center text-xs text-amber-400/70 hover:text-amber-300 pt-2">
              +{trucks.length - 5} autre{trucks.length - 5 > 1 ? 's' : ''} alerte{trucks.length - 5 > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}
    </Panel>
  );
}
