// Pixel Fuga: guarda o jogo no aparelho para abrir sem internet (modo sozinho e 2 no mesmo celular).
// Estratégia: tenta a rede primeiro (para sempre pegar a versão nova) e usa a cópia guardada quando estiver offline.
const CACHE = 'pixelfuga-v8';
const SHELL = ['/', '/index.html', '/peerjs.min.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-32.png', '/icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('.apk')) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === 'basic'){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error())))
  );
});
