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
  var homeIc = q(".nv-home-ic"), fmIn = q(".nv-fm-in"), fmSub = q(".nv-fm-sub"), fmTag = q(".nv-fm-tag"), fmLive = q(".nv-live");
  var meAv = q(".mpd-av"), meName = q(".nv-name"), meSt = q(".nv-st"), sBadge = q(".nv-sbadge"), sBtn = q(".nv-sbtn"), bell = q(".nv-bell"), unread = q(".mpd-unread");
  var menu = q(".nv-smenu"), rows = [].slice.call(dock.querySelectorAll(".nv-srow"));
  var onlineB = q(".nv-online"), bagCount = q(".nv-count");
  var scrim = document.getElementById("mpd-scrim");
  var STATUS = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" };
  var state = "tabs", view = "", signedIn = false, onlineN = 0, unreadN = 0, kbLift = 0, away = false, lastBox = "";
  var H = 62, S = 56, G = 8, P = 6, C = 50;

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
    if (menuOpen()) return;
    var W = Math.min(window.innerWidth - 20, 430), y = (H - S) / 2;
    dock.style.width = W + "px"; dock.style.height = H + "px";
    var hasBack = !el.back.hidden, rgW = P + C + P + C + P;
    dock.setAttribute("data-state", state);
    if (state === "tabs") {
      var x = 0;
      box(el.back, 0, 0, H, H, null, hasBack); if (hasBack) x = H + G;
      var right = W - rgW - G;
      box(el.tabs, x, 0, right - x, H, null, true);
      box(el.rg, W - rgW, 0, rgW, H, null, true);
      box(el.fm, W - rgW + P, P, C, C, null, true);
      box(el.me, W - rgW + P + C + P, P, C, C, null, true);
      box(el.home, x, y, S, S, null, false);
    } else {
      box(el.back, 0, y, S, S, null, false);
      box(el.home, 0, y, S, S, null, true);
      box(el.tabs, 0, y, S, S, null, false);
      if (state === "fm") {
        box(el.fm, S + G, y, W - 2 * S - 2 * G, S, null, true);
        box(el.me, W - S, y, S, S, null, true);
        box(el.rg, W - S, y, S, S, null, false);
      } else {
        box(el.fm, S + G, y, S, S, null, true);
        box(el.me, 2 * S + 2 * G, y, W - 2 * S - 2 * G, S, null, true);
        box(el.rg, W - S, y, S, S, null, false);
      }
    }
    // fm/you sit inside the right group in tabs (no glass of their own), and are glass shapes otherwise
    [el.fm, el.me].forEach(function (e) { e.classList.toggle("nv-glass", state !== "tabs"); e.classList.toggle("nv-wide", e === (state === "fm" ? el.fm : state === "me" ? el.me : null)); });
    seat(!lastBox);
    lastBox = state + W;
    place();
  }

  /* ---------- the tab lens ---------- */
  function seatX(t) { return t.offsetLeft; }
  function seat(instant) {
    var on = tabBtns.filter(function (b) { return b.classList.contains("on"); })[0];
    if (!on) { lens.style.opacity = "0"; return; }
    lens.style.opacity = "";
    if (instant) lens.style.transition = "none";
    lens.style.width = on.offsetWidth + "px";
    lens.style.transform = "translateX(" + seatX(on) + "px)";
    if (instant) { void lens.offsetWidth; lens.style.transition = ""; }
  }
  /* Liquid Glass tab switch (reference frames): the selected capsule lifts off the bar as clear magnifying
     glass, taller than the bar, swells and stretches as it travels, overshoots a hair, then sinks back into the
     tinted capsule, and only then does the new tab take the accent colour. Interrupting restarts from where it is. */
  var glideAnim = null;
  function lensX() {
    var m = getComputedStyle(lens).transform;
    if (m && m !== "none") { var v = m.match(/-?[\d.e]+/g); if (v && v.length >= 6) return parseFloat(v[4]); }
    return null;
  }
  function glide(from, to) {
    if (RM.matches || !lens.animate || from == null || Math.abs(from - to) < 2) return seat();
    if (glideAnim) { var cx = lensX(); glideAnim.cancel(); if (cx != null) from = cx; }
    var d = to - from, dir = d > 0 ? 1 : -1, far = Math.min(1, Math.abs(d) / 160);
    var sx = 1.42 + 0.1 * far, sy = 1.24;
    lens.classList.add("is-lens");
    el.tabs.classList.add("is-gliding");
    lens.style.transition = "none";
    lens.style.transform = "translateX(" + to + "px)";
    var a = glideAnim = lens.animate([
      { transform: "translateX(" + from + "px) scale(1,1)", easing: "cubic-bezier(.3,0,.2,1)" },
      { transform: "translateX(" + (from + d * 0.06) + "px) scale(1.3,1.2)", offset: 0.16, easing: "cubic-bezier(.45,0,.25,1)" },
      { transform: "translateX(" + (from + d * 0.55) + "px) scale(" + sx + "," + sy + ")", offset: 0.46, easing: "cubic-bezier(.2,.6,.3,1)" },
      { transform: "translateX(" + (to + dir * 4) + "px) scale(1.34,1.2)", offset: 0.7, easing: "cubic-bezier(.4,0,.3,1)" },
      { transform: "translateX(" + to + "px) scale(1.2,1.12)", offset: 0.8, easing: "cubic-bezier(.3,0,.2,1)" },
      { transform: "translateX(" + (to - dir * 0.5) + "px) scale(.97,.96)", offset: 0.92 },
      { transform: "translateX(" + to + "px) scale(1,1)" }
    ], { duration: 760 });
    // the clear glass goes back to the tinted capsule as it sinks in
    var t = setTimeout(function () { lens.classList.remove("is-lens"); }, 600);
    a.onfinish = a.oncancel = function () {
      clearTimeout(t);
      if (glideAnim !== a) return;
      glideAnim = null; lens.classList.remove("is-lens"); el.tabs.classList.remove("is-gliding"); lens.style.transition = "";
    };
  }
  var drag = null;
  el.tabs.addEventListener("pointerdown", function (e) {
    if (state !== "tabs" || e.button > 0) return;
    var x0 = glideAnim ? lensX() : null;
    if (glideAnim) { glideAnim.cancel(); }
    drag = { id: e.pointerId, x: e.clientX, x0: x0 != null ? x0 : (parseFloat((lens.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0), moved: false };
  });
  el.tabs.addEventListener("pointermove", function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 8) return;
    if (!drag.moved) { drag.moved = true; lens.classList.add("is-lens", "is-drag"); try { el.tabs.setPointerCapture(e.pointerId); } catch (_) {} }
    var max = el.tabs.clientWidth - lens.offsetWidth - 4, x = Math.max(4, Math.min(max, drag.x0 + dx));
    lens.style.transition = "none"; lens.style.transform = "translateX(" + x + "px) scale(1.42,1.22)";
    drag.cur = x;
  });
  function endDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var d = drag; drag = null;
    if (!d.moved) return;
    d.swallow = true; swallowClick = Date.now() + 350;
    lens.classList.remove("is-drag");
    var mid = d.cur + lens.offsetWidth / 2, best = tabBtns[0], bd = 1e9;
    tabBtns.forEach(function (b) { if (b.hidden) return; var c = b.offsetLeft + b.offsetWidth / 2, dd = Math.abs(c - mid); if (dd < bd) { bd = dd; best = b; } });
    var x = seatX(best);
    if (lens.animate && !RM.matches) {
      var a = lens.animate([{ transform: "translateX(" + d.cur + "px) scale(1.42,1.22)" }, { transform: "translateX(" + x + "px) scale(1.2,1.12)", offset: 0.45 }, { transform: "translateX(" + x + "px) scale(.97,.96)", offset: 0.78 }, { transform: "translateX(" + x + "px) scale(1,1)" }], { duration: 460, easing: "cubic-bezier(.3,0,.2,1)" });
      a.onfinish = a.oncancel = function () { lens.classList.remove("is-lens"); lens.style.transition = ""; };
    } else lens.classList.remove("is-lens");
    lens.style.transform = "translateX(" + x + "px)";
    if (!best.classList.contains("on")) { noGlide = Date.now() + 600; go(best.getAttribute("data-view")); }
  }
  el.tabs.addEventListener("pointerup", endDrag);
  el.tabs.addEventListener("pointercancel", endDrag);
  var swallowClick = 0, noGlide = 0; // a drag already carried the lens there

  /* ---------- page state ---------- */
  function sync() {
    var v = panelView(), changed = v !== view, tv = tabOf(v), prev = null;
    tabBtns.forEach(function (b) { if (b.classList.contains("on")) prev = b; });
    var fromX = prev ? seatX(prev) : null;
    view = v;
    html.setAttribute("data-mpd-view", v);
    tabBtns.forEach(function (b) {
      var on = b.getAttribute("data-view") === tv;
      b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false");
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var cur = tabBtns.filter(function (b) { return b.classList.contains("on"); })[0] || tabBtns[0];
    var ic = cur.querySelector("svg");
    if (ic && homeIc._v !== tv) { homeIc._v = tv; homeIc.innerHTML = ic.outerHTML; }
    el.home.setAttribute("aria-label", (cur.textContent || "").trim() + ". Show pages");
    var n = cartCount();
    el.bag.hidden = !(n > 0);
    bagCount.textContent = n > 99 ? "99+" : String(n);
    el.bag.setAttribute("aria-label", "Bag, " + n + (n === 1 ? " item" : " items"));
    el.back.hidden = !contentBack();
    onlineB.hidden = !(signedIn && onlineN > 0);
    onlineB.textContent = onlineN > 99 ? "99+" : String(onlineN);
    if (changed && state !== "tabs") state = "tabs";
    layout();
    if (changed && cur !== prev && fromX != null && state === "tabs" && Date.now() > noGlide) glide(fromX, seatX(cur));
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
    state = s;
    dock.classList.add("nv-morphing");
    clearTimeout(setState._t); setState._t = setTimeout(function () { dock.classList.remove("nv-morphing"); }, 420);
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
        meAv.replaceChildren(c);
      }
      window.MPPwDock && MPPwDock(); // hat, Sphere and other avatar powers on the nav avatar
    } else if (meAv._key !== "") { meAv._key = ""; meAv.innerHTML = PERSON; if (state === "me") state = "tabs"; }
    unread.hidden = !(unreadN > 0 && signedIn);
    paintStatus();
    if (was !== signedIn) sync();
  }
  var avFrame = 0;
  function avSoon() { if (!avFrame) avFrame = requestAnimationFrame(function () { avFrame = 0; avatar(); }); }

  /* ---------- misery fm bubble ---------- */
  function fmPaint() {
    var F = window.MPFM, st = F && F.menuStatus ? F.menuStatus() : null, live = !!(st && st.live), sub = "Off air";
    if (live) {
      var c = F._calc && F._calc(), S2 = F.state && F.state(), n = (S2 && S2.listeners) || 0;
      sub = c && c.tr ? (c.tr.title || "Live") + (c.tr.artist ? " · " + c.tr.artist : "") : "Live";
      if (n && state !== "fm") sub = n + " listening";
      if (n && state === "fm" && !(c && c.tr)) sub = n + " listening";
    } else if (st && st.scheduled && st.text) sub = "Live in " + st.text;
    if (fmSub.textContent !== sub) fmSub.textContent = sub;
    fmTag.hidden = !live; fmLive.hidden = !live;
    el.fm.classList.toggle("is-live", live);
    el.fm.setAttribute("aria-label", "misery fm. " + sub);
  }
  setInterval(fmPaint, 1500);

  /* the misery fm player grows out of the fm bubble (FLIP from the bubble's box into the sheet) */
  function openFm() {
    if (!window.MPFM || !MPFM.open) return;
    var from = el.fm.getBoundingClientRect();
    MPFM.open();
    if (RM.matches) return;
    var n = 0;
    (function grow() {
      var sh = document.querySelector(".fm-sheet");
      if (!sh || !sh.animate) { if (++n < 20) requestAnimationFrame(grow); return; }
      var to = sh.getBoundingClientRect();
      if (!to.width) { if (++n < 20) requestAnimationFrame(grow); return; }
      var sx = from.width / to.width, sy = from.height / to.height;
      sh.getAnimations().forEach(function (a) { a.cancel(); });
      sh.animate([
        { transformOrigin: "0 0", transform: "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + sx + "," + sy + ")", borderRadius: (from.height / 2 / sy) + "px", opacity: 0.6 },
        { transformOrigin: "0 0", transform: "none", borderRadius: "30px 30px 0 0", opacity: 1 }
      ], { duration: 520, easing: "cubic-bezier(.3,1.1,.4,1)" });
      [].forEach.call(sh.children, function (c) { c.animate && c.animate([{ opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 360, delay: 140, easing: "ease-out", fill: "backwards" }); });
    })();
  }

  /* ---------- status menu: grows out of the status button ---------- */
  var menuIsOpen = false;
  function openMenu() {
    if (menuIsOpen || !signedIn) return;
    menuIsOpen = true;
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
    menu.firstElementChild.animate([{ opacity: 1, filter: "blur(0)" }, { opacity: 0, filter: "blur(6px)" }], { duration: 180, fill: "forwards" }).onfinish = function () { menu.firstElementChild.getAnimations().forEach(function (a) { a.cancel(); }); };
    var a = menu.animate([
      { left: menu.style.left, top: menu.style.top, width: menu.style.width, height: menu.style.height, borderRadius: "24px", opacity: 1 },
      { left: br.left - dr.left + "px", top: br.top - dr.top + "px", width: br.width + "px", height: br.height + "px", borderRadius: br.height / 2 + "px", opacity: 0.4 }
    ], { duration: 360, easing: "cubic-bezier(.4,0,.2,1)" });
    a.onfinish = a.oncancel = done;
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
  sBtn.addEventListener("click", function (e) { e.stopPropagation(); menuIsOpen ? closeMenu() : openMenu(); });
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
    if (menuIsOpen && !menu.contains(e.target) && !sBtn.contains(e.target)) closeMenu();
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (menuIsOpen) { e.preventDefault(); closeMenu(); sBtn.focus({ preventScroll: true }); }
    else if (state !== "tabs" && !menuOpen()) setState("tabs");
  });
  scrim && scrim.addEventListener("click", function () { closeMenu(); });

  /* ---------- where it sits: above the message box in Chat, else the bottom edge ---------- */
  function place() {
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
    var dr = dock.getBoundingClientRect();
    if (!menuOpen() && !away && dr.height) html.style.setProperty("--mpd-clear", Math.round(window.innerHeight - dr.top + 8) + "px");
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
  document.addEventListener("focusin", function (e) {
    if (!isField(e.target) || dock.contains(e.target) || e.target.closest(".mp-whop-sheet")) return;
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
  if (page && window.MutationObserver) new MutationObserver(soon).observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
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
    unread.hidden = !(unreadN > 0 && signedIn);
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
    topInset: function () { var p = document.getElementById("mpd-probe"); return p ? p.getBoundingClientRect().height : 0; }
  };
  avatar();
  sync();
  fmPaint();
  seat(true);
  requestAnimationFrame(function () { dock.classList.add("is-ready"); });
})();
