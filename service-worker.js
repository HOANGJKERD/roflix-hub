const CACHE_NAME = 'roflix-app-shell-v7';
const APP_SHELL = [
  '/', '/index.html', '/manifest.webmanifest', '/icons/roflix-icon.svg',
  '/rohub.html', '/roflix.html', '/rotruyen.html', '/css/rohub.css', '/js/rohub.js',
  '/css/rotruyen/main.css', '/js/rotruyen/app.js'
];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener('message', event => {
  if (event.data?.type === 'ROFLIX_SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Admin pages are intentionally never cached.
  if (url.pathname === '/admin.html' || url.pathname.startsWith('/admin/') || url.pathname === '/rotruyen-admin.html') return;
  if (url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(req, {cache: 'no-store'}).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(req, copy);
          if (!url.search) cache.put(url.pathname, response.clone());
        });
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(req) || await caches.match(url.pathname);
      if (cached) return cached;
      return caches.match('/index.html');
    }));
    return;
  }
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(fetch(req, {cache: 'no-store'}).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return response;
    }).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    }
    return response;
  })));
});
