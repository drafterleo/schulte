var cachePrefix = 'schulte-';
var staticCacheName = cachePrefix + 'v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(staticCacheName).then(cache => {
      return cache.addAll([
        '',
        'index.html',
        'index.html?homescreen=1',
        '?homescreen=1',
        // CSS
        'css/schulte.css',
        'css/w3.css',
        // Images
        'img/dr_down_16.png',
        'img/green_dot.png',
        'img/settings_48.png',
        // JS
        'js/schulte.js',
        'js/vue.min.js',
        'sw.js'
      ])
      .then(() => self.skipWaiting());
    })
  )
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith(cachePrefix) && cacheName != staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
