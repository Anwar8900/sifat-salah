/* =========================================================
   Service Worker — يجعل الموقع يعمل دون إنترنت
   إستراتيجية: pre-cache كامل + cache-first للأصول + network-first للتنقل
   ========================================================= */
const VERSION = 'sifat-salah-v3';
const CORE    = `${VERSION}-core`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './assets/fonts/fonts.css',
  './assets/fonts/Cairo-Var-arabic.woff2',
  './assets/fonts/Cairo-Var-latin.woff2',
  './assets/fonts/Tajawal-300-arabic.woff2',
  './assets/fonts/Tajawal-400-arabic.woff2',
  './assets/fonts/Tajawal-500-arabic.woff2',
  './assets/fonts/Tajawal-700-arabic.woff2',
  './assets/fonts/Tajawal-800-arabic.woff2',
  './assets/fonts/Tajawal-300-latin.woff2',
  './assets/fonts/Tajawal-400-latin.woff2',
  './assets/fonts/Tajawal-500-latin.woff2',
  './assets/fonts/Tajawal-700-latin.woff2',
  './assets/fonts/Tajawal-800-latin.woff2',
  './assets/img/hero-masjid.jpg',
  './assets/img/hero-masjid-sm.jpg',
  './assets/img/hero-masjid-portrait.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-64.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => { /* لا تفشل التثبيت بالكامل */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CORE && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // التنقل: الشبكة أولًا ثم النسخة المخزّنة
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match('./index.html');
        })
    );
    return;
  }

  // الأصول: المخزّن أولًا
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// رسائل من الصفحة (مثل طلب التحديث)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
