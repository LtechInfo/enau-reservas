const CACHE = 'enau-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
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

function isStaticAssetRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    const path = url.pathname.toLowerCase();
    return (
      path.endsWith('/') ||
      path.endsWith('/index.html') ||
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

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  if (cached) {
    fetchPromise.catch(() => {});
    return cached;
  }
  const fresh = await fetchPromise;
  return fresh || caches.match(request);
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (isStaticAssetRequest(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
