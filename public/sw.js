const CACHE_NAME = 'aac-board-studio-v4';
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const appUrl = (path = '') => `${SCOPE_PATH}${path}`;
const STATIC_SHELL = [appUrl('manifest.webmanifest'), appUrl('icon.svg'), appUrl('maskable-icon.svg')];

async function cacheShell(response) {
  if (!response.ok) throw new Error('App shell fetch failed');
  const html = await response.clone().text();
  const indexUrl = new URL(appUrl('index.html'), self.location.origin);
  const assetUrls = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)]
    .filter(([tag]) => /^<script\b/i.test(tag) || /\brel=["']stylesheet["']/i.test(tag))
    .map(([, path]) => new URL(path, indexUrl))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.href);
  const cache = await caches.open(CACHE_NAME);
  // Keep the HTML paired with its hashed JS/CSS, even when the old worker
  // handled the first visit to a newly deployed build.
  await cache.addAll(assetUrls);
  await cache.put(appUrl('index.html'), response.clone());
  await cache.put(appUrl(), response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(appUrl('index.html'), { cache: 'reload' });
    await cacheShell(response);
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('aac-board-studio-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // This HashRouter app only uses its root and index.html as navigation shells.
    if (requestUrl.pathname !== SCOPE_PATH && requestUrl.pathname !== appUrl('index.html')) return;
    const networkResponse = fetch(request);
    event.waitUntil(networkResponse.then((response) => cacheShell(response)).catch(() => undefined));
    event.respondWith(networkResponse.catch(() => caches.match(appUrl('index.html'))));
    return;
  }

  event.respondWith(caches.match(request).then((cachedResponse) => {
    const networkResponse = fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => cachedResponse || Response.error());
    return cachedResponse || networkResponse;
  }));
});
