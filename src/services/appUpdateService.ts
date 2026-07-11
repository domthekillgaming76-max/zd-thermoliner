import { supabase } from '../lib/supabase';
import {
  APP_VERSION,
  APP_VERSION_LABEL,
  fetchRemoteAppVersion,
  getDismissedAppVersion,
  getInstalledAppVersion,
  normalizeVersion,
  compareVersions,
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
  remoteVersion: string | null;
  latestUpdate: PublishedAppUpdate | null;
  clientVersion: string;
  clientVersionLabel: string;
  installedVersion: string;
  dismissedVersion: string;
  targetVersion: string | null;
  swUpdateReady: boolean;
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

function isDismissedForVersion(targetVersion: string | null): boolean {
  if (!targetVersion) return false;
  const dismissed = getDismissedAppVersion();
  return !!dismissed && compareVersions(dismissed, targetVersion) >= 0;
}

export function resolveUpdateVisibility(
  remoteVersion: string | null,
  swUpdateReady = false,
): {
  visible: boolean;
  targetVersion: string | null;
  reason: 'remote' | 'local' | 'sw' | null;
} {
  const runningVersion = normalizeVersion(APP_VERSION);
  const installedVersion = getInstalledAppVersion() ?? '';

  if (remoteVersion && compareVersions(remoteVersion, runningVersion) > 0) {
    if (!isDismissedForVersion(remoteVersion)) {
      return { visible: true, targetVersion: remoteVersion, reason: 'remote' };
    }
  }

  if (installedVersion && compareVersions(installedVersion, runningVersion) < 0) {
    if (!isDismissedForVersion(runningVersion)) {
      return { visible: true, targetVersion: runningVersion, reason: 'local' };
    }
  }

  if (swUpdateReady && !isDismissedForVersion(runningVersion)) {
    return { visible: true, targetVersion: runningVersion, reason: 'sw' };
  }

  return { visible: false, targetVersion: null, reason: null };
}

export async function fetchAppUpdateStatus(
  userId?: string,
  swUpdateReady = false,
): Promise<AppUpdateStatus> {
  const [latestUpdate, remoteVersion] = await Promise.all([
    fetchLatestPublishedUpdate(),
    fetchRemoteAppVersion(),
  ]);

  const changelogVersion = latestUpdate?.version ? normalizeVersion(latestUpdate.version) : null;
  const effectiveRemote = remoteVersion ?? changelogVersion;
  const visibility = resolveUpdateVisibility(effectiveRemote, swUpdateReady);
  const installedVersion = getInstalledAppVersion() ?? '';
  const dismissedVersion = getDismissedAppVersion() ?? '';

  if (visibility.visible && userId) {
    void ensureAppUpdateNotification(userId, visibility.targetVersion);
  }

  return {
    visible: visibility.visible,
    serverVersion: changelogVersion,
    remoteVersion: effectiveRemote,
    latestUpdate,
    clientVersion: APP_VERSION,
    clientVersionLabel: APP_VERSION_LABEL,
    installedVersion,
    dismissedVersion,
    targetVersion: visibility.targetVersion,
    swUpdateReady,
  };
}
