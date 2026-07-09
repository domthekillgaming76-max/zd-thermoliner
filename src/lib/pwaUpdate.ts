import { CURRENT_APP_VERSION, getSwCacheName, saveInstalledAppVersion } from './appVersion';
import {
  activateWaitingServiceWorker,
  cleanOldCaches,
  checkForSwUpdate,
} from '../services/updateService';

/**
 * Download + activate the new SW, purge stale caches, persist installed version, reload.
 */
export async function applyAppUpdateAndReload(
  targetVersion: string = CURRENT_APP_VERSION,
): Promise<void> {
  const normalizedTarget = targetVersion.trim().replace(/^v/i, '').toLowerCase();
  saveInstalledAppVersion(normalizedTarget);

  if ('serviceWorker' in navigator) {
    await checkForSwUpdate();
    const activated = await activateWaitingServiceWorker();
    await cleanOldCaches(getSwCacheName(normalizedTarget));

    if (!activated) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    }
  } else if ('caches' in window) {
    await cleanOldCaches(getSwCacheName(normalizedTarget));
  }

  window.location.reload();
}
