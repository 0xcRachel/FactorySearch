// FactorySearch Service Worker
// Implements Stale-While-Revalidate for app shell, Cache-First for assets

const CACHE_NAME = 'factorysearch-v1';
const STATIC_CACHE = 'factorysearch-static-v1';

// App shell resources to pre-cache
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sql-wasm.wasm',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL).catch(err => {
        console.warn('[SW] Some pre-cache items failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-First for navigation, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Skip DevTools / HMR requests in development
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules')) {
    return;
  }

  // Cache-First strategy for static assets (JS, CSS, WASM, images)
  const isStaticAsset =
    url.pathname.match(/\.(js|css|wasm|png|svg|ico|webp|woff2?)$/) ||
    url.pathname.startsWith('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-First (with offline fallback) for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(cached => cached || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // Stale-While-Revalidate for everything else
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached || new Response('Network error', { status: 503 }));

      return cached || fetchPromise;
    })
  );
});
