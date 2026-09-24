// FDF app service worker. Keeps the small app shell available offline so the
// home-screen icon always opens instantly. Only the files listed in SHELL are
// ever touched: index.html (the big dashboard) and all Sleeper/ESPN data calls
// go straight to the network untouched, so scores are never stale.
const CACHE = 'fdf-app-v1';
const SHELL = ['matchup.html', 'manifest.webmanifest', 'logo.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const rel = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (!SHELL.includes(rel)) return;
  // network first (so updates pushed to GitHub show up right away), cache as fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(rel, copy)); }
      return res;
    }).catch(() => caches.match(rel))
  );
});
