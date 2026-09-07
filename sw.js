/* ============================================================
   HAY FULBO — service worker
   Deja la app funcionando sin conexión y permite instalarla.
   Cambiar VERSION invalida el caché anterior en el próximo deploy.
   ============================================================ */
'use strict';

const VERSION = 'v1';
const SHELL_CACHE = 'hayfulbo-shell-' + VERSION;
const FONT_CACHE = 'hayfulbo-fonts-' + VERSION;

/* Todo lo que hace falta para arrancar sin red. */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/util.js',
  './js/state.js',
  './js/teams.js',
  './js/canvas-kit.js',
  './js/themes.js',
  './js/flyers.js',
  './js/ui.js',
  './js/pwa.js',
  './js/main.js',
  './assets/favicon.svg',
];

/* Los iconos son grandes: se cachean si están, pero no bloquean la instalación. */
const OPTIONAL = [
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await cache.addAll(SHELL);
      await Promise.all(OPTIONAL.map((url) => cache.add(url).catch(() => null)));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('hayfulbo-') && key !== SHELL_CACHE && key !== FONT_CACHE)
          .map((key) => caches.delete(key))
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => null);
      }
      await self.clients.claim();
    })()
  );
});

/** La app avisa cuando el usuario acepta actualizar. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Navegación: red primero para tomar deploys nuevos, caché si no hay señal. */
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  /* Tipografías de Google: se sirven del caché y se refrescan en segundo plano. */
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  /* Recursos propios: caché primero, que es lo que hace que abra al instante. */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

async function handleNavigation(event) {
  try {
    const preload = await event.preloadResponse;
    const response = preload || (await fetch(event.request));
    const cache = await caches.open(SHELL_CACHE);
    cache.put('./index.html', response.clone()).catch(() => null);
    return response;
  } catch (_) {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => null);
    return response;
  } catch (err) {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => null);
      }
      return response;
    })
    .catch(() => null);
  return hit || (await network) || Response.error();
}
