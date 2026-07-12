/** Launcher ERP natif Windows (WebView2) — hors Chrome/Edge. */
export const ERP_LAUNCHER_VERSION = '1.0.0';

export const ERP_LAUNCHER_FILENAME = `ZD-Thermoliner-ERP-Windows-${ERP_LAUNCHER_VERSION}.exe`;

export function getErpLauncherDownloadUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/downloads/${ERP_LAUNCHER_FILENAME}`;
  }
  return `https://erp.zd-thermoliner.fr/downloads/${ERP_LAUNCHER_FILENAME}`;
}
