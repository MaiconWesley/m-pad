const CACHE = 'm-pad-v3';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-180x180.png',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      try {
        const page = await fetch('/');
        const html = await page.text();
        const assetUrls = [...html.matchAll(/"(assets\/[^"]+)"/g)].map(m => m[1]);
        if (assetUrls.length) {
          await cache.addAll(assetUrls);
        }
      } catch {}
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith('/estilos/') ||
    url.pathname.startsWith('/fundos/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname.startsWith('/assets/') &&
    (url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.woff2') ||
     url.pathname.endsWith('.woff') ||
     url.pathname.endsWith('.ttf') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.svg'))
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname === '/icon-192x192.png' ||
    url.pathname === '/icon-512x512.png' ||
    url.pathname === '/icon-180x180.png' ||
    url.pathname === '/logo.png' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }
}
