// Service Worker for Nexus Academic Hub PWA
const CACHE_NAME = 'nexus-academic-hub-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip OAuth endpoints from caching
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/auth/google/start')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === 'basic') {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        // If navigating to a page offline, return root cached html
        if (event.request.mode === 'navigate') {
          const rootCached = await cache.match('/');
          if (rootCached) return rootCached;
        }
        throw err;
      }
    })
  );
});
