import { AlertTriangle } from 'lucide-react';
import { ALERT_TYPE_LABELS, type DispatchAlert } from '../../lib/dispatchTypes';

interface DispatchAlertsPanelProps {
  alerts: DispatchAlert[];
  loading?: boolean;
}

export function DispatchAlertsPanel({ alerts, loading }: DispatchAlertsPanelProps) {
  if (loading) return <div className="dispatch-glass h-32 shimmer rounded-xl" />;

  return (
    <div className="dispatch-glass rounded-xl p-4 border border-amber-500/10">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Alertes dispatch ({alerts.length})</h3>
      </div>
      {alerts.length === 0 ? (
        <p className="text-white/30 text-sm">Aucune alerte active.</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.map(a => (
            <li key={a.id} className={`text-sm py-2 border-b border-white/5 flex gap-2 ${a.severity === 'high' ? 'text-red-300' : 'text-amber-200/80'}`}>
              <span className="text-[10px] uppercase font-bold shrink-0 w-24">{ALERT_TYPE_LABELS[a.alert_type]}</span>
              <span className="text-white/70">{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
