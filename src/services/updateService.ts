import { CURRENT_APP_VERSION, getSwCacheName } from '../lib/appVersion';

const SW_URL = '/sw.js';

let registrationRef: ServiceWorkerRegistration | null = null;

function log(message: string, extra?: unknown): void {
  if (extra !== undefined) {
    console.log(`[Z&D PWA] ${message}`, extra);
    return;
  }
  console.log(`[Z&D PWA] ${message}`);
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

async function activateFirstInstall(reg: ServiceWorkerRegistration): Promise<void> {
  if (navigator.serviceWorker.controller) return;

  const worker = reg.installing ?? reg.waiting;
  if (!worker) return;

  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (worker.state === 'installed') {
        worker.removeEventListener('statechange', onStateChange);
        worker.postMessage({ type: 'SKIP_WAITING' });
        resolve();
      }
    };
    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });
}

export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return registrationRef;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const reg = await navigator.serviceWorker.register(`${SW_URL}?v=${CURRENT_APP_VERSION}`);
  registrationRef = reg;

  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        log('new version cached — waiting for user action', CURRENT_APP_VERSION);
      }
    });
  });

  await activateFirstInstall(reg);
  await cleanOldCaches(getSwCacheName());

  log('registered', CURRENT_APP_VERSION);
  return reg;
}
