import { supabase } from '../lib/supabase';
import {
  APP_VERSION,
  checkForNewVersion,
  formatVersionLabel,
} from '../lib/appVersion';
import { ensureAppUpdateNotification } from './notificationService';

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
  installedVersion: string;
  targetVersion: string | null;
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

  const ids = (data ?? []).filter(n => n.type === 'app_update').map(n => n.id);
  if (ids.length === 0) return;

  await supabase.from('notifications').update({ read: true }).in('id', ids);
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

export async function fetchAppUpdateStatus(userId?: string): Promise<AppUpdateStatus> {
  const latestUpdate = await fetchLatestPublishedUpdate();
  const serverVersion = latestUpdate?.version ?? null;
  const versionCheck = checkForNewVersion(serverVersion);
  const visible = versionCheck.hasUpdate;

  if (visible && userId) {
    void ensureAppUpdateNotification(userId, serverVersion);
  }

  return {
    visible,
    serverVersion,
    latestUpdate,
    clientVersion: APP_VERSION,
    clientVersionLabel: formatVersionLabel(versionCheck.targetVersion ?? APP_VERSION),
    installedVersion: versionCheck.installedVersion,
    targetVersion: versionCheck.targetVersion,
  };
}
