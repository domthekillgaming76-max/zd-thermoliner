import type { ElementType } from 'react';
import { Shield, LogIn, LogOut, AlertTriangle, KeyRound, FileCheck, Banknote, UserCog } from 'lucide-react';
import { SECURITY_EVENT_LABELS, type AdminAction, type SecurityLog } from '../../lib/adminTypes';

interface SecurityTimelineProps {
  securityLogs: SecurityLog[];
  adminActions: AdminAction[];
  loading?: boolean;
}

const EVENT_ICONS: Partial<Record<string, ElementType>> = {
  login: LogIn,
  logout: LogOut,
  failed_access_attempt: AlertTriangle,
  role_change: KeyRound,
  road_sheet_validation: FileCheck,
  bank_action: Banknote,
  account_suspend: AlertTriangle,
  account_reactivate: Shield,
  permission_change: KeyRound,
  profile_update: UserCog,
  account_delete: AlertTriangle,
};

export function SecurityTimeline({ securityLogs, adminActions, loading }: SecurityTimelineProps) {
  if (loading) return <div className="admin-glass h-48 shimmer rounded-xl" />;

  const items = [
    ...securityLogs.map(l => ({
      id: `s-${l.id}`,
      date: l.created_at,
      eventType: l.event_type,
      title: SECURITY_EVENT_LABELS[l.event_type] ?? l.event_type,
      message: l.message ?? '',
      severity: l.event_type === 'failed_access_attempt' ? 'high' : 'normal',
    })),
    ...adminActions.map(a => ({
      id: `a-${a.id}`,
      date: a.created_at,
      eventType: a.action_type,
      title: `Admin: ${a.action_type.replace(/_/g, ' ')}`,
      message: JSON.stringify(a.details),
      severity: 'normal' as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25);

  return (
    <div className="admin-glass rounded-xl p-4 border border-white/5">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-red-400" />
        Timeline sécurité
      </h3>
      {items.length === 0 ? (
        <p className="text-white/30 text-sm">Aucun événement récent.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {items.map(item => {
            const Icon = EVENT_ICONS[item.eventType] ?? Shield;
            return (
              <li key={item.id} className="admin-timeline-item flex gap-3 py-2 border-b border-white/5 text-sm">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${item.severity === 'high' ? 'text-red-400' : 'text-white/40'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 font-medium">{item.title}</p>
                  {item.message && <p className="text-white/35 text-xs truncate">{item.message}</p>}
                  <p className="text-[10px] text-white/25 mt-0.5">
                    {new Date(item.date).toLocaleString('fr-FR')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
