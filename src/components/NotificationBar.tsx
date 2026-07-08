import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Info, AlertTriangle, XCircle, Container, FileText, Wallet, Building2, MessageSquare, Shield, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RoleBadge } from './erp/RoleBadge';
import { supabase } from '../lib/supabase';
import { NOTIFICATION_POLL_MS } from '../services/notificationService';

interface Notif {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  read: boolean;
  type: string;
  created_at: string;
}

export function NotificationBar() {
  const { user, role, normalizedRole } = useAuth();
  const liveRole = role ?? normalizedRole;
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = (data ?? []) as Notif[];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch {
      /* table may not exist */
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    void loadNotifications();

    const ch = supabase
      .channel(`notifs_rt_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void loadNotifications(); },
      )
      .subscribe();

    pollRef.current = setInterval(() => { void loadNotifications(); }, NOTIFICATION_POLL_MS);

    return () => {
      ch.unsubscribe();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user?.id, loadNotifications]);

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    void loadNotifications();
  }

  function getIcon(type: string) {
    if (type === 'app_update') return <Download className="w-4 h-4 text-red-400" />;
    if (type === 'freight') return <Container className="w-4 h-4 text-purple-400" />;
    if (type === 'road_sheet') return <FileText className="w-4 h-4 text-orange-400" />;
    if (type === 'salary') return <Wallet className="w-4 h-4 text-emerald-400" />;
    if (type === 'wall_post' || type === 'wall_announcement') return <Building2 className="w-4 h-4 text-red-400" />;
    if (type === 'wall_comment') return <MessageSquare className="w-4 h-4 text-blue-400" />;
    if (type === 'wall_reaction' || type === 'wall_convoy') return <Bell className="w-4 h-4 text-amber-400" />;
    if (type === 'role_change') return <Shield className="w-4 h-4 text-amber-400" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    if (type === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
    return <Info className="w-4 h-4 text-blue-400" />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/5 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-white/40" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-72 max-h-80 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="p-3 border-b flex items-center justify-between gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm">Notifications</p>
                {liveRole && <RoleBadge role={liveRole} size="xs" className="mt-1" />}
              </div>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className="text-xs text-red-400 hover:text-red-300">
                  Tout lire
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-white/25 text-sm">Aucune notification</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b ${!n.read ? 'bg-white/[0.02]' : ''}`}
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex gap-2.5">
                      {getIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{n.title}</p>
                        {n.message && <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{n.message}</p>}
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs text-red-400 hover:text-red-300 py-1"
              >
                Voir toutes les notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
