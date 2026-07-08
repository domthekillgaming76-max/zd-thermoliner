/** Bump this constant on each production release. */
export const APP_VERSION = '1.0.1';

export const APP_VERSION_LABEL = `v${APP_VERSION}`;

export const SEEN_APP_VERSION_KEY = 'zd_seen_app_version';

export const APP_UPDATE_NOTIFICATION_TITLE = 'Nouvelle mise à jour disponible';

export const APP_UPDATE_NOTIFICATION_MESSAGE =
  'Une nouvelle version de Z&D Thermoliner ERP est disponible. Cliquez sur le bouton ci-dessous pour recharger l\'application.';

export const APP_UPDATE_BUTTON_LABEL = 'Télécharger la mise à jour';

export function getSeenAppVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_APP_VERSION_KEY);
  } catch {
    return null;
  }
}

export function saveSeenAppVersion(): void {
  try {
    localStorage.setItem(SEEN_APP_VERSION_KEY, APP_VERSION);
  } catch {
    /* ignore quota errors */
  }
}

/** Show notification when the user has not acknowledged the current APP_VERSION. */
export function isUpdateNotificationVisible(): boolean {
  return getSeenAppVersion() !== APP_VERSION;
}

export function normalizeVersion(version: string | null | undefined): string {
  if (!version) return '';
  return version.trim().replace(/^v/i, '').toLowerCase();
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

/** SW cache bucket — keep in sync with APP_VERSION. */
export function getSwCacheName(): string {
  return `zd-thermoliner-${APP_VERSION.replace(/\./g, '-')}`;
}
