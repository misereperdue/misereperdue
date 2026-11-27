/* Bottom nav v3 (per dc, from his "nav.mp4" reference): liquid glass shapes that morph between three states.
     tabs : [ Shop · Globe · Chat ] (glass lens on the current page)   [ (bag) ]   [ fm · you ]
     fm   : [ page ]  [ misery fm · live / now playing ]  [ you ]
     me   : [ page ]  [ fm ]  [ you · name · status  (bell) (status) ]
   Every shape is one absolutely positioned element; a state change moves/resizes them (CSS transitions with a
   small spring overshoot) while their labels blur-crossfade, like the reference. The status button grows into
   the status menu. Profile, notifications and other menus still grow out of #mp-dock (profile-cards.js).
   The old #nav buttons stay hidden and remain the navigation path (app.js show(), swipe-tabs). */
(function () {
  "use strict";
  var dock = document.getElementById("mp-dock");
  if (!dock || !document.documentElement.classList.contains("mp-bnav")) return;
  var html = document.documentElement, nav = document.getElementById("nav");
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var q = function (s) { return dock.querySelector(s); };
  var el = { back: q(".nv-back"), tabs: q(".nv-tabs"), bag: q(".nv-tab-bag"), rg: q(".nv-rg"), home: q(".nv-home"), fm: q(".nv-fm"), me: q(".nv-me") };
  var lens = q(".nv-lens"), tabBtns = [].slice.call(dock.querySelectorAll(".nv-tab"));
  var homeIc = q(".nv-home-ic"), fmIn = q(".nv-fm-in"), fmSub = q(".nv-fm-sub"), fmTag = q(".nv-fm-tag"), fmLive = q(".nv-live"), fmArt = q(".nv-fm-art"), fmIc = q(".nv-fm-ic"), fmEyes = q(".nv-fm-eyes"), fmLogo = q(".nv-fm-logo"), fmName = q(".nv-fm-name");
  var meAv = q(".mpd-av"), meName = q(".nv-name"), meSt = q(".nv-st"), sBadge = q(".nv-sbadge"), sBtn = q(".nv-sbtn"), bell = q(".nv-bell"), unread = q(".mpd-unread");
  var menu = q(".nv-smenu"), rows = [].slice.call(dock.querySelectorAll(".nv-srow"));
  var onlineB = q(".nv-online"), bagCount = q(".nv-count");
  var scrim = document.getElementById("mpd-scrim");
  var STATUS = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" };
  /* The pill keeps the shape the user last left it in (tabs / fm / you), across pages and reloads. No per-page rules. */
  var PREF_KEY = "mp-dock-state", pref = "tabs";
  try { pref = localStorage.getItem(PREF_KEY) || "tabs"; } catch (e) {}
  if (pref !== "fm" && pref !== "me") pref = "tabs";
  function hasToken() { try { return !!localStorage.getItem("chat_token"); } catch (e) { return false; } }
  var state = pref === "me" && !hasToken() ? "tabs" : pref, view = "", signedIn = false, onlineN = 0, unreadN = 0, kbLift = 0, away = false, lastBox = "";
  var H = 48, S = 44, G = 6, P = 4, C = 40;

  function panelView() { var p = document.querySelector("main.page > .panel.on"); return p ? p.id : "shop"; }
  function tabOf(v) { return v === "product" ? "shop" : v; }
  function menuOpen() { return dock.classList.contains("is-profile-bar"); }
  function cartCount() { try { return window.MP && MP.cartCount ? MP.cartCount() : 0; } catch (e) { return 0; } }
  function contentBack() {
    var p = document.querySelector("main.page > .panel.on");
    if (!p) return null;
    var list = p.querySelectorAll(".forum-head > .forum-back");
    for (var i = list.length - 1; i >= 0; i--) {
      var head = list[i].parentNode, host = head.parentElement;
      if (host && host.getClientRects().length && !head.closest("[hidden],[aria-hidden=true]")) return list[i];
    }
    return null;
  }

  /* ---------- layout: every shape's box for the current state ---------- */
  function box(e, x, y, w, h, r, show) {
    var s = e.style;
    s.left = x + "px"; s.top = y + "px"; s.width = w + "px"; s.height = h + "px"; s.setProperty("--h", h + "px"); s.borderRadius = (r == null ? h / 2 : r) + "px";
    e.classList.toggle("nv-off", !show);
    e.inert = !show;
  }
  function layout() {
    /* 88% of the screen width (per dc), the same as the chat bar under it. Under 90% matters in Safari: Safari 26
       treats a fixed element spanning 90%+ of the width at the bottom edge as a toolbar bar and fills the area
       behind its URL bar with a flat colour. */
    var W = Math.min(Math.floor(window.innerWidth * 0.88), 430), y = (H - S) / 2;
    dock.style.width = W + "px";
    /* Keep width in sync while a sheet is open so the reverse morph does not jump after a resize. */
    if (menuOpen()) return;
    dock.style.height = H + "px";
    var hasBack = !el.back.hidden, showMe = signedIn, rgW = showMe ? P + C + P + C + P : P + C + P;
    dock.setAttribute("data-state", state);
    if (state === "me" && !showMe) state = "tabs";
    if (state === "tabs") {
      var x = 0;
      box(el.back, 0, 0, H, H, null, hasBack); if (hasBack) x = H + G;
      var right = W - rgW - G;
      box(el.tabs, x, 0, right - x, H, null, true);
      box(el.rg, W - rgW, 0, rgW, H, null, true);
      box(el.fm, W - rgW + P, P, C, C, null, true);
      box(el.me, showMe ? W - rgW + P + C + P : W - rgW + P, P, C, C, null, showMe);
      box(el.home, x, y, S, S, null, false);
    } else {
      box(el.back, 0, y, S, S, null, false);
      box(el.home, 0, y, S, S, null, true);
      box(el.tabs, 0, y, S, S, null, false);
      if (state === "fm") {
        box(el.fm, S + G, y, showMe ? W - 2 * S - 2 * G : W - S - 2 * G, S, null, true);
        box(el.me, W - S, y, S, S, null, showMe);
        box(el.rg, W - S, y, S, S, null, false);
      } else {
        box(el.fm, S + G, y, S, S, null, true);
        box(el.me, 2 * S + 2 * G, y, W - 2 * S - 2 * G, S, null, true);
        box(el.rg, W - S, y, S, S, null, false);
      }
    }
    el.me.setAttribute("aria-hidden", showMe ? "false" : "true");
    if (showMe) el.me.removeAttribute("tabindex"); else el.me.setAttribute("tabindex", "-1");
    // fm/you sit inside the right group in tabs (no glass of their own), and are glass shapes otherwise
    [el.fm, el.me].forEach(function (e) { e.classList.toggle("nv-glass", state !== "tabs"); e.classList.toggle("nv-wide", e === (state === "fm" ? el.fm : state === "me" ? el.me : null)); });
    if (lastBox && lastBox !== state + W) L.followUntil = performance.now() + 560;
    seat(!lastBox);
    lastBox = state + W + (signedIn ? "i" : "o");
    place();
  }

  /* ---------- the tab lens (Apple Liquid Glass) ----------
     Driven by real springs every frame, not fixed keyframes, so it is smooth and can be grabbed or
     retargeted mid-flight. Press: the selected capsule lifts into clear glass, bigger than the bar, and
     the tabs under it are seen magnified through it. It travels to the new tab, stretching with its speed,
     lands with a soft overshoot, then sinks back into the tinted capsule. Hold and drag: it follows the
     finger; let go and it snaps to the nearest tab and opens it.
     Magnification: the lens holds a copy of the tab row scaled about its centre, and the real tabs get a
     lens-shaped hole (clip-path), so it works the same on iPhone Safari as in Chromium. */
  var lensRow = document.createElement("div");
  lensRow.className = "nv-lens-row"; lensRow.setAttribute("aria-hidden", "true");
  var lensClip = document.createElement("div"); lensClip.className = "nv-lens-clip";
  lensClip.appendChild(lensRow); lens.appendChild(lensClip);
  var L = { followUntil: 0, target: null, x: 0, v: 0, tx: 0, w: 0, wv: 0, tw: 0, l: 0, lv: 0, tl: 0, y: 4, h: 54, hold: false, drag: null, raf: 0, t: 0, lifted: false, holed: false };
  function curTab() { return tabBtns.filter(function (b) { return b.classList.contains("on") && !b.hidden; })[0] || null; }
  function aim(t) { if (!t) return; L.target = t; L.tx = t.offsetLeft; L.tw = t.offsetWidth; L.y = t.offsetTop; L.h = t.offsetHeight; }
  function cloneRow() {
    var html = "";
    tabBtns.forEach(function (b) {
      if (b.hidden) return;
      html += '<div class="' + b.className + '" style="position:absolute;left:' + b.offsetLeft + "px;top:" + b.offsetTop + "px;width:" + b.offsetWidth + "px;height:" + b.offsetHeight + 'px">' + b.innerHTML.replace(/<svg /g, '<svg data-ph="skip" ') + "</div>";
    });
    lensRow.innerHTML = html;
    lensRow.style.width = el.tabs.clientWidth + "px"; lensRow.style.height = el.tabs.clientHeight + "px";
  }
  function syncClone() {
    if (!L.lifted) return;
    var c = lensRow.children, i = 0;
    tabBtns.forEach(function (b) { if (!b.hidden && c[i]) { c[i].classList.toggle("on", b.classList.contains("on")); i++; } });
  }
  function capsule(x, y, w, h) {
    var r = Math.min(h, w) / 2;
    return "M" + (x + r) + " " + y + "H" + (x + w - r) + "A" + r + " " + r + " 0 0 1 " + (x + w - r) + " " + (y + h) + "H" + (x + r) + "A" + r + " " + r + " 0 0 1 " + (x + r) + " " + y + "Z";
  }
  function holes(on, lx, ly, lw, lh) {
    if (!on && !L.holed) return;
    L.holed = on;
    tabBtns.forEach(function (b) {
      if (!on || b.hidden) { b.style.clipPath = b.style.webkitClipPath = ""; return; }
      var bx = b.offsetLeft, by = b.offsetTop, bw = b.offsetWidth, bh = b.offsetHeight;
      if (lx > bx + bw || lx + lw < bx) { b.style.clipPath = b.style.webkitClipPath = ""; return; }
      var p = 'path(evenodd, "M-40 -40H' + (bw + 40) + "V" + (bh + 40) + 'H-40Z' + capsule(lx - bx, ly - by, lw, lh) + '")';
      b.style.clipPath = p; b.style.webkitClipPath = p;
    });
  }
  /* Resting lens: while it is neither lifted nor moving, its box is pure CSS (calc from the tab's index), so it
     rides along when the bar resizes (morphs, the bag or back button appearing) with no per-frame script or
     layout reads. Lifting or moving hands it back to the springs from where it actually is. */
  function restMode(on) {
    var s = lens.style;
    if (on) {
      var vis = tabBtns.filter(function (b) { return !b.hidden; }), t = curTab(), i = vis.indexOf(t), n = vis.length;
      if (!t || i < 0 || !n) return;
      var pad = parseFloat(getComputedStyle(el.tabs).paddingLeft) || 0;
      s.transform = "none";
      s.left = "calc(" + pad + "px + (100% - " + 2 * pad + "px) * " + i + " / " + n + ")";
      s.width = "calc((100% - " + 2 * pad + "px) / " + n + ")";
      s.top = pad + "px"; s.height = "calc(100% - " + 2 * pad + "px)";
      s.setProperty("--l", "0");
      L.rest = true;
    } else if (L.rest) {
      L.rest = false;
      L.x = lens.offsetLeft; L.w = lens.offsetWidth; L.v = L.wv = 0;
      s.left = ""; s.top = "";
    }
  }
  function render() {
    var l = Math.max(0, L.l), lc = Math.min(1, l), sp = Math.min(1, Math.abs(L.v) / 1400);
    var w = L.w + L.w * 0.34 * l + 22 * sp, h = L.h + 13 * l - 6 * sp;
    var cx = L.x + L.w / 2, cy = L.y + L.h / 2, left = cx - w / 2, top = cy - h / 2;
    var s = lens.style;
    s.width = w.toFixed(2) + "px"; s.height = h.toFixed(2) + "px";
    s.transform = "translate3d(" + left.toFixed(2) + "px," + top.toFixed(2) + "px,0)";
    s.setProperty("--l", lc.toFixed(3));
    var lift = l > 0.004 || L.hold;
    if (lift && !L.lifted) { L.lifted = true; cloneRow(); lens.classList.add("is-lens"); el.tabs.classList.add("is-gliding"); }
    else if (!lift && L.lifted) { L.lifted = false; lensRow.innerHTML = ""; lens.classList.remove("is-lens"); el.tabs.classList.remove("is-gliding"); }
    if (L.lifted) {
      lens.style.opacity = "";
      var m = 1 + 0.16 * lc;
      lensRow.style.transformOrigin = cx.toFixed(2) + "px " + cy.toFixed(2) + "px";
      lensRow.style.transform = "translate3d(" + (-left).toFixed(2) + "px," + (-top).toFixed(2) + "px,0) scale(" + m.toFixed(4) + ")";
    }
    holes(L.lifted, left, top, w, h);
    // the bar itself swells a touch while the glass is up (Apple)
    el.tabs.style.scale = L.lifted ? (1 + 0.035 * lc).toFixed(4) : "";
  }
  function spring(p, v, target, k, z, dt) { var a = -k * (p - target) - 2 * z * Math.sqrt(k) * v; v += a * dt; return [p + v * dt, v]; }
  function tick(now) {
    L.raf = 0;
    restMode(false);
    // keep aiming at the tab itself: the bar can be resizing under it (a morph, the bag appearing)
    if (!L.drag && L.target && L.target.isConnected && !L.target.hidden) aim(L.target);
    var follow = now < L.followUntil && !L.lifted;
    var dt = Math.min(0.034, Math.max(0.001, (now - (L.t || now - 16)) / 1000)); L.t = now;
    for (var n = Math.ceil(dt / 0.004), st = dt / n, i = 0; i < n; i++) {
      var r = spring(L.x, L.v, L.tx, L.drag ? 900 : 260, L.drag ? 0.9 : 0.74, st); L.x = r[0]; L.v = r[1];
      r = spring(L.w, L.wv, L.tw, 300, 0.85, st); L.w = r[0]; L.wv = r[1];
      r = spring(L.l, L.lv, L.tl, L.tl ? 520 : 240, L.tl ? 0.62 : 0.7, st); L.l = r[0]; L.lv = r[1];
    }
    if (follow) { L.x = L.tx; L.v = 0; L.w = L.tw; L.wv = 0; }
    // once it has nearly landed (and nobody is holding it) the glass sinks back in
    if (!L.hold && L.tl && Math.abs(L.x - L.tx) < 7 && Math.abs(L.v) < 160) L.tl = 0;
    var rest = !follow && !L.hold && !L.tl && Math.abs(L.x - L.tx) < 0.15 && Math.abs(L.v) < 4 && Math.abs(L.w - L.tw) < 0.15 && Math.abs(L.l) < 0.002 && Math.abs(L.lv) < 0.02;
    if (rest) { L.x = L.tx; L.v = 0; L.w = L.tw; L.wv = 0; L.l = 0; L.lv = 0; L.t = 0; render(); if (!curTab()) lens.style.opacity = "0"; else restMode(true); return; }
    render();
    L.raf = requestAnimationFrame(tick);
  }
  function kick() { if (!L.raf) { L.t = 0; L.raf = requestAnimationFrame(tick); } }
  function seat(instant) {
    var on = curTab();
    if (!on) { if (!L.lifted && !L.hold) lens.style.opacity = "0"; return; } // (mid page-swap: keep the glass)
    lens.style.opacity = "";
    aim(on);
    if (instant || RM.matches || state !== "tabs" || !L.w) {
      if (L.raf) cancelAnimationFrame(L.raf); L.raf = 0;
      L.x = L.tx; L.w = L.tw; L.v = L.wv = L.lv = 0; L.l = L.tl = 0; L.hold = false; L.drag = null;
      render(); restMode(true); return;
    }
    // at rest the CSS box already follows the bar; only the tab it marks may have changed
    if (L.rest && !L.raf && !L.hold && !L.tl && !L.lifted) { restMode(true); return; }
    kick();
  }
  function glide(t) { // travel to a tab as lifted glass
    if (!t) return;
    restMode(false); // start from where the glass actually is (the previous tab)
    aim(t);
    if (RM.matches || state !== "tabs") return seat(true);
    L.tl = 1; kick();
  }
  function tabAt(clientX) {
    var r = el.tabs.getBoundingClientRect(), x = clientX - r.left - el.tabs.clientLeft, best = null, bd = 1e9;
    tabBtns.forEach(function (b) { if (b.hidden) return; var d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x); if (d < bd) { bd = d; best = b; } });
    return best;
  }
  el.tabs.addEventListener("pointerdown", function (e) {
    if (state !== "tabs" || e.button > 0 || RM.matches) return;
    var t = tabAt(e.clientX); if (!t) return;
    L.drag = { id: e.pointerId, x0: e.clientX, moved: false, t: t };
    L.hold = true; L.tl = 1; aim(t); kick();
    try { el.tabs.setPointerCapture(e.pointerId); } catch (_) {}
  });
  el.tabs.addEventListener("pointermove", function (e) {
    var d = L.drag; if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) < 5) return;
    d.moved = true;
    var r = el.tabs.getBoundingClientRect(), pad = 4, w = L.tw;
    var x = Math.max(pad, Math.min(el.tabs.clientWidth - pad - w, e.clientX - r.left - w / 2));
    L.tx = x; kick();
  });
  function endPress(e, cancel) {
    var d = L.drag; if (!d || d.id !== e.pointerId) return;
    L.drag = null; L.hold = false;
    swallowClick = Date.now() + 450;
    var t = cancel ? curTab() : (d.moved ? tabAt(e.clientX) : d.t);
    if (!t) { L.tl = 0; kick(); return; }
    aim(t); kick();
    if (!cancel) go(t.getAttribute("data-view"));
  }
  el.tabs.addEventListener("pointerup", function (e) { endPress(e, false); });
  el.tabs.addEventListener("pointercancel", function (e) { endPress(e, true); });
  el.tabs.addEventListener("lostpointercapture", function (e) { if (L.drag && L.drag.id === e.pointerId) endPress(e, true); });
  window.addEventListener("pointerup", function (e) { if (L.drag) endPress(e, false); }, true);
  window.addEventListener("pointercancel", function (e) { if (L.drag) endPress(e, true); }, true);
  var swallowClick = 0;

  /* ---------- page state ---------- */
  /* sync runs for page, back-button, bag and sign-in changes. It does no work when nothing it shows has
     changed: it used to run (and force a layout) on every DOM change in the page, dozens of times per page
     switch, mid-animation. */
  var lastSig = "", needBack = true;
  function sync() {
    var v = panelView(), changed = v !== view, tv = tabOf(v), prev = null;
    tabBtns.forEach(function (b) { if (b.classList.contains("on")) prev = b; });
    view = v;
    if (changed) {
      html.setAttribute("data-mpd-view", v);
      needBack = true;
      tabBtns.forEach(function (b) {
        var on = b.getAttribute("data-view") === tv;
        b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false");
        if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      });
    }
    var cur = tabBtns.filter(function (b) { return b.classList.contains("on"); })[0] || tabBtns[0];
    var ic = cur.querySelector("svg");
    if (ic && homeIc._v !== tv) { homeIc._v = tv; homeIc.innerHTML = ic.outerHTML; }
    el.home.setAttribute("aria-label", (cur.getAttribute("aria-label") || "Pages") + ". Show pages");
    var n = cartCount();
    el.bag.hidden = !(n > 0);
    var label = n > 99 ? "99+" : String(n);
    if (bagCount.textContent !== label) {
      bagCount.textContent = label;
      if (n && bagCount.animate && !RM.matches) bagCount.animate([{ transform: "scale(.82)", opacity: .6 }, { transform: "none", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.32,.72,0,1)" });
    }
    el.bag.setAttribute("aria-label", "Bag, " + n + (n === 1 ? " item" : " items"));
    if (needBack) { needBack = false; el.back.hidden = !contentBack(); }
    onlineB.hidden = true;
    // Safari's mirrored backdrop would show the old page for a moment: let it rest while the page swaps
    if (changed) { dock.classList.add("nv-paging"); clearTimeout(sync._pg); sync._pg = setTimeout(function () { dock.classList.remove("nv-paging"); }, 400); }
    // a tab change glides from the old tab: take the lens out of its resting CSS box before the re-layout moves it
    if (changed && prev && cur !== prev && state === "tabs") restMode(false);
    var sig = [state, el.back.hidden, el.bag.hidden, signedIn, window.innerWidth].join("|");
    if (changed || sig !== lastSig) { lastSig = sig; layout(); }
    syncClone();
    if (changed && cur !== prev && prev && state === "tabs") glide(cur);
  }
  var syncFrame = 0;
  function soon() { if (!syncFrame) syncFrame = requestAnimationFrame(function () { syncFrame = 0; sync(); }); }

  function go(v) {
    var b = nav && nav.querySelector('button[data-view="' + v + '"]');
    if (v === panelView() && v !== "product") {
      if (v === "journal" && signedIn && window.MPOnlineList) return void MPOnlineList();
      return void window.scrollTo({ top: v === "journal" ? document.documentElement.scrollHeight : 0, behavior: RM.matches ? "auto" : "smooth" });
    }
    if (b) b.click(); else if (window.MPNav) MPNav.show(v);
  }

  /* ---------- states ---------- */
  function setState(s) {
    if (state === s || menuOpen()) return;
    closeMenu(true);
    state = s; pref = s;
    try { localStorage.setItem(PREF_KEY, s); } catch (e) {}
    dock.classList.add("nv-morphing");
    clearTimeout(setState._t); setState._t = setTimeout(function () { dock.classList.remove("nv-morphing"); }, 360);
    window.haptic && haptic(6);
    layout();
    fmPaint();
  }

  /* ---------- you: avatar mirrors the chat header's, plus status ---------- */
  var PERSON = meAv.innerHTML;
  function srcMe() { return document.querySelector("#journal .chat-head .chat-me") || document.querySelector("#forum .chat-head .chat-me"); }
  function myStatus() { return window.MPStatus ? MPStatus.mine() : "online"; }
  function paintStatus() {
    var st = myStatus();
    [sBadge, sBtn.querySelector(".nv-sico")].forEach(function (i) { i.className = i.className.replace(/nv-s-\w+/g, "").trim() + " nv-s-" + st; });
    meSt.textContent = STATUS[st] || "Online";
    sBtn.setAttribute("aria-label", "Status: " + (STATUS[st] || "Online"));
    sBtn.className = sBtn.className.replace(/nv-sb-\w+/g, "").trim() + " nv-sb-" + st;
    rows.forEach(function (r) { var on = r.getAttribute("data-s") === st; r.classList.toggle("is-on", on); r.setAttribute("aria-checked", on ? "true" : "false"); });
  }
  function avatar() {
    var src = srcMe(), user = window.MPAuthUser || (window.MPChat && MPChat.getMe && MPChat.getMe());
    var was = signedIn;
    signedIn = !!(user && src);
    dock.classList.toggle("is-signed-in", signedIn);
    bell.hidden = !signedIn; sBtn.hidden = !signedIn; sBadge.hidden = !signedIn;
    el.me.setAttribute("aria-label", signedIn ? "You" : "Sign in");
    meName.textContent = signedIn && user ? String(user.username || "").toLowerCase() : "Sign in";
    if (signedIn) {
      var face = src.querySelector(".chat-avatar-wrap") || src.firstElementChild;
      var key = face ? [].map.call(face.querySelectorAll("img"), function (i) { return i.getAttribute("src"); }).join("|") + "#" + face.textContent + "#" + face.className + "#" + face.querySelectorAll("*").length : "";
      if (key && meAv._key !== key) {
        meAv._key = key;
        var c = face.cloneNode(true);
        c.removeAttribute("id");
        [].forEach.call(c.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
        /* no badge on the nav pill (per dc): the avatar shows only the status dot */
        c.querySelectorAll(".chat-badge,.chat-badge-kitty,.chat-badge-mask,.chat-verified").forEach(function (n) { n.remove(); });
        meAv.replaceChildren(c);
      }
      window.MPPwDock && MPPwDock(); // hat, Sphere and other avatar powers on the nav avatar
    } else if (meAv._key !== "") { meAv._key = ""; meAv.innerHTML = PERSON; if (state === "me") state = "tabs"; }
    unread.hidden = true;
    paintStatus();
    if (was !== signedIn) { if (!menuOpen() && signedIn && pref === "me" && state !== "me") state = "me"; sync(); fmPaint(); }
  }
  var avFrame = 0;
  function avSoon() { if (!avFrame) avFrame = requestAnimationFrame(function () { avFrame = 0; avatar(); }); }

  /* ---------- misery fm bubble ---------- */
  function fmPaint() {
    var F = window.MPFM, st = F && F.menuStatus ? F.menuStatus() : null, live = !!(st && st.live);
    var c = live && F._calc ? F._calc() : null, tr = c && c.tr, n = (F && F.state && F.state() && F.state().listeners) || 0;
    var src = (tr && tr.art && F.artUrl) ? F.artUrl(tr) : "";
    var name = "misery fm", sub = live ? "is live" : "is off air";
    if (!live && st && st.scheduled && st.text) sub = "Live in " + st.text;
    if (fmName && fmName.textContent !== name) fmName.textContent = name;
    if (fmSub.textContent !== sub) fmSub.textContent = sub;
    if (fmLogo) fmLogo.hidden = true;
    fmTag.hidden = true;
    fmLive.hidden = !live;
    if (fmArt) {
      if (live && src) {
        if (fmArt.getAttribute("src") !== src) fmArt.src = src;
        fmArt.hidden = false;
      } else {
        if (fmArt.getAttribute("src")) fmArt.removeAttribute("src");
        fmArt.hidden = true;
      }
    }
    if (fmEyes) fmEyes.hidden = !!live;
    if (fmIc) fmIc.hidden = !live || !!src;
    el.fm.classList.toggle("is-live", live);
    el.fm.classList.toggle("is-off", !live);
    el.fm.classList.toggle("has-art", !!(live && src));
    var aria = live ? "misery fm is live" : (sub && sub !== "is off air" ? "misery fm is off air. " + sub : "misery fm is off air");
    el.fm.setAttribute("aria-label", aria);
  }
  setInterval(fmPaint, 1500);

  /* the misery fm player opens through MPProfiles.openSheet (misery-fm.js), the same morph as the profile sheet */
  function openFm() { if (window.MPFM && MPFM.open) MPFM.open(); }

  /* ---------- status menu: grows out of the status button ---------- */
  var menuIsOpen = false;
  function openMenu() {
    if (menuIsOpen || !signedIn) return;
    menuIsOpen = true;
    menu.getAnimations().concat(menu.firstElementChild.getAnimations()).forEach(function (x) { x.cancel(); });
    paintStatus();
    var dr = dock.getBoundingClientRect(), br = sBtn.getBoundingClientRect();
    var mw = 214, mh = rows.length * 44 + 12, right = dr.right - br.right - 2;
    var x = dr.width - right - mw, y = -mh - 10;
    menu.hidden = false;
    Object.assign(menu.style, { left: x + "px", top: y + "px", width: mw + "px", height: mh + "px", borderRadius: "24px" });
    menu.classList.add("is-open");
    sBtn.setAttribute("aria-expanded", "true");
    html.classList.add("nv-menu-open");
    if (!RM.matches && menu.animate) {
      var bx = br.left - dr.left, by = br.top - dr.top;
      menu.animate([
        { left: bx + "px", top: by + "px", width: br.width + "px", height: br.height + "px", borderRadius: br.height / 2 + "px" },
        { left: x + "px", top: y + "px", width: mw + "px", height: mh + "px", borderRadius: "24px" }
      ], { duration: 520, easing: "cubic-bezier(.3,1.2,.4,1)" });
      menu.firstElementChild.animate([{ opacity: 0, filter: "blur(8px)", transform: "scale(.92)" }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: 360, delay: 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    }
    (rows.filter(function (r) { return r.classList.contains("is-on"); })[0] || rows[0]).focus({ preventScroll: true });
  }
  function closeMenu(fast, chosen) {
    if (!menuIsOpen) return;
    menuIsOpen = false;
    sBtn.setAttribute("aria-expanded", "false");
    html.classList.remove("nv-menu-open");
    var done = function () { menu.hidden = true; menu.classList.remove("is-open"); if (chosen) pop(); };
    if (fast || RM.matches || !menu.animate) return done();
    var dr = dock.getBoundingClientRect(), br = sBtn.getBoundingClientRect();
    // the rows fade first and stay faded; the glass shrinks back into the button and fades out as it lands,
    // then everything is hidden before any animation is released (releasing earlier flashed the rows back)
    var inner = menu.firstElementChild;
    menu.getAnimations().concat(inner.getAnimations()).forEach(function (x) { x.cancel(); });
    inner.animate([{ opacity: 1, filter: "blur(0)", transform: "none" }, { opacity: 0, filter: "blur(6px)", transform: "scale(.94)" }], { duration: 160, easing: "ease-out", fill: "forwards" });
    var a = menu.animate([
      { left: menu.style.left, top: menu.style.top, width: menu.style.width, height: menu.style.height, borderRadius: "24px", opacity: 1 },
      { opacity: 1, offset: 0.7 },
      { left: br.left - dr.left + "px", top: br.top - dr.top + "px", width: br.width + "px", height: br.height + "px", borderRadius: br.height / 2 + "px", opacity: 0 }
    ], { duration: 380, easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" });
    var fin = false;
    a.onfinish = function () {
      if (fin || menuIsOpen) return; fin = true;
      done();
      menu.getAnimations().concat(inner.getAnimations()).forEach(function (x) { x.cancel(); });
    };
  }
  function pop() {
    var i = sBtn.querySelector(".nv-sico");
    if (i.animate && !RM.matches) i.animate([{ transform: "scale(.4) rotate(-40deg)", opacity: 0 }, { transform: "scale(1.18)", opacity: 1, offset: 0.6 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.3,1.3,.4,1)" });
  }
  rows.forEach(function (r) {
    r.addEventListener("click", function (e) {
      e.stopPropagation();
      var st = r.getAttribute("data-s");
      window.haptic && haptic(10);
      rows.forEach(function (x) { x.classList.toggle("is-on", x === r); });
      setTimeout(function () { closeMenu(false, true); if (window.MPStatus) MPStatus.set(st); }, 120);
    });
  });
  /* status picker (per dc): a sheet that morphs out of the nav pill, like notifications and misery fm */
  var CHK = '<svg class="mp-st-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function openStatusSheet() {
    if (!signedIn || !window.MPProfiles || !MPProfiles.openSheet) return false;
    var sheet = MPProfiles.openSheet({ title: "Status", owner: "status", bodyClass: "mp-st-sheet" });
    if (!sheet) return false;
    var cur = myStatus(), list = document.createElement("div"), done = false;
    list.className = "mp-st-list"; list.setAttribute("role", "radiogroup"); list.setAttribute("aria-label", "Status");
    ["online", "idle", "dnd", "invisible"].forEach(function (st) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "mp-st-row" + (st === cur ? " is-on" : "");
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", st === cur ? "true" : "false");
      b.innerHTML = '<i class="nv-sico nv-s-' + st + '" aria-hidden="true"></i><span></span>' + CHK;
      b.querySelector("span").textContent = STATUS[st];
      b.addEventListener("click", function () {
        if (done) return; done = true;
        window.haptic && haptic(10);
        [].forEach.call(list.children, function (x) { var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-checked", on ? "true" : "false"); });
        if (window.MPStatus && st !== cur) MPStatus.set(st);
        setTimeout(function () { sheet.close(); setTimeout(pop, 380); }, 180);
      });
      list.appendChild(b);
    });
    sheet.body.appendChild(list);
    sheet.resize && sheet.resize();
    return true;
  }
  sBtn.addEventListener("click", function (e) { e.stopPropagation(); if (menuIsOpen) return closeMenu(); if (!openStatusSheet()) openMenu(); });
  menu.addEventListener("keydown", function (e) {
    var i = rows.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); rows[(i + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length].focus(); }
  });

  /* ---------- taps ---------- */
  tabBtns.forEach(function (b) {
    b.addEventListener("click", function (e) {
      if (Date.now() < swallowClick) return;
      go(b.getAttribute("data-view"));
    });
  });
  el.back.addEventListener("click", function () { var b = contentBack(); b && b.click(); });
  el.home.addEventListener("click", function () { setState("tabs"); });
  el.fm.addEventListener("click", function () {
    if (state === "fm") { openFm(); return; }
    setState("fm");
  });
  el.me.addEventListener("click", function (e) {
    if (e.target.closest(".nv-mini")) return;
    if (!signedIn) return void go("journal");
    if (state !== "me") return void setState("me");
    var src = srcMe();
    if (src) src.click(); else if (window.MPOpenProfile) MPOpenProfile();
  });
  [el.fm, el.me].forEach(function (x) { x.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === x) { e.preventDefault(); x.click(); } }); });
  document.addEventListener("pointerdown", function (e) {
    html.classList.remove("mp-kbd");
    if (menuIsOpen && !menu.contains(e.target) && !sBtn.contains(e.target)) closeMenu();
  }, true);
  // keyboard users get focus rings in the nav and its sheets; touch and mouse do not (no stray outline on open)
  document.addEventListener("keydown", function (e) { if (e.key === "Tab" || e.key.indexOf("Arrow") === 0) html.classList.add("mp-kbd"); }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (menuIsOpen) { e.preventDefault(); closeMenu(); sBtn.focus({ preventScroll: true }); }
    else if (state !== "tabs" && !menuOpen()) setState("tabs");
  });
  scrim && scrim.addEventListener("click", function () { closeMenu(); });

  /* ---------- where it sits: above the message box in Chat, else the bottom edge ---------- */
  function place() {
    if (html.classList.contains("fm-lock")) return;
    var b = null, v = panelView();
    if (kbLift) b = kbLift;
    else if (v === "journal") {
      var ir = document.querySelector("#journal .chat-inputrow");
      if (ir && ir.style.bottom) return;
      if (ir && ir.offsetHeight) b = Math.round((parseFloat(getComputedStyle(ir).bottom) || 0) + ir.offsetHeight + 10);
    }
    var cur = parseFloat(html.style.getPropertyValue("--mpd-b")) || 0;
    if (b) { if (Math.abs(b - cur) > 1) html.style.setProperty("--mpd-b", b + "px"); }
    else if (cur) html.style.removeProperty("--mpd-b");
    /* Page room is worked out from where the pill is going, not where its slide currently is (no stale gap after a page change). */
    if (!menuOpen() && !away) { if (b) html.style.setProperty("--mpd-clear", Math.round(b + H + 8) + "px"); else html.style.removeProperty("--mpd-clear"); }
  }

  /* ---------- typing: the bar steps aside ---------- */
  function isField(t) { return t && t.closest && t.closest('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select,[contenteditable]:not([contenteditable=false])'); }
  var awayT = 0;
  function setAway(on) {
    clearTimeout(awayT);
    if (on === away) return;
    if (!on) place();
    away = on;
    var inChat = panelView() === "journal", pinned = inChat && document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 140;
    html.classList.toggle("mpd-typing", on && inChat);
    if (!on && pinned) [40, 300].forEach(function (d) { setTimeout(function () { if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 220) window.scrollTo(0, document.documentElement.scrollHeight); }, d); });
    dock.classList.toggle("mpd-away", on);
    dock.inert = on && !menuOpen();
    if (on) closeMenu(true);
  }
  /* keyboard background (per dc): the page is navy, not transparent, from the moment a field is focused */
  document.addEventListener("focusin", function (e) { if (isField(e.target)) { clearTimeout(kbT); html.classList.add("mp-kb"); } }, true);
  var kbT = 0;
  document.addEventListener("focusout", function (e) { if (!isField(e.target)) return; clearTimeout(kbT); kbT = setTimeout(function () { if (!isField(document.activeElement)) html.classList.remove("mp-kb"); }, 450); }, true);
  document.addEventListener("focusin", function (e) {
    if (!isField(e.target) || dock.contains(e.target) || e.target.closest(".mp-pay-sheet")) return;
    clearTimeout(awayT);
    if (away) return;
    var t = e.target;
    awayT = setTimeout(function () { if (document.activeElement === t) setAway(true); }, 90);
  });
  document.addEventListener("focusout", function (e) {
    if (!isField(e.target)) return;
    awayT = setTimeout(function () { if (!isField(document.activeElement) || dock.contains(document.activeElement)) setAway(false); place(); }, 120);
  });
  function vv() {
    var v = window.visualViewport;
    if (!v) return;
    var hidden = Math.round(window.innerHeight - (v.offsetTop + v.height));
    var lift = menuOpen() && hidden > 80 && dock.contains(document.activeElement) ? hidden + 10 : 0;
    if (lift !== kbLift) { kbLift = lift; place(); }
  }
  if (window.visualViewport) { visualViewport.addEventListener("resize", vv); visualViewport.addEventListener("scroll", vv); }

  /* ---------- watch ---------- */
  if (nav && window.MutationObserver) new MutationObserver(soon).observe(nav, { subtree: true, attributes: true, childList: true, characterData: true, attributeFilter: ["class", "style", "hidden"] });
  var page = document.querySelector("main.page");
  function backNode(n) { return n && n.nodeType === 1 && (n.matches(".forum-head, .forum-back") || !!n.querySelector(".forum-back")); }
  function pageMatters(ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], t = m.target;
      if (t === page || t.parentElement === page) { needBack = true; return true; } // a panel switched (.on)
      if (t.closest && t.closest(".forum-head, #forum")) { needBack = true; return true; } // Globe: its back button may have come or gone
      for (var j = 0; j < m.addedNodes.length; j++) if (backNode(m.addedNodes[j])) { needBack = true; return true; }
      for (j = 0; j < m.removedNodes.length; j++) if (backNode(m.removedNodes[j])) { needBack = true; return true; }
    }
    return false; // chat messages, effects and other page activity do not concern the pill
  }
  if (page && window.MutationObserver) new MutationObserver(function (ms) { if (pageMatters(ms)) soon(); }).observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
  [document.getElementById("journal"), document.getElementById("forum")].forEach(function (r) {
    if (r && window.MutationObserver) new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t === r || (t.closest && t.closest(".chat-head"))) return avSoon(); }
    }).observe(r, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "class", "style"] });
  });
  var wasMenu = false;
  new MutationObserver(function () {
    var m = menuOpen();
    if (m === wasMenu) return;
    wasMenu = m;
    html.classList.toggle("mpd-is-menu", m);
    if (m) { closeMenu(true); if (away) { dock.classList.remove("mpd-away"); dock.inert = false; } }
    else { if (away) dock.classList.add("mpd-away"); layout(); }
    vv();
  }).observe(dock, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("mp-auth", function () { avSoon(); setTimeout(avSoon, 300); });
  document.addEventListener("mp-status", function () { paintStatus(); });
  document.addEventListener("mp-unread", function (e) {
    unreadN = Math.max(0, Number(e.detail && e.detail.count) || 0);
    unread.hidden = true;
  });
  window.addEventListener("resize", function () { layout(); });
  window.addEventListener("orientationchange", function () { layout(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { seat(true); });
  var ir = null;
  setInterval(function () {
    var n = document.querySelector("#journal .chat-inputrow");
    if (n !== ir) { ir = n; if (n && window.ResizeObserver) new ResizeObserver(function () { place(); }).observe(n); place(); }
  }, 1000);

  window.MPDock = {
    el: dock,
    sync: sync,
    expand: function () { setState("tabs"); },
    collapse: function () { setState("tabs"); },
    state: function (s) { if (s) setState(s); return state; },
    online: function (n) { onlineN = Math.max(0, Number(n) || 0); soon(); },
    fm: fmPaint,
    topInset: function () { var p = document.getElementById("mpd-probe"); return p ? p.getBoundingClientRect().height : 0; }
  };
  avatar();
  sync();
  fmPaint();
  seat(true);
  requestAnimationFrame(function () { dock.classList.add("is-ready"); });
})();
