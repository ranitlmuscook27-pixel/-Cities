const CACHE_NAME = 'skhvatka-umov-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW] Purging cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Игнорируем websocket запросы и POST
  if (event.request.method !== 'GET' || event.request.url.startsWith('ws') || event.request.url.includes('/ws')) {
    return;
  }

  // Network First для всех запросов — всегда отдавать свежую версию с сервера!
  // Кэш используется только при отсутствии сети (офлайн).
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
