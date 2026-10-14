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
function mpNotifBody(n) {
  if (!n) return "You have a new notification";
  // Body = "user: content" — the user is the from, the content is the
  // message (chat) or reply (thread). Falls back to a summary if no preview.
  if (n.preview) return n.from + ": " + n.preview;
  if (n.type === "mention") {
    if (n.kind === "chat") return "@" + n.from + " mentioned you in Chat";
    return "@" + n.from + " mentioned you in \"" + (n.threadTitle || "") + "\"";
  }
  if (n.type === "reply") return n.from + " replied in \"" + (n.threadTitle || "") + "\"";
  if (n.type === "vip") return "You've been upgraded to VIP";
  return "You have a new notification";
}
function mpNotifUrl(n) {
  if (!n) return "/";
  if ((n.type === "mention" || n.type === "reply") && n.threadId) return "/#globe/" + n.threadId;
  return "/#journal";
}
var mpAuthToken = null;
// Persist the token in Cache Storage so the SW has it even when the app
// is closed (in-memory only would be lost when the SW restarts).
function mpSaveToken(t) {
  mpAuthToken = t || null;
  try {
    caches.open("mp-auth").then(function (cache) {
      if (t) return cache.put("/mp-token", new Response(t));
      return cache.delete("/mp-token");
    }).catch(function () {});
  } catch (e) {}
}
function mpLoadToken() {
  if (mpAuthToken) return Promise.resolve(mpAuthToken);
  try {
    return caches.open("mp-auth").then(function (cache) {
      return cache.match("/mp-token");
    }).then(function (res) {
      if (!res) return null;
      return res.text().then(function (t) { mpAuthToken = t || null; return mpAuthToken; });
    }).catch(function () { return null; });
  } catch (e) { return Promise.resolve(null); }
}
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "mp-auth") mpSaveToken(e.data.token);
});
self.addEventListener("push", function (e) {
  // Bare push (no payload): fetch the latest unread notification and show
  // it with title "Misery" + a relevant body. Title is always "Misery".
  if (!e.data) {
    e.waitUntil(self.registration.pushManager.getSubscription().then(function (sub) {
      var ep = (sub && sub.endpoint) || "";
      return fetch("https://api.misereperdue.com/api/push/latest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: ep })
      });
    }).then(function (r) {
      return r.json();
    }).then(function (d) {
      var notifOpts = {
        body: (d && d.body) || "You have a new notification",
        icon: "/img/icon-192.png",
        badge: "/img/icon-192.png",
        data: { url: (d && d.url) || "/" },
        tag: "mp"
      };
      // iOS ignores the subtitle option for web push and always shows
      // "from <app name>" on that line. So the sender goes in the TITLE
      // (first line) — the only line we control besides the body.
      // Server returns the sender as d.subtitle (new) or d.title (old).
      var sender = (d && d.subtitle) || ((d && d.title && d.title !== "Misery") ? d.title : null);
      return self.registration.showNotification(sender || "Misery", notifOpts);
    }).catch(function () {
      return self.registration.showNotification("Misery", {
        body: "You have a new notification",
        icon: "/img/icon-192.png",
        badge: "/img/icon-192.png",
        data: { url: "/" },
        tag: "mp"
      });
    }));
    return;
  }
  var data = {};
  try { data = e.data.json(); } catch (_) {}
  // Encrypted path: title is always "Misery"; body comes from the payload.
  var title = "Misery";
  try {
    if ("setAppBadge" in navigator) {
      if (typeof data.badge === "number" && data.badge > 0) navigator.setAppBadge(data.badge);
      else if (typeof data.badge === "number" && data.badge === 0 && "clearAppBadge" in navigator) navigator.clearAppBadge();
    }
  } catch (e) {}
  var options = {
    body: data.body || (data.notification && data.notification.body) || "",
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    data: { url: data.url || (data.notification && data.notification.navigate) || "/" },
    tag: data.tag || (data.notification && data.notification.tag) || "mp"
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
