import { saveSeenAppVersion } from './appVersion';

/** Clear SW + caches then hard-reload so new JS bundles load. */
export async function applyAppUpdateAndReload(): Promise<void> {
  saveSeenAppVersion();

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }

  window.location.reload();
}
