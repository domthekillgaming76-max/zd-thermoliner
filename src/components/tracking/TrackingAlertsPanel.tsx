import { AlertTriangle, Bell, Check } from 'lucide-react';
import type { TrackingAlert } from '../../lib/trackingTypes';
import { TRACKING_ALERT_LABELS } from '../../lib/trackingTypes';

interface TrackingAlertsPanelProps {
  alerts: TrackingAlert[];
  canAck?: boolean;
  onAcknowledge?: (id: string) => void;
}

const SEVERITY = {
  info: 'border-blue-500/20 bg-blue-500/5 text-blue-300',
  warning: 'border-amber-500/25 bg-amber-500/8 text-amber-300',
  danger: 'border-red-500/25 bg-red-500/8 text-red-300',
};

export function TrackingAlertsPanel({ alerts, canAck, onAcknowledge }: TrackingAlertsPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="tracking-glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Alertes tracking</h3>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {alerts.slice(0, 10).map(alert => (
          <div
            key={alert.id}
            className={`rounded-xl px-3 py-2.5 border text-xs flex items-start justify-between gap-2 ${SEVERITY[alert.severity]}`}
          >
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{TRACKING_ALERT_LABELS[alert.alert_type]}</p>
                <p className="opacity-80 mt-0.5">{alert.message}</p>
              </div>
            </div>
            {canAck && !alert.acknowledged && onAcknowledge && !alert.id.startsWith('computed-') && (
              <button
                type="button"
                onClick={() => onAcknowledge(alert.id)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Acquitter"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
