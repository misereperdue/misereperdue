// Misère Perdue — Service Worker
// Caches the app shell (HTML/CSS/JS/icons) for instant web app launches.
// API calls are never cached — they always go to the network.
// Cache-first for static assets, network-first for HTML (so updates land fast).

var CACHE = "mp-shell-v3";
var SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/site.css",
  "/js/theme.js",
  "/js/shopify.js",
  "/js/cart.js",
  "/js/shop.js",
  "/js/social-logos.js",
  "/js/chat.js",
  "/js/dashboard-v2.js",
  "/js/forum3.js",
  "/js/ph-icons.js",
  "/js/forum-mount-patch.js",
  "/img/apple-touch-icon.png",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/favicon.png",
  "/video/header.jpg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // Never cache API, WebSocket, or cross-origin requests
  if (url.pathname.indexOf("/api/") === 0) return;
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // HTML: cache-first for instant app-shell loads, update in background.
  // The shell (HTML) changes rarely; API data always stays fresh (never cached).
  if (e.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html")) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        var network = fetch(e.request).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
          }
          return res;
        }).catch(function () { return cached; });
        // Serve cached shell instantly if available, else wait for network
        return cached || network;
      })
    );
    return;
  }

  // Static assets: cache first, update in background
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
