// Service Worker for Nexus Academic Hub PWA
// Provides 100% offline standalone execution on mobile devices

const CACHE_NAME = 'nexus-academic-hub-v4';

// Core assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
  '/assets/index.css',
  '/assets/index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
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
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip OAuth endpoints
  if (url.pathname.startsWith('/api/auth/google/start')) return;

  // 1. Navigation requests (opening the web page / app icon):
  // Network first; if disconnected/offline, return cached app shell immediately
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              cache.put('/', response.clone());
            });
          }
          return response;
        })
        .catch(async () => {
          // OFFLINE: Return cached HTML so the app opens natively without PC
          const cachedNavigate = await caches.match(event.request);
          if (cachedNavigate) return cachedNavigate;

          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;

          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;

          return new Response(
            '<!DOCTYPE html><html><body style="background:#0B0F17;color:white;font-family:sans-serif;text-align:center;padding:2rem;"><h2>Nexus Hub Offline</h2><p>Please connect to your PC Wi-Fi once to download the app bundle.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. API Data Requests (/api/...):
  // Try network first to get fresh sync data; fall back to cached API response if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline', message: 'Offline mode' }), {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // 3. Static Assets (Scripts, Styles, Fonts, Icons, Modules):
  // Cache-First with background revalidation: Instant load offline!
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If found in cache, return immediately (instant load offline)
      if (cachedResponse) {
        // Fetch in background to update cache if connected
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {
            // Disconnected: perfectly fine, we already returned cached response
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network and store for next time
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached
          return new Response('', { status: 408, statusText: 'Request timed out / offline' });
        });
    })
  );
});
