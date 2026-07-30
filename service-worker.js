const CACHE_NAME = 'taiwan-fishing-assistant-v3.1.1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/layout.css',
  './css/components.css',
  './css/mobile.css',
  './js/app.js',
  './js/config.js',
  './js/state.js',
  './js/api/cwa.js',
  './js/api/openmeteo.js',
  './js/modules/tide.js',
  './js/modules/weather.js',
  './js/modules/chart.js',
  './js/modules/map.js',
  './js/modules/lunar.js',
  './js/modules/favorite.js',
  './js/modules/share.js',
  './js/modules/date-nav.js',
  './js/modules/location-picker.js',
  './js/utils/storage.js',
  './js/utils/geo.js',
  './js/utils/date.js',
  './data/spots.json',
  './data/fish.json',
  './images/icon-192.svg',
  './images/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
