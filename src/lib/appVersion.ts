/** Bump this constant on each production release. */
export const APP_VERSION = '2.7.0';

export const APP_VERSION_LABEL = `v${APP_VERSION}`;

export const SEEN_APP_VERSION_KEY = 'zd_seen_app_version';

export const UPDATE_REFRESH_MESSAGE =
  'Une mise à jour est disponible. Rafraîchissez votre page pour profiter de la dernière version.';

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

/** Show notification only when the user has not seen the current APP_VERSION. */
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
