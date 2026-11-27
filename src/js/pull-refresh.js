/* Shared pull-to-refresh for shop and product (dc t704u).
   Tracks the finger (1:1, then resistance), transform-only, in-place refresh,
   no full reload or splash. Other pages can reuse MPPullRefresh.attach(). */
(function () {
  "use strict";
  var hosts = [];

  function attach(opts) {
    if (!opts || typeof opts.refresh !== "function") return function () {};
    var host = {
      isActive: opts.isActive || function () { return true; },
      scroller: opts.scroller || function () { return window; },
      content: opts.content,
      refresh: opts.refresh
    };
    hosts.push(host);
    if (!bound) bind();
    return function () {
      var i = hosts.indexOf(host);
      if (i >= 0) hosts.splice(i, 1);
    };
  }

  var bound = false, startY = null, startX = 0, dist = 0, locked = 0, armed = 0, busy = 0, raf = 0, gen = 0;
  var active = null, THRESH = 64, REST = 44;
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  if (RM.addEventListener) RM.addEventListener("change", function () { RM = window.matchMedia("(prefers-reduced-motion: reduce)"); });
  var tip = null, ring = null, html = document.documentElement;

  function mountTip() {
    if (tip) return;
    tip = document.createElement("div");
    tip.className = "mp-pr";
    tip.setAttribute("aria-hidden", "true");
    tip.innerHTML = '<span class="mp-pr-ring"></span>';
    ring = tip.firstElementChild;
    (document.body || document.documentElement).appendChild(tip);
  }

  function current() {
    for (var i = 0; i < hosts.length; i++) {
      try { if (hosts[i].isActive()) return hosts[i]; } catch (e) {}
    }
    return null;
  }

  function scrollTopOf(el) {
    if (!el || el === window) return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return el.scrollTop || 0;
  }

  function isScrollable(el) {
    if (!el || el === document || el === document.documentElement || el === document.body) return false;
    try {
      var st = getComputedStyle(el);
      var oy = st.overflowY;
      if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
      return el.scrollHeight > el.clientHeight + 1;
    } catch (e) { return false; }
  }

  function scrollerFrom(target, host) {
    if (host && host.scroller) {
      try {
        var s = host.scroller();
        if (s) return s;
      } catch (e) {}
    }
    var el = target;
    while (el && el !== document && el !== document.documentElement) {
      if (isScrollable(el)) return el;
      el = el.parentElement;
    }
    return window;
  }

  function contentEl(host) {
    if (host && typeof host.content === "function") {
      try { return host.content() || null; } catch (e) { return null; }
    }
    return document.querySelector("#product.on, #shop.on");
  }

  function sheetOpen() {
    return !!(document.querySelector("#mp-dock.is-profile-bar, .is-profile-bar, .mp-pay-sheet, .chat-plus-menu.open, .chat-plus-menu.is-open"));
  }

  function isChrome(t) {
    /* Narrow: real chrome only. Do not skip product cards or other content. */
    return !!(t && t.closest && t.closest("#nav, .nav-wrap, #mp-dock, #mpd-scrim, .hero, .mp-pr, .chat-inputrow, .chat-inputbar, .chat-plus-menu, .mp-sheet, .mp-pay-sheet, input, textarea, select"));
  }

  /* 1:1 for the first 24px, then rubber resistance. GPU transform only. */
  function resisted(dy) {
    if (dy <= 24) return dy;
    var extra = dy - 24, max = 140;
    return 24 + extra * (1 - extra / (extra + max));
  }

  function setY(el, y, dragging) {
    if (!el) return;
    if (!y) {
      el.style.transition = RM.matches ? "none" : "transform .38s cubic-bezier(.32,.86,.28,1)";
      el.style.transform = "";
      if (!RM.matches) setTimeout(function () { if (el) el.style.transition = ""; }, 400);
    } else {
      el.style.transition = dragging || RM.matches ? "none" : "transform .38s cubic-bezier(.32,.86,.28,1)";
      el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
    }
  }

  function paint(p, y, dragging) {
    if (!tip) return;
    tip.classList.toggle("is-dragging", !!dragging);
    tip.classList.toggle("is-on", p > 0.02 || busy);
    tip.style.transform = "translate3d(0," + Math.max(0, y * 0.35).toFixed(2) + "px,0) scale(" + (0.86 + 0.14 * p).toFixed(3) + ")";
    tip.style.opacity = String(Math.max(0, Math.min(1, p * 1.15)));
    if (ring && !busy) ring.style.setProperty("--mp-pr-rot", Math.round(p * 180) + "deg");
  }

  function hide() {
    gen++;
    if (!busy && tip) {
      tip.classList.remove("is-on", "is-dragging", "is-busy");
      tip.style.transform = "";
      tip.style.opacity = "";
      if (ring) ring.style.removeProperty("--mp-pr-rot");
    }
  }

  function finish(el) {
    busy = 0;
    html.classList.remove("mp-pr-hold");
    if (tip) tip.classList.remove("is-busy", "is-dragging");
    setY(el, 0, false);
    paint(0, 0, false);
    setTimeout(hide, RM.matches ? 0 : 380);
  }

  function onStart(ev) {
    if (busy || !ev.touches || ev.touches.length !== 1) return;
    var host = current();
    if (!host || sheetOpen() || (ev.target && ev.target.closest && ev.target.closest(".mp-pay-sheet"))) {
      startY = null;
      return;
    }
    if (isChrome(ev.target)) { startY = null; return; }
    var sc = scrollerFrom(ev.target, host);
    if (scrollTopOf(sc) > 1) { startY = null; return; }
    active = host;
    startY = ev.touches[0].clientY;
    startX = ev.touches[0].clientX;
    locked = 0;
    dist = 0;
    armed = 0;
  }

  function onMove(ev) {
    if (busy || startY === null || !active) return;
    if (sheetOpen() || !active.isActive()) {
      startY = null; locked = 0; html.classList.remove("mp-pr-hold"); hide(); setY(contentEl(active), 0, false); active = null;
      return;
    }
    if (!ev.touches || !ev.touches.length) return;
    var y = ev.touches[0].clientY, x = ev.touches[0].clientX;
    var dy = y - startY, dx = x - startX;
    if (!locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (!(dy > 0 && dy > Math.abs(dx) * 1.25)) { locked = -1; startY = null; return; }
      if (scrollTopOf(scrollerFrom(ev.target, active)) > 1) { startY = null; return; }
      locked = 1;
      mountTip();
    }
    if (locked !== 1) return;
    if (ev.cancelable) ev.preventDefault();
    dist = Math.max(0, dy);
    var yOff = RM.matches ? Math.min(36, dist * 0.4) : resisted(dist);
    var p = Math.max(0, Math.min(1, yOff / THRESH));
    var g = ++gen;
    html.classList.add("mp-pr-hold");
    if (!raf) {
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (g !== gen || busy || !active) return;
        paint(p, yOff, true);
        setY(contentEl(active), yOff, true);
      });
    }
    if (p >= 1 && !armed) {
      armed = 1;
      try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
    }
    if (p < 1) armed = 0;
  }

  function onEnd() {
    if (busy) return;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (tip) tip.classList.remove("is-dragging");
    var host = active, el = contentEl(host);
    if (startY === null || locked !== 1 || !host) {
      startY = null; locked = 0; active = null;
      html.classList.remove("mp-pr-hold");
      hide();
      return;
    }
    var yOff = RM.matches ? Math.min(36, dist * 0.4) : resisted(dist);
    var go = yOff >= THRESH && !sheetOpen() && host.isActive();
    startY = null; locked = 0; active = null; dist = 0;
    if (!go) {
      html.classList.remove("mp-pr-hold");
      setY(el, 0, false);
      paint(0, 0, false);
      setTimeout(hide, RM.matches ? 0 : 380);
      return;
    }
    busy = 1;
    mountTip();
    if (tip) tip.classList.add("is-busy", "is-on");
    setY(el, REST, false);
    paint(1, REST, false);
    var done = false;
    function once() { if (done) return; done = true; finish(el); }
    var p = null;
    try { p = host.refresh(); } catch (e) { once(); return; }
    if (p && typeof p.then === "function") p.then(once, once);
    else once();
  }

  function bind() {
    if (bound) return;
    bound = true;
    var opts = { capture: true, passive: true };
    var move = { capture: true, passive: false };
    document.addEventListener("touchstart", onStart, opts);
    document.addEventListener("touchmove", onMove, move);
    document.addEventListener("touchend", onEnd, opts);
    document.addEventListener("touchcancel", onEnd, opts);
  }

  window.MPPullRefresh = { attach: attach };
})();

/* Default hook: shop + product pages. */
(function () {
  function whenReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  whenReady(function () {
    if (!window.MPPullRefresh) return;
    MPPullRefresh.attach({
      isActive: function () { return !!document.querySelector("#shop.on, #product.on"); },
      content: function () { return document.querySelector("#product.on, #shop.on"); },
      refresh: function () {
        if (window.MPShop && typeof MPShop.refreshInPlace === "function") {
          var p = MPShop.refreshInPlace();
          if (p && typeof p.then === "function") return p;
        }
        return Promise.resolve();
      }
    });
  });
})();
