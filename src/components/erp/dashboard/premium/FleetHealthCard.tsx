import { Truck, Wrench, CheckCircle2, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { FleetStatus } from '../../../../types/dashboard';
import type { Truck as TruckType } from '../../../../lib/supabase';

interface FleetHealthCardProps {
  fleet: FleetStatus;
  maintenanceTrucks: TruckType[];
  loading?: boolean;
}

export function FleetHealthCard({ fleet, maintenanceTrucks, loading }: FleetHealthCardProps) {
  const segments = [
    { label: 'Actifs', value: fleet.active, color: '#34d399', icon: CheckCircle2 },
    { label: 'Disponibles', value: fleet.available, color: '#60a5fa', icon: Truck },
    { label: 'Maintenance', value: fleet.maintenance, color: '#fbbf24', icon: Wrench },
    { label: 'Retirés', value: fleet.retired, color: '#64748b', icon: Archive },
  ];

  const utilizationPct = fleet.total > 0 ? ((fleet.active - fleet.available) / fleet.total) * 100 : 0;

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
            <Truck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">État de la flotte</h2>
            <p className="text-[11px] text-white/30">{fleet.total} véhicules au total</p>
          </div>
        </div>
        <Link
          to="/fleet"
          className="text-xs text-red-400/80 hover:text-red-300 flex items-center gap-0.5 transition-colors"
        >
          Gérer <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 min-h-[200px] rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : (
        <>
          <div className="mb-5">
            <div className="flex items-end justify-between mb-2">
              <span className="text-[11px] text-white/40 font-medium">Taux d&apos;utilisation</span>
              <span className="text-lg font-black text-white">{utilizationPct.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full progress-neon transition-all duration-1000"
                style={{
                  width: `${Math.min(utilizationPct, 100)}%`,
                  background: 'linear-gradient(90deg, #34d399, #60a5fa)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {segments.map(seg => {
              const Icon = seg.icon;
              return (
                <div
                  key={seg.label}
                  className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: seg.color }} />
                    <span className="text-[10px] text-white/40 font-medium">{seg.label}</span>
                  </div>
                  <p className="text-xl font-black text-white">{seg.value}</p>
                </div>
              );
            })}
          </div>

          {maintenanceTrucks.length > 0 && (
            <div className="mt-auto pt-4 border-t border-white/[0.05]">
              <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider mb-2">
                En maintenance ({maintenanceTrucks.length})
              </p>
              <div className="space-y-1.5">
                {maintenanceTrucks.slice(0, 3).map(truck => (
                  <div key={truck.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-white/50 truncate">{truck.registration || truck.model || 'Camion'}</span>
                    <span className="text-amber-400/60 flex-shrink-0 ml-2">Maintenance</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
