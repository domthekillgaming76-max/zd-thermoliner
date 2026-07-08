import { supabase } from '../lib/supabase';
import {
  APP_VERSION,
  APP_VERSION_LABEL,
  isUpdateNotificationVisible,
  saveSeenAppVersion,
} from '../lib/appVersion';

export interface PublishedAppUpdate {
  id: string;
  title: string;
  version: string;
  published_at: string | null;
}

export interface AppUpdateStatus {
  visible: boolean;
  serverVersion: string | null;
  latestUpdate: PublishedAppUpdate | null;
  clientVersion: string;
  clientVersionLabel: string;
}

function isUpdateNotificationRow(row: { title?: string; type?: string }): boolean {
  const title = (row.title ?? '').toLowerCase();
  return row.type === 'app_update' || title.includes('mise à jour');
}

export async function fetchLatestPublishedUpdate(): Promise<PublishedAppUpdate | null> {
  const { data, error } = await supabase
    .from('app_updates')
    .select('id, title, version, published_at')
    .eq('status', 'publiee')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublishedAppUpdate;
}

export async function markUpdateNotificationsRead(userId: string): Promise<void> {
  const { data } = await supabase
    .from('notifications')
    .select('id, title, type')
    .eq('user_id', userId)
    .eq('read', false)
    .limit(50);

  const ids = (data ?? []).filter(isUpdateNotificationRow).map(n => n.id);
  if (ids.length === 0) return;

  await supabase.from('notifications').update({ read: true }).in('id', ids);
}

export function acknowledgeSeenVersion(): void {
  saveSeenAppVersion();
}

export async function acknowledgeUpdateExtras(
  userId: string | undefined,
  update: PublishedAppUpdate | null,
): Promise<void> {
  if (!userId) return;

  void markUpdateNotificationsRead(userId);
  if (update) {
    void supabase.from('update_reads').upsert({
      update_id: update.id,
      user_id: userId,
    }, { onConflict: 'update_id,user_id' });
  }
}

export async function fetchAppUpdateStatus(): Promise<AppUpdateStatus> {
  const latestUpdate = await fetchLatestPublishedUpdate();
  const serverVersion = latestUpdate?.version ?? null;

  return {
    visible: isUpdateNotificationVisible(),
    serverVersion,
    latestUpdate,
    clientVersion: APP_VERSION,
    clientVersionLabel: APP_VERSION_LABEL,
  };
}
