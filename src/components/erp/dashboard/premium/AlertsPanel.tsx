import { Bell, AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';
import type { DashboardNotification } from '../../../../types/dashboard';
import type { Truck } from '../../../../lib/supabase';
import { fmtDateTime } from '../../../../lib/format';

interface AlertsPanelProps {
  notifications: DashboardNotification[];
  maintenanceTrucks: Truck[];
  loading?: boolean;
}

export function AlertsPanel({ notifications, maintenanceTrucks, loading }: AlertsPanelProps) {
  const unread = notifications.filter(n => !n.read);
  const hasAlerts = unread.length > 0 || maintenanceTrucks.length > 0;

  return (
    <div className="premium-panel rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 relative">
            <Bell className="w-5 h-5 text-red-400" />
            {unread.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white">
                {unread.length}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Alertes & notifications</h2>
            <p className="text-[11px] text-white/30">
              {hasAlerts ? `${unread.length + maintenanceTrucks.length} élément(s) à traiter` : 'Tout est en ordre'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : !hasAlerts && notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mb-3" />
          <p className="text-sm text-white/40 font-medium">Aucune alerte active</p>
          <p className="text-[11px] text-white/20 mt-1">Tous les systèmes fonctionnent normalement</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto max-h-[320px]">
          {maintenanceTrucks.map(truck => (
            <div
              key={`maint-${truck.id}`}
              className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15"
            >
              <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-300">Maintenance requise</p>
                <p className="text-[10px] text-white/40 truncate">
                  {truck.registration || truck.model || 'Véhicule'} — intervention en cours
                </p>
              </div>
            </div>
          ))}

          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                notif.read
                  ? 'bg-white/[0.02] border border-white/[0.04]'
                  : 'bg-red-500/[0.06] border border-red-500/15'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${notif.read ? 'text-white/30' : 'text-red-400'}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${notif.read ? 'text-white/50' : 'text-white'}`}>
                  {notif.title}
                </p>
                {notif.message && (
                  <p className="text-[10px] text-white/30 truncate mt-0.5">{notif.message}</p>
                )}
                <p className="text-[10px] text-white/20 mt-1">{fmtDateTime(notif.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
