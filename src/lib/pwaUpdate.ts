import {
  APP_VERSION,
  clearDismissedAppVersion,
  saveDismissedAppVersion,
  saveInstalledAppVersion,
} from './appVersion';
import {
  activateWaitingServiceWorker,
  cleanOldCaches,
  clearServiceWorkerUpdateReady,
  getServiceWorkerRegistration,
} from '../services/updateService';

/** Full cache purge + optional SW activation + reload. Marks bundle as installed. */
export async function applyAppUpdateAndReload(targetVersion?: string): Promise<void> {
  saveInstalledAppVersion(targetVersion ?? APP_VERSION);
  clearDismissedAppVersion();
  clearServiceWorkerUpdateReady();

  if ('serviceWorker' in navigator) {
    try {
      await activateWaitingServiceWorker();
    } catch {
      /* waiting worker may not exist */
    }
    const reg = getServiceWorkerRegistration();
    if (reg) {
      await reg.update();
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  }

  await cleanOldCaches();
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  window.location.reload();
}

/** Hide banner for this version until a newer one is deployed. */
export function dismissAppUpdateForNow(version: string = APP_VERSION): void {
  saveDismissedAppVersion(version);
  clearServiceWorkerUpdateReady();
}
