// Misère Perdue — Service Worker
// Caches the app shell (HTML/CSS/JS/icons) for instant web app launches.
// API calls are never cached — they always go to the network.
// Cache-first for static assets, network-first for HTML (so updates land fast).

/* P-H1: CACHE derives from a single version constant matching the sw.js ?v= in index.html */
var SW_VERSION = 376;
var CACHE = "mp-shell-v" + SW_VERSION;
// Emoji images (/emoji/<set>/<key>.svg, Twemoji, see js/emoji.js) live in
// their own cache: filled on first use (never precached: ~4,000 files), kept
// across SW updates, and capped so it can't grow without bound. v2 = Twemoji:
// renaming it makes activate delete v1 (the old Apple images) on every client.
var EMOJI_CACHE = "mp-emoji-v2";
var EMOJI_MAX = 800;
var SHELL = [
  "/",
  "/webapp.json",
  "/css/site.css?v=786",
  "/js/theme.js?v=10",
  "/js/rain.js?v=23",
  "/js/emoji.js?v=2",
  "/js/boot-head.js?v=2",
  "/js/beacon.js?v=1",
  "/js/app.js?v=13",
  "/js/swipe-tabs.js?v=3",
  "/js/shopify.js?v=12",
  "/js/cart.js?v=2",
  "/js/shop.js?v=104",
  "/js/social-logos.js?v=2",
  "/js/chat.js?v=392",
  "/js/dashboard-v2.js?v=61",
  "/js/forum3.js?v=1165",
  "/js/ph-icons.js?v=4",
  "/js/forum-mount-patch.js?v=1078",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/splash-1290x2796.png?v=25",   "/img/splash-1179x2556.png?v=25",
  "/img/splash-1170x2532.png?v=25",
  "/img/splash-1284x2778.png?v=25",
  "/img/splash-750x1334.png?v=25",
  "/img/splash-1125x2436.png?v=25",
  "/img/splash-1242x2688.png?v=25",
  "/img/splash-1206x2622.png?v=25",
  "/img/splash-1320x2868.png?v=25",
  "/img/splash-1260x2736.png?v=25",
  "/offline",
  "/js/offline.js?v=2",
];
// Offline screen: precached at its clean URL (Pages 308s /offline.html -> /offline,
// and a redirected response cannot answer a navigation).
var OFFLINE_URL = "/offline";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // P-H1: one failed entry must not fail the whole install.
      return Promise.allSettled(SHELL.map(function (u) { return cache.add(u); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE && k !== EMOJI_CACHE) return caches.delete(k);
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

  // Emoji images: the set folder is immutable, so cache-first with no
  // background revalidation (one network fetch per emoji, ever).
  if (url.pathname.indexOf("/emoji/") === 0) {
    e.respondWith(
      caches.open(EMOJI_CACHE).then(function (cache) {
        return cache.match(e.request).then(function (hit) {
          if (hit) return hit;
          return fetch(e.request).then(function (res) {
            if (res.ok) {
              cache.put(e.request, res.clone()).then(function () {
                return cache.keys();
              }).then(function (keys) {
                for (var i = 0; i < keys.length - EMOJI_MAX; i++) cache.delete(keys[i]);
              }).catch(function () {});
            }
            return res;
          });
        });
      })
    );
    return;
  }

  // HTML: network-first (fresh file refs on every load), cache as offline fallback.
  // Cache-first HTML served stale file versions (old JS/CSS refs) for days.
  if (e.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html")) {
    // Opening the app with no connection shows the offline screen (per dc),
    // not a stale cached copy of the site.
    var isNav = e.request.mode === "navigate";
    var offline = function () {
      if (isNav) return caches.match(OFFLINE_URL).then(function (o) { return o || caches.match(e.request); });
      return caches.match(e.request);
    };
    if (isNav && self.navigator && self.navigator.onLine === false) { e.respondWith(offline()); return; }
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
        }
        return res;
      }).catch(offline)
    );
    return;
  }

  // P-H1: versioned (?v=) assets are immutable — serve from cache only,
  // never background-revalidate, never re-put. On a cache miss (e.g. a
  // version bump the SW has not precached yet), fetch once without caching.
  if (url.search.indexOf("v=") !== -1) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        return cached || fetch(e.request);
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
  // Milestones have no sender — body is the milestone text itself.
  if (n.type === "milestone") return n.text || n.preview || "You hit a milestone";
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
  if ((n.type === "mention" || n.type === "reply" || n.type === "milestone") && n.threadId) return "/#globe/" + n.threadId;
  return "/#journal";
}
// No auth token is ever stored in the SW. Bare-push content is fetched via
// endpoint-auth (POST /api/push/latest with the subscription endpoint).
// Push grouping + burst control: each shown notification id is recorded
// so a redelivered/queued push never shows the same notification twice.
// Grouping = one tag per notification (tag "mp-<id>"): notifications
// stack grouped under the app instead of every push replacing the last
// (the old shared tag "mp" collapsed everything to one).
var shownPushIds = new Set();
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
      // Home Screen app icon badge: bare pushes are the only path that runs
      // with the app closed, and the old code never set the badge here —
      // so mentions arrived with no number on the icon. Sync from pushLatest.
      // Only act when the server actually sent a count: if the server is
      // still running older code (no `unread` field), leave the badge alone
      // instead of clearing it — clearing on a missing field wipes a badge
      // the app itself had set.
      try {
        if ("setAppBadge" in navigator && d && typeof d.unread === "number") {
          if (d.unread > 0) navigator.setAppBadge(d.unread);
          else if ("clearAppBadge" in navigator) navigator.clearAppBadge();
        }
      } catch (e) {}
      // Present/future only: a bare push can arrive long after its
      // notification was created (APNs queue, SW restart, login burst).
      // If the notification the server returned is older than 15 min,
      // it's already in the tray — showing it now is a stale burst, not
      // a live alert. Skip it silently. The server sends ts: 0 when it
      // has nothing fresh (generic path). Backward-compatible: if the
      // server sent no ts at all (older worker), show it (old behavior)
      // instead of dropping everything during a deploy gap.
      var nts = (d && typeof d.ts === "number") ? d.ts : -1;
      if (nts !== -1 && (!nts || Date.now() - nts > 15 * 60 * 1000)) return;
      // Dedupe: the same notification can be delivered twice (APNs
      // redelivery, queued pushes). Show each notification id once.
      var nid = (d && d.id) || "";
      if (nid) {
        if (shownPushIds.has(nid)) return;
        shownPushIds.add(nid);
        if (shownPushIds.size > 200) shownPushIds.clear();
      }
      var notifOpts = {
        body: (d && d.body) || "You have a new notification",
        icon: "/img/icon-192.png",
        badge: "/img/icon-192.png",
        data: { url: (d && d.url) || "/" },
        tag: "mp-" + (nid || ("t" + Date.now()))
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
  // Only same-origin relative URLs may be navigated to — never an
  // absolute or protocol-relative URL from push data.
  if (typeof url !== "string" || url.charAt(0) !== "/" || url.charAt(1) === "/") url = "/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ("focus" in c) { c.navigate(url); c.focus(); return; }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
