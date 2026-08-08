// PanCoon is intentionally running without a service worker while the core
// interaction model is stabilized. Existing installations receive this worker,
// which clears only PanCoon caches and then unregisters itself. Local app data
// in localStorage is untouched.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('pancoon-')).map(key => caches.delete(key)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try { await self.clients.claim(); } catch (_) {}
  })());
});
