import { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Container, FileText, Wallet, Megaphone, Building2, MessageSquare } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { canAccessNotificationsPage } from '../lib/phase5Permissions';
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import type { LiveNotification } from '../lib/liveOpsTypes';
import { supabase } from '../lib/supabase';

function getNotifIcon(type: string) {
  if (type === 'freight') return <Container className="w-4 h-4 text-purple-400" />;
  if (type === 'road_sheet') return <FileText className="w-4 h-4 text-orange-400" />;
  if (type === 'salary') return <Wallet className="w-4 h-4 text-emerald-400" />;
  if (type === 'wall_post' || type === 'wall_announcement' || type === 'wall_convoy') return <Building2 className="w-4 h-4 text-red-400" />;
  if (type === 'wall_comment') return <MessageSquare className="w-4 h-4 text-blue-400" />;
  if (type === 'wall_reaction') return <Megaphone className="w-4 h-4 text-amber-400" />;
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  if (type === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Info className="w-4 h-4 text-blue-400" />;
}

export function NotificationsPage() {
  const { profile, user } = useAuth();
  const canAccess = canAccessNotificationsPage(profile?.role, user?.email);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    const list = await fetchUserNotifications(user.id, 100);
    setNotifications(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!user?.id) return;
    load();
    const ch = supabase.channel('notifs_page_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user?.id]);

  if (!canAccess) {
    return <Navigate to="/wall" replace state={{ accessDenied: 'Accès réservé aux membres.' }} />;
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    load();
  }

  async function handleMarkAll() {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    load();
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-end justify-between gap-3">
          <PageHeader title="Notifications" subtitle="Alertes temps réel sans rechargement" icon={Bell} />
          {unread > 0 && (
            <button type="button" onClick={handleMarkAll} className="text-xs text-red-400 hover:text-red-300">
              Tout marquer comme lu ({unread})
            </button>
          )}
        </div>

        {loading ? (
          <div className="erp-card rounded-2xl h-64 shimmer" />
        ) : notifications.length === 0 ? (
          <div className="erp-card rounded-2xl p-12 text-center text-white/30 text-sm">
            Aucune notification
          </div>
        ) : (
          <div className="erp-card rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {notifications.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`w-full text-left p-4 flex gap-3 hover:bg-white/[0.02] transition-colors ${!n.read ? 'bg-red-500/[0.03]' : ''}`}
              >
                {getNotifIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  {n.message && <p className="text-xs text-white/45 mt-0.5">{n.message}</p>}
                  <p className="text-[10px] text-white/25 mt-1">
                    {new Date(n.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
