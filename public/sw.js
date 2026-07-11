/* CACHE_NAME injected at build — placeholder __CACHE_NAME__ */
const CACHE_NAME = '__CACHE_NAME__';

/** Offline-only assets — never cache index.html or JS bundles. */
const OFFLINE_ASSETS = ['/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('zd-thermoliner-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith('/api')
    || url.pathname === '/version.json'
    || url.pathname === '/sw.js'
    || url.pathname.startsWith('/assets/')
  ) {
    return;
  }

  const isNavigation =
    request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname.endsWith('.html');

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(
          '<!DOCTYPE html><html lang="fr"><body style="background:#080808;color:#fff;font-family:sans-serif;text-align:center;padding:48px">'
          + '<p>Hors ligne — reconnectez-vous pour charger Z&amp;D Thermoliner.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      }),
    );
    return;
  }

  if (OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached ?? network;
      }),
    );
  }
});
