// Service worker: офлайн на последних загруженных данных.
// Оболочка и данные — «сеть, потом кэш»; файлы со хешем, иконки, шрифты — «кэш, потом сеть».
// Запросы к OpenDota и Twitch не кэшируются.
const CACHE = 'kontrpik-v4';
const BASE = new URL(self.registration.scope).pathname;
const SHELL = [BASE, BASE + 'manifest.webmanifest', BASE + 'data/stats.json', BASE + 'data/positions.json', BASE + 'data/tips.json', BASE + 'data/patch.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(key || req, r.clone());
    return r;
  } catch (err) {
    const hit = await c.match(key || req);
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) c.put(req, r.clone());
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname;
  // Все страницы приложения (/, /hero/…, /match/…) — одна оболочка.
  if (req.mode === 'navigate') {
    const key = path.startsWith(BASE + 'overlay/') ? BASE + 'overlay/' : path.startsWith(BASE + 'vote/') ? BASE + 'vote/' : BASE;
    e.respondWith(networkFirst(req, key));
    return;
  }
  if (path.startsWith(BASE + 'data/')) { e.respondWith(networkFirst(req)); return; }
  if (path.startsWith(BASE + 'assets/') || path.startsWith(BASE + 'icons/') || /\.(png|svg|woff2?)$/.test(path)) { e.respondWith(cacheFirst(req)); return; }
});
