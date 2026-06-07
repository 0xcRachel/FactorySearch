// FactorySearch Service Worker
// Implements Stale-While-Revalidate for app shell, Cache-First for assets

const CACHE_NAME = 'factorysearch-v3';
const STATIC_CACHE = 'factorysearch-static-v3';

// App shell resources to pre-cache (exclude WASM/DB - iOS Safari can't handle cached WASM)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
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

// Utility to clean redirected responses (Fix for iOS Safari bug)
async function cleanResponse(response) {
  const cloned = response.clone();
  const body = await cloned.blob();
  return new Response(body, {
    headers: cloned.headers,
    status: cloned.status,
    statusText: cloned.statusText,
  });
}

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

  // Never cache WASM or DB files - iOS Safari breaks when serving cached binary files
  const isNoCacheAsset = url.pathname.match(/\.(wasm|db)$/);
  if (isNoCacheAsset) {
    // Always pass through to network
    return;
  }

  // Cache-First strategy for static assets (JS, CSS, images)
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|svg|ico|webp|woff2?)$/) ||
    url.pathname.startsWith('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(async response => {
          if (response.ok) {
            const finalResponse = response.redirected ? await cleanResponse(response) : response;
            const clone = finalResponse.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
            return finalResponse;
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
        .then(async response => {
          const finalResponse = response.redirected ? await cleanResponse(response) : response;
          const clone = finalResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return finalResponse;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached && cached.redirected) {
            return await cleanResponse(cached);
          }
          return cached || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Stale-While-Revalidate for everything else
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      let cached = await cache.match(request);
      if (cached && cached.redirected) {
        cached = await cleanResponse(cached);
      }
      
      const fetchPromise = fetch(request).then(async response => {
        if (response.ok) {
          const finalResponse = response.redirected ? await cleanResponse(response) : response;
          cache.put(request, finalResponse.clone());
          return finalResponse;
        }
        return response;
      }).catch(() => cached || new Response('Network error', { status: 503 }));

      return cached || fetchPromise;
    })
  );
});
