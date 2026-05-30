/* NatureScout Service Worker (Session 3.2) – App-Shell-Cache + saubere Update-Strategie.
 *
 * Grundsätze (bewusst konservativ):
 * - Versionierter Cache; bei `activate` werden alte Caches gelöscht → keine veraltete App.
 * - `skipWaiting` + `clients.claim` → neue Version übernimmt zügig.
 * - Navigationen (HTML): network-first mit Cache-/App-Shell-Fallback (immer frisch, offline lauffähig).
 * - Statische Assets (/_next/static, /icons, /images, /fonts): stale-while-revalidate.
 * - /api/* wird NIE gecacht (network-only) – Offline-Datenfluss & Sicherheit (Auth/Upload/Draft).
 */

const VERSION = 'v1';
const APP_SHELL_CACHE = `naturescout-shell-${VERSION}`;
const ASSET_CACHE = `naturescout-assets-${VERSION}`;
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nur same-origin
  if (url.pathname.startsWith('/api/')) return;      // API/Auth nie cachen (network-only)

  // Navigationen: network-first, Fallback auf Cache bzw. App-Shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Statische Assets: stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/fonts/')
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            cache.put(request, response.clone()).catch(() => {});
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
  // sonst: Standardverhalten (Netz)
});
