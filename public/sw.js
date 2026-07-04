const STATIC_CACHE = "fury-x-one-static-v5";
const RUNTIME_CACHE = "fury-x-one-runtime-v5";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  "/index.html",
  "/coupon.html",
  "/match.html",
  "/creator.html",
  "/offline.html",
  "/styles.css",
  "/pwa.js",
  "/script.js",
  "/coupon.js",
  "/match.js",
  "/visualGenerator.js",
  "/site-api.js",
  "/888starz-api.js",
  "/notifications.js",
  "/loading-indicator.js",
  "/error-handler.js",
  "/assistant-widget.js",
  "/notification-service.js",
  "/notification-panel.js",
  "/notification-panel.css",
  "/manifest.json",
  "/icons/icon-72x72.svg",
  "/icons/icon-96x96.svg",
  "/icons/icon-128x128.svg",
  "/icons/icon-144x144.svg",
  "/icons/icon-152x152.svg",
  "/icons/icon-192x192.svg",
  "/icons/icon-384x384.svg",
  "/icons/icon-512x512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const isApiRequest = requestUrl.pathname.startsWith("/api/");

  if (isNavigation) {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  if (isApiRequest) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isSameOrigin) {
    if (requestUrl.pathname.endsWith(".js") || requestUrl.pathname.endsWith(".html") || requestUrl.pathname.endsWith(".css")) {
      event.respondWith(networkFirst(event.request));
      return;
    }
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Web Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nouvelle notification FURY X ONE',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-96x96.svg',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
        icon: '/icons/icon-96x96.svg'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/icon-96x96.svg'
      }
    ],
    requireInteraction: true,
    tag: 'fury-x-one-notification'
  };

  // Try to parse JSON data if available
  try {
    const data = event.data?.text() ? JSON.parse(event.data.text()) : null;
    if (data) {
      options.title = data.title || 'FURY X ONE';
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
      if (data.priority === 'high') {
        options.requireInteraction = true;
      }
    }
  } catch (e) {
    // If not JSON, use text as body
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'FURY X ONE', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return caches.match(OFFLINE_URL);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: "Connexion indisponible"
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await caches.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cachedResponse || networkPromise || caches.match(OFFLINE_URL);
}
