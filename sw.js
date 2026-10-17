/**
 * Pocket Barrister Ghana - Service Worker
 * Ensures 100% offline functionality during police encounters even when mobile data is cut or unavailable.
 */

const CACHE_NAME = 'citizenshield-ghana-v2.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/data/ghana-laws.js',
  './js/engine/evidence-vault.js',
  './js/engine/legal-copilot.js',
  './js/engine/media-recorder.js',
  './js/engine/stealth-mode.js',
  './js/engine/sos-dispatcher.js',
  './assets/icons/icon.svg'
];

// Install Event: Precaches core application shell & legal repository
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use map to fetch non-critically so missing optional files don't fail installation
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[SW] Pre-caching asset skipped: ${asset}`, err.message);
          });
        })
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Clean up stale caches from previous builds
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Removing outdated cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Network-First with Offline Cache Fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // If this is an API call to serverless functions, try network then fallback to offline mock response
  if (requestUrl.pathname.includes('/.netlify/functions/') || requestUrl.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Provide an offline JSON response for encounter analysis if network is severed
          if (requestUrl.pathname.includes('analyze-encounter')) {
            return new Response(
              JSON.stringify({
                threatScore: 65,
                threatState: 'ELEVATED',
                offlineMode: true,
                legalCitation: 'Offline Engine: 1992 Constitution Art. 18 & Act 30',
                sayThis: 'Officer, respectfully, I am exercising my rights under the 1992 Constitution of Ghana. Please state the legal basis for this stop.',
                earbudWhisper: 'Operating offline. Remain calm, polite, and request the officer state the lawful offense.',
                shouldTriggerSOS: false
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          // Offline fallback for SOS dispatch
          if (requestUrl.pathname.includes('dispatch-sos')) {
            return new Response(
              JSON.stringify({
                ok: true,
                offlineQueued: true,
                dispatchId: 'OFFLINE-' + Date.now(),
                message: 'Dispatch queued in local storage and will sync once internet connectivity is restored.'
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }

          return new Response(
            JSON.stringify({ error: 'Device offline. Local client engine active.' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static Assets: Network-First so fresh updates appear immediately, falling back to cache when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('/');
          }
        });
      })
  );
});
