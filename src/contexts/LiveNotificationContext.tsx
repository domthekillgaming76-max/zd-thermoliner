import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { LiveNotification } from '../lib/liveOpsTypes';
import { NOTIFICATION_POLL_MS } from '../services/notificationService';
import { playNotificationSound, playSoundForNotification, primeNotificationAudio } from '../services/notificationSoundService';

interface LiveNotificationContextValue {
  unreadCount: number;
  refresh: () => void;
}

const LiveNotificationContext = createContext<LiveNotificationContextValue>({
  unreadCount: 0,
  refresh: () => {},
});

export function useLiveNotifications() {
  return useContext(LiveNotificationContext);
}

interface ToastItem extends LiveNotification {
  toastId: string;
}

export function LiveNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const notificationsReadyRef = useRef(false);

  useEffect(() => {
    const prime = () => primeNotificationAudio();
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, read')
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadCount((data ?? []).length);
  }, [user?.id]);

  const checkNewToasts = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, read, type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    for (const row of data ?? []) {
      const n = row as LiveNotification;
      if (knownIdsRef.current.has(n.id)) continue;
      knownIdsRef.current.add(n.id);
      if (n.read) continue;

      if (notificationsReadyRef.current) playSoundForNotification(n.type);
      const toastId = `${n.id}-${Date.now()}`;
      setToasts(prev => [...prev.slice(-2), { ...n, toastId }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
      }, 6000);
    }

    notificationsReadyRef.current = true;
    await refresh();
  }, [user?.id, refresh]);

  useEffect(() => {
    if (!user?.id) {
      knownIdsRef.current.clear();
      notificationsReadyRef.current = false;
      return;
    }

    void checkNewToasts();

    const ch = supabase
      .channel(`live_toast_rt_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => {
          const n = payload.new as LiveNotification;
          playSoundForNotification(n.type);
          knownIdsRef.current.add(n.id);
          const toastId = `${n.id}-${Date.now()}`;
          setToasts(prev => [...prev.slice(-2), { ...n, toastId }]);
          setUnreadCount(c => c + 1);
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.toastId !== toastId));
          }, 6000);
        },
      )
      .subscribe();

    const bankChannel = supabase
      .channel(`driver_bank_sound_rt_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'driver_bank_transactions', filter: `profile_id=eq.${user.id}` },
        () => {
          void playNotificationSound('bank');
        },
      )
      .subscribe();

    pollRef.current = setInterval(() => { void checkNewToasts(); }, NOTIFICATION_POLL_MS);

    return () => {
      ch.unsubscribe();
      bankChannel.unsubscribe();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user?.id, checkNewToasts]);

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.toastId !== id));
  }

  return (
    <LiveNotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
      <div className="fixed top-20 right-4 z-[60] space-y-2 pointer-events-none max-w-sm">
        {toasts.map(t => (
          <div
            key={t.toastId}
            className="pointer-events-auto erp-card rounded-xl p-3 shadow-2xl border border-red-500/20 animate-slide-up flex gap-2"
          >
            <Bell className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{t.title}</p>
              {t.message && <p className="text-[10px] text-white/50 mt-0.5 line-clamp-2">{t.message}</p>}
            </div>
            <button type="button" onClick={() => dismissToast(t.toastId)} className="text-white/30 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </LiveNotificationContext.Provider>
  );
}
