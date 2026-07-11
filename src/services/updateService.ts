import { CURRENT_APP_VERSION, getSwCacheName } from '../lib/appVersion';

const SW_URL = '/sw.js';
export const APP_UPDATE_READY_EVENT = 'zd:app-update-ready';

let registrationRef: ServiceWorkerRegistration | null = null;
let swUpdateReady = false;

function log(message: string, extra?: unknown): void {
  if (extra !== undefined) {
    console.log(`[Z&D PWA] ${message}`, extra);
    return;
  }
  console.log(`[Z&D PWA] ${message}`);
}

export function isServiceWorkerUpdateReady(): boolean {
  return swUpdateReady;
}

export function clearServiceWorkerUpdateReady(): void {
  swUpdateReady = false;
}

function notifyUpdateReady(): void {
  swUpdateReady = true;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_READY_EVENT));
}

export async function cleanOldCaches(keepCacheName?: string): Promise<void> {
  if (!('caches' in window)) return;

  const keep = keepCacheName ?? getSwCacheName();
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('zd-thermoliner-') && key !== keep)
      .map((key) => caches.delete(key)),
  );
}

export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return registrationRef;
}

function watchWorker(worker: ServiceWorker): void {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      log('new version waiting — user action required', CURRENT_APP_VERSION);
      notifyUpdateReady();
    }
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register(`${SW_URL}?v=${CURRENT_APP_VERSION}`, {
      updateViaCache: 'none',
    });
    registrationRef = reg;

    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (worker) watchWorker(worker);
    });

    if (reg.waiting && navigator.serviceWorker.controller) {
      notifyUpdateReady();
    }

    if (reg.installing) {
      watchWorker(reg.installing);
    }

    await cleanOldCaches(getSwCacheName());
    log('registered', CURRENT_APP_VERSION);
    return reg;
  } catch (err) {
    console.warn('[Z&D PWA] registration failed', err);
    return null;
  }
}

export async function activateWaitingServiceWorker(): Promise<void> {
  const reg = registrationRef ?? (await navigator.serviceWorker.getRegistration());
  if (!reg?.waiting) return;
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  await new Promise<void>((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
  });
}
