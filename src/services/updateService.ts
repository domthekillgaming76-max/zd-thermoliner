import {
  CURRENT_APP_VERSION,
  checkForNewVersion,
  getSwCacheName,
  type VersionCheckResult,
} from '../lib/appVersion';

const SW_URL = '/sw.js';
const UPDATE_POLL_MS = 60_000;

let registrationRef: ServiceWorkerRegistration | null = null;
let updatePollTimer: number | null = null;

function log(message: string, extra?: unknown): void {
  if (extra !== undefined) {
    console.log(`[Z&D PWA] ${message}`, extra);
    return;
  }
  console.log(`[Z&D PWA] ${message}`);
}

async function ensureFirstInstallActivation(reg: ServiceWorkerRegistration): Promise<void> {
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

export async function activateWaitingServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const reg = registrationRef ?? await navigator.serviceWorker.getRegistration();
  if (!reg) return false;

  await reg.update();

  const waiting = reg.waiting;
  if (!waiting) return !!navigator.serviceWorker.controller;

  return new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => resolve(false), 8_000);

    const onControllerChange = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      resolve(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    waiting.postMessage({ type: 'SKIP_WAITING' });
  });
}

export async function checkForSwUpdate(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const reg = registrationRef ?? await navigator.serviceWorker.getRegistration();
  if (!reg) return null;

  await reg.update();
  return reg;
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
        log('update waiting for user action', CURRENT_APP_VERSION);
      }
    });
  });

  await ensureFirstInstallActivation(reg);
  await cleanOldCaches(getSwCacheName());

  if (updatePollTimer !== null) {
    window.clearInterval(updatePollTimer);
  }

  updatePollTimer = window.setInterval(() => {
    void reg.update();
  }, UPDATE_POLL_MS);

  log('registered', CURRENT_APP_VERSION);
  return reg;
}

export function checkForNewVersionWithServer(serverVersion?: string | null): VersionCheckResult {
  return checkForNewVersion(serverVersion);
}
