// Rumbio Progressive Web App Service Worker
// Version: 1.0.0

const CACHE_NAME = 'rumbio-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/branding/rumbio-logo-2d.svg',
  '/branding/rumbio-logo-3d.svg'
];

// Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Rumbio SW] Pre-cache non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first for dynamic API & Auth requests; Cache-first with network fallback for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // NEVER cache API requests, authentication, tokens or sensitive data
  if (requestUrl.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  // Navigation requests (HTML pages): Network-first with offline cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Static Assets: Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid basic responses for assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (requestUrl.pathname.startsWith('/icons/') ||
            requestUrl.pathname.startsWith('/branding/') ||
            requestUrl.pathname.endsWith('.js') ||
            requestUrl.pathname.endsWith('.css') ||
            requestUrl.pathname.endsWith('.svg') ||
            requestUrl.pathname.endsWith('.png'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
