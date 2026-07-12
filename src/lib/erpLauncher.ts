import { isDesktopPlatform, isNativeErpLauncher } from './appMode';

/** Launcher ERP natif Windows (WebView2) — hors Chrome/Edge. */
export const ERP_LAUNCHER_VERSION = '1.0.1';

export const ERP_LAUNCHER_FILENAME = `ZD-Thermoliner-ERP-Windows-${ERP_LAUNCHER_VERSION}.exe`;

export const ERP_LAUNCHER_DISMISSED_KEY = 'zd_erp_launcher_notice_dismissed';
export const ERP_LAUNCHER_INSTALLED_KEY = 'zd_erp_launcher_installed_version';

export function getErpLauncherDownloadUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/downloads/${ERP_LAUNCHER_FILENAME}`;
  }
  return `https://erp.zd-thermoliner.fr/downloads/${ERP_LAUNCHER_FILENAME}`;
}

export function getDismissedLauncherVersion(): string | null {
  try {
    return localStorage.getItem(ERP_LAUNCHER_DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function getInstalledLauncherVersion(): string | null {
  try {
    return localStorage.getItem(ERP_LAUNCHER_INSTALLED_KEY);
  } catch {
    return null;
  }
}

export function dismissLauncherNotice(version: string = ERP_LAUNCHER_VERSION): void {
  try {
    localStorage.setItem(ERP_LAUNCHER_DISMISSED_KEY, version);
  } catch {
    /* ignore */
  }
}

export function markLauncherDownloaded(version: string = ERP_LAUNCHER_VERSION): void {
  try {
    localStorage.setItem(ERP_LAUNCHER_INSTALLED_KEY, version);
    localStorage.setItem(ERP_LAUNCHER_DISMISSED_KEY, version);
  } catch {
    /* ignore */
  }
}

/** Bandeau « télécharger le launcher » pour PC (pas déjà en launcher natif). */
export function shouldShowLauncherNotice(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isDesktopPlatform()) return false;
  if (isNativeErpLauncher()) return false;

  const installed = getInstalledLauncherVersion();
  if (installed === ERP_LAUNCHER_VERSION) return false;

  const dismissed = getDismissedLauncherVersion();
  if (dismissed === ERP_LAUNCHER_VERSION) return false;

  return true;
}
