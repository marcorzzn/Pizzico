// Pizzico — apps/web/public/sw.js
// Riferimento manifesto: §2, §3.1
// Licenza: MIT OR Apache-2.0
//
// Strategia di cache:
//   navigazioni (HTML)  → network-first, fallback cache  → i deploy arrivano subito
//   /assets/*           → cache-first                    → nomi hashati = immutabili
//   resto dei GET       → network-first, fallback cache  → offline resta coperto
//
// CACHE_NAME deve essere incrementato quando cambia la strategia o questo file:
// finché il valore resta invariato il browser non considera il SW aggiornato e
// continua a servire all'infinito l'HTML del primo deploy.

const CACHE_NAME = 'pizzico-cache-v2';
const OFFLINE_KEY = '/';
const PRECACHE = [OFFLINE_KEY, '/manifest.json', '/icon.svg'];

// Le risposte ottenute per redirect non sono memorizzabili e un errore di
// scrittura non deve mai far fallire la richiesta in corso.
function cachePut(request, response) {
  if (!response || !response.ok || response.redirected) return Promise.resolve();
  const copy = response.clone();
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll fallisce per intero al primo errore: ogni voce è indipendente.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // Altre origini: gestite direttamente dal browser.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          cachePut(req, res);
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_KEY)))
        .then((res) => res || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            cachePut(req, res);
            return res;
          })
      )
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        cachePut(req, res);
        return res;
      })
      .catch(() => caches.match(req))
      .then((res) => res || Response.error())
  );
});
