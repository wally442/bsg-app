// =====================================================================
// SERVICE WORKER BSG — PWA / cache hors-ligne
// Version 6 — compatible GitHub Pages (/bsg-app/)
// =====================================================================

const CACHE_NAME = 'bsg-cache-v6';

const APP_SHELL = [
  '/bsg-app/',
  '/bsg-app/index.html',
  '/bsg-app/manifest.json',
  '/bsg-app/icon-192.png',
  '/bsg-app/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[BSG SW] Installation v4...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('[BSG SW] Activation v4...');

  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ne pas intercepter Supabase ni les autres ressources externes.
  // L'application continue donc à utiliser le réseau normalement
  // pour les API et CDN externes.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Mise à jour silencieuse du cache.
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});

        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback uniquement pour les navigations HTML.
          if (event.request.mode === 'navigate') {
            return caches.match('/bsg-app/index.html');
          }
          return new Response('', {
            status: 503,
            statusText: 'Service indisponible hors-ligne'
          });
        });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
