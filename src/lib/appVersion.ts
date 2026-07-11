/** Bump this constant on each production release. */
export const APP_VERSION = '2.6.2';

/** Alias used by the PWA update system. */
export const CURRENT_APP_VERSION = APP_VERSION;

export const APP_VERSION_LABEL = `v${APP_VERSION}`;

/** Last version the user installed via "Télécharger la mise à jour". */
export const INSTALLED_APP_VERSION_KEY = 'zd_installed_app_version';

/** Version dismissed via "Plus tard" for the current bundle. */
export const DISMISSED_APP_VERSION_KEY = 'zd_dismissed_app_version';

/** @deprecated Migrated to INSTALLED_APP_VERSION_KEY */
const LEGACY_SEEN_APP_VERSION_KEY = 'zd_seen_app_version';

export const APP_UPDATE_NOTIFICATION_TITLE = 'Mise à jour disponible';

export const APP_UPDATE_NOTIFICATION_MESSAGE =
  'Une nouvelle version de l’ERP est disponible. Téléchargez-la pour profiter des dernières fonctionnalités.';

export const APP_UPDATE_BUTTON_LABEL = 'Télécharger la mise à jour';
export const APP_UPDATE_DISMISS_LABEL = 'Plus tard';

/** Poll interval for remote version check (ms). */
export const REMOTE_VERSION_POLL_MS = 3 * 60 * 1000;

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  installedVersion: string;
  dismissedVersion: string;
  targetVersion: string | null;
}

export function normalizeVersion(version: string | null | undefined): string {
  if (!version) return '';
  return version.trim().replace(/^v/i, '').toLowerCase();
}

export function formatVersionLabel(version: string | null | undefined): string {
  const normalized = normalizeVersion(version);
  return normalized ? `v${normalized}` : APP_VERSION_LABEL;
}

export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const pa = normalizeVersion(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function getInstalledAppVersion(): string | null {
  try {
    const installed = localStorage.getItem(INSTALLED_APP_VERSION_KEY);
    if (installed) return normalizeVersion(installed);

    const legacy = localStorage.getItem(LEGACY_SEEN_APP_VERSION_KEY);
    if (legacy) {
      const normalized = normalizeVersion(legacy);
      localStorage.setItem(INSTALLED_APP_VERSION_KEY, normalized);
      localStorage.removeItem(LEGACY_SEEN_APP_VERSION_KEY);
      return normalized;
    }
  } catch {
    /* ignore quota / private mode */
  }
  return null;
}

export function saveInstalledAppVersion(version: string = CURRENT_APP_VERSION): void {
  try {
    localStorage.setItem(INSTALLED_APP_VERSION_KEY, normalizeVersion(version));
    localStorage.removeItem(LEGACY_SEEN_APP_VERSION_KEY);
  } catch {
    /* ignore quota errors */
  }
}

export function getDismissedAppVersion(): string | null {
  try {
    const dismissed = localStorage.getItem(DISMISSED_APP_VERSION_KEY);
    return dismissed ? normalizeVersion(dismissed) : null;
  } catch {
    return null;
  }
}

export function saveDismissedAppVersion(version: string = CURRENT_APP_VERSION): void {
  try {
    localStorage.setItem(DISMISSED_APP_VERSION_KEY, normalizeVersion(version));
  } catch {
    /* ignore quota errors */
  }
}

export function clearDismissedAppVersion(): void {
  try {
    localStorage.removeItem(DISMISSED_APP_VERSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * First launch only: mark the running bundle as installed so no popup appears.
 * Does not overwrite an existing installed version (preserves upgrade prompts).
 */
export function bootstrapInstalledVersion(): void {
  if (getInstalledAppVersion()) return;
  saveInstalledAppVersion(CURRENT_APP_VERSION);
}

/**
 * Compare CURRENT_APP_VERSION against installed + dismissed localStorage keys.
 * Never uses server version for visibility — avoids infinite loops when DB
 * changelog versions differ from the deployed bundle.
 */
export function checkForNewVersion(): VersionCheckResult {
  const currentVersion = normalizeVersion(CURRENT_APP_VERSION);
  const installedVersion = getInstalledAppVersion() ?? '';
  const dismissedVersion = getDismissedAppVersion() ?? '';

  if (installedVersion && compareVersions(installedVersion, currentVersion) >= 0) {
    return {
      hasUpdate: false,
      currentVersion,
      installedVersion,
      dismissedVersion,
      targetVersion: null,
    };
  }

  if (dismissedVersion && compareVersions(dismissedVersion, currentVersion) >= 0) {
    return {
      hasUpdate: false,
      currentVersion,
      installedVersion,
      dismissedVersion,
      targetVersion: null,
    };
  }

  const hasUpdate = compareVersions(currentVersion, installedVersion) > 0;

  return {
    hasUpdate,
    currentVersion,
    installedVersion,
    dismissedVersion,
    targetVersion: hasUpdate ? currentVersion : null,
  };
}

/** @deprecated Use checkForNewVersion().hasUpdate */
export function isUpdateNotificationVisible(): boolean {
  return checkForNewVersion().hasUpdate;
}

/** @deprecated Use saveInstalledAppVersion */
export function saveSeenAppVersion(version?: string): void {
  saveInstalledAppVersion(version);
}

/** @deprecated Use getInstalledAppVersion */
export function getSeenAppVersion(): string | null {
  return getInstalledAppVersion();
}

export async function fetchRemoteAppVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ? normalizeVersion(data.version) : null;
  } catch {
    return null;
  }
}

export function buildUpdateTitle(targetVersion: string | null | undefined): string {
  const v = targetVersion ? formatVersionLabel(targetVersion) : APP_VERSION_LABEL;
  return `Mise à jour ${v} disponible`;
}

/** SW cache bucket — keep in sync with APP_VERSION. */
export function getSwCacheName(version: string = CURRENT_APP_VERSION): string {
  return `zd-thermoliner-${normalizeVersion(version).replace(/\./g, '-')}`;
}
