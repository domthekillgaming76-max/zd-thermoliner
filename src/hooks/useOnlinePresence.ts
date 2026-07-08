import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ROLE_SYNC_EVENT } from '../lib/roleEngine';
import {
  applyDisplayStatus,
  fetchOnlineMembers,
  markOfflinePresenceBeacon,
  mergePresenceMembers,
  presenceStateToMembers,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_LIST_POLL_MS,
  setOfflinePresence,
  shouldShowInPanel,
  upsertOnlinePresence,
  type OnlineMember,
  type PresencePayload,
} from '../services/onlinePresenceService';
import {
  registerPresenceTab,
  touchPresenceTab,
  unregisterPresenceTab,
} from '../services/presenceTabRegistry';

const PRESENCE_CHANNEL = 'zd-online-members';

export function useOnlinePresence() {
  const { user, profile, role, normalizedRole, loading } = useAuth();
  const [members, setMembers] = useState<OnlineMember[]>([]);
  const [connected, setConnected] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceMembersRef = useRef<OnlineMember[]>([]);
  const accessTokenRef = useRef<string | null>(null);
  const tabIdRef = useRef<string | null>(null);
  const mountedAtRef = useRef(Date.now());
  const payloadRef = useRef<PresencePayload | null>(null);
  const offlineSentRef = useRef(false);
  const profileRef = useRef(profile);
  const roleRef = useRef(role);
  const normalizedRoleRef = useRef(normalizedRole);

  profileRef.current = profile;
  roleRef.current = role;
  normalizedRoleRef.current = normalizedRole;

  const buildPayload = useCallback((): PresencePayload | null => {
    const p = profileRef.current;
    const uid = user?.id;
    if (!uid || !p) return null;
    return {
      user_id: uid,
      full_name: p.full_name || p.pseudo || p.email || 'Membre',
      pseudo: p.pseudo,
      email: p.email || user?.email || '',
      role: roleRef.current ?? p.role,
      normalizedRole: normalizedRoleRef.current,
      avatar_url: p.avatar_url,
      truck_photo_url: p.truck_photo_url,
      status: 'online',
      last_seen_at: new Date().toISOString(),
    };
  }, [user?.id, user?.email]);

  const syncOptions = useCallback(() => ({
    selfUserId: user?.id,
    selfMountedAt: mountedAtRef.current,
    now: Date.now(),
  }), [user?.id]);

  const syncMembers = useCallback(async () => {
    const dbMembers = await fetchOnlineMembers();
    const merged = mergePresenceMembers(presenceMembersRef.current, dbMembers, syncOptions());
    setMembers(merged);
  }, [syncOptions]);

  const refreshDisplayStatus = useCallback(() => {
    const opts = syncOptions();
    setMembers(prev =>
      prev
        .map(m => applyDisplayStatus(m, opts))
        .filter(m => shouldShowInPanel(m, opts.now)),
    );
  }, [syncOptions]);

  const heartbeat = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;
    payloadRef.current = payload;
    offlineSentRef.current = false;

    if (tabIdRef.current) touchPresenceTab(tabIdRef.current);

    await upsertOnlinePresence(payload);

    if (channelRef.current) {
      try {
        await channelRef.current.track(payload);
      } catch {
        /* optional */
      }
    }
  }, [buildPayload]);

  const handleGoOffline = useCallback((useBeacon: boolean) => {
    if (offlineSentRef.current) return;
    const payload = payloadRef.current ?? buildPayload();
    if (!payload || !user?.id) return;

    offlineSentRef.current = true;

    if (useBeacon) {
      markOfflinePresenceBeacon(payload, accessTokenRef.current);
    } else {
      void setOfflinePresence(payload.user_id, {
        full_name: payload.full_name,
        pseudo: payload.pseudo,
        email: payload.email,
        role: payload.role,
        normalizedRole: payload.normalizedRole,
        avatar_url: payload.avatar_url,
        truck_photo_url: payload.truck_photo_url,
      });
    }

    try {
      void channelRef.current?.untrack();
    } catch {
      /* optional */
    }
  }, [buildPayload, user?.id]);

  const handleTabExit = useCallback(() => {
    const tabId = tabIdRef.current;
    if (!tabId) return;
    const remaining = unregisterPresenceTab(tabId);
    if (remaining === 0) handleGoOffline(true);
  }, [handleGoOffline]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  // Stable presence session — only restart when user id changes
  useEffect(() => {
    if (loading || !user?.id || !profileRef.current) return;

    mountedAtRef.current = Date.now();
    offlineSentRef.current = false;
    tabIdRef.current = registerPresenceTab();
    payloadRef.current = buildPayload();

    void heartbeat();
    void syncMembers();

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } },
    });

    const onPresenceChange = () => {
      const state = channel.presenceState() as Record<string, PresencePayload[]>;
      presenceMembersRef.current = presenceStateToMembers(state, syncOptions());
      void syncMembers();
    };

    channel.on('presence', { event: 'sync' }, onPresenceChange);
    channel.on('presence', { event: 'join' }, onPresenceChange);
    channel.on('presence', { event: 'leave' }, onPresenceChange);

    channel.subscribe(async status => {
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        const payload = buildPayload();
        if (payload) await channel.track(payload);
      }
    });

    channelRef.current = channel;

    heartbeatRef.current = setInterval(() => {
      void heartbeat();
    }, PRESENCE_HEARTBEAT_MS);

    listPollRef.current = setInterval(() => {
      void syncMembers();
      refreshDisplayStatus();
    }, PRESENCE_LIST_POLL_MS);

    const rtChannel = supabase
      .channel(`online_presence_rt_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_presence' }, () => {
        void syncMembers();
      })
      .subscribe();

    const onRoleUpdated = () => { void heartbeat(); };
    window.addEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
    window.addEventListener('pagehide', handleTabExit);

    return () => {
      window.removeEventListener(ROLE_SYNC_EVENT, onRoleUpdated);
      window.removeEventListener('pagehide', handleTabExit);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (listPollRef.current) clearInterval(listPollRef.current);

      const tabId = tabIdRef.current;
      const remaining = tabId ? unregisterPresenceTab(tabId) : 0;
      if (remaining === 0) handleGoOffline(false);

      void supabase.removeChannel(channel);
      void supabase.removeChannel(rtChannel);
      channelRef.current = null;
    };
  }, [user?.id, loading, buildPayload, syncMembers, syncOptions, heartbeat, handleGoOffline, handleTabExit, refreshDisplayStatus]);

  // Profile/role changes: refresh heartbeat without tearing down channel
  useEffect(() => {
    if (!user?.id || loading || !profile) return;
    void heartbeat();
  }, [role, normalizedRole, profile?.avatar_url, profile?.pseudo, profile?.full_name, user?.id, loading, profile, heartbeat]);

  const onlineCount = members.filter(m => m.displayStatus === 'online').length;

  return { members, connected, onlineCount };
}
