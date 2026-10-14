// Misère Perdue — Service Worker
// Caches the app shell (HTML/CSS/JS/icons) for instant web app launches.
// API calls are never cached — they always go to the network.
// Cache-first for static assets, network-first for HTML (so updates land fast).

var CACHE = "mp-shell-v4";
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
  "/img/splash-1290x2796.png",
  "/img/splash-1179x2556.png",
  "/img/splash-1170x2532.png",
  "/img/splash-1284x2778.png",
  "/img/splash-750x1334.png",
  "/img/splash-1125x2436.png",
  "/img/splash-1242x2688.png",
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

// ---------- Push notifications ----------
self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  var title = data.title || "Mis\u00e8re Perdue";
  try {
    if ("setAppBadge" in navigator) {
      if (typeof data.badge === "number" && data.badge > 0) navigator.setAppBadge(data.badge);
      else if (typeof data.badge === "number" && data.badge === 0 && "clearAppBadge" in navigator) navigator.clearAppBadge();
      // Bare push (no badge field): leave the badge alone (don't clear it).
    }
  } catch (e) {}
  var options = {
    body: data.body || "",
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "mp"
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ("focus" in c) { c.navigate(url); c.focus(); return; }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
