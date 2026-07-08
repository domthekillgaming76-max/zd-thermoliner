import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Container, FileText, Wallet, Megaphone, Building2, MessageSquare, Download } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { canAccessNotificationsPage } from '../lib/phase5Permissions';
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_POLL_MS,
} from '../services/notificationService';
import type { LiveNotification } from '../lib/liveOpsTypes';
import { supabase } from '../lib/supabase';

function getNotifIcon(type: string) {
  if (type === 'app_update') return <Download className="w-4 h-4 text-red-400" />;
  if (type === 'freight') return <Container className="w-4 h-4 text-purple-400" />;
  if (type === 'road_sheet') return <FileText className="w-4 h-4 text-orange-400" />;
  if (type === 'salary') return <Wallet className="w-4 h-4 text-emerald-400" />;
  if (type === 'hr') return <FileText className="w-4 h-4 text-red-400" />;
  if (type === 'wall_post' || type === 'wall_announcement' || type === 'wall_convoy') return <Building2 className="w-4 h-4 text-red-400" />;
  if (type === 'wall_comment') return <MessageSquare className="w-4 h-4 text-blue-400" />;
  if (type === 'wall_reaction') return <Megaphone className="w-4 h-4 text-amber-400" />;
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  if (type === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Info className="w-4 h-4 text-blue-400" />;
}

export function NotificationsPage() {
  const { user, role, normalizedRole } = useAuth();
  const liveRole = role ?? normalizedRole;
  const canAccess = canAccessNotificationsPage(liveRole, user?.email);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const list = await fetchUserNotifications(user.id, 100);
    setNotifications(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    void load();

    const ch = supabase
      .channel(`notifs_page_rt_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .subscribe();

    pollRef.current = setInterval(() => { void load(); }, NOTIFICATION_POLL_MS);

    return () => {
      ch.unsubscribe();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user?.id, load]);

  if (!canAccess) {
    return <Navigate to="/wall" replace state={{ accessDenied: 'Accès réservé aux membres.' }} />;
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    void load();
  }

  async function handleMarkAll() {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    void load();
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-end justify-between gap-3">
          <PageHeader title="Notifications" subtitle="Alertes en direct — actualisation automatique" icon={Bell} />
          {unread > 0 && (
            <button type="button" onClick={handleMarkAll} className="text-xs text-red-400 hover:text-red-300">
              Tout marquer comme lu ({unread})
            </button>
          )}
        </div>

        {loading ? (
          <div className="erp-card rounded-xl p-8 text-center text-white/30 text-sm">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="erp-card rounded-xl p-8 text-center text-white/30 text-sm">Aucune notification</div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => { if (!n.read) void handleMarkRead(n.id); }}
                className={`w-full text-left erp-card rounded-xl p-4 flex gap-3 transition-colors ${
                  !n.read ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/5'
                }`}
              >
                <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  {n.message && <p className="text-xs text-white/45 mt-1">{n.message}</p>}
                  <p className="text-[10px] text-white/25 mt-2">
                    {new Date(n.created_at).toLocaleString('fr-FR')}
                    {liveRole ? ` · ${liveRole}` : ''}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
