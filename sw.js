const CACHE = 'pancoon-v7';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/inventory-dates.js',
  '/dashboard-nav.js',
  '/pancoon-polish.js',
  '/pancoon-hotfix.js',
  '/manifest.webmanifest',
  '/assets/PanCoon%20App%20Icon.png',
  '/assets/Home%20Page%20Dinner%20Landscape-Raccon%20on%20left.png',
  '/assets/Mobile%20Experience%20Home%20Page%20Dinner%20Portrait-Raccoon%20on%20Top.png',
  '/assets/Chicken%20Shawrma%20Sheet%20Pan%20Dinner.png',
  '/assets/Mushroom%20Detail.png',
  '/assets/Pink%20Kitchaid%20mixer%20with%20cutting%20board%20and%20utensials.png',
  '/assets/Talbot%20kitchen%20with%20Luna%20and%20Ozzy.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put('/index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});