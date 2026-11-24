/* Bottom dock (per dc, design "D2 · Stretch Pill"): the navigation and the old top bars live in one
   glass shape at the bottom of the screen, in thumb reach.
     pill  : page title (+ online count in Chat, Back on product/thread pages) · page dots · your avatar
     tabs  : tap the pill and it stretches into Shop / Globe / Chat / Bag + notifications + avatar
     menus : profile, notifications, online list, Powers, Stars, misery fm all grow UP out of the same
             shape (profile-cards.js MPProfiles.topBar()/chatHead() return the dock)
   The old #nav buttons stay in the DOM (hidden) and remain the single navigation path: the dock clicks
   them, so app.js show(), swipe-tabs and the orb logic keep working unchanged. */
(function () {
  "use strict";
  var dock = document.getElementById("mp-dock");
  if (!dock || !document.documentElement.classList.contains("mp-bnav")) return;
  var html = document.documentElement, nav = document.getElementById("nav");
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var EASE = "cubic-bezier(.32,.72,0,1)";
  var q = function (s, r) { return (r || dock).querySelector(s); };
  var inner = q(".mpd-in"), row = q(".mpd-pillrow"), open = q(".mpd-open"), openIn = q(".mpd-open-in"), title = q(".mpd-t");
  var back = q(".mpd-back"), bag = q(".mpd-bag"), bagNum = q(".mpd-bag b"), live = q(".mpd-live"), liveNum = q(".mpd-live b"), dots = [].slice.call(dock.querySelectorAll(".mpd-dots i"));
  var tabs = q(".mpd-tabs"), ind = q(".mpd-ind"), tabBtns = [].slice.call(tabs.querySelectorAll("button[data-view]"));
  var bagTab = q('.mpd-tabs [data-view="cart"]'), bagBadge = q(".mpd-badge"), bell = q(".mpd-bell"), me = q(".mpd-me"), meAv = q(".mpd-av"), unread = q(".mpd-unread");
  var scrim = document.getElementById("mpd-scrim");
  var NAMES = { shop: "Shop", product: "Shop", cart: "Bag", forum: "Globe", journal: "Chat" };
  var ORDER = ["shop", "forum", "journal"];
  var state = "pill", view = "", signedIn = false, onlineN = 0, unreadN = 0, kbLift = 0, away = false, lastW = 0;

  function panelView() { var p = document.querySelector("main.page > .panel.on"); return p ? p.id : "shop"; }
  function dotView(v) { return v === "product" || v === "cart" ? "shop" : v; }
  function menuOpen() { return dock.classList.contains("is-profile-bar") || dock.classList.contains("is-np") || dock.classList.contains("is-ntf"); }
  function fullW() { return Math.min(window.innerWidth - 24, 460); }
  function contentBack() {
    var p = document.querySelector("main.page > .panel.on");
    if (!p) return null;
    var list = p.querySelectorAll(".forum-head > .forum-back");
    for (var i = list.length - 1; i >= 0; i--) {
      // (the in-page Back pills are hidden by the dock's CSS, so judge by the view they belong to)
      // a Back pill the page shows itself (New thread) stays the only Back
      if (getComputedStyle(list[i]).display !== "none") continue;
      var head = list[i].parentNode, host = head.parentElement;
      if (host && host.getClientRects().length && !head.closest("[hidden],[aria-hidden=true]")) return list[i];
    }
    return null;
  }
  function cartCount() { try { return window.MP && MP.cartCount ? MP.cartCount() : 0; } catch (e) { return 0; } }

  /* ---------- size: the shape's width is explicit so every change animates (CSS transition) ---------- */
  function pillW() {
    var w = 2 + 5 + openIn.offsetWidth + 50; // 1px border each side + insets
    if (!back.hidden) w += 44;
    if (!live.hidden) w += live.offsetWidth + 4;
    if (!bag.hidden) w += bag.offsetWidth + 4;
    return Math.min(fullW(), Math.max(176, Math.ceil(w)));
  }
  function size() {
    var full = fullW(), w = menuOpen() || state === "tabs" ? full : pillW();
    html.style.setProperty("--mpd-full", full + "px");
    html.style.setProperty("--mpd-tw", Math.max(160, full - 2 - 10 - 45 - (signedIn ? 45 : 0)) + "px");
    if (w !== lastW || dock.style.width !== w + "px") { dock.style.width = w + "px"; lastW = w; }
    seat();
  }
  function seat(instant) {
    var on = tabs.querySelector("button.on:not([hidden])");
    if (!on) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "";
    if (instant) ind.style.transition = "none";
    ind.style.width = on.offsetWidth + "px";
    ind.style.transform = "translateX(" + on.offsetLeft + "px)";
    if (instant) { void ind.offsetWidth; ind.style.transition = ""; }
  }

  /* ---------- where the dock sits: above the message box in Chat, else at the bottom edge ---------- */
  function place() {
    var b = null, v = panelView();
    if (kbLift) b = kbLift;
    else if (v === "journal") {
      // from the box's resting layout (its stylesheet bottom + height), never its live rect: chat lifts it over the
      // keyboard with an inline bottom and animates it in; following those made the pill jump/slide back down
      var ir = document.querySelector("#journal .chat-inputrow");
      if (ir && ir.style.bottom) return; // keyboard up (dock is away): keep the resting spot
      if (ir && ir.offsetHeight) b = Math.round((parseFloat(getComputedStyle(ir).bottom) || 0) + ir.offsetHeight + 10);
    }
    var cur = parseFloat(html.style.getPropertyValue("--mpd-b")) || 0;
    if (b) { if (Math.abs(b - cur) > 1) html.style.setProperty("--mpd-b", b + "px"); }
    else if (cur) html.style.removeProperty("--mpd-b");
    var dr = dock.getBoundingClientRect();
    // room the page keeps clear under its content (toasts, last cards, banners); stable while menus are open
    if (!menuOpen() && !away && dr.height) html.style.setProperty("--mpd-clear", Math.round(window.innerHeight - dr.top + 8) + "px");
  }

  /* ---------- page state: title, dots, back, bag, online ---------- */
  function setTitle(t) {
    if (title.textContent === t) return;
    if (!title.textContent || RM.matches || !title.animate) { title.textContent = t; return; }
    title.textContent = t;
    title.animate([{ opacity: 0, transform: "translateY(7px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: EASE });
  }
  function sync() {
    var v = panelView(), changed = v !== view;
    view = v;
    html.setAttribute("data-mpd-view", v);
    setTitle(NAMES[v] || "Shop");
    var dv = dotView(v);
    dots.forEach(function (d) { d.classList.toggle("on", d.getAttribute("data-v") === dv); });
    var n = cartCount();
    bagTab.hidden = !(n > 0);
    // four pages + bell + you don't fit with labels: only the current page keeps its name
    tabs.classList.toggle("is-crowded", n > 0 && signedIn || n > 0 && fullW() < 380);
    bagBadge.textContent = n > 99 ? "99+" : String(n);
    tabBtns.forEach(function (b) {
      var on = b.getAttribute("data-view") === (v === "product" ? "shop" : v);
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var hasBack = !!contentBack();
    back.hidden = !hasBack;
    live.hidden = !(v === "journal" && onlineN > 0 && signedIn);
    // shopping with something in the bag: one tap to it, right on the pill
    bag.hidden = !(n > 0 && (v === "shop" || v === "product"));
    bagNum.textContent = n > 99 ? "99+" : String(n);
    bag.setAttribute("aria-label", "Bag, " + n + (n === 1 ? " item" : " items"));
    open.setAttribute("aria-label", (NAMES[v] || "Shop") + ". Open navigation");
    if (changed && state === "tabs") collapse();
    size();
    place();
  }
  var syncFrame = 0;
  function soon() { if (!syncFrame) syncFrame = requestAnimationFrame(function () { syncFrame = 0; sync(); }); }

  /* ---------- you: avatar mirrors the chat header's (the source of truth chat.js keeps up to date) ---------- */
  var PERSON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>';
  function srcMe() { return document.querySelector("#journal .chat-head .chat-me") || document.querySelector("#forum .chat-head .chat-me"); }
  function avatar() {
    var src = srcMe(), user = window.MPAuthUser || (window.MPChat && MPChat.getMe && MPChat.getMe());
    var was = signedIn;
    signedIn = !!(user && src);
    dock.classList.toggle("is-signed-in", signedIn);
    bell.hidden = !signedIn;
    me.setAttribute("aria-label", signedIn ? "Your profile" : "Sign in");
    if (signedIn) {
      var face = src.querySelector(".chat-avatar-wrap") || src.firstElementChild;
      // stable key (image + letters + decorations), so re-renders of the header don't re-clone (and re-load) it
      var key = face ? [].map.call(face.querySelectorAll("img"), function (i) { return i.getAttribute("src"); }).join("|") + "#" + face.textContent + "#" + face.className + "#" + face.querySelectorAll("*").length : "";
      if (key && meAv._key !== key) {
        meAv._key = key;
        var c = face.cloneNode(true);
        c.removeAttribute("id");
        [].forEach.call(c.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
        meAv.replaceChildren(c);
      }
      window.MPPwDock && MPPwDock(); // hat, Sphere and other avatar powers on the pill's avatar
    } else if (meAv._key !== "") { meAv._key = ""; meAv.innerHTML = PERSON; }
    unread.hidden = !(unreadN > 0 && signedIn);
    if (was !== signedIn) sync();
  }
  var avFrame = 0;
  function avSoon() { if (!avFrame) avFrame = requestAnimationFrame(function () { avFrame = 0; avatar(); }); }

  /* ---------- states ---------- */
  function setState(s, focus, quiet) {
    if (state === s) return;
    state = s;
    dock.setAttribute("data-state", s);
    open.setAttribute("aria-expanded", s === "tabs" ? "true" : "false");
    html.classList.toggle("mpd-is-tabs", s === "tabs");
    tabs.inert = s !== "tabs"; row.inert = s === "tabs"; bell.inert = s !== "tabs";
    if (quiet) return; // a menu is taking the shape over; it sizes it
    size();
    if (s === "tabs") { sy = window.scrollY; requestAnimationFrame(function () { seat(true); }); }
    if (focus) {
      var t = s === "tabs" ? tabs.querySelector("button.on:not([hidden])") || tabBtns[0] : open;
      t && t.focus({ preventScroll: true });
    }
  }
  function expand(focus) { if (!menuOpen()) setState("tabs", focus); }
  function collapse(focus) { setState("pill", focus); }

  function go(v) {
    var b = nav && nav.querySelector('button[data-view="' + v + '"]');
    collapse();
    if (!b) return void (window.MPNav && MPNav.show(v));
    if (v === panelView() && v !== "product") { window.scrollTo({ top: v === "journal" ? document.documentElement.scrollHeight : 0, behavior: RM.matches ? "auto" : "smooth" }); return; }
    b.click();
  }

  /* ---------- input ---------- */
  var swipe = null;
  open.addEventListener("pointerdown", function (e) { swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, t: Date.now() }; });
  // swipe up morphs the pill open as the finger moves (not on release), like pulling a sheet
  open.addEventListener("pointermove", function (e) {
    if (!swipe || swipe.id !== e.pointerId || swipe.done) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (dy < -14 && Math.abs(dy) > Math.abs(dx) * 1.2) { swipe.done = true; window.haptic && haptic(8); expand(); }
  });
  open.addEventListener("pointercancel", function () { swipe = null; });
  open.addEventListener("pointerup", function (e) {
    if (!swipe || swipe.id !== e.pointerId) return;
    if (swipe.done) return; // already opened by the upward drag; the click that follows is swallowed
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - swipe.t < 700) {
      // swipe the pill sideways to step between pages
      var i = ORDER.indexOf(dotView(panelView())), j = i + (dx < 0 ? 1 : -1);
      swipe.done = true;
      if (j >= 0 && j < ORDER.length) { window.haptic && haptic(8); go(ORDER[j]); }
      else if (open.animate && !RM.matches) dock.animate([{ transform: "translateX(-50%)" }, { transform: "translateX(calc(-50% + " + (dx < 0 ? -6 : 6) + "px))" }, { transform: "translateX(-50%)" }], { duration: 260, easing: EASE });
    } else if (dy < -28 && Math.abs(dy) > Math.abs(dx)) { swipe.done = true; expand(); }
  });
  open.addEventListener("click", function (e) {
    if (swipe && swipe.done) { swipe = null; e.preventDefault(); return; }
    swipe = null;
    expand(e.detail === 0);
  });
  tabBtns.forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-view")); }); });
  back.addEventListener("click", function (e) { e.stopPropagation(); var b = contentBack(); collapse(); b && b.click(); });
  bag.addEventListener("click", function (e) { e.stopPropagation(); go("cart"); });
  live.addEventListener("click", function (e) {
    e.stopPropagation();
    collapse();
    window.MPOnlineList && MPOnlineList();
  });
  me.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!signedIn) { collapse(); return void go("journal"); }
    var src = srcMe();
    setState("pill", false, true);
    if (src) src.click(); else if (window.MPOpenProfile) MPOpenProfile();
  });
  // outside tap or Escape folds the tabs back into the pill; scrolling the page does too
  document.addEventListener("pointerdown", function (e) { if (state === "tabs" && !dock.contains(e.target)) collapse(); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state === "tabs") { e.preventDefault(); collapse(true); } });
  // only a scroll the person makes (finger / wheel), never the page settling or Chat pinning to the latest message
  var sy = 0, gestureAt = 0;
  ["touchmove", "wheel"].forEach(function (t) { window.addEventListener(t, function (e) { if (!dock.contains(e.target)) gestureAt = Date.now(); }, { passive: true }); });
  window.addEventListener("scroll", function () { if (state === "tabs" && Date.now() - gestureAt < 400 && Math.abs(window.scrollY - sy) > 24) collapse(); }, { passive: true });

  /* ---------- typing: the dock steps aside so the keyboard and the message box get the room ---------- */
  function isField(t) { return t && t.closest && t.closest('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select,[contenteditable]:not([contenteditable=false])'); }
  var awayT = 0;
  function setAway(on) {
    clearTimeout(awayT);
    if (on === away) return;
    if (!on) place(); // settle the spot before it fades back in, so it never slides on return
    away = on;
    // Chat: drop the dock's room under the messages in the same frame (before the keyboard resizes the view);
    // when typing ends and you were at the latest message, stay pinned to it as the room comes back
    var inChat = panelView() === "journal", pinned = inChat && document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 140;
    html.classList.toggle("mpd-typing", on && inChat);
    // (a plain scroll: MPChat.scrollToLatest would re-open chat's 5 s "pin on image load" window and yank later reads)
    if (!on && pinned) [40, 300].forEach(function (d) { setTimeout(function () { if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 220) window.scrollTo(0, document.documentElement.scrollHeight); }, d); });
    dock.classList.toggle("mpd-away", on);
    dock.inert = on && !menuOpen();
    if (on) collapse();
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

  /* ---------- keyboard while a menu with a field is open: lift the shape above it ---------- */
  function vv() {
    var v = window.visualViewport;
    if (!v) return;
    var hidden = Math.round(window.innerHeight - (v.offsetTop + v.height));
    var lift = menuOpen() && hidden > 80 && dock.contains(document.activeElement) ? hidden + 10 : 0;
    if (lift !== kbLift) { kbLift = lift; place(); }
  }
  if (window.visualViewport) { visualViewport.addEventListener("resize", vv); visualViewport.addEventListener("scroll", vv); }

  /* ---------- watch: page switches (#nav .on / panels), bag count, content Back, menus on the shape ---------- */
  if (nav && window.MutationObserver) new MutationObserver(soon).observe(nav, { subtree: true, attributes: true, childList: true, characterData: true, attributeFilter: ["class", "style", "hidden"] });
  var page = document.querySelector("main.page");
  if (page && window.MutationObserver) new MutationObserver(soon).observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
  var chatRoot = document.getElementById("journal"), forumRoot = document.getElementById("forum");
  [chatRoot, forumRoot].forEach(function (r) {
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
    if (m) { setState("pill", false, true); if (away) { dock.classList.remove("mpd-away"); dock.inert = false; } }
    else if (away) { dock.classList.add("mpd-away"); }
    size();
    vv();
  }).observe(dock, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("mp-auth", function () { avSoon(); setTimeout(avSoon, 300); });
  document.addEventListener("mp-unread", function (e) {
    unreadN = Math.max(0, Number(e.detail && e.detail.count) || 0);
    unread.hidden = !(unreadN > 0 && signedIn);
    dock.classList.toggle("has-unread", unreadN > 0);
  });
  window.addEventListener("resize", function () { size(); place(); });
  window.addEventListener("orientationchange", function () { size(); place(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); });
  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (state === "pill" && !menuOpen()) size(); }).observe(openIn);
    var ir = null;
    setInterval(function () { // the message box mounts/unmounts with sign-in; re-anchor when it changes size
      var n = document.querySelector("#journal .chat-inputrow");
      if (n !== ir) { ir = n; if (n) new ResizeObserver(function () { place(); }).observe(n); place(); }
    }, 1000);
  }
  scrim && scrim.addEventListener("click", function () { collapse(); });

  window.MPDock = {
    el: dock,
    sync: sync,
    expand: expand,
    collapse: collapse,
    online: function (n) { onlineN = Math.max(0, Number(n) || 0); liveNum.textContent = String(onlineN); live.setAttribute("aria-label", onlineN + " online. Show who"); soon(); },
    topInset: function () { var p = document.getElementById("mpd-probe"); return p ? p.getBoundingClientRect().height : 0; }
  };
  tabs.inert = true; bell.inert = true;
  avatar();
  sync();
  seat(true);
  requestAnimationFrame(function () { dock.classList.add("is-ready"); });
})();
