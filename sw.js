/* ============================================================
   HAY FULBO — service worker
   Deja la app funcionando sin conexión y permite instalarla.
   Cambiar VERSION invalida el caché anterior en el próximo deploy.
   ============================================================ */
'use strict';

const VERSION = 'v10';
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

/* Los iconos son grandes: se cachean si están, pero no son imprescindibles. */
const OPTIONAL = [
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  /*
   * Toma el control apenas termina de precachear. Con el shell atómico la
   * versión entra completa o no entra, así que no hay riesgo de mezclar
   * archivos; a cambio, nadie queda encerrado en una versión rota esperando
   * a cerrar todas las pestañas.
   */
  self.skipWaiting();
  event.waitUntil(precache());
});

/**
 * Guarda el shell archivo por archivo: con addAll, un solo 404 aborta todo
 * el precacheo y la app se queda sin modo offline sin que nadie se entere.
 */
async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  const urls = SHELL.concat(OPTIONAL);
  const results = await Promise.allSettled(
    urls.map((url) => cache.add(new Request(url, { cache: 'reload' })))
  );
  const failed = urls.filter((_, i) => results[i].status === 'rejected');
  if (failed.length) console.warn('[hayfulbo][sw] sin cachear:', failed.join(', '));
}

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

  /* Navegación: sale del mismo caché que el resto del shell (ver handleNavigation). */
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

/**
 * El HTML sale del mismo caché que el JS y el CSS.
 *
 * Servir la navegación desde la red mientras los scripts salen del caché
 * mezcla versiones: alcanza con que un deploy renombre un id para que el JS
 * viejo no encuentre su elemento, tire una excepción y deje media app sin
 * enganchar. Con el shell atómico, HTML y scripts son siempre de la misma
 * generación y la versión nueva entra entera al activarse el worker nuevo.
 */
async function handleNavigation(event) {
  const cache = await caches.open(SHELL_CACHE);

  /* Sólo las URLs que precacheamos salen del caché: cualquier otra página del
     sitio (por ejemplo el banco de pruebas) tiene que ir a la red. */
  const hit = await cache.match(event.request, { ignoreSearch: true });
  if (hit) return hit;

  try {
    const preload = await event.preloadResponse;
    const response = preload || (await fetch(event.request));
    return response;
  } catch (_) {
    /* Sin red devolvemos la app: es lo único que sabemos servir. */
    return (await cache.match('./index.html')) || Response.error();
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
