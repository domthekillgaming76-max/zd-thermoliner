/** Bump this constant on each production release. */
export const APP_VERSION = '1.0.3';

/** Alias used by the PWA update system. */
export const CURRENT_APP_VERSION = APP_VERSION;

export const APP_VERSION_LABEL = `v${APP_VERSION}`;

/** Last version the user installed / acknowledged via "Télécharger la mise à jour". */
export const INSTALLED_APP_VERSION_KEY = 'zd_installed_app_version';

/** @deprecated Migrated to INSTALLED_APP_VERSION_KEY */
const LEGACY_SEEN_APP_VERSION_KEY = 'zd_seen_app_version';

export const APP_UPDATE_NOTIFICATION_TITLE = 'Mise à jour v1.0.3 — Correctif important';

export const APP_UPDATE_NOTIFICATION_MESSAGE =
  'Banque RP chauffeur, dossier profil et salaires corrigés. Cliquez pour télécharger la dernière version.';

export const APP_UPDATE_BUTTON_LABEL = 'Télécharger la mise à jour';

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  installedVersion: string;
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

function pickNewestVersion(...versions: Array<string | null | undefined>): string {
  let best = normalizeVersion(CURRENT_APP_VERSION);
  for (const version of versions) {
    if (!version) continue;
    const normalized = normalizeVersion(version);
    if (compareVersions(normalized, best) > 0) {
      best = normalized;
    }
  }
  return best;
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

/**
 * First launch: mark the running bundle as installed so no popup appears.
 * Re-open / reload with the same version: still no popup.
 */
export function bootstrapInstalledVersion(): void {
  const installed = getInstalledAppVersion();
  if (!installed) {
    saveInstalledAppVersion(CURRENT_APP_VERSION);
  }
}

/**
 * Compare CURRENT_APP_VERSION (bundle) and optional server version
 * against INSTALLED_APP_VERSION (localStorage).
 *
 * If installed === current (and nothing newer on server): never show the popup.
 */
export function checkForNewVersion(serverVersion?: string | null): VersionCheckResult {
  const currentVersion = normalizeVersion(CURRENT_APP_VERSION);
  const installedVersion = getInstalledAppVersion() ?? currentVersion;
  const targetVersion = pickNewestVersion(currentVersion, serverVersion);
  const hasUpdate = compareVersions(targetVersion, installedVersion) > 0;

  return {
    hasUpdate,
    currentVersion,
    installedVersion,
    targetVersion: hasUpdate ? targetVersion : null,
  };
}

/** @deprecated Use checkForNewVersion().hasUpdate */
export function isUpdateNotificationVisible(serverVersion?: string | null): boolean {
  return checkForNewVersion(serverVersion).hasUpdate;
}

/** @deprecated Use saveInstalledAppVersion */
export function saveSeenAppVersion(version?: string): void {
  saveInstalledAppVersion(version);
}

/** @deprecated Use getInstalledAppVersion */
export function getSeenAppVersion(): string | null {
  return getInstalledAppVersion();
}

/** SW cache bucket — keep in sync with APP_VERSION. */
export function getSwCacheName(version: string = CURRENT_APP_VERSION): string {
  return `zd-thermoliner-${normalizeVersion(version).replace(/\./g, '-')}`;
}
