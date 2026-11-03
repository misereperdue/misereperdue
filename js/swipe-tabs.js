/* Swipe between navbar tabs in the installed web app only (per dc).
   Uses the nav buttons' own click so the orb slide/bounce and panel switch match a tap.
   Order = visible nav buttons left to right (Bag included only when it has items). */
(function () {
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || !!navigator.standalone;
  if (!standalone && !/[?&]swipetest\b/.test(location.search)) return;
  var page = document.querySelector("main.page"), nav = document.getElementById("nav");
  if (!page || !nav) return;
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var SKIP = "input,textarea,select,[contenteditable]:not([contenteditable=false]),canvas,video,iframe,[role=slider],.chat-bubble,.no-swipe,[data-noswipe]";
  function tabs() {
    return [].filter.call(nav.querySelectorAll("button[data-view]"), function (b) {
      // Bag joins the swipe order only when it holds something (per dc)
      if (b.id === "post-btn") return false;
      if (b.getAttribute("data-view") === "cart") return !!(window.MP && MP.cartCount && MP.cartCount() > 0) && !!b.offsetWidth;
      return !!b.offsetWidth;
    });
  }
  function hScroll(el) {
    for (; el && el !== page; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2) {
        var o = getComputedStyle(el).overflowX;
        if (o === "auto" || o === "scroll") return true;
      }
    }
    return false;
  }
  function modalOpen() {
    return !!document.querySelector("dialog[open],[aria-modal=true]:not([hidden]),.sheet.open,.sheet.on,.modal.open,.modal.on") ||
      document.documentElement.classList.contains("sheet-open") || document.body.classList.contains("sheet-open");
  }
  var s = null; // swipe state
  function panel() { return page.querySelector(".panel.on"); }
  /* The Chat/Globe glass top bar (.chat-head, position:fixed) lives inside the panel.
     Transforming the panel re-anchors fixed children to it, so the bar slid and jumped.
     Slide only the panel's content and leave fixed/sticky parts where they are. */
  function pinned(el) { var q = getComputedStyle(el).position; return q === "fixed" || q === "sticky"; }
  function movers(p) {
    var out = [];
    (function walk(el, d) {
      [].forEach.call(el.children, function (c) {
        if (pinned(c)) return;
        var has = d < 4 && [].some.call(c.querySelectorAll(".chat-head,.glassbar"), function (x) { return pinned(x); });
        if (has) walk(c, d + 1); else out.push(c);
      });
    })(p, 0);
    return out;
  }
  function setX(list, x, tr, op) {
    list.forEach(function (el) {
      el.style.transition = tr || "";
      el.style.transform = x ? "translate3d(" + x + "px,0,0)" : "";
      el.style.opacity = op == null ? "" : op;
    });
  }
  function reset(p, anim) {
    var m = p && p._mv; if (!m) return;
    setX(m, 0, anim ? "transform .28s cubic-bezier(.2,.8,.2,1)" : "");
    setTimeout(function () { setX(m, 0); m.forEach(function (el) { el.style.willChange = ""; }); }, anim ? 300 : 0);
  }
  page.addEventListener("touchstart", function (e) {
    s = null;
    if (e.touches.length !== 1) return;
    var t = e.touches[0], el = e.target;
    if (t.clientX < 20 || t.clientX > innerWidth - 8) return;
    if (el.closest && el.closest(SKIP)) return;
    if (hScroll(el) || modalOpen()) return;
    var p = panel(); if (!p || p.id === "product") return;
    var list = tabs(), cur = nav.querySelector("button[data-view].on:not(#post-btn)");
    var i = list.indexOf(cur); if (i < 0) return;
    s = { x: t.clientX, y: t.clientY, t: Date.now(), lock: 0, dx: 0, p: p, list: list, i: i, lx: t.clientX, lt: Date.now(), v: 0 };
  }, { passive: true });
  page.addEventListener("touchmove", function (e) {
    if (!s || s.lock < 0) return;
    var t = e.touches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (!s.lock) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.6) { s.lock = 1; s.p._mv = movers(s.p); if (!RM.matches) s.p._mv.forEach(function (el) { el.style.willChange = "transform"; }); }
      else { s.lock = -1; return; }
    }
    if (e.cancelable) e.preventDefault();
    var now = Date.now(); s.v = (t.clientX - s.lx) / Math.max(1, now - s.lt); s.lx = t.clientX; s.lt = now;
    s.dx = dx;
    if (RM.matches) return;
    var edge = (dx > 0 && s.i === 0) || (dx < 0 && s.i === s.list.length - 1);
    var x = edge ? dx / (1 + Math.abs(dx) / 60) / 2 : dx;
    setX(s.p._mv, x);
  }, { passive: false });
  function end() {
    if (!s || s.lock !== 1) { s = null; return; }
    var st = s; s = null;
    var dir = st.dx < 0 ? 1 : -1, j = st.i + dir, w = innerWidth;
    var go = j >= 0 && j < st.list.length && (Math.abs(st.dx) > w * 0.3 || (Math.abs(st.v) > 0.45 && Math.abs(st.dx) > 30 && (st.v < 0) === (dir > 0)));
    if (!go) return reset(st.p, !RM.matches);
    if (RM.matches) { reset(st.p); st.list[j].click(); return; }
    setX(st.p._mv, -dir * w * 0.6, "transform .18s ease-out, opacity .18s ease-out", "0");
    setTimeout(function () {
      st.list[j].click();               // same path as a tap: orb slide, bounce, header classes
      setX(st.p._mv, 0); st.p._mv.forEach(function (el) { el.style.willChange = ""; });
      var np = panel();
      if (np && np !== st.p) movers(np).forEach(function (el) {
        el.animate && el.animate([{ transform: "translate3d(" + (dir * 40) + "px,0,0)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });
      });
    }, 170);
  }
  page.addEventListener("touchend", end, { passive: true });
  page.addEventListener("touchcancel", function () { if (s && s.lock === 1) reset(s.p, true); s = null; }, { passive: true });
})();
