// FORJA · service worker: funciona sin internet para abrir la app y ver ejercicios.
// Sube el número de versión cada vez que publiques cambios importantes.
const CACHE = 'forja-v3';
const SHELL = ['./', './index.html', './app.html', './panel.html', './manifest.json',
  './js/fb.js', './js/firebase-config.js', './js/forja-config.js', './js/instalar.js', './js/vendor/html5-qrcode.min.js', './js/vendor/qrcode-generator.js',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase y fuentes van directo a internet
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js');
  if (isPage) {
    // Primero internet (para ver siempre la última versión); si no hay conexión, la copia guardada
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
