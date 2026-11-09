/* mpHide: per-viewer hidden users (localStorage; no Worker prefs endpoint exists) */
(function () {
  if (window.mpHide) return;
  var KEY = "mp_hidden_v1";
  function all() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function vk() { return H.viewer || localStorage.getItem("mp_hide_viewer") || "anon"; }
  function mpName(u) {
    return (window.mpName || function (x) { return String(x == null ? "" : x).replace(/^@+/, "").toLowerCase(); })(u);
  }
  function mpAt(u) {
    return (window.mpAt || function (x) { var n = mpName(x); return n ? "@" + n : ""; })(u);
  }
  function load() { var a = all()[vk()]; return Array.isArray(a) ? a : []; }
  function save(a) { try { var o = all(); o[vk()] = a; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function low(u) { return String(u || "").replace(/^@/, "").toLowerCase(); }
  var H = {
    viewer: null,
    list: load,
    is: function (u) { u = low(u); return !!u && load().some(function (x) { return x.u === u; }); },
    hide: function (u, id) { u = low(u); if (!u) return; var a = load().filter(function (x) { return x.u !== u; }); a.push({ u: u, id: id || null, at: Date.now() }); save(a); H.emit(); },
    unhide: function (u) { u = low(u); save(load().filter(function (x) { return x.u !== u; })); H.emit(); },
    /* rename-safe: if a stored entry has this numeric id under an old handle, move it to the new handle */
    seen: function (u, id) { if (!id) return; u = low(u); var a = load(), ch = !1; a.forEach(function (x) { x.id && String(x.id) === String(id) && x.u !== u && ((x.u = u), (ch = !0)); }); ch && (save(a), H.emit()); },
    setViewer: function (v) { v = low(v) || null; if (v === H.viewer) return; H.viewer = v; try { v && localStorage.setItem("mp_hide_viewer", v); } catch (e) {} H.emit(); },
    filt: function (r) { if (!r) return r; var o = {}, any = !1; Object.keys(r).forEach(function (k) { H.is(k) ? (any = !0) : (o[k] = r[k]); }); return any ? o : r; },
    css: function () {
      var st = document.getElementById("mp-hide-css");
      st || ((st = document.createElement("style")), (st.id = "mp-hide-css"), document.head.appendChild(st));
      st.textContent = load().map(function (x) { var q = '"' + x.u.replace(/["\\]/g, "\\$&") + '" i'; return '.chat-msg[data-user=' + q + '],.chat-typing-user[data-user=' + q + ']{display:none!important}'; }).join("\n");
    },
    emit: function () { H.css(); try { window.dispatchEvent(new CustomEvent("mp-hidden-change")); } catch (e) {} },
    toast: function (msg, undo) {
      var old = document.querySelector(".mp-toast"); old && old.remove();
      var t = document.createElement("div"); t.className = "mp-toast"; t.setAttribute("role", "status");
      var sp = document.createElement("span"); sp.textContent = msg; t.appendChild(sp);
      if (undo) { var b = document.createElement("button"); b.type = "button"; b.textContent = "Undo"; b.addEventListener("click", function () { undo(); t.remove(); }); t.appendChild(b); }
      document.body.appendChild(t); requestAnimationFrame(function () { t.classList.add("is-in"); });
      setTimeout(function () { t.classList.remove("is-in"); setTimeout(function () { t.remove(); }, 260); }, 3200);
    },
    /* small glass action menu anchored to an element */
    menu: function (anchor, items) {
      var prev = document.querySelector(".mp-ctx-menu"); prev && prev.remove();
      var m = document.createElement("div"); m.className = "chat-plus-menu mp-ctx-menu"; m.setAttribute("role", "menu");
      function close() { document.removeEventListener("pointerdown", out, !0); document.removeEventListener("keydown", esc, !0); window.removeEventListener("scroll", close, !0); m.classList.remove("is-in"); m.classList.add("is-out"); setTimeout(function () { m.remove(); }, 180); }
      function out(e) { m.contains(e.target) || close(); }
      function esc(e) { "Escape" === e.key && (e.preventDefault(), close()); }
      items.forEach(function (it, i) {
        if (i) { var sp = document.createElement("div"); sp.className = "chat-pmenu-sep"; m.appendChild(sp); }
        var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem");
        b.className = "chat-pmenu-row" + (it.danger ? " is-danger" : "");
        b.innerHTML = (it.icon || "") + "<span></span>"; b.querySelector("span").textContent = it.label;
        b.addEventListener("click", function (e) { e.stopPropagation(); close(); it.run(); });
        m.appendChild(b);
      });
      document.body.appendChild(m);
      var r = anchor.getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth, vw = innerWidth;
      var left = Math.max(8, Math.min(r.left, vw - w - 8)), up = r.top - h - 8 > 60, top = up ? r.top - h - 8 : r.bottom + 8;
      m.style.cssText = "position:fixed;left:" + left + "px;top:" + top + "px;bottom:auto;z-index:2147483000;transform-origin:" + (r.left + r.width / 2 - left) + "px " + (up ? h + 8 + r.height / 2 : -8 - r.height / 2) + "px";
      requestAnimationFrame(function () { m.classList.add("is-in"); });
      setTimeout(function () { document.addEventListener("pointerdown", out, !0); document.addEventListener("keydown", esc, !0); window.addEventListener("scroll", close, !0); }, 0);
      return m;
    },
  };
  window.mpHide = H;
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", H.css) : H.css();
})();
/* Globe: content from users the viewer hid becomes a muted placeholder */
(function () {
  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.98 8.22A10.48 10.48 0 0 0 1.93 12C3.23 16.34 7.24 19.5 12 19.5c.99 0 1.95-.14 2.86-.4M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.76 0 8.77 3.16 10.07 7.5a10.5 10.5 0 0 1-4.29 5.77M6.23 6.23 3 3m3.23 3.23 3.65 3.65m7.89 7.89L21 21m-3.23-3.23-3.65-3.65a3 3 0 1 0-4.24-4.24m4.24 4.24L9.88 9.88"/></svg>';
  function mark(el, u, label) {
    var hid = mpHide.is(u), ph = el.querySelector(":scope > .mp-hid-ph");
    if (hid) {
      el.classList.add("mp-hid");
      if (!ph) {
        ph = document.createElement("button"); ph.type = "button"; ph.className = "mp-hid-ph";
        ph.innerHTML = EYE + "<span></span>"; ph.querySelector("span").textContent = label;
        ph.addEventListener("click", function (e) {
          e.stopPropagation(); e.preventDefault();
          mpHide.menu(ph, [{ label: "Unhide", run: function () { mpHide.unhide(u); mpHide.toast("User is visible again"); } }]);
        });
        el.insertBefore(ph, el.firstChild);
      }
    } else if (el.classList.contains("mp-hid")) { el.classList.remove("mp-hid"); ph && ph.remove(); }
  }
  function scan(root) {
    if (!window.mpHide) return;
    root.querySelectorAll(".forum-thread-row").forEach(function (r) {
      var n = r.querySelector(".forum-thread-author-name"), u = n && n.firstChild && n.firstChild.textContent.trim();
      u && mark(r, u, "Post made by a hidden user");
    });
    root.querySelectorAll("article.forum-post").forEach(function (a) {
      var p = a.querySelector(":scope > .forum-post-head [data-username]"), u = p && p.getAttribute("data-username");
      u && mark(a, u, a.classList.contains("forum-op") ? "Post made by a hidden user" : "Reply made by a hidden user");
    });
  }
  var q = 0;
  function sched() { q || (q = requestAnimationFrame(function () { q = 0; var r = document.getElementById("forum-root"); r && scan(r); })); }
  new MutationObserver(sched).observe(document.documentElement, { childList: !0, subtree: !0 });
  window.addEventListener("mp-hidden-change", sched);
  sched();
})();
!(function () {
  "use strict";
  /* Globe card direction: g1 Editorial (default), g2 Media-first, g3 Compact. Switch: localStorage mp-gcards. */
  (function () {
    var v = "g1";
    try {
      v = localStorage.getItem("mp-gcards") || "g1";
    } catch (e) {}
    (-1 === ["g1", "g2", "g3"].indexOf(v) && (v = "g1"),
      document.documentElement.setAttribute("data-gcards", v));
  })();
  /* Globe pin: vertical side rail only (per dc). */
  // CSP: no inline onerror. Images with data-fallback swap to it once on error.
  document.addEventListener(
    "error",
    function (ev) {
      var x = ev.target;
      if (x && "IMG" === x.tagName && x.getAttribute("data-fallback")) {
        var f = x.getAttribute("data-fallback");
        x.removeAttribute("data-fallback");
        x.src = f;
      }
    },
    !0,
  );
  var e = "https://api.misereperdue.com",
    t = null,
    r = { name: "list", category: "", tag: "", threadId: null, replyTo: null, showNested: {} },
    n = "",
    a = !1,
    o = !1,
    i = 0,
    l = 0,
    searchOpen = !1;
  try {
    l = parseInt(sessionStorage.getItem("mp-forum-cat-scroll") || "0", 10) || 0;
  } catch (e) {}
  try {
    searchOpen = sessionStorage.getItem("mp-forum-search-open") === "1";
  } catch (e) {}
  var s = "",
    d = "",
    c = {},
    u = null;
  function f(e) {
    return String(e || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 12);
  }
  function m(e, t) {
    var r = e.tags || [];
    if (!r.length) return "";
    var n = !!c[e.id],
      a = (n ? r : r.slice(0, t))
        .map(function (e) {
          return (
            '<button type="button" class="forum-tag" data-tag="' + w(e) + '">#' + w(e) + "</button>"
          );
        })
        .join("");
    return (
      !n &&
        r.length > t &&
        (a +=
          '<button type="button" class="forum-tag forum-tag-more" data-tagmore="' +
          w(e.id) +
          '">+' +
          (r.length - t) +
          "</button>"),
      a
    );
  }
  // Events deliver instant updates; polling also covers signed-out visitors,
  // missed broadcasts and suspended mobile sockets. Never remount an editor.
  var liveRequest = null;
  function liveBlocked() {
    var active = document.activeElement;
    var selection = window.getSelection && window.getSelection();
    return !t || document.hidden || !document.querySelector("#forum.on") ||
      (r.name !== "list" && r.name !== "thread") || $() ||
      window.__mpPullToPost || t.querySelector(".is-pulling, .is-settle, .forum-view-enter") ||
      (active && t.contains(active) && active.matches("input, textarea, select, [contenteditable=true]")) ||
      !!(selection && !selection.isCollapsed && t.contains(selection.anchorNode)) ||
      !!document.querySelector(".chat-pmenu, .forum-copy-dialog-back") ||
      Array.from(t.querySelectorAll("video, audio")).some(function (m) { return !m.paused; });
  }
  function livePaint(render) {
    // Keep the first visible card/reply at the same screen position if rows
    // above it arrive, disappear or reorder. At the top, show new posts.
    var top = window.scrollY, anchor = null, offset = 0;
    if (top > 8) {
      anchor = Array.from(t.querySelectorAll("[data-id]")).find(function (el) {
        return el.getBoundingClientRect().top >= 110;
      });
      if (anchor) offset = anchor.getBoundingClientRect().top;
    }
    var id = anchor && anchor.getAttribute("data-id");
    t.classList.add("forum-live-paint");
    render();
    var next = id && t.querySelector('[data-id="' + CSS.escape(id) + '"]');
    window.scrollTo(0, next ? window.scrollY + next.getBoundingClientRect().top - offset : top);
    requestAnimationFrame(function () { t.classList.remove("forum-live-paint"); });
  }
  function p() {
    return liveSync();
  }
  function liveSync() {
    if (liveRequest || liveBlocked()) return liveRequest;
    var route = r.name, id = r.threadId, token = g();
    var url = route === "thread" ? "/api/forum/thread/" + encodeURIComponent(id) : "/api/forum/threads";
    liveRequest = y(url).then(function (e) {
      if (!e || !e.ok || liveBlocked() || route !== r.name || id !== r.threadId || token !== g()) return;
      if (route === "list" && Array.isArray(e.threads)) {
        if (JSON.stringify(e.threads) === JSON.stringify(b.threads)) return;
        b.threads = e.threads;
        s = "list";
        livePaint(ye);
      } else if (route === "thread" && e.thread) {
        // Locked responses must go through the existing access-control view.
        if (e.locked) { we(); return; }
        if (JSON.stringify(e.thread) === JSON.stringify(b.thread)) return;
        b.thread = e.thread;
        livePaint(ke);
      }
    }).catch(function () {
      // Keep the current content on transient failures; next tick catches up.
    }).finally(function () { liveRequest = null; });
    return liveRequest;
  }
  var liveTimer = 0;
  function liveSoon() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(liveSync, 120);
  }
  setInterval(liveSync, 5000);
  window.addEventListener("online", liveSoon);
  window.addEventListener("focus", liveSoon);
  window.addEventListener("hashchange", liveSoon);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) liveSoon(); });
  document.addEventListener("mp-live-connected", liveSoon);
  function h(e) {
    ((r.tag = e),
      (r.category = ""),
      (r.name = "list"),
      (r.threadId = null),
      (v = null),
      ye(),
      p(),
      window.MPScroll && MPScroll.pinTop(1200));
  }
  var v = null,
    b = { categories: [], threads: [], thread: null };
  function g() {
    try {
      return localStorage.getItem("chat_token");
    } catch (e) {
      return null;
    }
  }
  function y(t, r) {
    r = r || {};
    var n = { "Content-Type": "application/json" },
      a = g();
    a && (n.Authorization = "Bearer " + a);
    var o = null,
      i = { method: r.method || "GET", headers: n, body: r.body ? JSON.stringify(r.body) : void 0 };
    try {
      if (window.AbortController) {
        var l = new AbortController();
        ((i.signal = l.signal),
          (o = setTimeout(function () {
            try {
              l.abort();
            } catch (e) {}
          }, 2e4)));
      }
    } catch (e) {}
    function s() {
      o && (clearTimeout(o), (o = null));
    }
    return fetch(e + t, i).then(
      function (e) {
        s();
        var t = "";
        try {
          t = e.headers.get("content-type") || "";
        } catch (e) {}
        if (t.indexOf("application/json") < 0) {
          var r = new Error("Request failed" + (e.status ? " (" + e.status + ")" : ""));
          throw ((r.status = e.status || 0), r);
        }
        return e.json();
      },
      function (e) {
        throw (s(), e);
      },
    );
  }
  function w(e) {
    return String(null == e ? "" : e)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function k(e) {
    var t = Math.max(1, Math.floor((Date.now() - e) / 1e3));
    if (t < 60) return t + "s";
    var r = Math.floor(t / 60);
    if (r < 60) return r + "m";
    var n = Math.floor(r / 60);
    if (n < 24) return n + "h";
    var a = Math.floor(n / 24);
    if (a < 7) return a + "d";
    var o = Math.floor(a / 7);
    if (o < 5) return o + "w";
    var i = Math.floor(a / 30);
    return i < 12 ? i + "mo" : Math.floor(a / 365) + "y";
  }
  function E(t, r) {
    var n = C(t.authorBadge, t.author),
      a = t.author || "?",
      o = "dc" === a.toLowerCase(),
      i = "member" === t.authorBadge,
      l = o ? ' data-rain="1"' : i ? ' data-sparkle="1"' : "",
      s =
        '<span class="forum-avatar-wrap"><span class="forum-avatar">' +
        (t.hasAvatarImg
          ? '<img src="' +
            e +
            "/api/avatarimg/" +
            encodeURIComponent(a) +
            "?v=" +
            (t.avatarV || 0) +
            '" alt="" data-fallback="img/default-avatar.jpg">'
          : '<img src="img/default-avatar.jpg" alt="">') +
        "</span></span>",
      d =
        r && void 0 !== t.authorPoints && null !== t.authorPoints
          ? '<span class="forum-glass-pill forum-author-pts">★ ' +
            (Number(t.authorPoints) || 0) +
            "</span>"
          : "";
    return (
      '<button type="button" class="forum-thread-author-pill forum-author-pill-btn" data-username="' +
      w(a) +
      '"' +
      l +
      ">" +
      s +
      '<span class="forum-thread-author-name">' +
      w(a) +
      "</span>" +
      (n ? '<span class="forum-thread-pill-badge">' + n + "</span>" : "") +
      "</button>" +
      d
    );
  }
  function x(e, t) {
    if (e) {
      for (var r = e.querySelectorAll(".forum-rain-drop"), n = 0; n < r.length; n++) r[n].remove();
      t = t || 8;
      for (var a = 0; a < t; a++) {
        var o = document.createElement("div");
        ((o.className = "forum-rain-drop"),
          o.setAttribute("aria-hidden", "true"),
          (o.style.left = 4 + 92 * Math.random() + "%"),
          (o.style.height = 8 + 7 * Math.random() + "px"),
          (o.style.animationDelay = 1.2 * -Math.random() + "s"),
          (o.style.animationDuration = 0.7 + 0.6 * Math.random() + "s"),
          e.appendChild(o));
      }
    }
  }
  function L(e) {
    for (
      var t = (e || document).querySelectorAll('.forum-author-pill-btn[data-sparkle="1"]'), r = 0;
      r < t.length;
      r++
    )
      window.MPChat &&
        window.MPChat.addBorderSparkles &&
        !t[r].querySelector(".owner-sparkle-star") &&
        window.MPChat.addBorderSparkles(t[r], 6, !0);
    for (
      var n = (e || document).querySelectorAll('.forum-author-pill-btn[data-rain="1"]'), a = 0;
      a < n.length;
      a++
    )
      n[a].querySelector(".forum-rain-drop") || x(n[a], 9);
  }
  function S(e) {
    for (
      var t = (e || document).querySelectorAll(".forum-author-pill-btn[data-username]"), r = 0;
      r < t.length;
      r++
    )
      (function (e) {
        if (!e.dataset.wired) {
          e.dataset.wired = "1";
          var t = function (t) {
            t && (t.preventDefault(), t.stopPropagation());
            var r = e.getAttribute("data-username");
            if (r)
              if (window.MPChat && window.MPChat.openUserSheet) window.MPChat.openUserSheet(r, e);
              else {
                var n = new CustomEvent("mp-open-user-sheet", { detail: { username: r, anchor: e } });
                document.dispatchEvent(n);
              }
          };
          (e.addEventListener("click", t),
            e.addEventListener("keydown", function (e) {
              ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), t(e));
            }));
        }
      })(t[r]);
  }
  function C(e, t) {
    return e &&
      window.MPChat &&
      window.MPChat.badgeHTML &&
      ("robot" !== e || (t && "grim" === t.toLowerCase()))
      ? window.MPChat.badgeHTML(e)
      : "";
  }
  function A(e, t) {
    var r = Number(e.stars) || 0;
    if (O && e.author && O.username.toLowerCase() === String(e.author).toLowerCase())
      return '<span class="forum-star-count">★ ' + r + "</span>";
    if (!g()) return r > 0 ? '<span class="forum-star-count">★ ' + r + "</span>" : "";
    var n = O && Array.isArray(e.starredBy) && -1 !== e.starredBy.indexOf(O.username.toLowerCase());
    return (
      '<button type="button" class="forum-admin-btn forum-star-btn' +
      (n ? " given" : "") +
      '" data-star="' +
      w(t || "") +
      '"' +
      (n ? " disabled" : "") +
      ">★ " +
      r +
      "</button>"
    );
  }
  var T = -1,
    M = 0;
  function q(e) {
    if (g()) {
      var t = Date.now();
      (!e && t - M < 3e4 && T >= 0) ||
        ((M = t),
        y("/api/notifications")
          .then(function (e) {
            if (e && e.ok) {
              var t = document.getElementById("forum-bell-badge"),
                r = document.getElementById("forum-bell"),
                n = document.getElementById("chat-bell-badge"),
                a = document.getElementById("chat-bell"),
                o = e.unread || 0;
              try {
                "setAppBadge" in navigator &&
                  (o > 0
                    ? navigator.setAppBadge(o)
                    : "clearAppBadge" in navigator && navigator.clearAppBadge());
              } catch (e) {}
              ([t, n].forEach(function (e) {
                if (e)
                  if (o > 0) {
                    var t = o > 99 ? "99+" : String(o);
                    if (e.textContent !== t && ((e.textContent = t), e.animate))
                      try {
                        e.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
                          duration: 350,
                          easing: "cubic-bezier(.2,.9,.3,1.4)",
                        });
                      } catch (e) {}
                    e.classList.remove("hidden");
                  } else e.classList.add("hidden");
              }),
                [r, a].forEach(function (e) {
                  if (o > 0 && e && e.animate && (T < 0 || o > T))
                    try {
                      e.animate(
                        [
                          { transform: "rotate(0deg)" },
                          { transform: "rotate(-12deg)" },
                          { transform: "rotate(10deg)" },
                          { transform: "rotate(-8deg)" },
                          { transform: "rotate(6deg)" },
                          { transform: "rotate(-2deg)" },
                          { transform: "rotate(0deg)" },
                        ],
                        { duration: 500, easing: "ease-in-out" },
                      );
                    } catch (e) {}
                }),
                (T = o));
            }
          })
          .catch(function () {}));
    }
  }
  function P() {
    var e = document.querySelector(".forum-notif-panel");
    (e && e.remove(),
      document.querySelectorAll(".forum-notif-panel").forEach(function (e) {
        e.remove();
      }),
      document.querySelectorAll(".chat-me-menu").forEach(function (e) {
        e.remove();
      }),
      y("/api/notifications").then(function (e) {
        if (e && e.ok) {
          var t = document.createElement("div");
          t.className = "forum-notif-panel";
          try {
            for (
              var r = document.querySelectorAll(".chat-head"), n = null, a = 0;
              a < r.length;
              a++
            ) {
              var o = r[a].getBoundingClientRect();
              if (o.width > 0 && o.height > 0) {
                n = o;
                break;
              }
            }
            n &&
              ((t.style.top = n.bottom + 8 + "px"),
              (t.style.width = "280px"),
              (t.style.left = "auto"),
              (t.style.right = window.innerWidth - n.right + "px"));
          } catch (e) {}
          var i =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-weight:700;color:var(--ink);">Notifications</span><button type="button" id="forum-notif-close" style="width:28px;height:28px;border-radius:999px;border:1px solid var(--stroke);background:var(--fill);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"><svg width="14" height="14" style="display:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-hi="fade"><path d="M6 18 18 6M6 6l12 12"/></svg></button></div>';
          if (!e.notifications.length)
            return (
              (i +=
                '<div style="text-align:center;color:var(--muted);padding:20px;">No notifications</div>'),
              void u()
            );
          var l = {};
          e.notifications.forEach(function (e) {
            e.from && "milestone" !== e.type && (l[String(e.from).toLowerCase()] = !0);
          });
          var s = Object.keys(l),
            d = {},
            c = s.map(function (e) {
              return y("/api/user/" + encodeURIComponent(e))
                .then(function (t) {
                  t && t.ok && t.user && (d[e] = t.user.activeBadge || "");
                })
                .catch(function () {});
            });
          Promise.all(c).then(function () {
            (e.notifications.forEach(function (e) {
              var t = e.read ? "rgba(127,127,127,.06)" : "rgba(80,140,255,.1)";
              if ("milestone" === e.type)
                return (
                  (i +=
                    '<div style="padding:10px;border-radius:10px;margin-bottom:8px;background:' +
                    t +
                    ';">'),
                  (i +=
                    '<div style="font-size:14px;color:var(--ink);">🏆 <strong>' +
                    w(e.text || e.preview || "You hit a milestone") +
                    "</strong></div>"),
                  e.threadId &&
                    (i +=
                      '<div style="font-size:12px;margin-top:4px;"><a href="#" data-thread="' +
                      w(e.threadId) +
                      '" class="forum-notif-link" style="color:#6ea8ff;">View post</a></div>'),
                  void (i +=
                    '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' +
                    k(e.ts) +
                    "</div></div>")
                );
              if ("vip" === e.type)
                return (
                  (i +=
                    '<div style="padding:10px;border-radius:10px;margin-bottom:8px;background:' +
                    t +
                    ';">'),
                  (i +=
                    '<div style="font-size:14px;color:var(--ink);">⭐ <strong>You\'ve been upgraded to VIP</strong></div>'),
                  void (i +=
                    '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' +
                    k(e.ts) +
                    "</div></div>")
                );
              if ("whisper" === e.type || "whisper" === e.kind)
                return (
                  (i +=
                    '<div style="padding:10px;border-radius:10px;margin-bottom:8px;background:' +
                    t +
                    ';">'),
                  (i +=
                    '<div style="font-size:14px;color:var(--ink);"><strong>@' +
                    w(e.from) +
                    "</strong> whispered to you</div>"),
                  e.preview &&
                    (i +=
                      '<div style="font-size:13px;color:var(--muted);margin-top:4px;">' +
                      w(e.preview) +
                      "</div>"),
                  void (i +=
                    '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' +
                    k(e.ts) +
                    "</div></div>")
                );
              var r = C(d[String(e.from || "").toLowerCase()] || "", e.from),
                n = r
                  ? '<span style="display:inline-block;vertical-align:middle;">' + r + "</span>"
                  : "";
              ((i +=
                '<div style="padding:10px;border-radius:10px;margin-bottom:8px;background:' +
                t +
                ';">'),
                "chat" === e.kind
                  ? (i +=
                      '<div style="font-size:14px;color:var(--ink);"><strong>@' +
                      w(e.from) +
                      "</strong>" +
                      n +
                      " mentioned you in Chat</div>")
                  : "mention" === e.type
                    ? (i +=
                        '<div style="font-size:14px;color:var(--ink);"><strong>@' +
                        w(e.from) +
                        "</strong>" +
                        n +
                        ' mentioned you in <a href="#" data-thread="' +
                        w(e.threadId) +
                        '" class="forum-notif-link" style="color:#6ea8ff;">' +
                        w(e.threadTitle || "a thread") +
                        "</a></div>")
                    : "reply" === e.type
                      ? (i +=
                          '<div style="font-size:14px;color:var(--ink);"><strong>@' +
                          w(e.from) +
                          "</strong>" +
                          n +
                          ' replied in <a href="#" data-thread="' +
                          w(e.threadId) +
                          '" class="forum-notif-link" style="color:#6ea8ff;">' +
                          w(e.threadTitle || "a thread") +
                          "</a></div>")
                      : (i +=
                          '<div style="font-size:14px;color:var(--ink);"><strong>@' +
                          w(e.from) +
                          "</strong>" +
                          n +
                          " notified you</div>"),
                (i +=
                  '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' +
                  k(e.ts) +
                  "</div></div>"));
            }),
              u());
          });
        }
        function u() {
          ((t.innerHTML = i),
            document.body.appendChild(t),
            t.querySelector("#forum-notif-close").addEventListener("click", function () {
              t.remove();
            }),
            g() &&
              y("/api/notifications/read", { method: "POST" })
                .then(function () {
                  q(!0);
                })
                .catch(function () {}),
            t.querySelectorAll(".forum-notif-link").forEach(function (e) {
              e.addEventListener("click", function (r) {
                (r.preventDefault(), t.remove());
                var n = e.getAttribute("data-thread");
                n && Oe(n);
              });
            }));
        }
      }));
  }
  function I(e) {
    var t = document.querySelector(".forum-copy-dialog-back");
    t && t.remove();
    var r = document.createElement("div");
    ((r.className = "forum-copy-dialog-back"),
      (r.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;"));
    var n = document.createElement("div");
    ((n.className = "forum-copy-dialog"),
      (n.style.cssText = "border-radius:12px;padding:16px;width:100%;max-width:360px;"));
    var a = document.createElement("input");
    ((a.type = "text"),
      (a.readOnly = !0),
      (a.value = e),
      (a.style.cssText =
        "width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;font:inherit;"));
    var o = document.createElement("div");
    o.style.cssText = "display:flex;gap:8px;margin-top:12px;justify-content:flex-end;";
    var i = document.createElement("button");
    ((i.type = "button"), (i.className = "btn accent"), (i.textContent = "Copy"));
    var l = document.createElement("button");
    function s() {
      r.remove();
    }
    ((l.type = "button"),
      (l.className = "btn"),
      (l.textContent = "Close"),
      i.addEventListener("click", function () {
        function t() {
          ((i.textContent = "Copied ✓"), setTimeout(s, 600));
        }
        if (navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard
            .writeText(e)
            .then(t)
            .catch(function () {
              try {
                (a.select(), document.execCommand("copy"));
              } catch (e) {}
              t();
            });
        else {
          try {
            (a.select(), document.execCommand("copy"));
          } catch (e) {}
          t();
        }
      }),
      l.addEventListener("click", s),
      r.addEventListener("click", function (e) {
        e.target === r && s();
      }),
      o.appendChild(i),
      o.appendChild(l),
      n.appendChild(a),
      n.appendChild(o),
      r.appendChild(n),
      document.body.appendChild(r));
    try {
      a.select();
    } catch (e) {}
  }
  document._notifHideWired ||
    ((document._notifHideWired = !0),
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        document.querySelectorAll(".forum-notif-panel").forEach(function (e) {
          e.remove();
        });
        return;
      }
      // Quiet refetch when returning — Globe list no longer has pull-to-refresh (per dc).
      try {
        var f = document.getElementById("forum");
        if (f && f.classList.contains("on") && "list" === r.name) p();
      } catch (e) {}
    }));
  var N = !1;
  function H() {
    if ((q(), !N && g())) {
      // Signed out: no /api/notifications/read (it only 401s).
      N = !0;
      try {
        y("/api/notifications/read", { method: "POST" })
          .then(function () {
            q(!0);
          })
          .catch(function () {});
      } catch (e) {}
    }
    var e = document.getElementById("forum-bell");
    e &&
      !e._wired &&
      ((e._wired = !0),
      e.addEventListener("click", function (e) {
        (e.stopPropagation(), P());
      }));
    var t = document.getElementById("forum-me");
    if (
      (t &&
        !t._notifWired &&
        ((t._notifWired = !0),
        t.addEventListener("click", function () {
          document.querySelectorAll(".forum-notif-panel").forEach(function (e) {
            e.remove();
          });
        })),
      !document._notifOutsideWired)
    ) {
      ((document._notifOutsideWired = !0),
        document.addEventListener("click", function (e) {
          var t = document.querySelector(".forum-notif-panel");
          !t ||
            t.contains(e.target) ||
            e.target.closest("#forum-bell") ||
            e.target.closest("#chat-bell") ||
            t.remove();
        }));
      try {
        new MutationObserver(function (e) {
          var t = document.querySelector(".forum-notif-panel");
          if (t)
            for (var r = 0; r < e.length; r++)
              for (var n = e[r].addedNodes, a = 0; a < n.length; a++) {
                var o = n[a];
                if (1 === o.nodeType) {
                  var i = o.className || "",
                    l = o.outerHTML || "";
                  if (
                    /chat.*menu|me.*menu|profile.*dropdown|user.*sheet/i.test(
                      i + " " + l.slice(0, 500),
                    )
                  )
                    return void t.remove();
                }
              }
        }).observe(document.body, { childList: !0, subtree: !0 });
      } catch (e) {}
    }
  }
  function B() {
    t.querySelectorAll(".forum-mention").forEach(function (e) {
      e.dataset.wired ||
        ((e.dataset.wired = "1"),
        e.addEventListener("click", function (t) {
          (t.preventDefault(), t.stopPropagation());
          var r = e.getAttribute("data-user");
          r && window.MPChat && window.MPChat.openUserSheet && window.MPChat.openUserSheet(r, e);
        }));
    });
  }
  function R() {
    t.querySelectorAll(".forum-avatar-btn").forEach(function (e) {
      e.addEventListener("click", function (t) {
        t.stopPropagation();
        var r = e.getAttribute("data-username");
        r && window.MPChat && window.MPChat.openUserSheet && window.MPChat.openUserSheet(r, e);
      });
    });
    var e = t.querySelector("#forum-me");
    e &&
      e.addEventListener("click", function (e) {
        e.stopPropagation();
        var r = t.querySelector(".forum-topbar");
        window.MPChat && window.MPChat.toggleMeMenu
          ? window.MPChat.toggleMeMenu(r)
          : O &&
            window.MPChat &&
            window.MPChat.openUserSheet &&
            window.MPChat.openUserSheet(O.username);
      });
  }
  // Editor card (per dc): text colour, align, underline, highlight - stored as
  // classes / plain tags because the server strips style attributes.
  var MP_TC = /^mp-tc-(red|orange|yellow|green|blue|purple|pink|gray)$/,
    MP_AL = /^mp-al-(center|right)$/;
  function mpKeepCls(n, c) {
    c = String(c || "").trim();
    if ("SPAN" === n && MP_TC.test(c)) return c;
    if (("P" === n || "H3" === n || "H4" === n) && MP_AL.test(c)) return c;
    return null;
  }
  function mpExtras(n) {
    var x = [];
    n.Underline && x.push(n.Underline);
    n.Highlight && x.push(n.Highlight.configure({ multicolor: !1 }));
    n.Mark &&
      x.push(
        n.Mark.create({
          name: "mpColor",
          addAttributes: function () {
            return {
              c: {
                default: null,
                parseHTML: function (el) {
                  var m = MP_TC.exec(el.getAttribute("class") || "");
                  return m ? m[1] : null;
                },
                renderHTML: function (at) {
                  return at.c ? { class: "mp-tc-" + at.c } : {};
                },
              },
            };
          },
          parseHTML: function () {
            return [{ tag: 'span[class^="mp-tc-"]' }];
          },
          renderHTML: function (h) {
            return ["span", h.HTMLAttributes, 0];
          },
        }),
      );
    n.Extension &&
      x.push(
        n.Extension.create({
          name: "mpAlign",
          addGlobalAttributes: function () {
            return [
              {
                types: ["paragraph", "heading"],
                attributes: {
                  mpAlign: {
                    default: null,
                    parseHTML: function (el) {
                      var m = /(?:^|\s)mp-al-(center|right)(?:\s|$)/.exec(el.getAttribute("class") || "");
                      return m ? m[1] : null;
                    },
                    renderHTML: function (at) {
                      return at.mpAlign ? { class: "mp-al-" + at.mpAlign } : {};
                    },
                  },
                },
              },
            ];
          },
        }),
      );
    return x;
  }
  function mpAlignOf(e) {
    try {
      return e.getAttributes("paragraph").mpAlign || e.getAttributes("heading").mpAlign || "left";
    } catch (x) {
      return "left";
    }
  }
  function mpOn(e, n) {
    if (0 === n.indexOf("align-")) return mpAlignOf(e) === n.slice(6);
    if (0 === n.indexOf("tc-") && "tc-none" !== n) return e.isActive("mpColor", { c: n.slice(3) });
    return !1;
  }
  // Edge fades on the swipeable toolbar when more buttons are off-screen.
  function mpFade(m) {
    var x = m.scrollLeft, max = m.scrollWidth - m.clientWidth;
    m.classList.toggle("fade-l", x > 2); m.classList.toggle("fade-r", x < max - 2);
  }
  document.addEventListener("scroll", function (ev) { var m = ev.target; m && m.classList && m.classList.contains("mp-tb-main") && mpFade(m); }, !0);
  window.addEventListener("resize", function () { document.querySelectorAll(".mp-tb-main").forEach(mpFade); });
  function mpAct(a, o, e, r) {
    if ("underline" === a && o.toggleUnderline) return o.toggleUnderline().run();
    if ("highlight" === a && o.toggleHighlight) return o.toggleHighlight().run();
    if ("mention" === a) return o.insertContent("@").run();
    if (0 === a.indexOf("align-")) {
      var v = a.slice(6);
      v = "left" === v ? null : v;
      return o.updateAttributes("paragraph", { mpAlign: v }).updateAttributes("heading", { mpAlign: v }).run();
    }
    if ("color" === a) {
      var s = r && r.querySelector(".mp-ec-swatches");
      return void (s && s.classList.toggle("hidden"));
    }
    if (0 === a.indexOf("tc-")) { var sw = r && r.querySelector(".mp-ec-swatches"); sw && sw.classList.add("hidden"); }
    if ("tc-none" === a) return o.unsetMark("mpColor").run();
    if (0 === a.indexOf("tc-")) return o.setMark("mpColor", { c: a.slice(3) }).run();
  }
  var O = null,
    U = {
      P: 1,
      BR: 1,
      STRONG: 1,
      B: 1,
      EM: 1,
      I: 1,
      S: 1,
      STRIKE: 1,
      CODE: 1,
      PRE: 1,
      UL: 1,
      OL: 1,
      LI: 1,
      BLOCKQUOTE: 1,
      A: 1,
      H3: 1,
      H4: 1,
      IMG: 1,
      IFRAME: 1,
      DIV: 1,
      SPAN: 1,
      SVG: 1,
      PATH: 1,
      U: 1,
      MARK: 1,
    };
  var D = {
      P: 1,
      BR: 1,
      STRONG: 1,
      B: 1,
      EM: 1,
      I: 1,
      S: 1,
      STRIKE: 1,
      CODE: 1,
      PRE: 1,
      UL: 1,
      OL: 1,
      LI: 1,
      BLOCKQUOTE: 1,
      A: 1,
      H3: 1,
      H4: 1,
      IMG: 1,
      IFRAME: 1,
      DIV: 1,
      SVG: 1,
      PATH: 1,
      U: 1,
      MARK: 1,
      SPAN: 1,
    },
    z =
      /^https:\/\/(open\.spotify\.com\/embed\/|w\.soundcloud\.com\/player\/|player\.vimeo\.com\/video\/)/i;
  function j() {
    return !(!O || (!O.member && !Ne));
  }
  var F = { "🐦": "x", "📸": "instagram", "🎵": "tiktok", "▶": "youtube" },
    V = {
      x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
      instagram:
        "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
      tiktok:
        "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
      youtube:
        "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    };
  function _(e) {
    var t = String(e || "").replace(
      /(<a href="[^"]*"[^>]*>)(\uD83D\uDC26|\uD83D\uDCF8|\uD83C\uDFB5|\u25B6)\s?/g,
      function (e, t, r) {
        var n = (function (e) {
          var t = (window.MPSocialLogos || {})[e];
          if (t) return t;
          var r = V[e];
          return r
            ? '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="' +
                r +
                '"/></svg>'
            : "";
        })(F[r]);
        return n ? t + n + " " : e;
      },
    );
    return (t = (t = t.replace(
      /<div>(<a href="([^"]*)"[^>]*>.*?<\/a>)<\/div>/g,
      function (e, t, r) {
        var n = (function (e) {
          var t = String(e || "").match(
            /^(https?:\/\/)?(www\.)?(x\.com|twitter\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be)(\/|$)/i,
          );
          if (!t) return "";
          var r = t[3].toLowerCase();
          return "x.com" === r || "twitter.com" === r
            ? "x"
            : "instagram.com" === r
              ? "instagram"
              : "tiktok.com" === r
                ? "tiktok"
                : "youtube";
        })(r);
        return n ? '<span class="sig-social-item net-' + n + '">' + t + "</span>" : e;
      },
    )).replace(
      /((?:<span class="sig-social-item[^"]*">.*?<\/span>)+)/g,
      '<div class="sig-social-row">$1</div>',
    ));
  }
  function W(e, t) {
    if (
      !e ||
      !e.authorSignature ||
      !(function () {
        try {
          return "0" !== localStorage.getItem("mp_show_sigs");
        } catch (e) {
          return !0;
        }
      })()
    )
      return "";
    var r = _(
      (function (e) {
        try {
          var t = new DOMParser().parseFromString(String(e || ""), "text/html");
          return (
            (function e(t) {
              Array.prototype.slice.call(t.childNodes).forEach(function (r) {
                if (3 !== r.nodeType)
                  if (1 === r.nodeType) {
                    var n = (r.tagName || "").toUpperCase();
                    if (D[n]) {
                      var a = null,
                        o = null,
                        i = null,
                        l = null;
                      if ("A" === n) {
                        var s = r.getAttribute("href") || "";
                        /^https?:\/\//i.test(s) && (a = s);
                      }
                      if ("IMG" === n) {
                        var d = r.getAttribute("src") || "";
                        /^https?:\/\//i.test(d) && (o = d);
                      }
                      if ("IFRAME" === n) {
                        var c = r.getAttribute("src") || "";
                        z.test(c) && (i = c);
                      }
                      if ("PATH" === n) {
                        var u = r.getAttribute("d") || "";
                        /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-+eE]+$/.test(u) && (l = u);
                      }
                      if (
                        ((r.__mpc = mpKeepCls(n, r.getAttribute("class"))),
Array.prototype.slice.call(r.attributes).forEach(function (e) {
                          r.removeAttribute(e.name);
                        }),
 r.__mpc && r.setAttribute("class", r.__mpc),
                        a &&
                          (r.setAttribute("href", a),
                          r.setAttribute("target", "_blank"),
                          r.setAttribute("rel", "noopener noreferrer")),
                        o && (r.setAttribute("src", o), r.setAttribute("loading", "lazy")),
                        "IMG" !== n || o)
                      ) {
                        if ("IFRAME" === n) {
                          if (!i) return void r.remove();
                          (r.setAttribute("src", i),
                            r.setAttribute("loading", "lazy"),
                            r.setAttribute("allowfullscreen", ""),
                            r.setAttribute("sandbox", "allow-scripts allow-presentation"),
                            r.setAttribute("referrerpolicy", "no-referrer-when-downgrade"));
                        }
                        if (
                          ("SVG" === n &&
                            (r.setAttribute("viewBox", "0 0 24 24"),
                            r.setAttribute("width", "13"),
                            r.setAttribute("height", "13")),
                          "PATH" === n)
                        ) {
                          if (!l) return void r.remove();
                          (r.setAttribute("d", l), r.setAttribute("fill", "currentColor"));
                        }
                        e(r);
                      } else r.remove();
                    } else {
                      for (e(r); r.firstChild;) t.insertBefore(r.firstChild, r);
                      r.remove();
                    }
                  } else r.remove();
              });
            })(t.body),
            t.body.innerHTML
          );
        } catch (e) {
          return "";
        }
      })(e.authorSignature),
    );
    return !r.replace(/<[^>]*>/g, "").trim() && r.indexOf("<img") < 0 && r.indexOf("<iframe") < 0
      ? ""
      : '<div class="forum-sig' + (t ? " compact" : "") + '">' + r + "</div>";
  }
  function G(e) {
    if (e.rich) {
      var t = document.createElement("div");
      return (
        (t.innerHTML = (function (e) {
          try {
            var t = new DOMParser().parseFromString(String(e || ""), "text/html");
            return (
              (function e(t) {
                Array.prototype.slice.call(t.childNodes).forEach(function (r) {
                  if (3 !== r.nodeType)
                    if (1 === r.nodeType) {
                      var n = (r.tagName || "").toUpperCase();
                      // Videos: only MP4s on our own media host (or the fixed
                      // legacy GIF -> MP4 swaps below). Anything else is dropped.
                      var mv =
                        "VIDEO" === n
                          ? mpVidSrc(r.getAttribute("src"), r.getAttribute("poster"))
                          : "IMG" === n
                            ? MP_LEGACY_VID[r.getAttribute("src") || ""] || null
                            : null;
                      if (mv) return void r.parentNode.replaceChild(mpVidEl(r.ownerDocument, mv), r);
                      if ("VIDEO" === n) return void r.remove();
                      if (U[n]) {
                        var a = null,
                          o = null,
                          i = null,
                          l = null,
                          s = null;
                        if (
                          "DIV" === n &&
                          -1 !== (r.getAttribute("class") || "").split(/\s+/).indexOf("mp-locked")
                        ) {
                          var d = r.getAttribute("data-mode");
                          if ("reply" === d || "member" === d) {
                            s = { mode: d };
                            var c = r.getAttribute("data-author") || "";
                            /^[A-Za-z0-9_]{3,16}$/.test(c) && (s.author = c);
                          }
                        }
                        if ("A" === n) {
                          var u = r.getAttribute("href") || "";
                          /^https?:\/\//i.test(u) && (a = u);
                        }
                        if ("IMG" === n) {
                          var f = r.getAttribute("src") || "";
                          /^https?:\/\//i.test(f) && (o = f);
                        }
                        if ("IFRAME" === n) {
                          var m = r.getAttribute("src") || "";
                          ae.test(m) && (i = m);
                        }
                        if ("PATH" === n) {
                          var p = r.getAttribute("d") || "";
                          /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-+eE]+$/.test(p) && (l = p);
                        }
                        if (
                          ((r.__mpc = mpKeepCls(n, r.getAttribute("class"))),
Array.prototype.slice.call(r.attributes).forEach(function (e) {
                            r.removeAttribute(e.name);
                          }),
 r.__mpc && r.setAttribute("class", r.__mpc),
                          a &&
                            (r.setAttribute("href", a),
                            r.setAttribute("target", "_blank"),
                            r.setAttribute("rel", "noopener noreferrer")),
                          o && (r.setAttribute("src", o), r.setAttribute("loading", "lazy")),
                          "IMG" !== n || o)
                        ) {
                          if (
                            ("SVG" === n && r.setAttribute("viewBox", "0 0 24 24"), "PATH" === n)
                          ) {
                            if (!l) return void r.remove();
                            (r.setAttribute("d", l), r.setAttribute("fill", "currentColor"));
                          }
                          if (
                            (s &&
                              (r.setAttribute("class", "mp-locked"),
                              r.setAttribute("data-mode", s.mode),
                              s.author && r.setAttribute("data-author", s.author)),
                            "IFRAME" === n)
                          ) {
                            if (!i) return void r.remove();
                            (r.setAttribute("src", i),
                              r.setAttribute("loading", "lazy"),
                              r.setAttribute("allowfullscreen", ""),
                              r.setAttribute("sandbox", "allow-scripts allow-presentation"),
                              r.setAttribute("referrerpolicy", "no-referrer-when-downgrade"));
                          }
                          e(r);
                        } else r.remove();
                      } else {
                        for (e(r); r.firstChild;) t.insertBefore(r.firstChild, r);
                        r.remove();
                      }
                    } else r.remove();
                });
              })(t.body),
              t.body.innerHTML
            );
          } catch (e) {
            return "";
          }
        })(e.content)),
        (function (e) {
          if (!e) return e;
          for (
            var t, r = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, null, !1), n = [];
            (t = r.nextNode());
          )
            n.push(t);
          n.forEach(function (e) {
            var t = e.parentNode;
            if (t && (!t.closest || !t.closest("a, code, pre"))) {
              var r = e.nodeValue;
              if (r && -1 !== r.indexOf("@")) {
                for (var n, a = /(^|\s)@([A-Za-z0-9_]{2,16})/g, o = 0, i = null; (n = a.exec(r));) {
                  (i || (i = document.createDocumentFragment()),
                    n.index > o && i.appendChild(document.createTextNode(r.slice(o, n.index))),
                    n[1] && i.appendChild(document.createTextNode(n[1])));
                  var l = document.createElement("a");
                  ((l.href = "#"),
                    (l.className = "forum-mention"),
                    l.setAttribute("data-user", n[2].toLowerCase()),
                    l.setAttribute("style", "color:#6ea8ff;font-weight:600;text-decoration:none;"),
                    (l.textContent = mpAt(n[2])),
                    i.appendChild(l),
                    (o = n.index + n[0].length));
                }
                i &&
                  (o < r.length && i.appendChild(document.createTextNode(r.slice(o))),
                  t.replaceChild(i, e));
              }
            }
          });
        })(t),
        t.innerHTML
      );
    }
    return w(e.content || "").replace(/\n/g, "<br>");
  }
  function $() {
    var e = document.querySelector("#forum-reply-editor .forum-editor-input");
    if (e && ((e.textContent && e.textContent.trim()) || e.querySelector("img"))) return !0;
    var t = document.querySelector("#forum-reply");
    return (
      !(!t || !t.value) ||
      !!document.querySelector("#forum-edit-editor") ||
      !!document.querySelector(".forum-post-body .forum-editor") ||
      !!document.querySelector(".forum-post-body textarea")
    );
  }
  var Y = null,
    Z = null,
    K = null,
    Q = null;
  function X() {
    if (K) {
      try {
        K.destroy();
      } catch (e) {}
      K = null;
    }
  }
  var J = null;
  var ee = [
      { act: "bold", label: "B", cls: "tb-bold" },
      { act: "italic", label: "I", cls: "tb-italic" },
      { act: "strike", label: "S", cls: "tb-strike" },
      { act: "code", label: "<>", cls: "tb-code" },
      { act: "h3", label: "H", cls: "" },
      { act: "bullet", label: "•≡", cls: "" },
      { act: "ordered", label: "1.≡", cls: "" },
      { act: "quote", label: "”", cls: "" },
      { act: "lock", label: "🔒", cls: "" },
    ],
    te = [
      { act: "image", label: "📷", member: !1, title: "Upload media" },
      { act: "link", label: "🔗", member: !1, title: "Attach URL" },
      { act: "embed", label: "📺", member: !0, title: "Media embed" },
    ];
  function re(e) {
    e = e || {};
    var t =
      '<div class="forum-toolbar mp-tbar"><div class="mp-tb-main fade-r"><button type="button" class="forum-tb" data-act="bold" data-tip="Bold" data-kbd="⌘B" aria-label="Bold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path stroke-linejoin="round" d="M6.75 3.744h-.753v8.25h7.125a4.125 4.125 0 0 0 0-8.25H6.75Zm0 0v.38m0 16.122h6.747a4.5 4.5 0 0 0 0-9.001h-7.5v9h.753Zm0 0v-.37m0-15.751h6a3.75 3.75 0 1 1 0 7.5h-6m0-7.5v7.5m0 0v8.25m0-8.25h6.375a4.125 4.125 0 0 1 0 8.25H6.75m.747-15.38h4.875a3.375 3.375 0 0 1 0 6.75H7.497v-6.75Zm0 7.5h5.25a3.75 3.75 0 0 1 0 7.5h-5.25v-7.5Z"/></svg></button><button type="button" class="forum-tb" data-act="italic" data-tip="Italic" data-kbd="⌘I" aria-label="Italic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M5.248 20.246H9.05m0 0h3.696m-3.696 0 5.893-16.502m0 0h-3.697m3.697 0h3.803"/></svg></button><button type="button" class="forum-tb" data-act="underline" data-tip="Underline" data-kbd="⌘U" aria-label="Underline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M17.995 3.744v7.5a6 6 0 1 1-12 0v-7.5m-2.25 16.502h16.5"/></svg></button><button type="button" class="forum-tb" data-act="strike" data-tip="Strikethrough" data-kbd="⇧⌘X" aria-label="Strikethrough"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M12 12a8.912 8.912 0 0 1-.318-.079c-1.585-.424-2.904-1.247-3.76-2.236-.873-1.009-1.265-2.19-.968-3.301.59-2.2 3.663-3.29 6.863-2.432A8.186 8.186 0 0 1 16.5 5.21M6.42 17.81c.857.99 2.176 1.812 3.761 2.237 3.2.858 6.274-.23 6.863-2.431.233-.868.044-1.779-.465-2.617M3.75 12h16.5"/></svg></button><span class="mp-tb-sep" aria-hidden="true"></span><button type="button" class="forum-tb" data-act="image" data-tip="Photo" aria-label="Photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg></button><button type="button" class="forum-tb" data-act="link" data-tip="Link" data-kbd="⌘K" aria-label="Link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg></button><button type="button" class="forum-tb" data-act="code" data-tip="Inline code" data-kbd="⌘E" aria-label="Inline code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/></svg></button><button type="button" class="forum-tb" data-act="h3" data-tip="Heading" data-kbd="⌥⌘1" aria-label="Heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627 2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25"/></svg></button><span class="mp-tb-sep" aria-hidden="true"></span><button type="button" class="forum-tb" data-act="bullet" data-tip="Bulleted list" data-kbd="⇧⌘8" aria-label="Bulleted list"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg></button><button type="button" class="forum-tb" data-act="ordered" data-tip="Numbered list" data-kbd="⇧⌘7" aria-label="Numbered list"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.745h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99"/></svg></button><button type="button" class="forum-tb" data-act="quote" data-tip="Quote" data-kbd="⇧⌘B" aria-label="Quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M10.5 11.25h-4.5V6.75h4.5v5.25a5.25 5.25 0 0 1-3.75 5.03M19.5 11.25H15V6.75h4.5v5.25a5.25 5.25 0 0 1-3.75 5.03"/></svg></button><span class="mp-tb-sep" aria-hidden="true"></span><button type="button" class="forum-tb" data-act="color" data-tip="Text colour" aria-label="Text colour"><span class="mp-tb-dot"></span></button><span class="mp-tb-sep" aria-hidden="true"></span><button type="button" class="forum-tb" data-act="mention" data-tip="Mention" aria-label="Mention"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25"/></svg></button>';
    if (e.lock) t += '<button type="button" class="forum-tb" data-act="lock" data-tip="Hide content" aria-label="Hide content"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg></button>';
    if (e.embed && e.member) t += '<button type="button" class="forum-tb" data-act="embed" data-tip="Media embed" aria-label="Media embed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"/></svg></button>';
    return (
      (t += '<span class="mp-tb-sep" aria-hidden="true"></span><button type="button" class="forum-tb" data-act="align-left" data-tip="Align left" aria-label="Align left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/></svg></button><button type="button" class="forum-tb" data-act="align-center" data-tip="Align center" aria-label="Align center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg></button><button type="button" class="forum-tb" data-act="align-right" data-tip="Align right" aria-label="Align right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25"/></svg></button></div><div class="mp-ec-swatches hidden"><button type="button" class="tc-sw mp-tcb-red" data-act="tc-red" aria-label="Red text"></button><button type="button" class="tc-sw mp-tcb-orange" data-act="tc-orange" aria-label="Orange text"></button><button type="button" class="tc-sw mp-tcb-yellow" data-act="tc-yellow" aria-label="Yellow text"></button><button type="button" class="tc-sw mp-tcb-green" data-act="tc-green" aria-label="Green text"></button><button type="button" class="tc-sw mp-tcb-blue" data-act="tc-blue" aria-label="Blue text"></button><button type="button" class="tc-sw mp-tcb-purple" data-act="tc-purple" aria-label="Purple text"></button><button type="button" class="tc-sw mp-tcb-pink" data-act="tc-pink" aria-label="Pink text"></button><button type="button" class="tc-sw mp-tcb-gray" data-act="tc-gray" aria-label="Gray text"></button><button type="button" class="tc-sw tc-none" data-act="tc-none" aria-label="Default colour"></button></div></div>'),
      e.lock &&
        (t +=
          '<div class="forum-lockbar hidden"><span class="forum-lockbar-label">Hidden for:</span><button type="button" data-lockmode="reply">💬 Repliers</button><button type="button" data-lockmode="member">⭐ VIPs</button><button type="button" class="forum-lock-cancel" aria-label="Cancel">×</button></div>'),
      (t +=
        '<div class="forum-linkbar hidden"><input type="url" class="forum-link-input" placeholder="https://…"><button type="button" class="forum-link-apply">Add link</button><button type="button" class="forum-link-remove" aria-label="Remove link">×</button></div>'),
      e.embed &&
        (t +=
          '<div class="forum-embedbar hidden"><input type="text" class="forum-embed-input" placeholder="Paste a YouTube link or embed code"><button type="button" class="forum-embed-add">Embed</button><button type="button" class="forum-embed-cancel">×</button></div>'),
      (t += '<input type="file" class="forum-file-input hidden" accept="image/*">')
    );
  }
  function ne(e, t) {
    var r = t.querySelector(".forum-lockbar");
    if (r && e) {
      r.querySelectorAll("[data-lockmode]").forEach(function (t) {
        (t.addEventListener("mousedown", function (e) {
          e.preventDefault();
        }),
          t.addEventListener("click", function () {
            (!(function (e, t) {
              var r = "";
              try {
                var n = window.getSelection();
                n && (r = n.toString());
              } catch (e) {}
              r = r.replace(/\s+$/, "");
              var a = "";
              try {
                a = (O && O.username) || "";
              } catch (e) {}
              var o = r ? "<p>" + w(r).replace(/\n/g, "<br>") + "</p>" : "<p>Hidden content…</p>";
              try {
                e.chain()
                  .focus()
                  .deleteSelection()
                  .insertContent(
                    '<div class="mp-locked" data-mode="' +
                      t +
                      '" data-author="' +
                      w(a) +
                      '">' +
                      o +
                      "</div><p></p>",
                  )
                  .run();
              } catch (e) {}
            })(e, t.getAttribute("data-lockmode")),
              r.classList.add("hidden"));
          }));
      });
      var n = r.querySelector(".forum-lock-cancel");
      n &&
        n.addEventListener("click", function () {
          r.classList.add("hidden");
        });
    }
  }
  var ae = /^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com)\/embed\//i;
  /* Post videos (audit fix per dc). Strict: the src must be an MP4 stored on
   * our own media host (api.misereperdue.com/api/media/<id>); attributes are
   * rebuilt from scratch (muted, looping, inline, no controls). Under
   * prefers-reduced-motion the video doesn't autoplay, so the poster shows.
   * MP_LEGACY_VID swaps specific old heavy GIFs for self-hosted MP4s. */
  var MP_MEDIA_VID = /^https:\/\/api\.misereperdue\.com\/api\/media\/[A-Za-z0-9]{6,64}$/;
  var MP_LEGACY_VID = {
    // dc's pinned "Misery Globe" post banner: 10.2 MB GIF -> 241 KB MP4
    "https://api.misereperdue.com/api/media/mmv91jz19f25554eo1gzkdz": {
      src: "/video/globe-banner.mp4?v=1",
      poster: "/img/globe-banner-poster.jpg?v=1",
      w: 960,
      h: 540,
    },
  };
  function mpVidSrc(src, poster) {
    src = String(src || "");
    poster = String(poster || "");
    return MP_MEDIA_VID.test(src) ? { src: src, poster: MP_MEDIA_VID.test(poster) ? poster : "" } : null;
  }
  function mpVidEl(d, v) {
    var x = d.createElement("video"),
      still = false;
    try {
      still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}
    x.setAttribute("class", "forum-post-video");
    x.setAttribute("src", v.src);
    v.poster && x.setAttribute("poster", v.poster);
    v.w && v.h && (x.setAttribute("width", String(v.w)), x.setAttribute("height", String(v.h)));
    x.setAttribute("muted", "");
    x.setAttribute("loop", "");
    x.setAttribute("playsinline", "");
    x.setAttribute("disablepictureinpicture", "");
    x.setAttribute("disableremoteplayback", "");
    x.setAttribute("aria-hidden", "true");
    still ? x.setAttribute("preload", v.poster ? "none" : "metadata") : (x.setAttribute("autoplay", ""), x.setAttribute("preload", "auto"));
    return x;
  }
  function oe(e, t) {
    return (
      (t || []).forEach(function (t) {
        t &&
          t.src &&
          ae.test(t.src) &&
          (e +=
            '<div class="forum-embed"><iframe src="' +
            String(t.src).replace(/"/g, "%22") +
            '" allowfullscreen loading="lazy"></iframe></div>');
      }),
      e
    );
  }
  function ie(e) {
    var t = e.querySelector(".forum-embed-chips");
    t &&
      ((t.innerHTML = ""),
      (e._postEmbeds || []).forEach(function (r, n) {
        var a = document.createElement("span");
        ((a.className = "sig-chip"), (a.textContent = "▶ YouTube "));
        var o = document.createElement("button");
        ((o.type = "button"),
          (o.className = "sig-chip-x"),
          (o.textContent = "×"),
          o.setAttribute("aria-label", "Remove embed"),
          o.addEventListener("click", function () {
            ((e._postEmbeds || []).splice(n, 1), ie(e));
          }),
          a.appendChild(o),
          t.appendChild(a));
      }));
  }
  function le(e) {
    e._postEmbeds || (e._postEmbeds = []);
    var t = e.querySelector(".forum-embedbar");
    if (t) {
      var r = document.createElement("div");
      ((r.className = "forum-embed-chips"),
        e.appendChild(r),
        ie(e),
        t.querySelector(".forum-embed-add").addEventListener("click", function () {
          var r = t.querySelector(".forum-embed-input"),
            n = (function (e) {
              var t =
                  (e = String(e || "").trim()).match(/<iframe[^>]*src\s*=\s*"([^"]+)"/i) ||
                  e.match(/<iframe[^>]*src\s*=\s*'([^']+)'/i),
                r = t ? t[1] : e;
              if (ae.test(r)) return r;
              var n = (r.match(
                /(?:youtube\.com\/(?:watch\?[^\s]*v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
              ) || [])[1];
              return n ? "https://www.youtube.com/embed/" + n : null;
            })(r.value);
          n
            ? e._postEmbeds.length >= 2
              ? alert("Two embeds max.")
              : (e._postEmbeds.push({ src: n }), (r.value = ""), t.classList.add("hidden"), ie(e))
            : alert("Paste a YouTube video link or embed code.");
        }),
        t.querySelector(".forum-embed-cancel").addEventListener("click", function () {
          t.classList.add("hidden");
        }));
    }
  }
  function se(e, t) {
    if (e && t) {
      var r = {
        bold: "bold",
        italic: "italic",
        strike: "strike",
        code: "code",
        bullet: "bulletList",
        ordered: "orderedList",
        quote: "blockquote",
        underline: "underline",
        highlight: "highlight",
      };
      t.querySelectorAll("[data-act]").forEach(function (t) {
        var n = t.getAttribute("data-act"),
          a = !1;
        try {
          "h3" === n
            ? (a = e.isActive("heading", { level: 3 }))
            : "link" === n
              ? (a = e.isActive("link"))
              : r[n]
                ? (a = e.isActive(r[n]))
                : (a = mpOn(e, n));
        } catch (e) {}
        t.classList.toggle("on", !!a);
      });
    }
  }
  function de(e, t) {
    var r = t.querySelector(".forum-toolbar");
    if (r && e) {
      requestAnimationFrame(function () { var m = r.querySelector(".mp-tb-main"); m && mpFade(m); });
      (r.querySelectorAll("[data-act]").forEach(function (n) {
        (n.addEventListener("mousedown", function (e) {
          e.preventDefault();
        }),
          n.addEventListener("click", function () {
            var a = n.getAttribute("data-act");
            if ("lock" !== a)
              if ("link" !== a)
                if ("embed" !== a)
                  if ("image" !== a) {
                    var o = e.chain().focus();
                    ("bold" === a
                      ? o.toggleBold().run()
                      : "italic" === a
                        ? o.toggleItalic().run()
                        : "strike" === a
                          ? o.toggleStrike().run()
                          : "code" === a
                            ? o.toggleCode().run()
                            : "h3" === a
                              ? o.toggleHeading({ level: 3 }).run()
                              : "bullet" === a
                                ? o.toggleBulletList().run()
                                : "ordered" === a
                                  ? o.toggleOrderedList().run()
                                  : "quote" === a
                                    ? o.toggleBlockquote().run()
                                    : mpAct(a, o, e, r),
                      se(e, r));
                  } else {
                    var i = t.querySelector(".forum-linkbar");
                    i && i.classList.add("hidden");
                    var l = t.querySelector(".forum-file-input");
                    l && l.click();
                  }
                else {
                  var s = t.querySelector(".forum-linkbar");
                  s && s.classList.add("hidden");
                  var d = t.querySelector(".forum-embedbar");
                  if (d) {
                    var c = d.classList.contains("hidden");
                    if ((d.classList.toggle("hidden", !c), c)) {
                      var u = d.querySelector(".forum-embed-input");
                      u &&
                        setTimeout(function () {
                          u.focus();
                        }, 50);
                    }
                  }
                }
              else
                !(function (e, t) {
                  var r = t.querySelector(".forum-linkbar");
                  if (!r) return;
                  var n = r.classList.contains("hidden");
                  if ((r.classList.toggle("hidden", !n), n)) {
                    var a = r.querySelector(".forum-link-input"),
                      o = "";
                    try {
                      o = e.getAttributes("link").href || "";
                    } catch (e) {}
                    ((a.value = o),
                      setTimeout(function () {
                        a.focus();
                      }, 50));
                  } else e.commands.focus();
                })(e, t);
            else
              !(function (e) {
                ["linkbar", "embedbar"].forEach(function (t) {
                  var r = e.querySelector(".forum-" + t);
                  r && r.classList.add("hidden");
                });
                var t = e.querySelector(".forum-lockbar");
                t && t.classList.toggle("hidden");
              })(t);
          }));
      }),
        e.on("selectionUpdate", function () {
          se(e, r);
        }),
        e.on("update", function () {
          se(e, r);
        }));
      var n = t.querySelector(".forum-linkbar");
      if (n) {
        var a = n.querySelector(".forum-link-input");
        (n.querySelector(".forum-link-apply").addEventListener("click", function () {
          var t = (a.value || "").trim();
          if (t) {
            /^https?:\/\//i.test(t) || (t = "https://" + t);
            var r = e.state.selection,
              o = !!r.node;
            (r.empty || o
              ? e
                  .chain()
                  .focus()
                  .insertContent('<a href="' + t.replace(/"/g, "%22") + '">' + w(t) + "</a><p></p>")
                  .run()
              : e.chain().focus().extendMarkRange("link").setLink({ href: t }).run(),
              n.classList.add("hidden"),
              (a.value = ""));
          }
        }),
          n.querySelector(".forum-link-remove").addEventListener("click", function () {
            (e.chain().focus().extendMarkRange("link").unsetLink().run(),
              n.classList.add("hidden"));
          }));
      }
      ne(e, t);
      var o = t.querySelector(".forum-file-input");
      o &&
        o.addEventListener("change", function () {
          var t = o.files && o.files[0];
          ((o.value = ""),
            t &&
              fe(t, function (t) {
                t && e.chain().focus().setImage({ src: t }).run();
              }));
        });
    }
  }
  var ce = null;
  function ue(e) {
    return new Promise(function (t, r) {
      if ("image/gif" === e.type) {
        if (e.size > 3145728) {
          alert("GIFs are capped at 3MB. Try a shorter or smaller GIF.");
          return void r(new Error("gif too big"));
        }
        var n = new FileReader();
        return (
          (n.onload = function () {
            t(n.result);
          }),
          (n.onerror = r),
          void n.readAsDataURL(e)
        );
      }
      var a = URL.createObjectURL(e),
        o = new Image();
      ((o.onload = function () {
        try {
          var e = Math.min(o.naturalWidth, o.naturalHeight, 900),
            n = document.createElement("canvas");
          ((n.width = e), (n.height = e));
          var i = n.getContext("2d"),
            l = (o.naturalWidth - Math.min(o.naturalWidth, o.naturalHeight)) / 2,
            s = (o.naturalHeight - Math.min(o.naturalWidth, o.naturalHeight)) / 2,
            d = Math.min(o.naturalWidth, o.naturalHeight);
          (i.drawImage(o, l, s, d, d, 0, 0, e, e),
            URL.revokeObjectURL(a),
            t(n.toDataURL("image/jpeg", 0.85)));
        } catch (e) {
          r(e);
        }
      }),
        (o.onerror = r),
        (o.src = a));
    });
  }
  function fe(t, r) {
    if (t) {
      if (-1 === ["image/jpeg", "image/png", "image/webp", "image/gif"].indexOf(t.type))
        return (alert("Only JPEG, PNG, WebP, or GIF images are allowed."), void r(null));
      if (t.size > 10485760) return (alert("Images are capped at 10MB."), void r(null));
      // GIFs upload as-is (no resize), so keep them small: 3 MB cap (per dc).
      if ("image/gif" === t.type && t.size > 3145728)
        return (alert("GIFs are capped at 3MB. Try a shorter or smaller GIF."), void r(null));
      var n = "image/gif" === t.type,
        a = new FileReader();
      ((a.onload = function () {
        var e = String(a.result || "");
        if (n) o(e);
        else {
          var i = new Image();
          ((i.onload = function () {
            try {
              var r = Math.min(1, 1600 / Math.max(i.width, i.height));
              if (r >= 1 && "image/jpeg" === t.type) return void o(e);
              var n = document.createElement("canvas");
              ((n.width = Math.round(i.width * r)),
                (n.height = Math.round(i.height * r)),
                n.getContext("2d").drawImage(i, 0, 0, n.width, n.height),
                o(n.toDataURL("image/jpeg", 0.85)));
            } catch (t) {
              o(e);
            }
          }),
            (i.onerror = function () {
              (alert("Couldn't read that image. Try a different file."), r(null));
            }),
            (i.src = e));
        }
      }),
        (a.onerror = function () {
          r(null);
        }),
        a.readAsDataURL(t));
    } else r(null);
    function o(t) {
      y("/api/media", { method: "POST", body: { dataUrl: t, kind: "image" } })
        .then(function (t) {
          t && t.ok && t.id
            ? r(e + "/api/media/" + t.id)
            : (alert((t && t.error) || "Upload failed"), r(null));
        })
        .catch(function () {
          (alert("Upload failed"), r(null));
        });
    }
  }
  var me = null;
  function pe(e, t) {
    var r = null;
    function n() {
      r && (r.remove(), (r = null));
    }
    (e.on("update", function () {
      var a = e.state.selection,
        o = "";
      try {
        var i = a.$head.pos,
          l = Math.max(0, i - 20);
        o = e.state.doc.textBetween(l, i, " ");
      } catch (e) {
        return void n();
      }
      var s = o.match(/@([A-Za-z0-9_]{0,16})$/);
      if (s) {
        var d = s[1].toLowerCase();
        (me
          ? Promise.resolve(me)
          : y("/api/users")
              .then(function (e) {
                return e && e.ok && e.users
                  ? (me = e.users
                      .map(function (e) {
                        return e.username;
                      })
                      .filter(Boolean))
                  : [];
              })
              .catch(function () {
                return [];
              })
        ).then(function (o) {
          var i = o
            .filter(function (e) {
              return 0 === e.toLowerCase().indexOf(d) && e.toLowerCase() !== d;
            })
            .slice(0, 5);
          if (i.length) {
            (n(),
              ((r = document.createElement("div")).className = "forum-mention-dropdown"),
              i.forEach(function (t) {
                var o = document.createElement("button");
                ((o.type = "button"),
                  (o.textContent = mpAt(t)),
                  (o.className = "forum-mention-item"),
                  o.addEventListener("click", function () {
                    var r = e.state.tr,
                      o = a.$head.pos,
                      i = o - d.length - 1;
                    (r.delete(i, o),
                      r.insertText(mpAt(t) + " "),
                      e.view.dispatch(r),
                      e.view.focus(),
                      n());
                  }),
                  r.appendChild(o));
              }));
            var l = e.view.coordsAtPos(a.$head.pos),
              s = t.getBoundingClientRect();
            ((r.style.left = l.left - s.left + "px"),
              (r.style.top = l.bottom - s.top + 4 + "px"),
              (t.style.position = "relative"),
              t.appendChild(r));
          } else n();
        });
      } else n();
    }),
      document.addEventListener("click", function (e) {
        r && !r.contains(e.target) && n();
      }));
  }
  function he(e, t, r) {
    return (J ||
      (J = Promise.all([
        // TipTap 2.11.5, vendored + pinned (vendor/tiptap-2.11.5/BUILD.md).
        import("/vendor/tiptap-2.11.5/tiptap-ext.min.js"),
      ])
        .then(function (e) {
          return {
            Editor: e[0].Editor,
            Node: e[0].Node,
            StarterKit: e[0].StarterKit,
            Placeholder: e[0].Placeholder,
            Link: e[0].Link,
            Image: e[0].Image,
            Underline: e[0].Underline,
            Highlight: e[0].Highlight,
            Mark: e[0].Mark,
            Extension: e[0].Extension,
          };
        })
        .catch(function () {
          return null;
        })),
    J).then(function (n) {
      if (!n) return null;
      var a,
        o = new n.Editor({
          element: e.querySelector(".forum-editor-mount"),
          extensions: [
            n.StarterKit.configure({ heading: { levels: [3] } }),
            n.Placeholder.configure({ placeholder: t }),
            n.Link.configure({ openOnClick: !1, autolink: !0 }),
            n.Image.configure({ inline: !1 }),
          ].concat(mpExtras(n)).concat(
            n.Node
              ? [
                  ((a = n.Node),
                  a.create({
                    name: "lockedBlock",
                    group: "block",
                    content: "block+",
                    defining: !0,
                    addAttributes: function () {
                      return {
                        mode: {
                          default: "reply",
                          parseHTML: function (e) {
                            return e.getAttribute("data-mode") || "reply";
                          },
                        },
                        author: {
                          default: "",
                          parseHTML: function (e) {
                            return e.getAttribute("data-author") || "";
                          },
                        },
                      };
                    },
                    parseHTML: function () {
                      return [{ tag: "div.mp-locked" }];
                    },
                    renderHTML: function (e) {
                      var t = e.HTMLAttributes;
                      return [
                        "div",
                        { class: "mp-locked", "data-mode": t.mode, "data-author": t.author },
                        0,
                      ];
                    },
                  })),
                ]
              : [],
          ),
          content: r || "",
          editorProps: {
            attributes: { class: "forum-editor-input" },
            handlePaste: function (e, t) {
              var r = t.clipboardData && t.clipboardData.files;
              if (r && r.length)
                for (var n = 0; n < r.length; n++)
                  if (/^image\//.test(r[n].type || ""))
                    return (
                      t.preventDefault(),
                      (function (e) {
                        fe(e, function (e) {
                          e && o.chain().focus().setImage({ src: e }).run();
                        });
                      })(r[n]),
                      !0
                    );
              return !1;
            },
            handleDrop: function (e, t) {
              var r = t.dataTransfer && t.dataTransfer.files;
              if (r && r.length)
                for (var n = 0; n < r.length; n++)
                  if (/^image\//.test(r[n].type || ""))
                    return (
                      t.preventDefault(),
                      (function (e) {
                        fe(e, function (e) {
                          e && o.chain().focus().setImage({ src: e }).run();
                        });
                      })(r[n]),
                      !0
                    );
              return !1;
            },
          },
        });
      return (de(o, e), pe(o, e), o);
    });
  }
  function ve() {
    var e = t && t.querySelector("#forum-signin-top");
    e &&
      e.addEventListener("click", function () {
        window.MPNav && window.MPNav.show && window.MPNav.show("journal");
      });
  }
  function be() {
    var e = (O && Number(O.points)) || 0,
      t = "";
    if (
      O &&
      window.MPChat &&
      window.MPChat.avatarNode &&
      ((t = window.MPChat.avatarNode(
        O.username,
        O.avatar,
        "sm",
        O.hasAvatarImg ? O.avatarV : void 0,
      ).outerHTML),
      window.MPChat && window.MPChat.badgeFor)
    ) {
      var n = window.MPChat.badgeFor(O);
      n && (t = t.replace(/<\/span>$/, n + "</span>"));
    }
    return (
      '<div class="chat-head forum-topbar glassbar"><div class="chat-title">Forum</div><div class="chat-head-right">' +
      "" /* pull-to-post / write-a-reply replace the neon New thread|reply CTA (per dc) */ +
      (g()
        ? ""
        : '<button type="button" class="btn forum-topbar-signin" id="forum-signin-top">Sign in</button>') +
      (g()
        ? '<span class="chat-points" title="Your points"><span class="chat-star" aria-hidden="true">★</span> <span class="chat-points-num" id="forum-points">' +
          e +
          "</span></span>"
        : "") +
      (g()
        ? '<button type="button" class="forum-bell" id="forum-bell" aria-label="Notifications"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" data-hi="wiggle"><path fill-rule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clip-rule="evenodd"/></svg><span id="forum-bell-badge" class="forum-bell-badge hidden"></span></button>'
        : "") +
      (g()
        ? '<button type="button" class="chat-me" id="forum-me" aria-label="Profile">' +
          t +
          "</button>"
        : "") +
      "</div></div>"
    );
  }
  function searchPlaceholder() {
    if (!r.category) return "Search all threads";
    var name = "";
    (b.categories || []).forEach(function (c) {
      if (c.id === r.category) name = c.name || "";
    });
    return name ? "Search in " + name : "Search all threads";
  }
  function syncPinRails(root) {
    /* PINNED is a centered word now; nothing to distribute. */
  }
  var pinRailRO = null;
  function watchPinRails(root) {
    syncPinRails(root);
    try {
      if (typeof ResizeObserver === "undefined") return;
      if (pinRailRO) {
        try {
          pinRailRO.disconnect();
        } catch (e) {}
      }
      pinRailRO = new ResizeObserver(function () {
        syncPinRails(root);
      });
      (root || t || document).querySelectorAll(".forum-thread-row.is-pinned").forEach(function (row) {
        pinRailRO.observe(row);
      });
    } catch (e) {}
  }
  function syncSearchPlaceholder() {
    if (!t) return;
    var inp = t.querySelector(".forum-search-input");
    if (!inp) return;
    var ph = searchPlaceholder();
    inp.setAttribute("placeholder", ph);
    inp.setAttribute("aria-label", ph);
  }
  function ge() {
    if (t) {
      var e = n.trim().toLowerCase(),
        a = t.querySelectorAll(".forum-thread-row"),
        o = 0;
      a.forEach(function (t) {
        var r = (t.getAttribute("data-search") || "").toLowerCase(),
          n = !e || -1 !== r.indexOf(e);
        ((t.style.display = n ? "" : "none"), n && o++);
      });
      var i = t.querySelector(".forum-search-empty");
      if (i)
        if (e && 0 === o && a.length) {
          var l = "";
          (r.category &&
            b.categories.forEach(function (e) {
              e.id === r.category && (l = e.name);
            }),
            (i.textContent = 'No threads match "' + n.trim() + '"' + (l ? " in " + l : "") + "."),
            (i.style.display = ""));
        } else i.style.display = "none";
      syncSearchPlaceholder();
    }
  }
  function ye() {
    (X(), Se());
    var s = !1;
    try {
      var d = t.querySelector(".forum-search-input");
      s = !(!d || document.activeElement !== d);
    } catch (e) {}
    var u = '<div class="forum-anim">' + be() + '<div class="forum-pull-body">';
    (n && (searchOpen = !0),
      (u += '<div class="forum-cats">'),
      (u +=
        '<button type="button" class="forum-cat forum-cat-search' +
        (searchOpen ? " is-open" : "") +
        '" data-search-toggle="1" aria-label="Search" aria-expanded="' +
        (searchOpen ? "true" : "false") +
        '" title="Search"><svg width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>'),
      (u +=
        '<button type="button" class="forum-cat' +
        ("" === r.category ? " on" : "") +
        '" data-cat="">All</button>'),
      b.categories.forEach(function (e) {
        var t = "";
        ((e.ownerOnly || e.locked) &&
          (t = e.locked
            ? ' <svg class="forum-cat-lock" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-hi="rotate"><path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>'
            : ' <svg class="forum-cat-lock" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-hi="scale"><path d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>'),
          (u +=
            '<button type="button" class="forum-cat' +
            (r.category === e.id ? " on" : "") +
            (e.locked ? " forum-cat-locked" : "") +
            '" data-cat="' +
            w(e.id) +
            '"' +
            (e.locked ? ' data-locked="1"' : "") +
            (e.name ? "" : ' aria-label="Locked category"') +
            ">" +
            w(e.name || "") +
            (e.membersOnly ? " ⭐" : "") +
            (e.name ? t : t.replace(/^ /, "")) +
            "</button>"));
      }),
      (u += "</div>"),
      (u +=
        '<div class="forum-search-slot' +
        (searchOpen ? " is-open" : "") +
        '"><div class="forum-search-inner"><div class="forum-search">' +
        '<svg class="forum-search-mag" width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input type="text" class="forum-search-input" placeholder="' +
        w(searchPlaceholder()) +
        '" value="' +
        w(n) +
        '" aria-label="' +
        w(searchPlaceholder()) +
        '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">' +
        '<button type="button" class="forum-search-clear" aria-label="Clear search"' +
        (n ? "" : " hidden") +
        '><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6l12 12"/></svg></button></div></div></div>'),
      (u +=
        '<button type="button" class="forum-pullpost" id="forum-pullpost" aria-label="Create a post">' +
        '<svg class="forum-pullpost-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
        '<span class="forum-pullpost-labels" aria-hidden="true">' +
        '<span class="forum-pullpost-idle">Pull to post</span>' +
        '<span class="forum-pullpost-ready">Release to post</span></span></button>'),
      r.tag &&
        (u +=
          '<div class="forum-tagbar"><span>Filtering by</span><span class="forum-tag on">#' +
          w(r.tag) +
          '</span><button type="button" class="forum-tag-clear" id="forum-tag-clear">✕ Clear</button></div>'));
    var f = b.threads.filter(function (e) {
      return r.tag
        ? -1 !== (e.tags || []).indexOf(r.tag)
        : !r.category || e.category === r.category;
    });
    (f.length
      ? ((u += '<div class="forum-threads">'),
        f.forEach(function (t) {
          var r,
            n,
            a,
            o,
            i,
            l = (
              (t.title || "") +
              " " +
              (t.tags || []).join(" ") +
              " " +
              (t.author || "") +
              " " +
              (t.excerpt || "")
            ).toLowerCase();
          u +=
            '<div class="forum-thread-row' +
            (t.thumb ? " has-thumb" : "") +
            (t.pinned ? " is-pinned" : "") +
            '" data-search="' +
            w(l) +
            '" data-id="' +
            w(t.id) +
            '">' +
            (t.thumb
              ? '<span class="forum-thread-bg" aria-hidden="true"><img src="' +
                e +
                "/api/media/" +
                w(t.thumb) +
                '" alt="" loading="lazy" decoding="async"></span>'
              : "") +
            (t.pinned
              ? '<span class="forum-pin-rail" aria-label="Pinned"><span class="forum-pin-rail-lab" aria-hidden="true">PINNED</span></span>'
              : "") +
            '<button type="button" class="forum-thread' +
            (t.thumb ? " has-thumb" : "") +
            '" data-id="' +
            w(t.id) +
            '"><span class="forum-thread-main">' +
            '<span class="forum-thread-title-row">' +
            '<span class="forum-thread-title">' +
            w(t.title) +
            "</span>" +
            (t.pinned ? '<span class="forum-pin-chip-inline">Pinned</span>' : "") +
            "</span>" +
            ((i = C(t.authorBadge, t.author)),
            '<span class="forum-thread-meta"><span class="forum-thread-who">' +
              ((o = (a = t).author || "?"),
              '<span class="forum-avatar-wrap forum-avatar-sm"><span class="forum-avatar">' +
                (a.hasAvatarImg
                  ? '<img src="' +
                    e +
                    "/api/avatarimg/" +
                    encodeURIComponent(o) +
                    "?v=" +
                    (a.avatarV || 0) +
                    '" alt="" data-fallback="img/default-avatar.jpg">'
                  : '<img src="img/default-avatar.jpg" alt="">') +
                '</span></span><span class="forum-thread-author-name">') +
              w(mpName(t.author)) +
              "</span>" +
              (i ? '<span class="forum-thread-pill-badge">' + i + "</span>" : "") +
              '</span><span class="forum-thread-dot" aria-hidden="true">·</span><span class="forum-thread-age">' +
              k(t.lastActivity) +
              '</span><span class="forum-thread-dot" aria-hidden="true">·</span><span class="forum-thread-replies">' +
              '<svg class="forum-thread-replies-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.25C17.5 3.25 21.55 6.75 21.55 11.2C21.55 15.55 17.55 18.95 12.15 19.05C10.7 19.08 9.35 18.85 8.15 18.42C7.65 19.25 6.7 19.95 5.75 20.1C5.52 20.15 5.35 19.98 5.45 19.78C5.85 19.1 6.2 18.5 5.55 17.55C4.3 16.05 3.35 14.1 3.35 11.2C3.35 6.75 7.4 3.25 12 3.25Z"/></svg> ' +
              (Number(t.replies) || 0) +
              "</span></span>") +
            (t.excerpt ? '<span class="forum-thread-excerpt">' + w(t.excerpt) + "</span>" : "") +
            "</span>" +
            (t.thumb
              ? '<span class="forum-thread-media">' +
                (t.pinned ? '<span class="forum-pin-chip" aria-hidden="true">Pinned</span>' : "") +
                '<img class="forum-thread-thumb" src="' +
                e +
                "/api/media/" +
                w(t.thumb) +
                '" alt="" loading="lazy" decoding="async"></span>'
              : "") +
            "</button>";
          var canManage = Ne || He(t.author),
            lr = t.lastReply || null,
            lastHtml = "";
          if (lr && lr.author && lr.text) {
            var lrBadge = C(lr.authorBadge, lr.author),
              lrName = mpName(lr.author);
            lastHtml =
              '<span class="forum-thread-last">' +
              '<span class="forum-avatar-wrap forum-avatar-sm"><span class="forum-avatar">' +
              (lr.hasAvatarImg
                ? '<img src="' +
                  e +
                  "/api/avatarimg/" +
                  encodeURIComponent(lr.author) +
                  "?v=" +
                  (lr.avatarV || 0) +
                  '" alt="" data-fallback="img/default-avatar.jpg" loading="lazy" decoding="async">'
                : '<img src="img/default-avatar.jpg" alt="" loading="lazy" decoding="async">') +
              '</span></span><span class="forum-thread-last-body">' +
              '<span class="forum-thread-last-who"><span class="forum-thread-last-name">' +
              w(lrName) +
              "</span>" +
              (lrBadge ? '<span class="forum-thread-pill-badge">' + lrBadge + "</span>" : "") +
              '<span class="forum-thread-dot" aria-hidden="true">·</span><span class="forum-thread-last-age">' +
              k(lr.createdAt) +
              "</span></span>" +
              '<span class="forum-thread-last-text">' +
              w(lr.text) +
              "</span></span></span>";
          } else {
            lastHtml =
              '<span class="forum-thread-last is-empty" aria-label="No comments yet">' +
              '<span class="forum-thread-last-ico-wrap"><svg class="forum-thread-last-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.25C17.5 3.25 21.55 6.75 21.55 11.2C21.55 15.55 17.55 18.95 12.15 19.05C10.7 19.08 9.35 18.85 8.15 18.42C7.65 19.25 6.7 19.95 5.75 20.1C5.52 20.15 5.35 19.98 5.45 19.78C5.85 19.1 6.2 18.5 5.55 17.55C4.3 16.05 3.35 14.1 3.35 11.2C3.35 6.75 7.4 3.25 12 3.25Z"/></svg></span>' +
              '<span class="forum-thread-last-body">' +
              '<span class="forum-thread-last-text forum-thread-last-empty">No comments yet</span>' +
              "</span></span>";
          }
          (u +=
            '<div class="forum-thread-foot">' +
            lastHtml +
            (canManage
              ? '<button type="button" class="forum-thread-more" data-more="' +
                w(t.id) +
                '" aria-label="More">···</button>'
              : "") +
            "</div>",
            (u += "</div>"));
        }),
        (u += "</div>"))
      : (u +=
          '<div class="forum-empty">' +
          (r.tag ? "No posts with #" + w(r.tag) + " yet." : "No threads yet. Start one.") +
          "</div>"),
      (u += '<div class="forum-search-empty" style="display:none;"></div>'),
      (u += "</div></div>")); /* .forum-pull-body then .forum-anim — topbar stays outside the pull transform */
    var p = t.querySelector(".forum-cats");
    if (p) {
      l = p.scrollLeft;
      try {
        sessionStorage.setItem("mp-forum-cat-scroll", String(l));
      } catch (e) {}
    }
    t.innerHTML = u;
    try {
      t.querySelectorAll(".forum-thread-row").forEach(function (e) {
        e.querySelector(".forum-thread-thumb") && e.classList.add("has-thumb");
      });
    } catch (e) {}
    try {
      watchPinRails(t);
    } catch (e) {}
    (!(function () {
      var slot = t.querySelector(".forum-search-slot"),
        toggle = t.querySelector("[data-search-toggle]");
      var searchFocusTimer = 0;
      function setOpen(on) {
        searchOpen = !!on;
        try {
          sessionStorage.setItem("mp-forum-search-open", searchOpen ? "1" : "0");
        } catch (e) {}
        if (slot) slot.classList.toggle("is-open", searchOpen);
        if (toggle) {
          toggle.classList.toggle("is-open", searchOpen);
          toggle.classList.remove("on"); /* never steal category orb */
          toggle.setAttribute("aria-expanded", searchOpen ? "true" : "false");
        }
        /* Category selection is independent of search open state */
        syncSearchPlaceholder();
      }
      toggle &&
        toggle.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (searchFocusTimer) {
            clearTimeout(searchFocusTimer);
            searchFocusTimer = 0;
          }
          var willOpen = !searchOpen;
          setOpen(willOpen);
          if (willOpen) {
            /* focus only after open transition (~240ms) to avoid iOS scroll jump */
            searchFocusTimer = setTimeout(function () {
              searchFocusTimer = 0;
              var inp = t.querySelector(".forum-search-input");
              if (inp && searchOpen) {
                try {
                  inp.focus({ preventScroll: true });
                } catch (e) {
                  try {
                    inp.focus();
                  } catch (e2) {}
                }
              }
            }, 250);
          } else {
            n = "";
            var inp2 = t.querySelector(".forum-search-input");
            inp2 && (inp2.value = "", inp2.blur());
            ge();
          }
        });
      var e = t.querySelector(".forum-search-input");
      if (e) {
        var r = t.querySelector(".forum-search-clear");
        if (
          (e.addEventListener("input", function () {
            n = e.value;
            try {
              i = e.selectionStart || 0;
            } catch (e) {}
            (d(), ge());
          }),
          e.addEventListener("focus", function () {
            ((a = !0), d());
          }),
          e.addEventListener("blur", function () {
            ((a = !1), d());
          }),
          r &&
            (r.addEventListener("mousedown", function (e) {
              e.preventDefault();
            }),
            r.addEventListener("click", function () {
              ((n = ""), (e.value = ""), d(), ge(), setOpen(!1));
            })),
          o ||
            ((o = !0),
            document.addEventListener(
              "touchstart",
              function (e) {
                try {
                  var r = t.querySelector(".forum-search-input");
                  r &&
                    document.activeElement === r &&
                    !e.target.closest(".forum-search") &&
                    r.blur();
                } catch (e) {}
              },
              { passive: !0 },
            ),
            document.addEventListener("mousedown", function (e) {
              try {
                var r = t.querySelector(".forum-search-input");
                r && document.activeElement === r && !e.target.closest(".forum-search") && r.blur();
              } catch (e) {}
            })),
          s)
        ) {
          try {
            searchOpen = !0;
            slot && slot.classList.add("is-open");
            e.focus();
            var l = Math.min(i, e.value.length);
            e.setSelectionRange(l, l);
          } catch (e) {}
          ((a = !0), d());
        }
      }
      function d() {
        r && (n ? r.removeAttribute("hidden") : r.setAttribute("hidden", ""));
      }
    })(),
      ge());
    var v = t.querySelector(".forum-cats");
    (v &&
      (l &&
        ((v.scrollLeft = l),
        requestAnimationFrame(function () {
          v.scrollLeft = l;
        })),
      (function (el) {
        function edges() {
          var max = el.scrollWidth - el.clientWidth;
          var x = el.scrollLeft;
          var eps = 2;
          el.classList.toggle("at-start", x <= eps);
          el.classList.toggle("at-end", max <= eps || x >= max - eps);
        }
        edges();
        requestAnimationFrame(edges);
        el.addEventListener(
          "scroll",
          function () {
            l = el.scrollLeft;
            edges();
          },
          { passive: !0 },
        );
        window.addEventListener("resize", edges, { passive: !0 });
      })(v)),
      S(t),
      L(t),
      R(),
      B());
    try {
      H();
    } catch (e) {}
    ("list" === r.name && !t.classList.contains("forum-live-paint") && window.scrollTo(0, 0),
      t.querySelectorAll(".forum-cat").forEach(function (e) {
        e.addEventListener("click", function () {
          if (e.getAttribute("data-search-toggle")) return;
          e.getAttribute("data-locked") ||
            ((r.tag = ""), (r.category = e.getAttribute("data-cat")), ye());
        });
      }));
    var tagClear = t.querySelector("#forum-tag-clear");
    (tagClear &&
      tagClear.addEventListener("click", function () {
        ((r.tag = ""), ye());
      }),
      t.querySelectorAll("[data-tag]").forEach(function (e) {
        e.addEventListener("click", function (t) {
          (t.stopPropagation(), h(e.getAttribute("data-tag")));
        });
      }),
      t.querySelectorAll("[data-tagmore]").forEach(function (e) {
        e.addEventListener("click", function (t) {
          (t.stopPropagation(), (c[e.getAttribute("data-tagmore")] = !0));
          var r = window.scrollY;
          (ye(), window.scrollTo(0, r));
        });
      }),
      t.querySelectorAll(".forum-thread").forEach(function (e) {
        e.addEventListener("click", function () {
          Oe(e.getAttribute("data-id"));
        });
      }),
      t.querySelectorAll("[data-pin]").forEach(function (e) {
        e.addEventListener("click", function (t) {
          t.stopPropagation();
          var r = e.getAttribute("data-pin");
          y("/api/forum/thread/" + encodeURIComponent(r) + "/pin", { method: "POST" })
            .then(function (e) {
              if (e.ok) {
                var t = !(void 0 !== e.pinned && !e.pinned);
                ((b.threads || []).forEach(function (e) {
                  e.id === r && (e.pinned = t);
                }),
                  b.thread && b.thread.id === r && (b.thread.pinned = t),
                  Be());
              }
            })
            .catch(function () {
              alert("Couldn't pin. Try again.");
            });
        });
      }),
      t.querySelectorAll("[data-del]").forEach(function (e) {
        e.addEventListener("click", function (t) {
          (t.stopPropagation(),
            confirm("Delete this thread and all its replies?") &&
              y("/api/forum/thread/" + encodeURIComponent(e.getAttribute("data-del")), {
                method: "DELETE",
              }).then(function (e) {
                e.ok && ((r.name = "list"), (r.threadId = null), Re());
              }));
        });
      }),
      t.querySelectorAll(".forum-thread-more[data-more]").forEach(function (btn) {
        btn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var id = btn.getAttribute("data-more"),
            thr = null;
          (b.threads || []).forEach(function (x) {
            x.id === id && (thr = x);
          });
          if (!thr || !window.mpHide || !mpHide.menu) return;
          var items = [];
          Ne &&
            items.push({
              label: thr.pinned ? "Unpin" : "Pin",
              run: function () {
                y("/api/forum/thread/" + encodeURIComponent(id) + "/pin", { method: "POST" })
                  .then(function (e) {
                    if (e.ok) {
                      var p = !(void 0 !== e.pinned && !e.pinned);
                      ((b.threads || []).forEach(function (x) {
                        x.id === id && (x.pinned = p);
                      }),
                        Be());
                    }
                  })
                  .catch(function () {
                    alert("Couldn't pin. Try again.");
                  });
              },
            });
          He(thr.author) &&
            items.push({
              label: "Delete",
              danger: !0,
              run: function () {
                confirm("Delete this thread and all its replies?") &&
                  y("/api/forum/thread/" + encodeURIComponent(id), { method: "DELETE" }).then(
                    function (e) {
                      e.ok && ((r.name = "list"), (r.threadId = null), Re());
                    },
                  );
              },
            });
          items.length && mpHide.menu(btn, items);
        });
      }),
      ve());
    setGlobeListMode(!0);
    bindPullToPost();
  }
  function openNewThread(opts) {
    if (!g()) return;
    killPullToPost();
    opts = opts || {};
    r.name = "new";
    if (opts.smooth) openComposerSmooth();
    else Ie();
  }
  function focusNewTitle() {
    try {
      var title = t && t.querySelector("#forum-title");
      if (title) title.focus({ preventScroll: true });
    } catch (e) {}
  }
  function openComposerSmooth() {
    var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (RM) {
      Ie();
      setTimeout(focusNewTitle, 40);
      return;
    }
    var leaving = (t && (t.querySelector(".forum-pull-body") || t.querySelector(".forum-anim"))) || null;
    if (leaving) {
      leaving.style.willChange = "transform, opacity";
      leaving.style.transition = "transform .34s cubic-bezier(.2,.85,.25,1), opacity .28s ease";
      var cur = leaving.style.transform;
      var base = 56;
      try {
        var m = /translate3d\(0,\s*([\d.]+)px/.exec(cur || "");
        if (m) base = Math.max(56, parseFloat(m[1]) + 24);
      } catch (e) {}
      leaving.style.transform = "translate3d(0," + base + "px,0)";
      leaving.style.opacity = "0";
    }
    setTimeout(function () {
      Ie();
      var enter = t && t.querySelector(".forum-anim");
      if (!enter) {
        focusNewTitle();
        return;
      }
      enter.classList.add("forum-view-enter");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          enter.classList.add("is-in");
        });
      });
      setTimeout(function () {
        enter.classList.remove("forum-view-enter", "is-in");
        focusNewTitle();
      }, 380);
    }, 170);
  }
  function closeComposerSmooth() {
    var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (RM) {
      Ae(true);
      return;
    }
    var leaving = t && t.querySelector(".forum-anim");
    if (!leaving) {
      Ae(true);
      return;
    }
    leaving.classList.add("forum-view-exit");
    setTimeout(function () {
      Ae(true);
      var enter = t && t.querySelector(".forum-anim");
      if (!enter) return;
      enter.classList.add("forum-view-enter");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          enter.classList.add("is-in");
        });
      });
      setTimeout(function () {
        enter.classList.remove("forum-view-enter", "is-in");
      }, 380);
    }, 180);
  }
  // Globe list: one pull threshold opens the composer; live sync replaces refresh.
  // Transform ONLY .forum-pull-body (topbar stays fixed). Global PTR stays off
  // on Globe via __mpPullToPost / #forum.on. Reduced-motion: snap, no springs.

  function setGlobeListMode(on) {
    var f = document.getElementById("forum");
    if (!f) return;
    f.classList.toggle("is-globe-list", !!on);
    if (!on) {
      try { window.__mpPullToPost = !1; } catch (e) {}
      document.documentElement.classList.remove("mp-globe-pull");
    }
  }
  /* Tear down list pull listeners whenever we leave the Globe LIST.
     setGlobeListMode(false) alone left touch handlers on #forum, so a pull
     on a thread page still fired openNewThread (per dc). */
  function killPullToPost() {
    if (t && t._pullAborter) {
      try { t._pullAborter.abort(); } catch (e) {}
      t._pullAborter = null;
    }
    setGlobeListMode(!1);
    try {
      var leftover = t && t.querySelector("#forum-pullpost");
      if (leftover) leftover.remove();
      var body = t && (t.querySelector(".forum-pull-body") || t.querySelector(".forum-anim"));
      if (body) {
        body.classList.remove("is-pulling");
        body.style.transform = "";
        body.style.transition = "";
        body.style.willChange = "";
        body.style.opacity = "";
      }
    } catch (e) {}
  }
  function listPullLive() {
    /* Live route check — never trust a stale class alone. */
    if ("list" !== r.name) return !1;
    if (r.threadId) return !1;
    var f = document.getElementById("forum");
    if (!(f && f.classList.contains("on"))) return !1;
    if (!f.classList.contains("is-globe-list")) return !1;
    /* Composer / new-thread view is not the list. */
    if (f.querySelector("#forum-title, .forum-compose, #forum-new")) return !1;
    /* Thread detail mounted (deep link / race). */
    if (f.querySelector(".forum-post, .forum-replies, #forum-reply, #forum-back")) return !1;
    return !0;
  }
  function bindPullToPost() {
    var hint = t.querySelector("#forum-pullpost");
    if (!g() || "list" !== r.name) {
      if (hint) hint.remove();
      killPullToPost();
      return;
    }
    if (!hint) {
      killPullToPost();
      return;
    }
    setGlobeListMode(!0);
    hint.addEventListener("click", function (e) {
      e.preventDefault();
      if (!listPullLive()) return;
      openNewThread({ smooth: true });
    });
    if (t._pullAborter) {
      try { t._pullAborter.abort(); } catch (e) {}
    }
    t._pullAborter = new AbortController();
    var sig = t._pullAborter.signal;
    var panel = document.getElementById("forum") || t;
    var body = t.querySelector(".forum-pull-body") || t.querySelector(".forum-anim") || t;
    var POST_THRESHOLD = 80;
    var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var startY = 0, startX = 0, locked = 0, dist = 0, tracking = 0;
    var stage = 0, buzz1 = 0, busy = 0;
    var shift = 0, raf = 0, pending = 0;

    function claim(on) {
      try { window.__mpPullToPost = !!on; } catch (e) {}
      if (on) {
        document.documentElement.classList.add("mp-globe-pull");
        body.classList.add("is-pulling");
      } else {
        document.documentElement.classList.remove("mp-globe-pull");
        body.classList.remove("is-pulling");
      }
    }
    function setStage(st) {
      hint.classList.toggle("is-pulling", dist > 4);
      hint.classList.toggle("is-armed", st === 1);
    }
    function paint() {
      raf = 0;
      if (!pending) return;
      pending = 0;
      var p2 = Math.max(0, Math.min(1, dist / POST_THRESHOLD));
      hint.style.setProperty("--pull", p2.toFixed(4));
      if (!busy) setStage(stage);
      body.style.transform = shift ? "translate3d(0," + shift.toFixed(2) + "px,0)" : "";
    }
    function schedule() {
      pending = 1;
      if (!raf) raf = requestAnimationFrame(paint);
    }
    function setFromRaw(raw) {
      dist = raw;
      var resisted = Math.min(132, raw * 0.5 + Math.pow(Math.max(0, raw - 40), 0.82) * 0.28);
      if (RM) resisted = Math.min(72, raw * 0.35);
      shift = resisted;
      var next = raw >= POST_THRESHOLD ? 1 : 0;
      if (next !== stage) {
        if (next === 1 && !buzz1) {
          buzz1 = 1;
          hint.classList.add("is-pop");
          try { navigator.vibrate && navigator.vibrate(10); } catch (err) {}
          setTimeout(function () { hint.classList.remove("is-pop"); }, 450);
        }
        if (next < 1) buzz1 = 0;
        stage = next;
      }
      schedule();
    }
    function snapClear() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      pending = 0;
      shift = 0;
      dist = 0;
      stage = 0;
      busy = 0;
      body.style.transition = "none";
      body.style.transform = "";
      body.style.willChange = "";
      body.style.opacity = "";
      hint.style.transition = "none";
      hint.style.setProperty("--pull", "0");
      hint.classList.remove("is-armed", "is-pulling", "is-pop", "is-settle");
      busy = 0;
      setStage(0);
      void body.offsetWidth;
    }
    function springBack(then) {
      claim(0);
      body.style.willChange = "";
      if (RM) {
        snapClear();
        if (then) then();
        return;
      }
      body.style.transition = "transform .3s cubic-bezier(.2,.85,.25,1.15)";
      hint.style.transition = "opacity .28s ease, transform .3s cubic-bezier(.2,.85,.25,1.15)";
      shift = 0;
      dist = 0;
      stage = 0;
      schedule();
      body.style.transform = "translate3d(0,0,0)";
      requestAnimationFrame(function () {
        body.style.transform = "";
        hint.style.setProperty("--pull", "0");
          hint.classList.remove("is-armed", "is-pulling", "is-pop", "is-settle");
        busy = 0;
        setStage(0);
      });
      setTimeout(function () {
        body.style.transition = "";
        hint.style.transition = "";
        if (then) then();
      }, 320);
    }
    function atTop() {
      var y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      return y <= 0;
    }
    function onStart(e) {
      if (busy) return;
      locked = 0;
      dist = 0;
      stage = 0;
      buzz1 = 0;
      tracking = 0;
      claim(0);
      /* Bail unless the Globe LIST is the live view right now (per dc). */
      if (!listPullLive()) return;
      if (!hint || !hint.isConnected) return;
      if (!body || !body.isConnected) return;
      if (!e.touches || e.touches.length !== 1) return;
      if (!atTop()) return;
      var el = e.target;
      if (el && el.closest) {
        if (el.closest(".forum-cats, .forum-search, .forum-search-slot, .chat-head, #nav, .forum-thread, .forum-thread-row, .forum-post, .forum-replies, .forum-compose")) {
          if (!el.closest("#forum-pullpost")) return;
        }
      }
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      tracking = 1;
      locked = 0;
      body.style.transition = "none";
      body.style.opacity = "";
      hint.style.transition = "none";
    }
    function onMove(e) {
      if (busy || !tracking || locked < 0) return;
      if (!listPullLive() || !hint.isConnected || !body.isConnected) {
        locked = -1;
        tracking = 0;
        claim(0);
        return;
      }
      if (!e.touches || e.touches.length !== 1) return;
      var y = e.touches[0].clientY, x = e.touches[0].clientX;
      var dy = y - startY, dx = x - startX;
      if (!locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy > 0 && dy > Math.abs(dx) * 1.25 && atTop()) {
          locked = 1;
          claim(1);
          body.style.willChange = "transform";
        } else {
          locked = -1;
          tracking = 0;
          return;
        }
      }
      if (locked !== 1) return;
      if (!atTop() && dy <= 0) {
        locked = -1;
        tracking = 0;
        springBack();
        return;
      }
      if (e.cancelable) e.preventDefault();
      setFromRaw(Math.max(0, dy));
    }
    function onEnd() {
      tracking = 0;
      if (busy) return;
      if (locked !== 1) {
        locked = 0;
        claim(0);
        return;
      }
      var st = stage;
      locked = 0;
      /* Re-check live route before acting — thread/composer must never post. */
      if (!listPullLive() || !hint.isConnected) {
        claim(0);
        springBack();
        return;
      }
      if (st === 1) {
        claim(0);
        hint.classList.add("is-settle");
        openNewThread({ smooth: !RM });
      } else {
        springBack();
      }
    }
    if (panel && !panel._pullWatch) {
      panel._pullWatch = 1;
      try {
        new MutationObserver(function () {
          if (!panel.classList.contains("on") || !panel.classList.contains("is-globe-list")) {
            try { window.__mpPullToPost = !1; } catch (e) {}
            document.documentElement.classList.remove("mp-globe-pull");
            if (t && t._pullAborter && (!panel.classList.contains("on") || "list" !== r.name)) {
              try { t._pullAborter.abort(); } catch (err) {}
              t._pullAborter = null;
            }
          }
        }).observe(panel, { attributes: !0, attributeFilter: ["class"] });
      } catch (e) {}
    }
    panel.addEventListener("touchstart", onStart, { passive: true, signal: sig, capture: true });
    panel.addEventListener("touchmove", onMove, { passive: false, signal: sig, capture: true });
    panel.addEventListener("touchend", onEnd, { passive: true, signal: sig, capture: true });
    panel.addEventListener("touchcancel", function () { tracking = 0; locked = 0; springBack(); }, { passive: true, signal: sig, capture: true });
  }
  function we() {
    killPullToPost();
    ((t.querySelector(".forum-skel") ? 0 : mpSkel(!0)),
      y("/api/forum/thread/" + encodeURIComponent(r.threadId)).then(function (e) {
        if (e.ok && e.thread)
          if (e.locked) {
            var r = e.privateLock ? "🔒" : "⭐",
              n = e.privateLock
                ? "Private. Only the owner can view this thread."
                : "VIPs only. Become a VIP to read this thread.";
            if (((b.thread = e.thread), window.MPNav && MPNav.refreshTitle))
              try {
                MPNav.refreshTitle();
              } catch (e) {}
            ((t.innerHTML =
              '<div class="forum-anim">' +
              be() +
              '<div class="forum-head"><button type="button" class="forum-back forum-glass-pill" id="forum-back">← Back</button></div><div class="forum-locked"><div class="forum-locked-icon">' +
              r +
              '</div><div class="forum-locked-title">' +
              w(e.thread.title) +
              '</div><div class="forum-locked-sub">' +
              n +
              "</div></div></div>"),
              R(),
              B());
            try {
              H();
            } catch (e) {}
            t.querySelector("#forum-back").addEventListener("click", Ae);
          } else ((b.thread = e.thread), ke());
        else mpState("Thread not found.", null, !0);
      }, function () {
        mpState("Couldn’t load this thread.", we, !0);
      }));
  }
  // Update an already-mounted .forum-poll from thread.poll without touching the
  // rest of the thread DOM (avoids vote flicker: no innerHTML, no optPop/beamIn
  // restart, no avatar img reload, no backdrop-filter drop).
  function Ue(thread) {
    try {
      if (!thread || !thread.poll || !thread.poll.options || !thread.poll.options.length) return;
      var host = t.querySelector(".forum-poll");
      if (!host) return;
      var opts = thread.poll.options;
      var total = opts.reduce(function (sum, o) {
        return sum + (Number(o.votes) || 0);
      }, 0);
      var my =
        O && thread.poll.voters ? thread.poll.voters[String(O.username).toLowerCase()] : void 0;
      var btns = host.querySelectorAll(".forum-poll-opt");
      opts.forEach(function (o, i) {
        var btn = btns[i];
        if (!btn) return;
        var pct = total > 0 ? Math.round(((Number(o.votes) || 0) / total) * 100) : 0;
        var mine = my === i;
        var was = btn.classList.contains("voted");
        btn.classList.toggle("voted", !!mine);
        btn.style.border = "1px solid " + (mine ? "rgba(255,255,255,.12)" : "rgba(127,127,127,.25)");
        btn.style.background = mine ? "rgba(80,140,255,.15)" : "rgba(127,127,127,.06)";
        btn.disabled = !1;
        var bar = btn.querySelector(".forum-poll-bar");
        bar && (bar.style.width = pct + "%");
        var lbl = btn.querySelector(".forum-poll-lbl");
        if (lbl) {
          var base = String(o.text || "");
          lbl.textContent = base + (mine ? " ✓" : "");
        }
        var beam = btn.querySelector(".easyui-neon-beam-wrap");
        if (mine && !beam) {
          var wrap = document.createElement("span");
          wrap.className = "easyui-neon-beam-wrap";
          wrap.setAttribute("aria-hidden", "true");
          wrap.innerHTML = '<span class="easyui-neon-beam"></span>';
          // Only animate the first time this option becomes selected this session.
          if (was) wrap.style.animation = "none";
          btn.insertBefore(wrap, btn.firstChild);
        } else if (!mine && beam) {
          beam.remove();
        } else if (mine && beam && was) {
          // Keep existing beam; don't restart beamIn by cloning.
        }
        var meta = btn.querySelector(".forum-poll-meta");
        if (meta) {
          var voters = meta.querySelector(".forum-poll-voters");
          var pctEl = meta.querySelector(".forum-poll-pct");
          if (!pctEl) {
            pctEl = document.createElement("span");
            pctEl.className = "forum-poll-pct";
            pctEl.style.opacity = ".7";
            pctEl.style.marginLeft = "4px";
            meta.appendChild(pctEl);
          }
          pctEl.textContent = pct + "%";
          if (mine && thread.voterAvatars && thread.voterAvatars[i] && thread.voterAvatars[i].length) {
            if (!voters) {
              voters = document.createElement("span");
              voters.className = "forum-poll-voters";
              voters.style.display = "flex";
              meta.insertBefore(voters, pctEl);
            }
            var html = "";
            thread.voterAvatars[i].forEach(function (u, r) {
              var inner = u.hasAvatarImg
                ? '<img src="' +
                  e +
                  "/api/avatarimg/" +
                  encodeURIComponent(u.username) +
                  "?v=" +
                  (Number(u.avatarV) || 0) +
                  '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" data-fallback="img/default-avatar.jpg">'
                : w(u.avatar || "😀");
              html +=
                '<span title="' +
                w(u.username) +
                '" class="poll-voter-avatar" data-u="' +
                w(u.username) +
                '" style="width:20px;height:20px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;font-size:12px;background:rgba(127,127,127,.2);' +
                (r > 0 ? "margin-left:-6px;" : "") +
                '">' +
                inner +
                "</span>";
            });
            var shown = thread.voterAvatars[i].length,
              more = (Number(o.votes) || 0) - shown;
            if (more > 0)
              html +=
                '<span class="poll-voter-avatar poll-voter-more" style="width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:rgba(127,127,127,.35);margin-left:-6px;">+' +
                more +
                "</span>";
            // Reuse existing <img> nodes with the same src when possible to avoid flicker.
            if (voters.getAttribute("data-sig") !== html) {
              voters.setAttribute("data-sig", html);
              voters.innerHTML = html;
            }
          } else if (voters) {
            voters.remove();
          }
        }
      });
      var ft = host.querySelector(".forum-poll-ft");
      if (ft)
        ft.textContent =
          total + " vote" + (1 === total ? "" : "s") + (g() ? "" : " · Sign in to vote");
    } catch (err) {}
  }
  function ke() {

    var n = b.thread;
    if (n) {
      if (window.MPNav && MPNav.refreshTitle)
        try {
          MPNav.refreshTitle();
        } catch (e) {}
      Se();
      var a = v !== n.id;
      v = n.id;
      var o =
        be() +
        '<div class="forum-head"><button type="button" class="forum-back forum-glass-pill" id="forum-back">← Back</button>' +
        (n.categoryName ? '<span class="forum-cat-pill">' + w(n.categoryName) + "</span>" : "") +
        (navigator.share
          ? '<button type="button" class="forum-share forum-glass-pill" id="forum-share" aria-label="Share thread"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-hi="float"><path d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"/></svg></button>'
          : "") +
        "</div>";
      ((o +=
        '<article class="forum-post forum-op' +
        (n.pinned ? " is-pinned" : "") +
        '">' +
        (n.pinned
          ? '<span class="forum-pin-rail" aria-label="Pinned"><span class="forum-pin-rail-lab" aria-hidden="true">PINNED</span></span>'
          : "") +
        '<div class="forum-post-head">' +
        E(n, !0) +
        '<span class="forum-post-time">' +
        k(n.createdAt) +
        '</span></div><h3 class="forum-post-title">' +
        w(n.title) +
        "</h3>" +
        (n.tags && n.tags.length ? '<div class="forum-post-tags">' + m(n, 3) + "</div>" : "") +
        '<div class="forum-post-body">' +
        G(n) +
        "</div>" +
        (function (t) {
          if (!t.poll || !t.poll.options || !t.poll.options.length) return "";
          var r = t.poll.options.reduce(function (e, t) {
              return e + (Number(t.votes) || 0);
            }, 0),
            n = O && t.poll.voters ? t.poll.voters[O.username.toLowerCase()] : void 0,
            a =
              '<style>@keyframes easyui-neon-rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@media (prefers-reduced-motion: reduce){.forum-poll-opt .easyui-neon-beam{animation:none!important;opacity:.4!important}}.forum-poll-opt{isolation:isolate;}.forum-poll-opt .easyui-neon-beam-wrap{position:absolute;inset:0;padding:1px;border-radius:10px;pointer-events:none;overflow:hidden;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude;}.forum-poll-opt .easyui-neon-beam{position:absolute;inset:-200%;background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,transparent 280deg,rgba(255,255,255,.9) 340deg,transparent 360deg);animation:easyui-neon-rotate 3s linear infinite;}[data-theme="light"] .forum-poll-opt .easyui-neon-beam{background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,transparent 280deg,rgba(0,122,255,.9) 340deg,transparent 360deg);}.forum-poll-opt .poll-opt-content{position:relative;z-index:1;}@keyframes beamIn{0%{opacity:0}100%{opacity:1}}@keyframes optPop{0%{transform:scale(1)}40%{transform:scale(1.02)}100%{transform:scale(1)}}.forum-poll-opt.voted .easyui-neon-beam-wrap{animation:beamIn .45s ease-out;}.forum-poll-opt.voted{animation:optPop .35s cubic-bezier(.34,1.3,.64,1);}.forum-poll-opt{transition:border-color .3s ease,background-color .3s ease;}</style>';
          return (
            (a +=
              '<div class="forum-poll" data-thread="' +
              w(t.id) +
              '" style="margin:12px 0;padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);">'),
            (a +=
              '<div style="font-weight:700;margin-bottom:10px;color:var(--ink);">' +
              w(t.poll.question) +
              "</div>"),
            t.poll.options.forEach(function (o, i) {
              var l = r > 0 ? Math.round(((Number(o.votes) || 0) / r) * 100) : 0,
                s = n === i;
              if (
                ((a +=
                  '<button type="button" class="forum-poll-opt' +
                  (s ? " voted" : "") +
                  '" data-idx="' +
                  i +
                  '" ' +
                  (g() ? "" : "disabled") +
                  ' style="display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 12px;border-radius:10px;border:1px solid ' +
                  (s ? "rgba(255,255,255,.12)" : "rgba(127,127,127,.25)") +
                  ";background:" +
                  (s ? "rgba(80,140,255,.15)" : "rgba(127,127,127,.06)") +
                  ";color:var(--ink);cursor:" +
                  (g() ? "pointer" : "default") +
                  ';position:relative;overflow:hidden;">'),
                s &&
                  (a +=
                    '<span class="easyui-neon-beam-wrap" aria-hidden="true"><span class="easyui-neon-beam"></span></span>'),
                (a +=
                  '<span class="forum-poll-bar" style="position:absolute;left:0;top:0;bottom:0;width:' +
                  l +
                  '%;background:rgba(80,140,255,.18);"></span>'),
                (a +=
                  '<span class="poll-opt-content" style="display:flex;justify-content:space-between;align-items:center;"><span class="forum-poll-lbl">' +
                  w(o.text) +
                  (s ? " ✓" : "") +
                  '</span><span class="forum-poll-meta" style="display:flex;align-items:center;gap:4px;">'),
                s && t.voterAvatars && t.voterAvatars[i])
              ) {
                ((a += '<span class="forum-poll-voters" style="display:flex;">'),
                  t.voterAvatars[i].forEach(function (t, r) {
                    var n = t.hasAvatarImg
                      ? '<img src="' +
                        e +
                        "/api/avatarimg/" +
                        encodeURIComponent(t.username) +
                        "?v=" +
                        (Number(t.avatarV) || 0) +
                        '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" data-fallback="img/default-avatar.jpg">'
                      : w(t.avatar || "😀");
                    a +=
                      '<span title="' +
                      w(t.username) +
                      '" class="poll-voter-avatar" style="width:20px;height:20px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;font-size:12px;background:rgba(127,127,127,.2);' +
                      (r > 0 ? "margin-left:-6px;" : "") +
                      '">' +
                      n +
                      "</span>";
                  }));
                var d = t.voterAvatars[i].length,
                  c = (Number(o.votes) || 0) - d;
                (c > 0 &&
                  (a +=
                    '<span class="poll-voter-avatar poll-voter-more" style="width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:rgba(127,127,127,.35);margin-left:-6px;">+' +
                    c +
                    "</span>"),
                  (a += "</span>"));
              }
              ((a += '<span class="forum-poll-pct" style="opacity:.7;margin-left:4px;">' + l + "%</span></span></span>"),
                (a += "</button>"));
            }),
            (a +=
              '<div class="forum-poll-ft" style="font-size:12px;color:var(--muted);margin-top:4px;">' +
              r +
              " vote" +
              (1 === r ? "" : "s") +
              (g() ? "" : " · Sign in to vote") +
              "</div></div>")
          );
        })(n) +
        W(n, !1) +
        '<div class="forum-admin forum-admin-thread">' +
        (g() ? A(n, null) : "") +
        (g()
          ? '<button type="button" class="forum-admin-btn" id="forum-reply-op">Reply</button>'
          : "") +
        '<button type="button" class="forum-admin-btn" id="forum-copy-link" title="Copy link">🔗</button>' +
        (O &&
        (Ne || O.username.toLowerCase() === String(n.author).toLowerCase()) &&
        b.threads.length &&
        "excerpt" in b.threads[0]
          ? '<button type="button" class="forum-admin-btn" id="forum-edit-btn">Edit</button>'
          : "") +
        (Ne
          ? '<button type="button" class="forum-admin-btn" data-pin="' +
            w(n.id) +
            '">' +
            (n.pinned ? "Unpin" : "Pin") +
            "</button>"
          : "") +
        (He(n.author)
          ? '<button type="button" class="forum-admin-btn forum-admin-del" data-del="' +
            w(n.id) +
            '">Delete</button>'
          : "") +
        "</div></article>"),
        (o += '<div class="forum-replies">'));
      var i = n.replies || [],
        l = i.filter(function (e) {
          return !e.parentId;
        }),
        s = {};
      if (
        (i.forEach(function (e) {
          e.parentId && (s[e.parentId] = s[e.parentId] || []).push(e);
        }),
        l.forEach(function (e) {
          o += M(e, 0);
        }),
        (o += "</div>"),
        g())
      ) {
        var d = r.replyTo ? r.replyTo.name : null;
        o +=
          '<div class="forum-replybox">' +
          (d
            ? '<div class="forum-replying-to">Replying to <b>' +
              w(d) +
              '</b><button type="button" id="forum-cancel-reply" aria-label="Cancel reply">×</button></div>'
            : "") +
          '<div class="forum-editor" id="forum-reply-editor">' +
          re({ embed: !0, member: j(), lock: !0 }) +
          '<div class="forum-editor-mount"></div></div><button type="button" class="btn accent" id="forum-send">Reply</button></div>';
      } else o += '<div class="forum-signin">Sign in to join the discussion.</div>';
      ((t.innerHTML = '<div class="forum-anim">' + o + "</div>"),
        S(t),
        L(t),
        (function (e) {
          if (e && t) {
            var r = "";
            try {
              r = O ? String(O.username).toLowerCase() : "";
            } catch (e) {}
            var n = !(!O || (!O.member && !Ne)),
              a = {};
            ((e.replies || []).forEach(function (e) {
              e.author && (a[String(e.author).toLowerCase()] = 1);
            }),
              t.querySelectorAll(".mp-locked").forEach(function (e) {
                var t = e.getAttribute("data-mode") || "reply",
                  o = (e.getAttribute("data-author") || "").toLowerCase();
                Ne ||
                  (r && r === o) ||
                  ("member" === t ? n : r && a[r]) ||
                  (e.setAttribute("data-gated", "1"),
                  (e.innerHTML =
                    '<div class="mp-locked-note"><span aria-hidden="true">🔒</span><span>' +
                    w(
                      "member" === t
                        ? "This hidden content is only available to VIPs"
                        : "This hidden content becomes available once you reply to this thread",
                    ) +
                    "</span></div>"));
              }));
          }
        })(b.thread),
        t.querySelectorAll(".forum-poll-opt").forEach(function (e) {
          e.addEventListener("click", function () {
            if (g()) {
              var t = e.closest(".forum-poll"),
                r = t ? t.getAttribute("data-thread") : null,
                n = parseInt(e.getAttribute("data-idx"), 10);
              if (r && !isNaN(n)) {
                var a = t.querySelector(".forum-poll-opt.voted");
                if (a && a !== e) {
                  (a.classList.remove("voted"),
                    (a.style.border = "1px solid rgba(127,127,127,.25)"),
                    (a.style.background = "rgba(127,127,127,.06)"));
                  var o = a.querySelector(".easyui-neon-beam-wrap");
                  o && o.remove();
                  var i = a.querySelector(".poll-opt-content > span:first-child");
                  i && (i.textContent = i.textContent.replace(" ✓", ""));
                }
                if (!e.classList.contains("voted")) {
                  (e.classList.add("voted"),
                    (e.style.border = "1px solid rgba(255,255,255,.12)"),
                    (e.style.background = "rgba(80,140,255,.15)"));
                  var l = document.createElement("span");
                  ((l.className = "easyui-neon-beam-wrap"),
                    l.setAttribute("aria-hidden", "true"),
                    (l.innerHTML = '<span class="easyui-neon-beam"></span>'),
                    e.insertBefore(l, e.firstChild));
                  var s = e.querySelector(".poll-opt-content > span:first-child");
                  s && -1 === s.textContent.indexOf("✓") && (s.textContent += " ✓");
                }
                ((e.disabled = !0),
                  y("/api/forum/thread/" + encodeURIComponent(r) + "/poll/vote", {
                    method: "POST",
                    body: { option: n },
                  })
                    .then(function (t) {
                      t.ok && t.poll
                        ? ((b.thread.poll = t.poll),
                          t.voterAvatars && (b.thread.voterAvatars = t.voterAvatars),
                          // In-place update (per dc): never re-render the thread on vote —
                          // that flickered (entrance anim, avatar reload, beam restart).
                          Ue(b.thread))
                        : (alert(t.error || "Vote failed"), (e.disabled = !1));
                    })
                    .catch(function () {
                      e.disabled = !1;
                    }));
              }
            }
          });
        }),
        R(),
        B());
      try {
        H();
      } catch (e) {}
      t.querySelector("#forum-back").addEventListener("click", Ae);
      var sh = t.querySelector("#forum-share");
      sh &&
        sh.addEventListener("click", function () {
          // Canonical public thread page (/t/<id>), not the in-app hash route.
          navigator
            .share({
              title: n.title || "Misery Globe",
              text: (n.title || "A thread") + " on Misery Globe",
              url: "https://misereperdue.com/t/" + encodeURIComponent(n.id),
            })
            .catch(function () {});
        });
      var u = t.querySelector("#forum-reply-op");
      u &&
        u.addEventListener("click", function () {
          ((r.replyTo = null), q());
        });
      var f = t.querySelector("#forum-copy-link");
      (f &&
        f.addEventListener("click", function () {
          var e = "https://misereperdue.com/t/" + encodeURIComponent(n.id);
          navigator.clipboard && navigator.clipboard.writeText
            ? navigator.clipboard
                .writeText(e)
                .then(function () {
                  ((f.textContent = "✓"),
                    setTimeout(function () {
                      f.innerHTML = "🔗";
                    }, 1800));
                })
                .catch(function () {
                  I(e);
                })
            : I(e);
        }),
        a && (window.scrollTo(0, 0), window.MPScroll && MPScroll.pinTop(2e3)),
        (function () {
          var e = t.querySelector("#forum-reply-editor");
          if ((e && le(e), !e)) return void (Y = null);
          if (Y) {
            try {
              Y.destroy();
            } catch (e) {}
            Y = null;
          }
          he(e, "Write a reply…").then(function (t) {
            if (t) Y = t;
            else {
              var r = document.createElement("div");
              ((r.innerHTML =
                '<textarea id="forum-reply" rows="3" maxlength="5000" placeholder="Write a reply…"></textarea>'),
                e.replaceWith(r.firstChild));
            }
          });
        })(),
        (function () {
          if (!g()) return;
          var e = t.querySelectorAll(".forum-post-body"),
            r = {};
          e.forEach(function (e) {
            e.querySelectorAll('a[href^="http"]').forEach(function (t) {
              var n = t.getAttribute("href");
              if (
                n &&
                !r[n] &&
                !t.querySelector("img") &&
                -1 === n.indexOf("/api/media/") &&
                ((r[n] = !0), !e.querySelector('.forum-linkcard[href="' + CSS.escape(n) + '"]'))
              ) {
                var a = document.createElement("div");
                e.appendChild(a);
                var o = function (e) {
                  if (e && e.title) {
                    var r = (t.textContent || "").trim();
                    if (/^https?:\/\//i.test(r))
                      ((t.style.display = "none"),
                        (d = t.closest("p")) &&
                          !d.textContent.trim() &&
                          (d.style.display = "none"));
                    var o = document.createElement("a");
                    o.className = "forum-linkcard";
                    var i = e.url || n;
                    if (/^https?:\/\//i.test(i)) {
                      if (
                        ((o.href = i),
                        (o.target = "_blank"),
                        (o.rel = "noopener noreferrer"),
                        e.thumb && /^https?:\/\//i.test(e.thumb))
                      ) {
                        var l = document.createElement("img");
                        ((l.src = e.thumb),
                          (l.loading = "lazy"),
                          (l.alt = ""),
                          (l.referrerPolicy = "no-referrer"),
                          o.appendChild(l));
                      }
                      var s = document.createElement("span");
                      s.className = "forum-linkcard-tx";
                      var d,
                        c = document.createElement("span");
                      ((c.className = "forum-linkcard-t"),
                        (c.textContent = e.title),
                        ((d = document.createElement("span")).className = "forum-linkcard-p"),
                        (d.textContent = e.provider || ""),
                        s.appendChild(c),
                        s.appendChild(d),
                        o.appendChild(s),
                        a.replaceWith(o));
                    } else a.remove();
                  } else a.remove();
                };
                xe[n]
                  ? o(xe[n])
                  : y("/api/unfurl?url=" + encodeURIComponent(n))
                      .then(function (e) {
                        var t = e && e.ok ? e.embed : null;
                        ((xe[n] = t), o(t));
                      })
                      .catch(function () {
                        a.remove();
                      });
              }
            });
          });
        })());
      try {
        !(function () {
          function e(e) {
            if (!e || 1 !== e.nodeType) return null;
            if ("IMG" === e.tagName) return [e];
            if (e.classList && e.classList.contains("forum-linkcard")) return null;
            if (
              "P" !== e.tagName &&
              "DIV" !== e.tagName &&
              "FIGURE" !== e.tagName &&
              "A" !== e.tagName
            )
              return null;
            for (var t = [], r = e.childNodes, n = 0; n < r.length; n++) {
              var a = r[n];
              if (3 !== a.nodeType) {
                if (1 !== a.nodeType) return null;
                if ("IMG" !== a.tagName) {
                  if ("BR" !== a.tagName) {
                    if ("A" === a.tagName) {
                      for (var o = a.childNodes, i = null, l = 0; l < o.length; l++) {
                        var s = o[l];
                        if (3 !== s.nodeType) {
                          if (1 !== s.nodeType || "IMG" !== s.tagName || null !== i) {
                            i = !1;
                            break;
                          }
                          i = s;
                        } else if (s.textContent.trim()) {
                          i = !1;
                          break;
                        }
                      }
                      if (i) {
                        t.push(i);
                        continue;
                      }
                      return null;
                    }
                    return null;
                  }
                } else t.push(a);
              } else if (a.textContent.trim()) return null;
            }
            return t.length ? t : null;
          }
          function r(e) {
            if (!e || 1 !== e.nodeType) return !1;
            if ("P" !== e.tagName && "DIV" !== e.tagName) return !1;
            for (var t = e.childNodes, r = 0; r < t.length; r++) {
              var n = t[r];
              if (3 !== n.nodeType) {
                if (1 !== n.nodeType || "BR" !== n.tagName) return !1;
              } else if (n.textContent.trim()) return !1;
            }
            return !0;
          }
          t.querySelectorAll(".forum-post-body").forEach(function (t) {
            for (var n = Array.prototype.slice.call(t.children), a = 0; a < n.length;) {
              for (var o = [], i = []; a < n.length;) {
                var l = n[a];
                if (o.length && r(l)) (i.push(l), a++);
                else {
                  var s = e(l);
                  if (!s) break;
                  (o.push({ el: l, imgs: s }), a++);
                }
              }
              var d = 0;
              if (
                (o.forEach(function (e) {
                  d += e.imgs.length;
                }),
                d >= 2)
              ) {
                var c = document.createElement("div");
                c.className = "forum-carousel";
                var u = document.createElement("div");
                ((u.className = "forum-carousel-track"),
                  c.appendChild(u),
                  t.insertBefore(c, o[0].el),
                  o.forEach(function (e) {
                    e.imgs.forEach(function (e) {
                      var t = document.createElement("div");
                      ((t.className = "forum-carousel-slide"), t.appendChild(e), u.appendChild(t));
                    });
                  }),
                  o.forEach(function (e) {
                    -1 === e.imgs.indexOf(e.el) && e.el.remove();
                  }),
                  i.forEach(function (e) {
                    e.remove();
                  }),
                  Ee(c, u, d));
              } else a++;
            }
          });
        })();
      } catch (e) {
        window.console && console.warn("carousel", e);
      }
      ve();
      var p = t.querySelector("#forum-reply-top");
      (p && p.addEventListener("click", q),
        t.querySelectorAll("[data-replyto]").forEach(function (e) {
          e.addEventListener("click", function () {
            r.replyTo = {
              id: e.getAttribute("data-replyto"),
              name: e.getAttribute("data-replyname"),
            };
            var n = t.querySelector(".forum-replybox");
            if (n) {
              var a = n.querySelector(".forum-replying-to");
              (a ||
                (((a = document.createElement("div")).className = "forum-replying-to"),
                n.insertBefore(a, n.firstChild)),
                (a.innerHTML =
                  "Replying to <b>" +
                  w(r.replyTo.name) +
                  '</b><button type="button" id="forum-cancel-reply" aria-label="Cancel reply">×</button>'),
                a.querySelector("#forum-cancel-reply").addEventListener("click", P),
                q());
            }
          });
        }),
        t.querySelectorAll("[data-showreplies]").forEach(function (e) {
          e.addEventListener("click", function () {
            var t = e.getAttribute("data-showreplies");
            ((e.innerHTML = '<span class="forum-spinner"></span>'),
              (e.disabled = !0),
              setTimeout(function () {
                ((r.showNested[t] = !0), Ce());
              }, 350));
          });
        }),
        t.querySelectorAll("[data-hidereplies]").forEach(function (e) {
          e.addEventListener("click", function () {
            ((r.showNested[e.getAttribute("data-hidereplies")] = !1), Ce());
          });
        }));
      var x = t.querySelector("#forum-cancel-reply");
      (x && x.addEventListener("click", P),
        t.querySelectorAll("[data-star]").forEach(function (e) {
          e.addEventListener("click", function () {
            if (!e.disabled) {
              e.disabled = !0;
              var t = e.getAttribute("data-star") || null;
              y("/api/forum/thread/" + encodeURIComponent(r.threadId) + "/star", {
                method: "POST",
                body: { replyId: t },
              })
                .then(function (r) {
                  if (r.ok) {
                    (e.classList.add("given"),
                      (e.innerHTML = "★ " + r.stars),
                      O && (O.points = r.myPoints));
                    var n = document.getElementById("forum-points");
                    if ((n && (n.textContent = r.myPoints), b.thread)) {
                      var a = t
                        ? (b.thread.replies || []).find(function (e) {
                            return e.id === t;
                          })
                        : b.thread;
                      (a &&
                        ((a.stars = r.stars),
                        (a.authorPoints = r.authorPoints),
                        Array.isArray(a.starredBy) || (a.starredBy = []),
                        O && a.starredBy.push(O.username.toLowerCase())),
                        !t &&
                          b.threads &&
                          (b.threads || []).forEach(function (e) {
                            e.id === b.thread.id &&
                              ((e.stars = r.stars),
                              (e.authorPoints = r.authorPoints),
                              Array.isArray(e.starredBy) || (e.starredBy = []),
                              O &&
                                -1 === e.starredBy.indexOf(O.username.toLowerCase()) &&
                                e.starredBy.push(O.username.toLowerCase()));
                          }));
                    }
                  } else ((e.disabled = !1), alert(r.error || "Couldn't give a star"));
                })
                .catch(function () {
                  e.disabled = !1;
                });
            }
          });
        }),
        t.querySelectorAll("[data-delreply]").forEach(function (e) {
          e.addEventListener("click", function () {
            confirm("Delete this reply?") &&
              y(
                "/api/forum/thread/" +
                  encodeURIComponent(r.threadId) +
                  "/replies/" +
                  encodeURIComponent(e.getAttribute("data-delreply")),
                { method: "DELETE" },
              )
                .then(function (e) {
                  e.ok && we();
                })
                .catch(function () {
                  alert("Couldn't delete. Try again.");
                });
          });
        }),
        t.querySelectorAll("[data-editreply]").forEach(function (e) {
          e.addEventListener("click", function () {
            var t = e.getAttribute("data-editreply"),
              n = e.closest("article"),
              a = n ? n.querySelector(".forum-post-body") : null;
            if (a && !a.querySelector("textarea") && !a.querySelector(".forum-editor")) {
              var o = null;
              if (b.thread && b.thread.replies)
                for (var i = 0; i < b.thread.replies.length; i++)
                  if (b.thread.replies[i].id === t) {
                    o = b.thread.replies[i];
                    break;
                  }
              var l = !(!o || !o.rich),
                s = a.innerHTML,
                d = a.textContent || "";
              if (((a.innerHTML = ""), l)) {
                var c = document.createElement("div");
                ((c.className = "forum-editor"),
                  (c.innerHTML =
                    re({ embed: !0, member: j(), lock: !1 }) +
                    '<div class="forum-editor-mount"></div>'),
                  a.appendChild(c),
                  ((f = document.createElement("div")).style.cssText =
                    "display:flex;gap:8px;margin-top:8px;"),
                  ((m = document.createElement("button")).type = "button"),
                  (m.className = "forum-admin-btn"),
                  (m.textContent = "Save"),
                  ((p = document.createElement("button")).type = "button"),
                  (p.className = "forum-admin-btn"),
                  (p.textContent = "Cancel"),
                  f.appendChild(m),
                  f.appendChild(p),
                  a.appendChild(f));
                var u = null;
                (he(c, "Edit reply…", s).then(function (e) {
                  u = e;
                }),
                  p.addEventListener("click", function () {
                    we();
                  }),
                  m.addEventListener("click", function () {
                    if (u && !u.isEmpty) {
                      var e = u.getHTML();
                      ((m.disabled = !0),
                        y(
                          "/api/forum/thread/" +
                            encodeURIComponent(r.threadId) +
                            "/replies/" +
                            encodeURIComponent(t),
                          { method: "PUT", body: { content: e, rich: !0 } },
                        )
                          .then(function (e) {
                            e && e.ok
                              ? we()
                              : (alert("Couldn't save. Try again."), (m.disabled = !1));
                          })
                          .catch(function () {
                            (alert("Couldn't save. Try again."), (m.disabled = !1));
                          }));
                    } else alert("Reply cannot be empty.");
                  }));
              } else {
                var f,
                  m,
                  p,
                  h = document.createElement("textarea");
                ((h.value = d.trim()),
                  (h.style.cssText =
                    "width:100%;min-height:80px;padding:8px;border-radius:8px;border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;font:inherit;resize:vertical;"),
                  ((f = document.createElement("div")).style.cssText =
                    "display:flex;gap:8px;margin-top:8px;"),
                  ((m = document.createElement("button")).type = "button"),
                  (m.className = "forum-admin-btn"),
                  (m.textContent = "Save"),
                  ((p = document.createElement("button")).type = "button"),
                  (p.className = "forum-admin-btn"),
                  (p.textContent = "Cancel"),
                  f.appendChild(m),
                  f.appendChild(p),
                  a.appendChild(h),
                  a.appendChild(f),
                  h.focus(),
                  p.addEventListener("click", function () {
                    we();
                  }),
                  m.addEventListener("click", function () {
                    var e = h.value.trim();
                    e &&
                      ((m.disabled = !0),
                      y(
                        "/api/forum/thread/" +
                          encodeURIComponent(r.threadId) +
                          "/replies/" +
                          encodeURIComponent(t),
                        { method: "PUT", body: { content: e } },
                      )
                        .then(function (e) {
                          e && e.ok
                            ? we()
                            : (alert("Couldn't save. Try again."), (m.disabled = !1));
                        })
                        .catch(function () {
                          (alert("Couldn't save. Try again."), (m.disabled = !1));
                        }));
                  }));
              }
            }
          });
        }),
        t.querySelectorAll("[data-pin]").forEach(function (e) {
          e.addEventListener("click", function () {
            var t = e.getAttribute("data-pin");
            y("/api/forum/thread/" + encodeURIComponent(t) + "/pin", { method: "POST" })
              .then(function (e) {
                if (e.ok) {
                  var r = !(void 0 !== e.pinned && !e.pinned);
                  (b.thread && b.thread.id === t && (b.thread.pinned = r),
                    (b.threads || []).forEach(function (e) {
                      e.id === t && (e.pinned = r);
                    }),
                    we());
                }
              })
              .catch(function () {
                alert("Couldn't pin. Try again.");
              });
          });
        }),
        t.querySelectorAll("[data-del]").forEach(function (e) {
          e.addEventListener("click", function () {
            confirm("Delete this thread and all its replies?") &&
              y("/api/forum/thread/" + encodeURIComponent(e.getAttribute("data-del")), {
                method: "DELETE",
              })
                .then(function (e) {
                  e.ok && Re();
                })
                .catch(function () {
                  alert("Couldn't delete. Try again.");
                });
          });
        }));
      var C = t.querySelector("#forum-edit-btn");
      (C &&
        C.addEventListener("click", function () {
          !(function () {
            if ((X(), Y)) {
              try {
                Y.destroy();
              } catch (e) {}
              Y = null;
            }
            var n = b.thread;
            if (!n) return void ye();
            ((r.name = "edit"), (Q = n.thumb || null), (Me = { tags: (n.tags || []).slice() }));
            var a =
              be() +
              '<div class="forum-head"><button type="button" class="forum-back forum-glass-pill" id="forum-edit-back">← Back</button><h2 class="forum-title">Edit post</h2></div>';
            ((a +=
              '<div class="forum-form"><label class="chat-field"><span>Category</span><select id="forum-edit-cat">'),
              b.categories.forEach(function (e) {
                e.locked ||
                  (a +=
                    '<option value="' +
                    w(e.id) +
                    '"' +
                    (n.category === e.id ? " selected" : "") +
                    ">" +
                    w(e.name) +
                    (e.membersOnly ? " ⭐" : "") +
                    "</option>");
              }),
              (a +=
                '</select></label><label class="chat-field"><span>Title</span><input type="text" id="forum-edit-title" maxlength="120" value="' +
                w(n.title) +
                '"></label><div class="forum-field-wrap"><span class="forum-content-label">Tags <span class="forum-optional">(optional, max 5)</span></span>' +
                qe("forum-edit") +
                '</div><div class="forum-field-wrap"><span class="forum-content-label">Content</span><div class="forum-editor" id="forum-edit-editor">' +
                re({ embed: !0, member: j(), lock: !0 }) +
                '<div class="forum-editor-mount"></div></div></div><div class="forum-field-wrap"><span class="forum-content-label">Thumbnail <span class="forum-optional">(optional)</span></span><div class="forum-thumb-row"><span class="forum-thumb-preview" id="forum-ethumb-preview">' +
                (n.thumb ? '<img src="' + e + "/api/media/" + w(n.thumb) + '" alt="">' : "") +
                '</span><button type="button" class="forum-admin-btn" id="forum-ethumb-add">' +
                (n.thumb ? "Change thumbnail" : "Add thumbnail") +
                '</button><button type="button" class="forum-admin-btn forum-admin-del' +
                (n.thumb ? "" : " hidden") +
                '" id="forum-ethumb-remove">Remove</button><input type="file" id="forum-ethumb-input" accept="image/*" class="hidden"></div></div><div class="forum-field-wrap"><span class="forum-content-label">Poll <span class="forum-optional">(optional)</span></span><div class="forum-thumb-row"><button type="button" class="forum-admin-btn" id="forum-epoll-toggle">' +
                (n.poll ? "Edit poll" : "Add poll") +
                '</button><button type="button" class="forum-admin-btn forum-admin-del' +
                (n.poll ? "" : " hidden") +
                '" id="forum-epoll-remove">Remove poll</button></div><div id="forum-epoll-form" class="hidden" style="margin-top:10px;"><input type="text" id="forum-epoll-q" maxlength="200" placeholder="Poll question" class="forum-poll-input" value="' +
                w(n.poll ? n.poll.question : "") +
                '"><div id="forum-epoll-opts"></div><button type="button" class="forum-admin-btn" id="forum-epoll-add-opt">+ Add option</button></div></div><div class="forum-edit-actions"><button type="button" class="btn" id="forum-edit-cancel">Cancel</button><button type="button" class="btn accent" id="forum-edit-save">Save changes</button></div></div>'),
              (t.innerHTML = a),
              window.scrollTo(0, 0),
              window.MPScroll && MPScroll.pinTop(1500));
            (R(), B());
            try {
              H();
            } catch (e) {}
            Pe("forum-edit", Me);
            var o = function () {
              ((r.name = "thread"), we());
            };
            (t.querySelector("#forum-edit-back").addEventListener("click", o),
              t.querySelector("#forum-edit-cancel").addEventListener("click", o));
            var i = t.querySelector("#forum-edit-editor");
            if (i) {
              var l = (function (e) {
                var t = [];
                try {
                  var r = new DOMParser().parseFromString(String(e || ""), "text/html");
                  (r.querySelectorAll("iframe").forEach(function (e) {
                    var r = e.getAttribute("src") || "";
                    (r && t.length < 2 && t.push({ src: r }),
                      ((e.closest && e.closest(".forum-embed")) || e).remove());
                  }),
                    (e = r.body.innerHTML));
                } catch (e) {}
                return { html: e, embeds: t };
              })(
                n.rich
                  ? n.content
                  : ((s = n.content),
                    String(s || "")
                      .split(/\n\s*\n/)
                      .map(function (e) {
                        return "<p>" + w(e).replace(/\n/g, "<br>") + "</p>";
                      })
                      .join("")),
              );
              ((i._postEmbeds = l.embeds),
                le(i),
                he(i, "Edit your post…", l.html).then(function (e) {
                  if (e) K = e;
                  else {
                    var t = document.createElement("div");
                    ((t.innerHTML =
                      '<textarea id="forum-edit-content" rows="6" maxlength="5000">' +
                      w(n.rich ? String(n.content).replace(/<[^>]*>/g, " ") : n.content) +
                      "</textarea>"),
                      i.replaceWith(t.firstChild));
                  }
                }));
            }
            var s;
            var d = t.querySelector("#forum-ethumb-input"),
              c = t.querySelector("#forum-ethumb-preview"),
              u = t.querySelector("#forum-ethumb-add"),
              f = t.querySelector("#forum-ethumb-remove");
            u &&
              u.addEventListener("click", function () {
                d && d.click();
              });
            f &&
              f.addEventListener("click", function () {
                ((Q = null),
                  c && (c.innerHTML = ""),
                  f.classList.add("hidden"),
                  u && (u.textContent = "Add thumbnail"));
              });
            d &&
              d.addEventListener("change", function () {
                var t = d.files && d.files[0];
                t &&
                  (u && ((u.disabled = !0), (u.textContent = "Uploading…")),
                  ue(t)
                    .then(function (e) {
                      return y("/api/media", {
                        method: "POST",
                        body: { dataUrl: e, kind: "image" },
                      });
                    })
                    .then(function (t) {
                      (u && ((u.disabled = !1), (u.textContent = "Change thumbnail")),
                        t && t.ok && t.id
                          ? ((Q = t.id),
                            c &&
                              (c.innerHTML = '<img src="' + e + "/api/media/" + t.id + '" alt="">'),
                            f && f.classList.remove("hidden"))
                          : alert("Thumbnail upload failed"));
                    })
                    .catch(function (x) {
                      (u && ((u.disabled = !1), (u.textContent = "Change thumbnail")),
                        (x && "gif too big" === x.message) || alert("Thumbnail upload failed"));
                    }));
              });
            var m = t.querySelector("#forum-epoll-form"),
              p = t.querySelector("#forum-epoll-opts"),
              h = t.querySelector("#forum-epoll-toggle"),
              v = t.querySelector("#forum-epoll-remove"),
              g = !1;
            function k(e) {
              var t = document.createElement("div");
              ((t.style.cssText = "display:flex;gap:8px;margin-bottom:8px;"),
                (t.innerHTML =
                  '<input type="text" maxlength="80" placeholder="Option" class="forum-poll-input" style="flex:1;" value="' +
                  w(e || "") +
                  '"><button type="button" class="forum-admin-btn forum-admin-del" style="width:26px;height:26px;padding:0;display:inline-grid;place-items:center;border:1px solid rgba(255,60,60,.4);font-size:16px;line-height:1;">×</button>'),
                t.querySelector("button").addEventListener("click", function () {
                  t.remove();
                }),
                p.appendChild(t));
            }
            n.poll &&
              n.poll.options &&
              n.poll.options.forEach(function (e) {
                k(e.text);
              });
            h &&
              h.addEventListener("click", function () {
                (m.classList.toggle("hidden"),
                  (h.textContent = m.classList.contains("hidden")
                    ? n.poll
                      ? "Edit poll"
                      : "Add poll"
                    : "Hide poll"));
              });
            var E = t.querySelector("#forum-epoll-add-opt");
            E &&
              E.addEventListener("click", function () {
                k("");
              });
            v &&
              v.addEventListener("click", function () {
                confirm("Remove this poll? Votes will be lost.") &&
                  ((g = !0),
                  m.classList.add("hidden"),
                  v.classList.add("hidden"),
                  (h.textContent = "Add poll"));
              });
            t.querySelector("#forum-edit-save").addEventListener("click", function () {
              var e = t.querySelector("#forum-edit-title").value.trim(),
                a = "",
                o = !1;
              if (K) K.isEmpty || ((a = oe(K.getHTML(), i._postEmbeds)), (o = !0));
              else {
                var l = t.querySelector("#forum-edit-content");
                a = l ? l.value.trim() : "";
              }
              if (e && a) {
                var s = void 0;
                if (g) s = null;
                else if (m && !m.classList.contains("hidden")) {
                  var d = t.querySelector("#forum-epoll-q"),
                    c = d ? d.value.trim() : "",
                    u = [];
                  if (
                    (p.querySelectorAll("input").forEach(function (e) {
                      var t = e.value.trim();
                      t && u.push(t);
                    }),
                    c && u.length >= 2)
                  ) {
                    var f = { question: c, options: u },
                      h = n.poll ? n.poll.question : "",
                      v =
                        n.poll && n.poll.options
                          ? n.poll.options.map(function (e) {
                              return "string" == typeof e ? e : e.text;
                            })
                          : [],
                      b = c === h,
                      w =
                        u.length === v.length &&
                        u.every(function (e, t) {
                          return e === v[t];
                        });
                    (b && w) || (s = f);
                  } else if (c || u.length > 0)
                    return void alert("Poll needs a question and at least 2 options");
                }
                var k = t.querySelector("#forum-edit-cat"),
                  E = { title: e, content: a, rich: o, thumb: Q, tags: Me.tags };
                (k && (E.category = k.value),
                  void 0 !== s && (E.poll = s),
                  y("/api/forum/thread/" + encodeURIComponent(n.id), {
                    method: "PUT",
                    body: E,
                  }).then(function (e) {
                    e.ok ? (X(), (r.name = "thread"), we()) : alert(e.error || "Failed to save");
                  }));
              } else alert("Title and content required");
            });
          })();
        }),
        t.querySelectorAll("[data-tag]").forEach(function (e) {
          e.addEventListener("click", function () {
            h(e.getAttribute("data-tag"));
          });
        }),
        t.querySelectorAll("[data-tagmore]").forEach(function (e) {
          e.addEventListener("click", function () {
            ((c[e.getAttribute("data-tagmore")] = !0), Ce());
          });
        }));
      var T = t.querySelector("#forum-send");
      T &&
        T.addEventListener("click", function () {
          var e = "",
            n = !1;
          if (Y) {
            if (Y.isEmpty) return;
            try {
              var a = t.querySelector("#forum-reply-editor .forum-editor-mount");
              e = oe(Y.getHTML(), a ? a._postEmbeds : []);
            } catch (e) {
              return void alert("Failed to get content: " + e.message);
            }
            n = !0;
          } else {
            var o = t.querySelector("#forum-reply");
            if (!(e = o ? o.value.trim() : "")) return;
          }
          T.disabled = !0;
          var i = T.innerHTML;
          T.innerHTML = '<span class="forum-spinner"></span>';
          var l = { content: e, rich: n };
          (r.replyTo && (l.parentId = r.replyTo.id),
            y("/api/forum/thread/" + encodeURIComponent(r.threadId) + "/replies", {
              method: "POST",
              body: l,
            })
              .then(function (e) {
                e.ok
                  ? (r.replyTo && (r.showNested[r.replyTo.id] = !0), (r.replyTo = null), we())
                  : ((T.disabled = !1), (T.innerHTML = i), alert(e.error || "Failed"));
              })
              .catch(function (e) {
                ((T.disabled = !1),
                  (T.innerHTML = i),
                  alert("Failed to post reply. Check your connection."));
              }));
        });
    }
    function M(e, t) {
      var n = s[e.id] || [],
        a = !!r.showNested[e.id],
        o =
          '<article class="forum-post' +
          (t > 0 ? " forum-nested" : "") +
          '"><div class="forum-post-head">' +
          E(e, !0) +
          '<span class="forum-post-time">' +
          k(e.createdAt) +
          '</span></div><div class="forum-post-body">' +
          G(e) +
          "</div>" +
          (g() || Ne
            ? '<div class="forum-admin forum-admin-thread forum-reply-actions">' +
              (g()
                ? '<button type="button" class="forum-admin-btn" data-replyto="' +
                  w(e.id) +
                  '" data-replyname="' +
                  w(mpName(e.author)) +
                  '">Reply</button>'
                : "") +
              A(e, e.id) +
              (Ne
                ? '<button type="button" class="forum-admin-btn forum-admin-del" data-delreply="' +
                  w(e.id) +
                  '">Delete</button>'
                : He(e.author)
                  ? '<button type="button" class="forum-admin-btn" data-editreply="' +
                    w(e.id) +
                    '">Edit</button><button type="button" class="forum-admin-btn forum-admin-del" data-delreply="' +
                    w(e.id) +
                    '">Delete</button>'
                  : "") +
              "</div>"
            : "");
      if (((o += "</article>"), n.length && t >= 10))
        n.forEach(function (e) {
          o += M(e, t);
        });
      else if (n.length) {
        var i = a ? n : n.slice(0, 1);
        ((o += '<div class="forum-thread-tail"><div class="forum-children">'),
          i.forEach(function (e) {
            o += M(e, t + 1);
          }),
          (o += "</div>"),
          !a && n.length > 1
            ? (o +=
                '<button type="button" class="forum-show-replies" data-showreplies="' +
                w(e.id) +
                '">Show more replies (' +
                (n.length - 1) +
                " more)</button>")
            : a &&
              (o +=
                '<button type="button" class="forum-show-replies" data-hidereplies="' +
                w(e.id) +
                '">Hide replies</button>'),
          (o += "</div>"));
      }
      return o;
    }
    function q() {
      var e = t.querySelector(".forum-replybox");
      (e && e.scrollIntoView({ behavior: "smooth", block: "center" }),
        setTimeout(function () {
          if (Y) Y.commands.focus();
          else {
            var e = t.querySelector("#forum-reply");
            e && e.focus();
          }
        }, 350));
    }
    function P() {
      r.replyTo = null;
      var e = t.querySelector(".forum-replybox");
      if (e) {
        var n = e.querySelector(".forum-replying-to");
        n && n.remove();
      }
    }
  }
  function Ee(e, t, r) {
    var n = 0,
      a = document.createElement("span");
    function o(e, t, r) {
      var n = document.createElement("button");
      return (
        (n.type = "button"),
        (n.className = "car-btn " + e),
        n.setAttribute("aria-label", t),
        (n.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="' +
          r +
          '"/></svg>'),
        n
      );
    }
    ((a.className = "forum-carousel-count"), e.appendChild(a));
    var i = o("prev", "Previous image", "M14.5 5.5L8 12l6.5 6.5"),
      l = o("next", "Next image", "M9.5 5.5L16 12l-6.5 6.5"),
      s = document.createElement("div");
    s.className = "car-dots";
    for (var d = 0; d < r; d++)
      (function (e) {
        var t = document.createElement("span");
        (t.addEventListener("click", function () {
          c(e);
        }),
          s.appendChild(t));
      })(d);
    function c(e) {
      ((n = Math.max(0, Math.min(r - 1, e))),
        (t.style.transform = "translateX(-" + 100 * n + "%)"),
        (a.textContent = n + 1 + " / " + r),
        (i.disabled = 0 === n),
        (l.disabled = n === r - 1),
        Array.prototype.forEach.call(s.children, function (e, t) {
          e.classList.toggle("on", t === n);
        }));
    }
    (e.appendChild(i),
      e.appendChild(l),
      e.appendChild(s),
      i.addEventListener("click", function () {
        c(n - 1);
      }),
      l.addEventListener("click", function () {
        c(n + 1);
      }));
    var u = null;
    (e.addEventListener(
      "touchstart",
      function (e) {
        1 === e.touches.length && (u = e.touches[0].clientX);
      },
      { passive: !0 },
    ),
      e.addEventListener(
        "touchend",
        function (e) {
          if (null !== u) {
            var t = e.changedTouches[0].clientX - u;
            ((u = null), t < -40 ? c(n + 1) : t > 40 && c(n - 1));
          }
        },
        { passive: !0 },
      ),
      c(0));
  }
  window.MPSigEditor = {
    mount: function (e, t) {
      if (
        ((t = t || {}),
        (e.innerHTML = re({ member: !!t.member }) + '<div class="forum-editor-mount"></div>'),
        !t.member)
      ) {
        var r = e.querySelector('[data-act="image"]');
        r && r.remove();
      }
      return he(e, t.placeholder || "Your signature…", t.html || "");
    },
  };
  var xe = {};
  var Le = null;
  function Se() {
    var e = (function () {
      if (Le) return Le;
      var e = document.getElementById("forum");
      if (!e) return null;
      var t = document.createElement("button");
      return (
        (t.type = "button"),
        (t.className = "forum-topbtn"),
        t.setAttribute("aria-label", "Back to top"),
        (t.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" data-hi="float"><path d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"/></svg>'),
        t.addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }),
        e.appendChild(t),
        (Le = t),
        window.addEventListener("scroll", Se, { passive: !0 }),
        t
      );
    })();
    if (e) {
      var t = ("thread" === r.name || "list" === r.name) && window.scrollY > 500;
      e.classList.toggle("show", t);
    }
  }
  function Ce() {
    var e = window.scrollY;
    (ke(), window.scrollTo(0, e));
  }
  function Ae(skipSmooth) {
    if (!skipSmooth && r.name === "new") {
      closeComposerSmooth();
      return;
    }
    ((r.name = "list"),
      (r.threadId = null),
      (v = null),
      (r.replyTo = null),
      (r.showNested = {}),
      window.scrollTo(0, 0),
      window.MPScroll && MPScroll.pinTop(1500),
      Be());
  }
  var Te = { tags: [] },
    Me = { tags: [] };
  function qe(e) {
    return (
      '<div class="forum-tag-editor"><div class="forum-tag-pills" id="' +
      e +
      '-tag-pills"></div><input type="text" class="forum-tag-input" id="' +
      e +
      '-tag-input" placeholder="Add a tag and press enter" maxlength="24" autocomplete="off" autocapitalize="none"><div class="forum-tag-suggest hidden" id="' +
      e +
      '-tag-suggest"></div></div>'
    );
  }
  function Pe(e, r) {
    var n = t.querySelector("#" + e + "-tag-pills"),
      a = t.querySelector("#" + e + "-tag-input"),
      o = t.querySelector("#" + e + "-tag-suggest");
    function i() {
      ((n.innerHTML = r.tags
        .map(function (e, t) {
          return (
            '<span class="forum-tag chosen">#' +
            w(e) +
            '<button type="button" class="forum-tag-x" data-untag="' +
            t +
            '" aria-label="Remove tag">×</button></span>'
          );
        })
        .join("")),
        n.querySelectorAll("[data-untag]").forEach(function (e) {
          e.addEventListener("click", function () {
            (r.tags.splice(parseInt(e.getAttribute("data-untag"), 10), 1), i());
          });
        }),
        (a.style.display = r.tags.length >= 5 ? "none" : ""));
    }
    function l() {
      o && (o.classList.add("hidden"), (o.innerHTML = ""));
    }
    function s(e) {
      var t = f(e);
      t &&
        (r.tags.length >= 5
          ? alert("Max 5 tags")
          : (-1 === r.tags.indexOf(t) && r.tags.push(t), (a.value = ""), l(), i()));
    }
    n &&
      a &&
      (a.addEventListener("keydown", function (e) {
        "Enter" === e.key || "," === e.key
          ? (e.preventDefault(), s(a.value))
          : "Backspace" === e.key && !a.value && r.tags.length && (r.tags.pop(), i());
      }),
      a.addEventListener("input", function () {
        if (o) {
          var e = f(a.value);
          if (e && u) {
            var t = u
              .filter(function (t) {
                return 0 === t.indexOf(e) && -1 === r.tags.indexOf(t);
              })
              .slice(0, 6);
            t.length
              ? ((o.innerHTML = t
                  .map(function (e) {
                    return (
                      '<button type="button" class="forum-tag-sug" data-sug="' +
                      w(e) +
                      '">#' +
                      w(e) +
                      "</button>"
                    );
                  })
                  .join("")),
                o.classList.remove("hidden"),
                o.querySelectorAll("[data-sug]").forEach(function (e) {
                  e.addEventListener("mousedown", function (t) {
                    (t.preventDefault(), s(e.getAttribute("data-sug")));
                  });
                }))
              : l();
          } else l();
        }
      }),
      a.addEventListener("blur", function () {
        setTimeout(l, 150);
      }),
      u ||
        y("/api/forum/tags")
          .then(function (e) {
            e &&
              e.ok &&
              (u = e.tags.map(function (e) {
                return e.name;
              }));
          })
          .catch(function () {}),
      i());
  }
  function Ie() {
    killPullToPost();
    X();
    var n =
      be() +
      '<div class="forum-head"><button type="button" class="forum-back forum-glass-pill" id="forum-back">← Back</button><h2 class="forum-title forum-title-end">New thread</h2></div>';
    ((n +=
      '<div class="forum-form"><label class="chat-field"><span>Category</span><select id="forum-cat-sel">'),
      b.categories.forEach(function (e) {
        e.locked ||
          (n +=
            '<option value="' +
            w(e.id) +
            '"' +
            (r.category === e.id ? " selected" : "") +
            ">" +
            w(e.name) +
            (e.membersOnly ? " ⭐" : "") +
            "</option>");
      }),
      (n +=
        '</select></label><label class="chat-field"><span>Title</span><input type="text" id="forum-title" maxlength="120" placeholder="What’s this about?"></label><div class="forum-field-wrap"><span class="forum-content-label">Tags <span class="forum-optional">(optional, max 5)</span></span>' +
        qe("forum-new") +
        '</div><div class="forum-field-wrap"><span class="forum-content-label">Content</span><div class="forum-editor" id="forum-new-editor">' +
        re({ embed: !0, member: j(), lock: !0 }) +
        '<div class="forum-editor-mount"></div></div></div><div class="forum-field-wrap"><span class="forum-content-label">Thumbnail <span class="forum-optional">(optional)</span></span><div class="forum-thumb-row"><span class="forum-thumb-preview" id="forum-thumb-preview"></span><button type="button" class="forum-admin-btn" id="forum-thumb-add">Add thumbnail</button><button type="button" class="forum-admin-btn forum-admin-del hidden" id="forum-thumb-remove">Remove</button><input type="file" id="forum-thumb-input" accept="image/*" class="hidden"></div></div><div class="forum-field-wrap"><span class="forum-content-label">Poll <span class="forum-optional">(optional)</span></span><button type="button" class="forum-admin-btn" id="forum-poll-toggle">Add poll</button><div id="forum-poll-form" class="hidden" style="margin-top:10px;"><input type="text" id="forum-poll-q" maxlength="200" placeholder="Poll question" class="forum-poll-input"><div id="forum-poll-opts"></div><button type="button" class="forum-admin-btn" id="forum-poll-add-opt">+ Add option</button></div></div><button type="button" class="btn accent" id="forum-post">Post thread</button></div>'),
      (t.innerHTML = n),
      window.scrollTo(0, 0),
      window.MPScroll && MPScroll.pinTop(2e3),
      R(),
      B());
    try {
      H();
    } catch (e) {}
    var a = t.querySelector("#forum-new-top");
    (a &&
      a.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }),
      t.querySelector("#forum-back").addEventListener("click", Ae));
    var o = t.querySelector("#forum-new-editor");
    if ((o && le(o), o)) {
      if (Z) {
        try {
          Z.destroy();
        } catch (e) {}
        Z = null;
      }
      he(o, "Say it…").then(function (e) {
        if (e) Z = e;
        else {
          var t = document.createElement("div");
          ((t.innerHTML =
            '<textarea id="forum-content" rows="6" maxlength="5000" placeholder="Say it…"></textarea>'),
            o.replaceWith(t.firstChild));
        }
      });
    }
    ((ce = null), Pe("forum-new", (Te = { tags: [] })));
    var i = t.querySelector("#forum-thumb-input"),
      l = t.querySelector("#forum-thumb-preview"),
      s = t.querySelector("#forum-thumb-add"),
      d = t.querySelector("#forum-thumb-remove");
    (s &&
      s.addEventListener("click", function () {
        i && i.click();
      }),
      d &&
        d.addEventListener("click", function () {
          ((ce = null),
            l && (l.innerHTML = ""),
            d.classList.add("hidden"),
            s && (s.textContent = "Add thumbnail"));
        }),
      i &&
        i.addEventListener("change", function () {
          var t = i.files && i.files[0];
          t &&
            (s && ((s.disabled = !0), (s.textContent = "Uploading…")),
            ue(t)
              .then(function (e) {
                return y("/api/media", { method: "POST", body: { dataUrl: e, kind: "image" } });
              })
              .then(function (t) {
                (s && ((s.disabled = !1), (s.textContent = "Change thumbnail")),
                  t && t.ok && t.id
                    ? ((ce = t.id),
                      l && (l.innerHTML = '<img src="' + e + "/api/media/" + t.id + '" alt="">'),
                      d && d.classList.remove("hidden"))
                    : alert("Thumbnail upload failed"));
              })
              .catch(function (x) {
                (s && ((s.disabled = !1), (s.textContent = "Add thumbnail")),
                  (x && "gif too big" === x.message) || alert("Thumbnail upload failed"));
              }));
        }));
    var c = t.querySelector("#forum-poll-toggle"),
      u = t.querySelector("#forum-poll-form"),
      f = t.querySelector("#forum-poll-opts");
    function m(e) {
      if (!(f.children.length >= 6)) {
        var t = document.createElement("input");
        ((t.type = "text"),
          (t.maxLength = 80),
          (t.placeholder = "Option " + (f.children.length + 1)),
          (t.value = e || ""),
          (t.className = "forum-poll-input"),
          f.appendChild(t));
      }
    }
    c &&
      c.addEventListener("click", function () {
        (u.classList.toggle("hidden"),
          u.classList.contains("hidden") || 0 !== f.children.length || (m(), m()),
          (c.textContent = u.classList.contains("hidden") ? "Add poll" : "Remove poll"));
      });
    var p = t.querySelector("#forum-poll-add-opt");
    p &&
      p.addEventListener("click", function () {
        m();
      });
    var h = t.querySelector("#forum-post");
    h.addEventListener("click", function () {
      h.disabled = !0;
      var e = t.querySelector("#forum-title").value.trim(),
        n = "",
        a = !1;
      if (Z) Z.isEmpty || ((n = oe(Z.getHTML(), o._postEmbeds)), (a = !0));
      else {
        var i = t.querySelector("#forum-content");
        n = i ? i.value.trim() : "";
      }
      var l = t.querySelector("#forum-cat-sel").value;
      if (!e || !n) return (alert("Title and content required"), void (h.disabled = !1));
      var s = null,
        d = t.querySelector("#forum-poll-q");
      if (d && !t.querySelector("#forum-poll-form").classList.contains("hidden")) {
        var c = d.value.trim(),
          u = [];
        (f.querySelectorAll("input").forEach(function (e) {
          var t = e.value.trim();
          t && u.push(t);
        }),
          c && u.length >= 2 && (s = { question: c, options: u }));
      }
      y("/api/forum/threads", {
        method: "POST",
        body: {
          title: e,
          content: n,
          category: l,
          rich: a,
          thumb: ce || void 0,
          tags: Te.tags,
          poll: s,
        },
      })
        .then(function (e) {
          e.ok && e.thread
            ? ((r.name = "thread"), (r.threadId = e.thread.id), we())
            : ((h.disabled = !1), alert(e.error || "Failed"));
        })
        .catch(function () {
          ((h.disabled = !1), alert("Failed to post thread. Check your connection."));
        });
    });
  }
  /* Comment bubble glyph: K3 body + half-extent stem (tighter iMessage curl) per dc. Before/after: misery-notes/screenshots/comment-icon-stem.png. */
  window.MPForum = window.MPForum || {};
  window.MPForum.setCards = function (v) {
    v = String(v || "g1").toLowerCase();
    -1 === ["g1", "g2", "g3"].indexOf(v) && (v = "g1");
    try {
      localStorage.setItem("mp-gcards", v);
    } catch (e) {}
    document.documentElement.setAttribute("data-gcards", v);
  };
  /* Pin style is the vertical rail only — setPin ignored (kept for console compat). */
  window.MPForum.setPin = function () {
    try {
      localStorage.removeItem("mp-gpin");
    } catch (e) {}
    document.documentElement.removeAttribute("data-gpin");
  };
  var Ne = !1;
  function He(e) {
    return (
      !!Ne ||
      (!(!O || !O.username) && String(e || "").toLowerCase() === String(O.username).toLowerCase())
    );
  }
  /* Loading skeleton + error states (audit fixes per dc). The skeleton reuses
   * the real header/chip/search/card classes so nothing jumps when the data
   * lands; the error states keep the Globe header and offer Retry / Back. */
  function mpWireHead() {
    try {
      (ve(), R(), H());
    } catch (e) {}
  }
  function mpSkel(thread) {
    if (!t) return;
    var i,
      line = function (w, h) {
        return '<span class="forum-skel-line" style="width:' + w + "%" + (h ? ";height:" + h + "px" : "") + '"></span>';
      },
      card = function (lines) {
        return (
          '<div class="forum-thread-row forum-skel-row"><div class="forum-thread"><span class="forum-thread-main">' +
          line(58, 15) +
          '<span class="forum-skel-pill"></span>' +
          line(34, 10) +
          lines +
          '</span></div><div class="forum-admin"><span class="forum-tag forum-skel-tag"></span><span class="forum-tag forum-skel-tag"></span></div></div>'
        );
      },
      u = '<div class="forum-anim forum-skel" aria-busy="true">' + be();
    if (thread)
      u +=
        '<div class="forum-head" aria-hidden="true"><span class="forum-back forum-glass-pill forum-skel-ghost">← Back</span></div><div class="forum-threads" role="status" aria-label="Loading thread">' +
        card(line(92) + line(86) + line(64) + '<span class="forum-skel-media"></span>') +
        "</div>";
    else {
      u += '<div class="forum-cats at-start at-end" aria-hidden="true"><span class="forum-cat on">All</span>';
      for (i = 0; i < 5; i++) u += '<span class="forum-cat forum-skel-chip">&nbsp;</span>';
      u +=
        '</div><div class="forum-search" aria-hidden="true"><svg width="16" height="16" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-hi="scale"><path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg><span class="forum-search-input forum-skel-ph">Search all threads</span></div><div class="forum-threads" role="status" aria-label="Loading threads">';
      for (i = 0; i < 3; i++) u += card(line(52) + line(48) + line(40));
      u += "</div>";
    }
    ((t.innerHTML = u + "</div>"), mpWireHead());
  }
  function mpState(msg, retry, back) {
    if (!t) return;
    ((t.innerHTML =
      '<div class="forum-anim">' +
      be() +
      '<div class="forum-state" role="alert"><div class="forum-state-title">' +
      w(msg) +
      '</div><div class="forum-state-actions">' +
      (retry ? '<button type="button" class="btn forum-state-btn" data-state="retry">Retry</button>' : "") +
      (back ? '<button type="button" class="btn forum-state-btn" data-state="back">Back to Globe</button>' : "") +
      "</div></div></div>"),
      mpWireHead());
    var a = t.querySelector('[data-state="retry"]'),
      o = t.querySelector('[data-state="back"]');
    (a &&
      a.addEventListener("click", function () {
        ((a.disabled = !0), retry());
      }),
      o && o.addEventListener("click", Re));
  }
  function Be() {
    /* Dashboard "Globe views": one anonymous counter hit per browser session
       (no user, IP or path sent). Older Workers answer 400; harmless. */
    try {
      sessionStorage.getItem("mp-gv") ||
        (sessionStorage.setItem("mp-gv", "1"), (function(t){try{var b=JSON.stringify({type:t});navigator.sendBeacon?navigator.sendBeacon("https://api.misereperdue.com/api/analytics",new Blob([b],{type:"text/plain"})):fetch("https://api.misereperdue.com/api/analytics",{method:"POST",body:b,keepalive:!0}).catch(function(){})}catch(e){}})("globe_view"));
    } catch (e) {}
    (t = document.getElementById("forum-root")) &&
      (g() &&
        y("/api/me")
          .then(function (e) {
            if (e && e.user) {
              ((O = e.user), (Ne = !!e.user.owner), window.mpHide && mpHide.setViewer(O.username));
              var n = document.getElementById("forum-points");
              n && (n.textContent = O.points || 0);
              var a = t && t.querySelector("#forum-me");
              if (a && !a.innerHTML.trim() && window.MPChat && window.MPChat.avatarNode) {
                var o = window.MPChat.avatarNode(O.username, O.avatar, "sm", O.avatarV || 0);
                a.innerHTML = o.outerHTML;
              }
              "thread" === r.name && r.threadId && b.thread && we();
            }
          })
          .catch(function () {}),
      (b.threads.length || b.categories.length
        ? "list" === r.name
          ? (ye(), (s = "list"), (d = ""))
          : "thread" === r.name && r.threadId && (we(), (s = "thread"), (d = r.threadId))
        : "list" === r.name
          ? mpSkel(!1)
          : "thread" === r.name && r.threadId && mpSkel(!0)),
      y("/api/forum/categories")
        .then(function (e) {
          return ((b.categories = (e.ok && e.categories) || []), y("/api/forum/threads"));
        })
        .then(function (e) {
          var t = (e.ok && e.threads) || [];
          function n(e) {
            return [
              e.id,
              e.title,
              e.category,
              (e.tags || []).join(","),
              e.thumb || "",
              !!e.pinned,
              e.lastActivity || "",
              void 0 !== e.replyCount ? e.replyCount : "",
            ].join("|");
          }
          var a =
              t.length === b.threads.length &&
              t.every(function (e, t) {
                return n(e) === n(b.threads[t]);
              }),
            o = s === r.name && d === (r.threadId || "");
          ((b.threads = t),
            (a && o) ||
              ((s = r.name),
              (d = r.threadId || ""),
              "thread" === r.name && r.threadId ? we() : "new" === r.name ? Ie() : ye()));
        })
        .catch(function () {
          b.threads.length || mpState("Couldn’t load the forum.", Be, !1);
        }));
  }
  function Re() {
    ((r.name = "list"), (r.threadId = null), (r.replyTo = null), (v = null));
    try {
      history.replaceState(null, "", "#globe");
    } catch (e) {}
    (Be(),
      requestAnimationFrame(function () {
        (window.scrollTo(0, 0),
          (document.documentElement.scrollTop = 0),
          (document.body.scrollTop = 0));
      }));
  }
  function Oe(e) {
    if (e) {
      ((r.name = "thread"), (r.threadId = e));
      try {
        history.replaceState(null, "", "#globe/" + encodeURIComponent(e));
      } catch (e) {}
      (t || (t = document.getElementById("forum-root")),
        g() && !O
          ? y("/api/me")
              .then(function (e) {
                (e && e.user && ((O = e.user), (Ne = !!e.user.owner)), we());
              })
              .catch(function () {
                we();
              })
          : we());
    }
  }
  (document.addEventListener("mp-forum-update", liveSoon),
    (window.MPForum = {
      render: Be,
      goHome: Re,
      openThread: Oe,
      onAvatarReload: function () {
        if (!$())
          if (((s = ""), (d = ""), g()))
            y("/api/me")
              .then(function (e) {
                e && e.user && (O = e.user);
                var t = document.getElementById("forum");
                t &&
                  t.classList.contains("on") &&
                  ("thread" === r.name && r.threadId ? we() : Be());
              })
              .catch(function () {
                var e = document.getElementById("forum");
                e &&
                  e.classList.contains("on") &&
                  ("thread" === r.name && r.threadId ? we() : Be());
              });
          else {
            var e = document.getElementById("forum");
            e && e.classList.contains("on") && ("thread" === r.name && r.threadId ? we() : Be());
          }
      },
      getCurrentThread: function () {
        return "thread" === r.name ? b.thread : null;
      },
      isGlobeList: function () {
        return !!("list" === r.name && document.getElementById("forum") && document.getElementById("forum").classList.contains("on"));
      },
      refreshInPlace: function () {
        var f = document.getElementById("forum");
        if (!f || !f.classList.contains("on")) return null;
        if ("thread" === r.name && r.threadId) {
          return y("/api/forum/thread/" + encodeURIComponent(r.threadId)).then(function (e) {
            if (e && e.ok && e.thread) {
              b.thread = e.thread;
              we();
            } else {
              we();
            }
          });
        }
        if ("list" === r.name) {
          return y("/api/forum/threads").then(function (e) {
            var list = (e && e.ok && e.threads) || [];
            b.threads = list;
            s = "";
            ye();
          });
        }
        return null;
      },
      onLogout: function () {
        ((O = null), (Ne = !1), Be());
      },
      showNotifications: P,
    }));
})();

/* Warm tooltips for the Globe editor toolbar (per dc) */
(function () {
  if (typeof document === "undefined") return;
  var tip, txt, kb, warm = false, cur = null, showT = 0, coolT = 0, lp = null, lpFired = false;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  function el() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "mp-tip";
    tip.setAttribute("role", "tooltip");
    tip.innerHTML = '<span class="mp-tip-in"><span class="mp-tip-t"></span><span class="mp-tip-k"></span></span>';
    txt = tip.querySelector(".mp-tip-t");
    kb = tip.querySelector(".mp-tip-k");
    document.body.appendChild(tip);
    return tip;
  }
  function kfmt(k) { return isMac ? k : k.replace(/⌘/g, "Ctrl+").replace(/⇧/g, "Shift+").replace(/⌥/g, "Alt+"); }
  function place(b, instant) {
    el();
    var k = b.getAttribute("data-kbd") || "";
    var swap = cur && cur !== b && warm;
    if (swap) { tip.classList.remove("xf"); void tip.offsetWidth; tip.classList.add("xf"); }
    txt.textContent = b.getAttribute("data-tip");
    kb.textContent = k && !touch ? kfmt(k) : "";
    kb.style.display = k && !touch ? "" : "none";
    var pin = tip.firstChild, ow = pin.offsetWidth;
    pin.style.transition = "none"; pin.style.width = "";
    var nw = pin.offsetWidth;
    if (swap && !instant) { pin.style.width = ow + "px"; void pin.offsetWidth; pin.style.transition = ""; pin.style.width = nw + "px"; }
    else pin.style.transition = "";
    tip.classList.toggle("instant", !!instant);
    var r = b.getBoundingClientRect(), w = nw, h = tip.offsetHeight;
    var x = r.left + r.width / 2 - w / 2, cx = w / 2;
    var cl = Math.max(8, Math.min(innerWidth - w - 8, x));
    cx += x - cl;
    var y = r.top - h - 8, below = y < 8;
    if (below) y = r.bottom + 8;
    tip.classList.toggle("below", below);
    tip.style.setProperty("--cx", cx + "px");
    tip.style.transform = "translate(" + cl + "px," + y + "px)";
    cur = b;
  }
  function show(b) {
    clearTimeout(coolT);
    if (warm) { place(b, false); return; }
    place(b, true);
    void tip.offsetWidth;
    tip.classList.remove("instant");
    tip.classList.add("on");
    warm = true;
  }
  function hide(now) {
    clearTimeout(showT);
    if (!tip) return;
    tip.classList.remove("on");
    clearTimeout(coolT);
    coolT = setTimeout(function () { warm = false; cur = null; }, now ? 0 : 300);
  }
  function btnOf(t) { return t && t.closest && t.closest(".mp-tbar [data-tip]"); }
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType === "touch") return;
    var b = btnOf(e.target);
    if (!b) return;
    clearTimeout(showT); clearTimeout(coolT);
    if (warm) show(b); else showT = setTimeout(function () { show(b); }, 500);
  });
  document.addEventListener("pointerout", function (e) {
    if (e.pointerType === "touch") return;
    var b = btnOf(e.target);
    if (!b) return;
    var to = btnOf(e.relatedTarget);
    if (to) return;
    clearTimeout(showT);
    if (tip) tip.classList.remove("on");
    clearTimeout(coolT);
    coolT = setTimeout(function () { warm = false; cur = null; }, 300);
  });
  document.addEventListener("pointerdown", function (e) { if (e.pointerType !== "touch" && btnOf(e.target)) hide(true); }, true);
  // Touch: long press to show, slide to morph, lift to hide.
  document.addEventListener("touchstart", function (e) {
    var b = btnOf(e.target);
    if (!b) return;
    lpFired = false;
    clearTimeout(lp);
    lp = setTimeout(function () { lpFired = true; show(b); }, 350);
  }, { passive: true });
  var sx = 0, sy = 0;
  document.addEventListener("touchstart", function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true, capture: true });
  document.addEventListener("scroll", function (e) { if (!lpFired && e.target && e.target.closest && e.target.closest(".mp-tbar")) { clearTimeout(lp); if (tip) tip.classList.remove("on"); } }, true);
  document.addEventListener("touchmove", function (e) {
    if (!lpFired) { var t0 = e.touches[0]; if (Math.abs(t0.clientX - sx) + Math.abs(t0.clientY - sy) > 6) clearTimeout(lp); return; }
    e.preventDefault();
    var t = e.touches[0], b = btnOf(document.elementFromPoint(t.clientX, t.clientY));
    if (b && b !== cur) show(b);
  }, { passive: false });
  function end(e) {
    clearTimeout(lp);
    if (lpFired) { if (e.cancelable) e.preventDefault(); hide(true); setTimeout(function () { lpFired = false; }, 400); }
  }
  document.addEventListener("touchend", end, { passive: false });
  document.addEventListener("touchcancel", end, { passive: false });
  document.addEventListener("click", function (e) { if (lpFired && btnOf(e.target)) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("contextmenu", function (e) { if (btnOf(e.target)) e.preventDefault(); });
  // Cheap extra shortcuts TipTap lacks: ⌘K link, ⌥⌘1 heading.
  document.addEventListener("keydown", function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    var ed = e.target && e.target.closest && e.target.closest(".ProseMirror");
    if (!ed) return;
    var act = !e.altKey && !e.shiftKey && (e.key === "k" || e.key === "K") ? "link" : e.altKey && e.code === "Digit1" ? "h3" : null;
    if (!act) return;
    var root = ed.parentNode, b = null;
    while (root && root !== document && !(b = root.querySelector && root.querySelector('.mp-tbar [data-act="' + act + '"]'))) root = root.parentNode;
    if (b) { e.preventDefault(); b.click(); }
  });
  window.MPTip = { show: show, hide: hide };
})();
