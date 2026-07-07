import { AlertTriangle, Bell, ShieldAlert } from 'lucide-react';
import type { VaultAlert } from '../../lib/vaultTypes';
import { VAULT_ALERT_LABELS } from '../../lib/vaultTypes';

interface VaultAlertsPanelProps {
  alerts: VaultAlert[];
}

const SEVERITY_STYLES = {
  info: 'border-blue-500/20 bg-blue-500/5 text-blue-300',
  warning: 'border-amber-500/25 bg-amber-500/8 text-amber-300',
  danger: 'border-red-500/25 bg-red-500/8 text-red-300',
};

export function VaultAlertsPanel({ alerts }: VaultAlertsPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="vault-glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white">Alertes coffre-fort</h3>
        <span className="text-xs text-white/35 ml-auto">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {alerts.slice(0, 8).map(alert => (
          <div
            key={alert.id}
            className={`rounded-xl px-3 py-2.5 border text-xs flex items-start gap-2 ${SEVERITY_STYLES[alert.severity]}`}
          >
            {alert.severity === 'danger' ? (
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{VAULT_ALERT_LABELS[alert.type]}</p>
              <p className="opacity-80 mt-0.5">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
