var CACHE_NAME = 'ditty-v5';
var URLS_TO_CACHE = [
  '/ditty-app/',
  '/ditty-app/index.html',
  '/ditty-app/manifest.json',
  '/ditty-app/icon-192.png',
  '/ditty-app/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Special+Elite&family=Bebas+Neue&family=Courier+Prime:wght@400;700&display=swap'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    }).catch(function(err) {
      console.log('Cache install error:', err);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Always network-first for HTML pages
  if (url.indexOf('.html') !== -1 || url.endsWith('/ditty-app/') || url.endsWith('/ditty-app')) {
    event.respondWith(
      fetch(event.request).then(function(networkResponse) {
        var clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return networkResponse;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Always go network-first for API calls
  if (url.indexOf('openai.com') !== -1 ||
      url.indexOf('jsonbin.io') !== -1 ||
      url.indexOf('openfoodfacts.org') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response('{"error":"offline"}', {headers: {'Content-Type': 'application/json'}});
      })
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        return caches.match('/ditty-app/index.html');
      });
    })
  );
});
