const CACHE = 'enau-v4';
const STATIC_ASSETS = [
  './manifest.json',
  './logo.png',
  './favicon.png',
  './favicon.ico',
  './MOBILEICON.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isHtmlRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    const path = url.pathname.toLowerCase();
    return path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('.html');
  } catch (_) {
    return false;
  }
}

function isStaticAssetRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    const path = url.pathname.toLowerCase();
    return (
      path.endsWith('/manifest.json') ||
      path.endsWith('/logo.png') ||
      path.endsWith('/favicon.png') ||
      path.endsWith('/favicon.ico') ||
      path.endsWith('/mobileicon.png')
    );
  } catch (_) {
    return false;
  }
}

// Network-first para HTML — sempre busca versão mais recente, cache só se offline
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate para assets estáticos (logo, ícones — mudam raramente)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) { fetchPromise.catch(() => {}); return cached; }
  const fresh = await fetchPromise;
  return fresh || caches.match(request);
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (isHtmlRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (isStaticAssetRequest(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
