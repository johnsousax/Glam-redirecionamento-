// Service worker do Pixel Fuga.
// Página do jogo: sempre da rede quando há internet (a atualização chega na hora); sem internet, usa a última cópia salva.
// Arquivos do jogo e fontes: usa a cópia salva e atualiza em segundo plano.
// Servidor de salas (PeerJS), outros sites e o APK nunca passam por aqui.
const CACHE = 'pixelfuga-v1.3';
const CORE = ['./', 'peerjs.min.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('pixelfuga-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const ROOT = new URL('./', self.location).pathname;
const isGamePage = url => url.origin === self.location.origin && (url.pathname === ROOT || url.pathname === ROOT + 'index.html');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){ e.respondWith(cacheFirst(req)); return; }
  if (url.origin !== self.location.origin || url.pathname.endsWith('.apk')) return;
  if (req.mode === 'navigate'){
    const game = isGamePage(url);
    e.respondWith(fetch(req).then(res => {
      if (game && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
      return res;
    }).catch(async () => (await caches.match(game ? './' : req, { ignoreSearch: game })) || caches.match('./')));
    return;
  }
  e.respondWith(staleWhileRevalidate(req));
});

async function cacheFirst(req){
  const c = await caches.open(CACHE), hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req){
  const c = await caches.open(CACHE), hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
  return hit || net;
}
