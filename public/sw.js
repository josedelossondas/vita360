const CACHE_NAME = 'vita360-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch - Estrategia Network First para APIs, Cache First para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Para APIs, usar Network First pero NO cachear mutaciones (POST, PUT, PATCH, DELETE)
  if (url.pathname.startsWith('/api') || url.origin !== location.origin) {
    // Si es GET, cachear respuesta
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Guardar en caché si es exitoso
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Si falla la red, intentar caché
            return caches.match(request).then((response) => {
              return response || new Response('Offline', { status: 503 });
            });
          })
      );
    } else {
      // Para POST, PUT, PATCH, DELETE: Network First pero NO cachear
      event.respondWith(
        fetch(request)
          .then((response) => response)
          .catch(() => {
            return new Response(
              JSON.stringify({ error: 'Sin conexión. Intenta más tarde.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          })
      );
    }
    return;
  }

  // Para assets, usar Cache First
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((response) => {
          // Guardar en caché si es exitoso
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
      );
    })
  );
});

// Manejo de mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications (cuando operarios envían actualizaciones)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nueva actualización en Atención 360',
    icon: '/public/manifest.json',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23306CBB" width="192" height="192"/><text x="96" y="96" font-size="70" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">360</text></svg>',
    tag: data.tag || 'default',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Atención 360', options));
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si ya hay una ventana, traerla al frente
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
