/***********************************************************************
 * Service worker — GearPulse Executive launcher shell
 * ---------------------------------------------------------------------
 * Caches ONLY this launcher's own small set of files (the loading
 * screen, manifest, icons). It deliberately does not touch the iframe's
 * content — that's a separate origin (script.google.com), it's what
 * carries live sales/stock/cash figures, and it must always come from
 * the network, never from a cache.
 ***********************************************************************/
var CACHE_NAME = 'gp-exec-launcher-v1';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Only intercept requests for OUR OWN files. Anything the iframe itself
  // requests (script.google.com, googleusercontent.com, etc.) is a
  // different origin and must pass straight through untouched.
  if (new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, res.clone()); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
