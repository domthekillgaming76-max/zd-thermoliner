import { Bell, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { DashboardNotification } from '../../../types/dashboard';
import { fmtDateTime } from '../../../lib/format';
import { Panel, PanelHeader } from '../Panel';
import { EmptyState } from '../EmptyState';
import { SkeletonList } from '../Skeleton';

function NotifIcon({ type }: { type: string }) {
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  if (type === 'error') return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
}

interface NotificationCenterProps {
  notifications: DashboardNotification[];
  loading?: boolean;
}

export function NotificationCenter({ notifications, loading }: NotificationCenterProps) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Centre de notifications"
        icon={Bell}
        action={
          unread > 0 ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-red-400"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {unread} non lue{unread > 1 ? 's' : ''}
            </span>
          ) : undefined
        }
      />
      {loading ? (
        <SkeletonList count={4} height="h-16" />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour." />
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex gap-3 p-3 rounded-xl transition-colors ${
                !n.read ? 'bg-red-500/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
              style={{ border: `1px solid ${!n.read ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)'}` }}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  {!n.read && <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0 mt-1" />}
                </div>
                {n.message && (
                  <p className="text-[10px] text-white/35 mt-0.5 line-clamp-2">{n.message}</p>
                )}
                <p className="text-[10px] text-white/20 mt-1">{fmtDateTime(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
