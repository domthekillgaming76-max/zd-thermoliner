import { supabase } from '../lib/supabase';
import type { AppRole } from '../lib/roleEngine';
import { normalizeRole } from '../lib/roleEngine';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type DisplayStatus = 'online' | 'offline';

export interface OnlineMember {
  user_id: string;
  full_name: string;
  pseudo: string | null;
  email: string;
  role: string;
  normalizedRole: AppRole;
  avatar_url: string | null;
  truck_photo_url: string | null;
  status: PresenceStatus;
  last_seen_at: string;
  displayStatus: DisplayStatus;
}

export interface PresencePayload {
  user_id: string;
  full_name: string;
  pseudo: string | null;
  email: string;
  role: string;
  normalizedRole: AppRole;
  avatar_url: string | null;
  truck_photo_url: string | null;
  status: PresenceStatus;
  last_seen_at: string;
}

import { PERF } from '../lib/perfConfig';

export const PRESENCE_STALE_MS = 45_000;
export const PRESENCE_HEARTBEAT_MS = 20_000;
export const PRESENCE_LIST_POLL_MS = PERF.presenceListPollMs;
export const PRESENCE_BOOT_GRACE_MS = 15_000;
export const PRESENCE_FETCH_WINDOW_MS = 10 * 60_000;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function rowToMember(row: {
  user_id: string;
  status: string;
  last_seen_at: string;
  metadata: Record<string, unknown> | null;
}): OnlineMember {
  const meta = row.metadata ?? {};
  const role = String(meta.role ?? 'visitor');
  const base = {
    user_id: row.user_id,
    full_name: String(meta.full_name ?? meta.pseudo ?? meta.email ?? 'Membre'),
    pseudo: (meta.pseudo as string) ?? null,
    email: String(meta.email ?? ''),
    role,
    normalizedRole: normalizeRole(role),
    avatar_url: (meta.avatar_url as string) ?? null,
    truck_photo_url: (meta.truck_photo_url as string) ?? null,
    status: (row.status as PresenceStatus) ?? 'online',
    last_seen_at: row.last_seen_at,
  };
  return { ...base, displayStatus: resolveDisplayStatus(base) };
}

export function isPresenceFresh(lastSeenAt: string, now = Date.now()): boolean {
  return now - new Date(lastSeenAt).getTime() <= PRESENCE_STALE_MS;
}

/** Online if fresh heartbeat AND not explicitly offline. */
export function resolveDisplayStatus(
  member: Pick<OnlineMember, 'status' | 'last_seen_at'>,
  now = Date.now(),
): DisplayStatus {
  if (member.status === 'offline') return 'offline';
  return isPresenceFresh(member.last_seen_at, now) ? 'online' : 'offline';
}

export function applyDisplayStatus(
  member: Omit<OnlineMember, 'displayStatus'>,
  options?: { selfUserId?: string; selfMountedAt?: number; now?: number },
): OnlineMember {
  const now = options?.now ?? Date.now();
  // Grace: self just loaded — avoid showing offline before first heartbeat lands
  if (
    options?.selfUserId === member.user_id
    && options.selfMountedAt
    && now - options.selfMountedAt < PRESENCE_BOOT_GRACE_MS
  ) {
    return { ...member, displayStatus: 'online' };
  }
  // Grace: any member with a very recent heartbeat (just joined)
  if (
    member.status !== 'offline'
    && now - new Date(member.last_seen_at).getTime() < PRESENCE_BOOT_GRACE_MS
  ) {
    return { ...member, displayStatus: 'online' };
  }
  return { ...member, displayStatus: resolveDisplayStatus(member, now) };
}

export function shouldShowInPanel(member: OnlineMember, now = Date.now()): boolean {
  if (member.displayStatus === 'online') return true;
  return now - new Date(member.last_seen_at).getTime() <= PRESENCE_STALE_MS;
}

function metadataFromPayload(payload: PresencePayload): Record<string, unknown> {
  return {
    full_name: payload.full_name,
    pseudo: payload.pseudo,
    email: payload.email,
    role: payload.role,
    normalizedRole: payload.normalizedRole,
    avatar_url: payload.avatar_url,
    truck_photo_url: payload.truck_photo_url,
  };
}

export async function upsertOnlinePresence(payload: PresencePayload): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('online_presence').upsert({
    user_id: payload.user_id,
    status: 'online',
    last_seen_at: now,
    metadata: metadataFromPayload(payload),
    updated_at: now,
  }, { onConflict: 'user_id' });

  if (error) {
    console.warn('[Z&D Presence] upsert failed:', error.message);
  }
}

export async function setOfflinePresence(userId: string, metadata?: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('online_presence').upsert({
    user_id: userId,
    status: 'offline',
    last_seen_at: now,
    metadata: metadata ?? {},
    updated_at: now,
  }, { onConflict: 'user_id' });

  if (error) {
    console.warn('[Z&D Presence] set offline failed:', error.message);
  }
}

/** Reliable offline signal on tab close (keepalive fetch). */
export function markOfflinePresenceBeacon(
  payload: PresencePayload,
  accessToken: string | null | undefined,
): void {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return;

  const now = new Date().toISOString();
  const body = JSON.stringify({
    user_id: payload.user_id,
    status: 'offline',
    last_seen_at: now,
    updated_at: now,
    metadata: metadataFromPayload(payload),
  });

  try {
    void fetch(`${supabaseUrl}/rest/v1/online_presence?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body,
      keepalive: true,
    });
  } catch {
    /* best effort on unload */
  }
}

/** @deprecated Prefer setOfflinePresence — keeps row for status display */
export async function removeOnlinePresence(userId: string): Promise<void> {
  await setOfflinePresence(userId);
}

export async function fetchOnlineMembers(): Promise<OnlineMember[]> {
  const cutoff = new Date(Date.now() - PRESENCE_FETCH_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('online_presence')
    .select('user_id, status, last_seen_at, metadata, updated_at')
    .gte('last_seen_at', cutoff)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.warn('[Z&D Presence] fetch failed:', error.message);
    return [];
  }

  const deduped = dedupeMembers(
    (data ?? []).map(row =>
      rowToMember(row as { user_id: string; status: string; last_seen_at: string; metadata: Record<string, unknown> }),
    ),
  );

  return deduped.filter(m => shouldShowInPanel(m));
}

export function dedupeMembers(members: OnlineMember[]): OnlineMember[] {
  const map = new Map<string, OnlineMember>();
  for (const m of members) {
    const existing = map.get(m.user_id);
    if (!existing || new Date(m.last_seen_at) >= new Date(existing.last_seen_at)) {
      map.set(m.user_id, m);
    }
  }
  return Array.from(map.values());
}

export function mergePresenceMembers(
  fromPresence: OnlineMember[],
  fromDb: OnlineMember[],
  options?: { selfUserId?: string; selfMountedAt?: number; now?: number },
): OnlineMember[] {
  const now = options?.now ?? Date.now();
  const map = new Map<string, OnlineMember>();

  for (const m of fromDb) {
    map.set(m.user_id, applyDisplayStatus(m, options));
  }

  for (const m of fromPresence) {
    const existing = map.get(m.user_id);
    // DB explicitly offline — trust it over stale Realtime presence
    if (existing?.status === 'offline') {
      continue;
    }

    const boosted: Omit<OnlineMember, 'displayStatus'> = {
      ...m,
      status: 'online',
      last_seen_at: new Date(now).toISOString(),
    };

    if (!existing || new Date(boosted.last_seen_at) >= new Date(existing.last_seen_at)) {
      map.set(m.user_id, applyDisplayStatus(boosted, options));
    } else {
      map.set(m.user_id, applyDisplayStatus({
        ...existing,
        status: 'online',
        last_seen_at: boosted.last_seen_at,
      }, options));
    }
  }

  return dedupeMembers(Array.from(map.values()))
    .filter(m => shouldShowInPanel(m, now))
    .sort((a, b) => {
      if (a.displayStatus !== b.displayStatus) {
        return a.displayStatus === 'online' ? -1 : 1;
      }
      return a.full_name.localeCompare(b.full_name, 'fr');
    });
}

export function presenceStateToMembers(
  state: Record<string, PresencePayload[]>,
  options?: { selfUserId?: string; selfMountedAt?: number; now?: number },
): OnlineMember[] {
  const now = options?.now ?? Date.now();
  const members: OnlineMember[] = [];

  for (const key of Object.keys(state)) {
    const payloads = state[key];
    if (!payloads?.length) continue;
    const p = payloads.reduce((latest, cur) =>
      new Date(cur.last_seen_at) >= new Date(latest.last_seen_at) ? cur : latest,
    payloads[0]);

    const base: Omit<OnlineMember, 'displayStatus'> = {
      user_id: p.user_id,
      full_name: p.full_name,
      pseudo: p.pseudo,
      email: p.email,
      role: p.role,
      normalizedRole: p.normalizedRole,
      avatar_url: p.avatar_url,
      truck_photo_url: p.truck_photo_url,
      status: 'online',
      last_seen_at: new Date(now).toISOString(),
    };
    members.push(applyDisplayStatus(base, options));
  }

  return dedupeMembers(members);
}
