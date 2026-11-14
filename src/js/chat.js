/* mpHide: per-viewer hidden users (localStorage; no Worker prefs endpoint exists) */
(function () {
  if (window.mpHide) return;
  var KEY = "mp_hidden_v1";
  function all() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function vk() { return H.viewer || localStorage.getItem("mp_hide_viewer") || "anon"; }
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
      var prev = document.querySelector(".mp-ctx-menu");
      var same = prev && prev._ctxAnchor === anchor;
      if (prev) prev._close(true);
      if (same) return;
      var m = document.createElement("div"), closed = false;
      m.className = "chat-plus-menu mp-ctx-menu"; m.setAttribute("role", "menu"); m._ctxAnchor = anchor;
      function close(immediate) {
        if (closed) return;
        closed = true;
        document.removeEventListener("pointerdown", out, true); document.removeEventListener("keydown", esc, true);
        window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", resize);
        window.removeEventListener("hashchange", resize);
        anchor.setAttribute("aria-expanded", "false");
        if (immediate) m.remove();
        else { m.classList.remove("is-in"); m.classList.add("is-out"); setTimeout(function () { m.remove(); }, 180); }
      }
      function out(e) { if (!m.contains(e.target) && !anchor.contains(e.target)) close(); }
      function esc(e) { if (e.key === "Escape") { e.preventDefault(); close(); if (anchor.isConnected) anchor.focus({preventScroll:true}); } }
      function scroll(e) { if (!(e.target instanceof Node) || !m.contains(e.target)) close(true); }
      function resize() { close(true); }
      m._close = close;
      items.forEach(function (it, i) {
        if (i) { var sp = document.createElement("div"); sp.className = "chat-pmenu-sep"; m.appendChild(sp); }
        var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem");
        b.className = "chat-pmenu-row" + (it.danger ? " is-danger" : "");
        b.innerHTML = (it.icon || "") + "<span></span>"; b.querySelector("span").textContent = it.label;
        b.addEventListener("click", function (e) { e.stopPropagation(); close(true); it.run(); }); m.appendChild(b);
      });
      document.body.appendChild(m);
      var r = anchor.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      m.style.maxWidth = Math.max(0,vw-16) + "px"; m.style.maxHeight = Math.max(80,vh-160) + "px"; m.style.overflowY = "auto";
      var h = m.offsetHeight, w = m.offsetWidth, up = r.top-h-8 >= 80;
      var left = Math.max(8,Math.min(r.left,vw-w-8)), top = Math.max(80,Math.min(up?r.top-h-8:r.bottom+8,vh-h-8));
      m.style.position="fixed"; m.style.left=left+"px"; m.style.top=top+"px"; m.style.bottom="auto"; m.style.zIndex="2147483000";
      m.style.transformOrigin=(r.left+r.width/2-left)+"px "+(up?"100%":"0");
      anchor.setAttribute("aria-expanded","true");
      requestAnimationFrame(function () { if (!closed) m.classList.add("is-in"); });
      document.addEventListener("pointerdown",out,true); document.addEventListener("keydown",esc,true);
      window.addEventListener("scroll",scroll,true); window.addEventListener("resize",resize); window.addEventListener("hashchange",resize);
      return m;
    },
  };
  window.mpHide = H;
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", H.css) : H.css();
})();
!(function () {
  "use strict";
  // CSP: no inline handlers. Inputs rendered readonly (autofill guard) unlock on focus.
  document.addEventListener(
    "focusin",
    function (ev) {
      var x = ev.target;
      x && x.hasAttribute && x.hasAttribute("data-ro-unlock") && x.removeAttribute("readonly");
    },
    !0,
  );
  // X sign-in/link return (#x_code= / #x_error= / #x_link_confirm=):
  // capture the hash NOW, while this script evaluates. app.js routes
  // "#x_..." to the chat view and rewrites the URL to "#chat" before
  // DOMContentLoaded, so reading location.hash later lost the code.
  var xReturnHash = (function () {
    try {
      var h = location.hash || "";
      return /(^#|&)x_(code|error|token|link_confirm|linked)=/.test(h) ? h : "";
    } catch (e) {
      return "";
    }
  })();
  var e = "https://api.misereperdue.com",
    t = "Rkc1RmlJQWwtdFJTOVhudlczanc6MTpjaQ",
    n = "https://api.misereperdue.com/api/x/callback",
    a =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    r = "chat_token",
    o = "chat_device";
  function i() {
    try {
      var e = localStorage.getItem(o);
      return (
        e ||
          ((e = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36)),
          localStorage.setItem(o, e)),
        e
      );
    } catch (e) {
      return "";
    }
  }
  var c = null,
    s = null,
    l = !1,
    d = null,
    u = Object.create(null),
    m = 0,
    p = null,
    h = 0,
    v = !1,
    f = !1,
    g = null,
    b = null,
    y = null,
    w = null,
    C = !1;
  function x(e) {
    return String(null == e ? "" : e)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function E(t, n) {
    n = n || {};
    var a = { "Content-Type": "application/json" },
      tk = n.token !== void 0 ? n.token : d; // n.token: explicit token (sign-out runs after d is cleared)
    tk && (a.Authorization = "Bearer " + tk);
    try {
      var did = i();
      did && (a["X-Device-Id"] = did);
    } catch (e) {}
    var r = null,
      o = { method: n.method || "GET", headers: a, body: n.body ? JSON.stringify(n.body) : void 0 };
    try {
      if(n.signal){o.signal=n.signal;}
      else if (window.AbortController) {
        var i = new AbortController();
        ((o.signal = i.signal),
          (r = setTimeout(function () {
            try {
              i.abort();
            } catch (e) {}
          }, 2e4)));
      }
    } catch (e) {}
    function c() {
      r && (clearTimeout(r), (r = null));
    }
    return fetch(e + t, o).then(
      function (e) {
        (c(), Mt(!1));
        var t = "";
        try {
          t = e.headers.get("content-type") || "";
        } catch (e) {}
        if (t.indexOf("application/json") < 0) {
          var n = new Error("Request failed" + (e.status ? " (" + e.status + ")" : ""));
          throw ((n.status = e.status || 0), n);
        }
        return e.json();
      },
      function (e) {
        throw (c(), e && !e.status && Mt(!0), e);
      },
    );
  }
  function k(e, t) {
    t = t || {};
    var n = document.querySelector(".mp-dialog-back");
    n && n.parentNode && n.parentNode.removeChild(n);
    var a = document.createElement("div");
    a.className = "mp-dialog-back";
    var r = document.createElement("div");
    ((r.className = "mp-dialog"), r.setAttribute("role", "dialog"));
    var o = document.createElement("div");
    ((o.className = "mp-dialog-title"),
      (o.textContent = String(null == e ? "" : e)),
      r.appendChild(o));
    var i = document.createElement("div");
    i.className = "mp-dialog-actions";
    var c = function () {
      a.parentNode && a.parentNode.removeChild(a);
    };
    if (t.cancelText) {
      var s = document.createElement("button");
      ((s.type = "button"),
        (s.className = "mp-dialog-cancel"),
        (s.textContent = t.cancelText),
        s.addEventListener("click", function () {
          (c(), t.onCancel && t.onCancel());
        }),
        i.appendChild(s));
    }
    var l = document.createElement("button");
    return (
      (l.type = "button"),
      (l.className = "mp-dialog-grant"),
      (l.textContent = t.okText || "OK"),
      l.addEventListener("click", function () {
        (c(), t.onOk && t.onOk());
      }),
      i.appendChild(l),
      r.appendChild(i),
      a.appendChild(r),
      a.addEventListener("click", function (e) {
        e.target === a && (c(), t.onCancel && t.onCancel());
      }),
      document.body.appendChild(a),
      a
    );
  }
  var L =
      "M22.1 12.0L21.7 12.9L21.0 13.6L20.3 14.2L20.0 14.9L20.1 15.8L20.4 16.8L20.2 17.8L19.6 18.3L18.5 18.5L17.6 18.6L16.9 18.9L16.4 19.7L16.0 20.6L15.4 21.4L14.6 21.6L13.6 21.2L12.8 20.7L12.0 20.4L11.2 20.7L10.4 21.2L9.4 21.6L8.6 21.4L8.0 20.6L7.6 19.7L7.1 18.9L6.4 18.6L5.5 18.5L4.4 18.3L3.8 17.8L3.6 16.8L3.9 15.8L4.0 14.9L3.7 14.2L3.0 13.6L2.3 12.9L1.9 12.0L2.3 11.1L3.0 10.4L3.7 9.8L4.0 9.1L3.9 8.2L3.6 7.2L3.8 6.2L4.4 5.7L5.5 5.5L6.4 5.4L7.1 5.1L7.6 4.3L8.0 3.4L8.6 2.6L9.4 2.4L10.4 2.8L11.2 3.3L12.0 3.6L12.8 3.3L13.6 2.8L14.6 2.4L15.4 2.6L16.0 3.4L16.4 4.3L16.9 5.1L17.6 5.4L18.5 5.5L19.6 5.7L20.2 6.2L20.4 7.2L20.1 8.2L20.0 9.1L20.3 9.8L21.0 10.4L21.7 11.1Z",
    S =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="seal" d="' +
      L +
      '"/><path class="vcheck" d="M8.5 12.3l2.1 2 4.9-5.2" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function M(e) {
    return "100" === e
      ? '<span class="chat-badge" title="100" aria-label="100 badge">💯</span>'
      : "robot" === e
        ? '<span class="chat-badge" title="Bot" aria-label="Bot badge">🤖</span>'
        : "member" === e
          ? '<span class="chat-badge chat-badge-member" title="VIP" aria-label="VIP badge">⭐</span>'
          : "heart" === e
            ? '<span class="chat-badge" title="" aria-label="Heart badge"><span class="b-dark">🤍</span><span class="b-light">🖤</span></span>'
            : "kitty" === e
              ? '<span class="chat-badge-kitty" title="Hello Kitty" aria-label="Hello Kitty badge"><img src="img/badge-kitty.png?v=2" alt=""></span>'
              : "mask" === e
                ? '<span class="chat-badge-mask" title="Sleep Mask" aria-label="Sleep Mask badge"><img src="img/badge-mask.png?v=2" alt=""></span>'
                : "every" === e
                  ? '<span class="chat-badge chat-badge-every" title="Everypower" aria-label="Everypower badge"><i class="cbe"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 8.2c-2.2 0-3.9 1.7-3.9 3.8s1.7 3.8 3.9 3.8c3.6 0 7.2-7.6 10.8-7.6 2.2 0 3.9 1.7 3.9 3.8s-1.7 3.8-3.9 3.8c-3.6 0-7.2-7.6-10.8-7.6Z" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/></svg></i></span>'
                : "verified" === e
                  ? '<span class="chat-verified" title="Verified" aria-label="Verified">' +
                    S +
                    "</span>"
                  : "";
  }
  var T = Object.create(null);
  function A(e, t) {
    return "robot" !== t || "grim" === e;
  }
  function N(e) {
    return e ? e.activeBadge === null ? null : e.activeBadge || (e.verified ? "verified" : null) : null;
  }
  function P(e) {
    var t = N(e);
    return t && !A(e.username, t) ? "" : t ? M(t) : "";
  }
  var I = { member: "VIP", verified: "07", kitty: "<3", every: "Everypower" },
    q = {
      member: "chat-badge-pill-vip",
      verified: "chat-badge-pill-07",
      kitty: "chat-badge-pill-kitty",
      every: "chat-badge-pill-every",
    };
  function O(e) {
    var t = N(e),
      n = t && I[t];
    return t && n && A(e.username, t)
      ? '<div class="' +
          ("chat-badge-pill" + (q[t] ? " " + q[t] : "")) +
          '"><i class="pill-ring" aria-hidden="true"></i>' +
          M(t) +
          "<span>" +
          x(n) +
          "</span></div>"
      : "";
  }
  function _(e) {
    var t = (e.user && T[e.user]) || e.badge || (e.verified ? "verified" : null);
    return t && !A(e.user, t) ? "" : t ? M(t) : "";
  }
  var H = "https://misereperdue.com";
  function j(e, t) {
    return new Promise(function (n) {
      var a = new Image();
      (t && (a.crossOrigin = "anonymous"),
        (a.onload = function () {
          n(a);
        }),
        (a.onerror = function () {
          n(null);
        }),
        (a.src = e));
    });
  }
  function R(e, t, n) {
    for (
      var a = String(t || "")
          .split(/\s+/)
          .filter(function (e) {
            return e;
          }),
        r = [],
        o = "",
        i = 0;
      i < a.length;
      i++
    ) {
      var c = o ? o + " " + a[i] : a[i];
      e.measureText(c).width <= n ? (o = c) : (o && r.push(o), (o = a[i]));
    }
    return (o && r.push(o), r);
  }
  function B(e, t, n) {
    var a, r, o;
    if (0 === t) a = r = o = n;
    else {
      var i = function (e, t, n) {
          return (
            n < 0 && (n += 1),
            n > 1 && (n -= 1),
            n < 1 / 6
              ? e + 6 * (t - e) * n
              : n < 0.5
                ? t
                : n < 2 / 3
                  ? e + (t - e) * (2 / 3 - n) * 6
                  : e
          );
        },
        c = n < 0.5 ? n * (1 + t) : n + t - n * t,
        s = 2 * n - c;
      ((a = i(s, c, e + 1 / 3)), (r = i(s, c, e)), (o = i(s, c, e - 1 / 3)));
    }
    return { r: Math.round(255 * a), g: Math.round(255 * r), b: Math.round(255 * o) };
  }
  function U(e) {
    var t = (function (e) {
      if (!e) return null;
      var t = 50,
        n = document.createElement("canvas");
      ((n.width = t), (n.height = t));
      var a,
        r = n.getContext("2d");
      r.drawImage(e, 0, 0, t, t);
      try {
        a = r.getImageData(0, 0, t, t).data;
      } catch (e) {
        return null;
      }
      for (var o = {}, i = null, c = 0, s = 0; s < a.length; s += 4)
        if (!(a[s + 3] < 128)) {
          var l = ((a[s] >> 4) << 8) | ((a[s + 1] >> 4) << 4) | (a[s + 2] >> 4);
          ((o[l] = (o[l] || 0) + 1), o[l] > c && ((c = o[l]), (i = l)));
        }
      if (null === i) return null;
      for (var d = 0, u = 0, m = 0, p = 0, h = 0; h < a.length; h += 4)
        a[h + 3] < 128 ||
          ((((a[h] >> 4) << 8) | ((a[h + 1] >> 4) << 4) | (a[h + 2] >> 4)) === i &&
            ((d += a[h]), (u += a[h + 1]), (m += a[h + 2]), p++));
      return p ? { r: d / p, g: u / p, b: m / p } : null;
    })(e);
    if (!t) return { base: { r: 10, g: 18, b: 48 }, mid: { r: 16, g: 30, b: 70 } };
    var n = (function (e, t, n) {
        var a = Math.max(e, t, n),
          r = Math.min(e, t, n),
          o = 0,
          i = 0,
          c = (a + r) / 2;
        if (a !== r) {
          var s = a - r;
          ((i = c > 0.5 ? s / (2 - a - r) : s / (a + r)),
            (o =
              a === e
                ? (t - n) / s + (t < n ? 6 : 0)
                : a === t
                  ? (n - e) / s + 2
                  : (e - t) / s + 4),
            (o /= 6));
        }
        return { h: o, s: i, l: c };
      })(t.r / 255, t.g / 255, t.b / 255),
      a = Math.min(0.45, Math.max(1.8 * n.s, 0.22));
    return { base: B(n.h, a, 0.16), mid: B(n.h, a, 0.26) };
  }
  function D(t) {
    return (function (t) {
      var n = t.hasAvatarImg
        ? e +
          "/api/avatarimg/" +
          encodeURIComponent(t.username) +
          "?v=" +
          (t.avatarV || 0) +
          "&size=512"
        : null;
      return Promise.all([
        n ? j(n, !0) : Promise.resolve(null),
        j("img/favicon.png", !1),
        j("img/default-avatar.jpg", !1),
      ]).then(function (e) {
        var n = e[0] || e[2],
          a = e[1],
          r = 1080,
          o = 1350,
          i = document.createElement("canvas");
        ((i.width = r), (i.height = o));
        var c = i.getContext("2d"),
          s =
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          l = U(n),
          d = function (e) {
            return "rgb(" + e.r + "," + e.g + "," + e.b + ")";
          },
          u = c.createLinearGradient(0, 0, r, 675);
        (u.addColorStop(0, d(l.base)),
          u.addColorStop(0.5, d(l.mid)),
          u.addColorStop(1, d(l.base)),
          (c.fillStyle = u),
          c.fillRect(0, 0, r, o),
          a && c.drawImage(a, 940, 44, 96, 96),
          c.save(),
          (c.strokeStyle = "rgba(255,255,255,0.16)"),
          (c.lineWidth = 1),
          (function (e, t, n, a, r, o) {
            (e.beginPath(),
              e.moveTo(t + o, n),
              e.lineTo(t + a - o, n),
              e.arcTo(t + a, n, t + a, n + o, o),
              e.lineTo(t + a, n + r - o),
              e.arcTo(t + a, n + r, t + a - o, n + r, o),
              e.lineTo(t + o, n + r),
              e.arcTo(t, n + r, t, n + r - o, o),
              e.lineTo(t, n + o),
              e.arcTo(t, n, t + o, n, o),
              e.closePath());
          })(c, 940, 44, 96, 96, 22),
          c.stroke(),
          c.restore());
        var m = 72;
        for (
          c.font = "700 " + m + "px " + s;
          m > 40 && c.measureText(t.username || "").width > 900;
        )
          ((m -= 4), (c.font = "700 " + m + "px " + s));
        var p = m;
        c.font = "400 34px " + s;
        var h = R(c, t.bio || "", 800).slice(0, 2);
        if (h.length > 1 && R(c, t.bio || "", 800).length > 2) {
          for (var v = h[1]; v.length > 0 && c.measureText(v + "...").width > 800;)
            v = v.slice(0, -1);
          h[1] = v + "...";
        }
        var f = h.length > 0,
          g = 330,
          b = 540,
          y = 840 - (366 + p + (f ? 24 + 42 * h.length : 0)) / 2;
        if (
          (c.save(),
          c.beginPath(),
          c.arc(b, y, 165, 0, 2 * Math.PI),
          c.clip(),
          n
            ? c.drawImage(n, 375, y - 165, g, g)
            : ((c.fillStyle = "#1a2a55"), c.fillRect(375, y - 165, g, g)),
          c.restore(),
          "verified" === N(t))
        ) {
          var w = 3.5,
            C = y + 118.8;
          (c.save(),
            c.translate(616.8, C - 42),
            c.scale(w, w),
            (c.fillStyle = "#ffffff"),
            c.fill(new Path2D(L)),
            (c.strokeStyle = "#000000"),
            (c.lineWidth = 2.6),
            (c.lineCap = "round"),
            (c.lineJoin = "round"),
            c.beginPath(),
            c.moveTo(8.5, 12.3),
            c.lineTo(10.6, 14.3),
            c.lineTo(15.5, 9.1),
            c.stroke(),
            c.restore());
        }
        ((c.font = "700 " + m + "px " + s),
          (c.fillStyle = "#ffffff"),
          (c.textAlign = "center"),
          (c.textBaseline = "top"));
        var x = y + 165 + 36;
        if ((c.fillText(t.username || "", b, x), f)) {
          ((c.font = "400 34px " + s), (c.fillStyle = "#d3d3d3"));
          for (var E = x + p + 24, k = 0; k < h.length; k++) c.fillText(h[k], b, E + 42 * k);
        }
        return (
          (c.font = "400 20px " + s),
          (c.fillStyle = "#ffffff"),
          c.fillText("www.misereperdue.com", 540, 1238),
          i
        );
      });
    })(t)
      .then(function (e) {
        var n = function (e) {
          var n = {
            title: "Misère Perdue",
            text: "Check out " + (t.username || "") + " on Misère Perdue",
            url: H,
          };
          if (
            (e &&
              window.navigator &&
              navigator.share &&
              (!navigator.canShare || navigator.canShare({ files: [e] })) &&
              (n.files = [e]),
            window.navigator && navigator.share)
          )
            return navigator.share(n).catch(function () {});
          if (e) {
            var a = document.createElement("a");
            if (
              ((a.href = URL.createObjectURL(e)),
              (a.download = (t.username || "profile") + "-misereperdue.png"),
              document.body.appendChild(a),
              a.click(),
              a.remove(),
              window.navigator && navigator.clipboard)
            )
              return navigator.clipboard.writeText(H).catch(function () {});
          } else window.open(H, "_blank");
          return Promise.resolve();
        };
        return e.toBlob
          ? new Promise(function (a) {
              try {
                e.toBlob(function (e) {
                  a(
                    n(
                      e
                        ? new File(
                            [e],
                            (String(t.username || "profile").replace(/[^A-Za-z0-9_-]/g, "") ||
                              "profile") + "-misereperdue.png",
                            { type: "image/png" },
                          )
                        : null,
                    ),
                  );
                }, "image/png");
              } catch (e) {
                a(n(null));
              }
            })
          : n(null);
      })
      .catch(function () {
        return window.navigator && navigator.share
          ? navigator
              .share({
                title: "Misère Perdue",
                text: "Check out " + (t.username || "") + " on Misère Perdue",
                url: H,
              })
              .catch(function () {})
          : Promise.resolve();
      });
  }
  function z(e) {
    var t = document.createElement("button");
    return (
      (t.type = "button"),
      (t.className = "chat-sheet-share"),
      t.setAttribute("aria-label", "Share profile"),
      (t.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="14" height="14" data-hi="float"><path d="M9.39584 4.5H8.35417C5.40789 4.5 3.93475 4.5 3.01946 5.37868C2.10417 6.25736 2.10417 7.67157 2.10417 10.5V14.5C2.10417 17.3284 2.10417 18.7426 3.01946 19.6213C3.93475 20.5 5.40789 20.5 8.35417 20.5H12.5608C15.5071 20.5 16.9802 20.5 17.8955 19.6213C18.4885 19.052 18.6973 18.2579 18.7708 17"/><path d="M16.1667 7V3.85355C16.1667 3.65829 16.3316 3.5 16.535 3.5C16.6326 3.5 16.7263 3.53725 16.7954 3.60355L21.5275 8.14645C21.7634 8.37282 21.8958 8.67986 21.8958 9C21.8958 9.32014 21.7634 9.62718 21.5275 9.85355L16.7954 14.3964C16.7263 14.4628 16.6326 14.5 16.535 14.5C16.3316 14.5 16.1667 14.3417 16.1667 14.1464V11H13.1157C8.875 11 7.3125 14.5 7.3125 14.5V12C7.3125 9.23858 9.64435 7 12.5208 7H16.1667Z"/></svg>'),
      (t.style.cssText =
        "position:absolute;top:10px;left:12px;width:32px;height:32px;flex:none;border-radius:999px;border:1px solid var(--stroke);background:var(--fill);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"),
      t.addEventListener("click", function (n) {
        (n.stopPropagation(),
          t.disabled ||
            ((t.disabled = !0),
            (t.style.opacity = "0.5"),
            D(e).then(
              function () {
                ((t.disabled = !1), (t.style.opacity = ""));
              },
              function () {
                ((t.disabled = !1), (t.style.opacity = ""));
              },
            )));
      }),
      t
    );
  }
  function F(e) {
    return (
      (function (e) {
        return e && "dc" === e.toLowerCase();
      })(e) ||
      (function (e) {
        return !!e && "member" === T[e];
      })(e)
    );
  }
  function V(e) {
    return !!e && "kitty" === T[e];
  }
  function W(e, t) {
    if (e) {
      for (var n = e.querySelectorAll(".kitty-heart"), a = 0; a < n.length; a++) n[a].remove();
      t = t || 8;
      for (var r = 0; r < t; r++) {
        var o = document.createElement("div");
        ((o.className = "kitty-heart"),
          o.setAttribute("aria-hidden", "true"),
          (o.textContent = "♥"));
        var i = Math.floor(4 * Math.random()),
          c = 10 + 80 * Math.random();
        (0 === i
          ? ((o.style.top = "-5px"), (o.style.left = c + "%"))
          : 1 === i
            ? ((o.style.right = "-5px"), (o.style.top = c + "%"))
            : 2 === i
              ? ((o.style.bottom = "-5px"), (o.style.left = c + "%"))
              : ((o.style.left = "-5px"), (o.style.top = c + "%")),
          (o.style.fontSize = 7 + 5 * Math.random() + "px"),
          (o.style.animationDelay = 1.8 * Math.random() + "s"),
          (o.style.animationDuration = 1.5 + Math.random() + "s"),
          e.appendChild(o));
      }
    }
  }
  function Z(e, t, n) {
    if (e) {
      for (var a = e.querySelectorAll(".owner-sparkle-star"), r = 0; r < a.length; r++)
        a[r].remove();
      t = t || 8;
      for (var o = 0; o < t; o++) {
        var i,
          c,
          s = document.createElement("div");
        if (
          ((s.className = "owner-sparkle-star"),
          s.setAttribute("aria-hidden", "true"),
          (s.textContent = "✦"),
          n)
        ) {
          i = o % 4;
          var l = Math.ceil(t / 4);
          c = ((Math.floor(o / 4) + 1) / (l + 1)) * 100;
        } else ((i = Math.floor(4 * Math.random())), (c = 10 + 80 * Math.random()));
        (0 === i
          ? ((s.style.top = "-5px"), (s.style.left = c + "%"))
          : 1 === i
            ? ((s.style.right = "-5px"), (s.style.top = c + "%"))
            : 2 === i
              ? ((s.style.bottom = "-5px"), (s.style.left = c + "%"))
              : ((s.style.left = "-5px"), (s.style.top = c + "%")),
          (s.style.fontSize = 7 + 5 * Math.random() + "px"),
          (s.style.animationDelay = 1.8 * Math.random() + "s"),
          (s.style.animationDuration = 1.5 + Math.random() + "s"),
          e.appendChild(s));
      }
    }
  }
  var G = null;
  function Y() {
    G ||
      (G = setInterval(function () {
        !document.hidden &&
          Te() &&
          (function () {
            if (!document.hidden) {
              for (
                var e = document.querySelectorAll(".chat-msg.owner-msg .chat-bubble"), t = 0;
                t < e.length;
                t++
              )
                e[t].querySelector(".owner-sparkle-star") || Z(e[t]);
              for (
                var n = document.querySelectorAll(".chat-msg.kitty-msg .chat-bubble"), a = 0;
                a < n.length;
                a++
              )
                n[a].querySelector(".kitty-heart") || W(n[a]);
            }
          })();
      }, 2e3));
  }
  function J(t, n, a, r) {
    var o = document.createElement("span");
    if (
      ((o.className = "chat-avatar-wrap"),
      t && s && t.toLowerCase() === String(s.username).toLowerCase() && window._myAvatarDataUrl)
    ) {
      var i = document.createElement("img");
      return (
        (i.className = "chat-avatar-img" + (a ? " " + a : "")),
        (i.alt = t),
        (i.decoding = "async"),
        (i.src = window._myAvatarDataUrl),
        o.appendChild(i),
        o
      );
    }
    if (null != r) {
      var c = document.createElement("img");
      ((c.className = "chat-avatar-img" + (a ? " " + a : "")),
        (c.alt = ""),
        (c.decoding = "async"),
        (c.loading = "lazy"),
        (c.src = (function (t, n) {
          return e + "/api/avatarimg/" + encodeURIComponent(t) + "?v=" + (parseInt(n, 10) || 0);
        })(t, r)),
        (c.onerror = function () {
          ((c.onerror = null), (c.src = "img/default-avatar.jpg"));
        }),
        o.appendChild(c));
    } else {
      var l = document.createElement("img");
      ((l.className = "chat-avatar-img" + (a ? " " + a : "")),
        (l.alt = ""),
        (l.decoding = "async"),
        (l.loading = "lazy"),
        (l.src = "img/default-avatar.jpg"),
        o.appendChild(l));
    }
    return o;
  }
  function X() {
    return s && s.hasAvatarImg ? s.avatarV : void 0;
  }
  function Q(e) {
    e.style.opacity = "0";
    var t = null;
    requestAnimationFrame(function n(a) {
      if (e.isConnected) {
        t || (t = a);
        var r = Math.min((a - t) / 400, 1),
          o = r < 0.5 ? 4 * r * r * r : 1 - Math.pow(-2 * r + 2, 3) / 2;
        ((e.style.opacity = String(o)), r < 1 && requestAnimationFrame(n));
      }
    });
  }
  function $(e, t) {
    var n = document.createElement("div");
    ((n.className = "chat-sheet-blur"),
      n.setAttribute("aria-hidden", "true"),
      e.appendChild(n),
      e.appendChild(t));
  }
  function K(t) {
    t &&
      E("/api/user/" + encodeURIComponent(t))
        .then(function (t) {
          if (t && t.ok && t.user) {
            var n = t.user;
            mpPBput(n);
            gt();
            var a = document.createElement("div");
            a.className = "chat-sheet-backdrop backdrop-enter";
            var r = document.createElement("div");
            r.className = "chat-sheet chat-user-sheet";
            var o = document.createElement("div");
            ((o.className = "chat-sheet-anim"),
              r.setAttribute("role", "dialog"),
              r.setAttribute("aria-label", "User profile"));
            var i = document.createElement("button");
            ((i.type = "button"),
              (i.className = "chat-sheet-x"),
              i.setAttribute("aria-label", "Close"),
              (i.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="14" height="14" data-hi="fade"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>'),
              (i.style.cssText =
                "position:absolute;top:10px;right:12px;width:32px;height:32px;flex:none;border-radius:999px;border:1px solid var(--stroke);background:var(--fill);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"),
              i.addEventListener("click", gt),
              r.appendChild(i),
              r.appendChild(z(n)));
            var c = document.createElement("div");
            c.className = "chat-sheet-big";
            var l = J(n.username, n.avatar, "lg", n.hasAvatarImg ? n.avatarV : void 0),
              d = O(n);
            if (!d) {
              var u = P(n);
              u && l.insertAdjacentHTML("beforeend", u);
            }
            (l.classList.add("chat-avatar-click"),
              l.setAttribute("role", "button"),
              l.setAttribute("tabindex", "0"),
              l.setAttribute("aria-label", "View larger avatar"));
            var m = function (t) {
              t && t.stopPropagation();
              var a = document.createElement("div");
              a.className = "avatar-expand-overlay";
              var r = n.hasAvatarImg
                ? e +
                  "/api/avatarimg/" +
                  encodeURIComponent(n.username) +
                  "?v=" +
                  (n.avatarV || 0) +
                  "&size=512"
                : null;
              if (r) {
                var o = document.createElement("img");
                ((o.className = "avatar-expand-img"),
                  (o.src = r),
                  (o.alt = n.username + "'s avatar"),
                  a.appendChild(o));
              } else {
                var i = document.createElement("div");
                ((i.className = "avatar-expand-img"),
                  (i.style.fontSize = "120px"),
                  (i.style.display = "flex"),
                  (i.style.alignItems = "center"),
                  (i.style.justifyContent = "center"),
                  (i.innerHTML =
                    '<img src="img/default-avatar.jpg" alt="" style="width:100%;height:100%;object-fit:cover;">'),
                  a.appendChild(i));
              }
              var c = function () {
                a.parentNode && a.parentNode.removeChild(a);
              };
              (a.addEventListener("click", c),
                a.addEventListener("keydown", function (e) {
                  "Escape" === e.key && c();
                }),
                a.setAttribute("tabindex", "0"),
                document.body.appendChild(a),
                a.focus());
            };
            (l.addEventListener("click", m),
              l.addEventListener("keydown", function (e) {
                ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), m(e));
              }),
              c.appendChild(l),
              d && c.insertAdjacentHTML("beforeend", d),
              r.appendChild(c));
            var p = document.createElement("div");
            if (
              ((p.className = "chat-user-name"),
              (p.textContent = mpName(n.username)),
              r.appendChild(p),
              n.numId)
            ) {
              var h = document.createElement("div");
              ((h.className = "chat-user-joined"),
                (h.textContent = "#" + n.numId),
                r.appendChild(h));
            }
            var v = document.createElement("div");
            if (
              ((v.className = "chat-sheet-points"),
              (v.innerHTML =
                mpStar() + ' <span>' + x(n.points || 0) + "</span> stars"),
              r.appendChild(v),
              n.createdAt)
            ) {
              var f = document.createElement("div");
              ((f.className = "chat-user-joined"),
                (f.textContent =
                  "Joined " +
                  new Date(n.createdAt).toLocaleDateString(void 0, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })),
                r.appendChild(f));
            }
            if (n.bio) {
              var g = document.createElement("div");
              ((g.className = "chat-bio-view"), (g.textContent = n.bio), r.appendChild(g));
            }
            if (window.mpHide && (!s || String(n.username).toLowerCase() !== String(s.username).toLowerCase())) {
              mpHide.seen(n.username, n.numId);
              var hb = document.createElement("button");
              hb.type = "button";
              hb.className = "chat-hide-btn";
              var hl = function () { var h = mpHide.is(n.username); hb.textContent = h ? "Unhide" : "Hide user"; hb.classList.toggle("is-hidden", h); };
              hl();
              hb.addEventListener("click", function (e) {
                e.stopPropagation();
                mpHide.is(n.username) ? (mpHide.unhide(n.username), mpHide.toast(mpAt(n.username) + " is visible again"), hl()) : (mpHideUser(n.username, n.numId), gt());
              });
              r.appendChild(hb);
            }
            var b = !(!s || !s.owner || n.username === s.username);
            if (!b && n.badges && n.badges.length) {
              var y = document.createElement("div");
              ((y.className = "chat-pw-title"), (y.textContent = "Badges"), r.appendChild(y));
              var w = document.createElement("div");
              ((w.className = "chat-badge-row"),
                n.badges.forEach(function (e) {
                  if (
                    A(n.username, e) &&
                    (!s || !s.owner || n.username !== s.username || "verified" === e)
                  ) {
                    var t = document.createElement("span");
                    ((t.className =
                      "chat-badge-opt" + ((n.activeBadge || null) === e ? " on" : "")),
                      (t.innerHTML = M(e)),
                      w.appendChild(t));
                  }
                }),
                r.appendChild(w));
            }
            if (b) {
              var C = document.createElement("div");
              ((C.className = "chat-pw-title"), (C.textContent = "Badges"), r.appendChild(C));
              var L = document.createElement("div");
              if (((L.className = "chat-badge-row"), "grim" === n.username)) {
                var S = document.createElement("span");
                ((S.className = "chat-badge-opt has on"),
                  (S.innerHTML = M("robot")),
                  (S.title = "Bot badge (permanent)"),
                  L.appendChild(S));
              } else
                ["member", "kitty", "mask"].forEach(function (e) {
                  var t = document.createElement("button");
                  t.type = "button";
                  var a = n.badges && -1 !== n.badges.indexOf(e);
                  ((t.className =
                    "chat-badge-opt" +
                    ((n.activeBadge || null) === e ? " on" : "") +
                    (a ? " has" : " not-has")),
                    (t.innerHTML = M(e)),
                    t.setAttribute("aria-label", "Give " + e + " badge to " + mpName(n.username)),
                    t.addEventListener("click", function () {
                      ((t.disabled = !0),
                        E("/api/badge", {
                          method: "POST",
                          body: { username: n.username, badge: e },
                        })
                          .then(function (e) {
                            if (((t.disabled = !1), e && e.ok && e.user)) {
                              var a = (n = e.user).badges || [];
                              L.querySelectorAll(".chat-badge-opt").forEach(function (e, n) {
                                var r = ["member", "kitty", "mask"][n],
                                  o = -1 !== a.indexOf(r);
                                (e.classList.toggle("on", e === t && o),
                                  e.classList.toggle("has", o),
                                  e.classList.toggle("not-has", !o));
                              });
                              var r = c.querySelector(".chat-avatar-wrap");
                              if (r) {
                                var o = J(
                                    n.username,
                                    n.avatar,
                                    "lg",
                                    n.hasAvatarImg ? n.avatarV : void 0,
                                  ),
                                  i = O(n);
                                if (!i) {
                                  var s = P(n);
                                  s && o.insertAdjacentHTML("beforeend", s);
                                }
                                r.parentNode.replaceChild(o, r);
                                var l = c.querySelector(".chat-badge-pill");
                                (l && l.parentNode.removeChild(l),
                                  i && o.insertAdjacentHTML("afterend", i));
                              }
                            } else k((e && e.error) || "Couldn't grant badge.");
                          })
                          .catch(function () {
                            ((t.disabled = !1), k("Couldn't reach the chat server."));
                          }));
                    }),
                    L.appendChild(t));
                });
              r.appendChild(L);
              var T = document.createElement("button");
              ((T.type = "button"),
                (T.className = "btn chat-banbtn" + (n.banned ? " on" : "")),
                (T.textContent = n.banned ? "Unban" : "Ban"),
                T.addEventListener("click", function () {
                  ((T.disabled = !0),
                    E("/api/ban", {
                      method: "POST",
                      body: { username: n.username, banned: !n.banned },
                    })
                      .then(function (e) {
                        ((T.disabled = !1),
                          e &&
                            e.ok &&
                            ((n.banned = e.banned),
                            (T.textContent = n.banned ? "Unban" : "Ban"),
                            T.classList.toggle("on", n.banned)));
                      })
                      .catch(function () {
                        T.disabled = !1;
                      }));
                }),
                r.appendChild(T));
            }
            ($(o, r),
              a.addEventListener("click", function (e) {
                e.target === a && gt();
              }),
              document.body.appendChild(a),
              document.body.appendChild(o),
              Q(r));
          }
        })
        .catch(function () {});
  }
  // Avatar profiles share the active status bar through summary, details and editing.
  var mpPBel = null, mpPBreq = 0, mpPBcache = Object.create(null);
  function mpPBclose(fast) {
    var b = mpPBel;
    if (!b) return;
    mpPBel = null;
    ++mpPBreq;
    if (b._close) b._close(fast);
  }
  function mpPBput(u) {
    if (u && u.username) mpPBcache[String(u.username).toLowerCase()] = { t: Date.now(), u: u };
  }
  function mpProfileSynced(user) {
    s = user;
    mpPBput(user);
    if(mpPBel && mpPBel._me){mpPBel._profile=user;mpPBel._refresh && mpPBel._refresh();}
    return user;
  }
  function mpPBget(name) {
    var c = mpPBcache[String(name).toLowerCase()];
    return c && Date.now() - c.t < 18e4 ? c.u : null;
  }
  function mpPBshow(n, anchor, rq, fromCache, key) {
    if (rq !== mpPBreq || !n || !anchor || !anchor.isConnected) return;
    key = key || n.username;
    if (mpPBel && mpPBel._u === key && mpPBel._a === anchor) {
      if (mpPBel._fromCache && !fromCache) {
        mpPBel._fromCache = !1;
        Object.assign(mpPBel._profile, n);
        mpPBel._refresh && mpPBel._refresh();
        try {
          var pts = mpPBel.querySelector(".mp-pb-pts b");
          if (pts && n.points != null) pts.textContent = x(n.points || 0);
        } catch (e) {}
      }
      return;
    }
    if (mpPBel) { var previous = mpPBel; mpPBel = null; previous._close && previous._close(true); }
    var me = !!(s && String(n.username).toLowerCase() === String(s.username).toLowerCase()),
      b = document.createElement("div");
    b.className = "mp-pb";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-label", mpName(n.username) + "'s profile");
    b.tabIndex = -1;
    b._u = key;
    b._me = me;
    b._profile = n;
    b._a = anchor;
    b._fromCache = !!fromCache;
    b._openedAt = Date.now();
    var body = document.createElement("div");
    body.className = "mp-pb-body";
    var hd = document.createElement("div");
    hd.className = "mp-pb-hd";
    /* Grim t537u redesign: avatar sits in a ring (accent; VIP gold, owner shimmer), with a soft aura of the
       avatar itself behind the header; name, @handle + meta, then chips, bio, actions. */
    var av = J(n.username, n.avatar, "lg", n.hasAvatarImg ? n.avatarV : void 0),
      pill = pbPill(n);
    var bd = pill ? "" : P(n),
      isOwn = String(n.username).toLowerCase() === "dc",
      avw = document.createElement("div");
    avw.className = "mp-pb-av" + (isOwn ? " is-owner" : pbRing(n));
    avw.innerHTML = '<i class="mp-pb-ring" aria-hidden="true"></i>';
    mpPwApply(avw, n.username, mpPwFromProfile(n));
    avw.appendChild(av);
    hd.appendChild(avw);
    var avImg = av.querySelector("img");
    if (avImg && avImg.src && !/default-avatar/.test(avImg.src)) {
      var aura = document.createElement("div");
      aura.className = "mp-pb-aura";
      aura.setAttribute("aria-hidden", "true");
      var ai = document.createElement("img");
      ai.alt = ""; ai.decoding = "async"; ai.src = avImg.src;
      ai.onerror = function () { aura.remove(); };
      aura.appendChild(ai);
      body.appendChild(aura);
    }
    var nm = document.createElement("div");
    nm.className = "mp-pb-nm";
    var n1 = document.createElement("div");
    n1.className = "mp-pb-name";
    var n1t = document.createElement("span");
    n1t.className = "mp-pb-name-t";
    n1t.textContent = mpName(n.username);
    n1.appendChild(n1t);
    mpPwApply(n1, n.username, mpPwFromProfile(n));
    /* badges sit on the avatar, not next to the name (per dc) */
    bd && avw.insertAdjacentHTML("beforeend", '<span class="mp-pb-ib mp-pb-av-badge">' + bd + "</span>");
    nm.appendChild(n1);
    var n2 = document.createElement("div");
    n2.className = "mp-pb-sub";
    // Avoid repeating the username beneath the name line.
    var meta = [n.numId ? "#" + n.numId : "", n.createdAt ? "joined " + new Date(n.createdAt).toLocaleDateString(void 0, { month: "short", year: "numeric" }).toLowerCase() : ""].filter(Boolean).join(" · ");
    meta && n2.insertAdjacentHTML("beforeend", '<span class="mp-pb-meta"></span>');
    meta && (n2.lastChild.textContent = meta);
    nm.appendChild(n2);
    /* stars sit under the join date (per dc) */
    var n3 = document.createElement("div");
    n3.className = "mp-pb-starsline";
    n3.innerHTML = mpPbStars(n);
    nm.appendChild(n3);
    hd.appendChild(nm);
    body.appendChild(hd);
    var st = document.createElement("div");
    st.className = "mp-pb-stats";
    st.innerHTML = (pill || "") + pbEvery(n);
    if (n.badges && n.badges.length) {
      var br = document.createElement("span");
      br.className = "mp-pb-badges";
      n.badges.forEach(function (e) {
        if (A(n.username, e) && !((bd || pill) && e === pbPillBadge(n))) {
          var i = document.createElement("span");
          i.className = "mp-pb-badge" + ((n.activeBadge || null) === e ? " on" : "");
          i.innerHTML = M(e);
          br.appendChild(i);
        }
      });
      br.childNodes.length && st.appendChild(br);
    }
    /* badge pills sit right under the stars line (per dc) */
    n3.after(st);
    var pw = powRow(n);
    pw && body.appendChild(pw);
    var bio = document.createElement("div");
    bio.className = "mp-pb-bio" + (n.bio ? "" : " is-empty");
    if (n.bio) bio.textContent = n.bio;
    else bio.setAttribute("hidden", "");
    nm.appendChild(bio);
    var ac = document.createElement("div");
    ac.className = "mp-pb-acts";
    /* Share/Edit sit above the name; Whisper/Hide remain secondary actions. */
    var tools = document.createElement("div");
    tools.className = "mp-pb-tools";
    function tool(label, icon, run) {
      var k = document.createElement("button");
      k.type = "button";
      k.className = "mp-pb-tool";
      k.setAttribute("aria-label", label);
      k.title = label;
      k.innerHTML = "<svg " + MP_IC + ">" + icon + "</svg>";
      k.addEventListener("click", function (e) { e.stopPropagation(); run(k); });
      tools.appendChild(k);
      return k;
    }
    function btn(label, icon, run, cls) {
      var k = document.createElement("button");
      k.type = "button";
      k.className = "mp-pb-act" + (cls ? " " + cls : "");
      k.innerHTML = "<svg " + MP_IC + (/mp-star-p/.test(icon) ? ' data-ph="1"' : "") + ">" + icon + "</svg><span></span>";
      k.querySelector("span").textContent = label;
      k.addEventListener("click", function (e) { e.stopPropagation(); run(k); });
      ac.appendChild(k);
      return k;
    }
    if (!me && mpPM.on && s)
      btn("Whisper", '<path d="M21.9918 12.8046C21.9851 13.0352 21.9745 13.2648 21.9598 13.4922C21.6856 17.7346 18.3536 21.1138 14.1706 21.3919C13.4574 21.4393 12.7285 21.5013 12 21.5013C10.4054 21.5013 8.95127 21.3641 7.44544 20.7906C7.44544 20.7906 5.56108 22.2592 3.69962 21.959H3.69961C3.31008 21.8962 3.11532 21.8648 3.00091 21.6347C2.8865 21.4046 3.00788 21.176 3.25063 20.7189C3.65964 19.9487 3.92248 19.174 3.80076 18.3309C3.73703 17.8895 3.50433 17.4977 3.27644 17.114L3.26529 17.0952C2.62637 16.0191 2.12462 14.7979 2.04024 13.4922C1.98659 12.662 1.98659 11.8023 2.04024 10.9721C2.31441 6.72972 5.64639 3.35048 9.8294 3.07242C11.1415 2.9852 12.5095 2.97817 13.8327 3.05179"/><path d="M16.75 5.50134V4.00134C16.75 2.89677 17.6454 2.00134 18.75 2.00134C19.8546 2.00134 20.75 2.89677 20.75 4.00134V5.50134M17.5 10.0013H20C20.9428 10.0013 21.4142 10.0013 21.7071 9.70845C22 9.41556 22 8.94415 22 8.00134V7.50134C22 6.55853 22 6.08713 21.7071 5.79424C21.4142 5.50134 20.9428 5.50134 20 5.50134H17.5C16.5572 5.50134 16.0858 5.50134 15.7929 5.79424C15.5 6.08713 15.5 6.55853 15.5 7.50134V8.00134C15.5 8.94415 15.5 9.41556 15.7929 9.70845C16.0858 10.0013 16.5572 10.0013 17.5 10.0013Z"/><path d="M8.75 15.0013H15.25M8.75 10.0013H12.25"/>', function () { mpPBclose(); mpPMStart(n.username); });
    me && tool("Edit profile", '<path d="M15.2141 5.98239L16.6158 4.58063C17.39 3.80646 18.6452 3.80646 19.4194 4.58063C20.1935 5.3548 20.1935 6.60998 19.4194 7.38415L18.0176 8.78591M15.2141 5.98239L6.98023 14.2163C5.93493 15.2616 5.41226 15.7842 5.05637 16.4211C4.70047 17.058 4.3424 18.5619 4 20C5.43809 19.6576 6.94199 19.2995 7.57889 18.9436C8.21579 18.5877 8.73844 18.0651 9.78375 17.0198L18.0176 8.78591M15.2141 5.98239L18.0176 8.78591"/><path d="M11 20H17"/>', function () { b._edit && b._edit(); });
    tool("Share profile", '<path d="M9.39584 4.5H8.35417C5.40789 4.5 3.93475 4.5 3.01946 5.37868C2.10417 6.25736 2.10417 7.67157 2.10417 10.5V14.5C2.10417 17.3284 2.10417 18.7426 3.01946 19.6213C3.93475 20.5 5.40789 20.5 8.35417 20.5H12.5608C15.5071 20.5 16.9802 20.5 17.8955 19.6213C18.4885 19.052 18.6973 18.2579 18.7708 17"/><path d="M16.1667 7V3.85355C16.1667 3.65829 16.3316 3.5 16.535 3.5C16.6326 3.5 16.7263 3.53725 16.7954 3.60355L21.5275 8.14645C21.7634 8.37282 21.8958 8.67986 21.8958 9C21.8958 9.32014 21.7634 9.62718 21.5275 9.85355L16.7954 14.3964C16.7263 14.4628 16.6326 14.5 16.535 14.5C16.3316 14.5 16.1667 14.3417 16.1667 14.1464V11H13.1157C8.875 11 7.3125 14.5 7.3125 14.5V12C7.3125 9.23858 9.64435 7 12.5208 7H16.1667Z"/>', function (k) {
      k.disabled || ((k.disabled = !0), D(n).then(function () { k.disabled = !1; }, function () { k.disabled = !1; }));
    });
    !me && s && d && btn("Gift", STAR_ICON, function () { giftOpen(b._profile || n, b); });
    if (!me && window.mpHide) {
      mpHide.seen(n.username, n.numId);
      var hideK = document.createElement("button");
      hideK.type = "button";
      hideK.className = "mp-pb-hide" + (mpHide.is(n.username) ? " is-on" : "");
      hideK.setAttribute("aria-label", (mpHide.is(n.username) ? "Unhide " : "Hide ") + mpName(n.username));
      hideK.title = mpHide.is(n.username) ? "Unhide" : "Hide";
      hideK.innerHTML = '<svg ' + MP_IC + '><path d="M2.25 12C2.25 17.5228 6.72715 22 12.25 22C17.7728 22 22.25 17.5228 22.25 12C22.25 6.47715 17.7728 2 12.25 2C6.72715 2 2.25 6.47715 2.25 12Z"/><path d="M5.25 5L19.25 19"/></svg>';
      hideK.addEventListener("click", function (ev) {
        ev.stopPropagation();
        mpHide.is(n.username) ? (mpHide.unhide(n.username), mpHide.toast(mpAt(n.username) + " is visible again")) : mpHideUser(n.username, n.numId);
        mpPBclose();
      });
      n1.appendChild(hideK);
    }
    if(me){
      btn("Powers",POW_ICON,function(){powOpen();});
      btn("Stars",STAR_ICON,function(){starsOpen();});
      var shopIcon=document.querySelector('.nav [data-view=shop] svg');
      btn("Orders",shopIcon?shopIcon.innerHTML:'<path d="M6 7h12l2 14H4L6 7Zm3 0V5a3 3 0 0 1 6 0v2"/>',function(){mpPBclose(true);ordOpen();});
      if(s && s.owner)btn("Dashboard",'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',function(){dashOpen();});
    }
    ac.childNodes.length && body.appendChild(ac);
    nm.insertBefore(tools, n1);
    hd.classList.add("has-tools-" + tools.childNodes.length);
    mpPBel = b;
    MPProfiles.openBar(b, body, n, {
      origin:e, me:me, anchor:anchor, resolve:mpProfileMusicResolve,
      /* Sign out under the Listening box (per dc): first tap asks, second signs out. */
      signout: me ? function(k){
        var t=k.querySelector("span")||k;
        if(!k.classList.contains("is-confirm")){k.classList.add("is-confirm");t.textContent="Tap again to sign out";clearTimeout(k._t);k._t=setTimeout(function(){k.classList.remove("is-confirm");t.textContent="Sign out";},3000);return;}
        clearTimeout(k._t);mpPBclose(true);ft();
      } : null,
      avatar:function(user,size){return J(user.username,user.avatar,size||"sm",user.hasAvatarImg ? user.avatarV : void 0);},
      current:function(){return me && s ? s : b._profile;},
      edit:function(show, back){mpProfileSheet(false,{show:show,back:back});},
      close:function(){mpPBclose();},
      sync:function(user){
        var opw=body.querySelector('.mp-pb-pow'),npw=powRow(user);opw&&opw.remove();npw&&hd.parentNode&&hd.parentNode.insertBefore(npw,hd.nextSibling);
        mpPwApply(n1,user.username,mpPwFromProfile(user));var ib=avw.querySelector('.mp-pb-ib')||n1.querySelector('.mp-pb-ib');if(ib)ib.remove();var pill=pbPill(user),badge=pill?'':P(user);if(badge)avw.insertAdjacentHTML('beforeend','<span class="mp-pb-ib mp-pb-av-badge">'+badge+'</span>');
        st.innerHTML=(pill||'')+pbEvery(user);var sl=body.querySelector('.mp-pb-starsline');sl&&(sl.innerHTML=mpPbStars(user));
        if(user.badges&&user.badges.length){var badges=document.createElement('span');badges.className='mp-pb-badges';user.badges.forEach(function(id){if(A(user.username,id)&&!((badge||pill)&&id===pbPillBadge(user))){var mark=document.createElement('span');mark.className='mp-pb-badge'+(user.activeBadge===id?' on':'');mark.innerHTML=M(id);badges.appendChild(mark);}});if(badges.childElementCount)st.appendChild(badges);}
        mpPwApply(avw,user.username,mpPwFromProfile(user));if(!avw.classList.contains('is-owner')){var ring=pbRing(user);['is-vip','is-kitty','is-verified'].forEach(function(c){avw.classList.toggle(c,ring===' '+c);});}
      },
      manage:!me && s && s.owner ? function(){return mpOwnerPowers(b, MPProfiles.management(b._profile,{api:E,art:M,allowed:A,active:N,avatar:function(user){return J(user.username,user.avatar,'sm',user.hasAvatarImg?user.avatarV:void 0);},changed:function(user){mpPBput(user);b._profile=user;T[user.username]=N(user);}}));} : null
    });
  }
  /* Profile view rings and pill (per dc): VIP keeps its gold ring and VIP pill whatever badge is
     displayed; Hello Kitty badge holders get a pink ring; otherwise the verified ring. */
  /* VIP outranks other badges, except 07 (verified), which outranks VIP when displayed (per dc). */
  function pbHas07(u) { return !!(u && (u.verified || (u.badges || []).indexOf("verified") >= 0)); }
  function pbVip(u) { return !!(u && (u.member || (u.badges || []).indexOf("member") >= 0)) && !pbHas07(u); }
  function pbPillBadge(u) { return pbVip(u) ? "member" : N(u); }
  function mpPbStars(u) { var n = u.points || 0; return '<span class="mp-pb-pts" aria-label="' + x(n) + ' stars">' + mpStar() + ' <b>' + x(n) + "</b> " + (n === 1 ? "star" : "stars") + "</span>"; }
  /* Everypower pill (per dc): shown next to the other pill whenever the badge is earned */
  function pbEvery(u) { return u && (u.badges || []).indexOf("every") >= 0 && pbPill(u).indexOf("chat-badge-pill-every") < 0 ? O(Object.assign({}, u, { activeBadge: "every" })) : ""; }
  function pbPill(u) { return pbVip(u) ? O(Object.assign({}, u, { activeBadge: "member" })) : pbHas07(u) && (N(u) === "member" || N(u) === "every" || !N(u)) ? O(Object.assign({}, u, { activeBadge: "verified" })) : O(u); }
  function pbRing(u) {
    return pbVip(u) ? " is-vip" : u && ((u.badges || []).indexOf("kitty") >= 0 || N(u) === "kitty") ? " is-kitty" : N(u) === "verified" ? " is-verified" : "";
  }
  /* Powers (per dc): Glow (glow around your name), Ink (name colour), Bubble (bubble tint). The
     Worker sends each user's active looks as colours: maps on hello / message history, m.pw on
     each message, and live {t:"pw"} events when someone changes a power. */
  var PW = Object.create(null),
    PW_COLORS = { ice: "#a9d7f5", pink: "#ff7fb8", gold: "#f5bf45", mint: "#5fe3b0", violet: "#b18cff", red: "#ff5a5f" };
  function pwKey(u) { return String(u || "").toLowerCase(); }
  var PW_KEYS = ["glow", "ink", "bubble", "echo", "glitch", "melt", "aura", "halo", "rgb", "sphere", "hat", "couture", "louis", "diamond", "emerald", "ruby"];
  /* Hats (per dc): drawn over the avatar. The box is 140x145 with the avatar circle at (70,95) r50, so a hat
     can rise above the head. Couture Beanie is its own power (quilted, pearl-chain cuff, gold pearl). */
  var HAT_SVG = {
    /* plain black beanie with a ribbed cuff (per dc) */
    beanie: hatBeanie(),
    /* party hat: purple cone, gold dots, white zigzag trim and a pink pompom (per dc) */
    party: '<path d="M45 64 71 6l25 58c-16 7-35 7-51 0Z" fill="#6f4dff"/><path d="M71 6 96 64c-6 2.5-12 4-18 4.6Z" fill="#5a3be0" opacity=".55"/><circle cx="66" cy="30" r="3" fill="#ffd36b"/><circle cx="77" cy="40" r="3" fill="#ffd36b"/><circle cx="60" cy="46" r="3" fill="#ffd36b"/><circle cx="72" cy="53" r="3" fill="#ffd36b"/><circle cx="85" cy="54" r="2.6" fill="#ffd36b"/><path d="M46 60l5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5" stroke="#fff" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M45 64c16 7 35 7 51 0" stroke="#4a2fc4" stroke-width="2.5" fill="none" stroke-linecap="round"/><g fill="#ff6fa5"><circle cx="71" cy="6" r="7"/><circle cx="64" cy="3" r="3.2"/><circle cx="78" cy="3" r="3.2"/><circle cx="71" cy="-1" r="3.2"/><circle cx="66" cy="10" r="3"/><circle cx="76" cy="10" r="3"/></g><circle cx="69" cy="4" r="1.8" fill="#ffd0e2"/>',
    /* horns curving inward toward each other (per dc) */
    horns: '<path d="M42 62C35 44 41 27 61 17c-6 12-8 26-4 41Z" fill="#cf2e45"/><path d="M98 62c7-18 1-35-19-45 6 12 8 26 4 41Z" fill="#cf2e45"/><path d="M45 56c-3-12 1-24 11-31M95 56c3-12-1-24-11-31" stroke="#ff8a98" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>',
    bunny: '<g transform="rotate(-13 52 54)"><ellipse cx="52" cy="24" rx="11" ry="30" fill="#f7f3f8" stroke="#dcd2df" stroke-width="2"/><ellipse cx="52" cy="27" rx="5.5" ry="21" fill="#ffb5cb"/></g><g transform="rotate(13 88 54)"><ellipse cx="88" cy="24" rx="11" ry="30" fill="#f7f3f8" stroke="#dcd2df" stroke-width="2"/><ellipse cx="88" cy="27" rx="5.5" ry="21" fill="#ffb5cb"/></g>',
    headphones: hatAirMax()
  };
  /* Black beanie (per dc): shaded knit dome with ribbed columns curving to the crown, folded ribbed cuff, small woven tag. */
  function hatBeanie() {
    var cols = "", hi = "";
    for (var k = 28; k <= 112; k += 6) {
      var tx = 70 + (k - 70) * 0.16, qx = k + (70 - k) * 0.1;
      cols += "M" + k + " 86Q" + qx + " 52 " + tx + " 34";
      hi += "M" + (k + 2) + " 86Q" + (qx + 1.6) + " 52 " + (tx + 0.4) + " 34";
    }
    var rib = "";
    for (var j = 25; j <= 115; j += 3.6) rib += "M" + j.toFixed(1) + " 76.5v15";
    return '<g transform="translate(5.6 -13) scale(.92 1)"><radialGradient id="mp-bn-g" cx=".36" cy=".26" r=".8"><stop offset="0" stop-color="#43434c"/><stop offset=".55" stop-color="#1d1d22"/><stop offset="1" stop-color="#0c0c0f"/></radialGradient>' +
      '<linearGradient id="mp-bn-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2d34"/><stop offset="1" stop-color="#141418"/></linearGradient>' +
      '<clipPath id="mp-bn-d"><path d="M26 86A44 54 0 0 1 114 86Z"/></clipPath>' +
      '<path d="M26 86A44 54 0 0 1 114 86Z" fill="url(#mp-bn-g)"/>' +
      '<g clip-path="url(#mp-bn-d)" fill="none" stroke-linecap="round"><path d="' + cols + '" stroke="rgba(0,0,0,.42)" stroke-width="1.7"/><path d="' + hi + '" stroke="rgba(255,255,255,.06)" stroke-width="1.2"/></g>' +
      '<ellipse cx="70" cy="35" rx="7" ry="3" fill="rgba(0,0,0,.35)"/>' +
      '<path d="M24 75.5Q70 70 116 75.5" stroke="rgba(0,0,0,.5)" stroke-width="3" fill="none"/>' +
      '<rect x="21" y="74" width="98" height="20" rx="7" fill="url(#mp-bn-c)"/>' +
      '<path d="' + rib + '" stroke="rgba(0,0,0,.45)" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M24 76.2h92" stroke="rgba(255,255,255,.1)" stroke-width="1"/>' +
      '<rect x="62" y="78.5" width="16" height="10" rx="1.4" fill="#0b0b0d" stroke="rgba(255,255,255,.16)" stroke-width=".8"/><path d="M65.5 83.5h9" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-linecap="round"/></g>';
  }
  /* AirPods Max style (per dc): stainless headband frame, knit-mesh canopy, telescoping arms, silver cups with cushions and the crown. */
  function hatAirMax() {
    return '<linearGradient id="mp-am-cup" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset=".5" stop-color="#d7dae0"/><stop offset="1" stop-color="#b9bdc5"/></linearGradient>' +
      '<path d="M18 76C19 40 43 25 70 25s51 15 52 51" stroke="#b8bcc3" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M18 76C19 40 43 25 70 25s51 15 52 51" stroke="#f3f4f6" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M27 70C30 47 47 37 70 37s40 10 43 33" stroke="#e5e6e9" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<path d="M27 70C30 47 47 37 70 37s40 10 43 33" stroke="#c4c6cc" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray=".9 1.8" opacity=".55"/>' +
      '<rect x="16.6" y="66" width="2.8" height="14" rx="1.2" fill="#c3c6cc"/><rect x="120.6" y="66" width="2.8" height="14" rx="1.2" fill="#c3c6cc"/>' +
      '<rect x="4" y="78" width="27" height="39" rx="11.5" fill="url(#mp-am-cup)" stroke="#a9adb5" stroke-width=".8"/>' +
      '<rect x="109" y="78" width="27" height="39" rx="11.5" fill="url(#mp-am-cup)" stroke="#a9adb5" stroke-width=".8"/>' +
      '<rect x="25" y="81" width="9" height="33" rx="4.5" fill="#d3d4d8"/><rect x="106" y="81" width="9" height="33" rx="4.5" fill="#d3d4d8"/>' +
      '<path d="M27 83v29M108 83v29" stroke="#bfc1c6" stroke-width="1" stroke-dasharray="1 1.5"/>' +
      '<rect x="125" y="73.5" width="5.2" height="6.5" rx="2" fill="#c8cbd1" stroke="#a9adb5" stroke-width=".6"/><rect x="113.5" y="75.5" width="7" height="2.6" rx="1.3" fill="#c8cbd1"/>' +
      '<path d="M8 84c2-3 5-4 9-4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/><path d="M113 84c2-3 5-4 9-4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>';
  }
  /* ring segment for the CC: angles in degrees, clockwise on screen, a0 < a1 */
  function ccRing(cx, cy, R, r, a0, a1) {
    var p = function (rad, a) { a = a * Math.PI / 180; return (cx + rad * Math.cos(a)).toFixed(2) + " " + (cy + rad * Math.sin(a)).toFixed(2); };
    var big = a1 - a0 > 180 ? 1 : 0;
    return "M" + p(R, a0) + "A" + R + " " + R + " 0 " + big + " 1 " + p(R, a1) + "L" + p(r, a1) + "A" + r + " " + r + " 0 " + big + " 0 " + p(r, a0) + "Z";
  }
  /* Chanel Beanie (per dc, from his reference): slouchy knit, big interlocking CC, ribbed cuff with stripes. */
  var COUTURE = { ivory: ["#efe9de", "#151517", "#e3dccf"], noir: ["#1a1a1e", "#f1ebdf", "#232328"], rose: ["#f2bccb", "#161618", "#e7aabb"] };
  function hatSvg(key) {
    var m = /^(hat|couture|louis):(\w+)$/.exec(key || "");
    if (!m) return "";
    if (m[1] === "hat") return HAT_SVG[m[2]] || "";
    if (m[1] === "louis") {
      /* Louis Beanie (per dc, from his reference): checkered knit in black and charcoal with stitch texture and
         shading, ribbed checkered cuff, black patch reading MAISON / L.VUITTON / PARIS in crystal-white letters. */
      var sq = "";
      for (var y = 22; y < 74; y += 11) for (var x = 14; x < 126; x += 11) if ((Math.round((x - 14) / 11) + Math.round((y - 22) / 11)) % 2 === 0) sq += '<rect x="' + x + '" y="' + y + '" width="11" height="11"/>';
      var st = "";
      for (var yy = 25; yy < 86; yy += 3.3) { st += "M14 " + yy.toFixed(1); for (var xx = 14; xx < 126; xx += 3) st += "l1.5 1.6l1.5 -1.6"; }
      var cq = "";
      for (var cx = 21, i = 0; cx < 119; cx += 11, i++) cq += '<rect x="' + cx + '" y="' + (i % 2 ? 74 : 84) + '" width="11" height="10"/>';
      var rb = "";
      for (var q = 23; q < 118; q += 3) rb += "M" + q + " 75v18";
      return '<g transform="translate(5.6 -13) scale(.92 1)"><radialGradient id="mp-lv-s" cx=".4" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>' +
        '<clipPath id="mp-lv-d"><path d="M26 86A44 54 0 0 1 114 86Z"/></clipPath><clipPath id="mp-lv-c"><rect x="21" y="74" width="98" height="20" rx="7"/></clipPath>' +
        '<path d="M26 86A44 54 0 0 1 114 86Z" fill="#1b1b1f"/><g clip-path="url(#mp-lv-d)"><g fill="#4a4a52">' + sq + '</g><path d="' + st + '" stroke="rgba(255,255,255,.07)" stroke-width=".8" fill="none"/><path d="M26 86A44 54 0 0 1 114 86Z" fill="url(#mp-lv-s)"/></g>' +
        '<path d="M24 75.5Q70 70 116 75.5" stroke="rgba(0,0,0,.55)" stroke-width="3" fill="none"/>' +
        '<rect x="21" y="74" width="98" height="20" rx="7" fill="#1b1b1f"/><g clip-path="url(#mp-lv-c)"><g fill="#4a4a52">' + cq + '</g><path d="' + rb + '" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><rect x="21" y="74" width="98" height="20" fill="url(#mp-lv-s)" opacity=".6"/></g>' +
        '<rect x="86" y="75.6" width="29" height="16.6" rx="1.6" fill="#0b0b0d" stroke="rgba(255,255,255,.18)" stroke-width=".7"/>' +
        '<g fill="#eef1f6" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="3.9" text-anchor="middle" letter-spacing=".25"><text x="100.5" y="80.6">MAISON</text><text x="100.5" y="85.4">L.VUITTON</text><text x="100.5" y="90.2">PARIS</text></g></g>';
    }
    var c = COUTURE[m[2]] || COUTURE.ivory, knit = "";
    for (var k = 34; k <= 106; k += 8) knit += "M" + k + " 84V" + (k < 70 ? 40 + (70 - k) * 0.55 : 40 + (k - 70) * 0.55);
    var rib = "";
    for (var j = 27; j <= 113; j += 5) rib += "M" + j + " 79v11";
    return '<g transform="translate(5.6 -15) scale(.92 1.02)"><clipPath id="mp-cc-' + m[2] + '"><path d="M26 86C24 52 40 26 70 24s48 28 44 62Z"/></clipPath>' +
      '<path d="M26 86C24 52 40 26 70 24s48 28 44 62Z" fill="' + c[0] + '"/>' +
      '<path d="' + knit + '" stroke="' + c[2] + '" stroke-width="2.2" stroke-linecap="round" clip-path="url(#mp-cc-' + m[2] + ')"/>' +
      /* interlocking back-to-back CC: right C, then left C over it at the top, then the right C over it at the bottom */
      '<clipPath id="mp-cx-' + m[2] + '"><rect x="62" y="57" width="16" height="16"/></clipPath>' +
      '<g fill="' + c[1] + '" stroke="' + c[0] + '" stroke-width="1.3" paint-order="stroke"><path d="' + ccRing(78.5, 57, 13.5, 8.2, 44, 316) + '"/><path d="' + ccRing(61.5, 57, 13.5, 8.2, 224, 496) + '"/>' +
      '<path d="' + ccRing(78.5, 57, 13.5, 8.2, 44, 316) + '" clip-path="url(#mp-cx-' + m[2] + ')"/></g>' +
      '<rect x="22" y="74" width="96" height="20" rx="4" fill="' + c[0] + '"/><path d="' + rib + '" stroke="' + c[2] + '" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="22" y="74" width="96" height="3.6" fill="' + c[1] + '"/><rect x="22" y="91" width="96" height="3" rx="1.5" fill="' + c[1] + '"/></g>';
  }
  function mpHatInto(w, key) {
    if (!w) return;
    var old = w.querySelector(":scope > .mp-hat");
    if (!key) { old && old.remove(); return; }
    if (old && old.getAttribute("data-hat") === key) return;
    old && old.remove();
    var svg = hatSvg(key);
    if (!svg) return;
    var h = document.createElement("i");
    h.className = "mp-hat";
    h.setAttribute("data-hat", key);
    h.setAttribute("aria-hidden", "true");
    h.innerHTML = '<svg viewBox="0 0 140 145" focusable="false">' + svg + "</svg>";
    w.appendChild(h);
  }
  function mpPwApply(el, user, look) {
    var pw = look !== void 0 ? look : PW[pwKey(user)] || null;
    PW_KEYS.forEach(function (k) {
      var v = pw && pw[k], c = typeof v === "string" && v.charAt(0) === "#" && !PW_NOCOLOR[k] ? v : null;
      el.classList.toggle("pw-" + k, !!v);
      c ? el.style.setProperty("--pw-" + k, c) : el.style.removeProperty("--pw-" + k);
    });
    pw && pw.rgb ? el.setAttribute("data-rgb", pw.rgb) : el.removeAttribute("data-rgb");
    var ch = (pw && pw.charms) || [];
    var hatKey = pw && pw.couture ? "couture:" + pw.couture : pw && pw.louis ? "louis:1" : pw && pw.hat ? "hat:" + pw.hat : "";
    if (el.classList.contains("mp-pb-av")) mpHatInto(el, hatKey);
    pw && pw.melt && mpMeltFilter();
    if (el.classList.contains("mp-pb-name")) { mpCharmsInto(el, el.querySelector(".mp-pb-name-t"), ch); mpMeltText(el.querySelector(".mp-pb-name-t")); }
    else if (el.classList.contains("chat-msg")) {
      var put = function () { var h = el.querySelector(".chat-msg-head"); h && (mpCharmsInto(h, h.querySelector("strong"), ch), mpMeltText(h.querySelector("strong"))); mpHatInto(el.querySelector(".chat-avatar-wrap"), hatKey); };
      el.querySelector(".chat-msg-head") ? put() : setTimeout(put, 0);
    }
  }
  var PW_NOCOLOR = { echo: 1 };
  function mpMeltText(n) { n && n.setAttribute("data-text", n.textContent || ""); }
  /* Melt: an SVG noise filter wobbles the letters while a stretched, masked copy drips below them. */
  function mpMeltFilter() {
    if (document.getElementById("mp-melt-f")) return;
    var d = document.createElement("div");
    d.innerHTML = '<svg id="mp-melt-f" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><filter id="mp-goo" x="-20%" y="-40%" width="140%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.3" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="mp-melt" x="-10%" y="-30%" width="120%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.11" numOctaves="2" seed="7" result="n"><animate attributeName="baseFrequency" dur="7s" values="0.012 0.11;0.018 0.16;0.012 0.11" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
    document.body.appendChild(d.firstChild);
  }
  /* Charms (per dc, replacing badges): next to the name in chat and the profile view. */
  var GEM = { diamond: ["#e9fbff", "#9be7ff", "#4fb7e8"], emerald: ["#c9ffe0", "#2ecc71", "#138a49"], ruby: ["#ffd0dc", "#e0115f", "#8f0a3b"] };
  function mpCharm(id) {
    var g = GEM[id], t = { verified: "07", member: "VIP", kitty: "Hello Kitty", mask: "Sleep mask", robot: "Bot", diamond: "Diamond", emerald: "Emerald", ruby: "Ruby" }[id] || id, inner;
    if (g) inner = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10l4 5.2L12 20.5 3 8.7z" fill="' + g[1] + '"/><path d="M3 8.7h18L12 20.5z" fill="' + g[2] + '" opacity=".55"/><path d="M7 3.5 9.5 8.7 12 3.5l2.5 5.2L17 3.5" fill="none" stroke="' + g[0] + '" stroke-width="1.2" stroke-linejoin="round"/><path d="M9.5 8.7 12 20.5l2.5-11.8" fill="none" stroke="' + g[0] + '" stroke-width="1" opacity=".8"/></svg>';
    else if (id === "member") inner = '<svg viewBox="2.3 2.3 19.4 18.5" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill="#f5bf45" stroke="#f5bf45" stroke-width="2" stroke-linejoin="round"/></svg>';
    else inner = M(id);
    return '<span class="mp-charm mp-charm-' + x(id) + '" title="' + x(t) + '" role="img" aria-label="' + x(t) + ' charm">' + inner + "</span>";
  }
  function mpCharmsInto(host, after, list) {
    var old = host.querySelector(":scope > .mp-charms");
    old && old.remove();
    /* only gem charms by the name; badges stay on the avatar (per dc) */
    list = (list || []).filter(function (c) { return !!GEM[c]; });
    if (!list || !list.length) return;
    var w = document.createElement("span");
    w.className = "mp-charms";
    w.innerHTML = list.map(mpCharm).join("");
    after && after.nextSibling ? host.insertBefore(w, after.nextSibling) : host.appendChild(w);
  }
  function mpPwRefresh(user) {
    document.querySelectorAll(".chat-msg[data-user]").forEach(function (m) {
      var u = m.getAttribute("data-user");
      (!user || pwKey(u) === pwKey(user)) && mpPwApply(m, u);
    });
  }
  function mpPwMerge(map, reset) {
    reset && (PW = Object.create(null));
    for (var k in map) PW[pwKey(k)] = map[k];
    mpPwRefresh();
  }
  function mpPwTake(e) { e && e.user && "pw" in e && (PW[pwKey(e.user)] = e.pw || null); }
  function mpPwSet(user, pw) { PW[pwKey(user)] = pw || null; mpPwRefresh(user); }
  function mpPwFromProfile(u) {
    var out = {}, st = (u && u.powerSettings) || {};
    ((u && u.powersOn) || []).forEach(function (id) {
      var s1 = st[id] || {}, c = s1.color ? PW_COLORS[s1.color] || (/^#[0-9a-f]{6}$/i.test(s1.color) ? s1.color : null) : null;
      out[id] = id === "hat" ? s1.style || "beanie" : id === "couture" ? s1.color || "ivory" : c || (id === "rgb" ? s1.speed || "slow" : 1);
    });
    out.couture && (delete out.hat, delete out.louis);
    out.louis && delete out.hat;
    out.aura && st.aura && st.aura.match === "bubble" && out.bubble && (out.aura = out.bubble);
    var ch = ((u && u.badges) || []).filter(function (b) { return ["verified", "member", "kitty", "mask", "robot"].indexOf(b) >= 0; });
    u && u.verified && ch.indexOf("verified") < 0 && ch.unshift("verified");
    ["diamond", "emerald", "ruby"].forEach(function (g) { out[g] && ch.push(g); });
    ch.length && (out.charms = ch);
    return out;
  }
  window.MPOpenMyProfileView = function () {
    if (!s) return !1;
    vt();
    var n = 0;
    (function expand() {
      var o = document.querySelector(".mp-profile-summary-open");
      if (o) return void o.click();
      ++n < 30 && setTimeout(expand, 80);
    })();
    return !0;
  };
  /* Own messages show your name and time above the bubble, like everyone else's (per dc). */
  function mpRelTime(ts) {
    if (!ts) return "";
    var t = Math.max(1, Math.floor((Date.now() - ts) / 1e3));
    if (t < 60) return t + "s";
    var n = Math.floor(t / 60);
    if (n < 60) return n + "m";
    var a = Math.floor(n / 60);
    if (a < 24) return a + "h";
    var r = Math.floor(a / 24);
    return r < 7 ? r + "d" : new Date(ts).toLocaleDateString();
  }
  function mpMineMain(o, e) {
    var w = document.createElement("div"), h = document.createElement("div"), nm = document.createElement("strong"), tm = document.createElement("span");
    w.className = "chat-msg-main is-mine";
    h.className = "chat-msg-head";
    nm.textContent = mpName(e.user) || "";
    tm.className = "chat-time";
    tm.textContent = mpRelTime(e.ts);
    h.appendChild(nm);
    h.appendChild(tm);
    w.appendChild(h);
    o.appendChild(w);
    return w;
  }
  function mpStar(c) { return window.MPStar ? MPStar(c) : '<span class="mp-star' + (c ? " " + c : "") + '" aria-hidden="true">★</span>'; }
  /* Tapping an @mention in a chat bubble opens that person's compact profile card in the top bar (per dc). */
  function mpMentionOpen(e) {
    var m = e.target && e.target.closest && e.target.closest(".chat-msg .chat-mention[data-u]");
    if (!m) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    mpPB(m.getAttribute("data-u"), window.MPProfiles && MPProfiles.topBar ? MPProfiles.topBar() : null);
  }
  document.addEventListener("click", mpMentionOpen, true);
  document.addEventListener("keydown", mpMentionOpen, true);
  function mpPB(u, anchor) {
    if (!u) return;
    if (!anchor || !anchor.isConnected) anchor = MPProfiles.topBar();
    if (!anchor) return;
    if (mpPBel && String(mpPBel._u).toLowerCase() === String(u).toLowerCase()) return mpPBclose();
    mpPBclose(!0);
    var route = location.hash, rq = ++mpPBreq,
      cached = mpPBget(u);
    if (cached) mpPBshow(cached, anchor, rq, !0, u);
    E("/api/user/" + encodeURIComponent(u))
      .then(function (t) {
        if (rq !== mpPBreq || route !== location.hash || !(t && t.ok && t.user) || !anchor.isConnected) return;
        mpPBput(t.user);
        mpPBshow(t.user, anchor, rq, !1, u);
      })
      .catch(function () {});
  }
  var mpPM = { on: !1, to: null, lp: 0 };
  function mpPMEnable() {
    mpPM.on = !0;
  }
  function mpPMRow() {
    return document.querySelector("#chat .chat-inputrow");
  }
  var MP_IC = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  /* Typing !username mutes or unmutes that user (per dc); nothing is sent. */
  function mpBangMute(text) {
    var m = /^!([a-z0-9_]{1,16})$/i.exec(text);
    if (!m || !window.mpHide) return !1;
    var u = m[1].toLowerCase();
    if (s && u === String(s.username).toLowerCase()) return mpHide.toast("You can't mute yourself"), !0;
    mpHide.is(u) ? (mpHide.unhide(u), mpHide.toast(mpAt(u) + " is unmuted")) : mpHideUser(u);
    return !0;
  }
  function mpHideUser(u, id) {
    mpHide.hide(u, id);
    window.haptic && window.haptic(12);
    mpPM.to && String(mpPM.to).toLowerCase() === String(u).toLowerCase() && mpPMStop();
    mpHide.toast(mpAt(u) + " is hidden", function () { mpHide.unhide(u); mpHide.toast(mpAt(u) + " is visible again"); });
  }
  function mpAvMenu(el, u) {
    var items = [];
    mpPM.on && s && items.push({ label: "Whisper", icon: "<svg " + MP_IC + '><path d="M21.9918 12.8046C21.9851 13.0352 21.9745 13.2648 21.9598 13.4922C21.6856 17.7346 18.3536 21.1138 14.1706 21.3919C13.4574 21.4393 12.7285 21.5013 12 21.5013C10.4054 21.5013 8.95127 21.3641 7.44544 20.7906C7.44544 20.7906 5.56108 22.2592 3.69962 21.959H3.69961C3.31008 21.8962 3.11532 21.8648 3.00091 21.6347C2.8865 21.4046 3.00788 21.176 3.25063 20.7189C3.65964 19.9487 3.92248 19.174 3.80076 18.3309C3.73703 17.8895 3.50433 17.4977 3.27644 17.114L3.26529 17.0952C2.62637 16.0191 2.12462 14.7979 2.04024 13.4922C1.98659 12.662 1.98659 11.8023 2.04024 10.9721C2.31441 6.72972 5.64639 3.35048 9.8294 3.07242C11.1415 2.9852 12.5095 2.97817 13.8327 3.05179"/><path d="M16.75 5.50134V4.00134C16.75 2.89677 17.6454 2.00134 18.75 2.00134C19.8546 2.00134 20.75 2.89677 20.75 4.00134V5.50134M17.5 10.0013H20C20.9428 10.0013 21.4142 10.0013 21.7071 9.70845C22 9.41556 22 8.94415 22 8.00134V7.50134C22 6.55853 22 6.08713 21.7071 5.79424C21.4142 5.50134 20.9428 5.50134 20 5.50134H17.5C16.5572 5.50134 16.0858 5.50134 15.7929 5.79424C15.5 6.08713 15.5 6.55853 15.5 7.50134V8.00134C15.5 8.94415 15.5 9.41556 15.7929 9.70845C16.0858 10.0013 16.5572 10.0013 17.5 10.0013Z"/><path d="M8.75 15.0013H15.25M8.75 10.0013H12.25"/></svg>', run: function () { mpPMStart(u); } });
    items.push({ label: "Hide", danger: !0, icon: "<svg " + MP_IC + '><path d="M2.25 12C2.25 17.5228 6.72715 22 12.25 22C17.7728 22 22.25 17.5228 22.25 12C22.25 6.47715 17.7728 2 12.25 2C6.72715 2 2.25 6.47715 2.25 12Z"/><path d="M5.25 5L19.25 19"/></svg>', run: function () { mpHideUser(u); } });
    mpHide.menu(el, items);
  }
  window.addEventListener("mp-hidden-change", function () {
    try { Object.keys(De).forEach(function (id) { De[id] && De[id].reactions && we(id, De[id].reactions); }); } catch (e) {}
  });
  function mpPMStart(e) {
    mpPM.to = e;
    // A profile on Globe must reveal Chat before focusing its private composer.
    if (!document.querySelector('#journal.on')) {
      if (window.MPNav && MPNav.show) MPNav.show('journal');
      else location.hash = '#chat';
    }
    var t = mpPMRow();
    if (t) {
      var n = t.querySelector(".chat-pm-chip");
      (n ||
        (((n = document.createElement("div")).className = "chat-pm-chip"),
        (n.innerHTML =
          '<svg class="chat-pm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M12 14.5V17.5M13 14.5C13 15.0523 12.5523 15.5 12 15.5C11.4477 15.5 11 15.0523 11 14.5C11 13.9477 11.4477 13.5 12 13.5C12.5523 13.5 13 13.9477 13 14.5Z"/><path d="M16.5 9V6.5C16.5 4.01472 14.4853 2 12 2C9.51471 2 7.49999 4.01472 7.49999 6.5V9"/><path d="M4.2678 18.8447C4.49268 20.515 5.87612 21.8235 7.55965 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.8789 17.7547 20 16.6376 20 15.5C20 14.3624 19.8789 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55965 9.09909C5.87612 9.17649 4.49268 10.485 4.2678 12.1553C4.12104 13.2453 3.99999 14.3624 3.99999 15.5C3.99999 16.6376 4.12104 17.7547 4.2678 18.8447Z"/></svg><span class="chat-pm-txt"></span><button type="button" class="chat-pm-x" aria-label="Cancel private message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg></button>'),
        n.querySelector(".chat-pm-x").addEventListener("click", function (e) {
          (e.preventDefault(), mpPMStop());
        }),
        t.appendChild(n)),
        (n.querySelector(".chat-pm-txt").textContent = "Only " + mpAt(e) + " can see this message"),
        t.classList.add("chat-pm-mode"));
      var m = document.querySelector("#chat .chat-msgs"),
        b = document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 200;
      (m && m.style.setProperty("--pm-h", "46px"), b && setTimeout(function () { window.scrollTo(0, document.documentElement.scrollHeight); }, 30));
      var a = t.querySelector(".chat-inputbar input");
      a && (a.setAttribute("placeholder", "Whisper to " + mpAt(e)), a.focus());
    }
  }
  function mpPMStop() {
    mpPM.to = null;
    var e = mpPMRow();
    if (e) {
      var t = e.querySelector(".chat-pm-chip");
      (t && t.remove(), e.classList.remove("chat-pm-mode"));
      var m = document.querySelector("#chat .chat-msgs");
      m && m.style.setProperty("--pm-h", "0px");
      var n = e.querySelector(".chat-inputbar input");
      n && n.setAttribute("placeholder", "Message");
    }
  }
  function mpPMCaption(e, t) {
    if (!e.querySelector(".chat-pm-cap")) {
      var n = document.createElement("div");
      n.className = "chat-pm-cap";
      var a = s && t.to && String(t.to).toLowerCase() === String(s.username).toLowerCase();
      n.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="10" height="10" aria-hidden="true"><path d="M12 14.5V17.5M13 14.5C13 15.0523 12.5523 15.5 12 15.5C11.4477 15.5 11 15.0523 11 14.5C11 13.9477 11.4477 13.5 12 13.5C12.5523 13.5 13 13.9477 13 14.5Z"/><path d="M16.5 9V6.5C16.5 4.01472 14.4853 2 12 2C9.51471 2 7.49999 4.01472 7.49999 6.5V9"/><path d="M4.2678 18.8447C4.49268 20.515 5.87612 21.8235 7.55965 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.8789 17.7547 20 16.6376 20 15.5C20 14.3624 19.8789 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55965 9.09909C5.87612 9.17649 4.49268 10.485 4.2678 12.1553C4.12104 13.2453 3.99999 14.3624 3.99999 15.5C3.99999 16.6376 4.12104 17.7547 4.2678 18.8447Z"/></svg>';
      var r = document.createElement("span");
      ((r.textContent = a ? "Only visible to you" : "Only visible to " + mpAt(t.to || "")), n.appendChild(r));
      var o = e.querySelector(".chat-msg-main") || e.querySelector(".chat-photo-col") || e;
      if (o === e) {
        var i = e.querySelector(".chat-bubble");
        i && i.parentNode === e ? i.appendChild(n) : e.appendChild(n);
      } else o.appendChild(n);
    }
  }
  function ee(e, t) {
    (e.classList.add("chat-avatar-click"),
      e.setAttribute("role", "button"),
      e.setAttribute("tabindex", "0"),
      e.setAttribute("aria-label", "View " + t + "'s profile"));
    var n = function (e) {
      if (Date.now() - mpPM.lp < 700) return void (e && (e.stopPropagation(), e.preventDefault()));
      (e && e.stopPropagation(), mpPB(t, avEl));
    };
    /* long-press an avatar = whisper to that user (per dc; only once the Worker supports it) */
    var lpT = null,
      lpXY = null,
      avEl = e,
      lpGo = function (e) {
        if (t && s && t.toLowerCase() === String(s.username).toLowerCase()) {
          /* own avatar: long-press does nothing (and must not fall through to the profile tap) */
          clearTimeout(lpT);
          lpT = setTimeout(function () { mpPM.lp = Date.now(); }, 480);
          return;
        }
        if (t) {
          var n = (e.touches && e.touches[0]) || e;
          ((lpXY = [n.clientX, n.clientY]),
            clearTimeout(lpT),
            (lpT = setTimeout(function () {
              ((mpPM.lp = Date.now()), window.haptic && window.haptic(20), mpAvMenu(avEl, t));
            }, 480)));
        }
      },
      lpMv = function (e) {
        var t = (e.touches && e.touches[0]) || e;
        lpXY && (Math.abs(t.clientX - lpXY[0]) > 10 || Math.abs(t.clientY - lpXY[1]) > 10) && clearTimeout(lpT);
      },
      lpEnd = function () {
        clearTimeout(lpT);
      };
    (e.addEventListener("touchstart", lpGo, { passive: !0 }),
      e.addEventListener("touchmove", lpMv, { passive: !0 }),
      e.addEventListener("touchend", lpEnd),
      e.addEventListener("touchcancel", lpEnd),
      e.addEventListener("mousedown", lpGo),
      e.addEventListener("mouseup", lpEnd),
      e.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      }),
      e.addEventListener("click", n),
      e.addEventListener("keydown", function (e) {
        ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), n(e));
      }));
  }
  function te(e) {
    var t = c.querySelector(".chat-points-num");
    t && (t.textContent = e);
  }
  function ne(e) {
    if (e) {
      var t = e.querySelector(".chat-avatar-wrap");
      if (t) {
        var n = t.querySelector(".chat-badge, .chat-verified, .chat-badge-kitty, .chat-badge-mask");
        n && n.remove();
        var a = P(s);
        a && t.insertAdjacentHTML("beforeend", a);
      }
      mpAuthEmit();
    }
  }
  /* Auth state for other modules (shop Globe tile): window.MPAuthUser is the
     signed-in user or null, and "mp-auth" fires on every sign-in/out render. */
  function mpAuthEmit() {
    try {
      window.MPAuthUser = s || null;
      document.dispatchEvent(new CustomEvent("mp-auth", { detail: { user: s || null } }));
    } catch (e) {}
  }
  function ae() {
    (mt(),
      (s = null),
      mpAuthEmit(),
      (c.innerHTML =
        '<div class="chat-head glassbar"><div class="chat-title">Chat</div><div class="chat-head-right"><button type="button" class="btn chat-topbar-signin" id="chat-signin-top">Sign in</button></div></div><div class="chat-auth"><div class="chat-auth-head"><div class="chat-auth-title">Your account gets you exclusive access to everything Misery</div><div class="chat-auth-sub">Don\'t want to sign in or sign up? <a href="#" class="chat-auth-forum">Browse the forum</a> or <a href="#" class="chat-auth-shop">view our webstore</a> instead.</div></div><div class="chat-card"><div class="chat-tabs" data-active="login"><span class="chat-tabs-slider"></span><button type="button" class="on" data-tab="login">Sign in</button><button type="button" data-tab="register">Sign up</button></div><label class="chat-field"><span>Username</span><input type="text" name="username" maxlength="16" autocomplete="off" autocapitalize="none" spellcheck="false" readonly data-ro-unlock></label><label class="chat-field"><span>Password</span><input type="password" name="password" maxlength="72" autocomplete="off" readonly data-ro-unlock></label><div class="pwd-strength" hidden><div class="pwd-bars"><span></span><span></span><span></span><span></span></div><div class="pwd-labels"><span>Strength</span><span class="pwd-level"></span></div></div><label class="chat-field chat-secret hidden"><span>Owner secret</span><input type="password" name="secret" autocomplete="off"></label><div class="chat-err" role="alert"></div><div class="cf-turnstile-wrap" hidden><div class="cf-turnstile" data-sitekey="0x4AAAAAAFV46HnTH3nPGGRk" data-theme="auto"></div></div><button type="button" class="btn accent chat-submit">Sign in</button><button type="button" class="btn chat-xbtn"><span class="chat-xlogo">' +
        a +
        "</span>Continue with X</button><button type='button' class='chat-forgot'>Forgot password?</button></div></div>"));
    var e = "login",
      o = c.querySelector(".chat-err"),
      l = c.querySelector('input[name="username"]'),
      u = c.querySelector('input[name="password"]'),
      m = c.querySelector(".pwd-strength"),
      p = m ? m.querySelectorAll(".pwd-bars span") : [],
      h = m ? m.querySelector(".pwd-level") : null,
      v = ["Weak", "Fair", "Good", "Strong"],
      f = ["#FF7A7A", "#F59E0B", "#38BDF8", "#6EE7B7"];
    function g() {
      if (m) {
        var t = "register" === e,
          n = u.value;
        if (t && n) {
          m.hidden = !1;
          for (
            var a = (function (e) {
                if (!e) return 0;
                var t = 0;
                return (
                  e.length >= 8 && (t += 1),
                  /[A-Z]/.test(e) && (t += 1),
                  /[0-9]/.test(e) && (t += 1),
                  /[^A-Za-z0-9]/.test(e) && (t += 1),
                  t
                );
              })(n),
              r = 0;
            r < p.length;
            r++
          )
            p[r].style.background = r < a ? f[a - 1] : "";
          h && ((h.textContent = v[a - 1] || "Weak"), (h.style.color = a > 0 ? f[a - 1] : ""));
        } else m.hidden = !0;
      }
    }
    u.addEventListener("input", g);
    var b = c.querySelector(".chat-secret"),
      y = c.querySelector('input[name="secret"]'),
      w = c.querySelector(".chat-submit");
    function C(e) {
      o.textContent = e || "";
    }
    function x() {
      var t = "register" === e && "dc" === l.value.trim().toLowerCase();
      b.classList.toggle("hidden", !t);
    }
    var k = c.querySelector(".chat-tabs"),
      L = c.querySelector(".chat-tabs-slider");
    var slideLayout="";
    function S(animate) {
      if(!k||!L)return false;
      var button=k.querySelector('button.on')||k.querySelector('button'),width=button&&button.offsetWidth;
      if(!width)return false;
      var height=button.offsetHeight,left=button.offsetLeft,top=button.offsetTop;
      var layout=[width,height,left,top].join('|');
      if(layout===slideLayout)return true;slideLayout=layout;
      if(!animate)L.classList.add('no-anim');
      L.style.width=width+'px';L.style.height=height+'px';
      L.style.transform='translate3d('+(left-3)+'px,'+(top-3)+'px,0)';
      if(!animate){void L.offsetWidth;L.classList.remove('no-anim');}
      return true;
    }
    if (
      (S(false),
      window.ResizeObserver && k
        ? new ResizeObserver(function () { S(false); }).observe(k)
        : (window.addEventListener("resize",function(){S(false);}),
          new MutationObserver(function(){S(false);}).observe(document.getElementById('journal'),{attributes:true,attributeFilter:['class']})),
      !document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]'))
    ) {
      // Turnstile loads only once the sign-in card is actually on screen
      // (Chat tab open), not on every page load / every tab.
      var T = function () {
          if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) return;
          var t = document.createElement("script");
          ((t.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"),
            (t.async = !0),
            (t.defer = !0),
            document.head.appendChild(t));
        },
        Tc = c.querySelector(".chat-card") || c;
      if (window.IntersectionObserver) {
        var To = new IntersectionObserver(function (t) {
          t.some(function (e) {
            return e.isIntersecting;
          }) && (To.disconnect(), T());
        });
        To.observe(Tc);
      } else T();
    }
    var A = c.querySelector(".cf-turnstile-wrap");
    /* Turnstile only auto-renders when its script first loads. After sign-out the card is rebuilt and the
       script is already there, so render the widget ourselves whenever Sign up shows it empty. */
    function tsEnsure(wrap, tries) {
      var el = wrap && wrap.querySelector(".cf-turnstile");
      if (!el || el.querySelector("iframe") || el.getAttribute("data-mp-rendered") === "1") return;
      if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
        var t0 = document.createElement("script");
        t0.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        t0.async = !0;
        document.head.appendChild(t0);
      }
      if (!window.turnstile || !window.turnstile.render) {
        (tries || 0) < 40 && setTimeout(function () { tsEnsure(wrap, (tries || 0) + 1); }, 150);
        return;
      }
      if (el.querySelector("iframe")) return;
      try {
        el.setAttribute("data-mp-rendered", "1");
        window.turnstile.render(el, { sitekey: el.getAttribute("data-sitekey"), theme: el.getAttribute("data-theme") || "auto" });
      } catch (e) { el.removeAttribute("data-mp-rendered"); }
    }
    c.querySelectorAll(".chat-tabs button").forEach(function (t) {
      t.addEventListener("click", function () {
        var n,
          a = "register" === (e = t.getAttribute("data-tab"));
        (A && (A.hidden = !a), a && tsEnsure(A),
          c.querySelectorAll(".chat-tabs button").forEach(function (e) {
            e.classList.toggle("on", e === t);
          }),
          (n = a),
          k && k.setAttribute("data-active", n ? "register" : "login"),
          S(!0),
          (w.textContent = a ? "Sign up" : "Sign in"),
          Fg && (Fg.hidden = a),
          C(""),
          x(),
          g());
      });
    });
    var N = c.querySelector(".chat-auth-forum");
    N &&
      N.addEventListener("click", function (e) {
        e.preventDefault();
        var t = document.querySelector('[data-view="forum"]');
        t && t.click();
      });
    var P = c.querySelector(".chat-auth-shop");
    P &&
      P.addEventListener("click", function (e) {
        e.preventDefault();
        var t = document.querySelector('[data-view="shop"]');
        t && t.click();
      });
    var I = c.querySelector("#chat-signin-top"),
      Fg = c.querySelector(".chat-forgot");
    Fg &&
      Fg.addEventListener("click", function () {
        rcOpenRecover(l.value.trim());
      });
    function q() {
      var t = l.value.trim(),
        n = u.value;
      if ((C(""), "register" !== e || /^[a-zA-Z0-9_]{3,16}$/.test(t) || "l" === t.toLowerCase()))
        if (t)
          if (!n || n.length < 8) C("Password must be at least 8 characters.");
          else {
            var a = { username: t, password: n, deviceId: i() };
            if ("register" === e) {
              ("dc" === t.toLowerCase() && (a.secret = y.value));
              try {
                document.querySelector(".cf-turnstile-wrap:not([hidden]) iframe");
                if (window.turnstile) {
                  var o = window.turnstile.getResponse();
                  o && (a.turnstileToken = o);
                }
              } catch (e) {}
              if (!a.turnstileToken) return void C("Please complete the security check.");
            }
            ((w.disabled = !0),
              E("login" === e ? "/api/login" : "/api/register", { method: "POST", body: a })
                .then(function (e) {
                  if (((w.disabled = !1), e && e.ok)) {
                    d = e.token;
                    try {
                      localStorage.setItem(r, d);
                    } catch (e) {}
                    ((s = e.user), window.mpHide && mpHide.setViewer(s.username), ke());
                    e.recoveryCode
                      ? rcShowCode(e.recoveryCode, s.username, {
                          eyebrow: "",
                        })
                      : (rcResetNotice(e.pwResetAt), rcMaybePrompt());
                  } else {
                    C((e && e.error) || "Something went wrong.");
                    try {
                      window.turnstile && window.turnstile.reset();
                    } catch (e) {}
                  }
                })
                .catch(function () {
                  ((w.disabled = !1), C("Couldn't reach the chat server. Try again."));
                }));
          }
        else C("Enter your username.");
      else C("Username must be 3–16 characters: letters, numbers, _");
    }
    (I &&
      I.addEventListener("click", function () {
        var e = c.querySelector('[data-tab="login"]');
        (e && e.click(), l && l.focus());
      }),
      l.addEventListener("input", x),
      w.addEventListener("click", q));
    var O = c.querySelector(".chat-xbtn");
    if (O) {
        O.addEventListener("click", function () {
          O.disabled = !0;
          // Turnstile is lazy-loaded with the sign-in card, so give it up to
          // ~4 s to produce a token (new X accounts need one) before going.
          var tries = 0;
          (function waitTs() {
            var tk = "";
            try {
              window.turnstile && (tk = window.turnstile.getResponse() || "");
            } catch (e) {}
            if (!tk && tries++ < 16) return void setTimeout(waitTs, 250);
            startX(tk ? { turnstileToken: tk } : {});
          })();
        });
      function startX(e) {
          E("/api/x/pkce-start", { method: "POST", body: e })
            .then(function (e) {
              if (e && e.ok) {
                try {
                  sessionStorage.setItem("x_state", e.state);
                } catch (e) {}
                try {
                  localStorage.setItem("x_state", e.state);
                } catch (e) {}
                if (e.pollKey)
                  try {
                    localStorage.setItem(
                      "x_poll",
                      JSON.stringify({ state: e.state, pollKey: e.pollKey, ts: Date.now() }),
                    );
                  } catch (e) {}
                var a = e.state + "." + i(),
                  r =
                    "https://x.com/i/oauth2/authorize?response_type=code&client_id=" +
                    encodeURIComponent(t) +
                    "&redirect_uri=" +
                    encodeURIComponent(n) +
                    "&scope=" +
                    encodeURIComponent("users.read tweet.read") +
                    "&state=" +
                    encodeURIComponent(a) +
                    "&code_challenge=" +
                    encodeURIComponent(e.codeChallenge) +
                    "&code_challenge_method=S256";
                location.href = r;
              } else O.disabled = !1;
            })
            .catch(function () {
              O.disabled = !1;
            });
      }
    }
    if (
      (u.addEventListener("keydown", function (e) {
        "Enter" === e.key && q();
      }),
      l.addEventListener("keydown", function (e) {
        "Enter" === e.key && (e.preventDefault(), u.focus());
      }),
      window.MPNav && MPNav.refreshTitle)
    )
      try {
        MPNav.refreshTitle();
      } catch (e) {}
  }
  (Y(),
    document._chatBellDelegated ||
      ((document._chatBellDelegated = !0),
      document.addEventListener("click", function (e) {
        e.target &&
          e.target.closest &&
          e.target.closest("#chat-bell") &&
          (e.stopPropagation(),
          (function () {
            if (window.MPForum && MPForum.showNotifications)
              return void MPForum.showNotifications();
            if (!document.querySelector('script[src*="forum3.js"]')) {
              var e = document.createElement("script");
              ((e.src = "js/forum3.js"), (e.async = !1), document.head.appendChild(e));
            }
            var t = 0,
              n = setInterval(function () {
                (t++,
                  window.MPForum && MPForum.showNotifications
                    ? (clearInterval(n), MPForum.showNotifications())
                    : t > 50 && clearInterval(n));
              }, 200);
          })());
      })));
  var re = ["♥️", "👍🏼", "👎🏼"],
    oe = { "♥️": "Love", "👍🏼": "Like", "👎🏼": "Dislike" };
  function ie(e, t) {
    return "♥️" === e
      ? t
        ? "/img/react-heart-navy.svg?v=1"
        : "/img/react-heart.svg?v=1"
      : "👍🏼" === e
        ? t
          ? "/img/react-thumbsup-navy.png?v=1"
          : "/img/react-thumbsup-white.png?v=1"
        : "👎🏼" === e
          ? t
            ? "/img/react-thumbsdown-navy.png?v=1"
            : "/img/react-thumbsdown-white.png?v=1"
          : "";
  }
  function ce() {
    try {
      return "light" === document.documentElement.getAttribute("data-theme");
    } catch (e) {
      return !1;
    }
  }
  function se(e, t) {
    var n = ie(e, ce());
    return n
      ? '<img class="chat-react-ico" data-react="' +
          ("♥️" === e ? "heart" : "👍🏼" === e ? "up" : "down") +
          '" src="' +
          n +
          '" width="' +
          t +
          '" height="' +
          t +
          '" alt="" draggable="false">'
      : "";
  }
  (!(function () {
    try {
      var e = { heart: "♥️", up: "👍🏼", down: "👎🏼" };
      new MutationObserver(function () {
        var t = ce();
        document.querySelectorAll("img.chat-react-ico[data-react]").forEach(function (n) {
          var a = ie(e[n.getAttribute("data-react")] || "", t);
          a && n.getAttribute("src") !== a && n.setAttribute("src", a);
        });
      }).observe(document.documentElement, { attributes: !0, attributeFilter: ["data-theme"] });
    } catch (e) {}
  })(),
    [
      "react-heart.svg?v=1",
      "react-heart-navy.svg?v=1",
      "react-thumbsup-white.png?v=1",
      "react-thumbsup-navy.png?v=1",
      "react-thumbsdown-white.png?v=1",
      "react-thumbsdown-navy.png?v=1",
    ].forEach(function (e) {
      try {
        new Image().src = "/img/" + e;
      } catch (e) {}
    }));
  var le = null,
    de = null,
    ue = null,
    me = null,
    pe = null,
    he = null,
    ve = 0,
    fe = 0,
    ge = !1;
  function be(e) {
    if (!e) return "";
    e = window.mpHide ? mpHide.filt(e) : e;
    var t = {};
    Object.keys(e).forEach(function (n) {
      var a = e[n];
      t[a] = (t[a] || 0) + 1;
    });
    var n = [];
    return (
      re.forEach(function (e) {
        t[e] &&
          n.push(
            '<span class="chat-react-group">' +
              se(e, 14) +
              (t[e] > 1 ? '<span class="chat-react-count">' + t[e] + "</span>" : "") +
              "</span>",
          );
      }),
      n.join("")
    );
  }
  function ye(e, t) {
    if (!be(t)) return null;
    var n = document.createElement("button");
    return (
      (n.type = "button"),
      (n.className = "chat-react-badge"),
      n.setAttribute("aria-label", "Reactions"),
      (n.innerHTML = be(t)),
      n.addEventListener("click", function (t) {
        (t.stopPropagation(),
          (function (e) {
            Ce();
            var t = De[e],
              n = window.mpHide ? mpHide.filt((t && t.reactions) || {}) : (t && t.reactions) || {},
              a = Object.keys(n);
            if (!a.length) return;
            var r = document.createElement("div");
            ((r.className = "msg-popup"), (r.id = "react-sheet"));
            var o = document.createElement("div");
            o.className = "msg-popup-inner";
            var i = document.createElement("div");
            ((i.style.cssText = "font-size:15px;font-weight:700;margin-bottom:10px;"),
              (i.textContent = "Reactions"),
              o.appendChild(i),
              a.forEach(function (e) {
                var t = document.createElement("div");
                t.style.cssText =
                  "display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:var(--glass-hairline);";
                var a = document.createElement("span");
                ((a.style.cssText = "font-size:14px;font-weight:600;"), (a.textContent = e));
                var r = document.createElement("span");
                ((r.style.cssText = "display:inline-flex;"),
                  (r.innerHTML = se(n[e], 22)),
                  t.appendChild(a),
                  t.appendChild(r),
                  o.appendChild(t));
              }));
            var c = document.createElement("button");
            ((c.className = "msg-popup-close"),
              (c.textContent = "Close"),
              (c.onclick = function (e) {
                (e.stopPropagation(), Ce());
              }),
              o.appendChild(c),
              r.appendChild(o),
              (r.onclick = function (e) {
                e.target === r && Ce();
              }),
              document.body.appendChild(r));
          })(e));
      }),
      n.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
      }),
      n.addEventListener(
        "touchstart",
        function (e) {
          e.stopPropagation();
        },
        { passive: !0 },
      ),
      n
    );
  }
  function we(e, t) {
    var n = c.querySelector('.chat-msg[data-id="' + CSS.escape(e) + '"]');
    if (n) {
      var a = n.querySelector(".chat-bubble");
      if (a) {
        var r = a.querySelector(".chat-react-badge");
        r && r.remove();
        var o = ye(e, t);
        o && a.appendChild(o);
      }
    }
  }
  function Ce() {
    var e = document.getElementById("react-sheet");
    e && e.remove();
  }
  function xe() {
    if (
      (me && (me.classList.remove("chat-react-target"), (me = null)),
      de && (clearTimeout(de), (de = null)),
      ue && (ue.remove(), (ue = null)),
      le)
    ) {
      var e = le;
      ((le = null),
        (ue = e),
        e.classList.add("closing"),
        (de = setTimeout(function () {
          (e.remove(), ue === e && (ue = null), (de = null));
        }, 170)));
    }
  }
  function Ee(e) {
    xe();
    var t = e.closest(".chat-msg"),
      n = t && t.getAttribute("data-id");
    if (n) {
      var a = De[n],
        r = a && a.reactions ? a.reactions[((s && s.username) || "").toLowerCase()] : null,
        o = document.createElement("div");
      ((o.className = "chat-react-picker"),
        o.setAttribute("role", "menu"),
        re.forEach(function (e) {
          var t = document.createElement("button");
          ((t.type = "button"),
            (t.className = "chat-react-opt" + (r === e ? " on" : "")),
            t.setAttribute("aria-label", "React " + (oe[e] || "")),
            (t.innerHTML = se(e, 24)),
            t.addEventListener("click", function (a) {
              (a.stopPropagation(),
                t.classList.add("pop"),
                setTimeout(function () {
                  !(function (e, t) {
                    var n = De[e],
                      a = n && n.reactions ? Object.assign({}, n.reactions) : {},
                      r = ((s && s.username) || "").toLowerCase(),
                      o = Object.assign({}, a);
                    (o[r] === t ? delete o[r] : (o[r] = t),
                      n && (n.reactions = o),
                      we(e, o),
                      xe(),
                      E("/api/react", { method: "POST", body: { id: e, emoji: t } })
                        .then(function (t) {
                          (t && t.ok) || (n && (n.reactions = a), we(e, a));
                        })
                        .catch(function () {
                          (n && (n.reactions = a), we(e, a));
                        }));
                  })(n, e);
                }, 180));
            }),
            o.appendChild(t));
        }),
        (function () {
          if (!s || !s.owner) return;
          var divider=document.createElement("span");divider.className="chat-react-divider";divider.setAttribute("role","separator");o.appendChild(divider);
          var button=document.createElement("button");button.type="button";button.className="chat-react-delete";button.setAttribute("aria-label","Delete message");
          button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
          /* iOS: show the soft glow while the finger is down (no :hover on touch). */
          var press=function(on){button.classList.toggle("is-press",on);};button.addEventListener("pointerdown",function(){press(true);});["pointerup","pointercancel","pointerleave"].forEach(function(type){button.addEventListener(type,function(){press(false);});});
          button.addEventListener("click",function(event){event.stopPropagation();if(button.disabled)return;button.disabled=true;E("/api/delete",{method:"POST",body:{id:n}}).then(function(result){if(!result||!result.ok)throw new Error(result&&result.error||"Couldn’t delete message");Ze(n);Ue=Ue.filter(function(message){return message.id!==n;});xe();}).catch(function(error){button.disabled=false;mpToast(error.message);});});o.appendChild(button);
        })(), document.body.appendChild(o));
      var i = e.getBoundingClientRect(),
        c = o.offsetWidth || 128,
        l = o.offsetHeight || 48,
        d = t.classList.contains("mine"),
        u = !1,
        m = i.top - l - 4;
      m < 70 && ((m = i.bottom + 4), (u = !0));
      var p = d ? i.right - c : i.left;
      ((p = Math.max(8, Math.min(window.innerWidth - c - 8, p))),
        (o.style.left = p + "px"),
        (o.style.top = m + "px"),
        (o.style.transformOrigin = (u ? "top " : "bottom ") + (d ? "right" : "left")),
        (le = o),
        (me = e),
        e.classList.add("chat-react-target"));
    }
  }
  if (!document._chatReactDelegated) {
    function Tt(e, t) {
      if (!e.target.closest("a, button, .chat-embed, .chat-react-badge")) {
        (Ce(), (he = t), (ge = !1));
        var n = (e.touches && e.touches[0]) || e;
        ((ve = n.clientX),
          (fe = n.clientY),
          pe && clearTimeout(pe),
          (pe = setTimeout(function () {
            ((pe = null), !ge && he && Ee(he));
          }, 450)));
      }
    }
    function At(e) {
      if (pe) {
        var t = (e.touches && e.touches[0]) || e;
        (Math.abs(t.clientX - ve) > 10 || Math.abs(t.clientY - fe) > 10) &&
          ((ge = !0), clearTimeout(pe), (pe = null));
      }
    }
    function Nt() {
      (pe && (clearTimeout(pe), (pe = null)), (he = null));
    }
    function Pt(e) {
      if (!e.target || !e.target.closest) return null;
      var t = e.target.closest("#chat .chat-bubble");
      if (!t) return null;
      var n = t.closest(".chat-msg");
      return n && n.getAttribute("data-id") ? t : null;
    }
    ((document._chatReactDelegated = !0),
      document.addEventListener(
        "touchstart",
        function (e) {
          var t = Pt(e);
          t && Tt(e, t);
        },
        { passive: !0 },
      ),
      document.addEventListener("touchmove", At, { passive: !0 }),
      document.addEventListener("touchend", Nt, { passive: !0 }),
      document.addEventListener("touchcancel", Nt, { passive: !0 }),
      document.addEventListener("mousedown", function (e) {
        if (0 === e.button) {
          var t = Pt(e);
          t && Tt(e, t);
        }
      }),
      document.addEventListener("mousemove", At),
      document.addEventListener("mouseup", Nt),
      document.addEventListener("contextmenu", function (e) {
        (e.target &&
          e.target.closest &&
          e.target.closest("#chat .chat-bubble") &&
          !e.target.closest("a") &&
          e.preventDefault(),
          e.target && "IMG" === e.target.tagName && e.preventDefault());
      }),
      document.addEventListener("pointerdown", function (e) {
        le && !e.target.closest(".chat-react-picker") && xe();
      }),
      window.addEventListener(
        "scroll",
        function () {
          le && xe();
        },
        { passive: !0 },
      ),
      document.addEventListener("keydown", function (e) {
        "Escape" === e.key && (xe(), Ce());
      }));
  }
  function ke() {
    mpAuthEmit();
    if (
      (mt(),
      (We = Object.create(null)),
      Y(),
      (u = Object.create(null)),
      (De = Object.create(null)),
      (Ue = []),
      (m = 0),
      (c.innerHTML =
        '<div class="chat-head glassbar"><div class="chat-title" style="display:flex;align-items:center;gap:6px;">Chat <span class="online-pill-wrap" style="position:relative;display:inline-flex;align-items:center;"><button type="button" class="easyui-live-badge chat-online" hidden style="cursor:pointer;font:inherit;color:inherit;display:inline-flex;align-items:center;gap:4px;animation:onlinePulse 2s ease-in-out infinite;box-shadow:0 0 4px 1px rgba(74,222,128,0.5);"><span class="live-dot"></span><span class="live-num chat-online-num"></span></button></span></div><div class="chat-head-right"><span class="chat-points" title="Your points"><span class="chat-star" aria-hidden="true">' + mpStar() + '</span> <span class="chat-points-num">0</span></span><button type="button" class="forum-bell" id="chat-bell" aria-label="Notifications" data-ph-bell="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" data-hi="wiggle"><path d="M15.5 18C15.5 19.933 13.933 21.5 12 21.5C10.067 21.5 8.5 19.933 8.5 18"/><path d="M19.2311 18H4.76887C3.79195 18 3 17.208 3 16.2311C3 15.762 3.18636 15.3121 3.51809 14.9803L4.12132 14.3771C4.68393 13.8145 5 13.0514 5 12.2558V9.5C5 5.63401 8.13401 2.5 12 2.5C15.866 2.5 19 5.634 19 9.5V12.2558C19 13.0514 19.3161 13.8145 19.8787 14.3771L20.4819 14.9803C20.8136 15.3121 21 15.762 21 16.2311C21 17.208 20.208 18 19.2311 18Z"/></svg><span id="chat-bell-badge" class="forum-bell-badge hidden"></span></button><button type="button" class="chat-me" aria-label="Profile"></button></div></div><div class="chat-msgs" aria-live="polite"></div><div class="chat-attach" hidden></div><div class="chat-typing" hidden></div><div class="chat-inputrow"><button type="button" class="chat-plus" aria-label="Add to chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="rotate"><path d="M12.001 4.00101V20.001"/><path d="M20.001 12.001L4.00098 12.001"/></svg></button><form class="chat-inputbar"><input type="text" maxlength="500" placeholder="Message" autocomplete="off" aria-label="Message"><button type="submit" class="chat-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="float"><path d="M12 5.5V19"/><path d="M18 11C18 11 13.5811 5.00001 12 5C10.4188 4.99999 6 11 6 11"/></svg></button></form></div><input type="file" class="chat-file" accept="image/*,video/*" hidden>'),
      window.MPForum && MPForum.updateBellBadge)
    )
      try {
        MPForum.updateBellBadge(!0);
      } catch (e) {}
    var t = c.querySelector(".chat-me");
    if (
      (t.appendChild(J(s.username, s.avatar, "sm", X())),
      ne(t),
      te(s.points || 0),
      window.MPNav && MPNav.refreshTitle)
    )
      try {
        MPNav.refreshTitle();
      } catch (e) {}
    t.addEventListener("click", function (e) {
      (e.stopPropagation(), vt());
    });
    var n = c.querySelector(".chat-inputbar"),
      a = n.querySelector("input");
    a.addEventListener("input", rt);
    mpMention(a);
    var r = 0,
      o = null;
    function i() {
      r ||
        (r = requestAnimationFrame(function () {
          ((r = 0),
            (function () {
              var e = c.querySelector(".chat-inputrow");
              if (!e) return;
              var t = "";
              if (document.activeElement === a) {
                var n = window.visualViewport,
                  r = 0;
                (n && (r = Math.max(0, window.innerHeight - n.height - (n.offsetTop || 0))),
                  r > 0 && (r = Math.max(0, r - 36)),
                  r > 0 && (t = r));
              }
              var i = Le(),
                s = "" === t ? 0 : Math.max(0, t - 18),
                l = Se();
              i && i.style.setProperty("--kb-shift", s + "px");
              if ("" === t) {
                var d = "" !== o && null !== o;
                return (
                  d && ((e.style.bottom = ""), (o = "")),
                  void (d && l && window.scrollTo(0, document.documentElement.scrollHeight))
                );
              }
              if ("" !== o && null !== o && Math.abs(t - o) < 8) return;
              ((e.style.bottom = t + "px"),
                (o = t),
                l && window.scrollTo(0, document.documentElement.scrollHeight));
            })());
        }));
    }
    function l() {
      var e = a.value.trim();
      if (H.some(function (e) { return e.uploading; })) return;
      if (e || h) {
        a.value = "";
        var tL = h ? h.map(function (e) { return { id: e.id, kind: e.kind }; }) : [null];
        ((H = []), b());
        var r = n.querySelector(".chat-send");
        r && (r.classList.remove("holo"), r.offsetWidth, r.classList.add("holo"));
        for (var tI = 0; tI < tL.length; tI++) {
          var t = tL[tI];
          /* one message per photo (the Worker takes one media each); the text rides on the last */
          (function (e, t) {
            if (!t && mpBangMute(String(e || "").trim())) return;
            window.haptic && window.haptic(15);
            var n = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
              a = { t: "send", text: e, cid: n };
            mpPM.to && (a.to = mpPM.to);
            t && (a.media = t);
            !mpPM.to && !t && mpListenFromText(String(e).trim());
            if (p && 1 === p.readyState) {
              if (s && s.username) {
                var r =
                    "opt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
                  o = { id: r, user: s.username, avatar: s.avatar, text: e, ts: Date.now() + tI };
                mpPM.to && ((o.to = mpPM.to), (o.private = !0));
                (t && (o.media = t),
                  (We[n] = { tempId: r, ts: o.ts }),
                  Fe(o),
                  Ne(!0),
                  setTimeout(function () {
                    We[n] && (delete We[n], Ze(r));
                  }, 1e4));
              }
              try {
                p.send(JSON.stringify(a));
              } catch (e) {}
            } else
              E("/api/send", { method: "POST", body: { text: e, media: t || null, cid: n, to: mpPM.to || void 0 } })
                .then(function (e) {
                  e && e.ok
                    ? (e.message && Fe(e.message),
                      "number" == typeof e.points && te(e.points),
                      Ne(!0))
                    : k((e && e.error) || "Couldn't send. Try again.");
                })
                .catch(function () {
                  k("Couldn't send. Check your connection and try again.");
                });
          })(tI === tL.length - 1 ? e : "", t);
        }
      }
    }
    (a.addEventListener("focus", i),
      a.addEventListener("blur", function () {
        var e = c.querySelector(".chat-inputrow");
        (e && (e.style.bottom = ""), (o = ""));
        var t = Le();
        t && t.style.setProperty("--kb-shift", "0px");
      }),
      window.visualViewport && window.visualViewport.addEventListener("resize", i),
      i(),
      window.addEventListener("pageshow", i),
      n.addEventListener("submit", function (e) {
        (e.preventDefault(), l());
      }));
    var d = n.querySelector(".chat-send");
    (d &&
      d.addEventListener(
        "touchstart",
        function (e) {
          (e.preventDefault(), l());
        },
        { passive: !1 },
      ),
      (function () {
        var e = null;
        try {
          e = sessionStorage.getItem("mp-share-draft");
        } catch (e) {}
        if (!e) return;
        var t = c.querySelector(".chat-inputbar input");
        if (!t) return;
        try {
          sessionStorage.removeItem("mp-share-draft");
        } catch (e) {}
        t.value = e;
        try {
          t.focus();
        } catch (e) {}
        try {
          t.dispatchEvent(new Event("input", { bubbles: !0 }));
        } catch (e) {}
      })(),
      Et().then(function (e) {
        e &&
          E("/api/push/subscribe", { method: "POST", body: { subscription: e.toJSON() } }).catch(
            function () {},
          );
      }));
    /* Composer tray (per dc): thumbnails of every picked photo/video with a
       remove (x) each and an upload spinner; send works with photos only. */
    var H = [],
      h = null,
      v = c.querySelector(".chat-attach"),
      f = c.querySelector(".chat-file"),
      g = c.querySelector(".chat-plus"),
      hSeq = 0;
    f && f.setAttribute("multiple", "");
    (function () {
      var e = c.querySelector(".chat-inputrow");
      e && v && e.appendChild(v); // tray floats just above the input and follows the keyboard
    })();
    /* Grow the list's bottom padding by the tray's real height so messages
       aren't hidden behind it; stay pinned to the bottom if we were there. */
    (function () {
      if (!v || !window.ResizeObserver) return;
      var e = -1;
      function t() {
        var t = v.hidden ? 0 : Math.round(v.getBoundingClientRect().height + 8);
        if (t !== e) {
          /* only follow the tray while Chat is on screen, and not on the first measure:
             on a deep-linked Globe post this pulled the page to the bottom (per dc) */
          var n = Le(),
            f0 = e === -1,
            a = !f0 && Te() && Se();
          if ((n && n.style.setProperty("--tray-h", t + "px"), (e = t), a)) {
            var r = Date.now();
            (function o() {
              (window.scrollTo(0, document.documentElement.scrollHeight), Date.now() - r < 320 && requestAnimationFrame(o));
            })();
          }
        }
      }
      (new ResizeObserver(t).observe(v), new MutationObserver(t).observe(v, { attributes: !0, attributeFilter: ["hidden"] }));
    })();
    function hSync() {
      var e = H.filter(function (e) {
        return e.id;
      });
      h = e.length ? e : null;
      var t = n.querySelector(".chat-send");
      t && t.classList.toggle("chat-send-busy", H.some(function (e) { return e.uploading; }));
    }
    function b() {
      (hSync(), (v.innerHTML = ""));
      if (!H.length) return void (v.hidden = !0);
      v.hidden = !1;
      H.forEach(function (t) {
        var a = document.createElement("span");
        a.className = "chat-tray-item" + (t.uploading ? " is-loading" : "");
        var r;
        ("video" === t.kind
          ? (((r = document.createElement("span")).className = "chat-attach-vid"),
            (r.textContent = "▶"))
          : ((r = document.createElement("img")),
            (r.alt = ""),
            t.preview
              ? (r.src = t.preview)
              : /^[A-Za-z0-9]+$/.test(t.id || "") && (r.src = e + "/api/media/" + t.id)),
          a.appendChild(r));
        if (t.uploading) {
          var o = document.createElement("span");
          ((o.className = "lg-spin"), o.setAttribute("aria-label", "Uploading"), a.appendChild(o));
        }
        var i = document.createElement("button");
        ((i.type = "button"),
          (i.className = "chat-attach-x"),
          i.setAttribute("aria-label", "Remove attachment"),
          (i.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="12" height="12" data-hi="fade"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>'),
          i.addEventListener("click", function (e) {
            (e.preventDefault(),
              (H = H.filter(function (e) {
                return e !== t;
              })),
              t.preview && 0 === t.preview.indexOf("blob:") && URL.revokeObjectURL(t.preview),
              b());
          }),
          a.appendChild(i),
          v.appendChild(a));
      });
    }
    function y(e, t) {
      (t &&
        (H = H.filter(function (e) {
          return e !== t;
        })),
        b(),
        (v.hidden = !1));
      var n = document.createElement("span");
      ((n.className = "chat-attach-err"),
        (n.textContent = e),
        v.appendChild(n),
        setTimeout(function () {
          (n.remove(), H.length || (v.hidden = !0));
        }, 2500));
    }
    function w(e, t, n, a) {
      var r = { key: ++hSeq, uploading: !0, kind: t, preview: a || (t === "image" ? e : "") };
      (H.push(r),
        b(),
        E("/api/media", { method: "POST", body: { dataUrl: e, kind: t, filename: n || "" } })
          .then(function (e) {
            H.indexOf(r) < 0 ||
              (e && e.ok
                ? ((r.uploading = !1), (r.id = e.id), (r.kind = e.kind), b())
                : y((e && e.error) || "Couldn't upload.", r));
          })
          .catch(function () {
            y("Couldn't reach the chat server.", r);
          }));
    }
    (g &&
      f &&
      (f.addEventListener("change", function () {
        var eL = Array.prototype.slice.call(f.files || [], 0, 10);
        f.value = "";
        eL.forEach(function (e) {
        if (e) {
          var t = 0 === e.type.indexOf("video/"),
            n = "image/gif" === e.type,
            a = s && (s.member || s.owner) ? 20 : 8; // matches the Worker /api/media caps
          if (e.size > 1024 * a * 1024) y("That file is too big (" + a + " MB max).");
          else if (t || n) {
            if (n) {
              var r = new FileReader();
              return (
                (r.onload = function () {
                  for (
                    var t = new Uint8Array(r.result || []), n = "", a = 0;
                    a < 4 && a < t.length;
                    a++
                  )
                    n += String.fromCharCode(t[a]);
                  if ("GIF8" === n) {
                    var o = new FileReader();
                    ((o.onload = function () {
                      w(o.result, "image");
                    }),
                      (o.onerror = function () {
                        y("Couldn't read that file.");
                      }),
                      o.readAsDataURL(e));
                  } else y("That file isn't a real GIF.");
                }),
                (r.onerror = function () {
                  y("Couldn't read that file.");
                }),
                void r.readAsArrayBuffer(e.slice(0, 4))
              );
            }
            var o = new FileReader();
            ((o.onload = function () {
              w(o.result, t ? "video" : "image");
            }),
              (o.onerror = function () {
                y("Couldn't read that file.");
              }),
              o.readAsDataURL(e));
          } else
            0 === e.type.indexOf("image/")
              ? (function (e) {
                  var t = URL.createObjectURL(e),
                    n = new Image();
                  ((n.onload = function () {
                    var e = n.width,
                      a = n.height;
                    if (Math.max(e, a) > 1600) {
                      var r = 1600 / Math.max(e, a);
                      ((e = Math.round(e * r)), (a = Math.round(a * r)));
                    }
                    var o = document.createElement("canvas");
                    ((o.width = e),
                      (o.height = a),
                      o.getContext("2d").drawImage(n, 0, 0, e, a),
                      URL.revokeObjectURL(t),
                      w(o.toDataURL("image/jpeg", 0.82), "image"));
                  }),
                    (n.onerror = function () {
                      (URL.revokeObjectURL(t), y("Couldn't read that photo."));
                    }),
                    (n.src = t));
                })(e)
              : y("This type of file is not supported.");
        }
        });
      }),
      g &&
        g.addEventListener("click", function (ev) {
          ev.stopPropagation();
          mpGpClearPreview();
          var row = g.parentNode, m = row.querySelector(".chat-plus-menu");
          function close() {
            var mm = m;
            g.classList.remove("is-open"); g.setAttribute("aria-expanded", "false");
            document.removeEventListener("pointerdown", out, !0); document.removeEventListener("keydown", esc, !0); window.removeEventListener("hashchange", close);
            mpScrollUnlock();
            if (mm && mm._dispose) mm._dispose();
            if (mm) { mm.classList.remove("is-in"); mm.classList.add("is-out"); setTimeout(function () { mm.remove(); }, 180); }
          }
          function out(e) { if (!e.target.closest(".chat-plus-menu,.chat-plus,.fm-cf-back,.fm-toast")) close(); }
          function esc(e) { if (e.key === "Escape") { e.preventDefault(); if (m && m._esc && m._esc()) return; close(); g.focus(); } }
          if (m && !m.classList.contains("is-out")) return m._close ? m._close() : close();
          if (m) m.remove();
          var ico = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
          m = document.createElement("div"); m.className = "chat-plus-menu"; m.setAttribute("role", "menu"); m._close = close;
          function fillPlus() {
          m.innerHTML = '<button type="button" role="menuitem" class="chat-pmenu-row" data-act="media"><svg ' + ico + '><path d="M3 16L7.46967 11.5303C7.80923 11.1908 8.26978 11 8.75 11C9.23022 11 9.69077 11.1908 10.0303 11.5303L14 15.5M15.5 17L14 15.5M21 16L18.5303 13.5303C18.1908 13.1908 17.7302 13 17.25 13C16.7698 13 16.3092 13.1908 15.9697 13.5303L14 15.5"/><path d="M12 2.5C7.77027 2.5 5.6554 2.5 4.25276 3.69797C4.05358 3.86808 3.86808 4.05358 3.69797 4.25276C2.5 5.6554 2.5 7.77027 2.5 12C2.5 16.2297 2.5 18.3446 3.69797 19.7472C3.86808 19.9464 4.05358 20.1319 4.25276 20.302C5.6554 21.5 7.77027 21.5 12 21.5C16.2297 21.5 18.3446 21.5 19.7472 20.302C19.9464 20.1319 20.1319 19.9464 20.302 19.7472C21.5 18.3446 21.5 16.2297 21.5 12"/><path d="M21.5 6H18M18 6H14.5M18 6V2.5M18 6V9.5"/></svg><span>Add media</span></button>' +
            '<button type="button" role="menuitem" class="chat-pmenu-row" data-act="globe"><svg ' + ico + '><circle cx="12" cy="12" r="10"/><path d="M8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2C12 2 8 6 8 12Z"/><path d="M21 15H3"/><path d="M21 9H3"/></svg><span>Globe</span></button>' +
            '<button type="button" role="menuitem" class="chat-pmenu-row" data-act="music">' + mpMusicMenuIcon() + '<span>Music</span></button>' +
            (window.mpPollOn
              ? mpIsVip()
                ? '<button type="button" role="menuitem" class="chat-pmenu-row" data-act="poll"><svg ' + ico + '><path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3"/><path d="M13 10L13 21"/><path d="M18 13L18 21"/><path d="M8 13L8 20"/><path d="M21 7.98693C19.16 7.98693 17.1922 8.24252 15.8771 6.49346C14.3798 4.50218 11.6202 4.50218 10.1229 6.49346C8.80782 8.24252 6.84003 7.98693 5 7.98693H3"/></svg><span>Poll</span></button>'
                : '<button type="button" role="menuitem" class="chat-pmenu-row is-locked" data-act="poll-locked" aria-disabled="true"><svg ' + ico + '><path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3"/><path d="M13 10L13 21"/><path d="M18 13L18 21"/><path d="M8 13L8 20"/><path d="M21 7.98693C19.16 7.98693 17.1922 8.24252 15.8771 6.49346C14.3798 4.50218 11.6202 4.50218 10.1229 6.49346C8.80782 8.24252 6.84003 7.98693 5 7.98693H3"/></svg><span>Poll</span><em>VIP</em></button>'
              : '') +
            '<div class="chat-pmenu-sep" role="separator"></div><button type="button" role="menuitem" class="chat-pmenu-row chat-misery-fm" aria-label="Misery FM"><span class="chat-misery-fm-logo" role="img" aria-label="Misery FM"></span><em' + (window.MPFM && MPFM.isLive() ? ' class="chat-fm-pill">LIVE' : ">") + "</em></button>";
          m.querySelector('[data-act="media"]').addEventListener("click", function () { close(); f.setAttribute("accept", "image/*,video/*"); f.click(); });
          m.querySelector('[data-act="globe"]').addEventListener("click", function (e) { e.stopPropagation(); mpMorph(m, "globe", close); });
          m.querySelector('[data-act="music"]').addEventListener("click", function (e) { e.stopPropagation(); mpMorph(m, "music", close); });
          m.querySelector('.chat-misery-fm').addEventListener('click', function (event) { event.stopPropagation(); if (window.MPFM && MPFM.mount) mpMorph(m, "fm", close); else { close(); window.MPFM && MPFM.open(); } });
          var pq = m.querySelector('[data-act="poll"]');
          pq && pq.addEventListener("click", function (e) { e.stopPropagation(); if (!mpIsVip()) return mpToast("Polls are a VIP perk"); mpMorph(m, "poll", close); });
          var plk = m.querySelector('[data-act="poll-locked"]');
          plk && plk.addEventListener("click", function (e) { e.stopPropagation(); mpToast("Polls are a VIP perk"); });
            ["music","globe","poll"].forEach(function (k) {
              var b = m.querySelector('[data-act="' + k + '"]');
              if (b) b.addEventListener("pointerdown", function () { prefetchKind(k); }, { passive: !0 });
            });
            var fmBtn = m.querySelector(".chat-misery-fm");
            if (fmBtn) fmBtn.addEventListener("pointerdown", function () { prefetchKind("fm"); }, { passive: !0 });
            window.MPFM && MPFM.updateMenuStatus && MPFM.updateMenuStatus();
          }
          function prefetchKind(kind) {
            if (kind === "music" && !window.__mpMusicPrefetch) {
              window.__mpMusicPrefetch = 1;
              ["/assets/apple-music/official-icon-still.webp?v=1","/assets/apple-music/official-icon-loop.mp4?v=1"].forEach(function (src) {
                var l = document.createElement("link"); l.rel = "preload"; l.as = /\.mp4$/.test(src) ? "video" : "image"; l.href = src; document.head.appendChild(l);
              });
            }
          }
          fillPlus(); m._rebuildPlus = fillPlus;
          row.appendChild(m); window.MPFM && MPFM.updateMenuStatus && MPFM.updateMenuStatus(); g.classList.add("is-open"); g.setAttribute("aria-expanded", "true");
          mpScrollLock(m);
          requestAnimationFrame(function () { m.classList.add("is-in"); });
          document.addEventListener("pointerdown", out, !0); document.addEventListener("keydown", esc, !0); window.addEventListener("hashchange", close);
        })),
      window.__olderScrollWired ||
        ((window.__olderScrollWired = !0),
        window.addEventListener(
          "scroll",
          function () {
            requestAnimationFrame(mpFillOlder);
          },
          { passive: !0 },
        )),
      (bootTake("msgs") || E("/api/messages?limit=200&_=" + Date.now()))
        .then(function (e) {
          e && e.caps && e.caps.private && mpPMEnable();
          e && e.caps && e.caps.poll && (window.mpPollOn = !0);
          e && e.badges && (T = Object.assign(Object.create(null), e.badges));
          e && e.pw && mpPwMerge(e.pw, !0);
          mpIngestHistory(e && e.messages);
        })
        .catch(function () {
          if (window.__chatMsgsLoaded) return;
          var e = Le();
          if (e && !e.querySelector(".chat-load-err")) {
            var t = document.createElement("div");
            ((t.className = "chat-load-err"),
              (t.style.cssText = "text-align:center;padding:20px;color:#888;font-size:14px;"),
              (t.textContent = "Couldn't load messages. Pull to refresh or try again."),
              e.appendChild(t));
          }
        }),
      ot(),
      window.__chatFadeHook ||
        ((window.__chatFadeHook = !0),
        window.addEventListener("scroll", qe, { passive: !0 }),
        window.addEventListener("resize", qe),
        document.addEventListener(
          "load",
          function (e) {
            var t = e.target;
            if (Date.now() <= Me && t && ("IMG" === t.tagName || "VIDEO" === t.tagName)) {
              if (!Te()) return;
              window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
            }
          },
          !0,
        ),
        window.addEventListener(
          "touchmove",
          function () {
            Me = 0;
          },
          { passive: !0 },
        ),
        window.addEventListener(
          "wheel",
          function () {
            Me = 0;
          },
          { passive: !0 },
        )),
      qe());
  }

  function mpIngestHistory(list) {
    list = list || [];
    if (window.__chatMsgsLoaded) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m && m.id && !u[m.id] && !De[m.id]) Fe(m);
      }
      return;
    }
    window.__chatMsgsLoaded = !0;
    window.__chatBatchLoading = !0;
    var box = Le(),
      vis = list.slice(-20),
      frag = box && !box.querySelector(".chat-msg") ? document.createDocumentFragment() : null;
    Ue = list.slice(0, Math.max(0, list.length - 20));
    list.forEach(function (e) {
      e && e.id && (De[e.id] = e);
      e && e.ts && e.ts > m && 0 !== String(e.id).indexOf("opt-") && (m = e.ts);
    });
    if (frag) window.__chatBatchRoot = frag;
    try {
      vis.forEach(function (e) {
        Fe(e);
      });
      if (frag && box) box.appendChild(frag);
    } finally {
      window.__chatBatchRoot = null;
    }
    if (box) {
      box.querySelectorAll(".chat-msg").forEach(function (n) {
        mpClampMsg(n);
      });
      mpPhotoStack(box);
    }
    Ae(!0);
    window.__chatBatchLoading = !1;
    qe();
    requestAnimationFrame(mpFillOlder);
  }
  function mpFillOlder() {
    if (ze || !Ue.length || window.__chatBatchLoading) return;
    var e = document.getElementById("journal");
    if (!e || !e.classList.contains("on")) return;
    if (window.scrollY > 200) return;
    ze = !0;
    window.__chatBatchLoading = !0;
    var t = document.documentElement.scrollHeight,
      n = Ue.splice(Math.max(0, Ue.length - 20), 20);
    try {
      for (var a = n.length - 1; a >= 0; a--) Fe(n[a], !0);
    } finally {
      window.__chatBatchLoading = !1;
    }
    var r = document.documentElement.scrollHeight;
    window.scrollTo(0, window.scrollY + (r - t));
    qe();
    ze = !1;
    if (Ue.length && window.scrollY <= 200) requestAnimationFrame(mpFillOlder);
  }
  function Le() {
    return c.querySelector(".chat-msgs");
  }
  function Se() {
    return document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 200;
  }
  var Me = 0;
  function Te() {
    var e = window.location.hash || "";
    if (
      0 === e.indexOf("#globe") ||
      0 === e.indexOf("#global") ||
      0 === e.indexOf("#forum") ||
      0 === e.indexOf("#shop") ||
      0 === e.indexOf("#cart")
    )
      return !1;
    var t = document.getElementById("forum");
    if (t && t.classList.contains("on")) return !1;
    var n = document.getElementById("shop");
    return !n || !n.classList.contains("on");
  }
  function Ae(e) {
    if (Te()) {
      var t = document.documentElement.classList.contains("mp-loading");
      (e || t
        ? window.scrollTo(0, document.documentElement.scrollHeight)
        : window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }),
        (Me = Date.now() + 5e3),
        qe());
    }
  }
  function Ne(e) {
    Te() &&
      (e || Se()) &&
      (window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }), qe());
  }
  var Pe = 0;
  function Ie() {
    if (((Pe = 0), !c)) return;
    /* Speed: measure every message first, then write. Reading a box right after writing a style on
       the previous message made the browser redo layout once per message on every scroll frame. */
    var e = c.querySelector(".fm-bar:not([hidden])") || c.querySelector(".chat-head"),
      t = c.querySelector(".chat-inputrow"),
      n = e ? e.getBoundingClientRect().bottom : 120,
      a = t ? t.getBoundingClientRect().top : window.innerHeight - 90,
      r = c.querySelectorAll(".chat-msg"),
      d = document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 200,
      boxes = new Array(r.length),
      o;
    for (o = 0; o < r.length; o++) boxes[o] = r[o].getBoundingClientRect();
    for (o = 0; o < r.length; o++) {
      var i = boxes[o],
        s = (i.top + i.bottom) / 2,
        l = 1;
      i.bottom < n ? (l = 0) : s < n + 44 && (l = Math.max(0, (s - n) / 44));
      var u = 1;
      if (i.top > a) u = 0;
      else if (!d) {
        s > a - 48 && (u = Math.max(0, (a - s) / 48));
      }
      var m = (l = Math.min(l, u)).toFixed(2);
      (r[o].getAttribute("data-fade") !== m &&
        (r[o].setAttribute("data-fade", m),
        (r[o].style.opacity = m),
        (r[o].style.pointerEvents = l < 0.2 ? "none" : "")),
        r[o].style.filter && (r[o].style.filter = ""));
    }
  }
  function qe() {
    Pe || (Pe = requestAnimationFrame(Ie));
  }
  function Oe(e) {
    return String(e || "")
      .replace(/https?:\/\/[^\s<>"')]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function _e(e) {
    return x(String(e || "")).replace(/https?:\/\/[^\s<>"')]+/gi, function (e) {
      var t = e.replace(/[.,;:!?]+$/, "");
      return (
        '<a href="' +
        t +
        '" target="_blank" rel="noopener noreferrer">' +
        t +
        "</a>" +
        e.slice(t.length)
      );
    }).replace(/(^|[\s(])@([A-Za-z0-9_.]{1,30}[A-Za-z0-9_])/g, function (_m, a, u) { return a + '<span class="chat-mention" role="button" tabindex="0" data-u="' + String(u).toLowerCase() + '">@' + String(u).toLowerCase() + '</span>'; });
  }
  /* @mentions autocomplete (per dc): users from chat authors seen (Je) + /api/online.
     The Worker's full user lists are owner-only, so this is client-side. */
  var mpMnOn = null, mpMnAt = 0;
  function mpMention(inp) {
    var box = null, items = [], sel = 0, tok = null;
    function me() { return (s && s.username ? s.username : "").toLowerCase(); }
    function pool() {
      var m = Object.create(null);
      Object.keys(Je || {}).forEach(function (k) { var u = Je[k]; u && u.username && (m[k] = { username: u.username, avatar: u.avatar, v: u.hasImg ? u.imgV : void 0 }); });
      (mpMnOn || []).forEach(function (u) { var n = "string" == typeof u ? u : u && u.username; if (!n) return; var k = n.toLowerCase(); m[k] || (m[k] = { username: n, avatar: u.avatar, v: u.hasAvatarImg ? u.avatarV : void 0 }); });
      return Object.keys(m).filter(function (k) { return k !== me() && !(window.mpHide && mpHide.is(m[k].username)); }).map(function (k) { return m[k]; });
    }
    function loadOnline() {
      if (Date.now() - mpMnAt < 60000) return; mpMnAt = Date.now();
      try { E("/api/online").then(function (r) { r && r.ok && Array.isArray(r.users) && ((mpMnOn = r.users), document.activeElement === inp && update()); }).catch(function () {}); } catch (_) {}
    }
    function token() {
      var v = inp.value, c = inp.selectionStart == null ? v.length : inp.selectionStart;
      var m = /(^|\s)@([A-Za-z0-9_.]{0,30})$/.exec(v.slice(0, c));
      return m ? { start: c - m[2].length - 1, end: c, q: m[2].toLowerCase() } : null;
    }
    function close() { box && box.remove(); box = null; items = []; tok = null; }
    function pick(u) {
      if (!tok) return;
      var v = inp.value, after = v.slice(tok.end).replace(/^[A-Za-z0-9_.]*/, "");
      var ins = mpAt(u.username) + " ";
      inp.value = v.slice(0, tok.start) + ins + after.replace(/^ /, "");
      var c = tok.start + ins.length; close(); inp.focus();
      try { inp.setSelectionRange(c, c); } catch (_) {}
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function paint() {
      [].forEach.call(box.children, function (b, i) { b.classList.toggle("is-sel", i === sel); i === sel && b.scrollIntoView && b.scrollIntoView({ block: "nearest" }); });
    }
    function update() {
      tok = token();
      if (!tok) return close();
      loadOnline();
      var q = tok.q, all = pool();
      var pre = all.filter(function (u) { return u.username.toLowerCase().indexOf(q) === 0; });
      var con = all.filter(function (u) { var i = u.username.toLowerCase().indexOf(q); return i > 0; });
      pre.sort(function (a, b) { return a.username.localeCompare(b.username); });
      items = pre.concat(con).slice(0, 30);
      if (!items.length) return close();
      var row = inp.closest(".chat-inputrow") || inp.parentNode;
      if (!box) { box = document.createElement("div"); box.className = "chat-plus-menu chat-mention-menu is-in"; box.setAttribute("role", "listbox"); row.appendChild(box); }
      box.innerHTML = ""; sel = Math.min(sel, items.length - 1);
      items.forEach(function (u, i) {
        var b = document.createElement("button"); b.type = "button"; b.className = "chat-pmenu-row"; b.setAttribute("role", "option");
        try { var av = J(u.username, u.avatar, "xs", u.v); av && b.appendChild(av); } catch (_) {}
        var t = document.createElement("span"); t.textContent = mpAt(u.username); b.appendChild(t);
        b.addEventListener("pointerdown", function (e) { e.preventDefault(); });
        b.addEventListener("click", function (e) { e.preventDefault(); pick(u); });
        box.appendChild(b);
      });
      paint();
    }
    inp.addEventListener("input", function () { sel = 0; update(); });
    inp.addEventListener("click", update);
    inp.addEventListener("keyup", function (e) { /^Arrow(Left|Right)$|^Home$|^End$/.test(e.key) && update(); });
    inp.addEventListener("blur", function () { setTimeout(close, 120); });
    inp.addEventListener("keydown", function (e) {
      if (!box) return;
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % items.length; paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; paint(); }
      else if ((e.key === "Enter" || e.key === "Tab") && items[sel]) { e.preventDefault(); e.stopImmediatePropagation(); pick(items[sel]); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    }, true);
  }
  /* Photo cards (per dc): the image floats on its own with rounded corners and a
     soft shadow, no bubble. Back-to-back photo-only messages from one person
     (within 2 min) fan into an iMessage-style stack you can flick through in
     place; tap opens the viewer, long-press reacts like any bubble. */
  function mpPhotoCard(e) {
    if (!e || "IMG" !== e.tagName) return null;
    var t = document.createElement("div");
    return (
      (t.className = "chat-photo-card"),
      t.setAttribute("role", "button"),
      t.setAttribute("aria-label", "Open photo"),
      (e.draggable = !1),
      t.appendChild(e),
      t
    );
  }
  var mpStackCur = Object.create(null);
  function mpStackGroup(e) {
    if (!e || !e.classList.contains("chat-photo-stacked")) return e ? [e] : [];
    for (var t = e; t.classList.contains("chat-photo-follow") && t.previousElementSibling; ) t = t.previousElementSibling;
    for (var n = [t], a = t; (a = a.nextElementSibling) && a.classList.contains("chat-photo-follow"); ) n.push(a);
    return n;
  }
  function mpStackLayout(e) {
    var t = e[0] && e[0].getAttribute("data-id"),
      n = e.length,
      a = ((mpStackCur[t] || 0) % n + n) % n;
    e.forEach(function (e, t) {
      var r = (t - a + n) % n;
      (e.setAttribute("data-pos", String(Math.min(r, 3))), (e.style.zIndex = String(10 + n - r)));
      var o = e.querySelector(".chat-photo-card");
      o && (o.style.transform = "");
      var i = e.querySelector(".chat-stack-dots");
      i && i.remove();
    });
    var r = e[n - 1].querySelector(".chat-photo-only");
    if (r) {
      var o = document.createElement("div");
      o.className = "chat-stack-dots";
      for (var i = 0; i < n; i++) {
        var c = document.createElement("i");
        (i === a && (c.className = "on"), o.appendChild(c));
      }
      r.appendChild(o);
    }
  }
  function mpPhotoStack(e) {
    for (var t = e.querySelectorAll(".chat-msg:not(.chat-typing-msg)"), n = null, a = [], r = [], o = 0; o < t.length; o++) {
      var i = t[o],
        c = !!i.querySelector(".chat-photo-only"),
        l = i.getAttribute("data-user") || "",
        d = parseInt(i.getAttribute("data-ts") || "0", 10) || 0;
      (i.classList.remove("chat-photo-stacked", "chat-photo-follow"), i.removeAttribute("data-pos"), (i.style.zIndex = ""));
      var s = i.querySelector(".chat-stack-dots");
      s && s.remove();
      c && n && n.u === l && Math.abs(d - n.ts) < 12e4
        ? (n.el.classList.add("chat-photo-stacked"), i.classList.add("chat-photo-stacked", "chat-photo-follow"), a.push(i), (n = { el: i, u: l, ts: d }))
        : (a.length > 1 && r.push(a), (a = c ? [i] : []), (n = c ? { el: i, u: l, ts: d } : null));
    }
    (a.length > 1 && r.push(a), r.forEach(mpStackLayout));
  }
  function mpTime(e) {
    if (!e) return "";
    var t = new Date(e);
    return t.toLocaleDateString(void 0, { month: "short", day: "numeric" }) + " · " + t.toLocaleTimeString(void 0, { hour: "numeric", minute: "2-digit" });
  }
  function mpPhotoViewer(e, t) {
    Ve();
    var n = e.map(function (e) {
        var t = e.querySelector(".chat-photo-card img");
        return t ? t.src : "";
      }),
      a = t,
      r = document.createElement("div");
    ((r.className = "msg-popup chat-photo-viewer"), (r.id = "msg-popup"));
    var o = document.createElement("div");
    o.className = "chat-pv-bg";
    var i = document.createElement("div");
    ((i.className = "chat-photo-track"),
      n.forEach(function (e) {
        var t = document.createElement("div");
        t.className = "chat-pv-slide";
        var n = document.createElement("img");
        ((n.src = e), (n.alt = ""), (n.draggable = !1), t.appendChild(n), i.appendChild(t));
      }));
    var c = document.createElement("div");
    c.className = "chat-pv-top";
    var l = document.createElement("div");
    l.className = "chat-pv-meta";
    var d = document.createElement("strong"),
      s = document.createElement("span");
    (l.appendChild(d), l.appendChild(s));
    var u = document.createElement("button");
    ((u.type = "button"),
      (u.className = "chat-pv-close"),
      u.setAttribute("aria-label", "Close"),
      (u.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>'),
      c.appendChild(l),
      c.appendChild(u));
    var m = document.createElement("div");
    m.className = "chat-pv-count";
    (r.appendChild(o), r.appendChild(i), r.appendChild(c), n.length > 1 && r.appendChild(m), document.body.appendChild(r));
    function p() {
      var t = e[a];
      ((d.textContent = (t && t.getAttribute("data-user")) || ""),
        (s.textContent = mpTime(parseInt((t && t.getAttribute("data-ts")) || "0", 10))),
        (m.textContent = a + 1 + " / " + n.length));
    }
    function f() {
      var t = e[a] && e[a].querySelector(".chat-photo-card img"),
        n = i.children[a] && i.children[a].querySelector("img");
      if (!t || !n || !n.naturalWidth) return null;
      var r = t.getBoundingClientRect(),
        o = window.innerWidth,
        c = window.innerHeight,
        l = Math.min(o / n.naturalWidth, c / n.naturalHeight),
        d = n.naturalWidth * l,
        s = n.naturalHeight * l,
        u = Math.max(r.width / d, r.height / s);
      return { n: n, t: "translate(" + (r.left + r.width / 2 - o / 2) + "px," + (r.top + r.height / 2 - c / 2) + "px) scale(" + u + ")" };
    }
    (p(),
      (i.scrollLeft = i.clientWidth * a),
      requestAnimationFrame(function () {
        i.scrollLeft = i.clientWidth * a;
        var e = f();
        (e && ((e.n.style.transition = "none"), (e.n.style.transform = e.t), e.n.offsetWidth, (e.n.style.transition = ""), (e.n.style.transform = "")),
          r.classList.add("on"));
      }),
      i.addEventListener(
        "scroll",
        function () {
          var e = Math.round(i.scrollLeft / Math.max(1, i.clientWidth));
          e !== a && e >= 0 && e < n.length && (y(), (a = e), p());
        },
        { passive: !0 },
      ));
    var g = !1;
    function h() {
      if (!g) {
        g = !0;
        var e = f();
        (r.classList.remove("on"),
          r.classList.add("closing"),
          e && ((e.n.style.transform = e.t)),
          setTimeout(function () {
            r.remove();
          }, 300));
      }
    }
    u.addEventListener("click", function (e) {
      (e.stopPropagation(), h());
    });
    /* zoom: pinch, double-tap; pan while zoomed; swipe down to dismiss */
    var v = 1, b = 0, x = 0, w = null, k = 0;
    function C() {
      return i.children[a] && i.children[a].querySelector("img");
    }
    function E() {
      var e = C();
      e && (e.style.transform = 1 === v ? "" : "translate(" + b + "px," + x + "px) scale(" + v + ")");
      i.style.overflowX = v > 1 ? "hidden" : "";
    }
    function y() {
      ((v = 1), (b = x = 0), E());
    }
    (r.addEventListener(
      "touchstart",
      function (e) {
        var t = e.touches;
        2 === t.length
          ? (w = { pinch: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), v: v })
          : 1 === t.length && (w = { x: t[0].clientX, y: t[0].clientY, b: b, ty: x, dir: 0 });
      },
      { passive: !0 },
    ),
      r.addEventListener(
        "touchmove",
        function (e) {
          if (w) {
            var t = e.touches;
            if (w.pinch && 2 === t.length)
              return (e.preventDefault(), (v = Math.max(1, Math.min(4, (w.v * Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)) / w.pinch))), void E());
            if (1 === t.length && !w.pinch) {
              var n = t[0].clientX - w.x,
                a = t[0].clientY - w.y;
              if (v > 1) return (e.preventDefault(), (b = w.b + n), (x = w.ty + a), void E());
              if ((w.dir || (Math.abs(a) > 8 && Math.abs(a) > Math.abs(n) ? (w.dir = "v") : Math.abs(n) > 8 && (w.dir = "h")), "v" === w.dir)) {
                e.preventDefault();
                var r = C(),
                  i = Math.max(0, a);
                (r && ((r.style.transition = "none"), (r.style.transform = "translateY(" + a + "px) scale(" + (1 - i / 1500) + ")")),
                  (o.style.opacity = String(Math.max(0.2, 1 - i / 400))),
                  (w.dy = a));
              }
            }
          }
        },
        { passive: !1 },
      ),
      r.addEventListener("touchend", function (e) {
        if (w && "v" === w.dir) {
          var t = C();
          (t && (t.style.transition = ""), (o.style.opacity = ""), (w.dy || 0) > 110 ? h() : t && (t.style.transform = ""));
        }
        e.touches.length || (w = null);
      }),
      r.addEventListener("click", function (e) {
        if (!e.target.closest(".chat-pv-top")) {
          var t = Date.now();
          if (t - k < 300) {
            if (((k = 0), v > 1)) y();
            else {
              var n = C(),
                a = n && n.getBoundingClientRect();
              ((v = 2.5), a && ((b = (a.left + a.width / 2 - e.clientX) * 1.5), (x = (a.top + a.height / 2 - e.clientY) * 1.5)), E());
            }
            return;
          }
          ((k = t),
            setTimeout(function () {
              k === t && 1 === v && !e.target.closest("img") && h();
            }, 300));
        }
      }));
  }
  /* tap = viewer, long-press = reactions (shared delegate), horizontal flick on a stack = next/prev */
  var mpPress = null;
  function mpPressStart(e) {
    var t = e.target.closest && e.target.closest("#chat .chat-photo-card");
    if (!t) return void (mpPress = null);
    var n = (e.touches && e.touches[0]) || e;
    mpPress = { card: t, msg: t.closest(".chat-msg"), x: n.clientX, y: n.clientY, t: Date.now(), dx: 0, h: !1, moved: !1 };
  }
  function mpPressMove(e) {
    if (mpPress) {
      var t = (e.touches && e.touches[0]) || e,
        n = t.clientX - mpPress.x,
        a = t.clientY - mpPress.y;
      if (!mpPress.h && (Math.abs(n) > 10 || Math.abs(a) > 10)) {
        mpPress.moved = !0;
        if (!(mpPress.msg && mpPress.msg.classList.contains("chat-photo-stacked") && Math.abs(n) > Math.abs(a))) return;
        mpPress.h = !0;
        mpPress.group = mpStackGroup(mpPress.msg);
        var r = mpPress.group[0].getAttribute("data-id"),
          o = mpStackCur[r] || 0;
        mpPress.top = mpPress.group[((o % mpPress.group.length) + mpPress.group.length) % mpPress.group.length].querySelector(".chat-photo-card");
      }
      if (mpPress.h) {
        (e.cancelable && e.preventDefault(), (mpPress.dx = n));
        var i = mpPress.top;
        i && ((i.style.transition = "none"), (i.style.transform = "translateX(" + n + "px) rotate(" + n / 18 + "deg)"));
      }
    }
  }
  function mpPressEnd() {
    var e = mpPress;
    if (((mpPress = null), e)) {
      if (e.h) {
        var t = e.top,
          n = e.group,
          a = n[0].getAttribute("data-id"),
          r = e.dx;
        if (((t.style.transition = "transform .32s cubic-bezier(.2,.8,.2,1)"), Math.abs(r) > 50)) {
          ((t.style.transform = "translateX(" + (r > 0 ? 130 : -130) + "%) rotate(" + (r > 0 ? 14 : -14) + "deg)"), window.haptic && window.haptic(8));
          var o = r < 0 ? 1 : -1;
          setTimeout(function () {
            ((t.style.transition = ""), (mpStackCur[a] = (mpStackCur[a] || 0) + o), mpStackLayout(n));
          }, 220);
        } else
          ((t.style.transform = ""),
            setTimeout(function () {
              t.style.transition = "";
            }, 340));
        return void (mpSuppressClick = Date.now());
      }
      Date.now() - e.t > 420 && (mpSuppressClick = Date.now());
    }
  }
  var mpSuppressClick = 0;
  (document.addEventListener("touchstart", mpPressStart, { passive: !0 }),
    document.addEventListener("touchmove", mpPressMove, { passive: !1 }),
    document.addEventListener("touchend", mpPressEnd, { passive: !0 }),
    document.addEventListener("touchcancel", mpPressEnd, { passive: !0 }),
    document.addEventListener("mousedown", function (e) {
      0 === e.button && mpPressStart(e);
    }),
    document.addEventListener("mousemove", function (e) {
      mpPress && mpPressMove(e);
    }),
    document.addEventListener("mouseup", mpPressEnd),
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("#chat .chat-photo-card");
      if (t) {
        if ((e.preventDefault(), Date.now() - mpSuppressClick < 500 || document.querySelector(".chat-react-picker"))) return;
        var n = t.closest(".chat-msg"),
          a = mpStackGroup(n),
          r = a.indexOf(n);
        if (a.length > 1) {
          var o = mpStackCur[a[0].getAttribute("data-id")] || 0;
          r = ((o % a.length) + a.length) % a.length;
        }
        mpPhotoViewer(a, Math.max(0, r));
      }
    }));
  /* "Now listening" (per dc): a message like "+frank ocean nights" becomes a
     glass card with the song resolved client-side via the iTunes Search API.
     Derived from the text, so it looks the same for everyone. */
  var mpNP = Object.create(null);
  var mpNPv = Object.create(null),
    mpNPio = null; // resolved results, so re-renders paint the card instantly
  function mpNPq(e) {
    return String(e || "").toLowerCase().replace(/\s*[(\[].*$/, "").split(" / ")[0].replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
  }
  function mpNPSearch(e, options) {
    options = options || {};
    return fetch("https://itunes.apple.com/search?entity=song&limit=" + (options.limit || 25) + "&term=" + encodeURIComponent(e) + (options.country ? "&country=" + encodeURIComponent(options.country) : ""), { signal:options.signal })
      .then(function (e) {
        if (!e.ok) throw new Error("Catalog unavailable");
        return e.json();
      })
      .then(function (e) {
        return (e && e.results) || [];
      });
  }
  // Original menu-only double-note mark; catalog fallbacks retain mpMusicIcon().
  function mpMusicMenuIcon() {
    return '<svg class="chat-music-menu-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.4 2.8 8.3 4.9a1.4 1.4 0 0 0-1.1 1.4v10.1c-.7-.2-1.5-.2-2.3.1-1.8.5-2.9 1.9-2.5 3.2.4 1.2 2.2 1.8 4 1.3 1.7-.5 2.9-1.7 2.9-3.1V9.4l8.3-1.7v6.6c-.7-.2-1.5-.2-2.3.1-1.8.5-2.9 1.9-2.5 3.2.4 1.2 2.2 1.8 4 1.3 1.7-.5 2.9-1.7 2.9-3.1V4.1c0-.9-.6-1.5-1.3-1.3Z"/></svg>';
  }
  function mpMusicIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6.5" cy="18.5" r="3.5"/><circle cx="18" cy="16" r="3"/><path d="M10 18.5L10 7C10 6.07655 10 5.61483 10.2635 5.32794C10.5269 5.04106 11.0175 4.9992 11.9986 4.91549C16.022 4.57222 18.909 3.26005 20.3553 2.40978C20.6508 2.236 20.7986 2.14912 20.8993 2.20672C21 2.26432 21 2.4315 21 2.76587V16"/><path d="M10 10C15.8667 10 19.7778 7.66667 21 7"/></svg>';
  }
  // Shared URLs carry the song ID, never a fuzzy artist/title match.
  function mpMusicRef(text) {
    try {
      var raw = String(text || "").trim().replace(/&amp;/g, "&");
      if (!/^https:\/\/(music|itunes)\.apple\.com\/[^\s]+$/.test(raw)) return null;
      var url = new URL(raw), id = url.searchParams.get("i");
      if (!id && /\/song\//.test(url.pathname)) id = (url.pathname.match(/\/(?:id)?(\d+)\/?$/) || [])[1];
      if (!/^\d{1,18}$/.test(id || "")) return null;
      var country = (url.pathname.match(/^\/([a-z]{2})\//i) || [])[1] || "ca";
      return { id:id, country:country.toLowerCase(), key:"apple:" + country.toLowerCase() + ":" + id, url:url.href };
    } catch (_) { return null; }
  }
  var mpMusicAlbums = Object.create(null), mpMusicArtists = Object.create(null);
  function mpMusicSearch(query, signal) {
    var fold = function (text) { return mpNPq(text).normalize("NFD").replace(/\p{M}+/gu, ""); },
      words = fold(query).split(" ").filter(Boolean), last = words[words.length - 1] || "",
      asked = " " + words.join(" ") + " ",
      /* covers/karaoke and alternate versions sink unless the query asks for them */
      junk = /\b(karaoke|originally performed|tribute|cover|instrumental|lullaby|8 bit|ringtone|string quartet|made famous|kidz bop|in the style of|rendition|parody|originally by)\b/,
      variant = /\b(remix|mix|version|live|acoustic|slowed|sped up|reverb|edit|session|demo|extended|rework|bootleg|nightcore|workout|bpm)\b/,
      pop = Object.create(null), split = null, titleQuery = !1;
    function lower(text) { return String(text || "").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase(); }
    function flat(text) { return lower(text).replace(/[^\p{L}\p{N} ]+/gu, " ").split(" ").filter(Boolean); }
    function primary(track) { return fold(String(track.artistName || "").split(/\s*(?:&|,|\bx\b|\bfeat\.?|\bwith\b)\s*/i)[0]); }
    function core(track) { return fold(String(track.trackName || "").split(/\s+-\s+/)[0]); }
    /* whole words, except the last query word may be a prefix (still typing) */
    function hit(tokens, word) { return tokens.some(function (t) { return t === word || (word === last && word.length > 1 && t.indexOf(word) === 0); }); }
    function unasked(re, text) { var m = text.match(new RegExp(re.source, "g")) || []; return m.some(function (w) { return asked.indexOf(" " + w + " ") < 0; }); }
    function score(track) {
      var title = core(track).split(" "), full = flat(track.trackName), artist = fold(track.artistName).split(" "),
        main = primary(track).split(" "), album = flat(track.collectionName), total = 0, inTitle = 0, inArtist = 0;
      words.forEach(function (w) {
        if (hit(title, w)) { total += 5; inTitle++; }
        else if (hit(full, w)) total += 4;
        else if (hit(artist, w)) { total += 5; inArtist++; }
        else if (hit(album, w)) total += 1;
      });
      if (inTitle && inArtist) total += 3;
      /* the query names the artist: songs BY them beat songs titled after them */
      if (primary(track) === words.join(" ")) total += 16;
      else if (words.every(function (w) { return hit(main, w); })) total += main.every(function (t) { return words.indexOf(t) >= 0; }) ? 10 : 4;
      /* exact title, or the query as a leading title prefix ("pink pony" → Pink Pony Club).
         Keep these tied so Apple's own order can prefer the well-known recording. */
      if (title.join(" ") === words.join(" ") || (words.length && title.length >= words.length && title.slice(0, words.length).join(" ") === words.join(" "))) total += 8;
      else if (inTitle && title.every(function (t) { return words.indexOf(t) >= 0 || (t.indexOf(last) === 0 && last.length > 1); })) total += 6;
      else if (inTitle && (" " + title.join(" ")).indexOf(" " + words.filter(function (w) { return !hit(main, w) || hit(title, w); }).join(" ")) === 0) total += 2;
      var text = lower(track.trackName + " " + track.artistName + " " + track.collectionName);
      if (unasked(junk, text)) total -= 8;
      if (unasked(variant, lower(String(track.trackName).replace(/^[^(\[-]*/, "")))) total -= 4;
      /* the artist Apple keeps returning for this query is the original */
      if ((pop[primary(track)] || 0) >= 6) total += 3;
      /* "future some more" / "some more future": artist part + title part, in either order */
      if (split && primary(track) === split.artist) {
        if (split.title.every(function (w) { return hit(title, w); })) total += 12;
        else if (!titleQuery && !split.paired) total += 10;
      }
      return total;
    }
    /* score first, then Apple's own relevance order (best position across storefronts) */
    function rank(tracks) { var seen = Object.create(null); return tracks.map(function (t, i) { return { t:t, s:score(t), p:t._mpPos == null ? 1e3 + i : t._mpPos }; }).sort(function (a, b) { return b.s - a.s || a.p - b.p; }).map(function (x) { return x.t; }).filter(function (t) { var k = songKey(t); if (seen[k]) return !1; seen[k] = 1; return !0; }); }
    function songKey(t) { return fold(t.trackName) + "|" + fold(t.artistName) + "|" + (t.trackExplicitness === "explicit" ? 1 : 0); }
    /* Canadian storefront first (dc), merged with the US catalog for songs the CA index ranks low or misses */
    function store(country) { return mpNPSearch(query, { signal:signal, country:country, limit:50 }).catch(function (error) { if (error.name === "AbortError") throw error; return null; }); }
    /* Deezer's relevance mapped to Apple tracks by our Worker (finds songs the iTunes index misses);
       any failure or timeout falls back to the iTunes CA+US search below */
    function deezer() {
      var ac = new AbortController(), to = setTimeout(function () { ac.abort(); }, 4500);
      if (signal) signal.addEventListener("abort", function () { ac.abort(); });
      return fetch("https://api.misereperdue.com/api/music/search?q=" + encodeURIComponent(query), { signal:ac.signal })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) { clearTimeout(to); return data && data.ok && Array.isArray(data.tracks) ? data.tracks.filter(function (t) { return t && t.trackId && t.trackName && t.artistName && t.trackViewUrl; }) : null; })
        .catch(function () { clearTimeout(to); return null; });
    }
    return Promise.all([store("ca"), store("us"), deezer()]).then(function (both) {
      var dz = both[2];
      /* one storefront failing still shows the other; both failing is a catalog error */
      if (!both[0] && !both[1] && !(dz && dz.length)) throw new Error("Catalog unavailable");
      both = [both[0] || [], both[1] || []];
      var byKey = Object.create(null), ids = Object.create(null), tracks = [];
      [both[0], both[1]].forEach(function (list, store) {
        list.forEach(function (t, i) {
          if (!t || !t.trackId) return;
          pop[primary(t)] = (pop[primary(t)] || 0) + 1;
          var pos = i + store * 0.5, key = songKey(t), had = byKey[key];
          if (had) { had._mpPos = Math.min(had._mpPos, pos); return; }
          if (ids[t.trackId]) return;
          ids[t.trackId] = 1; t._mpPos = pos; byKey[key] = t; tracks.push(t);
        });
      });
      if (dz && dz.length) {
        /* Merge Worker tracks into the same pool and re-rank everything so an exact
           iTunes title+artist can beat a sparse or wrong Worker lead (dc t554u). */
        dz.forEach(function (t, i) {
          if (!t || !t.trackId) return;
          t.artistName = String(t.artistName || "").replace(/^(Song|Album|Single|EP|Music Video|Playlist|Artist|Compilation)\s*[\u00b7\u2022\u2027\u2219.•.\-–—]\s*/i, "").replace(/\s+/g, " ").trim();
          pop[primary(t)] = (pop[primary(t)] || 0) + 1;
          var key = songKey(t), had = byKey[key];
          if (had) {
            had._mpPos = Math.min(had._mpPos, i * 0.25);
            if (!had.collectionName && t.collectionName) had.collectionName = t.collectionName;
            return;
          }
          if (ids[t.trackId]) return;
          ids[t.trackId] = 1; t._mpPos = i * 0.25; byKey[key] = t; tracks.push(t);
        });
      }
      /* split the query into an artist (a leading or trailing run of words that is exactly a returned
         artist's name) and a title (the rest), so either order and short names like "Future" work */
      for (var k = words.length - 1; k >= 1 && !split; k--) [words.slice(0, k), words.slice(words.length - k)].forEach(function (a, lead) {
        if (split) return;
        var name = a.join(" "), rest = lead ? words.slice(0, words.length - k) : words.slice(k),
          by = tracks.filter(function (t) { return primary(t) === name; });
        if (by.length) split = { artist:name, title:rest, id:by[0].artistId };
      });
      titleQuery = tracks.some(function (t) { var c = core(t).split(" "); return words.every(function (w) { return hit(c, w); }) && c.every(function (w) { return words.indexOf(w) >= 0; }); });
      var paired = split && tracks.some(function (t) { return primary(t) === split.artist && split.title.every(function (w) { return hit(core(t).split(" "), w); }); });
      /* the named artist's song isn't in Apple's plain search: ask for that artist's own top songs */
      var artistSongs = split && !paired && /^\d+$/.test(String(split.id || "")) ? (mpMusicArtists[split.id] || (mpMusicArtists[split.id] = fetch("https://itunes.apple.com/lookup?id=" + split.id + "&entity=song&country=ca&limit=200", { signal:signal })
        .then(function (response) { if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); })
        .then(function (data) { return (data.results || []).filter(function (track) { return !!track.trackId; }); })
        .catch(function (error) { delete mpMusicArtists[split.id]; if (error.name === "AbortError") throw error; return []; }))).then(function (list) {
          return list.filter(function (t) { return !ids[t.trackId] && split.title.every(function (w) { return hit(core(t).split(" "), w); }); });
        }) : Promise.resolve([]);
      if (split) split.paired = paired;
      return artistSongs.then(function (found) {
      found.forEach(function (t) { ids[t.trackId] = 1; t._mpPos = 0; tracks.push(t); });
      /* a real title+artist match: every query word found and the whole title asked for */
      var exact = tracks.some(function (track) { var title = fold(track.trackName), text = title + " " + fold(track.artistName); return words.every(function (word) { return text.includes(word); }) && title.split(" ").every(function (w) { return words.indexOf(w) >= 0; }); });
      if (exact || words.length < 2) return rank(tracks);
      var albums = [];
      /* albums by the artist the query names come first (e.g. Blonde for "frank ocean nights") */
      var byArtist = rank(tracks).filter(function (t) { var a = fold(t.artistName); return words.some(function (w) { return a.split(" ").indexOf(w) >= 0; }); });
      byArtist.concat(rank(tracks)).forEach(function (track) { var id = String(track.collectionId || ""); if (/^\d+$/.test(id) && albums.indexOf(id) < 0 && albums.length < 2) albums.push(id); });
      return Promise.all(albums.map(function (id) {
        if (mpMusicAlbums[id]) return mpMusicAlbums[id];
        return fetch("https://itunes.apple.com/lookup?id=" + id + "&entity=song&country=ca&limit=200", { signal:signal })
          .then(function (response) { if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); })
          .then(function (data) { return (mpMusicAlbums[id] = (data.results || []).filter(function (track) { return !!track.trackId; })); })
          .catch(function (error) { if (error.name === "AbortError") throw error; return []; });
      })).then(function (extra) { return rank(tracks.concat.apply(tracks, extra)); });
      });
    });
  }
  function mpMusicRemember(ref, result) {
    mpNPv[ref.key] = result;
    mpNP[ref.key] = Promise.resolve(result);
    try { localStorage.setItem("mp-music-v1:" + ref.key, JSON.stringify(result)); } catch (_) {}
    return result;
  }
  function mpMusicLookup(ref) {
    if (mpNP[ref.key]) return mpNP[ref.key];
    try {
      var cached = JSON.parse(localStorage.getItem("mp-music-v1:" + ref.key) || "null");
      if (cached && cached.title && cached.artist && mpMusicRef(cached.url)?.key === ref.key) return Promise.resolve(mpMusicRemember(ref, cached));
    } catch (_) {}
    return (mpNP[ref.key] = fetch("https://itunes.apple.com/lookup?id=" + ref.id + "&entity=song&country=" + ref.country)
      .then(function (response) { if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); })
      .then(function (data) {
        var track = (data.results || []).find(function (track) { return String(track.trackId) === ref.id && track.trackName && track.artistName; });
        if (!track) { delete mpNP[ref.key]; return null; }
        var result = mpNPOut(track); result.url = ref.url;
        return mpMusicRemember(ref, result);
      }).catch(function () { delete mpNP[ref.key]; return null; }));
  }
  function mpNPPick(e, t) {
    var n = " " + mpNPq(t) + " ",
      a = null,
      r = -1;
    return (
      e.forEach(function (e) {
        var t = mpNPq(e.trackName),
          o = mpNPq(e.artistName),
          i = (t && n.indexOf(" " + t + " ") >= 0 ? 2 : 0) + (o && n.indexOf(" " + o + " ") >= 0 ? 3 : 0);
        i > r && ((r = i), (a = e));
      }),
      { r: a, s: r }
    );
  }
  function mpMusicTitle(title) {
    return String(title || "").replace(/\s*[([]\s*(?:feat(?:uring)?\.?|ft\.?)\s+[^)\]]*[)\]]/gi, "").replace(/\s+(?:[-–—]\s*)?(?:feat(?:uring)?\.?|ft\.?)\s+.+$/i, "").trim();
  }
  function mpNPOut(e, t) {
    return { title: t || e.trackName, artist: e.artistName, art: String(e.artworkUrl100 || "").replace(/\/\d+x\d+bb\./, "/300x300bb."), url: t ? e.artistViewUrl || "" : e.trackViewUrl || "", preview: t ? "" : e.previewUrl || "" };
  }
  function mpNPLookup(e) {
    if (mpNP[e]) return mpNP[e];
    var t = "mp-np4:" + e.toLowerCase();
    try {
      var n = JSON.parse(localStorage.getItem(t) || "null");
      if (n) return ((mpNPv[e] = n.r || null), (mpNP[e] = Promise.resolve(n.r || null)));
    } catch (e) {}
    var a = e.split(/\s+/);
    return (mpNP[e] = mpNPSearch(e)
      .then(function (t) {
        var n = mpNPPick(t, e);
        if (n.r && n.s >= 5) return mpNPOut(n.r);
        var nF = n.r && n.s >= 2 ? mpNPOut(n.r) : null;
        /* not on iTunes: MusicBrainz + Cover Art Archive, exact title + artist only */
        return fetch("https://musicbrainz.org/ws/2/recording?fmt=json&limit=15&query=" + encodeURIComponent(e))
          .then(function (e) {
            return e.json();
          })
          .then(function (t) {
            var n = ((t && t.recordings) || []).map(function (e) {
                return { trackName: e.title, artistName: (e["artist-credit"] || []).map(function (e) { return e.name + (e.joinphrase || ""); }).join("") || "", rel: (e.releases || []).map(function (e) { return e.id; }) };
              }),
              a = mpNPPick(n, e);
            return a.r && a.s >= 5
              ? {
                  title: a.r.trackName,
                  artist: a.r.artistName,
                  arts: a.r.rel.slice(0, 4).filter(function (e) { return /^[0-9a-f-]{36}$/.test(e); }).map(function (e) { return "https://coverartarchive.org/release/" + e + "/front-250"; }),
                  url: "https://music.apple.com/search?term=" + encodeURIComponent(a.r.artistName + " " + a.r.trackName),
                }
              : null;
          })
          .catch(function () {
            return null;
          })
          .then(function (t) {
            return t || mpNPArtist(e, nF);
          });
      })
      .then(function (n) {
        return n && (n.art || (n.arts && n.arts.length)) ? n : mpNPDz(e, n);
      })
      .then(function (n) {
        mpNPv[e] = n;
        try {
          localStorage.setItem(t, JSON.stringify({ r: n }));
        } catch (e) {}
        return n;
      })
      .catch(function () {
        return (delete mpNP[e], null);
      }));
  }
  /* Deezer fallback (same-origin proxy, functions/np-search.js): many indie
     tracks (e.g. Lil Speedy "Pain") are on Deezer but not Apple Music. */
  function mpNPDz(e, n) {
    return fetch("/np-search?q=" + encodeURIComponent(e))
      .then(function (e) {
        return e.ok ? e.json() : [];
      })
      .then(function (t) {
        var a = mpNPPick(t || [], e);
        if (a.r && a.s >= 5 && a.r.art)
          return { title: a.r.trackName, artist: a.r.artistName, art: a.r.art, url: (n && n.url) || "https://music.apple.com/search?term=" + encodeURIComponent(a.r.artistName + " " + a.r.trackName) };
        if (n && a.r && a.r.art && mpNPq(a.r.artistName) === mpNPq(n.artist)) n.art = a.r.art;
        return n;
      })
      .catch(function () {
        return n;
      });
  }
  /* Cover gradient (per dc): 3 vibrant colours from a 24px canvas sample, cached per cover. */
  var mpNPgc = Object.create(null);
  function mpNPGrad(u, cb) {
    var k = "mp-npg:" + u;
    if (mpNPgc[u]) return cb(mpNPgc[u]);
    try {
      var c0 = localStorage.getItem(k);
      if (c0) return cb((mpNPgc[u] = c0));
    } catch (e) {}
    var im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = function () {
      try {
        var S = 24, cv = document.createElement("canvas");
        cv.width = cv.height = S;
        var x = cv.getContext("2d", { willReadFrequently: !0 });
        x.drawImage(im, 0, 0, S, S);
        var d = x.getImageData(0, 0, S, S).data, bk = {};
        for (var i = 0; i < d.length; i += 4) {
          var r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, l = (mx + mn) / 510;
          var key = (r >> 5) + "," + (g >> 5) + "," + (b >> 5), w = 0.25 + sat * 2 * (1 - Math.abs(l - 0.5));
          (bk[key] || (bk[key] = { n: 0, r: 0, g: 0, b: 0 }), (bk[key].n += w), (bk[key].r += r * w), (bk[key].g += g * w), (bk[key].b += b * w));
        }
        var L = Object.keys(bk).map(function (k) { var o = bk[k]; return [o.r / o.n, o.g / o.n, o.b / o.n, o.n]; }).sort(function (a, b) { return b[3] - a[3]; }), P = [];
        L.forEach(function (c) {
          P.length < 3 && P.every(function (p) { return Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) > 90; }) && P.push(c);
        });
        for (; P.length < 3; ) P.push(P[0] || [70, 80, 110]);
        var f = function (c) { var m = Math.max(c[0], c[1], c[2]), s = m > 200 ? 200 / m : m < 115 && m ? 115 / m : 1; return "rgb(" + c.slice(0, 3).map(function (v) { return Math.round(v * s); }).join(",") + ")"; };
        var gr = "radial-gradient(120% 140% at 0% 0%," + f(P[0]) + " 0%,transparent 65%),radial-gradient(120% 140% at 100% 100%," + f(P[2]) + " 0%,transparent 70%),linear-gradient(135deg," + f(P[0]) + "," + f(P[1]) + " 55%," + f(P[2]) + ")";
        mpNPgc[u] = gr;
        try { localStorage.setItem(k, gr); } catch (e) {}
        cb(gr);
      } catch (e) {
        cb("");
      }
    };
    im.onerror = function () { cb(""); };
    im.src = u;
  }
  function mpNPArtist(e, nF) {
    var a = e.split(/\s+/);
    {
        /* forgiving: find the artist from the first words, then match the song
           from the rest; if the song isn't in Apple's catalog keep the typed title */
        var r = [];
        for (var o = Math.min(3, a.length - 1); o >= 1; o--) r.push(o);
        return (function t(n) {
          if (!r.length) return n && n.s >= 3 ? n : null;
          var o = r.shift(),
            i = a.slice(0, o).join(" "),
            c = a.slice(o).join(" ");
          return mpNPSearch(i + " " + c.split(" ")[0]).then(function (a) {
            return mpNPSearch(i).then(function (r) {
              var o = a.concat(r),
                l = mpNPPick(o, e);
              if (l.r && l.s >= 5) return mpNPOut(l.r);
              var d = o.filter(function (e) {
                return mpNPq(e.artistName) === mpNPq(i) || (" " + mpNPq(e.artistName) + " ").indexOf(" " + mpNPq(i) + " ") >= 0;
              })[0];
              return d
                ? { s: 3, v: { title: c.replace(/(^|\s)\p{L}/gu, function (e) { return e.toUpperCase(); }), artist: d.artistName, art: "", url: d.artistViewUrl || "" } }
                : t(n);
            });
          });
        })(null).then(function (e) {
          return e && e.v ? e.v : e && e.title ? e : nF;
        });
    }
  }
  /* Globe post embeds (per dc): compact one-row card for misereperdue.com/t/<id> or /#globe/<id>.
     Data from the public GET /api/forum/thread/<id>?limit=1, cached per id. */
  var mpGeCache = Object.create(null);
  var MP_GE_RE = /(?:https?:\/\/)?(?:www\.)?misereperdue\.com\/+(?:t\/|#\/?globe\/|globe(?:\.html)?(?:\/|#\/?(?:globe\/)?|\?(?:[^\s#]*&)?(?:t|id|thread)=))(t\d+)\b[^\s<>"']*/i;
  function mpGeAgo(ts) {
    var d = Math.max(0, (Date.now() - ts) / 1000);
    return d < 60 ? "now" : d < 3600 ? Math.floor(d / 60) + "m" : d < 86400 ? Math.floor(d / 3600) + "h" : d < 604800 ? Math.floor(d / 86400) + "d" : new Date(ts).toLocaleDateString(void 0, { month: "short", day: "numeric" });
  }
  function mpToast(t) { try { window.mpHide && mpHide.toast ? mpHide.toast(t) : alert(t); } catch (_) {} }
  /* VIP = member badge or owner (per dc). Owner always counts. */
  /* Display-only lowercase usernames (per dc). Does not rename accounts. */
  function mpName(u) {
    return String(u == null ? "" : u).replace(/^@+/, "").toLowerCase();
  }
  function mpAt(u) {
    var n = mpName(u);
    return n ? "@" + n : "";
  }
  try {
    window.mpName = mpName;
    window.mpAt = mpAt;
  } catch (_) {}

  function mpIsVip() { return !!(s && (s.member || s.owner)); }

  /* Globe embed composer preview (per dc): FLIP from tapped row into the
     message-bar slot (same radius/height/width as .chat-inputbar). X occupies
     the + slot; Send occupies the send slot. */
  var mpGpPickEpoch = 0, mpGpKeyboardPickUntil = 0;
  document.addEventListener('pointerdown',function(event){var active=document.activeElement;if(event.target.closest&&event.target.closest('.chat-music-track,.chat-gp-row')&&active&&/^(INPUT|TEXTAREA)$/.test(active.tagName))mpGpKeyboardPickUntil=performance.now()+600;},true);
  var mpGpDraft = null, mpGpBusy = !1, mpGpFlyer = null, mpGpAnim = null, mpGpResize = null;
  function mpGpReduced() {
    return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function mpGpThumbUrl(thumb) {
    if (!thumb) return "";
    if (/^(https?:|\/|data:)/i.test(thumb)) return thumb;
    if (/^[A-Za-z0-9_-]+$/.test(thumb)) return e + "/api/media/" + thumb;
    return "";
  }
  function mpGpMeasure() {
    var row = document.querySelector("#chat .chat-inputrow");
    var plus = row && row.querySelector(".chat-plus");
    var bar = row && row.querySelector(".chat-inputbar");
    var send = bar && bar.querySelector(".chat-send");
    if (!row || !bar) return null;
    var bcs = getComputedStyle(bar);
    return {
      row: row,
      plus: plus,
      bar: bar,
      send: send,
      rowR: row.getBoundingClientRect(),
      plusR: plus ? plus.getBoundingClientRect() : null,
      barR: bar.getBoundingClientRect(),
      sendR: send ? send.getBoundingClientRect() : null,
      radius: bcs.borderRadius,
      height: bar.offsetHeight,
      padL: bcs.paddingLeft,
      padR: bcs.paddingRight,
      padT: bcs.paddingTop,
      padB: bcs.paddingBottom,
      gap: getComputedStyle(row).gap || "8px",
    };
  }
  function mpGpKillFlyer() {
    if (mpGpAnim) {
      try { mpGpAnim.cancel(); } catch (_) {}
      mpGpAnim = null;
    }
    if (mpGpFlyer && mpGpFlyer.parentNode) mpGpFlyer.parentNode.removeChild(mpGpFlyer);
    mpGpFlyer = null;
  }
  function mpGpUnbindResize() {
    if (!mpGpResize) return;
    window.removeEventListener("resize", mpGpResize);
    window.visualViewport && window.visualViewport.removeEventListener("resize", mpGpResize);
    mpGpResize = null;
  }
  function mpGpApplyBarMetrics(card, m) {
    if (!card || !m) return;
    card.style.height = m.height + "px";
    card.style.borderRadius = m.radius;
    card.style.boxSizing = "border-box";
    if (m.padL) card.style.paddingLeft = m.padL;
    if (m.padR) card.style.paddingRight = m.padR;
    if (m.padT) card.style.paddingTop = m.padT;
    if (m.padB) card.style.paddingBottom = m.padB;
  }
  function mpGpBuildCard(t) {
    var card = document.createElement("div");
    card.className = "chat-gp-prev-card" + (t.kind === "music" ? " is-music" : "");
    card.setAttribute("aria-hidden", "true");
    card.innerHTML =
      '<span class="chat-gp-prev-pic"></span>' +
      '<span class="chat-gp-prev-tx">' +
        '<span class="chat-gp-prev-who"></span>' +
        '<span class="chat-gp-prev-title"></span>' +
      '</span>';
    card.querySelector(".chat-gp-prev-who").textContent =
      (t.kind === "music" ? t.artist : mpAt(t.author || "unknown")) + (t.createdAt ? " · " + mpGeAgo(t.createdAt) : "");
    card.querySelector(".chat-gp-prev-title").textContent = t.kind === "music" ? mpMusicTitle(t.title) : t.title || t.excerpt || "Globe post";
    var pic = card.querySelector(".chat-gp-prev-pic");
    var srcThumb = mpGpThumbUrl(t.thumb);
    if (srcThumb) {
      var im = document.createElement("img");
      im.alt = "";
      im.draggable = !1;
      im.src = srcThumb;
      im.onerror = function () { im.remove(); pic.classList.add("is-glyph"); pic.textContent = (t.title || "G").replace(/[^A-Za-z0-9\u00C0-\u024F]+/g, " ").trim().charAt(0).toUpperCase() || "G"; };
      pic.appendChild(im);
    } else {
      try {
        var av = J(t.author, t.authorAvatar, "xs", t.hasAvatarImg ? t.avatarV : void 0);
        if (av) { pic.appendChild(av); pic.classList.add("is-av"); }
        else {
          pic.classList.add("is-glyph");
          var letters = String(t.title || "G").replace(/[^A-Za-z0-9\u00C0-\u024F]+/g, " ").trim();
          pic.textContent = (letters ? letters.charAt(0) : "G").toUpperCase();
        }
      } catch (_) {
        pic.classList.add("is-glyph");
        pic.textContent = "G";
      }
    }
    return card;
  }
  function mpGpClearPreview(opts) {
    opts = opts || {};
    mpGpPickEpoch++;
    mpGpBusy = !1;
    mpGpDraft = null;
    mpGpKillFlyer();
    mpGpUnbindResize();
    var row = document.querySelector("#chat .chat-inputrow");
    if (!row) return;
    row.classList.remove("is-gp-prev", "is-gp-prev-pending", "is-gp-sending");
    var p = row.querySelector(".chat-gp-prev");
    if (!p) return;
    if (opts.instant || mpGpReduced()) { p.remove(); return; }
    p.classList.remove("is-in");
    p.classList.add("is-out");
    setTimeout(function () { p.parentNode && p.remove(); }, 240);
  }
  function mpGpMountSettled(t, m) {
    var row = m.row;
    var existing = row.querySelector(".chat-gp-prev");
    existing && existing.remove();
    var prev = document.createElement("div");
    prev.className = "chat-gp-prev is-in";
    prev.setAttribute("role", "group");
    prev.setAttribute("aria-label", t.kind === "music" ? "Music preview" : "Globe post preview");
    var x = document.createElement("button");
    x.type = "button";
    x.className = "chat-gp-prev-x";
    x.setAttribute("aria-label", "Cancel");
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>';
    if (m.plus) {
      x.style.width = m.plus.offsetWidth + "px";
      x.style.height = m.plus.offsetHeight + "px";
    }
    var card = mpGpBuildCard(t);
    card.removeAttribute("aria-hidden");
    mpGpApplyBarMetrics(card, m);
    var snd = document.createElement("button");
    snd.type = "button";
    snd.className = "chat-send chat-gp-prev-send";
    snd.setAttribute("aria-label", t.kind === "music" ? "Send song" : "Send");
    snd.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.5V19"/><path d="M18 11C18 11 13.5811 5.00001 12 5C10.4188 4.99999 6 11 6 11"/></svg>';
    /* Send lives inside the pill (same as the real composer). */
    card.appendChild(snd);
    prev.appendChild(x);
    prev.appendChild(card);
    x.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (mpGpBusy) return;
      window.haptic && window.haptic(8);
      mpGpClearPreview();
    });
    function doSend(ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      if (mpGpBusy || !mpGpDraft) return;
      if (mpGpDraft.kind === "music") {
        var songDraft = mpGpDraft, songPublic = !mpPM.to;
        mpGpBusy = true; snd.disabled = true; row.classList.add("is-gp-sending");
        if (!songDraft.cid) songDraft.cid = "music-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
        E("/api/send", {method:"POST",body:{text:songDraft.url,cid:songDraft.cid,to:mpPM.to || void 0}}).then(function(response){
          if (!response || !response.ok) throw new Error(response && response.error || "Couldn’t send. Try again.");
          if (response.message) Fe(response.message);
          if (typeof response.points === "number") te(response.points);
          songPublic && mpListenFromSong(songDraft.url);
          Ne(true); if (mpGpDraft === songDraft) mpGpClearPreview();
        }).catch(function(error){if(mpGpDraft!==songDraft)return;mpGpBusy=false;snd.disabled=false;row.classList.remove("is-gp-sending");mpToast(error.message);});
        return;
      }
      var inp = document.querySelector("#chat .chat-inputbar input");
      var realSend = document.querySelector("#chat .chat-inputbar .chat-send");
      if (!inp || !realSend) return;
      var url = "https://misereperdue.com/t/" + mpGpDraft.id;
      var draft = mpGpDraft;
      mpGpBusy = !0;
      row.classList.add("is-gp-sending");
      inp.value = url;
      try { inp.dispatchEvent(new Event("input", { bubbles: !0 })); } catch (_) {}
      window.haptic && window.haptic(15);
      /* Quick send: fade preview, restore bar, fire real send. On failure, restore preview. */
      var red = mpGpReduced();
      function fire() {
        mpGpDraft = null;
        row.classList.remove("is-gp-prev", "is-gp-prev-pending", "is-gp-sending");
        prev.remove();
        mpGpUnbindResize();
        mpGpBusy = !1;
        try { realSend.click(); } catch (_) {}
      }
      if (red) return fire();
      prev.classList.add("is-sending");
      setTimeout(fire, 180);
      /* If the toast/error path fires soon after, re-offer the draft. */
      setTimeout(function () {
        try {
          var err = document.querySelector(".mp-toast, .chat-attach-err");
          if (err && /couldn|fail|try again|connection/i.test(err.textContent || "")) {
            mpGpShowPreview(draft, null);
          }
        } catch (_) {}
      }, 900);
    }
    snd.addEventListener("click", doSend);
    /* Use click only — touchstart+click double-fired send on some WebKit builds. */
    row.appendChild(prev);
    row.classList.add("is-gp-prev");
    mpGpResize = function () {
      if (!mpGpDraft) return;
      var nm = mpGpMeasure();
      nm && mpGpApplyBarMetrics(card, nm);
    };
    window.addEventListener("resize", mpGpResize);
    window.visualViewport && window.visualViewport.addEventListener("resize", mpGpResize);
  }
  function mpGpShowPreview(t, fromRect, keyboardSettled) {
    if (!t || !t.id) return;
    if (mpGpDraft && mpGpDraft.id === t.id && document.querySelector("#chat .chat-gp-prev")) return;
    var pickEpoch=++mpGpPickEpoch,active=document.activeElement;
    if(!keyboardSettled && window.visualViewport && matchMedia('(pointer:coarse)').matches && (performance.now()<mpGpKeyboardPickUntil || (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) || visualViewport.height<innerHeight-90)){
      if(active&&active.blur)active.blur();setTimeout(function(){if(pickEpoch===mpGpPickEpoch && document.querySelector('#journal.on'))mpGpShowPreview(t,fromRect,true);},300);return;
    }
    /* Detach handlers before kill so cancel doesn't clobber the new draft. */
    if (mpGpAnim) {
      try { mpGpAnim.onfinish = null; mpGpAnim.oncancel = null; } catch (_) {}
    }
    mpGpKillFlyer();
    /* Blur keyboard so the bar is in its resting rect. */
    try {
      var ae = document.activeElement;
      ae && ae.blur && ae.blur();
    } catch (_) {}
    var m = mpGpMeasure();
    if (!m) { mpGpBusy = !1; return; }
    mpGpClearPreview({ instant: !0 });
    mpGpDraft = {
      id: t.id,
      kind:t.kind, url:t.url, artist:t.artist, song:t.song, cid:t.cid,
      title: t.title || "",
      author: t.author || "",
      authorAvatar: t.authorAvatar,
      hasAvatarImg: t.hasAvatarImg,
      avatarV: t.avatarV,
      thumb: t.thumb || "",
      createdAt: t.createdAt || 0,
      excerpt: t.excerpt || "",
    };
    var red = mpGpReduced();
    var dest = m.barR;
    if (red || !fromRect || !dest.width) {
      mpGpMountSettled(mpGpDraft, m);
      return;
    }
    mpGpBusy = !0;
    /* FLIP flyer: place at DESTINATION size, invert with transform only (GPU). */
    var flyer = document.createElement("div");
    flyer.className = "chat-gp-flyer";
    flyer.setAttribute("aria-hidden", "true");
    var flyerCard = mpGpBuildCard(mpGpDraft);
    flyer.appendChild(flyerCard);
    document.body.appendChild(flyer);
    mpGpFlyer = flyer;
    var x0 = fromRect.left, y0 = fromRect.top, w0 = Math.max(1, fromRect.width), h0 = Math.max(1, fromRect.height);
    var x1 = dest.left, y1 = dest.top, w1 = Math.max(1, dest.width), h1 = Math.max(1, dest.height);
    var r1 = (parseFloat(m.radius) || (h1 / 2));
    flyer.style.left = x1 + "px";
    flyer.style.top = y1 + "px";
    flyer.style.width = w1 + "px";
    flyer.style.height = h1 + "px";
    flyer.style.borderRadius = r1 + "px";
    flyer.style.transformOrigin = "top left";
    flyer.style.zIndex = "2147483000";
    flyer.style.pointerEvents = "none";
    flyer.style.overflow = "hidden";
    flyerCard.style.width = "100%";
    flyerCard.style.height = "100%";
    flyerCard.style.borderRadius = "inherit";
    mpGpApplyBarMetrics(flyerCard,m);flyerCard.style.height='100%';
    var ghostSend=document.createElement('span');ghostSend.className='chat-send chat-gp-prev-send';ghostSend.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5V19"/><path d="M18 11C18 11 13.5811 5.00001 12 5C10.4188 4.99999 6 11 6 11"/></svg>';flyerCard.appendChild(ghostSend);

    // Animate the container geometry; never stretch text or cover artwork.
    var anim = flyer.animate([
      {left:x0+'px',top:y0+'px',width:w0+'px',height:h0+'px',borderRadius:'14px',opacity:.9},
      {left:x1+'px',top:y1+'px',width:w1+'px',height:h1+'px',borderRadius:r1+'px',opacity:1}
    ],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    mpGpAnim = anim;
    m.row.classList.add("is-gp-prev-pending");
    function finish(ok) {
      mpGpAnim = null;
      m.row.classList.remove("is-gp-prev-pending");
      mpGpKillFlyer();
      mpGpBusy = !1;
      if (!ok) {
        /* Cancelled mid-flight (route change, + reopen, etc.): drop draft, restore bar. */
        if (mpGpDraft) { mpGpDraft = null; }
        return;
      }
      if (!mpGpDraft) return;
      var m2 = mpGpMeasure() || m;
      mpGpMountSettled(mpGpDraft, m2);
    }
    anim.onfinish = function () { finish(!0); };
    anim.oncancel = function () { finish(!1); };
  }
  try {
    window.MPChat = window.MPChat || {};
    window.MPChat.clearGlobePreview = function () { mpGpClearPreview({ instant: !0 }); };
  } catch (_) {}

  /* + menu morph (per dc): the small glass menu grows into a Globe post picker or a poll composer. */
  var mpGpCache = null, mpGpAt = 0;
  /* dc: the chat must not scroll behind the + menu or any of its panels (Music, Misery FM, Polls,
     Globe). iOS PWA safe: no overflow/position tricks on the page (they jump on iOS); instead touch,
     wheel and key scrolling outside the panel is cancelled, scroll chaining out of the panel's own
     scrollers is stopped at their edges, any stray page scroll is pinned back, and the position is
     restored on close (or the bottom kept, if the chat was at the bottom when the menu opened). */
  var mpLock = null;
  function mpCanScroll(el, dx, dy, root) {
    var hz = Math.abs(dx) > Math.abs(dy);
    for (; el && el.nodeType === 1; el = el.parentElement) {
      var cs = getComputedStyle(el);
      if (hz) { if (/auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && (dx < 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0)) return !0; }
      else if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && (dy < 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return !0;
      if (el === root) break;
    }
    return !1;
  }
  function mpScrollLock(m) {
    if (mpLock) { mpLock.m = m; return; }
    var de = document.documentElement, L = { m: m, y: window.scrollY, x0: 0, y0: 0 };
    L.end = L.y + window.innerHeight >= de.scrollHeight - 8;
    function inPanel(t) { return L.m && t && t.nodeType === 1 && L.m.contains(t); }
    function typing() { var a = document.activeElement; return inPanel(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "range"; }
    function st(e) { var t = e.touches && e.touches[0]; if (t) { L.x0 = t.clientX; L.y0 = t.clientY; } }
    function mv(e) {
      if (!e.touches || e.touches.length !== 1) return;
      var t = e.touches[0], dx = t.clientX - L.x0, dy = t.clientY - L.y0, tg = e.target;
      if (inPanel(tg)) {
        if (tg.closest('input[type="range"], textarea, .fm-drag')) return;
        if (mpCanScroll(tg, dx, dy, L.m)) { L.x0 = t.clientX; L.y0 = t.clientY; return; }
      }
      e.cancelable && e.preventDefault();
    }
    function wh(e) { if (inPanel(e.target) && mpCanScroll(e.target, -e.deltaX, -e.deltaY, L.m)) return; e.cancelable && e.preventDefault(); }
    function ky(e) {
      if (!/^( |PageUp|PageDown|Home|End|ArrowUp|ArrowDown|Spacebar)$/.test(e.key)) return;
      var t = e.target; if (inPanel(t) || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)))) return;
      e.preventDefault();
    }
    function sc() { if (!typing() && Math.abs(window.scrollY - L.y) > 1) window.scrollTo(0, L.y); }
    document.addEventListener("touchstart", st, { passive: !0, capture: !0 });
    document.addEventListener("touchmove", mv, { passive: !1, capture: !0 });
    document.addEventListener("wheel", wh, { passive: !1, capture: !0 });
    document.addEventListener("keydown", ky, !0);
    window.addEventListener("scroll", sc, { passive: !0 });
    de.classList.add("mp-noscroll");
    L.off = function () {
      document.removeEventListener("touchstart", st, { passive: !0, capture: !0 });
      document.removeEventListener("touchmove", mv, { passive: !1, capture: !0 });
      document.removeEventListener("wheel", wh, { passive: !1, capture: !0 });
      document.removeEventListener("keydown", ky, !0);
      window.removeEventListener("scroll", sc, { passive: !0 });
      de.classList.remove("mp-noscroll");
    };
    mpLock = L;
  }
  function mpScrollUnlock() {
    if (!mpLock) return;
    var L = mpLock, de = document.documentElement; mpLock = null; L.off();
    var y = L.end ? de.scrollHeight : L.y;
    if (Math.abs(window.scrollY - y) > 1) { try { window.scrollTo({ top: y, behavior: "instant" }); } catch (_) { window.scrollTo(0, y); } }
  }
  window.mpScrollLockState = function () { return mpLock ? { y: mpLock.y, end: mpLock.end } : null; };
  function mpMorph(m, kind, close) {
    mpGpClearPreview();
    var r0 = m.getBoundingClientRect(), row = m.parentNode, red = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var back = function () {
      if (typeof m._rebuildPlus === "function") {
        if (m._dispose) { try { m._dispose(); } catch (e) {} m._dispose = null; }
        var rBig = m.getBoundingClientRect();
        m.classList.remove("chat-pbig", "chat-pbig-poll", "chat-pbig-music", "chat-pbig-fm", "chat-pbig-globe");
        m.style.height = ""; m.style.width = ""; m.style.maxHeight = ""; m.style.bottom = ""; m.style.transformOrigin = "";
        m.setAttribute("role", "menu"); m.removeAttribute("aria-label");
        m._rebuildPlus();
        if (!red) {
          var rSmall = m.getBoundingClientRect(), easeB = window.MP_EASE || "cubic-bezier(.32,.72,0,1)";
          m.style.transformOrigin = "0 100%";
          m.animate([{ width: rBig.width + "px", height: rBig.height + "px" }, { width: rSmall.width + "px", height: rSmall.height + "px" }], { duration: 440, easing: easeB });
          [].forEach.call(m.children, function (c) { c.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 70, fill: "backwards", easing: easeB }); });
        }
        return;
      }
      close(); setTimeout(function () { var g = row.querySelector(".chat-plus"); g && g.click(); }, 200);
    };
    m.classList.add("chat-pbig", kind === "poll" ? "chat-pbig-poll" : kind === "music" ? "chat-pbig-music" : kind === "fm" ? "chat-pbig-fm" : "chat-pbig-globe");
    var hd = '<div class="chat-pbig-hd"><button type="button" class="chat-pbig-btn" data-x="back" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"/></svg></button><b>' + (kind === "poll" ? "New poll" : kind === "fm" ? "Misery FM" : kind === "music" ? '<span class="chat-music-heading">Music</span>' : "Globe") + '</b><button type="button" class="chat-pbig-btn" data-x="close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg></button></div>';
    // Misery FM renders its own body and the same header (Back, logo, Close) into the morphed menu
    if (kind === "fm") { m.innerHTML = ""; MPFM.mount(m, { back: back, close: close }); }
    else m.innerHTML = hd + (kind === "poll" ? mpPollForm() : kind === "music" ? mpMusicForm() : '<input class="chat-gp-q" type="search" placeholder="Search Globe posts" enterkeyhint="search" autocomplete="off"><div class="chat-gp-tabs glassbar" role="tablist" aria-label="Sort Globe posts"><span class="seg" aria-hidden="true"></span><button type="button" role="tab" data-s="active" class="is-on" aria-label="Active" title="Active" aria-selected="true"><svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="scale"><path d="M18.9658 10.8353C18.7328 14.4081 15.9006 17.2541 12.345 17.4883C11.7388 17.5282 11.1193 17.5805 10.5 17.5805C9.14461 17.5805 7.90858 17.4648 6.62862 16.9818C6.62862 16.9818 5.02692 18.2187 3.44468 17.9659C3.11357 17.913 2.94802 17.8866 2.85077 17.6928C2.75353 17.499 2.8567 17.3065 3.06304 16.9215C3.41069 16.2728 3.63411 15.6204 3.53064 14.9104C3.47647 14.5386 3.27868 14.2087 3.08497 13.8855L3.07549 13.8697C2.53241 12.9634 2.10593 11.9349 2.0342 10.8353C1.9886 10.1361 1.9886 9.41202 2.0342 8.71284C2.26725 5.13999 5.09943 2.29404 8.65499 2.05986C9.86553 1.98013 11.132 1.97997 12.345 2.05986C15.9006 2.29404 18.7328 5.13999 18.9658 8.71284C19.0114 9.41202 19.0114 10.1361 18.9658 10.8353Z"/><path d="M10.5306 20.5635C11.3773 21.1464 12.3875 21.5132 13.4806 21.5842C13.9798 21.6166 14.49 21.6591 15 21.6591C16.1162 21.6591 17.1341 21.5652 18.1882 21.1727C18.1882 21.1727 19.5072 22.1777 20.8103 21.9723C21.0829 21.9293 21.2193 21.9078 21.2994 21.7503C21.3794 21.5929 21.2945 21.4365 21.1246 21.1237C20.8383 20.5966 20.6543 20.0666 20.7395 19.4897C20.7841 19.1876 20.947 18.9195 21.1065 18.6569L21.1143 18.6441C21.5615 17.9077 21.9128 17.0721 21.9718 16.1786C22.0094 15.6105 22.0094 15.0222 21.9718 14.4542C21.9365 13.9192 21.8284 13.4042 21.6573 12.9189"/><path d="M7.7373 12.1062H13.2623M7.7373 7.89527H10.7123"/></svg></button><button type="button" role="tab" data-s="new" aria-label="Recent" title="Recent" aria-selected="false"><svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="rotate"><circle cx="12" cy="12" r="10"/><path d="M12 8V12L14 14"/></svg></button><button type="button" role="tab" data-s="pop" aria-label="Popular" title="Popular" aria-selected="false"><svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="float"><path d="M20 13V8H15"/><path d="M20 8L15 13C14.1174 13.8826 13.6762 14.3238 13.1346 14.3726C13.045 14.3807 12.955 14.3807 12.8654 14.3726C12.3238 14.3238 11.8826 13.8826 11 13C10.1174 12.1174 9.67615 11.6762 9.13457 11.6274C9.04504 11.6193 8.95496 11.6193 8.86543 11.6274C8.32385 11.6762 7.88256 12.1174 7 13L4 16"/></svg></button></div><div class="chat-gp-list" role="listbox"><div class="chat-gp-empty">Loading…</div></div>');
    if (kind !== "fm") {
      m.querySelector('[data-x="back"]').addEventListener("click", function (e) { e.stopPropagation(); back(); });
      m.querySelector('[data-x="close"]').addEventListener("click", function (e) { e.stopPropagation(); close(); });
    }
    if (!red) {
      var r1 = m.getBoundingClientRect();
      m.style.transformOrigin = "0 100%";
      var ease = window.MP_EASE || "cubic-bezier(.32,.72,0,1)";
      m.animate([{ width:r0.width + "px", height:r0.height + "px" }, { width:r1.width + "px", height:r1.height + "px" }], { duration:440, easing:ease });
      [].forEach.call(m.children, function (c) { c.animate([{ opacity:0, transform:"translateY(6px)" }, { opacity:1, transform:"none" }], { duration:320, delay:70, fill:"backwards", easing:ease }); });
    }
    function afterOpen(fn) { red ? fn() : setTimeout(fn, 40); }
    if (kind === "music") { m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Share music"); afterOpen(function () { if (m.isConnected && m.classList.contains("chat-pbig-music")) mpMusicWire(m, close); }); }
    else if (kind !== "fm") afterOpen(function () { if (!m.isConnected || !m.classList.contains("chat-pbig")) return; kind === "poll" ? mpPollWire(m, close) : mpGpWire(m, close); });
  }
  function mpMusicForm() {
    return '<label class="chat-music-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 17L21 21"/><path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z"/></svg><input class="chat-music-q" type="search" maxlength="120" placeholder="Songs, artists, or albums" aria-label="Search Apple Music" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false"></label>' +
      '<p class="chat-music-status" role="status" aria-live="polite"></p><ul class="chat-music-results" aria-label="Songs"></ul>' +
      '';
  }
  /* Recently picked songs, per user, most recent first, deduped by track id, max 10 (per dc). */
  function mpMusicRecentKey() { return "mp-music-recent-v1:" + String((s && s.username) || "guest").toLowerCase(); }
  function mpMusicRecent() {
    try {
      var list = JSON.parse(localStorage.getItem(mpMusicRecentKey()) || "[]");
      return Array.isArray(list) ? list.filter(function (t) { return t && t.trackName && t.artistName && mpMusicRef(t.trackViewUrl); }).slice(0, 10) : [];
    } catch (e) { return []; }
  }
  function mpMusicRecentAdd(track) {
    try {
      var id = String(track.trackId || (mpMusicRef(track.trackViewUrl) || {}).key || ""), keep = {};
      if (!id) return;
      ["trackId", "trackName", "artistName", "collectionName", "trackViewUrl", "artworkUrl100", "artworkUrl60", "previewUrl", "trackTimeMillis", "trackExplicitness"].forEach(function (k) { if (track[k] != null) keep[k] = track[k]; });
      var list = mpMusicRecent().filter(function (t) { return String(t.trackId || (mpMusicRef(t.trackViewUrl) || {}).key || "") !== id; });
      list.unshift(keep);
      localStorage.setItem(mpMusicRecentKey(), JSON.stringify(list.slice(0, 10)));
    } catch (e) {}
  }
  function mpMusicWire(menu, close) {
    var input = menu.querySelector(".chat-music-q"), list = menu.querySelector(".chat-music-results"), status = menu.querySelector(".chat-music-status"),
      timer = null, controller = null, epoch = 0, dead = false, branding = null, brandIO = null, brandRun = function () {};
    function mountBrand() {
      if (!branding) {
        branding=document.createElement('span');branding.className='chat-music-branding';
        branding.innerHTML='<span class="chat-music-orb"><img class="chat-music-poster" src="/assets/apple-music/official-icon-still.webp?v=1" alt="Apple Music"><video class="chat-music-official" muted playsinline loop preload="auto" src="/assets/apple-music/official-icon-loop.mp4?v=1" aria-hidden="true"></video><canvas class="chat-music-key" width="112" height="112" aria-hidden="true"></canvas></span><span class="chat-music-brand-copy"><span class="chat-music-powered">Powered by</span><span class="chat-music-provider">Apple Music</span></span>';
        var film=branding.querySelector('video'),poster=branding.querySelector('img'),key=branding.querySelector('canvas'),orb=branding.querySelector('.chat-music-orb');
        film.muted=true;film.playsInline=true;film.loop=true;
        // The official film is art on black: key it to real alpha so only the icon shows.
        mpAmKeyWire(orb,key,film,poster);
        film.addEventListener('playing',function(){branding.classList.add('is-playing');});
        film.addEventListener('error',function(){branding.classList.remove('is-playing');});
        var seen=false;
        brandRun=function(){
          if(dead||!branding.isConnected||!seen||document.hidden||mpGpReduced()){film.pause();return;}
          var playing=film.play();if(playing)playing.catch(function(){});
        };
        try{brandIO=new IntersectionObserver(function(ents){seen=!!(ents[0]&&ents[0].isIntersecting);brandRun();});brandIO.observe(orb);}catch(_){seen=true;}
        document.addEventListener('visibilitychange',brandRun);
      }
      if(!branding.isConnected)menu.appendChild(branding);
      brandRun();
    }
    var brandLater = 0;
    function mountBrandLater() {
      if (brandLater) return;
      brandLater = setTimeout(function () { if (!dead) mountBrand(); }, 420);
    }
    function state(title, detail, retry) {
      menu.classList.remove("has-results");fit();
      list.innerHTML = '<li class="chat-music-empty"><span class="chat-music-idle-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><strong></strong><span class="chat-music-detail"></span></li>';
      mountBrandLater();
      list.querySelector("strong").textContent = title;
      list.querySelector("strong").hidden = !title;
      list.querySelector(".chat-music-detail").textContent = detail;
      if (retry) {
        var button = document.createElement("button"); button.type = "button"; button.className = "chat-music-retry"; button.textContent = "Try again";
        button.addEventListener("click", search); list.firstChild.appendChild(button);
      }
    }
    function invalidate() { epoch++; clearTimeout(timer); if (controller) controller.abort(); list.removeAttribute("aria-busy"); }
    function render(tracks) {
      list.innerHTML = "";
      var seen = Object.create(null);
      tracks = tracks.filter(function (track) {
        var ref = mpMusicRef(track.trackViewUrl);
        if (!ref || seen[ref.key] || !track.trackName || !track.artistName) return false;
        seen[ref.key] = true; return true;
      }).slice(0, 50);
      menu.classList.toggle("has-results",tracks.length>0);fit();
      status.textContent = tracks.length ? tracks.length + " SONGS" : "";
      if (!tracks.length) return state("No songs found", "Try another title, artist, or album.");
      rows(tracks);
    }
    function idle() {
      var recent = mpMusicRecent();
      if (!recent.length) { status.textContent = ""; return state("No recently played songs", ""); }
      list.innerHTML = ""; menu.classList.add("has-results"); menu.classList.add("is-recent"); fit(); mountBrand();
      status.textContent = "RECENT";
      rows(recent);
    }
    function rows(tracks) {
      tracks.forEach(function (track) {
        var item = document.createElement("li"), button = document.createElement("button"), ref = mpMusicRef(track.trackViewUrl), result = mpNPOut(track);
        button.type = "button"; button.className = "chat-music-track"; button.setAttribute("aria-label", "Add " + track.trackName + " by " + track.artistName);
        button.innerHTML = '<span class="chat-music-art">' + mpMusicIcon() + '</span><span class="chat-music-copy"><span class="chat-music-title"><strong></strong></span><span class="chat-music-artist"></span></span><span class="chat-music-choice" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.001 4.00101V20.001"/><path d="M20.001 12.001L4.00098 12.001"/></svg></span>';
        button.querySelector("strong").textContent = track.trackName;
        if (track.trackExplicitness === "explicit") {
          var badge = document.createElement("span");
          badge.className = "fm-e";
          badge.setAttribute("role", "img");
          badge.setAttribute("aria-label", "Explicit");
          badge.title = "Explicit";
          badge.textContent = "E";
          button.querySelector(".chat-music-title").appendChild(badge);
        }
        var sub = [track.artistName, track.collectionName].filter(Boolean);
        button.querySelector(".chat-music-artist").textContent = sub.join(" \u00b7 ");
        button.setAttribute("aria-label", "Add " + track.trackName + " by " + track.artistName + (track.collectionName ? " from " + track.collectionName : "") + (track.trackExplicitness === "explicit" ? ", explicit" : ""));
        if (/^https:\/\//.test(result.art || "")) {
          var image = document.createElement("img"); image.src = result.art; image.alt = ""; image.loading = "lazy"; image.decoding = "async";
          image.addEventListener("error", function () { image.remove(); }); button.querySelector(".chat-music-art").appendChild(image);
        }
        button.addEventListener("click", function () {
          if (dead || mpGpBusy) return;
          var from = button.getBoundingClientRect();
          mpMusicRemember(ref, result);
          mpMusicRecentAdd(track);
          close();
          mpGpShowPreview({id:ref.key,kind:"music",url:ref.url,title:result.title,artist:result.artist,thumb:result.art,song:result},from);
        });
        item.appendChild(button); list.appendChild(item);
      });
    }
    function search() {
      if (dead) return;
      invalidate();
      var query = input.value.trim(), version = epoch;
      menu.classList.remove("is-recent");
      if (query.length < 2) return idle();
      controller = new AbortController(); status.textContent = "SEARCHING…"; list.setAttribute("aria-busy", "true");
      state("Finding your sound…", "Searching Apple Music");
      mpMusicSearch(query, controller.signal).then(function (tracks) {
        if (dead || version !== epoch || !menu.isConnected || input.value.trim() !== query) return;
        list.removeAttribute("aria-busy"); render(tracks);
      }).catch(function (error) {
        if (dead || version !== epoch || error.name === "AbortError") return;
        list.removeAttribute("aria-busy"); status.textContent = "";
        state("Couldn’t reach the catalog", "Your search is still here. Give it another try.", true);
      });
    }
    input.addEventListener("input", function () {
      invalidate();
      if (input.value.trim().length < 2) return search();
      status.textContent = "SEARCHING…"; state("Finding your sound…", "Searching Apple Music");
      timer = setTimeout(search, 280);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") { event.preventDefault(); search(); }
      if (event.key === "ArrowDown") { var first = list.querySelector("button.chat-music-track"); if (first) { event.preventDefault(); first.focus(); } }
    });
    var sizeFrame = 0;
    function fit() {
      cancelAnimationFrame(sizeFrame);
      sizeFrame = requestAnimationFrame(function () {
        if (dead || !menu.isConnected) return;
        var viewport = window.visualViewport, top = viewport ? viewport.offsetTop : 0;
        var parent = menu.parentElement.getBoundingClientRect();
        var bottom = Math.min(parent.top - 8, top + (viewport ? viewport.height : window.innerHeight) - 12);
        var space = bottom - top - 16;
        // The search input owns the keyboard, so the ordinary chat input's
        // keyboard lift may be inactive. Anchor directly to the visible viewport.
        menu.style.bottom = Math.max(parent.height + 8, parent.bottom - bottom) + "px";
        menu.classList.toggle("is-compact", space < 300);
        menu.style.maxHeight = Math.max(140,space) + "px";
        menu.style.height = Math.min(menu.classList.contains("has-results") ? 460 : 340, Math.max(140, space)) + "px";
      });
    }
    function dispose() {
      if (dead) return; dead = true; if (brandLater) clearTimeout(brandLater); if(branding)branding.querySelector("video").pause(); if(brandIO)brandIO.disconnect(); document.removeEventListener("visibilitychange",brandRun); invalidate(); cancelAnimationFrame(sizeFrame);
      window.removeEventListener("resize", fit); if (window.visualViewport) { window.visualViewport.removeEventListener("resize", fit); window.visualViewport.removeEventListener("scroll", fit); }
      observer.disconnect();
    }
    var observer = new MutationObserver(function () { if (!menu.isConnected) dispose(); });
    observer.observe(menu.parentElement, { childList:true }); menu._dispose = dispose;
    window.addEventListener("resize", fit); if (window.visualViewport) { window.visualViewport.addEventListener("resize", fit); window.visualViewport.addEventListener("scroll", fit); }
    search(); fit();
  }
  function mpGpWire(m, close) {
    var sort = "active", list = m.querySelector(".chat-gp-list"), q = m.querySelector(".chat-gp-q");
    function paint() {
      var all = (mpGpCache || []).filter(function (t) {
        if (t.author && window.mpHide && mpHide.is(t.author)) return !1;
        if ((t.membersOnly || t.ownerOnly) && !(s && (s.member || s.owner))) return !1;
        return !0;
      });
      var k = q.value.trim().toLowerCase();
      k && (all = all.filter(function (t) { return ((t.title || "") + " " + (t.excerpt || "") + " @" + (t.author || "") + " " + (t.tags || []).join(" ")).toLowerCase().indexOf(k) !== -1; }));
      sort === "new" ? all.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }) : sort === "pop" && all.sort(function (a, b) { return (b.replies || 0) - (a.replies || 0) || (b.lastActivity || 0) - (a.lastActivity || 0); });
      list.innerHTML = "";
      if (!all.length) { list.innerHTML = '<div class="chat-gp-empty">' + (mpGpCache ? "No posts found" : "Loading…") + "</div>"; return; }
      all.slice(0, 60).forEach(function (t) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chat-gp-row" + (t.thumb ? " has-thumb" : " no-thumb") + (t.pinned ? " is-pinned" : "");
        b.setAttribute("role", "option");
        b.innerHTML =
          '<span class="chat-gp-bg" aria-hidden="true"></span>' +
          '<span class="chat-gp-body">' +
            '<span class="chat-gp-pic" aria-hidden="true"></span>' +
            '<span class="chat-gp-tx">' +
              '<span class="chat-gp-kicker" hidden>Pinned</span>' +
              '<span class="chat-gp-title"></span>' +
              '<span class="chat-gp-meta">' +
                '<span class="chat-gp-who"></span>' +
                '<span class="chat-gp-m chat-gp-ago" hidden><span class="chat-gp-n"></span></span>' +
              '</span>' +
            '</span>' +
            '<svg class="chat-gp-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18"/></svg>' +
          '</span>' +
          (t.pinned ? '<span class="chat-gp-pin" aria-hidden="true"><span class="chat-gp-pin-lab">PINNED</span></span>' : "");
        var title = t.title || "Untitled";
        b.querySelector(".chat-gp-title").textContent = title;
        b.querySelector(".chat-gp-who").textContent = mpAt(t.author || "unknown");
        if (t.pinned) {
          var kick = b.querySelector(".chat-gp-kicker");
          kick.hidden = !1;
        }
        var ago = t.createdAt ? mpGeAgo(t.createdAt) : "";
        if (ago) {
          var ag = b.querySelector(".chat-gp-ago");
          ag.hidden = !1;
          ag.querySelector(".chat-gp-n").textContent = ago;
        }
        var pic = b.querySelector(".chat-gp-pic");
        var thumbSrc = "";
        if (t.thumb) {
          if (/^(https?:|\/|data:)/i.test(t.thumb)) thumbSrc = t.thumb;
          else if (/^[A-Za-z0-9_-]+$/.test(t.thumb)) thumbSrc = e + "/api/media/" + t.thumb;
        }
        if (thumbSrc) {
          var im = document.createElement("img");
          im.alt = "";
          im.loading = "lazy";
          im.decoding = "async";
          im.src = thumbSrc;
          pic.appendChild(im);
          var bg = b.querySelector(".chat-gp-bg");
          var bim = document.createElement("img");
          bim.alt = "";
          bim.loading = "lazy";
          bim.decoding = "async";
          bim.src = thumbSrc;
          bg.appendChild(bim);
        } else {
          /* Letter initial for S2 artwork / R glyph — never category emoji. */
          var g = document.createElement("span");
          g.className = "chat-gp-glyph";
          var letters = String(title).replace(/[^A-Za-z0-9\u00C0-\u024F]+/g, " ").trim();
          g.textContent = (letters ? letters.charAt(0) : "M").toUpperCase();
          pic.appendChild(g);
          pic.classList.add("is-glyph");
        }
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          if (mpGpBusy || mpGpDraft) return;
          mpGpBusy = !0;
          var from = b.getBoundingClientRect();
          close();
          /* Let the sheet start closing, then FLIP into the bar.
             Defer one more frame after blur/keyboard so dest rect is resting. */
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              mpGpShowPreview(t, from);
            });
          });
        });
        list.appendChild(b);
      });
    }
    var tabs = m.querySelector(".chat-gp-tabs"), tbs = [].slice.call(tabs.querySelectorAll("button")), red2 = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var thumb = tabs.querySelector(".seg"), _seated = !1;
    /* Seat like #nav .seg (app.js refreshSeg). First paint: no transition so it doesn't
       animate from 0 while the morph sheet is still laying out (per dc). */
    function place(k, instant) {
      var btn = tbs[k];
      if (!btn || !thumb) return;
      var run = function () {
        /* offset* ignores parent morph transform (getBoundingClientRect does not) */
        if (!btn.offsetWidth || !tabs.offsetWidth) return !1;
        thumb.style.width = btn.offsetWidth + "px";
        thumb.style.height = btn.offsetHeight + "px";
        var x = btn.offsetLeft + (btn.offsetWidth - thumb.offsetWidth) / 2 - thumb.offsetLeft;
        if (instant || !_seated) {
          var prev = thumb.style.transition;
          thumb.style.transition = "none";
          thumb.style.transform = "translateX(" + Math.round(x * 4) / 4 + "px)";
          void thumb.offsetWidth;
          thumb.style.transition = prev || "";
          _seated = !0;
        } else {
          thumb.style.transform = "translateX(" + Math.round(x * 4) / 4 + "px)";
        }
        return !0;
      };
      if (!run()) requestAnimationFrame(function () { run() || requestAnimationFrame(run); });
      else requestAnimationFrame(function () { run(); });
    }
    function curIdx() { var i = tbs.findIndex(function (x) { return x.classList.contains("is-on"); }); return i < 0 ? 0 : i; }
    place(0, !0);
    /* after morph open (~320ms) + layout: re-seat without anim */
    setTimeout(function () { place(curIdx(), !0); }, 340);
    try {
      new ResizeObserver(function () { place(curIdx(), !_seated); }).observe(tabs);
    } catch (_) {}
    function go(k) {
      var cur = curIdx();
      if (k < 0 || k >= tbs.length || k === cur) return;
      sort = tbs[k].getAttribute("data-s");
      tbs.forEach(function (x, n) {
        var on = n === k;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-selected", on ? "true" : "false");
      });
      place(k, !1);
      window.haptic && window.haptic(8);
      paint(); list.scrollTop = 0;
      red2 || list.animate([{ transform: "translateX(" + (k > cur ? 28 : -28) + "px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.3,1.15,.5,1)" });
    }
    tbs.forEach(function (b, k) { b.addEventListener("click", function (e) { e.stopPropagation(); go(k); }); });
    window.addEventListener("resize", function () { place(curIdx(), !0); });
    var sx = 0, sy = 0;
    list.addEventListener("touchstart", function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: !0 });
    list.addEventListener("touchend", function (e) {
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) { var cur = tbs.findIndex(function (x) { return x.classList.contains("is-on"); }); go(cur + (dx < 0 ? 1 : -1)); }
    }, { passive: !0 });
    q.addEventListener("input", paint);
    q.addEventListener("keydown", function (e) { e.key === "Enter" && (e.preventDefault(), q.blur()); });
    paint();
    if (!mpGpCache || Date.now() - mpGpAt > 60000) E("/api/forum/threads").then(function (r) { r && r.ok && Array.isArray(r.threads) && ((mpGpCache = r.threads), (mpGpAt = Date.now())); paint(); }).catch(function () { list.innerHTML = '<div class="chat-gp-empty">Couldn\u2019t load Globe posts</div>'; });
  }
  /* Polls (per dc): the Poll row only appears once the Worker advertises caps.poll. */
  function mpPollForm() {
    return '<div class="chat-poll-f">' +
      '<label class="chat-poll-qi-wrap"><span class="chat-poll-lbl">Question</span><input class="chat-poll-qi" maxlength="140" placeholder="Ask something\u2026" autocomplete="off" enterkeyhint="next"></label>' +
      '<div class="chat-poll-os" role="group" aria-label="Poll options"></div>' +
      '<button type="button" class="chat-poll-add"><span aria-hidden="true">+</span> Add option</button>' +
      '<label class="chat-poll-multi mp-check" for="chat-poll-multi"><input type="checkbox" id="chat-poll-multi" class="chat-poll-cb mp-check-cb"><span class="chat-poll-box mp-check-box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 14L8.5 17.5L19 6.5"/></svg></span><span class="chat-poll-mt">Allow multiple answers</span></label>' +
      '<button type="button" class="chat-poll-go" disabled>Create poll</button>' +
      '</div>';
  }
  function mpPollWire(m, close) {
    if (!mpIsVip()) { mpToast("Polls are a VIP perk"); close(); return; }
    var os = m.querySelector(".chat-poll-os"), add = m.querySelector(".chat-poll-add"), go = m.querySelector(".chat-poll-go"), qi = m.querySelector(".chat-poll-qi");
    var red = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function vals() { return [].map.call(os.querySelectorAll("input"), function (i) { return i.value.trim(); }); }
    function chk() {
      var v = vals().filter(Boolean);
      go.disabled = !qi.value.trim() || v.length < 2;
      add.hidden = os.children.length >= 4;
      [].forEach.call(os.querySelectorAll(".chat-poll-rm"), function (b) { b.hidden = os.children.length <= 2; });
    }
    function renum() {
      [].forEach.call(os.querySelectorAll(".chat-poll-o input"), function (inp, i) {
        inp.placeholder = "Option " + (i + 1);
      });
    }
    function opt(focus) {
      var d = document.createElement("div");
      d.className = "chat-poll-o" + (red ? "" : " is-in");
      d.innerHTML = '<span class="chat-poll-o-dot" aria-hidden="true"></span><input maxlength="60" placeholder="Option" autocomplete="off" enterkeyhint="next"><button type="button" class="chat-poll-rm" aria-label="Remove option">\u00d7</button>';
      d.querySelector("input").addEventListener("input", chk);
      d.querySelector(".chat-poll-rm").addEventListener("click", function (e) {
        e.stopPropagation();
        if (os.children.length <= 2) return;
        function done() { d.remove(); renum(); chk(); }
        if (red) return done();
        d.classList.remove("is-in");
        d.classList.add("is-out");
        setTimeout(done, 180);
      });
      os.appendChild(d);
      renum();
      chk();
      if (focus) setTimeout(function () { d.querySelector("input").focus(); }, 30);
      return d;
    }
    opt(); opt();
    qi.addEventListener("input", chk);
    qi.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); var first = os.querySelector("input"); first && first.focus(); }
    });
    add.addEventListener("click", function (e) { e.stopPropagation(); if (os.children.length >= 4) return; opt(!0); });
    go.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!mpIsVip()) return mpToast("Polls are a VIP perk");
      go.disabled = !0;
      var body = { poll: { q: qi.value.trim(), o: vals().filter(Boolean), multi: !!m.querySelector(".chat-poll-multi input").checked }, cid: "p" + Date.now().toString(36) };
      E("/api/send", { method: "POST", body: body }).then(function (r) {
        if (r && r.ok) close();
        else { go.disabled = !1; mpToast((r && r.error) || "Couldn\u2019t send poll"); }
      }).catch(function () { go.disabled = !1; mpToast("Couldn\u2019t send poll"); });
    });
    setTimeout(function () { qi.focus(); }, 60);
  }
  /* poll card style (per dc): "p1" frosted + animated border, "p2" indigo glass, "p3" ticket */
  var MP_POLL_STYLE = "q3d";
  var mpPolls = Object.create(null);
  function mpPollRender(b, e) {
    if (!b || !e || !e.poll || !Array.isArray(e.poll.o)) return;
    var tx = b.querySelector(".chat-text"); tx && (tx.hidden = !0);
    var ex = b.querySelector(".chat-embed"); ex && ex.remove();
    b.classList.add("chat-poll-bubble", "chat-poll-" + MP_POLL_STYLE);
    var c = document.createElement("div"); c.className = "chat-poll"; c.setAttribute("data-poll", e.id);
    b.insertBefore(c, b.firstChild);
    mpPolls[e.id] = { q: e.text, poll: e.poll };
    mpPollPaint(c, e.id);
  }
  function mpPollUpdate(id, poll) {
    var p = mpPolls[id]; if (!p) return; p.poll = poll;
    document.querySelectorAll('.chat-poll[data-poll="' + CSS.escape(id) + '"]').forEach(function (c) { mpPollPaint(c, id); });
  }
  function mpPollPaint(c, id) {
    var p = mpPolls[id], pl = p.poll, v = pl.v || {}, me = s && s.username ? s.username.toLowerCase() : "";
    var red = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var counts = pl.o.map(function () { return 0; }), voters = 0;
    Object.keys(v).forEach(function (k) { if (window.mpHide && mpHide.is(k)) return; var a = Array.isArray(v[k]) ? v[k] : []; a.length && voters++; a.forEach(function (i) { counts[i] != null && counts[i]++; }); });
    var mine = (me && v[me]) || [], tot = counts.reduce(function (a, b) { return a + b; }, 0), show = !!(mine.length || tot);
    /* build once, then update in place so votes animate (per dc) */
    if (c.getAttribute("data-n") !== String(pl.o.length)) {
      c.setAttribute("data-n", pl.o.length);
      c.innerHTML = '<div class="chat-poll-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3"/><path d="M13 10L13 21"/><path d="M18 13L18 21"/><path d="M8 13L8 20"/><path d="M21 7.98693C19.16 7.98693 17.1922 8.24252 15.8771 6.49346C14.3798 4.50218 11.6202 4.50218 10.1229 6.49346C8.80782 8.24252 6.84003 7.98693 5 7.98693H3"/></svg>Poll</div><div class="chat-poll-q"></div><div class="chat-poll-list"></div><div class="chat-poll-ft"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3"/><path d="M13 10L13 21"/><path d="M18 13L18 21"/><path d="M8 13L8 20"/><path d="M21 7.98693C19.16 7.98693 17.1922 8.24252 15.8771 6.49346C14.3798 4.50218 11.6202 4.50218 10.1229 6.49346C8.80782 8.24252 6.84003 7.98693 5 7.98693H3"/></svg><span></span></div>';
      c.querySelector(".chat-poll-q").textContent = p.q || "Poll";
      var L = c.querySelector(".chat-poll-list");
      pl.o.forEach(function (o, i) {
        var b = document.createElement("button"); b.type = "button"; b.className = "chat-poll-opt";
        b.innerHTML = '<svg class="chat-poll-ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 14L8.5 17.5L19 6.5"/></svg><svg class="chat-poll-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" class="bg"/><circle cx="12" cy="12" r="9.5" class="fg" style="stroke-dasharray:0 59.7"/><circle cx="12" cy="12" r="3.2" class="dot"/></svg><span class="chat-poll-bar"></span><span class="chat-poll-lbl"></span><span class="chat-poll-voters"></span><span class="chat-poll-pct"></span>';
        b.querySelector(".chat-poll-lbl").textContent = o;
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!s) return mpToast("Log in to vote");
          var P = mpPolls[id], cur = P.poll, cv = cur.v || {}, cm = (me && cv[me]) || [], on = cm.indexOf(i) !== -1;
          var nx = cur.multi ? (on ? cm.filter(function (x) { return x !== i; }) : cm.concat([i])) : (on ? [] : [i]);
          var nv = Object.assign({}, cv); nx.length ? (nv[me] = nx) : delete nv[me];
          window.haptic && window.haptic(10);
          if (!red) { var bub = c.closest(".chat-bubble") || c, br = bub.getBoundingClientRect(); bub._dots && bub._dots.drop((e.clientX || br.left + br.width / 2) - br.left, (e.clientY || br.top + br.height / 2) - br.top); }
          if (!red) {
          }
          var prev = cur;
          mpPollUpdate(id, Object.assign({}, cur, { v: nv }));
          E("/api/poll/vote", { method: "POST", body: { id: id, choices: nx } }).then(function (r) { r && r.ok && r.poll ? mpPollUpdate(id, r.poll) : (mpPollUpdate(id, prev), mpToast((r && r.error) || "Vote failed")); }).catch(function () { mpPollUpdate(id, prev); });
        });
        L.appendChild(b);
      });
      mpPollWatch(c);
    }
    var rows = c.querySelectorAll(".chat-poll-opt");
    pl.o.forEach(function (o, i) {
      var b = rows[i]; if (!b) return;
      var pct = tot ? Math.round((counts[i] / tot) * 100) : 0, on = mine.indexOf(i) !== -1, w1 = show ? pct : 0;
      var was = b.classList.contains("is-mine");
      b.classList.toggle("is-mine", on);
      b.querySelector(".chat-poll-bar").style.width = w1 + "%";
      b.querySelector(".fg").style.strokeDasharray = (w1 * 0.597).toFixed(1) + " 59.7";
      var pe = b.querySelector(".chat-poll-pct"), from = parseInt(pe.getAttribute("data-v") || "0", 10) || 0;
      pe.setAttribute("data-v", w1);
      if (!show) pe.textContent = "";
      else if (red || from === w1 || !pe.textContent) pe.textContent = w1 + "%";
      else { var t0 = performance.now(); (function tick(t) { var k = Math.min(1, (t - t0) / 600), e2 = 1 - Math.pow(1 - k, 3); pe.textContent = Math.round(from + (w1 - from) * e2) + "%"; k < 1 && requestAnimationFrame(tick); })(t0); }
      b.setAttribute("data-pct", show ? w1 + "%" : "");
      /* voter avatars (Globe-style), after you've voted: 3 + "+N"; new faces slide in */
      var vw = b.querySelector(".chat-poll-voters"), keep = {}, shown = 0;
      [].forEach.call(vw.querySelectorAll("[data-u]"), function (x) { keep[x.getAttribute("data-u")] = x; });
      var nxt = [];
      if (mine.length) Object.keys(v).forEach(function (k) { if (shown < 3 && !(window.mpHide && mpHide.is(k)) && Array.isArray(v[k]) && v[k].indexOf(i) !== -1) { nxt.push(k); shown++; } });
      /* Reorder in place — never vw.innerHTML="" (that flashed avatars / more-badge). */
      var frag = document.createDocumentFragment(), seen = Object.create(null);
      nxt.forEach(function (k) {
        var sp = keep[k];
        if (!sp) {
          var info = (Je && Je[k]) || null; sp = document.createElement("span");
          sp.className = "poll-voter-avatar" + (red ? "" : " is-new"); sp.setAttribute("data-u", k); sp.title = mpName(info && info.username ? info.username : k);
          try { var av = J(info && info.username ? info.username : k, info && info.avatar, "xs", info && info.hasImg ? info.imgV : void 0); av && sp.appendChild(av); } catch (_) {}
        } else {
          sp.classList.remove("is-new");
        }
        seen[k] = 1;
        frag.appendChild(sp);
      });
      Object.keys(keep).forEach(function (k) { if (!seen[k] && keep[k].parentNode === vw) keep[k].remove(); });
      [].forEach.call(vw.querySelectorAll(".poll-voter-more"), function (x) { x.remove(); });
      vw.appendChild(frag);
      counts[i] > shown && shown && vw.insertAdjacentHTML("beforeend", '<span class="poll-voter-avatar poll-voter-more">+' + (counts[i] - shown) + "</span>");
    });
    var ft = c.querySelector(".chat-poll-ft span"), txt = voters + (voters === 1 ? " vote" : " votes") + (pl.multi ? " \u00b7 Multiple answers" : "");
    if (ft.textContent && ft.textContent !== txt && !red) { ft.classList.remove("is-tick"); void ft.offsetWidth; ft.classList.add("is-tick"); }
    ft.textContent = txt;
  }
  /* pause the ambient dot ripple when the card is off screen */
  var mpPollIO = window.IntersectionObserver ? new IntersectionObserver(function (es) { es.forEach(function (e) { var b = e.target.closest(".chat-bubble"); if (!b) return; b.classList.toggle("is-off", !e.isIntersecting); b._dots && b._dots.vis(e.isIntersecting); }); }) : null;
  function mpPollWatch(c) {
    var b = c.closest(".chat-bubble");
    if (b && !b._dots && b.classList.contains("chat-poll-q3d")) try { b._dots = mpDots(b); } catch (_) {}
    try { mpPollIO && mpPollIO.observe(c); } catch (_) {}
  }
  /* Dot matrix with a water-drop ripple (per dc). Static grid at rest; a tap sends a crisp Gaussian
     wavefront (ease-out expo, ~0.7s to cover the card, gone by ~1.1s) plus a faint echo 120ms behind.
     Crest dots lift (up to ~2.2x, ~80% white, faint blue), nudge outward ~3px, soft trough behind.
     rAF runs only during a ripple and only while on screen. */
  function mpDots(host) {
    var red = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cv = document.createElement("canvas"); cv.className = "chat-poll-cv"; cv.setAttribute("aria-hidden", "true");
    host.insertBefore(cv, host.firstChild);
    var x = cv.getContext("2d"), W = 0, H = 0, dpr = 1, drops = [], seen = !0, raf = 0, last = 0, G = 8, DUR = 2500, light = !1;
    function theme() { light = document.documentElement.getAttribute("data-theme") === "light"; }
    theme();
    function size() {
      var r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      cv.width = W * dpr; cv.height = H * dpr; cam(); draw(performance.now());
    }
    /* genuine 3D water surface (per dc): dots on a plane, tilted perspective camera, height-field + normal shading */
    var PH = 0.61, CF = Math.cos(PH), SF = Math.sin(PH), F = 1, CAMY = 0, CAMZ = 0, Y0 = 0, Y1 = 1, GW = 9;
    function cam() {
      F = Math.max(W, 240) * 1.05; CAMZ = 150; CAMY = -CAMZ / Math.tan(PH) + 10; /* centre ray hits plane near the bottom edge */
      var lo = 1e9, hi = -1e9;
      for (var Y = -400; Y < 3000; Y += 4) { var sy = proj(W / 2, Y, 0); if (!sy) continue; sy = sy[1]; sy < H + 16 && sy > -16 && ((lo = Math.min(lo, Y)), (hi = Math.max(hi, Y))); }
      Y0 = lo - GW * 2; Y1 = hi + GW * 3;
    }
    function proj(X, Y, Z) {
      var vx = X - W / 2, vy = Y - CAMY, vz = Z - CAMZ, zc = vy * CF - vz * SF;
      if (zc < 20) return null;
      var yc = vy * SF + vz * CF;
      return [W / 2 + F * vx / zc, H * 0.72 - F * yc / zc + 0, F / zc];
    }
    function unproj(sx, sy) { /* screen -> plane point (z=0) by bisection along depth */
      var a = Y0, b = Y1;
      for (var i = 0; i < 30; i++) { var m = (a + b) / 2, p = proj(W / 2, m, 0); p && p[1] > sy ? (a = m) : (b = m); }
      var Y = (a + b) / 2, p2 = proj(W / 2, Y, 0); return [W / 2 + (sx - W / 2) / (p2 ? p2[2] : 1), Y];
    }
    var rings = [], cents = [], T = 0;
    function hgt(X, Y) {
      var h = 3.4 * Math.sin(X * 0.034 + Y * 0.022 - T * 1.46) + 2.4 * Math.sin(-X * 0.021 + Y * 0.038 - T * 1.06 + 1.7) + 1.6 * Math.sin(X * 0.028 - Y * 0.015 - T * 0.88 + 4.1);
      for (var i = 0; i < rings.length; i++) {
        var R = rings[i], dist = Math.hypot(X - R.x, Y - R.y), u = dist - R.r;
        h += (Math.exp(-(u * u) / 90) - (u < 0 ? 0.35 * Math.exp(-((u + 15) * (u + 15)) / 140) : 0)) * R.s * 9 / Math.sqrt(1 + dist / 30);
      }
      for (var j = 0; j < cents.length; j++) { var C = cents[j], cd = Math.hypot(X - C.x, Y - C.y); h += C.s * 6 * Math.exp(-(cd * cd) / 160); }
      return h;
    }
    function flat() {
      x.fillStyle = light ? "#0a1230" : "#a9d7f5";
      for (var gy = 4; gy < H; gy += G) for (var gx = 4; gx < W; gx += G) { x.globalAlpha = (light ? 0.12 : 0.16) * Math.max(0.18, 1 - ((gx / W) + (gy / H)) * 0.45); x.beginPath(); x.arc(gx, gy, 0.95, 0, 6.2832); x.fill(); }
    }
    function draw(now) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); x.fillStyle = light ? "#0a1230" : "#fff";
      if (red) { flat(); x.globalAlpha = 1; return; }
      /* calm water drop: ~80px/s rings, 3 rings 160ms apart, small centre dip, ~2.5s life */
      drops = drops.filter(function (d) { return now - d.t < DUR; });
      rings = []; cents = []; T = now / 1000;
      drops.forEach(function (d) {
        var age = (now - d.t) / 1000;
        age < 0.45 && cents.push({ x: d.x, y: d.y, s: Math.sin(Math.min(1, age / 0.45) * Math.PI) * (age < 0.15 ? -0.5 : 0.6) });
        [[0, 1], [0.16, 0.62], [0.32, 0.36]].forEach(function (e) {
          var a = age - e[0]; if (a <= 0) return;
          var fade = Math.max(0, 1 - a / (DUR / 1000 - e[0])), s0 = e[1] * Math.pow(fade, 1.4) * Math.min(1, a / 0.12);
          s0 > 0.01 && rings.push({ x: d.x, y: d.y, r: 80 * a * (1 - 0.12 * Math.min(1, a / 2.4)) + 2, s: s0 });
        });
      });
      var LX = -0.45, LY = 0.55, LZ = 0.7, Ln = Math.hypot(LX, LY, LZ); LX /= Ln; LY /= Ln; LZ /= Ln;
      for (var Y = Y1; Y >= Y0; Y -= GW) { /* far to near */
        var e0 = proj(W / 2, Y, 0); if (!e0) continue;
        var half = (W / 2 + 24) / e0[2], X0 = W / 2 - Math.ceil(half / GW) * GW;
        for (var X = X0; X <= W / 2 + half; X += GW) {
          var h = hgt(X, Y), p = proj(X, Y, h); if (!p || p[1] < -6 || p[1] > H + 6 || p[0] < -6 || p[0] > W + 6) continue;
          var hx = (hgt(X + 2, Y) - h) / 2, hy = (hgt(X, Y + 2) - h) / 2, nn = Math.hypot(hx, hy, 1);
          var dif = (-hx * LX - hy * LY + LZ) / nn - LZ; /* >0 facing light, <0 facing away */
          var glint = Math.max(0, dif) * 2.2, k = p[2], depth = Math.min(1, k * 1.1);
          var al = Math.max(0.03, Math.min(0.6, (0.13 + glint * 0.55 + Math.min(0, dif) * 0.35 + Math.max(0, h) * 0.006) * (0.45 + 0.55 * depth)));
          var r = Math.max(0.35, Math.min(2.6, 0.95 * k * (1 + Math.max(0, h) * 0.03)));
          x.globalAlpha = al;
          var tint = Math.min(1, glint * 1.4) * (rings.length ? 1 : 0.35); /* toward --accent light blue #a9d7f5 */
          if (light) {
            /* ink navy dots that lift toward accent blue */
            x.fillStyle = tint > 0.05
              ? "rgb(" + Math.round(10 + (79 - 10) * tint) + "," + Math.round(18 + (140 - 18) * tint) + "," + Math.round(48 + (255 - 48) * tint) + ")"
              : "rgba(10,18,48," + (0.35 + 0.45 * Math.min(1, al * 2)).toFixed(3) + ")";
          } else {
            x.fillStyle = tint > 0.05 ? "rgb(" + Math.round(255 - 86 * tint) + "," + Math.round(255 - 40 * tint) + "," + Math.round(255 - 10 * tint) + ")" : "#fff";
          }
          x.beginPath(); x.arc(p[0], p[1], r, 0, 6.2832); x.fill();
        }
      }
      x.globalAlpha = 1;
    }
    function loop(now) {
      raf = 0;
      if (!seen || document.hidden || !host.isConnected) return;
      now - last >= 15 && ((last = now), draw(now));
      drops.length || !red ? (raf = requestAnimationFrame(loop)) : draw(now);
    }
    function kick() { !raf && seen && !document.hidden && (drops.length || !red) && (raf = requestAnimationFrame(loop)); }
    document.addEventListener("visibilitychange", kick);
    window.ResizeObserver ? new ResizeObserver(size).observe(host) : setTimeout(size, 50);
    try {
      new MutationObserver(function () {
        var was = light; theme();
        if (was !== light) draw(performance.now());
      }).observe(document.documentElement, { attributes: !0, attributeFilter: ["data-theme"] });
    } catch (_) {}
    size(); kick();
    return {
      drop: function (dx, dy) {
        if (red) return;
        var R = Math.max(Math.hypot(dx, dy), Math.hypot(W - dx, dy), Math.hypot(dx, H - dy), Math.hypot(W - dx, H - dy)) + 20;
        var w = unproj(dx, dy); drops.push({ x: w[0], y: w[1], t: performance.now(), R: R }); kick();
      },
      vis: function (v) { seen = v; v ? kick() : draw(performance.now()); }
    };
  }
  var mpGeGlobeQueue=[];
  function mpGeMountGlobe(card){
    if(!card.isConnected)return;
    if(!window.MPShop || !MPShop.mountDecorativeGlobe){mpGeGlobeQueue=mpGeGlobeQueue.filter(function(el){return el.isConnected;});mpGeGlobeQueue.push(card);return;}
    var icon=card.querySelector('svg.chat-ge-ico');if(!icon || card.querySelector("canvas.chat-ge-globe"))return;
    var canvas=document.createElement('canvas');canvas.className='chat-ge-ico chat-ge-globe';canvas.setAttribute('aria-hidden','true');icon.remove();card.prepend(canvas);MPShop.mountDecorativeGlobe(canvas);
  }
  document.addEventListener('load',function(event){if(event.target.tagName==='SCRIPT'&&/\/js\/shop\.js(?:\?|$)/.test(event.target.src)){var cards=mpGeGlobeQueue;mpGeGlobeQueue=[];cards.forEach(mpGeMountGlobe);}},true);
  function mpGlobeEmbed(b, t) {
    if (!b || !t || b.classList.contains("chat-np-bubble")) return;
    var m = MP_GE_RE.exec(String(t));
    if (!m) return;
    var id = m[1], rest = String(t).replace(m[0], " ").replace(/\s+/g, " ").trim(), only = !rest;
    var ge = b.querySelector(".chat-embed"), gb = b.querySelector(".chat-embed-badge");
    ge && ge.remove(); gb && gb.remove();
    var c = document.createElement("a");
    c.className = "chat-ge is-loading"; c.href = "/#globe/" + id;
    c.innerHTML = '<span class="chat-ge-pic"></span><span class="chat-ge-tx"><span class="chat-ge-l1"><span class="chat-ge-who"></span><svg class="chat-ge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2C12 2 8 6 8 12Z"/><path d="M21 15H3"/><path d="M21 9H3"/></svg></span><span class="chat-ge-l2"></span></span>';
    c.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (location.pathname === "/" || /index\.html$/.test(location.pathname)) location.hash = "#globe/" + id; else location.href = "/#globe/" + id; });
    var tx = b.querySelector(".chat-text");
    if (only) { b.classList.add("chat-ge-bubble"); tx && (tx.hidden = !0); b.insertBefore(c, b.firstChild); }
    else { tx && (tx.innerHTML = _e(rest)); tx ? tx.insertAdjacentElement("afterend", c) : b.appendChild(c); }
    requestAnimationFrame(function(){mpGeMountGlobe(c);});
    var who = c.querySelector(".chat-ge-who"), l2 = c.querySelector(".chat-ge-l2"), pic = c.querySelector(".chat-ge-pic");
    function fail() { c.classList.remove("is-loading"); c.classList.add("is-na"); who.textContent = "Globe"; l2.textContent = "Post unavailable"; }
    var pr = mpGeCache[id] || (mpGeCache[id] = E("/api/forum/thread/" + encodeURIComponent(id) + "?limit=1").catch(function () { delete mpGeCache[id]; return null; }));
    pr.then(function (r) {
      var th = r && r.ok && r.thread;
      if (!th) return fail();
      c.classList.remove("is-loading");
      if (r.locked) { who.textContent = "Globe"; l2.textContent = "Members-only post"; return; }
      if (th.author && window.mpHide && mpHide.is(th.author)) { c.classList.add("is-na"); who.textContent = "Globe"; l2.textContent = "Post made by a hidden user"; return; }
      who.textContent = mpAt(th.author || "unknown") + (th.createdAt ? " \u00b7 " + mpGeAgo(th.createdAt) : "");
      var body = String(th.content || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
      l2.textContent = th.title ? th.title + (body ? " \u2014 " + body : "") : body;
      var img = mpGpThumbUrl(th.thumb);
      if (img && /^(https?:|\/|data:image)/i.test(img)) { var im = document.createElement("img"); im.alt = ""; im.loading = "lazy"; im.src = img; im.onerror = function () { im.remove(); }; pic.appendChild(im); }
      else { try { var av = J(th.author, th.authorAvatar, "xs", th.hasAvatarImg ? th.avatarV : void 0); av && (pic.appendChild(av), pic.classList.add("is-av")); } catch (_) {} }
      c.setAttribute("aria-label", "Globe post by " + mpAt(th.author) + ": " + (th.title || ""));
    });
  }

  /* Official Apple Music excerpt: play once, then hold the final wordmark. */
  var mpAmSeq = 0;
  function mpAmStart(card) {
    if (!card || card._mpAmOn) return;
    card._mpAmOn = !0;
    try {
      if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch (_) {}
    var showing = !1,
      timer = null,
      xfTimer = null,
      onScreen = !0,
      pageOn = !document.hidden,
      stagger = (mpAmSeq++ % 8) * 480,
      first = !0,
      playbackEpoch = 0;
    function clear() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
    function xfEnd() {
      if (xfTimer) {
        clearTimeout(xfTimer);
        xfTimer = null;
      }
      card.classList.remove("is-xf");
    }
    async function flip() {
      var epoch = ++playbackEpoch;
      var video = card.querySelector(".chat-np-official");
      if (!showing && video) {
        video.classList.remove("is-playing");
        try {
          mpAmWarm();
          if (video.currentTime && video.readyState < 2) video.currentTime = 0;
          else if (video.readyState >= 2 && video.currentTime > 0.04) video.currentTime = 0;
          // Keep the text visible until a solid keyed frame is on the canvas, so
          // a black/empty first film frame cannot flash through the crossfade.
          var playing = video.play();
          var started = await Promise.race([
            Promise.resolve(playing).then(function () { return true; }, function () { return false; }),
            new Promise(function (resolve) { setTimeout(function () { resolve(false); }, 1500); })
          ]);
          if (epoch !== playbackEpoch || !onScreen || !pageOn || !card.isConnected) return;
          var keyed = card.querySelector(".chat-np-official-key"),
            host = card.querySelector(".chat-np-am-mark");
          if (started) {
            await new Promise(function (resolve) {
              var t0 = Date.now();
              function check() {
                if (epoch !== playbackEpoch) return resolve();
                if (keyed && video.readyState >= 2 && mpAmKey(keyed, video) && keyed._mpCover >= 0.035) {
                  host && host.classList.add("is-keyed");
                  video.classList.add("is-playing");
                  return resolve();
                }
                if (Date.now() - t0 > 1500) return resolve();
                video.requestVideoFrameCallback ? video.requestVideoFrameCallback(check) : requestAnimationFrame(check);
              }
              check();
            });
          }
          if (epoch !== playbackEpoch || !onScreen || !pageOn || !card.isConnected) return;
          if (!video.classList.contains("is-playing")) {
            video.pause();
            keyed && keyed._mpStill && keyed._mpStill();
          }
        } catch (_) { video.pause(); }
      } else if (video) video.pause();
      if (epoch !== playbackEpoch || !onScreen || !pageOn || !card.isConnected) return;
      var keyed = card.querySelector(".chat-np-official-key");
      if (keyed && keyed._mpInk !== mpAmKeyInk(keyed)) mpAmKeyRedraw(keyed);
      if (!showing && keyed) {
        /* prewarm: key the current film frame and let it composite before the fade-in */
        try { if (video && video.classList.contains("is-playing") && video.readyState >= 2 && mpAmKey(keyed, video)) { var host = card.querySelector(".chat-np-am-mark"); host && host.classList.add("is-keyed"); } } catch (_) {}
        card.classList.add("is-xf");
        await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
        if (epoch !== playbackEpoch || !onScreen || !pageOn || !card.isConnected) { card.classList.remove("is-xf"); return; }
      }
      showing = !showing;
      if (xfTimer) clearTimeout(xfTimer);
      card.classList.add("is-xf");
      card.classList.toggle("show-am", showing);
      /* will-change only while the ~510ms crossfade runs */
      xfTimer = setTimeout(xfEnd, 560);
    }
    function arm() {
      clear();
      if (!onScreen || !pageOn) return;
      var wait = showing ? 2500 : first ? 5000 + stagger : 5000;
      timer = setTimeout(function () {
        first = !1;
        flip().then(function () { if (onScreen && pageOn && card.isConnected) arm(); });
      }, wait);
    }
    function pauseOff() {
      playbackEpoch++;
      var video = card.querySelector(".chat-np-official");
      if (video) video.pause();
      clear();
      xfEnd();
      if (showing) {
        showing = !1;
        card.classList.remove("show-am");
      }
    }
    try {
      var io = new IntersectionObserver(
        function (ents) {
          onScreen = !!(ents[0] && ents[0].isIntersecting);
          onScreen && pageOn ? arm() : pauseOff();
        },
        { threshold: 0.2 }
      );
      io.observe(card);
    } catch (_) {
      onScreen = !0;
    }
    document.addEventListener("visibilitychange", function () {
      pageOn = !document.hidden;
      pageOn && onScreen ? arm() : pauseOff();
    });
    arm();
  }
  function mpAmWarm() {
    if (window.__mpAmWarm) return;
    window.__mpAmWarm = 1;
    ["/assets/apple-music/official-wordmark.webp?v=2", "/assets/apple-music/official-icon-still.webp?v=1"].forEach(function (src) {
      var img = new Image();
      img.decoding = "async";
      img.src = src;
      if (img.decode) img.decode().catch(function () {});
    });
    ["/assets/apple-music/official-wordmark.mp4?v=1", "/assets/apple-music/official-icon-loop.mp4?v=1"].forEach(function (src) {
      var v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = src;
      try { v.load(); } catch (_) {}
    });
  }
  function mpAmBuildMark() {
    mpAmWarm();
    var mark = document.createElement("span");
    mark.className = "chat-np-am-mark";
    var poster = document.createElement("img");
    poster.className = "chat-np-official-still";
    poster.src = "/assets/apple-music/official-wordmark.webp?v=2";
    poster.alt = "";
    mark.appendChild(poster);
    var video = document.createElement("video");
    video.className = "chat-np-official";
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    video.preload = "auto";
    video.poster = "/assets/apple-music/official-wordmark.webp?v=2";
    video.src = "/assets/apple-music/official-wordmark.mp4?v=1";
    video.setAttribute("aria-hidden", "true");
    mark.appendChild(video);
    var key = document.createElement("canvas");
    key.className = "chat-np-official-key";
    key.width = 384;
    key.height = 124;
    key.setAttribute("aria-hidden", "true");
    mark.appendChild(key);
    mpAmKeyWire(mark, key, video, poster);
    return mark;
  }
  // Apple's films are bright artwork on black. Blend modes on video layers are
  // unreliable on iOS (a translucent box shows), so convert the black to real
  // alpha in a small canvas. Light text colour gets a hue-kept dark version.
  var mpAmKeys = [], mpAmKeyObs = null;
  function mpAmKeyInk(canvas) {
    var m = /(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/.exec(getComputedStyle(canvas).color || "");
    return !!m && 0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3] < 128;
  }
  function mpAmKey(canvas, source) {
    var ctx = canvas._mpCtx || (canvas._mpCtx = canvas.getContext("2d", { willReadFrequently: true }));
    if (!ctx || !source) return false;
    var w = canvas.width, h = canvas.height;
    try {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      var img = ctx.getImageData(0, 0, w, h), d = img.data, ink = mpAmKeyInk(canvas), K = 20, S = 255 / (255 - K), edge = canvas._mpEdge;
      if (!edge) {
        // Feather the outer edge so the film's frame can never read as a box.
        var e = Math.max(2, Math.round(Math.min(w, h) * 0.06));
        edge = canvas._mpEdge = new Float32Array(w * h);
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) edge[y * w + x] = Math.min(1, Math.min(x, y, w - 1 - x, h - 1 - y) / e);
      }
      var cover = 0, px = d.length / 4;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2], hi = r > g ? (r > b ? r : b) : (g > b ? g : b);
        if (hi <= K) { d[i + 3] = 0; continue; }
        var f = 255 / (hi - K);
        r = r > K ? (r - K) * f : 0; g = g > K ? (g - K) * f : 0; b = b > K ? (b - K) * f : 0;
        if (ink) { var lo = r < g ? (r < b ? r : b) : (g < b ? g : b); r -= lo; g -= lo; b -= lo; }
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = (hi - K) * S * edge[i >> 2];
        if (d[i + 3] > 12) cover++;
      }
      canvas._mpCover = cover / px;
      // A fade-to-black or a loop reset would flash an empty canvas; keep the last solid frame.
      if (canvas._mpCover < 0.035 && canvas._mpGood) {
        ctx.putImageData(canvas._mpGood, 0, 0);
        canvas._mpLast = source;
        canvas._mpInk = ink;
        return true;
      }
      ctx.putImageData(img, 0, 0);
      if (canvas._mpCover >= 0.035) canvas._mpGood = ctx.getImageData(0, 0, w, h);
      canvas._mpLast = source;
      canvas._mpInk = ink;
      return true;
    } catch (_) { return false; }
  }
  function mpAmKeyRedraw(canvas) { return !!(canvas && canvas._mpLast) && mpAmKey(canvas, canvas._mpLast); }
  function mpAmKeyWire(host, canvas, video, still) {
    function ready() {
      if (!canvas._mpLast || canvas._mpLast === still) { if (mpAmKey(canvas, still)) host.classList.add("is-keyed"); }
    }
    still.complete && still.naturalWidth ? ready() : still.addEventListener("load", ready);
    var pumping = false, lastTime = -1;
    function tick() {
      if (video.readyState >= 2 && video.currentTime !== lastTime) { lastTime = video.currentTime; if (mpAmKey(canvas, video)) host.classList.add("is-keyed"); }
      if (video.paused || video.ended || !canvas.isConnected) { pumping = false; return; }
      video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    }
    function pump() { if (!pumping) { pumping = true; lastTime = -1; tick(); } }
    video.addEventListener("playing", pump);
    video.addEventListener("seeked", function () { if (video.paused && canvas._mpLast === video) { lastTime = -1; tick(); } });
    video.addEventListener("ended", function () { lastTime = -1; tick(); });
    canvas._mpStill = function () { mpAmKey(canvas, still); };
    mpAmKeys.push(canvas);
    if (!mpAmKeyObs && window.MutationObserver) {
      // Theme switches change the text colour; re-key paused frames to match.
      var rekey = function () {
        mpAmKeys = mpAmKeys.filter(function (c) { return c.isConnected || !c._mpSeen; });
        mpAmKeys.forEach(function (c) { if (c.isConnected) { c._mpSeen = 1; if (c._mpInk !== mpAmKeyInk(c)) mpAmKeyRedraw(c); } });
      };
      var again = function () { requestAnimationFrame(rekey); setTimeout(rekey, 500); };
      mpAmKeyObs = new MutationObserver(again);
      mpAmKeyObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
      document.body && mpAmKeyObs.observe(document.body, { attributes: true, attributeFilter: ["data-theme", "class"] });
    }
  }
  function mpAmWire(card) {
    if (!card || card.querySelector(".chat-np-meta")) return;
    var tx = card.querySelector(".chat-np-tx");
    var who = card.querySelector(".chat-np-who");
    var lines = card.querySelectorAll(".chat-np-line");
    if (!tx || lines.length < 2) return;
    var meta = document.createElement("span");
    meta.className = "chat-np-meta";
    var info = document.createElement("span");
    info.className = "chat-np-info";
    // Keep the compact text and provider mark aligned to the cover-side edge.
    if (who) info.appendChild(who);
    var body = document.createElement("span");
    body.className = "chat-np-body";
    body.appendChild(lines[0]);
    body.appendChild(lines[1]);
    info.appendChild(body);
    tx.insertBefore(meta, tx.firstChild);
    meta.appendChild(info);
    var am = document.createElement("span");
    am.className = "chat-np-am";
    am.setAttribute("aria-hidden", "true");
    am.appendChild(mpAmBuildMark());
    meta.appendChild(am);
    var sr = document.createElement("span");
    sr.className = "chat-np-am-sr";
    sr.textContent = "Powered by Apple Music";
    tx.appendChild(sr);
    mpAmStart(card);
  }

  /* Song previews (per dc): a play button on the cover of song cards in chat and the profile
     "Listening" card plays Apple's 30-second preview. One preview at a time; Misery FM pauses
     while it plays and picks back up after. Tap only, never auto-play. */
  var MPPreview = (function () {
    var memo = Object.create(null), audio = null, cur = null, raf = 0, fmWas = false, fadeT = 0;
    /* Web Audio path (per dc): iOS attaches a lock-screen player to any page that played an <audio>
       element and keeps it after the clip ends. Clips decoded and played through Web Audio don't get
       one. Bytes come through the Worker (/api/preview) because Web Audio needs CORS; until that route
       answers, the <audio> element below is used. */
    var ac = null, node = null, gainN = null, t0 = 0, dur = 30, seq = 0, mode = "", bufs = Object.create(null), bufKeys = [];
    var PROXY = e + "/api/preview?u=";
    function probe(src) {
      if (mode || !(window.AudioContext || window.webkitAudioContext)) { mode = mode || "el"; return; }
      mode = "probing";
      fetch(PROXY + encodeURIComponent(src), { method: "HEAD" }).then(function (r) { mode = r.ok ? "wa" : "el"; }, function () { mode = "el"; });
    }
    function getBuf(src) {
      if (bufs[src]) return bufs[src];
      bufKeys.push(src);
      while (bufKeys.length > 4) delete bufs[bufKeys.shift()];
      return (bufs[src] = fetch(PROXY + encodeURIComponent(src))
        .then(function (r) { if (!r.ok) throw new Error("preview " + r.status); return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (res, rej) { var q = ac.decodeAudioData(b, res, rej); q && q.then && q.then(res, rej); }); })
        .catch(function (er) { delete bufs[src]; throw er; }));
    }
    function waSession(on) {
      try { navigator.audioSession && (navigator.audioSession.type = on ? "playback" : "auto"); } catch (er) {}
    }
    function playWA(btn) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!ac) ac = new AC();
      waSession(true);
      try { ac.resume && ac.resume(); } catch (er) {}
      /* a silent one-sample buffer inside the tap unlocks Web Audio on iOS */
      try { var sb = ac.createBuffer(1, 1, 22050), s0 = ac.createBufferSource(); s0.buffer = sb; s0.connect(ac.destination); s0.start(0); } catch (er) {}
      var my = ++seq;
      getBuf(btn._src).then(function (buf) {
        if (my !== seq || cur !== btn) return;
        var g = ac.createGain(), n = ac.createBufferSource(), now = ac.currentTime;
        n.buffer = buf;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.9, now + 0.25);
        n.connect(g); g.connect(ac.destination);
        n.onended = function () { node === n && stop(); };
        node = n; gainN = g; dur = buf.duration || 30; t0 = now;
        n.start(now);
        paint(btn, "play");
        raf || (raf = requestAnimationFrame(tick));
      }, function () {
        if (my !== seq || cur !== btn) return;
        mode = "el"; /* next tap uses the element */
        stop();
      });
    }
    var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.6v12.8c0 .9 1 1.4 1.7.9l9.4-6.4c.6-.4.6-1.4 0-1.8l-9.4-6.4c-.7-.5-1.7 0-1.7.9Z" fill="currentColor"/></svg>';
    var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/></svg>';
    var C = 2 * Math.PI * 15;
    function okUrl(u) {
      try { var x = new URL(u); return x.protocol === "https:" && /(^|\.)(apple\.com|mzstatic\.com)$/.test(x.hostname) ? x.href : ""; } catch (e) { return ""; }
    }
    function keyOf(song) {
      var ref = mpMusicRef(song.url);
      return ref ? ref.key : "q:" + mpNPq(song.title + " " + song.artist);
    }
    function find(song) {
      if (!song || !song.title || !song.artist) return Promise.resolve("");
      if (song.preview && okUrl(song.preview)) return Promise.resolve(okUrl(song.preview));
      var k = keyOf(song), lk = "mp-pv1:" + k;
      if (memo[k]) return memo[k];
      try {
        var hit = JSON.parse(localStorage.getItem(lk) || "null");
        if (hit && Date.now() - hit.t < 7 * 864e5) return (memo[k] = Promise.resolve(hit.u || ""));
      } catch (e) {}
      var ref = mpMusicRef(song.url), q = song.title + " " + song.artist;
      var req = ref
        ? fetch("https://itunes.apple.com/lookup?id=" + ref.id + "&entity=song&country=" + ref.country)
            .then(function (r) { return r.json(); })
            .then(function (d) { var tr = (d.results || []).find(function (x) { return String(x.trackId) === ref.id; }); return tr && tr.previewUrl; })
        : mpNPSearch(q, { limit: 10 }).then(function (list) { var m = mpNPPick(list || [], q); return m.r && m.s >= 5 ? m.r.previewUrl : ""; });
      return (memo[k] = req.then(function (u) {
        u = okUrl(u || "");
        try { localStorage.setItem(lk, JSON.stringify({ u: u, t: Date.now() })); } catch (e) {}
        return u;
      }, function () { delete memo[k]; return ""; }));
    }
    function paint(btn, state) {
      btn.classList.toggle("is-playing", state === "play");
      btn.classList.toggle("is-loading", state === "load");
      btn.setAttribute("aria-label", (state === "idle" ? "Play preview of " : "Pause preview of ") + btn._title);
      btn.setAttribute("aria-pressed", state === "idle" ? "false" : "true");
      if (state === "idle") btn._arc.style.strokeDashoffset = C;
    }
    function tick() {
      raf = 0;
      if (!cur || !(audio || node)) return;
      if (!cur.isConnected) return stop();
      var k = node ? Math.min(1, (ac.currentTime - t0) / dur) : Math.min(1, (audio.currentTime || 0) / (audio.duration || 30));
      cur._arc.style.strokeDashoffset = C * (1 - k);
      raf = requestAnimationFrame(tick);
    }
    function fmPause() {
      try { if (window.MPFM && MPFM.listening && MPFM.listening()) { fmWas = true; MPFM.listen(false); } } catch (e) {}
    }
    function fmResume() {
      if (!fmWas) return;
      fmWas = false;
      try { window.MPFM && MPFM.listen && MPFM.listen(true); } catch (e) {}
    }
    function stop(keepFm) {
      clearInterval(fadeT);
      cancelAnimationFrame(raf); raf = 0;
      seq++;
      if (node) { var n0 = node; node = null; try { n0.onended = null; n0.stop(); } catch (er) {} try { n0.disconnect(); } catch (er) {} }
      if (gainN) { try { gainN.disconnect(); } catch (er) {} gainN = null; }
      if (ac && !keepFm) { try { ac.state === "running" && ac.suspend(); } catch (er) {} waSession(false); }
      /* release the element completely so iOS drops its lock-screen player */
      if (audio) { var a0 = audio; audio = null; try { a0.pause(); } catch (e) {} a0.removeAttribute("src"); try { a0.load(); } catch (e) {} }
      var was = cur;
      cur = null;
      if (was) { paint(was, "idle"); was.closest(".mp-pv-host") && was.closest(".mp-pv-host").classList.remove("is-pv-playing"); keepFm || msOff(fmWas); }
      keepFm || fmResume();
    }
    /* iOS Control Center / lock screen (per dc): show the song and artist, not the page title and site icon.
       On stop the session goes back to Misery FM (MPFM.mediaReset) so its own controls work again. */
    function msOn(btn) {
      var M = navigator.mediaSession, s = btn._song || {};
      if (!M) return;
      try {
        var art = s.art ? String(s.art).replace(/\/\d+x\d+bb\./, "/600x600bb.") : "";
        window.MediaMetadata && (M.metadata = new MediaMetadata({ title: mpMusicTitle(s.title) || s.title || "", artist: s.artist || "", album: s.album || "", artwork: art ? [{ src: art, sizes: "600x600" }] : [] }));
        M.playbackState = "playing";
        ["nexttrack", "previoustrack", "seekto", "seekbackward", "seekforward", "play"].forEach(function (a) { try { M.setActionHandler(a, null); } catch (e) {} });
        M.setActionHandler("pause", function () { stop(); });
      } catch (e) {}
    }
    /* After a preview: hand the session back to Misery FM only if it was playing; otherwise clear it
       (no metadata, no handlers) so the lock-screen / Control Center player disappears (per dc). */
    function msOff(toFm) {
      var M = navigator.mediaSession;
      if (!M) return;
      try { M.metadata = null; M.playbackState = "none"; } catch (e) {}
      if (toFm) { try { window.MPFM && MPFM.mediaReset && MPFM.mediaReset(); } catch (e) {} return; }
      ["play", "pause", "nexttrack", "previoustrack", "seekto", "seekbackward", "seekforward"].forEach(function (a) { try { M.setActionHandler(a, null); } catch (e) {} });
      try { M.setPositionState && M.setPositionState(); } catch (e) {}
    }
    function play(btn) {
      if (cur === btn) return stop();
      stop(true);
      if (mode !== "wa" && !audio) {
        audio = new Audio();
        audio.preload = "none";
        audio.setAttribute("playsinline", "");
        /* events from an element that was already released (a new preview started) are ignored */
        audio.addEventListener("ended", function () { this === audio && stop(); });
        audio.addEventListener("error", function () { this === audio && cur && stop(); });
        audio.addEventListener("playing", function () { this === audio && cur && (paint(cur, "play"), raf || (raf = requestAnimationFrame(tick))); });
        audio.addEventListener("waiting", function () { this === audio && cur && paint(cur, "load"); });
      }
      cur = btn;
      paint(btn, "load");
      var host = btn.closest(".mp-pv-host");
      host && host.classList.add("is-pv-playing");
      fmPause();
      msOn(btn);
      if (mode === "wa") return playWA(btn);
      audio.src = btn._src;
      audio.volume = 0;
      var p = audio.play();
      p && p.catch && p.catch(function () { cur === btn && stop(); });
      /* short fade-in so the clip doesn't start with a click */
      var v = 0;
      fadeT = setInterval(function () { v = Math.min(1, v + 0.1); try { audio.volume = v * 0.9; } catch (e) {} v >= 1 && clearInterval(fadeT); }, 25);
    }
    document.addEventListener("visibilitychange", function () { document.hidden && cur && stop(); });
    /* host = the cover element; the button appears once a preview is known to exist */
    function attach(host, song) {
      if (!host || host.querySelector(".mp-pv")) return;
      find(song).then(function (src) {
        if (!src || !host.isConnected || host.querySelector(".mp-pv")) return;
        probe(src);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "mp-pv";
        b._src = src;
        b._title = mpMusicTitle(song.title) + " by " + song.artist;
        b._song = song;
        /* both glyphs stay in the DOM so play <-> pause cross-fades instead of swapping */
        b.innerHTML = '<span class="mp-pv-disc"><svg class="mp-pv-ring" viewBox="0 0 34 34" aria-hidden="true"><circle class="mp-pv-track" cx="17" cy="17" r="15"/><circle class="mp-pv-arc" cx="17" cy="17" r="15"/></svg><span class="mp-pv-g mp-pv-play">' + PLAY + '</span><span class="mp-pv-g mp-pv-pause">' + PAUSE + "</span></span>";
        b._arc = b.querySelector(".mp-pv-arc");
        b._arc.style.strokeDasharray = C;
        paint(b, "idle");
        ["click", "pointerdown", "touchstart", "mousedown"].forEach(function (ev) {
          b.addEventListener(ev, function (e) { e.stopPropagation(); ev === "click" && (e.preventDefault(), play(b)); }, ev === "touchstart" ? { passive: true } : false);
        });
        b.addEventListener("keydown", function (e) { e.stopPropagation(); });
        host.classList.add("mp-pv-host");
        host.appendChild(b);
        requestAnimationFrame(function () { b.classList.add("is-in"); });
      });
    }
    return { attach: attach, find: find, stop: stop };
  })();
  window.MPPreview = MPPreview;

  function mpNowListening(e, t, n, a) {
    var ref = mpMusicRef(t), r = /^\+\s*(\S.{1,120})$/.exec(String(t || "").trim());
    if (!ref && (!r || /^\+\d/.test(String(t).trim()))) return;
    if (e.querySelector(".chat-np")) return;
    var o = ref ? ref.key : r[1].replace(/&amp;/g, "&").trim(),
      i = e.querySelector(".chat-text"),
      c = document.createElement("div");
    ((c.className = "chat-np is-loading"),
      (c.innerHTML =
        '<span class="chat-np-grad"></span><span class="chat-np-glow"></span><span class="chat-np-halo"></span><span class="chat-np-art"></span><span class="chat-np-tx"><span class="chat-np-who"></span><span class="chat-np-line"></span><span class="chat-np-line s"></span></span>'),
      e.classList.add("chat-np-bubble"),
      i && (i.hidden = !0),
      e.insertBefore(c, e.firstChild));
    var originalEmbeds = ref ? Array.from(e.querySelectorAll(".chat-embed,.chat-embed-badge")) : [];
    originalEmbeds.forEach(function (node) { node.style.display = "none"; });
    var l = c.querySelector(".chat-np-who"),
      d = document.createElement("span");
    function s() {
      var e = a && a.querySelector(".chat-avatar-img, .avatar img, img[class*=avatar]");
      if (e) {
        var t = e.cloneNode(!0);
        ((t.className = "chat-np-av"), t.removeAttribute("style"), l.insertBefore(t, l.firstChild));
      }
    }
    ((d.textContent = (n ? mpName(n) : "Someone") + " is listening to"), l.appendChild(d));
    function g(n) {
      if (!n) { originalEmbeds.forEach(function (node) { node.style.display = ""; }); c.remove(); e.classList.remove("chat-np-bubble"); if (i) i.hidden = false; return; }
      originalEmbeds.forEach(function (node) { node.remove(); });
      (s(), c.classList.remove("is-loading"));
      var a = c.querySelector(".chat-np-art"),
        r = document.createElement("img");
      var aL = (n.arts || [n.art]).filter(Boolean),
        gl = c.querySelector(".chat-np-glow");
      function ph() {
        (r.remove(), c.classList.add("no-art"), (a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><circle cx="6.5" cy="18.5" r="3.5"/><circle cx="18" cy="16" r="3"/><path d="M10 18.5L10 7C10 6.07655 10 5.61483 10.2635 5.32794C10.5269 5.04106 11.0175 4.9992 11.9986 4.91549C16.022 4.57222 18.909 3.26005 20.3553 2.40978C20.6508 2.236 20.7986 2.14912 20.8993 2.20672C21 2.26432 21 2.4315 21 2.76587V16"/><path d="M10 10C15.8667 10 19.7778 7.66667 21 7"/></svg>'), (gl.style.backgroundImage = ""), (c.querySelector(".chat-np-halo").style.backgroundImage = ""), sg("linear-gradient(135deg,#3a4a6b,#5b4a7a 55%,#2f5d6e)"));
      }
      function sg(gr) {
        gr && (c.style.setProperty("--np-g", gr), requestAnimationFrame(function () { c.classList.add("has-grad"); }));
      }
      function nx() {
        var e = aL.shift();
        e
          ? ((r.src = e), (gl.style.backgroundImage = c.querySelector(".chat-np-halo").style.backgroundImage = "url(" + JSON.stringify(e) + ")"))
          : ph();
      }
      ((r.alt = ""), (r.draggable = !1), (r.onerror = nx), (r.onload = function () { mpNPGrad(r.src, function (gr) { sg(gr || "linear-gradient(135deg,#3a4a6b,#5b4a7a 55%,#2f5d6e)"); }); }), a.appendChild(r), nx());
      var d = c.querySelectorAll(".chat-np-line");
      ((d[0].textContent = mpMusicTitle(n.title)), (d[1].textContent = "by " + n.artist));
      var u = document.createElement("span");
      ((u.className = "chat-np-eq"), (u.innerHTML = "<i></i><i></i><i></i>"), (u.setAttribute("aria-hidden", "true"), a.appendChild(u)));
      mpAmWire(c);
      MPPreview.attach(a, n);
      if (n.url && /^https:\/\/(music|itunes)\.apple\.com\//.test(n.url)) {
        c.setAttribute("role", "link"); c.tabIndex = 0;
        function openSong(event) {
          event.stopPropagation();
          if (!document.querySelector(".chat-react-picker")) window.open(n.url, "_blank", "noopener");
        }
        c.addEventListener("click", openSong);
        c.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); openSong(event); } });
      }
    }
    o in mpNPv ? g(mpNPv[o]) : (ref ? mpMusicLookup(ref) : mpNPLookup(o)).then(function (e) {
      g(e);
    });
  }
  function He(t) {
    return t && t.id && /^[A-Za-z0-9]+$/.test(t.id)
      ? "video" === t.kind
        ? (((n = document.createElement("video")).src = e + "/api/media/" + t.id),
          (n.controls = !0),
          (n.playsInline = !0),
          (n.preload = "metadata"),
          (n.className = "chat-media"),
          n)
        : "image" === t.kind
          ? (((n = document.createElement("img")).src = e + "/api/media/" + t.id),
            (n.loading = "lazy"),
            (n.alt = ""),
            (n.className = "chat-media"),
            (n.onerror = function () {
              var e = document.createElement("div");
              ((e.className = "chat-unsupported"),
                (e.textContent = "This type of file is not supported."),
                n.parentNode && n.parentNode.replaceChild(e, n));
            }),
            n)
          : (((n = document.createElement("div")).className = "chat-unsupported"),
            (n.textContent = "This type of file is not supported."),
            n)
      : null;
    var n;
  }
  function je(e) {
    if (!e || !e.title || !e.url) return null;
    if (MP_GE_RE.test(e.url)) return null;
    if (!/^https?:\/\//i.test(e.url)) return null;
    var t = document.createElement("a");
    if (
      ((t.className = "chat-embed"),
      (t.href = e.url),
      (t.target = "_blank"),
      (t.rel = "noopener noreferrer"),
      e.thumb)
    ) {
      var n = document.createElement("img");
      ((n.src = e.thumb),
        (n.loading = "lazy"),
        (n.alt = ""),
        (n.referrerPolicy = "no-referrer"),
        t.appendChild(n));
    }
    var a = document.createElement("span");
    a.className = "chat-embed-tx";
    var r = document.createElement("span");
    ((r.className = "chat-embed-t"), (r.textContent = e.title), a.appendChild(r));
    var o = document.createElement("span");
    return (
      (o.className = "chat-embed-p"),
      (o.textContent = e.provider || ""),
      a.appendChild(o),
      t.appendChild(a),
      t
    );
  }
  var Re = {
    "music.apple.com": "#fa243c",
    "open.spotify.com": "#1db954",
    "youtube.com": "#ff0000",
    "www.youtube.com": "#ff0000",
    "youtu.be": "#ff0000",
    "x.com": "#e7e9ea",
    "twitter.com": "#1d9bf0",
    "instagram.com": "#e1306c",
    "www.instagram.com": "#e1306c",
    "tiktok.com": "#fe2c55",
    "www.tiktok.com": "#fe2c55",
    "soundcloud.com": "#ff5500",
    "genius.com": "#ffff64",
    "www.genius.com": "#ffff64",
  };
  function Be(e) {
    if (!e || !e.url) return null;
    if (MP_GE_RE.test(e.url)) return null;
    var t = "";
    try {
      t = new URL(e.url).hostname;
    } catch (e) {
      return null;
    }
    if (!t) return null;
    var n = document.createElement("span");
    n.className = "chat-embed-badge";
    var a = Re[t] || Re[t.replace(/^www\./, "")];
    if (a) {
      var r = parseInt(a.slice(1, 3), 16),
        o = parseInt(a.slice(3, 5), 16),
        i = parseInt(a.slice(5, 7), 16);
      n.style.setProperty("--badge-glow", "rgba(" + r + "," + o + "," + i + ",0.35)");
    }
    var c = document.createElement("img");
    return (
      (c.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(t) + "&sz=64"),
      (c.alt = ""),
      (c.loading = "lazy"),
      (c.referrerPolicy = "no-referrer"),
      n.appendChild(c),
      n
    );
  }
  var Ue = [],
    De = Object.create(null),
    ze = !1;
  function Fe(e, t) {
    if (e && e.id && !u[e.id]) {
      ((u[e.id] = !0), (De[e.id] = e));
      for (var n = 0; n < Ue.length; n++)
        if (Ue[n] && Ue[n].id === e.id) {
          Ue.splice(n, 1);
          break;
        }
      (e.user && Ge[e.user] && (delete Ge[e.user], nt()),
        e.ts && e.ts > m && 0 !== String(e.id).indexOf("opt-") && (m = e.ts));
      var a = window.__chatBatchRoot || Le();
      if (a) {
        /* Speed: "am I at the bottom" forces a layout; it is only used outside batch loads. */
        var r = window.__chatBatchLoading ? !1 : Se(),
          o = document.createElement("div");
        if (
          ((o.className =
            "chat-msg" +
            (s && e.user === s.username ? " mine" : "") +
            (F(e.user) ? " owner-msg" : "") +
            (V(e.user) ? " kitty-msg" : "")),
          e.private && o.classList.add("chat-private"),
          o.setAttribute("data-id", e.id),
          o.setAttribute("data-user", e.user || ""),
          mpPwTake(e),
          mpPwApply(o, e.user),
          e.ts && o.setAttribute("data-ts", String(e.ts)),
          e.user &&
            (Je[e.user.toLowerCase()] = {
              avatar: e.avatar,
              hasImg: !(void 0 === e.av && (e.user !== (s && s.username) || void 0 === X())),
              imgV: void 0 !== e.av ? e.av : e.user === (s && s.username) ? X() : void 0,
              username: e.user,
            }),
          o.classList.contains("mine"))
        ) {
          var i = document.createElement("div");
          var l = e.embed ? Oe(e.text) : e.text;
          i.className = "chat-bubble" + (e.media ? " chat-bubble-media" : "");
          var c = He(e.media),
            cP = mpPhotoCard(c);
          cP && !l ? ((i.className = "chat-bubble chat-photo-only"), i.appendChild(cP)) : !cP && c && i.appendChild(c);
          if (l) {
            var d = document.createElement("div");
            ((d.className = "chat-text"), (d.innerHTML = _e(l)), i.appendChild(d));
          }
          var p = je(e.embed);
          p && i.appendChild(p);
          var h = Be(e.embed);
          if ((h && i.appendChild(h), F(e.user) && Z(i), V(e.user) && W(i), e.reactions)) {
            var v = ye(e.id, e.reactions);
            v && i.appendChild(v);
          }
          if (cP && l) {
            ((i.className = "chat-bubble"), o.classList.add("chat-photo-text"));
            var cW = document.createElement("div");
            ((cW.className = "chat-photo-col"), cW.appendChild(cP), cW.appendChild(i), mpMineMain(o, e).appendChild(cW));
          } else (!e.media && mpNowListening(i, mpMusicRef(e.text) ? e.text : l, e.user, o), mpGlobeEmbed(i, e.text), mpPollRender(i, e), mpMineMain(o, e).appendChild(i));
          var f = J(e.user, e.avatar, "sm", void 0 !== e.av ? e.av : X()),
            g = _(e);
          (g && f.insertAdjacentHTML("beforeend", g), ee(f, e.user), o.appendChild(f));
        } else {
          var b = J(e.user, e.avatar, null, void 0 !== e.av ? e.av : void 0),
            y = _(e);
          (y && b.insertAdjacentHTML("beforeend", y), ee(b, e.user), o.appendChild(b));
          var w = document.createElement("div");
          w.className = "chat-msg-main";
          var C = document.createElement("div");
          C.className = "chat-msg-head";
          var x = document.createElement("strong");
          ((x.textContent = mpName(e.user) || "?"), C.appendChild(x));
          var E = document.createElement("span");
          ((E.className = "chat-time"),
            (E.textContent = e.ts
              ? (function (e) {
                  var t = Math.max(1, Math.floor((Date.now() - e) / 1e3));
                  if (t < 60) return t + "s";
                  var n = Math.floor(t / 60);
                  if (n < 60) return n + "m";
                  var a = Math.floor(n / 60);
                  if (a < 24) return a + "h";
                  var r = Math.floor(a / 24);
                  return r < 7 ? r + "d" : new Date(e).toLocaleDateString();
                })(e.ts)
              : ""),
            C.appendChild(E),
            w.appendChild(C));
          var k = document.createElement("div");
          var S = e.embed ? Oe(e.text) : e.text;
          k.className = "chat-bubble" + (e.media ? " chat-bubble-media" : "");
          var L = He(e.media),
            LP = mpPhotoCard(L);
          LP && !S ? ((k.className = "chat-bubble chat-photo-only"), k.appendChild(LP)) : !LP && L && k.appendChild(L);
          LP && S && ((k.className = "chat-bubble"), o.classList.add("chat-photo-text"), w.appendChild(LP));
          if (S) {
            var M = document.createElement("div");
            ((M.className = "chat-text"), (M.innerHTML = _e(S)), k.appendChild(M));
          }
          var T = je(e.embed);
          T && k.appendChild(T);
          var A = Be(e.embed);
          if ((A && k.appendChild(A), F(e.user) && Z(k), V(e.user) && W(k), e.reactions)) {
            var N = ye(e.id, e.reactions);
            N && k.appendChild(N);
          }
          (!e.media && mpNowListening(k, mpMusicRef(e.text) ? e.text : S, e.user, o), mpGlobeEmbed(k, e.text), mpPollRender(k, e), w.appendChild(k), o.appendChild(w));
        }
        if (
          (e.ts && Date.now() - e.ts < 2e3 && o.classList.add("chat-msg-in"),
          (function () {
            for (
              var t = e.ts || 0, n = a.querySelectorAll(".chat-msg:not(.chat-typing-msg)"), r = 0;
              r < n.length;
              r++
            ) {
              if ((parseInt(n[r].getAttribute("data-ts") || "0", 10) || 0) > t)
                return void a.insertBefore(o, n[r]);
            }
            a.appendChild(o);
          })(),
          !window.__chatBatchLoading && mpPhotoStack(a),
          e.private && mpPMCaption(o, e),
          !window.__chatBatchLoading &&
          a.querySelectorAll(".chat-typing-msg").forEach(function (e) {
            a.appendChild(e);
          }),
          !window.__chatBatchLoading &&
          (function (e) {
            e.querySelectorAll(".chat-text").forEach(function (t) {
              if (!t.dataset.clamped)
                if (
                  ((t.dataset.clamped = "1"),
                  t.classList.add("clamped"),
                  t.offsetHeight,
                  t.scrollHeight > t.clientHeight + 4)
                ) {
                  var n = t.textContent,
                    a = e.getAttribute("data-user") || "",
                    r = e.querySelector(".chat-time"),
                    o = r ? r.textContent : "",
                    i = document.createElement("span");
                  ((i.className = "chat-more"), (i.textContent = "··· more"));
                  var c = function (e) {
                    (e.stopPropagation(),
                      (function (e, t, n) {
                        Ve();
                        var a = document.createElement("div");
                        ((a.className = "msg-popup"), (a.id = "msg-popup"));
                        var r = document.createElement("div");
                        r.className = "msg-popup-inner";
                        var o = document.createElement("div");
                        ((o.innerHTML = _e(e)), r.appendChild(o));
                        var i = document.createElement("div");
                        ((i.className = "msg-popup-meta"),
                          (i.textContent = t + (n ? " · " + n : "")),
                          r.appendChild(i));
                        var c = document.createElement("button");
                        ((c.className = "msg-popup-close"),
                          (c.textContent = "Close"),
                          (c.onclick = function (e) {
                            (e.stopPropagation(), Ve());
                          }),
                          r.appendChild(c),
                          a.appendChild(r),
                          (a.onclick = function (e) {
                            e.target === a && Ve();
                          }),
                          document.body.appendChild(a));
                      })(n, a, o));
                  };
                  (i.addEventListener("click", c),
                    (t.style.cursor = "pointer"),
                    t.addEventListener("click", c),
                    t.parentNode.insertBefore(i, t.nextSibling));
                } else t.classList.remove("clamped");
            });
          })(o),
          r &&
            !window.__chatBatchLoading &&
            Te() &&
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }),
          !t && !window.__chatBatchLoading && r)
        ) {
          for (var P = a.querySelectorAll(".chat-msg:not(.chat-typing-msg)"); P.length > 100;) {
            var I = P[0],
              q = I.getAttribute("data-id");
            (q && De[q] && Ue.push(De[q]),
              q && delete u[q],
              I.remove(),
              (P = a.querySelectorAll(".chat-msg:not(.chat-typing-msg)")));
          }
          P.length <= 100 && Te() && window.scrollTo(0, document.documentElement.scrollHeight);
        }
        !window.__chatBatchLoading && qe();
      }
    }
  }
  function mpClampMsg(e) {
    e &&
      e.querySelectorAll(".chat-text").forEach(function (t) {
        if (!t.dataset.clamped)
          if (
            ((t.dataset.clamped = "1"),
            t.classList.add("clamped"),
            t.offsetHeight,
            t.scrollHeight > t.clientHeight + 4)
          ) {
            var n = t.textContent,
              a = e.getAttribute("data-user") || "",
              r = e.querySelector(".chat-time"),
              o = r ? r.textContent : "",
              i = document.createElement("span");
            ((i.className = "chat-more"), (i.textContent = "··· more"));
            var c = function (ev) {
              (ev.stopPropagation(),
                (function (e, t, n) {
                  Ve();
                  var a = document.createElement("div");
                  ((a.className = "msg-popup"), (a.id = "msg-popup"));
                  var r = document.createElement("div");
                  r.className = "msg-popup-inner";
                  var o = document.createElement("div");
                  ((o.innerHTML = _e(e)), r.appendChild(o));
                  var i = document.createElement("div");
                  ((i.className = "msg-popup-meta"),
                    (i.textContent = t + (n ? " · " + n : "")),
                    r.appendChild(i));
                  var c = document.createElement("button");
                  ((c.className = "msg-popup-close"),
                    (c.textContent = "Close"),
                    (c.onclick = function (e) {
                      (e.stopPropagation(), Ve());
                    }),
                    r.appendChild(c),
                    a.appendChild(r),
                    (a.onclick = function (e) {
                      e.target === a && Ve();
                    }),
                    document.body.appendChild(a));
                })(n, a, o));
            };
            (i.addEventListener("click", c),
              (t.style.cursor = "pointer"),
              t.addEventListener("click", c),
              t.parentNode.insertBefore(i, t.nextSibling));
          } else t.classList.remove("clamped");
      });
  }
  function Ve() {
    var e = document.getElementById("msg-popup");
    e && e.parentNode && e.parentNode.removeChild(e);
  }
  var We = Object.create(null);
  function Ze(e) {
    var t = c.querySelector('.chat-msg[data-id="' + CSS.escape(e) + '"]');
    (t && t.parentNode && t.parentNode.removeChild(t), u[e] && delete u[e], De[e] && delete De[e]);
  }
  var Ge = Object.create(null),
    Ye = null,
    Je = Object.create(null);
  function Xe(e) {
    window.MPOnlineCount = e;
    var t = document.querySelector(".dashboard-online-badge .live-num");
    t && (t.textContent = e);
    var n = document.querySelector(".dashboard-online-badge");
    n && (n.hidden = !(e > 0));
    var a = c.querySelector(".chat-online");
    if (a) {
      var r = e;
      if ((s && r < 1 && (r = 1), r > 0)) {
        a.hidden = !1;
        var o = a.querySelector(".chat-online-num");
        (o && (o.textContent = r),
          a.dataset.bound || ((a.dataset.bound = "1"), a.addEventListener("click", et)));
      } else a.hidden = !0;
    }
  }
  !(function () {
    if (!document.getElementById("onlinePulseStyle")) {
      var e = document.createElement("style");
      ((e.id = "onlinePulseStyle"),
        (e.textContent =
          "@keyframes onlinePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.85}}@keyframes onlineDotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}"),
        document.head.appendChild(e));
    }
  })();
  var Qe = null;
  function $e() {
    (Qe && Qe.parentNode && Qe.parentNode.removeChild(Qe),
      (Qe = null),
      document.removeEventListener("click", Ke));
  }
  function Ke(e) {
    if (Qe && !Qe.contains(e.target)) {
      var t = c.querySelector(".chat-online");
      if (t && (e.target === t || t.contains(e.target))) return;
      $e();
    }
  }
  function et() {
    if ((ht(), Qe)) $e();
    else {
      var e = c.querySelector(".chat-online");
      if (e) {
        (Qe = document.createElement("div")).className = "chat-me-menu online-dropdown";
        var t = c.querySelector(".chat-head"),
          n = e.getBoundingClientRect(),
          a = 8;
        if (t) a = t.getBoundingClientRect().bottom + 8;
        else a = n.bottom + 8;
        ((Qe.style.cssText =
          "position:fixed;left:" +
          Math.max(8, n.left) +
          "px;top:" +
          a +
          "px;min-width:200px;max-width:280px;max-height:300px;overflow-y:auto;z-index:300;"),
          (Qe.innerHTML = ""));
        var r = document.createElement("div");
        ((r.style.cssText = "font-size:13px;opacity:.6;text-align:center;padding:16px;"),
          (r.textContent = "Loading…"),
          Qe.appendChild(r),
          document.body.appendChild(Qe),
          setTimeout(function () {
            document.addEventListener("click", Ke);
          }, 10));
        var o = Qe;
        E("/api/online")
          .then(function (e) {
            if (o === Qe)
              if (((o.innerHTML = ""), e && e.ok && Array.isArray(e.users) && e.users.length))
                e.users.forEach(function (e) {
                  var t = "string" == typeof e ? e : e.username || e.name || "Unknown",
                    n = document.createElement("button");
                  ((n.type = "button"),
                    (n.style.cssText =
                      "display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;border:none;background:transparent;color:var(--ink);font-size:13px;font-weight:500;border-radius:9px;cursor:pointer;"));
                  var a = document.createElement("span");
                  ((a.style.cssText =
                    "width:8px;height:8px;border-radius:50%;background:#4ade80;flex:none;box-shadow:0 0 8px rgba(74,222,128,0.6);animation:onlineDotPulse 1.6s ease-in-out infinite;"),
                    n.appendChild(a));
                  var r = document.createElement("span");
                  ((r.className = "chat-avatar-wrap"),
                    (r.style.cssText = "position:relative;flex:none;display:inline-flex;"));
                  try {
                    var i = J(t, e.avatar, "xs", e.avatarV);
                    if (i) {
                      var c = i.querySelector("img"),
                        s = i.querySelector("span.chat-avatar");
                      (c
                        ? (c.style.cssText =
                            "width:28px;height:28px;object-fit:cover;border-radius:50%;flex:none;display:block;")
                        : s &&
                          (s.style.cssText = "width:28px;height:28px;font-size:14px;flex:none;"),
                        r.appendChild(i));
                    }
                  } catch (e) {}
                  try {
                    var l = "object" == typeof e ? e : { username: t };
                    l.activeBadge ||
                      l.verified ||
                      !T[t] ||
                      (l = { username: t, activeBadge: T[t] });
                    var d = P(l);
                    d && r.insertAdjacentHTML("beforeend", d);
                  } catch (e) {}
                  n.appendChild(r);
                  var u = document.createElement("span");
                  ((u.style.fontWeight = "600"),
                    (u.textContent = t),
                    n.appendChild(u),
                    n.addEventListener("click", function () {
                      ($e(), window.MPChat && MPChat.openUserSheet && MPChat.openUserSheet(t));
                    }),
                    n.addEventListener("mouseenter", function () {
                      n.style.background = "rgba(255,255,255,.06)";
                    }),
                    n.addEventListener("mouseleave", function () {
                      n.style.background = "transparent";
                    }),
                    o.appendChild(n));
                });
              else {
                var t = document.createElement("div");
                ((t.style.cssText = "font-size:13px;opacity:.6;text-align:center;padding:16px;"),
                  (t.textContent = (window.MPOnlineCount || 0) + " user(s) online"),
                  o.appendChild(t));
              }
          })
          .catch(function () {
            o.innerHTML = "";
            var e = document.createElement("div");
            ((e.style.cssText = "font-size:13px;opacity:.6;text-align:center;padding:16px;"),
              (e.textContent = (window.MPOnlineCount || 0) + " user(s) online"),
              o.appendChild(e));
          });
      }
    }
  }
  function tt() {
    var e = Date.now(),
      t = !1;
    for (var n in Ge) e - Ge[n] > 3e3 && (delete Ge[n], (t = !0));
    (t && nt(), Object.keys(Ge).length > 0 && (clearTimeout(Ye), (Ye = setTimeout(tt, 3e3))));
  }
  function nt() {
    var e = Le();
    if (e) {
      e.querySelectorAll(".chat-typing-msg").forEach(function (e) {
        e.remove();
      });
      var t = Object.keys(Ge).slice(0, 3);
      t.length &&
        t.forEach(function (t) {
          var n = document.createElement("div");
          ((n.className = "chat-msg chat-typing-msg"), n.setAttribute("data-user", t));
          var a = Je[t.toLowerCase()],
            r = J(t, a && a.avatar, null, a ? a.imgV : void 0),
            o = _({ user: t });
          (o && r.insertAdjacentHTML("beforeend", o), ee(r, t), n.appendChild(r));
          var i = document.createElement("div");
          i.className = "chat-msg-main";
          var c = document.createElement("div");
          c.className = "chat-bubble";
          var s = document.createElement("span");
          ((s.className = "chat-typing-dots"),
            (s.innerHTML = "<i></i><i></i><i></i>"),
            c.appendChild(s),
            i.appendChild(c),
            n.appendChild(i),
            e.appendChild(n));
        });
    }
  }
  var at = 0;
  function rt() {
    var e = Date.now();
    if (!(e - at < 2e3) && ((at = e), p && 1 === p.readyState))
      try {
        p.send(JSON.stringify({ t: "typing" }));
      } catch (e) {}
  }
  function ot() {
    ((v = !1),
      (!p || (0 !== p.readyState && 1 !== p.readyState)) &&
        (f ||
          (d
            ? ((f = !0),
              (bootTake("ticket") || E("/api/ws-ticket", { method: "POST", body: {} }))
                .then(function (e) {
                  ((f = !1), v || (e && e.ticket ? it(e.ticket) : ct()));
                })
                .catch(function () {
                  ((f = !1), v || ct());
                }))
            : it(null))));
  }
  function it(t) {
    if (!v) {
      try {
        p = new WebSocket(
          (function (t) {
            return (
              e.replace(/^http/, "ws") + "/api/ws" + (t ? "?ticket=" + encodeURIComponent(t) : "")
            );
          })(t),
        );
      } catch (e) {
        return void ct();
      }
      ((p.onopen = function () {
        ((h = 0),
          dt(),
          document.dispatchEvent(new Event("mp-live-connected")),
          clearInterval(b),
          (b = setInterval(function () {
            p && 1 === p.readyState && p.send(JSON.stringify({ t: "ping" }));
          }, 25e3)),
          ut());
      }),
        (p.onmessage = function (e) {
          var t, n, a, o;
          try {
            t = JSON.parse(e.data);
          } catch (e) {
            return;
          }
          if (t && t.t)
            if ("hello" === t.t) {
              var followHello = Se() || !c.querySelector(".chat-msg");
              ("number" == typeof t.online && Xe(t.online),
                "boolean" == typeof t.paused && st(t.paused),
                t.badges && (T = Object.assign(Object.create(null), t.badges)),
                t.pw && mpPwMerge(t.pw, !0),
                t.you && te((s = rcKeep(t.you)).points || 0),
                t.caps && t.caps.private && mpPMEnable(), t.caps && t.caps.poll && (window.mpPollOn = !0),
                mpIngestHistory(t.messages),
                followHello && Ne(!0),
                window.MPFM && MPFM.setMe(s));
            } else if ("badge" === t.t && t.user) {
              t.badge ? (T[t.user] = t.badge) : delete T[t.user];
              var i = '.chat-msg[data-user="' + CSS.escape(t.user) + '"]';
              c.querySelectorAll(i).forEach(function (e) {
                !(function (e, t) {
                  var n = e.querySelector(".chat-avatar-wrap");
                  if (n) {
                    var a = n.querySelector(
                      ".chat-badge, .chat-verified, .chat-badge-kitty, .chat-badge-mask",
                    );
                    a && a.remove();
                    var r = _({ user: t });
                    r && n.insertAdjacentHTML("beforeend", r);
                  }
                })(e, t.user);
              });
            } else if ("notif" === t.t && t.n) mpNotifPop(t.n);
            else if ("pw" === t.t && t.user) mpPwSet(t.user, t.pw);
            else if ("points" === t.t && t.user) s && t.user === s.username && te(t.points || 0);
            else if ("paused" === t.t && "boolean" == typeof t.paused) st(t.paused);
            else if ("ban" === t.t && t.user) {
              if (s && t.user === s.username && t.banned) {
                try {
                  localStorage.removeItem(r);
                } catch (e) {}
                ((d = null), gt(), ae());
              }
            } else if ("reload" === t.t) {
              if (
                (t.user &&
                  E("/api/user/" + encodeURIComponent(t.user))
                    .then(function (e) {
                      var n = e && e.user;
                      n &&
                        c.querySelectorAll(".chat-msg[data-user]").forEach(function (e) {
                          if (
                            e.getAttribute("data-user").toLowerCase() ===
                            String(t.user).toLowerCase()
                          ) {
                            if (n.username !== e.getAttribute("data-user")) {
                              e.setAttribute("data-user", n.username);
                              var a = e.querySelector(".chat-msg-head strong");
                              a && (a.textContent = mpName(n.username));
                            }
                            var r = e.querySelector(".chat-avatar-wrap");
                            if (r) {
                              var o = J(
                                n.username,
                                n.avatar,
                                r.classList.contains("sm") ? "sm" : null,
                                n.hasAvatarImg ? n.avatarV : void 0,
                              );
                              r.parentNode.replaceChild(o, r);
                            }
                          }
                        });
                    })
                    .catch(function () {}),
                E("/api/online")
                  .then(function (e) {
                    if (e && e.users) {
                      var t = {};
                      (e.users.forEach(function (e) {
                        t[e.username.toLowerCase()] = e;
                      }),
                        c.querySelectorAll(".chat-msg[data-user]").forEach(function (e) {
                          var n = e.getAttribute("data-user"),
                            a = t[n.toLowerCase()];
                          if (a) {
                            if (a.username !== n) {
                              e.setAttribute("data-user", a.username);
                              var r = e.querySelector(".chat-msg-head strong");
                              r && (r.textContent = mpName(a.username));
                            }
                            var o = e.querySelector(".chat-avatar-wrap");
                            if (o) {
                              var i = J(
                                a.username,
                                a.avatar,
                                o.classList.contains("sm") ? "sm" : null,
                                a.hasAvatarImg ? a.avatarV : void 0,
                              );
                              o.parentNode.replaceChild(i, o);
                            }
                          }
                        }));
                    }
                  })
                  .catch(function () {}),
                window.MPForum && MPForum.onAvatarReload)
              )
                try {
                  MPForum.onAvatarReload();
                } catch (e) {}
            } else if ("embed" === t.t && t.id && t.embed) {
              var l = c.querySelector('.chat-msg[data-id="' + CSS.escape(t.id) + '"] .chat-bubble');
              if (l && !l.querySelector(".chat-embed")) {
                var p = je(t.embed);
                if (p) {
                  var h = l.querySelector(".chat-text");
                  if (h) {
                    var v = Oe(h.textContent);
                    v ? (h.innerHTML = _e(v)) : h.parentNode.removeChild(h);
                  }
                  l.appendChild(p);
                  var f = Be(t.embed);
                  (f && !l.querySelector(".chat-embed-badge") && l.appendChild(f), Ne(!1));
                }
              }
            } else if ("online" === t.t && "number" == typeof t.count) Xe(t.count);
            else if ("typing" === t.t && t.user)
              ((n = t.user),
                (a = t.avatar),
                (o = t.av),
                s &&
                  n !== s.username &&
                  ((Ge[n] = Date.now()),
                  (void 0 === a && void 0 === o) ||
                    (Je[n.toLowerCase()] = {
                      avatar: a,
                      hasImg: !(!o || 0 === o),
                      imgV: o,
                      username: n,
                    }),
                  nt(),
                  clearTimeout(Ye),
                  (Ye = setTimeout(tt, 3e3))));
            else if ("err" === t.t) {
              var g = String((t && (t.error || t.message)) || "Something went wrong.");
              if ((k(g), /paus|rate|limit|send|fail/i.test(g) || t.failed)) {
                var b = null,
                  y = -1;
                for (var w in We) We[w] && We[w].ts > y && ((y = We[w].ts), (b = w));
                if (b) {
                  var C = We[b].tempId;
                  (delete We[b], Ze(C));
                }
              }
            } else if ("msg" === t.t) {
              var x = s && t.m && t.m.user === s.username;
              ((function (e) {
                if (!e || !e.user || e.user !== (s && s.username)) return !1;
                var t = e.cid ? We[e.cid] : null;
                if (!t) return !1;
                var n = t.tempId,
                  a = c.querySelector('.chat-msg[data-id="' + CSS.escape(n) + '"]');
                return (
                  !!a &&
                  (delete We[e.cid],
                  a.setAttribute("data-id", e.id),
                  e.ts && a.setAttribute("data-ts", String(e.ts)),
                  "pw" in e && mpPwSet(e.user, e.pw),
                  De[n] && ((De[e.id] = e), delete De[n]),
                  u[n] && ((u[e.id] = !0), delete u[n]),
                  e.ts && e.ts > m && (m = e.ts),
                  !0)
                );
              })(t.m) || Fe(t.m),
                x &&
                  E("/api/me")
                    .then(function (e) {
                      e && e.user && te((s = rcKeep(e.user)).points || 0);
                    })
                    .catch(function () {}));
            } else if ("poll" === t.t && t.id && t.poll) mpPollUpdate(t.id, t.poll);
            else if ("reaction" === t.t && t.id)
              (De[t.id] && (De[t.id].reactions = t.reactions || {}), we(t.id, t.reactions || {}));
            else if ("forum" === t.t)
              document.dispatchEvent(
                new CustomEvent("mp-forum-update", {
                  detail: { kind: t.kind, threadId: t.threadId },
                }),
              );
            else if ("del" === t.t)
              !(function (e) {
                (delete u[e], delete De[e]);
                for (var t = 0; t < Ue.length; t++)
                  if (Ue[t] && Ue[t].id === e) {
                    Ue.splice(t, 1);
                    break;
                  }
                var n = c.querySelector('.chat-msg[data-id="' + CSS.escape(e) + '"]');
                n && n.parentNode && n.parentNode.removeChild(n);
              })(t.id);
            else if ("clear" === t.t) {
              ((u = Object.create(null)),
                (Ue = []),
                (We = Object.create(null)),
                (Ge = Object.create(null)),
                clearTimeout(Ye));
              for (var L = c.querySelectorAll(".chat-msg"), S = 0; S < L.length; S++)
                L[S].parentNode.removeChild(L[S]);
            }
        }),
        (p.onclose = ct),
        (p.onerror = function () {
          try {
            p.close();
          } catch (e) {}
        }));
    }
  }
  function ct() {
    (clearInterval(b),
      (p = null),
      v ||
        (++h >= 3 &&
          !C &&
          (function () {
            if (C) return;
            C = !0;
            var e = function () { if (!document.hidden) ut(); };
            (e(), lt(), (y = setInterval(e, 3e3)), (w = setInterval(lt, 3e4)));
          })(),
        clearTimeout(g),
        (g = setTimeout(ot, Math.min(1e3 * Math.pow(2, h), 3e4)))));
  }
  function st(e) {
    l = !!e;
    var t = c.querySelector(".chat-inputbar input"),
      n = c.querySelector(".chat-send"),
      a = c.querySelector(".chat-plus"),
      r = s && s.owner;
    l && !r
      ? (t && ((t.disabled = !0), (t.placeholder = "Chat is paused")),
        n && (n.style.opacity = ".4"),
        a && (a.style.opacity = ".4"),
        c.classList.add("chat-is-paused"))
      : (t && ((t.disabled = !1), (t.placeholder = "Message")),
        n && (n.style.opacity = ""),
        a && (a.style.opacity = ""),
        c.classList.remove("chat-is-paused"));
  }
  function lt() {
    E("/api/chat/status")
      .then(function (e) {
        e && "boolean" == typeof e.paused && st(e.paused);
      })
      .catch(function () {});
  }
  function dt() {
    ((C = !1), clearInterval(y), clearInterval(w));
  }
  var catchUpRequest = null;
  function ut() {
    if (catchUpRequest) return catchUpRequest;
    var token = d;
    catchUpRequest = E("/api/messages?since=" + m + "&limit=200")
      .then(function (e) {
        if (token !== d) return;
        if (e && e.badges) for (var t in e.badges) T[t] = e.badges[t];
        mpIngestHistory(e && e.messages);
      })
      .catch(function () {})
      .finally(function () { catchUpRequest = null; });
    return catchUpRequest;
  }
  function mt() {
    if (
      ((v = !0),
      (f = !1),
      clearTimeout(g),
      clearInterval(b),
      dt(),
      clearInterval(G),
      (G = null),
      (Ge = Object.create(null)),
      clearTimeout(Ye),
      p)
    ) {
      try {
        ((p.onclose = null), (p.onerror = null), p.close());
      } catch (e) {}
      p = null;
    }
    h = 0;
  }
  function liveChatCatchUp() {
    if (document.hidden || !d || !s) return;
    ut();
    if (!p || p.readyState > 1) ot();
  }
  // WebSocket is primary. A visible-page catch-up also heals missed events
  // and mobile sockets which appear OPEN after the phone resumes.
  setInterval(liveChatCatchUp, 5000);
  document.addEventListener("visibilitychange", liveChatCatchUp);
  window.addEventListener("online", liveChatCatchUp);
  window.addEventListener("focus", liveChatCatchUp);
  window.addEventListener("pageshow", liveChatCatchUp);
  var pt = null;
  function ht() {
    (pt && pt.parentNode && pt.parentNode.removeChild(pt),
      (pt = null),
      document.removeEventListener("click", ht));
  }
  /* Profile settings sheet (opened from the profile menu and, per dc, from the
     shop Globe tile via window.MPOpenProfile). */
  /* Sharing a song in public chat updates your profile's Listening to that song (per dc). */
  /* A song link, or a "+song name" line (the + prefix embed), shared publicly updates Listening. */
  function mpListenFromText(text){
    if(window.MPProfiles&&MPProfiles.songUrl&&MPProfiles.songUrl(text))return mpListenFromSong(text);
    var r=/^\+\s*(\S.{1,120})$/.exec(text);
    if(!r||/^\+\d/.test(text))return;
    mpNPLookup(r[1].trim()).then(function(n){/* only a real track link (not the search fallback) */n&&n.url&&/^https:\/\/(music|itunes)\.apple\.com\/.*([?&]i=\d+|\/song\/)/.test(n.url)&&mpListenFromSong(n.url);}).catch(function(){});
  }
  function mpListenFromSong(url){
    if(!s||!d||!url)return;
    mpProfileMusicResolve(url).then(function(r){var g=r.listening;if(!g||!g.title||!g.artist||!g.url)return null;
      if(s.listening&&s.listening.url===g.url)return null;
      return E('/api/profile',{method:'POST',body:{listening:{title:g.title,artist:g.artist,album:g.album||'',url:g.url,art:g.art||null,artistArt:g.artistArt||null,explicit:typeof g.explicit==='boolean'?g.explicit:null,provider:g.provider||null}}});
    }).then(function(r){r&&r.ok&&r.user&&(s=mpProfileSynced(rcKeep(r.user)));}).catch(function(){});
  }
  function mpProfileMusicResolve(url,signal){return E('/api/profile/music?url='+encodeURIComponent(url),{signal:signal}).then(function(r){if(!r||!r.ok||!r.listening)throw Error(r&&r.error||'Music metadata unavailable. Try again.');return r;});}
  function mpProfileSheet(e, inline) {
    if (!s) return;
    if (!inline && window.MPProfiles && MPProfiles.topBar()) {
      mpPBclose(true);
      mpPBshow(s, MPProfiles.topBar(), ++mpPBreq, false, s.username);
      mpPBel && mpPBel._edit && mpPBel._edit();
      return;
    }
    if (!inline) gt();
    var r = document.createElement("div");
    r.className = "chat-sheet-backdrop" + (e ? " backdrop-enter" : "");
    var o = document.createElement("div");
    o.className = "chat-sheet";
    var i = document.createElement("div");
    ((i.className = "chat-sheet-anim"),
      o.setAttribute("role", "dialog"),
      o.setAttribute("aria-label", "Profile"));
    var l = document.createElement("button");
    ((l.type = "button"),
      (l.className = "chat-sheet-x"),
      l.setAttribute("aria-label", "Close"),
      (l.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="14" height="14" data-hi="fade"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>'),
      (l.style.cssText =
        "position:absolute;top:10px;right:12px;width:32px;height:32px;flex:none;border-radius:999px;border:1px solid var(--stroke);background:var(--fill);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"),
      l.addEventListener("click", inline ? inline.back : gt),
      o.appendChild(l),
      o.appendChild(z(s)));
    var d = J(s.username, s.avatar, "lg", X()),
      u = P(s);
    u && d.insertAdjacentHTML("beforeend", u);
    (d.classList.add("chat-avatar-click"),
      d.setAttribute("role", "button"),
      d.setAttribute("tabindex", "0"),
      d.setAttribute("aria-label", "Change profile photo"));
    var m = function (e) {
      e && e.stopPropagation();
      var t = document.createElement("div");
      t.className = "avatar-options-overlay";
      var n = document.createElement("div");
      n.className = "avatar-options-menu";
      var a = function () {
          t.parentNode && t.parentNode.removeChild(t);
        },
        r = function (e, t) {
          var r = document.createElement("button");
          ((r.type = "button"),
            (r.className = "avatar-options-btn"),
            (r.textContent = e),
            r.addEventListener("click", function (e) {
              (e.stopPropagation(), a(), t());
            }),
            n.appendChild(r));
        };
      (r("Upload photo", function () {
        v.click();
      }),
        s.hasAvatarImg &&
          r("Remove photo", function () {
            ((be.textContent = ""),
              E("/api/profile", { method: "POST", body: { removeAvatar: !0 } })
                .then(function (e) {
                  e && e.ok && e.user
                    ? ((s = mpProfileSynced(rcKeep(e.user))), h(), (f.textContent = "Photo removed."))
                    : (be.textContent = (e && e.error) || "Couldn't remove.");
                })
                .catch(function () {
                  be.textContent = "Couldn't reach the chat server.";
                }));
          }),
        r("Cancel", function () {}),
        t.appendChild(n),
        t.addEventListener("click", a),
        document.body.appendChild(t));
    };
    (d.addEventListener("click", m),
      d.addEventListener("keydown", function (e) {
        ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), m(e));
      }));
    var p = document.createElement("div");
    ((p.className = "chat-sheet-big"), p.appendChild(d), o.appendChild(p));
    var h = function () {
        var e = p.querySelector(".chat-avatar-wrap");
        if (e) {
          var t = J(s.username, s.avatar, "lg", X()),
            n = P(s);
          (n && t.insertAdjacentHTML("beforeend", n),
            e.parentNode.replaceChild(t, e),
            t.classList.add("chat-avatar-click"),
            t.setAttribute("role", "button"),
            t.setAttribute("tabindex", "0"),
            t.setAttribute("aria-label", "Change avatar"),
            t.addEventListener("click", m),
            t.addEventListener("keydown", function (e) {
              ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), m(e));
            }));
        }
        var a = c.querySelector(".chat-me");
        (a &&
          ((a.innerHTML = ""),
          a.appendChild(J(s.username, s.avatar, "sm", X())),
          ne(a)),
          c
            .querySelectorAll(
              '.chat-msg[data-user="' + CSS.escape(s.username) + '"] .chat-avatar-wrap',
            )
            .forEach(function (e) {
              var t = J(s.username, s.avatar, "sm", X()),
                n = _({ user: s.username });
              (n && t.insertAdjacentHTML("beforeend", n),
                ee(t, s.username),
                e.parentNode.replaceChild(t, e));
            }));
      },
      v = document.createElement("input");
    ((v.type = "file"),
      (v.accept = "image/*"),
      (v.style.display = "none"),
      v.addEventListener("change", function () {
        var e = v.files && v.files[0];
        if (e)
          if (
            ((v.value = ""),
            ["image/jpeg", "image/png", "image/webp", "image/gif"].indexOf(e.type) < 0)
          )
            k("Choose a JPEG, PNG, WebP, or GIF image.");
          else if (e.size > 10485760) k("That image is too big (10 MB max).");
          else {
            var t = function () {
              var t = URL.createObjectURL(e),
                n = new Image();
              ((n.onload = function () {
                var e = 256,
                  a = document.createElement("canvas");
                ((a.width = e), (a.height = e));
                var r = a.getContext("2d"),
                  o = Math.min(n.width, n.height);
                (r.drawImage(
                  n,
                  (n.width - o) / 2,
                  (n.height - o) / 2,
                  o,
                  o,
                  0,
                  0,
                  e,
                  e,
                ),
                  URL.revokeObjectURL(t));
                var i = a.toDataURL("image/jpeg", 0.85);
                ((be.textContent = ""),
                  (f.textContent = "Uploading..."),
                  E("/api/avatar", { method: "POST", body: { image: i } })
                    .then(function (e) {
                      e && e.ok
                        ? ((s.hasAvatarImg = !0),
                          (s.avatarV = e.avatarV),
                          (window._myAvatarDataUrl = i),
                          h(),
                          (f.textContent = "Photo updated."))
                        : (be.textContent = (e && e.error) || "Couldn't upload.");
                    })
                    .catch(function () {
                      be.textContent = "Couldn't reach the chat server.";
                    }));
              }),
                (n.onerror = function () {
                  (URL.revokeObjectURL(t),
                    (be.textContent = "Couldn't read that image."));
                }),
                (n.src = t));
            };
            if ("image/gif" === e.type) {
              var n = new FileReader();
              ((n.onload = function () {
                for (
                  var e = new Uint8Array(n.result || []), a = "", r = 0;
                  r < 4 && r < e.length;
                  r++
                )
                  a += String.fromCharCode(e[r]);
                "GIF8" === a ? t() : k("That file isn't a real GIF.");
              }),
                (n.onerror = function () {
                  k("Couldn't read that image.");
                }),
                n.readAsArrayBuffer(e.slice(0, 4)));
            } else t();
          }
      }));
    var f = document.createElement("div");
    ((f.className = "chat-upload-msg"), o.appendChild(f), o.appendChild(v));
    var g = document.createElement("label");
    g.className = "chat-field";
    var b = document.createElement("span");
    ((b.textContent = "Username"), g.appendChild(b));
    var y = document.createElement("input");
    ((y.type = "text"),
      (y.maxLength = 16),
      (y.autocapitalize = "none"),
      (y.spellcheck = !1),
      (y.value = s.username),
      g.appendChild(y),
      o.appendChild(g));
    var w = function () {
      var e = y.value.trim();
      if (e !== s.username) {
        if (
          ((be.textContent = ""),
          !/^[a-zA-Z0-9_]{3,16}$/.test(e) && "l" !== e.toLowerCase())
        )
          return (
            (be.textContent = "Username must be 3–16 characters: letters, numbers, _"),
            void (y.value = s.username)
          );
        E("/api/profile", { method: "POST", body: { username: e } })
          .then(function (e) {
            if (e && e.ok && e.user) {
              var t = s.username;
              ((s = mpProfileSynced(rcKeep(e.user))),
                h(),
                t !== s.username &&
                  c.querySelectorAll(".chat-msg[data-user]").forEach(function (e) {
                    if (e.getAttribute("data-user") === t) {
                      (e.setAttribute("data-user", s.username),
                        e.classList.add("mine"));
                      var n = e.querySelector(".chat-msg-head strong");
                      n && (n.textContent = mpName(s.username));
                      var a = e.querySelector(".chat-avatar");
                      a &&
                        (a.textContent =
                          s.avatar || s.username.charAt(0).toUpperCase());
                    }
                  }));
            } else
              ((be.textContent = (e && e.error) || "Couldn't save."),
                (y.value = s.username));
          })
          .catch(function () {
            ((be.textContent = "Couldn't reach the chat server."),
              (y.value = s.username));
          });
      }
    };
    (y.addEventListener("change", w),
      y.addEventListener("keydown", function (e) {
        "Enter" === e.key && (e.preventDefault(), y.blur());
      }));
    var C = document.createElement("div");
    ((C.className = "chat-sheet-points"),
      (C.innerHTML =
        mpStar() + ' <span>' +
        x(s.points || 0) +
        "</span> stars"),
      o.appendChild(C));
    o.appendChild(MPProfiles.badgePicker(s,{api:E,art:M,allowed:function(user,id){return id!=='robot'||user==='grim';},active:N,changed:function(user){s=mpProfileSynced(rcKeep(user));T[user.username]=N(user);h();}}));
    var A = document.createElement("div");
    ((A.className = "chat-pw-title"), (A.textContent = "Bio"), o.appendChild(A));
    var I = document.createElement("textarea");
    ((I.className = "chat-bio"),
      I.setAttribute("aria-label", "Bio"),
      (I.maxLength = 250),
      (I.rows = 3),
      (I.placeholder = "Tell the chat a little about yourself…"),
      (I.value = s.bio || ""),
      o.appendChild(I));
    var q = document.createElement("div");
    ((q.className = "chat-bio-count"), o.appendChild(q));
    var O = function () {
      q.textContent = I.value.length + "/250";
    };
    (I.addEventListener("input", O), O());
    var H = function () {
      var e = I.value.trim().slice(0, 250);
      e !== (s.bio || "") &&
        E("/api/profile", { method: "POST", body: { bio: e } })
          .then(function (e) {
            e && e.ok && e.user
              ? (s = mpProfileSynced(rcKeep(e.user)))
              : (be.textContent = (e && e.error) || "Couldn't save bio.");
          })
          .catch(function () {
            be.textContent = "Couldn't reach the chat server.";
          });
    };
    I.addEventListener("blur", H);
    window.MPProfiles && MPProfiles.editor(o, s, {origin:"https://api.misereperdue.com", api:E, resolve:mpProfileMusicResolve,
      saved:function(user){s=mpProfileSynced(rcKeep(user));window.MPAuthUser=s;}
    });
    var j = document.createElement("div");
    ((j.className = "chat-pw-title"),
      (j.textContent = "Notifications"),
      o.appendChild(j));
    var R = document.createElement("div"),
      B = !1;
    try {
      B =
        !(
          !window.matchMedia || !window.matchMedia("(display-mode: standalone)").matches
        ) || !!navigator.standalone;
    } catch (e) {}
    ((R.textContent = B
      ? "Get notified for mentions, replies, whispers, and VIP upgrades."
      : "Download the web app to enable push notifications."),
      (R.style.cssText = "font-size:12px;opacity:.55;margin:2px 0 2px;"),
      o.appendChild(R));
    var U = (function (e, t) {
        var n = document.createElement("div");
        n.style.cssText =
          "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;";
        var a = document.createElement("span");
        ((a.textContent = "Push notifications"), (a.style.cssText = "font-size:14px;"));
        var r = document.createElement("button");
        ((r.type = "button"),
          r.setAttribute("aria-label", "Toggle push notifications"),
          (r.style.cssText =
            "position:relative;flex:none;width:46px;height:27px;border-radius:999px;border:none;cursor:pointer;transition:background .2s;padding:0;"));
        var o = document.createElement("span");
        ((o.style.cssText =
          "position:absolute;top:2px;width:23px;height:23px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);transition:left .2s;"),
          r.appendChild(o));
        var i = !!e,
          c = function () {
            ((r.style.background = i ? "#4ade80" : "rgba(255,255,255,0.25)"),
              (o.style.left = i ? "21px" : "2px"));
          };
        return (
          c(),
          r.addEventListener("click", function () {
            ((i = !i), c());
            try {
              t(i);
            } catch (e) {}
          }),
          n.appendChild(a),
          n.appendChild(r),
          {
            el: n,
            set: function (e) {
              ((i = !!e), c());
            },
          }
        );
      })(!1, function (e) {
        e
          ? ("Notification" in window
              ? Notification.requestPermission()
                  .then(function (e) {
                    if ("granted" !== e) throw new Error("Permission denied");
                    return navigator.serviceWorker.ready;
                  })
                  .then(function (e) {
                    return e.pushManager.subscribe({
                      userVisibleOnly: !0,
                      applicationServerKey: xt(Ct),
                    });
                  })
                  .then(function (e) {
                    return E("/api/push/subscribe", {
                      method: "POST",
                      body: { subscription: e.toJSON() },
                    }).then(function (e) {
                      if (!e || !e.ok)
                        throw new Error(
                          (e && e.error) || "Couldn't save subscription.",
                        );
                    });
                  })
              : Promise.reject(new Error("Notifications not supported on this browser"))
            ).catch(function (e) {
              (U.set(!1),
                (be.textContent =
                  (e && e.message) || "Couldn't enable notifications."));
            })
          : kt().catch(function () {});
      }),
      D = !1;
    try {
      D =
        !(
          !window.matchMedia || !window.matchMedia("(display-mode: standalone)").matches
        ) || !!navigator.standalone;
    } catch (e) {}
    D && o.appendChild(U.el);
    var F = document.createElement("div");
    ((F.style.cssText = "font-size:11px;opacity:.45;margin:2px 0 8px;"),
      (F.textContent = "Push ID: —"),
      D && o.appendChild(F));
    function V(e, t, n, a) {
      var r = document.createElement(e);
      return (
        t && (r.className = t),
        null != a && (r.textContent = a),
        n && n.appendChild(r),
        r
      );
    }
    (Et().then(function (e) {
      if ((U.set(!!e), e))
        try {
          var t = e.toJSON(),
            n =
              (t.keys && t.keys.p256dh ? t.keys.p256dh : "") +
              "|" +
              (t.keys && t.keys.auth ? t.keys.auth : "");
          window.crypto &&
            crypto.subtle &&
            crypto.subtle.digest &&
            crypto.subtle
              .digest("SHA-256", new TextEncoder().encode(n))
              .then(function (e) {
                var t = Array.from(new Uint8Array(e))
                  .map(function (e) {
                    return e.toString(16).padStart(2, "0");
                  })
                  .join("")
                  .slice(0, 12);
                F.textContent = "Push ID: " + t;
              })
              .catch(function () {});
        } catch (e) {}
    }),
      V("div", "chat-pw-title", o, "Signature"));
    var W = !(!s.member && !s.owner);
    V(
      "div",
      null,
      o,
      W
        ? "Shows under your forum posts. You can add photos and embeds."
        : "Shows under your forum posts. Members can also add photos and embeds.",
    ).style.cssText = "font-size:12px;opacity:.55;margin:2px 0 8px;";
    var Z = V("div", "sig-bubble", o),
      G = V("div", "sig-mount", Z),
      Y = V("div", "sig-embeds", Z),
      K = V("div", "chat-bio-count", o),
      te = [],
      ae = null,
      re = null,
      oe = null;
    function ie(e) {
      return (window.MPSocialLogos || {})[e] || "";
    }
    function ce(e) {
      var t,
        n,
        a,
        r = String(e || "").trim();
      if (
        (t = r.match(
          /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,30})/i,
        ))
      )
        ((n = "x"), (a = t[1]));
      else if (
        (t = r.match(/^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{1,30})/i))
      )
        ((n = "instagram"), (a = t[1]));
      else if (
        (t = r.match(/^https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9_.]{1,30})/i))
      )
        ((n = "tiktok"), (a = "@" + t[1]));
      else {
        if (
          !(t = r.match(
            /^https?:\/\/(?:www\.)?youtube\.com\/((?:@|channel\/|c\/|user\/)[A-Za-z0-9_.\/-]{1,40})/i,
          ))
        )
          return null;
        ((n = "youtube"), (a = t[1]));
      }
      return {
        kind: "social",
        network: n,
        handle: "x" === n || "instagram" === n ? "@" + a : a,
        url:
          {
            x: "https://x.com",
            instagram: "https://instagram.com",
            tiktok: "https://tiktok.com",
            youtube: "https://youtube.com",
          }[n] +
          "/" +
          a,
      };
    }
    function se(e) {
      if (!e) return "🔗 Embed";
      if ("social" === e.kind) return ie(e.network) + " " + x(e.handle);
      var t = e.src || "";
      return /spotify/i.test(t)
        ? "🎵 Spotify"
        : /soundcloud/i.test(t)
          ? "🎵 SoundCloud"
          : /vimeo/i.test(t)
            ? "🎬 Vimeo"
            : "🔗 Embed";
    }
    function le() {
      ((Y.innerHTML = ""),
        te.forEach(function (e, t) {
          var n = V("span", "sig-chip", Y);
          n.insertAdjacentHTML("afterbegin", se(e) + " ");
          var a = V("button", "sig-chip-x", n);
          a.innerHTML = '<svg class="mp-x-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>';
          ((a.type = "button"),
            a.setAttribute("aria-label", "Remove embed"),
            a.addEventListener("click", function () {
              (te.splice(t, 1), le(), pe());
            }));
        }));
    }
    function de(e) {
      try {
        var t = new URL(e);
        return (
          "https:" === t.protocol &&
          ("open.spotify.com" === t.hostname
            ? 0 === t.pathname.indexOf("/embed/")
            : "player.vimeo.com" === t.hostname
              ? 0 === t.pathname.indexOf("/video/")
              : "w.soundcloud.com" === t.hostname
                ? 0 === t.pathname.indexOf("/player/")
                : ("www.youtube.com" === t.hostname ||
                    "www.youtube-nocookie.com" === t.hostname) &&
                  0 === t.pathname.indexOf("/embed/"))
        );
      } catch (e) {
        return !1;
      }
    }
    function ue(e) {
      var t = ce(e);
      if (t) return t;
      var n = String(e || "").trim(),
        a =
          n.match(/<iframe[^>]*src\s*=\s*"([^"]+)"/i) ||
          n.match(/<iframe[^>]*src\s*=\s*'([^']+)'/i),
        r = function (e) {
          return { kind: "iframe", src: e };
        },
        o = (n = a ? a[1] : n).match(
          /open\.spotify\.com\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/i,
        );
      if (o) return r("https://open.spotify.com/embed/" + o[1] + "/" + o[2]);
      var i = n.match(/vimeo\.com\/(\d+)/i);
      if (i) return r("https://player.vimeo.com/video/" + i[1]);
      if (de(n)) return r(n);
      try {
        var c = new URL(-1 === n.indexOf("://") ? "https://" + n : n);
        if ("soundcloud.com" === c.hostname || c.hostname.endsWith(".soundcloud.com"))
          return r("https://w.soundcloud.com/player/?url=" + encodeURIComponent(n));
      } catch (e) {}
      return null;
    }
    function me() {
      var e = "";
      return (
        ae
          ? (e = ae.getHTML())
          : re &&
            (e = re.value
              .split(/\n\s*\n/)
              .map(function (e) {
                return "<p>" + x(e).replace(/\n/g, "<br>") + "</p>";
              })
              .join("")),
        te.forEach(function (t) {
          "social" === t.kind
            ? (e +=
                '<div class="sig-social"><a href="' +
                String(t.url).replace(/"/g, "%22") +
                '">' +
                ie(t.network) +
                " " +
                x(t.handle) +
                "</a></div>")
            : t.src &&
              de(t.src) &&
              (e +=
                '<div class="sig-embed"><iframe src="' +
                t.src.replace(/"/g, "%22") +
                '" allowfullscreen loading="lazy" sandbox="allow-scripts"></iframe></div>');
        }),
        "<p></p>" === e && (e = ""),
        e
      );
    }
    function pe() {
      E("/api/profile", { method: "POST", body: { signature: me() } })
        .then(function (e) {
          e && e.ok && e.user
            ? ((s = mpProfileSynced(rcKeep(e.user))),
              (K.textContent = "Saved ✓"),
              setTimeout(function () {
                "Saved ✓" === K.textContent && (K.textContent = "");
              }, 2e3))
            : (K.textContent = (e && e.error) || "Couldn't save signature.");
        })
        .catch(function () {
          K.textContent = "Couldn't reach the server.";
        });
    }
    function he() {
      ((K.textContent = ""), clearTimeout(oe), (oe = setTimeout(pe, 1200)));
    }
    !(function () {
      var e = s.signature || "";
      try {
        var t = new DOMParser().parseFromString(e, "text/html");
        (t.querySelectorAll("iframe").forEach(function (e) {
          var t = e.getAttribute("src") || "";
          (t && de(t) && te.length < 2 && te.push({ kind: "iframe", src: t }),
            ((e.closest && e.closest(".sig-embed")) || e).remove());
        }),
          t.querySelectorAll(".sig-social").forEach(function (e) {
            var t = e.querySelector("a"),
              n = ce((t && t.getAttribute("href")) || "");
            (n && te.length < 2 && te.push(n), e.remove());
          }),
          (e = t.body.innerHTML));
      } catch (e) {}
      if ((le(), window.MPSigEditor)) {
        if (window.__mpSigEd) {
          try {
            window.__mpSigEd.destroy();
          } catch (e) {}
          window.__mpSigEd = null;
        }
        window.MPSigEditor.mount(G, {
          html: e,
          member: W,
          placeholder: "Your signature…",
        }).then(function (t) {
          ((ae = t),
            (window.__mpSigEd = t),
            t
              ? t.on("update", he)
              : (((re = V("textarea", "chat-bio", G)).rows = 3),
                (re.value = e.replace(/<[^>]*>/g, "")),
                re.addEventListener("blur", pe)));
        });
      }
      if (W) {
        var n = V("button", "btn sig-embed-btn", Z, "＋ Add embed");
        n.type = "button";
        var a = V("div", "sig-embed-bar hidden", Z);
        ((a.innerHTML =
          '<input type="text" class="sig-embed-input" placeholder="Paste a music link or a social profile link…"><button type="button" class="btn accent sig-embed-add">Add</button>'),
          n.addEventListener("click", function () {
            a.classList.toggle("hidden");
          }),
          a.querySelector(".sig-embed-add").addEventListener("click", function () {
            var e = a.querySelector(".sig-embed-input"),
              t = ue(e.value);
            t
              ? te.length >= 2
                ? (K.textContent = "Two embeds max.")
                : (te.push(t), (e.value = ""), a.classList.add("hidden"), le(), pe())
              : (K.textContent =
                  "That embed isn't supported — try a Spotify, SoundCloud, Vimeo or social profile link.");
          }));
      }
    })();
    var ve = V("div", null, o);
    ((ve.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;margin:10px 0 8px;"),
      (V("span", null, ve, "Show signatures").style.cssText =
        "font-size:13px;opacity:.75;"));
    var fe = V("button", "btn", ve, "On");
    function ge() {
      var e = !0;
      try {
        e = "0" !== localStorage.getItem("mp_show_sigs");
      } catch (e) {}
      fe.textContent = e ? "On" : "Off";
    }
    ((fe.type = "button"),
      fe.addEventListener("click", function () {
        try {
          var e = "0" !== localStorage.getItem("mp_show_sigs");
          localStorage.setItem("mp_show_sigs", e ? "0" : "1");
        } catch (e) {}
        ge();
      }),
      ge());
    var be = document.createElement("div");
    ((be.className = "chat-err"), be.setAttribute("role", "alert"), o.appendChild(be));
    var ye = document.createElement("div");
    ((ye.className = "chat-pw-title"),
      (ye.textContent = "Change password"),
      o.appendChild(ye));
    var we = document.createElement("label");
    we.className = "chat-field";
    var Ce = document.createElement("span");
    ((Ce.textContent = "Current password"), we.appendChild(Ce));
    var xe = document.createElement("input");
    ((xe.type = "password"),
      (xe.autocomplete = "current-password"),
      we.appendChild(xe),
      o.appendChild(we));
    var Ee = document.createElement("label");
    Ee.className = "chat-field";
    var ke = document.createElement("span");
    ((ke.textContent = "New password"), Ee.appendChild(ke));
    var Le = document.createElement("input");
    ((Le.type = "password"),
      (Le.autocomplete = "new-password"),
      Ee.appendChild(Le),
      o.appendChild(Ee));
    var Se = document.createElement("div");
    ((Se.className = "pwd-strength"),
      (Se.hidden = !0),
      (Se.innerHTML =
        '<div class="pwd-bars"><span></span><span></span><span></span><span></span></div><div class="pwd-level"></div>'),
      o.appendChild(Se));
    var Me = Se.querySelectorAll(".pwd-bars span"),
      Te = Se.querySelector(".pwd-level"),
      Ae = ["Weak", "Fair", "Good", "Strong"],
      Ne = ["#FF7A7A", "#F59E0B", "#38BDF8", "#6EE7B7"];
    function Pe(e) {
      if (!e) return 0;
      var t = 0;
      return (
        e.length >= 8 && (t += 1),
        /[A-Z]/.test(e) && (t += 1),
        /[0-9]/.test(e) && (t += 1),
        /[^A-Za-z0-9]/.test(e) && (t += 1),
        t
      );
    }
    function Ie() {
      var e = Le.value;
      if (e) {
        Se.hidden = !1;
        for (var t = Pe(e), n = 0; n < Me.length; n++)
          Me[n].style.background = n < t ? Ne[t - 1] : "";
        ((Te.textContent = Ae[t - 1] || "Weak"),
          (Te.style.color = t > 0 ? Ne[t - 1] : ""),
          je());
      } else Se.hidden = !0;
    }
    Le.addEventListener("input", Ie);
    var qe = document.createElement("label");
    qe.className = "chat-field";
    var Oe = document.createElement("span");
    ((Oe.textContent = "Confirm new password"), qe.appendChild(Oe));
    var _e = document.createElement("input");
    ((_e.type = "password"),
      (_e.autocomplete = "new-password"),
      qe.appendChild(_e),
      o.appendChild(qe));
    var He = document.createElement("div");
    function je() {
      var e = Le.value,
        t = _e.value;
      t
        ? ((He.hidden = !1),
          e === t
            ? ((He.textContent = "✓ Passwords match"), (He.style.color = "#6EE7B7"))
            : ((He.textContent = "✗ Passwords do not match"),
              (He.style.color = "#FF7A7A")))
        : (He.hidden = !0);
    }
    ((He.className = "pwd-match"),
      (He.hidden = !0),
      o.appendChild(He),
      _e.addEventListener("input", je));
    var Re = document.createElement("button");
    ((Re.type = "button"),
      (Re.className = "btn chat-pw"),
      (Re.textContent = "Change password"),
      Re.addEventListener("click", function () {
        ((be.textContent = ""),
          !xe.value || Le.value.length < 4
            ? (be.textContent = "Enter your current password and a new one (min 4).")
            : Le.value === _e.value
              ? ((Re.disabled = !0),
                E("/api/password", {
                  method: "POST",
                  body: { current: xe.value, new: Le.value },
                })
                  .then(function (e) {
                    ((Re.disabled = !1),
                      e && e.ok
                        ? ((xe.value = ""),
                          (Le.value = ""),
                          (_e.value = ""),
                          (be.textContent = "Password changed."))
                        : (be.textContent = (e && e.error) || "Couldn't change it."));
                  })
                  .catch(function () {
                    ((Re.disabled = !1),
                      (be.textContent = "Couldn't reach the chat server."));
                  }))
              : (be.textContent = "New passwords do not match."));
      }),
      o.appendChild(Re));
    var Be = document.createElement("div");
    if (((Be.style.marginTop = "18px"), (Be.className = "chat-xbox"), s.xUsername)) {
      Be.innerHTML =
        '<span class="chat-xlogo">' +
        a +
        '</span><span class="chat-xhandle">@' +
        x(s.xUsername) +
        '</span><span class="chat-xstatus">Connected</span>';
      var Ue = document.createElement("button");
      ((Ue.type = "button"),
        (Ue.className = "btn chat-xunlink"),
        (Ue.textContent = "Unlink"),
        Ue.addEventListener("click", function () {
          k("Unlink your X account?", {
            okText: "Unlink",
            cancelText: "Cancel",
            onOk: function () {
              ((Ue.disabled = !0),
                E("/api/x/unlink", { method: "POST", body: {} })
                  .then(function (e) {
                    e && e.ok
                      ? ((s.xUsername = null), location.reload())
                      : ((Ue.disabled = !1), k("Couldn't unlink."));
                  })
                  .catch(function () {
                    Ue.disabled = !1;
                  }));
            },
          });
        }),
        Be.appendChild(Ue));
    } else {
      Be.innerHTML =
        '<span class="chat-xlogo">' +
        a +
        '</span><span class="chat-xstatus dim">Not connected</span>';
      var De = document.createElement("button");
      ((De.type = "button"),
        (De.className = "btn chat-xlink"),
        (De.textContent = "Connect"),
        De.addEventListener("click", function () {
          ((De.disabled = !0),
            (De.textContent = "Connecting..."),
            E("/api/x/link-start", { method: "POST", body: {} })
              .then(function (e) {
                if (e && e.ok && e.linkToken) {
                  try {
                    sessionStorage.setItem("x_link_token", e.linkToken);
                  } catch (e) {}
                  try {
                    localStorage.setItem("x_link_token", e.linkToken);
                  } catch (e) {}
                  try {
                    localStorage.setItem("x_link_pending", String(Date.now()));
                  } catch (e) {}
                  var a =
                    "https://x.com/i/oauth2/authorize?response_type=code&client_id=" +
                    encodeURIComponent(t) +
                    "&redirect_uri=" +
                    encodeURIComponent(n) +
                    "&scope=" +
                    encodeURIComponent("users.read tweet.read") +
                    "&state=" +
                    encodeURIComponent("link-" + e.linkToken) +
                    (e.codeChallenge
                      ? "&code_challenge=" +
                        encodeURIComponent(e.codeChallenge) +
                        "&code_challenge_method=S256"
                      : "");
                  location.href = a;
                } else
                  ((De.disabled = !1),
                    (De.textContent = "Connect"),
                    alert((e && e.error) || "Couldn't start X link."));
              })
              .catch(function () {
                ((De.disabled = !1), (De.textContent = "Connect"));
              }));
        }),
        Be.appendChild(De));
    }
    o.appendChild(Be);
    o.appendChild(rcSettingsRow());
    var vt = document.createElement("p");
    vt.className = "chat-pw-title";
    vt.textContent = "VIP";
    o.appendChild(vt);
    o.appendChild(vipSettingsRow());
    var ze = document.createElement("button");
    ze.type = "button";
    ze.className = "chat-logout";
    ze.textContent = "Sign out";
    ze.addEventListener("click", ft);
    o.appendChild(ze);
    if (inline) { l.hidden = true; MPProfiles.settings(o); inline.show(o); return; }
    $(i, o);
    r.addEventListener("click", function(event){if(event.target===r)gt();});
    document.body.appendChild(r);
    document.body.appendChild(i);
    e && Q(o);
  }
  function vt(anchor) {
    ht();
    if(s)mpPB(s.username,anchor||MPProfiles.topBar());
  }
  function ft() {
    // Sign out: with the token captured first, drop this device's push
    // subscription and end the session on the server (/api/logout), then
    // clear the token locally. The UI signs out right away; the two requests
    // finish in the background with the captured token.
    var tok = d;
    try {
      kt(tok)
        .catch(function () {})
        .then(function () {
          return tok ? E("/api/logout", { method: "POST", body: {}, token: tok }) : null;
        })
        .catch(function () {});
    } catch (e) {}
    try {
      localStorage.removeItem(r);
    } catch (e) {}
    if (((d = null), gt(), ht(), ae(), window.MPNav && MPNav.show))
      try {
        MPNav.show("journal");
      } catch (e) {}
    if (window.MPForum && MPForum.onLogout)
      try {
        MPForum.onLogout();
      } catch (e) {}
  }
  function gt() {
    if (mpPBel && mpPBel.dataset.phase === "edit") mpPBclose(true);
    var e = document.querySelector(".chat-sheet-backdrop");
    e && e.parentNode && e.parentNode.removeChild(e);
    var t = document.querySelector(".chat-sheet-anim");
    t && t.parentNode && t.parentNode.removeChild(t);
  }
  var bt = null;
  function yt() {
    if ((c = document.getElementById("chat"))) {
      try {
        d || (d = localStorage.getItem(r));
      } catch (e) {
        d = null;
      }
      var t = (function () {
        var e,
          t,
          n,
          a,
          r,
          o = xReturnHash || location.hash || "";
        xReturnHash = "";
        try {
          if (
            o.indexOf("x_token=") < 0 &&
            o.indexOf("x_error=") < 0 &&
            o.indexOf("x_link_confirm=") < 0 &&
            o.indexOf("x_code=") < 0 &&
            o.indexOf("x_linked=") < 0
          )
            return null;
          var xl = o.match(/x_linked=([^&]*)/);
          if (xl) {
            try {
              history.replaceState(null, "", location.pathname + location.search + "#chat");
            } catch (e) {}
            try {
              localStorage.removeItem("x_link_pending");
            } catch (e) {}
            var xh = "";
            try {
              xh = decodeURIComponent(xl[1] || "");
            } catch (e) {}
            return { xLinked: xh || "1" };
          }
          ((e = o.match(/x_token=([^&]+)/)),
            (t = o.match(/x_error=([^&]+)/)),
            (n = o.match(/x_state=([^&]+)/)),
            (a = o.match(/x_link_confirm=([^&]+)/)),
            (r = o.match(/x_code=([^&]+)/)));
          try {
            /^#x_/.test(location.hash || "") &&
              history.replaceState(null, "", location.pathname + location.search + "#chat");
          } catch (e) {}
        } catch (e) {
          return null;
        }
        if (a)
          try {
            return { linkConfirm: decodeURIComponent(a[1]) };
          } catch (e) {
            return { error: "Couldn't confirm the X link." };
          }
        if (r)
          try {
            return { xCode: decodeURIComponent(r[1]) };
          } catch (e) {
            return { error: "Sign-in failed." };
          }
        if (t)
          try {
            return { error: decodeURIComponent(t[1]) };
          } catch (e) {
            return { error: "Sign-in failed." };
          }
        if (!e) return null;
        var i = null;
        try {
          i = sessionStorage.getItem("x_state");
        } catch (e) {}
        if (!i)
          try {
            i = localStorage.getItem("x_state");
          } catch (e) {}
        var c = "";
        try {
          c = n ? decodeURIComponent(n[1]) : "";
        } catch (e) {}
        if ("linked" === c) {
          var s = null;
          try {
            s = sessionStorage.getItem("x_link_token");
          } catch (e) {}
          if (!s)
            try {
              s = localStorage.getItem("x_link_token");
            } catch (e) {}
          try {
            sessionStorage.removeItem("x_state");
          } catch (e) {}
          try {
            localStorage.removeItem("x_state");
          } catch (e) {}
          try {
            sessionStorage.removeItem("x_link_token");
          } catch (e) {}
          try {
            localStorage.removeItem("x_link_token");
          } catch (e) {}
          if (!s) return { error: "Sign-in didn't verify. Try again." };
          try {
            return { token: decodeURIComponent(e[1]), linked: !0 };
          } catch (e) {
            return { error: "Sign-in failed." };
          }
        }
        if (!i || c.split(".")[0] !== i) return { error: "Sign-in didn't verify. Try again." };
        try {
          sessionStorage.removeItem("x_state");
        } catch (e) {}
        try {
          localStorage.removeItem("x_state");
        } catch (e) {}
        try {
          return { token: decodeURIComponent(e[1]) };
        } catch (e) {
          return { error: "Sign-in failed." };
        }
      })();
      t && t.xLinked
        ? (k("X account linked" + ("1" !== t.xLinked ? ": @" + t.xLinked : ".")), wt(null))
        : t && t.error && d
        ? ((function () {
            try {
              localStorage.removeItem("x_link_pending");
            } catch (e) {}
          })(),
          k(t.error),
          wt(null))
        : t && t.linkConfirm
        ? E("/api/x/link-confirm", { method: "POST", body: { code: t.linkConfirm } })
            .then(function (e) {
              (e && e.ok
                ? k("X account linked.")
                : k((e && e.error) || "Couldn't link your X account."),
                wt(null));
            })
            .catch(function () {
              (k("Couldn't link your X account."), wt(null));
            })
        : t && t.xCode
          ? fetch(e + "/api/x/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: t.xCode }),
            })
              .then(function (e) {
                return e.json();
              })
              .then(function (e) {
                e && e.ok && e.token
                  ? (wt({ token: e.token }), e.recoveryCode && rcXNewCode(e.recoveryCode))
                  : (k("Sign-in expired. Please try again."), wt(null));
              })
              .catch(function () {
                (k("Sign-in failed."), wt(null));
              })
          : wt(t);
    }
  }
  /* ---------- Recovery codes (replace email recovery) ---------- */
  var rcOpen = null,
    rcPrompted = !1;
  function rcEsc(t) {
    return String(null == t ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rcClose() {
    if (rcOpen) {
      var b = rcOpen;
      rcOpen = null;
      b.classList.add("out");
      setTimeout(function () {
        b.parentNode && b.parentNode.removeChild(b);
      }, 220);
      document.documentElement.classList.remove("rc-lock");
    }
  }
  function rcLayer(inner, cls) {
    rcOpen && rcOpen.parentNode && rcOpen.parentNode.removeChild(rcOpen);
    var b = document.createElement("div");
    b.className = "rc-back" + (cls ? " " + cls : "");
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-modal", "true");
    b.innerHTML = '<div class="rc-card">' + inner + "</div>";
    document.body.appendChild(b);
    document.documentElement.classList.add("rc-lock");
    rcOpen = b;
    return b;
  }
  function rcCodeHTML(code) {
    return String(code)
      .split("-")
      .map(function (g) {
        return '<span class="rc-g">' + rcEsc(g) + "</span>";
      })
      .join('<span class="rc-dash" aria-hidden="true">-</span>');
  }
  function rcFont() {
    try {
      return document.fonts && document.fonts.load
        ? Promise.race([
            document.fonts.load('64px "Space Age"'),
            new Promise(function (r) {
              setTimeout(r, 1200);
            }),
          ])
        : Promise.resolve();
    } catch (e) {
      return Promise.resolve();
    }
  }
  // Simple navy card (PNG): eyes, border, code.
  function rcRender(code, user) {
    return rcFont().then(function () {
      return new Promise(function (res) {
        var W = 1080,
          H = 1350,
          cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        var x = cv.getContext("2d"),
          mono = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
        x.fillStyle = "#0a1230";
        x.fillRect(0, 0, W, H);
        x.strokeStyle = "rgba(169,215,245,0.22)";
        x.lineWidth = 2;
        if (x.roundRect) {
          x.beginPath();
          x.roundRect(60, 60, W - 120, H - 120, 56);
          x.stroke();
        } else x.strokeRect(60, 60, W - 120, H - 120);
        function done() {
          x.textBaseline = "alphabetic";
          x.textAlign = "left";
          x.fillStyle = "#e6f3fd";
          x.font = "600 84px " + mono;
          var parts = String(code).split("-"),
            gap = 26;
          // draw each character with extra space so the code is easy to read
          [
            [parts.slice(0, 2).join("-"), 760],
            [parts.slice(2).join("-"), 890],
          ].forEach(function (ln) {
            var ch = ln[0].split(""),
              tw = 0;
            ch.forEach(function (c) {
              tw += x.measureText(c).width;
            });
            tw += gap * (ch.length - 1);
            var cx = (W - tw) / 2;
            ch.forEach(function (c) {
              x.fillText(c, cx, ln[1]);
              cx += x.measureText(c).width + gap;
            });
          });
          cv.toBlob(function (b) {
            res(b);
          }, "image/png");
        }
        var im = new Image();
        im.onload = function () {
          var w = 420,
            h = (im.height / im.width) * w;
          x.globalAlpha = 0.95;
          x.drawImage(im, (W - w) / 2, 420, w, h);
          x.globalAlpha = 1;
          done();
        };
        im.onerror = done;
        im.src = "/img/splash-eyes.png";
      });
    });
  }
  function rcShowCode(code, user, o) {
    o = o || {};
    var b = rcLayer(
        (o.eyebrow ? '<div class="rc-eyebrow">' + rcEsc(o.eyebrow) + "</div>" : "") +
          '<h2 class="rc-title">' +
          rcEsc(o.title || "Your recovery code") +
          '</h2><p class="rc-sub">' +
          rcEsc(
            o.sub ||
              "This code is the only way you can reset a lost password. Keep it safe.",
          ) +
          '</p><div class="rc-code" aria-label="Recovery code ' +
          rcEsc(code) +
          '">' +
          rcCodeHTML(code) +
          '</div><div class="rc-actions"><button type="button" class="btn rc-copy">Copy</button><button type="button" class="btn rc-save">Save as image</button></div><label class="rc-check mp-check"><input type="checkbox" class="mp-check-cb"><span class="mp-check-box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 14L8.5 17.5L19 6.5"/></svg></span><span>I saved my recovery code</span></label><button type="button" class="btn accent rc-continue" disabled>Continue</button>',
        "rc-showcode",
      ),
      cp = b.querySelector(".rc-copy"),
      sv = b.querySelector(".rc-save"),
      ck = b.querySelector(".rc-check input"),
      go = b.querySelector(".rc-continue"),
      blob = null;
    rcRender(code, user).then(function (bl) {
      blob = bl;
    });
    cp.addEventListener("click", function () {
      var ok = function () {
        cp.textContent = "Copied";
        setTimeout(function () {
          cp.textContent = "Copy";
        }, 1600);
      };
      try {
        navigator.clipboard.writeText(code).then(ok, function () {
          cp.textContent = code;
        });
      } catch (e) {
        cp.textContent = code;
      }
    });
    sv.addEventListener("click", function () {
      function give(bl) {
        var name = "misere-perdue-recovery-" + user + ".png";
        try {
          var f = new File([bl], name, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [f] })) {
            navigator.share({ files: [f], title: "Misère Perdue recovery code" }).catch(function () {});
            return;
          }
        } catch (e) {}
        var u = URL.createObjectURL(bl),
          a = document.createElement("a");
        a.href = u;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(u);
        }, 4e3);
      }
      blob ? give(blob) : rcRender(code, user).then(give);
    });
    ck.addEventListener("change", function () {
      go.disabled = !ck.checked;
    });
    go.addEventListener("click", function () {
      if (!ck.checked) return;
      rcClose();
      o.onDone && o.onDone();
    });
    return b;
  }
  function rcSignedIn(res, code, opts) {
    d = res.token;
    try {
      localStorage.setItem(r, d);
    } catch (e) {}
    s = res.user;
    ke();
    code && rcShowCode(code, s.username, opts);
  }
  function rcOpenRecover(prefill) {
    var hasX = !!(c && c.querySelector(".chat-xbtn")),
      b = rcLayer(
        '<button type="button" class="rc-x-close" aria-label="Close"><svg class="mp-x-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg></button><h2 class="rc-title">Forgot your password?</h2><p class="rc-sub">Enter your username and the recovery code you saved when you signed up.</p><label class="chat-field"><span>Username</span><input type="text" name="rc-user" maxlength="16" autocomplete="username" autocapitalize="none" spellcheck="false"></label><label class="chat-field"><span>Recovery code</span><input type="text" name="rc-code" class="rc-codein" maxlength="29" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"></label><label class="chat-field"><span>New password</span><input type="password" name="rc-new" maxlength="72" autocomplete="new-password"></label><label class="chat-field"><span>Confirm new password</span><input type="password" name="rc-new2" maxlength="72" autocomplete="new-password"></label><div class="chat-err rc-err" role="alert"></div><button type="button" class="btn accent rc-go">Reset password</button>' +
          (hasX
            ? '<div class="rc-or"><span>or</span></div><button type="button" class="btn chat-xbtn rc-xrec"><span class="chat-xlogo">' +
              a +
              "</span>Recover with X</button>"
            : "") +
          '<p class="rc-fine">No code and no linked X account? There is no email reset. Message @lonerlife on X.</p>',
        "rc-recover",
      ),
      U = b.querySelector('[name="rc-user"]'),
      Cd = b.querySelector('[name="rc-code"]'),
      N1 = b.querySelector('[name="rc-new"]'),
      N2 = b.querySelector('[name="rc-new2"]'),
      Er = b.querySelector(".rc-err"),
      Go = b.querySelector(".rc-go");
    prefill && (U.value = prefill);
    b.querySelector(".rc-x-close").addEventListener("click", rcClose);
    Cd.addEventListener("input", function () {
      var raw = Cd.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
      raw.length === 20 && 0 === raw.indexOf("MPRD") && (raw = raw.slice(4));
      raw = raw.slice(0, 16);
      var f = raw.match(/.{1,4}/g);
      Cd.value = f ? f.join("-") : "";
    });
    Go.addEventListener("click", function () {
      Er.textContent = "";
      var un = U.value.trim(),
        cd = Cd.value.replace(/[^0-9A-Za-z]/g, "");
      if (!un) return void (Er.textContent = "Enter your username.");
      if (cd.length !== 16) return void (Er.textContent = "Recovery codes are 16 characters.");
      if (N1.value.length < 8) return void (Er.textContent = "New password must be at least 8 characters.");
      if (N1.value !== N2.value) return void (Er.textContent = "New passwords do not match.");
      Go.disabled = !0;
      Go.textContent = "Checking…";
      E("/api/recovery/reset", { method: "POST", body: { username: un, code: cd, password: N1.value } })
        .then(function (j) {
          Go.disabled = !1;
          Go.textContent = "Reset password";
          j && j.ok && j.token
            ? rcSignedIn(j, j.recoveryCode, {
                eyebrow: "",
                title: "You're back in",
                sub: "Your password is changed and every other device was signed out. Your old code is used up. Here's your new one, save it now.",
              })
            : (Er.textContent = (j && j.error) || "Couldn't reset your password.");
        })
        .catch(function () {
          Go.disabled = !1;
          Go.textContent = "Reset password";
          Er.textContent = "Couldn't reach the chat server. Try again.";
        });
    });
    var Xr = b.querySelector(".rc-xrec");
    Xr &&
      Xr.addEventListener("click", function () {
        try {
          localStorage.setItem("x_recover", String(Date.now()));
        } catch (e) {}
        rcClose();
        var xb = c && c.querySelector(".chat-card .chat-xbtn");
        xb && xb.click();
      });
    setTimeout(function () {
      try {
        (prefill ? Cd : U).focus({ preventScroll: !0 });
      } catch (e) {}
    }, 260);
  }
  // After an X sign-in started from "Recover with X": set a new password.
  function rcAfterX() {
    var t = 0;
    try {
      t = +localStorage.getItem("x_recover") || 0;
      localStorage.removeItem("x_recover");
    } catch (e) {}
    if (!t || Date.now() - t > 9e5 || !d || !s) return;
    var b = rcLayer(
        '<h2 class="rc-title">Set a new password</h2><p class="rc-sub">Signed in with X as @' +
          rcEsc(s.username) +
          '. Choose a new password. Other devices will be signed out.</p><label class="chat-field"><span>New password</span><input type="password" name="rc-new" maxlength="72" autocomplete="new-password"></label><label class="chat-field"><span>Confirm new password</span><input type="password" name="rc-new2" maxlength="72" autocomplete="new-password"></label><div class="chat-err rc-err" role="alert"></div><button type="button" class="btn accent rc-go">Set password</button><button type="button" class="btn rc-later">Not now</button>',
        "rc-recover",
      ),
      N1 = b.querySelector('[name="rc-new"]'),
      N2 = b.querySelector('[name="rc-new2"]'),
      Er = b.querySelector(".rc-err"),
      Go = b.querySelector(".rc-go");
    b.querySelector(".rc-later").addEventListener("click", rcClose);
    Go.addEventListener("click", function () {
      Er.textContent = "";
      if (N1.value.length < 8) return void (Er.textContent = "New password must be at least 8 characters.");
      if (N1.value !== N2.value) return void (Er.textContent = "New passwords do not match.");
      Go.disabled = !0;
      E("/api/recovery/x-reset", { method: "POST", body: { password: N1.value } })
        .then(function (j) {
          Go.disabled = !1;
          j && j.ok && j.token
            ? rcSignedIn(j, j.recoveryCode, {
                eyebrow: "",
                title: "You're back in",
                sub: "New password set and other devices signed out. Here's your new recovery code, save it now.",
              })
            : (Er.textContent = (j && j.error) || "Couldn't set your password.");
        })
        .catch(function () {
          Go.disabled = !1;
          Er.textContent = "Couldn't reach the chat server. Try again.";
        });
    });
  }
  // Create / replace the code while signed in (settings row + prompt).
  function rcCreate(mode) {
    if (!s) return;
    var needPw = s.hasPassword !== false,
      replace = "regen" === mode,
      b = rcLayer(
        (replace ? '<button type="button" class="rc-x-close" aria-label="Close"><svg class="mp-x-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg></button>' : "") +
          
          '<h2 class="rc-title">' +
          (replace ? "Make a new recovery code" : "Create your recovery code") +
          '</h2><p class="rc-sub">' +
          (replace
            ? "Your current code stops working as soon as the new one is made."
            : "Misery doesn’t verify with your email. The only way to reset a lost password is with your secret code.") +
          "</p>" +
          (needPw
            ? '<label class="chat-field"><span>Current password</span><input type="password" name="rc-pw" maxlength="72" autocomplete="current-password"></label>'
            : "") +
          '<div class="chat-err rc-err" role="alert"></div><button type="button" class="btn accent rc-go">' +
          (replace ? "Make new code" : "Create code") +
          "</button>" +
          (replace ? "" : '<button type="button" class="btn rc-later">Later</button>'),
        replace ? "rc-regen" : "rc-prompt",
      ),
      Pw = b.querySelector('[name="rc-pw"]'),
      Er = b.querySelector(".rc-err"),
      Go = b.querySelector(".rc-go"),
      X = b.querySelector(".rc-x-close"),
      La = b.querySelector(".rc-later");
    X && X.addEventListener("click", rcClose);
    La &&
      La.addEventListener("click", function () {
        try {
          sessionStorage.setItem("rc_later", "1");
        } catch (e) {}
        rcClose();
      });
    Go.addEventListener("click", function () {
      Er.textContent = "";
      if (Pw && !Pw.value) return void (Er.textContent = "Enter your current password.");
      Go.disabled = !0;
      E("/api/recovery/regenerate", { method: "POST", body: Pw ? { password: Pw.value } : {} })
        .then(function (j) {
          Go.disabled = !1;
          if (j && j.ok && j.recoveryCode) {
            j.user && (s.hasRecovery = !0, s.recoveryCreatedAt = j.user.recoveryCreatedAt);
            rcShowCode(j.recoveryCode, s.username, {
              title: replace ? "Your new recovery code" : "Your recovery code",
              sub: replace
                ? "Your old code no longer works. This one is shown only once, so save it now."
                : undefined,
              onDone: function () {
                var row = document.querySelector(".rc-row .rc-row-status");
                row && (row.textContent = "Saved · " + new Date().toLocaleDateString());
              },
            });
          } else Er.textContent = (j && j.error) || "Couldn't make a code.";
        })
        .catch(function () {
          Go.disabled = !1;
          Er.textContent = "Couldn't reach the chat server. Try again.";
        });
    });
    Pw &&
      setTimeout(function () {
        try {
          Pw.focus({ preventScroll: !0 });
        } catch (e) {}
      }, 260);
  }
  function rcMaybePrompt() {
    if (rcPrompted || !s || !d || s.hasRecovery !== !1) return;
    try {
      if (sessionStorage.getItem("rc_later")) return;
    } catch (e) {}
    rcPrompted = !0;
    setTimeout(function () {
      s && !s.hasRecovery && !rcOpen && rcCreate("create");
    }, 1400);
  }
  // Profile/socket replies carry the public user only, so keep the
  // signed-in-only fields (recovery status, has-password) we already know.
  function rcKeep(n) {
    if (s && n) ["hasRecovery", "recoveryCreatedAt", "hasPassword"].forEach(function (k) {
      !(k in n) && k in s && (n[k] = s[k]);
    });
    return n;
  }
  /* VIP in profile settings (#133): membership length, renewal, and Cancel,
     which opens the Seal subscription portal (cancellation is confirmed there). */
  function vipSince(ms) {
    var d = Math.max(0, Math.floor((Date.now() - ms) / 864e5));
    if (d < 1) return "Joined today";
    if (d < 31) return "VIP for " + d + (1 === d ? " day" : " days");
    var m = Math.floor(d / 30.44);
    if (m < 12) return "VIP for " + m + (1 === m ? " month" : " months");
    var y = Math.floor(m / 12), r = m % 12;
    return "VIP for " + y + (1 === y ? " year" : " years") + (r ? " " + r + (1 === r ? " month" : " months") : "");
  }
  function vipSettingsRow() {
    var row = document.createElement("div");
    row.className = "chat-xbox vip-row";
    var fmt = function (t) { return new Date(t).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" }); };
    function paint(v) {
      var sub = "subscription" === v.source, since = v.since || v.memberSince;
      row.innerHTML =
        '<div class="vip-row-top"><span class="rc-row-icon" aria-hidden="true">' + mpStar() + '</span><span class="rc-row-text"><span class="rc-row-title"></span><span class="rc-row-status"></span></span></div>' +
        (v.vip ? '<div class="vip-row-facts"></div>' : "") +
        '<div class="vip-row-btns"></div>';
      row.querySelector(".rc-row-title").textContent = v.vip ? (sub ? (v.cancelled ? "VIP \u00b7 Cancelled" : "VIP \u00b7 Monthly") : "VIP") : "Not subscribed";
      row.querySelector(".rc-row-status").textContent = v.vip
        ? since ? vipSince(since) : "Active"
        : "CA$10 today, then CA$3/month";
      var facts = row.querySelector(".vip-row-facts");
      if (facts) {
        var f = [];
        since && f.push(["Member since", fmt(since)]);
        sub && v.paidThrough && f.push([v.cancelled ? "VIP ends" : "Renews around", fmt(v.paidThrough)]);
        !sub && f.push(["Plan", "Granted VIP \u00b7 no billing"]);
        facts.innerHTML = f.map(function (x) { return "<div><span></span><b></b></div>"; }).join("");
        facts.querySelectorAll("div").forEach(function (el, k) {
          el.firstChild.textContent = f[k][0];
          el.lastChild.textContent = f[k][1];
        });
      }
      var btns = row.querySelector(".vip-row-btns"), url = v.manageUrl || "https://shop.misereperdue.com/a/subscriptions/login";
      if (v.vip && sub && v.cancelled) {
        btns.innerHTML = '<p class="vip-row-note">Cancelled. You won\u2019t be charged again, and VIP stays on until ' + (v.paidThrough ? fmt(v.paidThrough) : "the end of the month you paid for") + '.</p>';
      } else if (v.vip && sub) {
        var until = v.paidThrough ? fmt(v.paidThrough) : "the end of the month you paid for";
        btns.innerHTML = '<a class="btn chat-xlink vip-row-manage" target="_blank" rel="noopener">Manage</a><button type="button" class="btn chat-xlink vip-row-cancel">Cancel VIP</button><p class="vip-row-note" hidden>Cancel your VIP? You won\u2019t be charged again and VIP stays on until ' + until + '.</p>';
        btns.querySelector(".vip-row-manage").href = url;
        var cb = btns.querySelector(".vip-row-cancel"), note = btns.querySelector(".vip-row-note"), portal = !1;
        cb.addEventListener("click", function () {
          if (portal) return void window.open(url, "_blank", "noopener");
          if (note.hidden) {
            note.hidden = !1;
            cb.textContent = "Yes, cancel VIP";
            return;
          }
          cb.disabled = !0;
          cb.innerHTML = '<span class="btn-spin"></span>';
          fetch("https://api.misereperdue.com/api/vip/cancel", { method: "POST", headers: { Authorization: "Bearer " + tok } })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
            .then(function (x) {
              if (x.r.ok && x.j.ok) return void paint(x.j);
              /* Not set up in the Worker yet (503) or not found in Seal: finish in the Seal portal. */
              if (503 === x.r.status || 404 === x.r.status) {
                note.textContent = "Finish in the subscription portal: enter your checkout email to get a sign-in link, then choose Cancel.";
                cb.disabled = !1;
                cb.textContent = "Open subscription portal";
                portal = !0;
                return;
              }
              throw new Error(x.j && x.j.error || "cancel");
            })
            .catch(function (e) {
              cb.disabled = !1;
              cb.textContent = "Yes, cancel VIP";
              note.textContent = (e && e.message && "cancel" !== e.message ? e.message.charAt(0).toUpperCase() + e.message.slice(1) : "Couldn\u2019t cancel") + ". Try again.";
            });
        });
      } else if (!v.vip) {
        btns.innerHTML = '<button type="button" class="btn chat-xlink">Become VIP</button>';
        btns.firstChild.addEventListener("click", function () {
          location.hash = "#product/gid://shopify/Product/15416182014054";
        });
      }
    }
    var tok = null;
    try { tok = localStorage.getItem("chat_token"); } catch (e) {}
    paint({ vip: !!(s && s.member), source: null });
    tok && fetch("https://api.misereperdue.com/api/vip", { headers: { Authorization: "Bearer " + tok } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) { v && row.isConnected && paint(v); })
      .catch(function () {});
    return row;
  }
  function rcSettingsRow() {
    var row = document.createElement("div");
    row.className = "chat-xbox rc-row";
    var has = s && s.hasRecovery;
    row.innerHTML =
      '<span class="rc-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" data-hi="fade"><path d="M14 21L18 3"/><path d="M6 21L10 3"/><path d="M5 8H21"/><path d="M3 16H19"/></svg></span><span class="rc-row-text"><span class="rc-row-title">Recovery code</span><span class="rc-row-status">' +
      (has
        ? "Saved · " + (s.recoveryCreatedAt ? new Date(s.recoveryCreatedAt).toLocaleDateString() : "")
        : "Not set up") +
      '</span></span><button type="button" class="btn chat-xlink rc-row-btn">' +
      (has ? "New code" : "Create") +
      "</button>";
    row.querySelector(".rc-row-btn").addEventListener("click", function () {
      rcCreate(s && s.hasRecovery ? "regen" : "create-row");
    });
    return row;
  }
  /* ---------- Powers & Stars (per dc) ----------
     Stars are the existing points balance. Powers are bought with Stars in the
     Powers sheet and switched on/off there. The Stars sheet shows the balance,
     recent purchases and gifts, and a Get stars button to the shop's Stars packs.
     API: GET /api/powers, POST /api/powers/buy|set, GET /api/stars (misery-worker). */
  var POW_ICON = '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/>',
    STAR_ICON = '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
    POW_X = "<button type='button' class='rc-x-close' aria-label='Close'><svg class='mp-x-ico' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M18.9991 19L5 5.00098'/><path d='M19 5L5.00092 18.999'/></svg></button>",
    /* Tight viewBox around the star so its drawn height equals the CSS box (sized to the digits' cap height). */
    STARS_SVG = "<svg data-ph='1' class='stars-ico mp-star' viewBox='2.3 2.3 19.4 18.5' aria-hidden='true'><path fill='currentColor' stroke='currentColor' stroke-width='2.4' stroke-linejoin='round' d='M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z'/></svg>",
    powMap = {},
    powCat = null;
  function powKeep(j) {
    j && (j.catalog || []).forEach(function (p) { powMap[p.id] = p; });
    return j;
  }
  function powCatalog() {
    powCat ||
      ((powCat = E("/api/powers").then(function (j) {
        if (!j || !j.ok) throw j;
        return powKeep(j);
      })),
      powCat.catch(function () { powCat = null; }));
    return powCat;
  }
  function powIco(p) {
    var ico=(window.MPPowerIcon && p && MPPowerIcon(p.id)) || x((p && p.icon) || "✦");
    return '<span class="pow-ico" data-pw="' + x((p && p.id) || "") + '" aria-hidden="true">' + ico + "</span>";
  }
  function powName(id) {
    return (powMap[id] && powMap[id].name) || id;
  }
  /* Pill under the stars/badges row: 3 power bubbles (switched-on first) and a round +N bubble for the
     rest; tap to list them all (per dc). */
  function powRow(user) {
    var ids = (user && user.powers) || [];
    if (!ids.length) return null;
    var on = user.powersOn || [],
      w = document.createElement("div"),
      b = document.createElement("button"),
      list = document.createElement("div"),
      MAX = 3;
    w.className = "mp-pb-pow";
    b.type = "button";
    b.className = "mp-pb-pow-pill";
    b.setAttribute("aria-expanded", "false");
    list.className = "mp-pb-pow-list";
    list.hidden = !0;
    w.appendChild(b);
    w.appendChild(list);
    function paint() {
      b.innerHTML =
        '<span class="mp-pb-pow-k"><svg ' + MP_IC + ">" + POW_ICON + '</svg>Powers</span><span class="mp-pb-pow-icons">' +
        ids.slice().sort(function (a, c) { return (on.indexOf(c) >= 0) - (on.indexOf(a) >= 0); }).slice(0, MAX).map(function (id) { return powIco(powMap[id]); }).join("") +
        (ids.length > MAX ? '<span class="mp-pb-pow-more" aria-label="' + (ids.length - MAX) + ' more">+' + (ids.length - MAX) + "</span>" : "") +
        '<svg class="mp-pb-pow-chev" ' + MP_IC + '><path d="M7 10c2 0 4 4 5 4s3-4 5-4"/></svg></span>';
      b.setAttribute("aria-label", ids.length + (ids.length === 1 ? " power" : " powers") + ", show all");
      list.innerHTML = ids
        .map(function (id) {
          return '<div class="mp-pb-pow-item' + (on.indexOf(id) >= 0 ? " on" : "") + '">' + powIco(powMap[id]) + "<span>" + x(powName(id)) + "</span></div>";
        })
        .join("");
    }
    paint();
    powCatalog().then(function () { w.isConnected && paint(); }, function () {});
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = list.hidden;
      list.hidden = !open;
      w.classList.toggle("is-open", open);
      b.setAttribute("aria-expanded", String(open));
    });
    return w;
  }
  /* Powers/Stars pages: the open profile morphs into them (Back returns to the
     profile). Opened without a profile (MPOpenPowers/MPOpenStars), they fall
     back to a sheet. */
  function powSheet(title, cls, inner) {
    var w = document.createElement("div");
    w.className = "pow-page " + cls;
    w.innerHTML = inner;
    if (mpPBel && mpPBel.isConnected && mpPBel._page) {
      mpPBel._page(title, w);
      return w;
    }
    var b = rcLayer(POW_X + "<h2 class='rc-title'>" + title + "</h2>", cls);
    b.querySelector(".rc-card").classList.add("pow-sheet");
    b.querySelector(".rc-card").appendChild(w);
    b.querySelector(".rc-x-close").addEventListener("click", rcClose);
    b.addEventListener("click", function (e) { e.target === b && rcClose(); });
    return w;
  }
  function powStars(n) {
    s && ((s.points = n), te(n));
  }
  function starsGo() {
    rcClose();
    var packs = [], P = (window.MP && MP.PRODUCTS) || {};
    Object.keys(P).forEach(function (k) { var p = P[k], nm = p && String(p.name || "").trim(), m = p && /^(\d+)\s+stars?$/i.exec(nm); p && ("stars" === p.handle || /^stars$/i.test(nm)) ? packs.push([0, p.id]) : m && packs.push([+m[1], p.id]); });
    packs.sort(function (a, b) { return a[0] - b[0]; });
    if (packs.length) {
      mpPBel && mpPBel.isConnected && mpPBclose(!0);
      return void (location.hash = "#product/" + packs[0][1]);
    }
    mpPBel && mpPBel.isConnected && mpPBel._page && mpPBclose(!0);
    location.hash = "#product/gid://shopify/Product/15505333813350"; // Stars; the page loads products itself
  }
  function powOpen() {
    if (!s || !d) return;
    var b = powSheet("Powers", "pow-back", "<div class='stars-bal pow-sum' role='img'></div><div class='pow-body'><p class='pow-note'>Loading…</p></div><button type='button' class='pow-get'>Buy stars</button>"),
      body = b.querySelector(".pow-body"),
      st = null,
      busy = !1;
    b.querySelector(".pow-get").addEventListener("click", starsGo);
    /* Square tiles in a 2-column grid. Owned powers select like badges (tap to
       highlight, tap again to clear; several can be active); others show a price
       and buy on a second tap. */
    /* Hugeicons Pipette (stroke), MIT. Ink flips by swatch luminance so it stays legible. */
    var POW_PICKER = '<svg class="pow-sw-pick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15.586 12.463l-5.68 5.68l-.09.09a4.06 4.06 0 0 1-1.968 1.052l-.125.026l-.207.041a3.57 3.57 0 0 0-1.826.978l-.25.25a1.435 1.435 0 0 1-2.028-2.03l.249-.25a3.57 3.57 0 0 0 .977-1.826l.042-.207l.025-.124a4.06 4.06 0 0 1 1.143-2.058l5.68-5.68"/><path d="m11.168 7.8l5.021 5.021a1.522 1.522 0 1 0 2.152-2.152L13.32 5.648A1.522 1.522 0 1 0 11.168 7.8Zm2.898-1.93l2.029-2.03a2.87 2.87 0 1 1 4.058 4.058l-2.03 2.03"/></svg>';
    function powSwInk(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return "#fff";
      function lin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
      var r = lin(parseInt(hex.slice(1, 3), 16)), g = lin(parseInt(hex.slice(3, 5), 16)), b = lin(parseInt(hex.slice(5, 7), 16));
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.55 ? "#111" : "#fff";
    }
    /* Settings (per dc): a selected power that has settings opens into a full-width box with its
       options (colour swatches, choices) selected like badges. */
    function setPanel(p) {
      var cur = (st.settings && st.settings[p.id]) || {};
      return '<div class="pow-set">' + p.settings.map(function (f) {
        var val = cur[f.key] != null ? cur[f.key] : f.def;
        return '<div class="pow-set-row"><span class="pow-set-k">' + x(f.label) + '</span><div class="pow-set-opts" role="group" aria-label="' + x(p.name + " " + f.label) + '">' +
          f.options.map(function (o) {
            var on = o.v === val;
            return f.type === "color"
              ? '<button type="button" class="pow-sw' + (on ? " is-on" : "") + '" data-k="' + x(f.key) + '" data-v="' + x(o.v) + '" style="--sw:' + x(o.color) + '" aria-pressed="' + on + '" aria-label="' + x(o.label) + '"></button>'
              : '<button type="button" class="pow-ch' + (on ? " is-on" : "") + '" data-k="' + x(f.key) + '" data-v="' + x(o.v) + '" aria-pressed="' + on + '">' + x(o.label) + "</button>";
          }).join("") +
          (f.type === "color" && f.custom ? (function () {
            var hex = /^#[0-9a-f]{6}$/i.test(val || "");
            return '<button type="button" class="pow-sw pow-sw-custom' + (hex ? " is-on" : "") + '" data-k="' + x(f.key) + '" data-v="' + x(hex ? val : "") + '" style="--picker-ink:' + powSwInk(hex ? val : "") + (hex ? ';--sw:' + x(val) : "") + '" aria-label="Custom colour" aria-expanded="false"' + (hex ? ' aria-pressed="true"' : "") + '>' + POW_PICKER + "</button>";
          })() : "") + "</div></div>";
      }).join("") + "</div>";
    }
    function tile(p, mine) {
      var on = mine && st.on.indexOf(p.id) >= 0,
        locked = !mine && p.requires && st.owned.indexOf(p.requires) < 0,
        poor = !mine && (locked || st.stars < p.price);
      var sets = (p.settings || []).filter(function (f) { return !(PW_NOCOLOR[p.id] && f.type === "color"); });
      if (on && sets.length)
        return (
          '<div class="pow-tile is-owned is-selected has-set' + (justOpened === p.id ? " is-new" : "") + '" data-id="' + x(p.id) + '">' +
          '<button type="button" class="pow-tile-main" aria-pressed="true" aria-label="' + x(p.name) + ', on">' + powIco(p) +
          '<span class="pow-tile-copy"><b class="pow-tn">' + x(p.name) + '</b><span class="pow-td">' + x(p.desc || "") + "</span></span></button>" +
          setPanel({ id: p.id, name: p.name, settings: sets }) + "</div>"
        );
      return (
        '<button type="button" class="pow-tile' + (mine ? " is-owned" : " is-shop") + (locked ? " is-locked" : !mine && p.requires && st.on.indexOf(p.requires) < 0 ? " is-dim" : "") + (on ? " is-selected" : "") + '" data-id="' + x(p.id) + '"' +
        (mine ? ' aria-pressed="' + on + '" aria-label="' + x(p.name) + (on ? ", on" : ", off") + '"' : ' aria-label="' + (locked ? x(p.name) + ", needs the Charms power" : "Buy " + x(p.name) + " for " + x(p.price) + " stars") + '"' + (poor ? " disabled" : "")) +
        ">" + powIco(p) + '<b class="pow-tn">' + x(p.name) + "</b>" +
        (mine ? '<span class="pow-td">' + x(p.desc || "") + "</span>" : '<span class="pow-price">' + (locked ? '<svg class="pow-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg> Charms' : mpStar() + " " + x(p.price)) + "</span>") +
        "</button>"
      );
    }
    /* Layout v2 (per dc): owned powers and charms are fixed-height rows with a switch (nothing reflows);
       a power's settings live on its own page that slides in; the shop is a sideways row of cards. */
    var detail = null, slideDir = 0;
    /* Which powers stack (per dc), measured by rendering every pair with the live CSS:
       name effects compete (one animation, one fill colour), bubble and avatar effects mostly stack.
       clash: id -> what happens when both are on. */
    var COMBO = {
      glow:   { clash: { glitch: "Glitch replaces the glow", melt: "Melt replaces the glow" } },
      ink:    { clash: { rgb: "RGB colours your name instead" } },
      glitch: { clash: { glow: "Glitch replaces the glow", melt: "Melt runs instead", rgb: "RGB runs instead" } },
      melt:   { clash: { glow: "Melt replaces the glow", glitch: "Melt runs instead" }, special: { rgb: "Drips take RGB's colours" } },
      rgb:    { clash: { ink: "RGB colours your name instead", glitch: "RGB runs instead" }, special: { melt: "Drips take RGB's colours" } },
      halo:   { clash: { sphere: "In chat the orb covers the ring; your profile ring stays" } },
      sphere: { clash: { halo: "In chat the orb covers the ring; your profile ring stays" } },
      bubble: { special: { aura: "Aura can match your bubble colour" } },
      aura:   { special: { bubble: "Can match your bubble colour" } },
      hat:    { clash: { couture: "Chanel Beanie is worn instead", louis: "Louis Beanie is worn instead" }, special: { sphere: "Sits on top of the orb" } },
      couture:{ clash: { hat: "Worn instead of your Hat", louis: "Worn instead of the Louis Beanie" }, special: { sphere: "Sits on top of the orb" } },
      louis:  { clash: { hat: "Worn instead of your Hat", couture: "Chanel Beanie is worn instead" }, special: { sphere: "Sits on top of the orb" } }
    };
    function combos(p) {
      var cat = (st.catalog || []).filter(function (q) { return q.id !== p.id; });
      var c = COMBO[p.id] || {}, clash = c.clash || {}, special = c.special || {};
      /* charms combine with every power (and need Charms on); powers combine with every charm */
      var good = cat.filter(function (q) { return q.kind !== "charm" && !clash[q.id]; }),
        bad = cat.filter(function (q) { return clash[q.id]; });
      var chip = function (q, note) {
        var on = st.on.indexOf(q.id) >= 0, own = st.owned.indexOf(q.id) >= 0;
        return '<span class="pw-chip' + (on ? " is-on" : own ? "" : " is-locked") + '"><i data-pw="' + x(q.id) + '">' + ((window.MPPowerIcon && MPPowerIcon(q.id)) || x(q.icon || "\u2726")) + "</i><b>" + x(q.name) + "</b>" + (note ? "<small>" + x(note) + "</small>" : "") + "</span>";
      };
      return '<div class="pw-combo"><div class="pw-combo-h">Combines with</div><div class="pw-chips">' +
        good.map(function (q) { return chip(q, special[q.id] || ""); }).join("") +
        '<span class="pw-chip is-note"><i>\ud83d\udc8e</i><b>All charms</b></span></div>' +
        (bad.length ? '<div class="pw-combo-h">Doesn\u2019t stack with</div><div class="pw-chips is-clash">' + bad.map(function (q) { return chip(q, clash[q.id]); }).join("") + "</div>" : "") +
        "</div>";
    }
    b._back = function () {
      if (!detail) return !1;
      detail = null;
      slideDir = -1;
      render();
      return !0;
    };
    function powSets(p) { return (p.settings || []).filter(function (f) { return !(PW_NOCOLOR[p.id] && f.type === "color"); }); }
    function summary(p, sets) {
      var cur = (st.settings && st.settings[p.id]) || {}, f = sets[0];
      if (!f) return "";
      var v = cur[f.key] != null ? cur[f.key] : f.def, o = (f.options || []).find(function (q) { return q.v === v; });
      if (f.type === "color") {
        var col = o ? o.color : /^#[0-9a-f]{6}$/i.test(v || "") ? v : "";
        return '<span class="pw-sub"><i class="pw-dot" style="--sw:' + x(col) + '"></i>' + x(o ? o.label : "Custom") + "</span>";
      }
      return '<span class="pw-sub">' + x(f.label) + ": " + x(o ? o.label : v) + "</span>";
    }
    function sw(p, on) {
      return '<button type="button" class="pw-switch" role="switch" aria-checked="' + on + '" aria-label="' + x(p.name) + '" data-id="' + x(p.id) + '"><i></i></button>';
    }
    function row(p) {
      var on = st.on.indexOf(p.id) >= 0, sets = powSets(p);
      return '<div class="pw-row has-set' + (on ? " is-on" : "") + '" data-id="' + x(p.id) + '">' +
        '<button type="button" class="pw-open" data-id="' + x(p.id) + '" aria-label="' + x(p.name) + ' details">' +
        '<span class="pw-ico" data-pw="' + x(p.id) + '">' + ((window.MPPowerIcon && MPPowerIcon(p.id)) || x(p.icon || "\u2726")) + '</span><span class="pw-copy"><b>' + x(p.name) + "</b>" + summary(p, sets) + "</span>" +
        '<span class="pw-chev" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6c0 0 6 4.4 6 6s-6 6-6 6"/></svg></span>' +
        "</button>" + sw(p, on) + "</div>";
    }
    function page(p) {
      var on = st.on.indexOf(p.id) >= 0;
      return '<div class="pw-page" data-id="' + x(p.id) + '">' +
'<div class="pw-hero"><span class="pw-ico pw-ico-lg" data-pw="' + x(p.id) + '">' + ((window.MPPowerIcon && MPPowerIcon(p.id)) || x(p.icon || "\u2726")) + '</span><div class="pw-hero-copy"><b>' + x(p.name) + '</b><span>' + x(p.desc || "") + "</span></div>" + sw(p, on) + "</div>" +
        (powSets(p).length ? '<div class="pow-tile pw-set-card" data-id="' + x(p.id) + '">' + setPanel({ id: p.id, name: p.name, settings: powSets(p) }) + "</div>" : "") +
        combos(p) +
        '<p class="pow-status" role="status" aria-live="polite"></p></div>';
    }
    function render(msg) {
      var sum = b.querySelector(".pow-sum");
      sum.innerHTML = STARS_SVG + "<b>" + x(st.stars) + "</b>";
      sum.setAttribute("aria-label", st.stars + " stars");
      starsFit(sum);
      var cat = st.catalog || [],
        mine = cat.filter(function (p) { return st.owned.indexOf(p.id) >= 0; }),
        rest = cat.filter(function (p) { return st.owned.indexOf(p.id) < 0; }),
        dp = detail && mine.find(function (p) { return p.id === detail; });
      if (!dp) detail = null;
      var minePow = mine.filter(function (p) { return p.kind !== "charm"; }), mineCh = mine.filter(function (p) { return p.kind === "charm"; });
      var keepX = body.querySelector(".pw-shop") ? body.querySelector(".pw-shop").scrollLeft : 0;
      body.innerHTML = dp ? page(dp) :
        (mine.length ? "" : "<p class='pow-note'>You don't have any powers yet.</p>") +
        (minePow.length ? '<div class="pow-h">Your powers</div><div class="pw-list">' + minePow.map(row).join("") + "</div>" : "") +
        (mineCh.length ? '<div class="pow-h">Your charms</div>' + (st.on.indexOf("charm") < 0 ? "<p class='pow-note is-charm-off'>Switch on Charms to show your charms.</p>" : "") + '<div class="pw-list' + (st.on.indexOf("charm") < 0 ? " is-charm-off" : "") + '">' + mineCh.map(row).join("") + "</div>" : "") +
        '<p class="pow-status" role="status" aria-live="polite">' + x(msg || "") + "</p>" +
        (rest.length ? '<div class="pow-h">Get more</div><div class="pw-shop">' + rest.map(function (p) { return tile(p, !1); }).join("") + "</div>" : "");
      if (dp && msg) status(msg);
      var shop = body.querySelector(".pw-shop");
      shop && keepX && (shop.scrollLeft = keepX);
      if (slideDir && body.firstElementChild && body.animate && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
        body.animate([{ transform: "translateX(" + 28 * slideDir + "px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" });
      }
      slideDir = 0;
    }
    function status(t) {
      var el = body.querySelector(".pow-status");
      el && (el.textContent = t);
    }
    /* Your profile view reads your account object: keep its powers in step (per dc). */
    function powMe() {
      if (!s) return;
      s.powers = st.owned.slice();
      s.powersOn = st.on.slice();
      s.powerSettings = Object.assign({}, st.settings || {});
      mpPBput(s);
      /* Your own chat name follows the change right away; the Worker's {t:"pw"} and the next message's m.pw confirm it. */
      mpPwSet(s.username, mpPwFromProfile(s));
    }
    var confirmT = 0, justOpened = null;
    function saveSetting(opt) {
      var t = opt.closest("[data-id]"),
        id = t.getAttribute("data-id"),
        k = opt.getAttribute("data-k"),
        v = opt.getAttribute("data-v"),
        patch = {};
      patch[k] = v;
      busy = !0;
      /* Optimistic: highlight now, roll back if the save fails. */
      opt.parentNode.querySelectorAll("button").forEach(function (o) { var on = o === opt; o.classList.toggle("is-on", on); o.setAttribute("aria-pressed", String(on)); });
      status("Saving\u2026");
      E("/api/powers/settings", { method: "POST", body: { id: id, settings: patch } })
        .then(function (j) {
          busy = !1;
          if (!j || !j.ok) throw j;
          st.settings = st.settings || {};
          st.settings[id] = j.settings;
          powMe();
          justOpened = null;
          b.isConnected && render("Saved.");
        })
        .catch(function (j) {
          busy = !1;
          b.isConnected && render((j && j.error) || "Couldn't save that setting.");
        });
    }
    /* Custom colour (per dc): an instant inline picker (hue + lightness + preview), no native dialog. */
    function cpHex(h, l) {
      var s1 = 0.85, L = l / 100, a = s1 * Math.min(L, 1 - L), f = function (n) { var k = (n + h / 30) % 12, c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return ("0" + Math.round(c * 255).toString(16)).slice(-2); };
      return "#" + f(0) + f(8) + f(4);
    }
    function cpPaint(cp) {
      var h = +cp.querySelector(".pow-cp-h").value, l = +cp.querySelector(".pow-cp-l").value, hex = cpHex(h, l);
      cp.setAttribute("data-hex", hex);
      cp.style.setProperty("--cp", hex);
      cp.style.setProperty("--cp-mid", cpHex(h, 52));
    }
    body.addEventListener("input", function (e) {
      var cp = e.target.closest(".pow-cp");
      cp && cpPaint(cp);
    });
    body.addEventListener("click", function (e) {
      var use = e.target.closest(".pow-cp-use");
      if (use) {
        var cp = use.closest(".pow-cp"), cb = cp.parentNode.querySelector(".pow-sw-custom");
        if (busy || !cb) return;
        cb.setAttribute("data-v", cp.getAttribute("data-hex"));
        saveSetting(cb);
        return;
      }
      var cbtn = e.target.closest(".pow-sw-custom");
      if (cbtn) {
        var row = cbtn.closest(".pow-set-row"), open = row.querySelector(".pow-cp");
        if (open) { open.remove(); cbtn.setAttribute("aria-expanded", "false"); return; }
        var p0 = document.createElement("div");
        p0.className = "pow-cp";
        p0.innerHTML = '<span class="pow-cp-prev" aria-hidden="true"></span><div class="pow-cp-sl"><input type="range" class="pow-cp-h" min="0" max="359" value="200" aria-label="Hue"><input type="range" class="pow-cp-l" min="28" max="78" value="58" aria-label="Lightness"></div><button type="button" class="pow-ch pow-cp-use">Use</button>';
        row.appendChild(p0);
        cbtn.setAttribute("aria-expanded", "true");
        cpPaint(p0);
        return;
      }
      if (e.target.closest(".pow-cp")) return;
      var opt = e.target.closest(".pow-sw,.pow-ch");
      if (opt) {
        if (!busy && !opt.classList.contains("is-on")) saveSetting(opt);
        return;
      }
      var swb = e.target.closest(".pw-switch");
      var openb = !swb && e.target.closest(".pw-open");
      if (openb) {
        var rr = openb.closest(".pw-row");
        if (rr && rr.classList.contains("has-set")) { detail = openb.getAttribute("data-id"); slideDir = 1; render(); return; }
        swb = rr && rr.querySelector(".pw-switch");
      }
      if (swb) {
        if (busy) return;
        var sid = swb.getAttribute("data-id"), nextOn = st.on.indexOf(sid) < 0;
        busy = !0;
        /* Optimistic: flip now, confirm with the server, roll back on failure. */
        swb.setAttribute("aria-checked", String(nextOn));
        var hostRow = swb.closest(".pw-row");
        hostRow && hostRow.classList.toggle("is-on", nextOn);
        E("/api/powers/set", { method: "POST", body: { id: sid, on: nextOn } })
          .then(function (j) {
            if (!j || !j.ok) throw j;
            st.owned = j.owned;
            st.on = j.on;
            busy = !1;
            powMe();
            b.isConnected && render();
          })
          .catch(function (j) {
            busy = !1;
            var m0 = (j && j.error) || "Couldn't update powers.";
            m0 = m0.replace(/\bCharm\b/, "Charms");
            b.isConnected && render(m0.charAt(0).toUpperCase() + m0.slice(1) + (/charm/i.test(m0) ? "." : ""));
          });
        return;
      }
      var btn = e.target.closest(".pow-tile-main") ? e.target.closest(".pow-tile") : e.target.closest(".pow-tile");
      if (!btn || busy || btn.disabled || btn.classList.contains("pw-set-card")) return;
      var id = btn.getAttribute("data-id");
      if (btn.classList.contains("is-owned")) {
        var next = st.on.indexOf(id) < 0;
        busy = !0;
        body.querySelectorAll(".pow-tile,.pow-tile-main").forEach(function (t) { t.disabled = !0; });
        status("Saving…");
        E("/api/powers/set", { method: "POST", body: { id: id, on: next } })
          .then(function (j) {
            if (!j || !j.ok) throw j;
            st.owned = j.owned;
            st.on = j.on;
            busy = !1;
            powMe();
            justOpened = next ? id : null;
            b.isConnected && render();
            var opened = next && body.querySelector('.pow-tile.has-set[data-id="' + id + '"]');
            opened && setTimeout(function () { try { opened.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {} }, 60);
          })
          .catch(function (j) {
            busy = !1;
            b.isConnected && render((j && j.error) || "Couldn't update powers.");
          });
        return;
      }
      /* Two taps to buy: the first asks, the second spends. */
      if (!btn.classList.contains("is-confirm")) {
        body.querySelectorAll(".pow-tile.is-confirm").forEach(function (t) {
          t.classList.remove("is-confirm");
          t.querySelector(".pow-price").innerHTML = mpStar() + " " + x(t.getAttribute("data-price"));
        });
        btn.setAttribute("data-price", (st.catalog.find(function (p) { return p.id === id; }) || {}).price);
        btn.classList.add("is-confirm");
        btn.querySelector(".pow-price").textContent = "Buy?";
        clearTimeout(confirmT);
        confirmT = setTimeout(function () { btn.isConnected && btn.classList.contains("is-confirm") && !busy && render(); }, 3500);
        return;
      }
      clearTimeout(confirmT);
      busy = !0;
      btn.disabled = !0;
      btn.querySelector(".pow-price").innerHTML = '<span class="btn-spin"></span>';
      E("/api/powers/buy", { method: "POST", body: { id: id } })
        .then(function (j) {
          busy = !1;
          if (!j || !j.ok) return void (b.isConnected && render(j && j.error === "not enough stars" ? "Not enough stars." : j && j.error === "buy the Charm power first" ? "Buy the Charms power first." : "Couldn't buy that power."));
          st.stars = j.stars;
          st.owned = j.owned;
          st.on = j.on;
          powStars(j.stars);
          powMe();
          b.isConnected && render();
        })
        .catch(function () {
          busy = !1;
          b.isConnected && render("Couldn't buy that power.");
        });
    });
    E("/api/powers")
      .then(function (j) {
        if (!b.isConnected) return;
        if (!j || !j.ok) throw j;
        powKeep(j);
        st = { catalog: j.catalog || [], owned: j.owned || [], on: j.on || [], settings: j.settings || {}, stars: j.stars || 0 };
        render();
      })
      .catch(function () {
        b.isConnected && (body.innerHTML = "<p class='pow-note'>Couldn't load powers. Try again soon.</p>");
      });
  }
  function starsWho(e) {
    return e.t === "gift-out" ? e.to : e.t === "gift-in" || e.t === "grant" ? e.from : "";
  }
  function starsAv(name) {
    var info = (Je && Je[String(name).toLowerCase()]) || {},
      wrap;
    if (info.hasImg || info.imgV != null) wrap = J(name, info.avatar, "sm", info.imgV);
    else if (s && String(name).toLowerCase() === String(s.username).toLowerCase() && X() != null)
      wrap = J(name, s.avatar, "sm", X());
    else {
      wrap = document.createElement("span");
      wrap.className = "chat-avatar-wrap";
      var i = document.createElement("span");
      i.className = "chat-avatar sm";
      i.textContent = String(name || "?").replace(/^@/, "").charAt(0).toUpperCase() || "?";
      wrap.appendChild(i);
    }
    ee(wrap, name);
    return wrap;
  }
  function starsLine(e) {
    var row = document.createElement("div");
    row.className = "stars-row";
    var lead = document.createElement("span");
    lead.className = "stars-lead";
    lead.setAttribute("aria-hidden", "true");
    var who = starsWho(e);
    if (who) lead.appendChild(starsAv(who));
    else if (e.t === "buy" && e.power) lead.innerHTML = powIco(powMap[e.power]);
    else {
      lead.innerHTML = '<span class="stars-lead-ico"><svg ' + MP_IC + ">" + STAR_ICON + "</svg></span>";
    }
    row.appendChild(lead);
    var what = document.createElement("span");
    what.className = "stars-what";
    var prefix = { buy: "Bought ", "gift-in": "Gift from ", "gift-out": "Gift to ", pack: "Stars pack", grant: "Added by ", refund: "Refund" }[e.t] || "Stars";
    if (e.t === "buy") what.appendChild(document.createTextNode(prefix + powName(e.power)));
    else if (who) {
      what.appendChild(document.createTextNode(prefix));
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stars-who";
      btn.textContent = mpAt(who) || "someone";
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        mpPB(who);
      });
      what.appendChild(btn);
    } else what.appendChild(document.createTextNode(prefix));
    row.appendChild(what);
    var when = document.createElement("span");
    when.className = "stars-when";
    when.textContent = e.at ? new Date(e.at).toLocaleDateString(void 0, { month: "short", day: "numeric" }) : "";
    row.appendChild(when);
    var n = Number(e.n) || 0,
      amt = document.createElement("b");
    amt.className = "stars-n" + (n > 0 ? " is-plus" : "");
    amt.textContent = (n > 0 ? "+" : "−") + String(Math.abs(n));
    row.appendChild(amt);
    return row;
  }
  /* Size the star to the drawn height of the digits (ascent+descent of the
     actual glyphs), so icon and number are exactly the same height. */
  function starsFit(row) {
    try {
      var n = row.querySelector("b"),
        i = row.querySelector(".stars-ico"),
        cs = getComputedStyle(n),
        c = document.createElement("canvas").getContext("2d");
      c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      var m = c.measureText(n.textContent || "0"),
        h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      h > 0 && ((i.style.height = h + "px"), (i.style.width = h * (19.4 / 18.5) + "px"), (i.style.marginBottom = -m.actualBoundingBoxDescent + "px"));
    } catch (e) {}
  }
  function starsOpen() {
    if (!s || !d) return;
    var b = powSheet("Stars", "stars-back", "<div class='stars-bal' role='img' aria-label='" + x(s.points || 0) + " stars'>" + STARS_SVG + "<b>" + x(s.points || 0) + "</b></div><button type='button' class='pow-get stars-get'>Buy stars</button><div class='pow-h'>Recent</div><div class='stars-log'><p class='pow-note'>Loading…</p></div>"),
      log = b.querySelector(".stars-log"),
      row = b.querySelector(".stars-bal");
    b.querySelector(".stars-get").addEventListener("click", starsGo);
    starsFit(row);
    document.fonts && document.fonts.ready && document.fonts.ready.then(function () { row.isConnected && starsFit(row); });
    Promise.all([E("/api/stars"), powCatalog().catch(function () {})])
      .then(function (r) {
        var j = r[0];
        if (!b.isConnected) return;
        if (!j || !j.ok) throw j;
        b.querySelector(".stars-bal b").textContent = j.stars || 0;
        b.querySelector(".stars-bal").setAttribute("aria-label", (j.stars || 0) + " stars");
        starsFit(row);
        powStars(j.stars || 0);
        var items = j.log || [];
        if (!items.length) log.innerHTML = "<p class='pow-note'>Power purchases and gifted stars show up here.</p>";
        else {
          log.innerHTML = "";
          items.forEach(function (e) { log.appendChild(starsLine(e)); });
        }
      })
      .catch(function () {
        b.isConnected && (log.innerHTML = "<p class='pow-note'>Couldn't load your stars. Try again soon.</p>");
      });
  }
  /* Gift stars (others' profiles): pick an amount like a badge, then send. */
  function giftOpen(user, bar) {
    if (!s || !d || !user) return;
    var AMTS = [1, 5, 10, 25, 50, 100],
      pick = 0,
      busy = !1,
      w = powSheet("Gift stars", "gift-page",
        "<p class='pow-bal'></p><p class='gift-to'></p><div class='pow-grid gift-grid'></div><label class='gift-custom'><span>Custom</span><input type='number' inputmode='numeric' min='1' step='1' placeholder='20' aria-label='Custom amount'></label><p class='pow-status' role='status' aria-live='polite'></p><button type='button' class='pow-get gift-send' disabled>Choose an amount</button>"),
      grid = w.querySelector(".gift-grid"),
      send = w.querySelector(".gift-send"),
      st = w.querySelector(".pow-status");
    w.querySelector(".gift-to").textContent = "to " + mpAt(user.username);
    function paint() {
      w.querySelector(".pow-bal").innerHTML = mpStar("pow-star") + ' <b>' + x(s.points || 0) + "</b> stars to give";
      grid.innerHTML = AMTS.map(function (n) {
        var on = n === pick;
        return '<button type="button" class="pow-tile gift-amt' + (on ? " is-selected" : "") + '" data-n="' + n + '" aria-pressed="' + on + '"' + ((s.points || 0) < n || busy ? " disabled" : "") + '><span class="gift-n">' + mpStar() + " " + n + "</span></button>";
      }).join("");
      send.disabled = busy || !pick;
      send.textContent = pick ? "Send " + pick + (pick === 1 ? " star" : " stars") : "Choose an amount";
    }
    var custom = w.querySelector(".gift-custom input");
    custom.addEventListener("input", function () {
      var n = Math.floor(Number(custom.value));
      pick = n >= 1 && n <= (s.points || 0) ? n : 0;
      st.textContent = custom.value && !pick ? (n > (s.points || 0) ? "Not enough stars." : "Choose an amount.") : "";
      paint();
    });
    grid.addEventListener("click", function (e) {
      var t = e.target.closest(".gift-amt");
      if (!t || t.disabled || busy) return;
      var n = +t.getAttribute("data-n");
      pick = pick === n ? 0 : n;
      custom.value = "";
      st.textContent = "";
      paint();
    });
    send.addEventListener("click", function () {
      if (!pick || busy) return;
      busy = !0;
      paint();
      send.innerHTML = '<span class="btn-spin"></span>';
      st.textContent = "Sending…";
      E("/api/stars/gift", { method: "POST", body: { to: user.username, n: pick } })
        .then(function (j) {
          busy = !1;
          if (!j || !j.ok) {
            st.textContent = j && j.error === "not enough stars" ? "Not enough stars." : (j && j.error) || "Couldn't send stars.";
            return void (w.isConnected && paint());
          }
          powStars(j.stars);
          user.points = j.theirStars;
          bar && bar._profile && (bar._profile.points = j.theirStars);
          mpPBput(user);
          var sent = pick;
          pick = 0;
          paint();
          st.textContent = "Sent " + sent + (sent === 1 ? " star" : " stars") + " to " + mpAt(user.username) + ".";
          setTimeout(function () { w.isConnected && bar && bar._back && bar._back(); }, 1100);
        })
        .catch(function () {
          busy = !1;
          st.textContent = "Couldn't send stars.";
          w.isConnected && paint();
        });
    });
    paint();
  }
  /* Dashboard (owner): the profile morphs into it like Powers/Stars (per dc). */
  function dashOpen() {
    var w = powSheet("Dashboard", "dash-page", "<p class='pow-note'>Loading\u2026</p>"),
      inBar = !w.closest(".rc-card");
    if (inBar) {
      window.MPDashHost = function () { return w.isConnected ? w : (window.MPDashHost = null, false); };
    } else {
      rcClose();
      window.MPDashHost = null;
    }
    window.openAnalytics && window.openAnalytics();
  }
  /* Owner (per dc): give / remove powers, switch them, set colours for another user, in Manage user. */
  function mpOwnerPowers(bar, root) {
    var sec = document.createElement("section");
    sec.className = "mp-own-pw";
    sec.innerHTML = '<div class="pow-h">Powers</div><div class="mp-own-pw-list"><p class="pow-note">Loading\u2026</p></div><p class="pow-status" role="status" aria-live="polite"></p>';
    var list = sec.querySelector(".mp-own-pw-list"), status = sec.querySelector(".pow-status");
    function u() { return bar._profile || {}; }
    function paint() {
      var cat = powCat && powMap ? Object.keys(powMap).map(function (k) { return powMap[k]; }) : [];
      var owned = u().powers || [], on = u().powersOn || [], st = u().powerSettings || {};
      list.innerHTML = cat.map(function (p) {
        var has = owned.indexOf(p.id) >= 0, act = on.indexOf(p.id) >= 0, col = p.settings && p.settings[0] && p.settings[0].type === "color";
        var cur = (st[p.id] && st[p.id].color) || (col ? p.settings[0].def : ""), hex = PW_COLORS[cur] || (/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#ffffff");
        return '<div class="mp-own-row" data-id="' + x(p.id) + '">' + powIco(p) + '<b>' + x(p.name) + "</b>" +
          (has && col ? '<input type="color" class="mp-own-col" value="' + x(hex) + '" aria-label="' + x(p.name) + ' colour">' : "") +
          (has ? '<button type="button" class="pow-ch mp-own-on' + (act ? " is-on" : "") + '" aria-pressed="' + act + '">' + (act ? "On" : "Off") + "</button>" : "") +
          '<button type="button" class="pow-ch mp-own-give">' + (has ? "Remove" : "Give") + "</button></div>";
      }).join("") || "<p class='pow-note'>No powers yet.</p>";
    }
    function send(id, body) {
      status.textContent = "Saving\u2026";
      body.id = id;
      return E("/api/user/" + encodeURIComponent(u().username) + "/powers", { method: "POST", body: body })
        .then(function (j) {
          if (!j || !j.ok || !j.user) throw j;
          bar._profile = Object.assign({}, u(), j.user);
          mpPBput(bar._profile);
          status.textContent = "Saved.";
          paint();
        })
        .catch(function (j) { status.textContent = (j && j.error) || "Couldn't save."; });
    }
    sec.addEventListener("click", function (e) {
      var r = e.target.closest(".mp-own-row"), id = r && r.getAttribute("data-id");
      if (!id) return;
      if (e.target.closest(".mp-own-give")) send(id, { owned: (u().powers || []).indexOf(id) < 0 });
      else if (e.target.closest(".mp-own-on")) send(id, { on: (u().powersOn || []).indexOf(id) < 0 });
    });
    sec.addEventListener("change", function (e) {
      var c = e.target.closest(".mp-own-col"), r = c && c.closest(".mp-own-row");
      r && send(r.getAttribute("data-id"), { settings: { color: c.value } });
    });
    powCatalog().then(paint, function () { list.innerHTML = "<p class='pow-note'>Couldn't load powers.</p>"; });
    root && root.appendChild(sec);
    return root;
  }
  /* Notification popup (per dc): a visible Chat or Globe header morphs for 2 s into the notification
     (who it's from or the Misery eyes for site notices, what happened, and its kind), then morphs
     back. Never the nav pill (shop, etc.). Tap opens the tray. */
  var ntfQ = [], ntfBusy = !1;
  function mpNotifInfo(n) {
    var who = n.from && n.from !== "MISERY" ? mpAt(n.from) : "", name = n.name || powName(n.power || "");
    var k = n.type, t = "", chip = "";
    if (k === "reply") t = who + " replied to you";
    else if (k === "reaction") t = who + (n.kind === "chat" ? " reacted to your message" : " liked your post");
    else if (k === "mention") t = who + " mentioned you" + (n.kind === "chat" ? " in Chat" : " on the Globe");
    else if (k === "whisper" || n.kind === "whisper") t = who + " whispered you";
    else if (k === "vip") t = "You're VIP now";
    else if (k === "milestone") t = n.text || "You hit a milestone";
    else if (k === "gift") t = who + " gifted you " + (n.n || 0) + (n.n === 1 ? " star" : " stars");
    else if (k === "power") t = "You got " + (name || "a power");
    else if (k === "purchase") t = n.kind === "stars" ? (n.n || 0) + " stars added" : (name || "Your power") + " is yours";
    else t = n.text || n.preview || "New notification";
    /* Pills: every gift is "Gift"; everything from the Globe/forum is "Globe". Body text stays. */
    var gift = k === "gift" || k === "power" || /gift/i.test(String(k || "")) || /gift/i.test(String(n.kind || ""));
    var globe = k === "reply" || k === "repost" || k === "follow" || k === "quote" || k === "like" ||
      ((k === "reaction" || k === "mention") && n.kind !== "chat");
    chip = gift ? "Gift" : globe ? "Globe" : k === "reaction" ? "Reaction" : k === "mention" ? "Mention" :
      (k === "whisper" || n.kind === "whisper") ? "Whisper" : k === "vip" ? "VIP" : k === "milestone" && /^(power-new|everypower)/.test(String(n.kind || "")) ? "Powers" : k === "milestone" ? "Milestone" :
      k === "purchase" ? "Purchase" : "Notification";
    return { title: t, sub: n.preview && k !== "milestone" ? String(n.preview) : "", chip: chip, site: !who };
  }
  function mpNotifPop(n) {
    try { window.MPForum && MPForum.refreshNotifs && MPForum.refreshNotifs(); } catch (_) {}
    ntfQ.push(n);
    ntfBusy || mpNotifNext();
  }
  function mpNotifNext() {
    var n = ntfQ.shift();
    if (!n) return void (ntfBusy = !1);
    var bar, heads = document.querySelectorAll(".panel.on .chat-head"), i;
    for (i = 0; i < heads.length; i++) if (heads[i].getClientRects().length) { bar = heads[i]; break; }
    if (!bar || bar.classList.contains("is-profile-bar") || document.hidden) { ntfQ.length = 0; return void (ntfBusy = !1); }
    ntfBusy = !0;
    var info = mpNotifInfo(n), lay = document.createElement("button"), av;
    lay.type = "button";
    lay.className = "mp-ntf";
    lay.setAttribute("aria-live", "polite");
    if (info.site) av = '<span class="mp-ntf-av is-site"><img src="/img/favicon-eyes-96.png?v=17" alt=""></span>';
    else { var c = Je[String(n.from).toLowerCase()] || {}, a = J(n.from, c.avatar, "sm", c.hasImg ? c.imgV : void 0); av = '<span class="mp-ntf-av"></span>'; }
    lay.innerHTML = av + '<span class="mp-ntf-tx"><b></b><small></small></span><span class="mp-ntf-chip"></span>';
    if (!info.site) lay.querySelector(".mp-ntf-av").appendChild(a);
    lay.querySelector("b").textContent = info.title;
    lay.querySelector("small").textContent = info.sub;
    lay.querySelector("small").hidden = !info.sub;
    lay.querySelector(".mp-ntf-chip").textContent = info.chip;
    lay.addEventListener("click", function (e) {
      e.stopPropagation();
      var bell = document.querySelector(".panel.on #chat-bell, .panel.on #forum-bell, #chat-bell, #forum-bell");
      done();
      bell && bell.click();
    });
    var pos = getComputedStyle(bar).position, setPos = pos === "static";
    setPos && (bar.style.position = "relative");
    bar.appendChild(lay);
    requestAnimationFrame(function () { bar.classList.add("is-ntf"); });
    var tmr = setTimeout(done, 2000), fin = !1;
    function done() {
      if (fin) return;
      fin = !0;
      clearTimeout(tmr);
      bar.classList.remove("is-ntf");
      setTimeout(function () { lay.remove(); setPos && (bar.style.position = ""); mpNotifNext(); }, 360);
    }
  }
  window.MPNotifInfo = mpNotifInfo;
  window.MPNotifPop = mpNotifPop;
  document.addEventListener("click", function (e) {
    var pill = e.target.closest && e.target.closest(".chat-points");
    if (!pill || !s) return;
    e.preventDefault();
    if (mpPBel && mpPBel.isConnected && mpPBel._page) return void starsOpen();
    window.MPOpenMyProfileView && MPOpenMyProfileView();
    var n = 0;
    (function wait() {
      if (document.querySelector(".mp-pb-acts")) return void starsOpen();
      ++n < 40 && setTimeout(wait, 80);
    })();
  });
  window.MPOpenPowers = powOpen;
  window.MPOpenStars = starsOpen;
  /* ---------- Orders (per dc): link a checkout email with one order, then see every order + tracking ---------- */
  var ordTitle = null;
  var ORD_ICON =
    "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12 22C11.1818 22 10.4002 21.6698 8.83693 21.0095C4.94564 19.3657 3 18.5438 3 17.1613C3 16.7742 3 10.0645 3 7M12 22C12.8182 22 13.5998 21.6698 15.1631 21.0095C19.0544 19.3657 21 18.5438 21 17.1613V7M12 22L12 11.3548'/><path d='M8.32592 9.69138L5.40472 8.27785C3.80157 7.5021 3 7.11423 3 6.5C3 5.88577 3.80157 5.4979 5.40472 4.72215L8.32592 3.30862C10.1288 2.43621 11.0303 2 12 2C12.9697 2 13.8712 2.4362 15.6741 3.30862L18.5953 4.72215C20.1984 5.4979 21 5.88577 21 6.5C21 7.11423 20.1984 7.5021 18.5953 8.27785L15.6741 9.69138C13.8712 10.5638 12.9697 11 12 11C11.0303 11 10.1288 10.5638 8.32592 9.69138Z'/><path d='M6 12L8 13'/><path d='M17 4L7 9'/></svg>";
  function ordMenuItem() {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chat-me-item chat-me-orders";
    b.innerHTML = ORD_ICON + "<span>Orders</span>";
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      ht();
      setTimeout(ordOpen, 60);
    });
    return b;
  }
  function ordClose() {
    rcClose();
    if (ordTitle !== null) {
      document.title = ordTitle;
      ordTitle = null;
    }
  }
  function ordWord(v, map) {
    v = String(v || "");
    if (map[v]) return map[v];
    v = v.replace(/_/g, " ").toLowerCase();
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  var ORD_PAY = {
    PAID: "Paid",
    PENDING: "Payment pending",
    AUTHORIZED: "Payment pending",
    PARTIALLY_PAID: "Partly paid",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partly refunded",
    VOIDED: "Voided",
    EXPIRED: "Expired",
  };
  var ORD_SHIP = {
    UNFULFILLED: "Not shipped yet",
    SCHEDULED: "Not shipped yet",
    IN_PROGRESS: "Preparing",
    ON_HOLD: "On hold",
    PENDING_FULFILLMENT: "Preparing",
    OPEN: "Preparing",
    PARTIALLY_FULFILLED: "Partly shipped",
    FULFILLED: "Shipped",
    RESTOCKED: "Returned",
  };
  var ORD_DELIVERY = {
    IN_TRANSIT: "In transit",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    ATTEMPTED_DELIVERY: "Delivery attempted",
    FAILURE: "Delivery problem",
    READY_FOR_PICKUP: "Ready for pickup",
    PICKED_UP: "Picked up",
    LABEL_PRINTED: "Label made",
    LABEL_PURCHASED: "Label made",
    CONFIRMED: "Shipped",
    FULFILLED: "Shipped",
  };
  function ordMoney(t) {
    var n = parseFloat(t && t.amount);
    if (isNaN(n)) return "";
    return "$" + n.toFixed(n % 1 ? 2 : 0) + " " + ((t && t.currency) || "CAD");
  }
  function ordStatus(o) {
    if (o.cancelled) return { text: "Cancelled", cls: "bad" };
    if (o.fulfillment === "FULFILLED" || o.fulfillment === "PARTIALLY_FULFILLED") {
      var dv = o.delivery && ORD_DELIVERY[o.delivery];
      if (dv && o.fulfillment === "FULFILLED") return { text: dv, cls: o.delivery === "DELIVERED" ? "ok" : "go" };
    }
    return { text: ordWord(o.fulfillment, ORD_SHIP), cls: o.fulfillment === "FULFILLED" ? "go" : "" };
  }
  function ordCard(o) {
    var st = ordStatus(o),
      date = "";
    try {
      date = new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {}
    var h =
      "<article class='ord-card'><div class='ord-head'><span class='ord-name'>" +
      x(o.name) +
      "</span><span class='ord-date'>" +
      x(date) +
      "</span></div><div class='ord-pills'><span class='ord-pill " +
      st.cls +
      "'>" +
      x(st.text) +
      "</span>" +
      (o.financial && !o.cancelled
        ? "<span class='ord-pill" + (/REFUND|VOID/.test(o.financial) ? " bad" : "") + "'>" + x(ordWord(o.financial, ORD_PAY)) + "</span>"
        : "") +
      "</div><ul class='ord-items'>";
    (o.items || []).forEach(function (it) {
      h +=
        "<li>" +
        (it.image && /^https:\/\//.test(it.image)
          ? "<img src='" + x(it.image) + "' alt='' loading='lazy' decoding='async'>"
          : "<span class='ord-noimg' aria-hidden='true'>" + ORD_ICON + "</span>") +
        "<span class='ord-it'><span class='ord-it-t'>" +
        x(it.title) +
        "</span>" +
        (it.variant ? "<span class='ord-it-v'>" + x(it.variant) + "</span>" : "") +
        "</span><span class='ord-qty'>×" +
        x(it.qty) +
        "</span></li>";
    });
    h += "</ul>";
    (o.tracking || []).forEach(function (t) {
      h +=
        "<div class='ord-track'><span class='ord-track-t'>" +
        x(t.company || "Tracking") +
        (t.number ? " · <span class='ord-track-n'>" + x(t.number) + "</span>" : "") +
        "</span>" +
        (t.url && /^https:\/\//.test(t.url)
          ? "<a class='ord-track-a' href='" + x(t.url) + "' target='_blank' rel='noopener noreferrer'>Track</a>"
          : "") +
        "</div>";
    });
    h +=
      "<div class='ord-foot'><span>Total</span><span class='ord-total'>" +
      x(ordMoney(o.total)) +
      "</span></div>" +
      (o.statusUrl && /^https:\/\//.test(o.statusUrl)
        ? "<a class='ord-view' href='" + x(o.statusUrl) + "' target='_blank' rel='noopener noreferrer'>View order details</a>"
        : "") +
      "</article>";
    return h;
  }
  function ordFormHTML(first) {
    return (
      "<div class='ord-form'" +
      (first ? "" : " hidden") +
      "><label class='chat-field'><span>Order number</span><input type='text' name='ord-num' inputmode='numeric' maxlength='12' placeholder='#1001' autocomplete='off' spellcheck='false'></label><label class='chat-field'><span>Checkout email</span><input type='email' name='ord-email' maxlength='254' autocomplete='email' autocapitalize='none' spellcheck='false'></label><div class='chat-err rc-err ord-err' role='alert'></div><button type='button' class='btn accent ord-go'>" +
      (first ? "Find my orders" : "Add order") +
      "</button></div>"
    );
  }
  function ordRender(b, st) {
    var card = b.querySelector(".rc-card"),
      body = card.querySelector(".ord-body"),
      sub = card.querySelector(".rc-sub");
    if (st === "loading") {
      sub.textContent = "Loading your orders…";
      body.innerHTML = "<div class='ord-spin' aria-hidden='true'></div>";
      return;
    }
    if (st === "off") {
      sub.textContent = "Orders aren't available yet. Check back soon.";
      body.innerHTML = "";
      return;
    }
    if (st === "fail") {
      sub.textContent = "Couldn't load your orders.";
      body.innerHTML = "<button type='button' class='btn accent ord-retry'>Try again</button>";
      body.querySelector(".ord-retry").addEventListener("click", function () {
        ordLoad(b);
      });
      return;
    }
    var emails = st.emails || [],
      orders = st.orders || [],
      h = "";
    if (!emails.length) {
      sub.textContent = "Enter an order number and the email you used at checkout. We'll show all your orders here with tracking.";
      h = ordFormHTML(!0);
    } else {
      sub.textContent = orders.length
        ? orders.length + (orders.length === 1 ? " order" : " orders")
        : "No orders on your linked email yet.";
      h = "<div class='ord-list'>";
      orders.forEach(function (o) {
        h += ordCard(o);
      });
      h += "</div><div class='ord-emails'>";
      emails.forEach(function (e) {
        h +=
          "<div class='ord-email'><span class='ord-email-t'>" +
          x(e.email) +
          "</span><button type='button' class='ord-unlink' data-email='" +
          x(e.email) +
          "'>Remove</button></div>";
      });
      h +=
        "</div>" +
        (emails.length < 3 ? "<button type='button' class='btn ord-add'>Add another order</button>" : "") +
        ordFormHTML(!1);
    }
    body.innerHTML = h;
    var add = body.querySelector(".ord-add");
    add &&
      add.addEventListener("click", function () {
        add.hidden = !0;
        var f = body.querySelector(".ord-form");
        f.hidden = !1;
        try {
          f.querySelector("input").focus({ preventScroll: !0 });
        } catch (e) {}
      });
    body.querySelectorAll(".ord-unlink").forEach(function (u) {
      u.addEventListener("click", function () {
        var em = u.getAttribute("data-email");
        k("Remove " + em + "? Its orders will stop showing here.", {
          okText: "Remove",
          cancelText: "Cancel",
          onOk: function () {
            u.disabled = !0;
            E("/api/orders/unlink", { method: "POST", body: { email: em } })
              .then(function (j) {
                j && j.ok ? ordLoad(b) : ((u.disabled = !1), k((j && j.error) || "Couldn't remove it."));
              })
              .catch(function () {
                u.disabled = !1;
                k("Couldn't reach the server. Try again.");
              });
          },
        });
      });
    });
    var go = body.querySelector(".ord-go");
    if (go) {
      var num = body.querySelector("[name='ord-num']"),
        em = body.querySelector("[name='ord-email']"),
        er = body.querySelector(".ord-err");
      var send = function () {
        er.textContent = "";
        var n = num.value.replace(/[^0-9]/g, ""),
          m = em.value.trim();
        if (!n) return void (er.textContent = "Enter your order number, like #1001.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return void (er.textContent = "Enter the email you used at checkout.");
        go.disabled = !0;
        go.textContent = "Checking…";
        E("/api/orders/link", { method: "POST", body: { order: n, email: m } })
          .then(function (j) {
            if (j && j.ok) return void ordLoad(b);
            go.disabled = !1;
            go.textContent = emails.length ? "Add order" : "Find my orders";
            if (j && (j.code === "orders_unavailable" || j.error === "not found")) return void ordRender(b, "off");
            er.textContent = (j && j.error) || "We couldn't find an order with that number and email.";
          })
          .catch(function () {
            go.disabled = !1;
            go.textContent = emails.length ? "Add order" : "Find my orders";
            er.textContent = "Couldn't reach the server. Try again.";
          });
      };
      go.addEventListener("click", send);
      em.addEventListener("keydown", function (e) {
        "Enter" === e.key && send();
      });
    }
  }
  function ordLoad(b) {
    ordRender(b, "loading");
    E("/api/orders")
      .then(function (j) {
        if (!b.isConnected) return;
        if (j && j.ok) return void ordRender(b, j);
        // Older API without the route (404) or no Shopify access yet (503): say so plainly.
        if (j && (j.code === "orders_unavailable" || j.error === "not found")) return void ordRender(b, "off");
        if (j && j.error === "not logged in") return void ordClose();
        ordRender(b, "fail");
      })
      .catch(function (e) {
        if (!b.isConnected) return;
        ordRender(b, e && (e.status === 404 || e.status === 503) ? "off" : "fail");
      });
  }
  function ordOpen() {
    if (!s || !d) return;
    var b = rcLayer(
      "<button type='button' class='rc-x-close' aria-label='Close'><svg class='mp-x-ico' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M18.9991 19L5 5.00098'/><path d='M19 5L5.00092 18.999'/></svg></button><h2 class='rc-title'>Orders</h2><p class='rc-sub'></p><div class='ord-body'></div>",
      "ord-back",
    );
    b.querySelector(".rc-card").classList.add("ord-sheet");
    b.querySelector(".rc-x-close").addEventListener("click", ordClose);
    b.addEventListener("click", function (e) {
      e.target === b && ordClose();
    });
    ordTitle === null && (ordTitle = document.title);
    document.title = "Misère Perdue · Orders";
    ordLoad(b);
  }
  window.MPOpenOrders = ordOpen;
  window.MPOpenProfile = function () {
    mpProfileSheet(!0);
  };
  // New account made with X: show its code once /api/me has loaded.
  function rcXNewCode(code) {
    var n = 0;
    (function w() {
      s && s.username
        ? rcShowCode(code, s.username, { eyebrow: "" })
        : ++n < 40 && setTimeout(w, 150);
    })();
  }
  function rcResetNotice(ts) {
    ts &&
      k(
        "Your password was reset on " +
          new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) +
          ". If that wasn't you, use your recovery code now.",
      );
  }
  /* Speed: the first history load and the socket ticket used to wait for /api/me to answer. They
     only need the same token, so they start alongside it and chat is on screen a round trip sooner.
     Each result is used once, only for the token it was fetched with, and only while fresh (the
     ticket lives 60s on the Worker). */
  var bootPre = null;
  function bootPrefetch() {
    if (!d || (p && p.readyState <= 1)) return;
    var b = { at: Date.now(), tok: d };
    b.msgs = E("/api/messages?limit=200&_=" + Date.now());
    b.ticket = E("/api/ws-ticket", { method: "POST", body: {} });
    b.msgs.catch(function () {});
    b.ticket.catch(function () {});
    bootPre = b;
  }
  function bootTake(k) {
    var b = bootPre, v;
    if (!b || b.tok !== d || Date.now() - b.at > 15e3 || !b[k]) return null;
    v = b[k];
    b[k] = null;
    return v;
  }
  function wt(e) {
    if (e && e.token) {
      try {
        localStorage.setItem(r, e.token);
      } catch (e) {}
      d = e.token;
    } else e && e.error && (bt = e.error);
    try {
      d || (d = localStorage.getItem(r));
    } catch (e) {
      d = null;
    }
    if (d)
      (bootPrefetch(), E("/api/me"))
        .then(function (e) {
          if (e && e.user) ((s = e.user), window.mpHide && mpHide.setViewer(s.username), ke(), rcAfterX(), rcMaybePrompt());
          else {
            d = null;
            try {
              localStorage.removeItem(r);
            } catch (e) {}
            ae();
          }
        })
        .catch(function () {
          ae();
        });
    else if ((ae(), bt)) {
      var t = c.querySelector(".chat-err");
      (t && (t.textContent = bt), (bt = null));
    }
  }
  // X handoff for the iOS home-screen app: X can finish in Safari (separate
  // storage). The page that started the flow picks the result up here:
  // sign-in via /api/x/poll (secret pollKey), link by re-reading /api/me.
  var xHandoffBusy = !1;
  function xHandoff() {
    if (xHandoffBusy || document.hidden) return;
    var pend = null,
      lp = 0;
    try {
      pend = JSON.parse(localStorage.getItem("x_poll") || "null");
    } catch (e) {}
    try {
      lp = +localStorage.getItem("x_link_pending") || 0;
    } catch (e) {}
    if (pend && (!pend.ts || Date.now() - pend.ts > 6e5 || d)) {
      try {
        localStorage.removeItem("x_poll");
      } catch (e) {}
      pend = null;
    }
    if (lp && (Date.now() - lp > 6e5 || !d)) {
      try {
        localStorage.removeItem("x_link_pending");
      } catch (e) {}
      lp = 0;
    }
    if (pend && pend.state && pend.pollKey) {
      xHandoffBusy = !0;
      fetch(e + "/api/x/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: pend.state, pollKey: pend.pollKey }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          xHandoffBusy = !1;
          if (j && j.pending) return;
          try {
            localStorage.removeItem("x_poll");
          } catch (e) {}
          j && j.ok && j.token
            ? (wt({ token: j.token }), j.recoveryCode && rcXNewCode(j.recoveryCode))
            : j && j.error && (d ? k(j.error) : wt({ error: j.error }));
        })
        .catch(function () {
          xHandoffBusy = !1;
        });
    } else if (lp && d) {
      xHandoffBusy = !0;
      E("/api/me")
        .then(function (j) {
          xHandoffBusy = !1;
          if (j && j.user && j.user.xUsername) {
            try {
              localStorage.removeItem("x_link_pending");
            } catch (e) {}
            s && (s.xUsername = j.user.xUsername);
            k("X account linked: @" + j.user.xUsername);
          }
        })
        .catch(function () {
          xHandoffBusy = !1;
        });
    }
  }
  (document.addEventListener("visibilitychange", xHandoff),
    window.addEventListener("focus", xHandoff),
    window.addEventListener("pageshow", xHandoff),
    setInterval(function () {
      try {
        localStorage.getItem("x_poll") && xHandoff();
      } catch (e) {}
    }, 3e3));
  ("loading" === document.readyState ? document.addEventListener("DOMContentLoaded", yt) : yt(),
    (window.MPChat = window.MPChat || {}),
    (function () {
      try {
        var v = localStorage.getItem("mp-gprows") || "s1";
        -1 === ["s1", "s2", "s3", "r1", "r2", "r3"].indexOf(v) && (v = "s1");
        document.documentElement.setAttribute("data-gprows", v);
      } catch (_) {
        document.documentElement.setAttribute("data-gprows", "s1");
      }
    })(),
    (function () {
      try {
        var e = new URLSearchParams(location.search || "");
        if ("1" !== e.get("share")) return;
        var t = (e.get("title") || "").trim(),
          n = (e.get("text") || "").trim(),
          a = (e.get("url") || "").trim(),
          r = [];
        (t && t !== n && r.push(t), n && r.push(n), !a || (n && -1 !== n.indexOf(a)) || r.push(a));
        var o = r.join(" ").trim().slice(0, 500);
        if (o)
          try {
            sessionStorage.setItem("mp-share-draft", o);
          } catch (e) {}
        try {
          history.replaceState(null, "", location.pathname + location.hash);
        } catch (e) {}
      } catch (e) {}
    })());
  var Ct =
    "BGl9veZq0tPwGIzjQb-hOmA7ZGSpQbuzinB_z-9xBGyAGWY5ZhBLBox4gjAR39hZF9I6Z_UoRQzmM7qLlBNwvtY";
  function xt(e) {
    for (
      var t = (e + "=".repeat((4 - (e.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"),
        n = window.atob(t),
        a = new Uint8Array(n.length),
        r = 0;
      r < n.length;
      ++r
    )
      a[r] = n.charCodeAt(r);
    return a;
  }
  function Et() {
    return "serviceWorker" in navigator && "PushManager" in window
      ? navigator.serviceWorker.ready
          .then(function (e) {
            return e.pushManager.getSubscription();
          })
          .catch(function () {
            return null;
          })
      : Promise.resolve(null);
  }
  function kt(tok) {
    // tok given (sign-out): only this device's subscription is removed on the
    // server, using the captured token. No tok: the notifications toggle (all subs).
    // serviceWorker.ready never settles without a registered SW, so sign-out
    // waits at most 1.5 s for it (then /api/logout still runs).
    var sub =
      tok !== void 0
        ? Promise.race([
            Et(),
            new Promise(function (t) {
              setTimeout(function () {
                t(null);
              }, 1500);
            }),
          ])
        : Et();
    return sub.then(function (e) {
      var t = Promise.resolve(),
        ep = e && e.endpoint;
      if (tok !== void 0 && !ep) return null;
      return (
        e && (t = e.unsubscribe()),
        t
          .catch(function () {})
          .then(function () {
            return tok !== void 0
              ? E("/api/push/unsubscribe", { method: "POST", body: { endpoint: ep }, token: tok })
              : E("/api/push/unsubscribe", { method: "POST", body: {} });
          })
      );
    });
  }
  // Home-screen app only: one soft ask for push after sign-in (subscriptions are
  // per account: /api/push/subscribe needs the bearer token). Never in Safari tabs,
  // never once the user has answered the system prompt; "Not now" snoozes 14 days.
  (function pushAsk() {
    var SNOOZE = "mp-push-ask-until";
    function standalone() {
      try {
        return (
          !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
          !!navigator.standalone
        );
      } catch (e) {
        return !1;
      }
    }
    function eligible() {
      if (!standalone()) return !1;
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window))
        return !1;
      if (Notification.permission !== "default") return !1;
      try {
        if (Date.now() < +(localStorage.getItem(SNOOZE) || 0)) return !1;
      } catch (e) {}
      return !0;
    }
    if (!eligible()) return;
    var tries = 0,
      shown = !1,
      poll = setInterval(function () {
        if (++tries > 300 || shown) return clearInterval(poll);
        if (!(d && s)) return;
        (clearInterval(poll), setTimeout(show, 4e3));
      }, 2e3);
    function show() {
      if (shown || !(d && s) || !eligible() || document.getElementById("mp-push-ask")) return;
      shown = !0;
      var card = document.createElement("div");
      ((card.id = "mp-push-ask"),
        (card.className = "mp-push-ask"),
        card.setAttribute("role", "dialog"),
        card.setAttribute("aria-label", "Notifications"),
        (card.innerHTML =
          '<span class="mp-push-ask-eyes" aria-hidden="true"></span>' +
          '<p class="mp-push-ask-text">Get notified about future updates</p>' +
          '<div class="mp-push-ask-row"><button type="button" class="mp-push-ask-no">Not now</button>' +
          '<button type="button" class="mp-push-ask-yes">Allow</button></div>'),
        document.body.appendChild(card),
        requestAnimationFrame(function () {
          card.classList.add("on");
        }));
      function hide() {
        (card.classList.remove("on"),
          setTimeout(function () {
            card.remove();
          }, 400));
      }
      (card.querySelector(".mp-push-ask-no").addEventListener("click", function () {
        try {
          localStorage.setItem(SNOOZE, String(Date.now() + 14 * 864e5));
        } catch (e) {}
        hide();
      }),
        card.querySelector(".mp-push-ask-yes").addEventListener("click", function () {
          // requestPermission must run synchronously inside the tap (iOS requires a gesture).
          var ask;
          try {
            ask = Notification.requestPermission();
          } catch (e) {
            ask = Promise.reject(e);
          }
          (hide(),
            Promise.resolve(ask)
              .then(function (p) {
                if ("granted" !== p) throw new Error("Permission " + p);
                return navigator.serviceWorker.ready;
              })
              .then(function (r) {
                return r.pushManager.getSubscription().then(function (sub) {
                  return sub || r.pushManager.subscribe({ userVisibleOnly: !0, applicationServerKey: xt(Ct) });
                });
              })
              .then(function (sub) {
                return E("/api/push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } });
              })
              .catch(function () {}));
        }));
    }
  })();
  var Lt = document.createElement("div");
  ((Lt.className = "mp-offline-banner"),
    (Lt.textContent = "You're offline — showing cached content"),
    (Lt.style.cssText =
      "position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);z-index:9999;display:none;pointer-events:none;white-space:nowrap;"),
    document.body.appendChild(Lt));
  var St = !1;
  function Mt(e) {
    if (("boolean" == typeof e && (St = e), void 0 !== Lt && Lt)) {
      var t = St || !navigator.onLine;
      Lt.style.display = t ? "block" : "none";
    }
  }
  (window.addEventListener("online", function () {
    Mt(!1);
  }),
    window.addEventListener("offline", function () {
      Mt(!0);
    }),
    Mt(),
    (function () {
        /* Pull-to-refresh on the store pages (PWA + Safari).
         * Only arms at the TRUE top of the scroller under the finger
         * (scrollTop<=1). Never at the bottom edge — in Chat a downward
         * drag there is normal scrolling toward older messages (per dc).
         * Capture-phase + scrollable-ancestor walk; #chat no longer sets
         * overscroll-behavior:none so Safari isn't blocked either. */
        var startY = null,
          startX = 0,
          dist = 0,
          locked = 0,
          armed = 0,
          busy = 0,
          raf = 0,
          gen = 0,
          activeScroller = null,
          THRESH = 100,
          RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        var tip = document.createElement("div");
        tip.className = "mp-pull-indicator";
        tip.setAttribute("aria-hidden", "true");
        tip.innerHTML =
          '<span class="mp-pull-indicator-ico">' +
          '<svg class="mp-pull-indicator-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18.502V5.00195"/><path d="M18 13.002C18 13.002 13.5811 19.0019 12 19.002C10.4188 19.002 6 13.002 6 13.002"/></svg>' +
          '<span class="mp-pull-indicator-spin"></span></span>' +
          '<span class="mp-pull-indicator-txt">Pull to refresh</span>';
        var label = tip.querySelector(".mp-pull-indicator-txt");
        function mountTip() {
          if (!tip.parentNode && document.body) document.body.appendChild(tip);
        }
        if (document.body) mountTip();
        else document.addEventListener("DOMContentLoaded", mountTip);

        function onLivePage() {
          // Globe owns pull-to-post; Chat and thread detail update themselves.
          return !!document.querySelector("#journal.on, #forum.on");
        }
        function clearStuckClaim() {
          if (!onLivePage() && window.__mpPullToPost) {
            try { window.__mpPullToPost = !1; } catch (e) {}
            document.documentElement.classList.remove("mp-globe-pull");
          }
        }
        function scrollTopOf(el) {
          if (!el || el === window) {
            return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
          }
          return el.scrollTop || 0;
        }
        function isScrollable(el) {
          if (!el || el === document || el === document.documentElement || el === document.body) return false;
          try {
            var st = getComputedStyle(el);
            var oy = st.overflowY;
            if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
            return el.scrollHeight > el.clientHeight + 1;
          } catch (e) {
            return false;
          }
        }
        function scrollerFrom(target) {
          var el = target;
          while (el && el !== document && el !== document.documentElement) {
            if (isScrollable(el)) return el;
            el = el.parentElement;
          }
          return window;
        }
        // Only the real top. A downward drag at the bottom of Chat is
        // "scroll toward older messages" and must never arm PTR.
        function edgeAllowsPull(scroller) {
          return scrollTopOf(scroller) <= 1;
        }
        function paint(p) {
          tip.style.setProperty("--ptr", String(p));
          tip.classList.toggle("is-on", p > 0.02);
          tip.classList.toggle("is-armed", p >= 1);
          if (!busy) label.textContent = p >= 1 ? "Release to refresh" : "Pull to refresh";
        }
        function hide() {
          gen++;
          tip.classList.remove("is-on", "is-armed");
          if (!busy) {
            tip.style.setProperty("--ptr", "0");
            label.textContent = "Pull to refresh";
          }
        }
        function shiftContent(px) {
          var msgs = document.querySelector("#journal.on #chat .chat-msgs");
          var panel = document.querySelector(".panel.on");
          var el =
            msgs ||
            (panel && panel.id !== "forum"
              ? panel.querySelector(".grid, #shop-grid, #cart-view, #product-view, .cart") || null
              : null);
          if (!el) return null;
          if (px) {
            el.style.transition = "none";
            el.style.transform = "translate3d(0," + px.toFixed(2) + "px,0)";
          } else {
            el.style.transition = RM ? "none" : "transform .3s cubic-bezier(.2,.85,.25,1.15)";
            el.style.transform = "";
            setTimeout(function () {
              el.style.transition = "";
            }, 320);
          }
          return el;
        }
        function isChrome(t) {
          if (!t || !t.closest) return false;
          // Narrow: real chrome only. Do NOT skip product-card / role=button content.
          return !!t.closest(
            "#nav, .nav-wrap, .chat-head, .forum-topbar, .chat-inputrow, .chat-inputbar, .chat-plus-menu, .mp-sheet, .chat-sheet, .chat-sheet-blur, .mp-pull-indicator, input, textarea, select",
          );
        }
        function onStart(ev) {
          if (busy) return;
          clearStuckClaim();
          locked = 0;
          dist = 0;
          armed = 0;
          activeScroller = null;
          if (onLivePage() || window.__mpPullToPost) {
            startY = null;
            return;
          }
          if (!ev.touches || ev.touches.length !== 1) {
            startY = null;
            return;
          }
          var t = ev.target;
          if (isChrome(t)) {
            startY = null;
            return;
          }
          var sc = scrollerFrom(t);
          if (!edgeAllowsPull(sc)) {
            startY = null;
            return;
          }
          activeScroller = sc;
          startY = ev.touches[0].clientY;
          startX = ev.touches[0].clientX;
        }
        function onMove(ev) {
          if (busy || null === startY) return;
          if (onLivePage() || window.__mpPullToPost) {
            startY = null;
            locked = 0;
            dist = 0;
            hide();
            shiftContent(0);
            return;
          }
          if (!ev.touches || !ev.touches.length) return;
          var y = ev.touches[0].clientY,
            x = ev.touches[0].clientX;
          var dy = y - startY,
            dx = x - startX;
          if (!locked) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            // Vertical pull only — leave horizontal to swipe-tabs.
            if (!(dy > 0 && dy > Math.abs(dx) * 1.25)) {
              locked = -1;
              startY = null;
              return;
            }
            if (!edgeAllowsPull(activeScroller || window)) {
              startY = null;
              return;
            }
            locked = 1;
          }
          if (locked !== 1) return;
          if (ev.cancelable) ev.preventDefault();
          dist = Math.max(0, dy);
          var resisted = Math.min(96, dist * 0.48 + Math.pow(Math.max(0, dist - 36), 0.82) * 0.26);
          if (RM) resisted = Math.min(48, dist * 0.3);
          var p = Math.max(0, Math.min(1, dist / THRESH));
          var g = ++gen;
          if (!raf) {
            raf = requestAnimationFrame(function () {
              raf = 0;
              if (g !== gen || busy || onLivePage()) return;
              paint(p);
              shiftContent(resisted);
            });
          }
          if (p >= 1 && !armed) {
            armed = 1;
            try {
              navigator.vibrate && navigator.vibrate(10);
            } catch (err) {}
          }
          if (p < 1) armed = 0;
        }
        function onEnd() {
          if (busy) return;
          if (null === startY || locked !== 1) {
            startY = null;
            locked = 0;
            activeScroller = null;
            hide();
            return;
          }
          var go = dist >= THRESH && !onLivePage() && !window.__mpPullToPost;
          startY = null;
          locked = 0;
          activeScroller = null;
          if (go) {
            busy = 1;
            tip.classList.add("is-busy", "is-on", "is-armed");
            tip.style.setProperty("--ptr", "1");
            label.textContent = "Refreshing";
            shiftContent(0);
            var soft = null;
            try {
              if (window.MPForum && typeof MPForum.refreshInPlace === "function")
                soft = MPForum.refreshInPlace();
            } catch (e) { soft = null; }
            if (soft && typeof soft.then === "function") {
              soft.then(function () {
                busy = 0;
                tip.classList.remove("is-busy", "is-armed");
                label.textContent = "Pull to refresh";
                hide();
                shiftContent(0);
              }).catch(function () {
                try { sessionStorage.setItem("mp-refreshing", "1"); } catch (e) {}
                document.documentElement.classList.add("mp-show-splash");
                window.scrollTo(0, 0);
                setTimeout(function () { location.reload(); }, 120);
              });
            } else {
              try {
                sessionStorage.setItem("mp-refreshing", "1");
              } catch (e) {}
              document.documentElement.classList.add("mp-show-splash");
              window.scrollTo(0, 0);
              setTimeout(function () {
                location.reload();
              }, 120);
            }
          } else {
            shiftContent(0);
            hide();
          }
        }
        document.addEventListener("touchstart", onStart, { passive: true, capture: true });
        document.addEventListener("touchmove", onMove, { passive: false, capture: true });
        document.addEventListener("touchend", onEnd, { passive: true, capture: true });
        document.addEventListener("touchcancel", onEnd, { passive: true, capture: true });
      })(),
    (window.MPChat.catchUp = function () {
      return d && s ? ut() : Promise.resolve();
    }),
    (window.MPChat.openUserSheet = function (u, el) { return mpPB(u, el); }),
    (window.MPChat.openFullProfile = K),
    (window.MPChat.fadeSheetIn = Q),
    (window.MPChat.addBorderSparkles = Z),
    (window.MPChat.hasSparkles = F),
    document.addEventListener("mp-open-user-sheet", function (e) {
      e.detail && e.detail.username && mpPB(e.detail.username, e.detail.anchor);
    }),
    (window.MPChat.toggleMeMenu = vt),
    (window.MPChat.badgeHTML = M),
    (window.MPChat.avatarNode = J),
    (window.MPChat.badgeFor = P),
    (window.MPChat.getMe = function () {
      return s;
    }),
    (window.MPChat.api = E),
    (window.MPChat.closeMsgPopup = Ve),
    (window.MPChat.setPaused = st),
    (window.MPChat.isPaused = function () {
      return l;
    }),
    (window.MPChat.scrollToLatest = function () {
      var e = document.getElementById("journal");
      (e && !e.classList.contains("on")) || Ae();
    }),
    (window.MPChat.setGpRows = function (v) {
      v = String(v || "s1").toLowerCase();
      -1 === ["s1", "s2", "s3", "r1", "r2", "r3"].indexOf(v) && (v = "s1");
      try { localStorage.setItem("mp-gprows", v); } catch (_) {}
      document.documentElement.setAttribute("data-gprows", v);
    }));

  (function () {
    function wipe() { try { mpGpClearPreview({ instant: !0 }); } catch (_) {} }
    window.addEventListener("hashchange", wipe);
    window.addEventListener("popstate", wipe);
    window.addEventListener("pagehide", wipe);
    /* Mid-animation: kill flyer on hide so it can't stick above other UI; keep draft if still in chat. */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) mpGpKillFlyer();
    });
    var obs = null;
    try {
      obs = new MutationObserver(function () {
        var j = document.getElementById("journal");
        if (j && !j.classList.contains("on")) wipe();
      });
      var j0 = document.getElementById("journal");
      j0 && obs.observe(j0, { attributes: !0, attributeFilter: ["class"] });
    } catch (_) {}
  })();

})();
/* Voice typing (per dc): mic left of Send, recording bar morph, Whisper via /api/transcribe. Hidden until the Worker route is live. */
(function () {
  var API = "https://api.misereperdue.com/api/transcribe", ready = false, st = null;
  function toast(t) { try { window.mpHide && mpHide.toast ? mpHide.toast(t) : alert(t); } catch (_) {} }
  function hap(n) { try { window.haptic && window.haptic(n); } catch (_) {} }
  var red = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var prog = false, IOSW = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) || (/Safari/.test(navigator.userAgent) && !/Chrome|CriOS|Chromium|Edg|Firefox|FxiOS/.test(navigator.userAgent));
  fetch(API, { method: "GET" }).then(function (r) { if (r.status === 200 || r.status === 405) { window.MP_VOICE_READY = ready = true; mount(); r.json().then(function (j) { prog = !!(j && j.progressive); }).catch(function () {}); } }).catch(function () {});
  var MIC = '<span class="chat-mic-g"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 6.5C7 4.01472 9.01472 2 11.5 2C13.9853 2 16 4.01472 16 6.5V11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5V6.5Z"/><path d="M11.5 19H11.0828C7.57267 19 4.57706 16.4623 4 13M11.5 19H11.9172C15.4273 19 18.4229 16.4623 19 13M11.5 19V22"/></svg></span>';
  function mount() {
    if (!ready) return;
    var f = document.querySelector("#chat .chat-inputbar"); if (!f) return void setTimeout(mount, 800);
    if (f.querySelector(".chat-mic")) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "chat-mic"; b.setAttribute("aria-label", "Voice typing"); b.innerHTML = MIC;
    f.insertBefore(b, f.querySelector(".chat-send"));
    b.addEventListener("click", function (e) { e.preventDefault(); st ? stop() : start(f); });
  }
  new MutationObserver(function () { ready && mount(); }).observe(document.documentElement, { childList: true, subtree: true });
  /* iOS records AAC in mp4, which Whisper turbo chokes on (30-90s fallbacks, empty text): send 16kHz mono PCM WAV instead */
  function toWav(blob) {
    return blob.arrayBuffer().then(function (ab) {
      var AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
      return new Promise(function (ok, no) { ac.decodeAudioData(ab, ok, no); }).then(function (buf) {
        try { ac.close(); } catch (e) {}
        var R = 16000, n = Math.ceil(buf.duration * R), OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new OC(1, n, R), src = oc.createBufferSource();
        src.buffer = buf; src.connect(oc.destination); src.start(0);
        return new Promise(function (ok) { var pr = oc.startRendering(); pr && pr.then ? pr.then(ok) : (oc.oncomplete = function (e) { ok(e.renderedBuffer); }); });
      }).then(function (r) {
        var d = r.getChannelData(0), out = new DataView(new ArrayBuffer(44 + d.length * 2)), rms = 0;
        function w(o, t) { for (var i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); }
        w(0, "RIFF"); out.setUint32(4, 36 + d.length * 2, !0); w(8, "WAVEfmt "); out.setUint32(16, 16, !0); out.setUint16(20, 1, !0); out.setUint16(22, 1, !0);
        out.setUint32(24, 16000, !0); out.setUint32(28, 32000, !0); out.setUint16(32, 2, !0); out.setUint16(34, 16, !0); w(36, "data"); out.setUint32(40, d.length * 2, !0);
        for (var i = 0; i < d.length; i++) { var v = Math.max(-1, Math.min(1, d[i])); rms += v * v; out.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, !0); }
        return { blob: new Blob([out], { type: "audio/wav" }), rms: Math.sqrt(rms / Math.max(1, d.length)), dur: r.duration };
      });
    });
  }
  function pickType() {
    var t = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    for (var i = 0; i < t.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t[i])) return t[i];
    return "";
  }
  function bar(f) {
    var o = document.createElement("div"); o.className = "chat-vrec";
    o.innerHTML = '<button type="button" class="chat-vrec-x" aria-label="Cancel recording"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg></button><span class="chat-vrec-dot"></span><span class="chat-vrec-t">0:00</span><canvas class="chat-vrec-wv" aria-hidden="true"></canvas><span class="chat-vrec-hint">Can\'t hear you, check mic</span><span class="chat-vrec-busy">Transcribing…</span><button type="button" class="chat-vrec-ok" aria-label="Stop and transcribe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 14L8.5 17.5L19 6.5"/></svg></button>';
    var row = f.parentNode, mic = f.querySelector(".chat-mic");
    row.appendChild(o);
    if (mic) { var rr = row.getBoundingClientRect(), mr = mic.getBoundingClientRect(); o.style.transformOrigin = Math.round(mr.left + mr.width / 2 - rr.left) + "px 100%"; }
    o.offsetWidth; o.classList.add("in"); f.classList.add("is-rec");
    var m = document.querySelector("#chat .chat-msgs"), at = row.querySelector(".chat-attach:not([hidden])");
    at && (o.style.bottom = "calc(100% + " + Math.round(at.getBoundingClientRect().height + 16) + "px)");
    if (m) { var near = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80; m.style.setProperty("--vr-h", "64px"); near && setTimeout(function () { window.scrollTo(0, document.documentElement.scrollHeight); }, 30); }
    o.querySelector(".chat-vrec-x").onclick = function (e) { e.preventDefault(); cancel(); };
    o.querySelector(".chat-vrec-ok").onclick = function (e) { e.preventDefault(); stop(); };
    return o;
  }
  function start(f) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return toast("Voice typing isn't supported on this browser");
    if (!localStorage.getItem("chat_token")) return toast("Log in to use voice typing");
    var inp0 = f.querySelector("input"), ca = inp0.selectionStart != null ? inp0.selectionStart : inp0.value.length, cb = inp0.selectionEnd != null ? inp0.selectionEnd : ca;
    var AC0 = window.AudioContext || window.webkitAudioContext, ac0 = null;
    try { ac0 = new AC0(); ac0.resume && ac0.resume(); } catch (e) {} /* iOS: create + resume inside the tap, or the analyser reads flat */
    st = { f: f, ac: ac0, sid: Math.random().toString(36).slice(2) + Date.now().toString(36), chunks: [], t0: 0, pending: true, inp: inp0, orig: inp0.value, pre: inp0.value.slice(0, ca), post: inp0.value.slice(cb), live: "" };
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (s) {
      if (!st || !st.pending) return void s.getTracks().forEach(function (t) { t.stop(); });
      st.pending = false; st.s = s; var ty = pickType();
      try { st.rec = ty ? new MediaRecorder(s, { mimeType: ty }) : new MediaRecorder(s); } catch (e) { st.rec = new MediaRecorder(s); }
      st.type = st.rec.mimeType || ty || "audio/webm";
      st.rec.ondataavailable = function (e) { e.data && e.data.size && st && st.chunks.push(e.data); };
      st.rec.start(250); st.t0 = performance.now(); st.o = bar(f); hap(12);
      try { st.ac = st.ac || new (window.AudioContext || window.webkitAudioContext)(); st.ac.state === "suspended" && st.ac.resume(); st.an = st.ac.createAnalyser(); st.an.fftSize = 256; st.an.smoothingTimeConstant = 0.75; st.ac.createMediaStreamSource(s).connect(st.an); } catch (e) {}
      st.lv = []; loop();
      /* iOS WebKit: SpeechRecognition fights getUserMedia for the mic (flat audio, no words) - skip it there; live text comes from progressive Whisper when the Worker supports it */
      IOSW ? prog && progressive(st) : listen(st);
    }).catch(function () { st = null; toast("Microphone access was denied. Allow it in Settings to use voice typing."); });
  }
  /* V3 dot-column waveform (per dc): timeline of smoothed levels as columns of small dots, soft fade, tapered ends */
  function wave(x, w, h, d, L, T, lite) {
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    var G = 6, rows = 6, n = Math.floor(w / G), oy = (h - (rows - 1) * 5.2) / 2, ox = (w - (n - 1) * G) / 2;
    st.hist = st.hist || []; st.acc = (st.acc || 0) + (st.dtw || 0);
    while (st.acc >= 0.07) { st.acc -= 0.07; st.hist.push(L); st.hist.length > n && st.hist.shift(); } /* new column every 70ms */
    var col = lite ? "20,22,28" : "255,255,255", base = lite ? 0.16 : 0.14, hi = lite ? 0.85 : 0.95;
    for (var i = 0; i < n; i++) {
      var u = i / Math.max(1, n - 1) * 2 - 1, env = Math.exp(-u * u * 1.2), v = st.hist[st.hist.length - n + i] || 0;
      var br = red ? 0 : 0.5 + 0.5 * Math.sin(T * 2.2 - i * 0.18), lit = v * env * (rows / 2) + 0.35 + br * 0.25;
      for (var r = 0; r < rows; r++) {
        var k = Math.abs(r - (rows - 1) / 2) + 0.5, f = Math.max(0, Math.min(1, lit - k + 1));
        if (k < 1) f = Math.max(f, 0.3 + (red ? 0 : br * 0.25)); /* quiet: dim breathing centre rows */
        x.fillStyle = "rgba(" + col + "," + (base + (hi - base) * f * (0.55 + 0.45 * env)).toFixed(3) + ")";
        x.beginPath(); x.arc(ox + i * G, oy + r * 5.2, 1.3, 0, 6.2832); x.fill();
      }
    }
  }
  /* live text while speaking: browser SpeechRecognition for interim words; Whisper replaces it on stop */
  function put(s, t, cls) {
    var i = s.inp, pre = s.pre, post = s.post; t = String(t || "").replace(/\s+/g, " ").trim();
    var mid = t ? (pre && !/\s$/.test(pre) ? " " : "") + t + (post && !/^\s/.test(post) ? " " : "") : "";
    i.value = (pre + mid + post).slice(0, i.maxLength > 0 ? i.maxLength : 500);
    i.classList.toggle("is-live", cls === "live" && !!t);
    try { i.setSelectionRange(pre.length + mid.length, pre.length + mid.length); i.scrollLeft = i.scrollWidth; } catch (e) {}
    return mid;
  }
  function progressive(s) {
    var busy = 0;
    s.pt = setInterval(function () {
      if (st !== s || s.stopping || busy || !s.chunks.length) return;
      busy = 1;
      toWav(new Blob(s.chunks, { type: s.type.split(";")[0] })).then(function (a) {
        if (a.rms < 0.002 || a.blob.size > 2 * 1024 * 1024) return;
        return fetch(API, { method: "POST", headers: { "Content-Type": "audio/wav", "X-Voice-Session": s.sid, Authorization: "Bearer " + localStorage.getItem("chat_token") }, body: a.blob })
          .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.text && st === s && !s.stopping) { s.live = String(j.text).trim(); put(s, s.live, "live"); } });
      }).catch(function () {}).then(function () { busy = 0; });
    }, 3000);
  }
  function listen(s) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    try {
      var r = new SR(); r.continuous = true; r.interimResults = true; r.lang = navigator.language || "en-US";
      var fin = "";
      r.onresult = function (e) {
        if (st !== s) return; var tmp = "";
        for (var i = e.resultIndex; i < e.results.length; i++) e.results[i].isFinal ? (fin += e.results[i][0].transcript + " ") : (tmp += e.results[i][0].transcript);
        s.live = (fin + tmp).trim(); put(s, s.live, "live");
      };
      r.onerror = function () {}; r.onend = function () { st === s && !s.stopping && s.sr === r && setTimeout(function () { if (st === s && !s.stopping) try { r.start(); } catch (e) {} }, 120); };
      s.sr = r; r.start();
    } catch (e) { s.sr = null; }
  }
  function loop() {
    if (!st || !st.o) return;
    var el = (performance.now() - st.t0) / 1000;
    st.o.querySelector(".chat-vrec-t").textContent = Math.floor(el / 60) + ":" + ("0" + Math.floor(el % 60)).slice(-2);
    if (el >= 60) { toast("Stopped at 60 seconds"); return void stop(); }
    if (el > 1.5 && !st.heard && (st.pk || 0) < 0.012) { st.o.classList.add("is-deaf"); } else if ((st.pk || 0) >= 0.012 && !st.heard) { st.heard = 1; st.o.classList.remove("is-deaf"); }
    var cv = st.o.querySelector(".chat-vrec-wv"), w = cv.clientWidth, h = cv.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    var lvl = 0, now = performance.now(), dt = Math.min(0.1, (now - (st.tl || now)) / 1000); st.tl = now;
    if (st.an) { var a = new Uint8Array(st.an.fftSize); st.an.getByteTimeDomainData(a); for (var i = 0; i < a.length; i++) { var v = (a[i] - 128) / 128; lvl += v * v; } lvl = Math.min(1, Math.sqrt(lvl / a.length) * 4.5); }
    /* smoothed level: fast attack (~60ms), slow release (~250ms) */
    st.dtw = dt; st.pk = Math.max(st.pk || 0, lvl); st.sm = st.sm || 0; st.sm += (lvl - st.sm) * (1 - Math.exp(-dt / (lvl > st.sm ? 0.06 : 0.25)));
    wave(cv.getContext("2d"), w, h, d, st.sm, now / 1000, document.documentElement.getAttribute("data-theme") === "light");
    st.raf = requestAnimationFrame(loop);
  }
  function release() {
    if (!st) return;
    st.raf && cancelAnimationFrame(st.raf); st.stopping = true; st.pt && clearInterval(st.pt);
    try { st.sr && st.sr.abort(); } catch (e) {}
    st.s && st.s.getTracks().forEach(function (t) { t.stop(); });
    try { st.ac && st.ac.close(); } catch (e) {}
  }
  function close(s) {
    var f = s.f, o = s.o; f.classList.remove("is-rec"); s.inp && s.inp.classList.remove("is-live", "is-busy");
    var m = document.querySelector("#chat .chat-msgs"); m && m.style.setProperty("--vr-h", "0px");
    o && (o.classList.add("out"), setTimeout(function () { o.remove(); }, 260));
  }
  function cancel() { if (!st) return; var s = st; release(); try { s.rec && s.rec.state !== "inactive" && s.rec.stop(); } catch (e) {} st = null; s.inp && (s.inp.value = s.orig); s.o && close(s); hap(8); }
  function stop() {
    if (!st || !st.rec) return cancel();
    var s = st; release(); hap(12); s.o && s.o.classList.add("is-busy"); s.inp.classList.add("is-busy");
    function keep(msg) { st = null; close(s); if (s.live) { put(s, s.live); s.inp.focus(); s.inp.dispatchEvent(new Event("input", { bubbles: true })); } else msg && toast(msg); }
    s.rec.onstop = function () {
      var raw = new Blob(s.chunks, { type: s.type.split(";")[0] });
      if (raw.size < 800) return keep("Didn't catch that, try again");
      /* silent capture (e.g. iOS speech recognition holding the mic) but live text exists: keep it, skip Whisper */
      if (s.live && (s.pk || 0) < 0.02) return keep("");
      toWav(raw).catch(function () { return { blob: raw, rms: 1 }; }).then(function (a) {
        if (a.rms < 0.002 && s.live) return keep("");
        if (a.rms < 0.002) return keep(s.heard ? "Didn't catch that, try again" : "Couldn't hear you. Check the mic isn't in use by another app.");
        var body = a.blob.size <= 2 * 1024 * 1024 ? a.blob : raw.size <= 2 * 1024 * 1024 ? raw : null;
        if (!body) return keep("Recording too long");
        function send(n) {
          return fetch(API, { method: "POST", headers: (function () { var h = { "Content-Type": body.type || "audio/wav", Authorization: "Bearer " + localStorage.getItem("chat_token") }; prog && (h["X-Voice-Session"] = s.sid); return h; })(), body: body })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.status >= 500 && n < 1) return send(n + 1); if (!r.ok) throw new Error(j.error || "Couldn't transcribe, try again"); return j; }); }, function (e) { if (n < 1) return send(n + 1); throw e; });
        }
        send(0).then(function (j) {
          var t = String(j.text || "").trim();
          if (!t) return keep("Didn't catch that, try again");
          st = null; close(s); put(s, t); var i = s.inp;
          i.classList.remove("is-swap"); i.offsetWidth; i.classList.add("is-swap");
          i.dispatchEvent(new Event("input", { bubbles: true })); i.focus();
        }).catch(function (e) { keep(e.message || "Couldn't transcribe, try again"); });
      });
    };
    try { s.rec.state === "recording" && s.rec.requestData && s.rec.requestData(); } catch (e) {}
    try { s.rec.stop(); } catch (e) { keep("Couldn't transcribe, try again"); }
  }
  document.addEventListener("visibilitychange", function () { document.hidden && st && cancel(); });
  window.addEventListener("pagehide", function () { st && cancel(); });
})();
