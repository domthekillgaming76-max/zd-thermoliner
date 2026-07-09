import {
  APP_VERSION,
  clearDismissedAppVersion,
  saveDismissedAppVersion,
  saveInstalledAppVersion,
} from './appVersion';

/** Full cache purge + SW unregister + reload. Marks bundle as installed. */
export async function applyAppUpdateAndReload(): Promise<void> {
  saveInstalledAppVersion(APP_VERSION);
  clearDismissedAppVersion();

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  window.location.reload();
}

/** Hide banner for this bundle version until a newer one is deployed. */
export function dismissAppUpdateForNow(): void {
  saveDismissedAppVersion(APP_VERSION);
}
