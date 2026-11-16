// Misère Perdue — Service Worker
// Caches the app shell (HTML/CSS/JS/icons) for instant web app launches.
// API calls are never cached — they always go to the network.
// Cache-first for static assets, network-first for HTML (so updates land fast).

/* P-H1: CACHE derives from a single version constant matching the sw.js ?v= in index.html */
var SW_VERSION = 636;
var CACHE = "mp-shell-v" + SW_VERSION;
// Emoji images (/emoji/<set>/<key>.svg, Twemoji, see js/emoji.js) live in
// their own cache: filled on first use (never precached: ~4,000 files), kept
// across SW updates, and capped so it can't grow without bound. v2 = Twemoji:
// renaming it makes activate delete v1 (the old Apple images) on every client.
var EMOJI_CACHE = "mp-emoji-v2";
var EMOJI_MAX = 800;
var SHELL = [
  "/",
  "/webapp.json?v=23",
  "/css/site.css?v=967",
  "/js/theme.js?v=10",
  "/js/rain.js?v=25",
  "/js/emoji.js?v=2",
  "/js/boot-head.js?v=4",
  "/js/beacon.js?v=1",
  "/js/app.js?v=20",
  "/js/swipe-tabs.js?v=4",
  "/js/shopify.js?v=15",
  "/js/cart.js?v=3",
  "/js/shop.js?v=158",
  "/js/social-logos.js?v=2",
  "/js/profile-cards.js?v=47",
  "/js/power-icons.js?v=9",
  "/js/chat.js?v=537",
  "/js/social.js?v=10",
  "/js/menu-tabs.js?v=1",
  "/js/misery-fm.js?v=27",
  "/js/dashboard-v2.js?v=68",
  "/js/forum3.js?v=1193",
  "/js/ph-icons.js?v=8",
  "/js/forum-mount-patch.js?v=1081",
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
  "/info",
  "/js/info.js?v=1",
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
    }).then(function () {
      // Speed: let the browser start fetching the page while this worker is still booting.
      var np = self.registration.navigationPreload;
      return np ? np.enable().catch(function () {}) : null;
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
  if (e.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname === "/whop-vip-preview") {
    // Opening the app with no connection shows the offline screen (per dc),
    // not a stale cached copy of the site.
    var isNav = e.request.mode === "navigate";
    var offline = function () {
      if (isNav) return caches.match(OFFLINE_URL).then(function (o) { return o || caches.match(e.request); });
      return caches.match(e.request);
    };
    if (isNav && self.navigator && self.navigator.onLine === false) { e.respondWith(offline()); return; }
    // Navigation preload: use the response the browser already started fetching, if any.
    var pre = isNav && e.preloadResponse ? Promise.resolve(e.preloadResponse).catch(function () {}) : Promise.resolve();
    e.respondWith(
      pre.then(function (hit) { return hit || fetch(e.request); }).then(function (res) {
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
function mpNotifSender(d) {
  if (!d) return null;
  if (d.subtitle) return d.subtitle;
  if (d.title && d.title !== "Misery") return d.title;
  var who = d.from && String(d.from).toLowerCase() !== "misery" ? d.from : "";
  if (!who) return d.type === "milestone" ? "Milestone" : null;
  if (d.type === "whisper" || d.kind === "whisper") return who + " - Whisper";
  if (d.kind === "chat" || (d.type === "reaction" && !d.threadId)) return who + " - Chat";
  if (d.type === "follow" || d.type === "gift") return who;
  if (d.threadId || d.type === "reply" || d.type === "mention" || d.type === "like" || d.type === "repost" || d.type === "quote") return who + " - Globe";
  return who;
}
function mpNotifBody(n) {
  if (!n) return "You have a new notification";
  var preview = String(n.preview || "").trim();
  var name = n.name || "";
  if (n.type === "milestone") return n.text || n.preview || "You hit a milestone";
  if (n.type === "mention") {
    if (n.kind === "chat") return preview || "Mentioned you in Chat";
    return preview || (n.threadTitle ? "Mentioned you in \"" + n.threadTitle + "\"" : "Mentioned you on the Globe");
  }
  if (n.type === "reply") return preview || "Replied to you";
  if (n.type === "whisper" || n.kind === "whisper") return preview || "Whispered you";
  if (n.type === "reaction") {
    var emoji = n.emoji || "";
    if (n.kind === "chat" || !n.threadId) return emoji ? "Reacted " + emoji + " to your message" : "Reacted to your message";
    return emoji ? "Reacted " + emoji + " to your post" : "Liked your post";
  }
  if (n.type === "like") return "Liked your post";
  if (n.type === "repost") return "Reposted your post";
  if (n.type === "quote") return preview || "Quoted your post";
  if (n.type === "follow") return "Followed you";
  if (n.type === "gift") {
    if (n.kind === "stars" || n.n != null) return "Gifted you " + (n.n || 0) + (n.n === 1 ? " star" : " stars");
    return "Gifted you " + (name || "a gift");
  }
  if (n.type === "purchase") return n.kind === "stars" ? (n.n || 0) + ((n.n === 1) ? " star added" : " stars added") : (name || "Your power") + " is yours";
  if (n.type === "power") return "You got " + (name || "a power");
  if (n.type === "vip") return "You're VIP now";
  if (n.type === "fm" || n.type === "live" || n.kind === "fm-live") return "misery fm is live";
  if (n.type === "badge") return name ? "You got the " + name + " badge" : "You got a new badge";
  if (n.body) return n.body;
  if (preview) return preview;
  if (n.text) return n.text;
  return "You have a new notification";
}
function mpNotifUrl(n) {
  if (!n) return "/";
  if (n.url && n.url.charAt(0) === "/" && n.url.charAt(1) !== "/") return n.url;
  if ((n.type === "mention" || n.type === "reply" || n.type === "milestone" || n.type === "like" || n.type === "repost" || n.type === "quote" || n.type === "reaction") && n.threadId) return "/#globe/" + n.threadId;
  return "/#journal";
}
function mpUsefulPayload(data) {
  if (!data || typeof data !== "object") return false;
  var body = data.body || (data.notification && data.notification.body) || "";
  return !!String(body).trim();
}
// No auth token is ever stored in the SW. Bare-push content is fetched via
// endpoint-auth (POST /api/push/latest with the subscription endpoint).
// Push grouping + burst control: each shown notification id is recorded
// so a redelivered/queued push never shows the same notification twice.
// Grouping = one tag per notification (tag "mp-<id>"): notifications
// stack grouped under the app instead of every push replacing the last
// (the old shared tag "mp" collapsed everything to one).
var shownPushIds = new Set();
function mpShowFromLatest(d) {
  try {
    if ("setAppBadge" in navigator && d && typeof d.unread === "number") {
      if (d.unread > 0) navigator.setAppBadge(d.unread);
      else if ("clearAppBadge" in navigator) navigator.clearAppBadge();
    }
  } catch (e) {}
  var nts = (d && typeof d.ts === "number") ? d.ts : -1;
  if (nts !== -1 && (!nts || Date.now() - nts > 15 * 60 * 1000)) return;
  var nid = (d && d.id) || "";
  if (nid) {
    if (shownPushIds.has(nid)) return;
    shownPushIds.add(nid);
    if (shownPushIds.size > 200) shownPushIds.clear();
  }
  var body = (d && d.body) || (d && d.type ? mpNotifBody(d) : "");
  if (!String(body).trim()) return;
  var notifOpts = {
    body: body,
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    data: { url: (d && (d.url || mpNotifUrl(d))) || "/" },
    tag: "mp-" + (nid || ("t" + Date.now()))
  };
  // iOS ignores the subtitle option for web push and always shows
  // "from <app name>" on that line. So the sender goes in the TITLE
  // (first line) — the only line we control besides the body.
  var sender = mpNotifSender(d);
  return self.registration.showNotification(sender || "Misery", notifOpts);
}
function mpFetchLatestAndShow() {
  return self.registration.pushManager.getSubscription().then(function (sub) {
    var ep = (sub && sub.endpoint) || "";
    return fetch("https://api.misereperdue.com/api/push/latest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: ep })
    });
  }).then(function (r) {
    return r.json();
  }).then(mpShowFromLatest).catch(function () {
    // Last resort only: the latest-notification fetch failed.
    return self.registration.showNotification("Misery", {
      body: "You have a new notification",
      icon: "/img/icon-192.png",
      badge: "/img/icon-192.png",
      data: { url: "/" },
      tag: "mp"
    });
  });
}
self.addEventListener("push", function (e) {
  // Bare or empty payload: fetch the latest notification and show it
  // with the sender in the title. Generic copy is only used if that fetch fails.
  var data = null;
  if (e.data) {
    try { data = e.data.json(); } catch (_) { data = null; }
  }
  if (!mpUsefulPayload(data)) {
    e.waitUntil(mpFetchLatestAndShow());
    return;
  }
  try {
    if ("setAppBadge" in navigator) {
      if (typeof data.badge === "number" && data.badge > 0) navigator.setAppBadge(data.badge);
      else if (typeof data.badge === "number" && data.badge === 0 && "clearAppBadge" in navigator) navigator.clearAppBadge();
    }
  } catch (err) {}
  var options = {
    body: data.body || (data.notification && data.notification.body) || "",
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    data: { url: data.url || (data.notification && data.notification.navigate) || "/" },
    tag: data.tag || (data.notification && data.notification.tag) || "mp"
  };
  // Same title rule as the bare path: sender first, never a blank "Misery" title
  // when the payload named the person.
  var sender = mpNotifSender(data) || (data.notification && data.notification.title && data.notification.title !== "Misery" ? data.notification.title : null);
  e.waitUntil(self.registration.showNotification(sender || "Misery", options));
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
