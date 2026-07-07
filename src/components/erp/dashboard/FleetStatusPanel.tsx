import { Truck } from 'lucide-react';
import type { FleetStatus } from '../../../types/dashboard';
import { Panel, PanelHeader } from '../Panel';
import { Skeleton } from '../Skeleton';

interface FleetStatusPanelProps {
  fleet: FleetStatus;
  loading?: boolean;
}

const BARS = [
  { key: 'active' as const, label: 'Actifs', color: '#34d399' },
  { key: 'maintenance' as const, label: 'Maintenance', color: '#fbbf24' },
  { key: 'retired' as const, label: 'Retraités', color: '#6b7280' },
];

export function FleetStatusPanel({ fleet, loading }: FleetStatusPanelProps) {
  const total = fleet.total || 1;

  return (
    <Panel className="h-full">
      <PanelHeader title="État de la flotte" icon={Truck} to="/fleet" />
      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: 'Total', value: fleet.total, color: 'text-white' },
              { label: 'Actifs', value: fleet.active, color: 'text-emerald-400' },
              { label: 'Maint.', value: fleet.maintenance, color: 'text-amber-400' },
              { label: 'Dispo.', value: fleet.available, color: 'text-sky-400' },
            ].map(item => (
              <div
                key={item.label}
                className="text-center p-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <p className={`text-xl md:text-2xl font-black ${item.color}`}>{item.value}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {BARS.map(bar => {
              const count = fleet[bar.key];
              const pct = (count / total) * 100;
              return (
                <div key={bar.key}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white/40">{bar.label}</span>
                    <span className="text-white/60 font-semibold">{count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: bar.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}
