/* Liquid Glass for the bottom nav (per dc: "true" Liquid Glass, not frosted).
   Every glass shape is a lens: near its edge the content behind is bent inward (rounded-rect bezel
   displacement map), with a slight colour split (red / green / blue bent by slightly different amounts).
   - Chromium: the real backdrop is bent live with backdrop-filter:url(#lens-per-shape).
   - Safari / iPhone (backdrop-filter can't take SVG filters there yet): the content under the bar is mirrored
     into an SVG foreignObject inside the nav and bent with the same lens; the shapes' light blur sits on top.
   Maps are rebuilt when a shape changes size (after each morph); while shapes move the plain glass shows. */
(function () {
  "use strict";
  var dock = document.getElementById("mp-dock");
  if (!dock || !document.documentElement.classList.contains("mp-bnav")) return;
  var html = document.documentElement;
  var reduce = window.matchMedia && (matchMedia("(prefers-reduced-transparency: reduce)").matches);
  if (reduce) return;
  var ua = navigator.userAgent;
  var CHROMIUM = /Chrome\/\d|Chromium\/\d/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !/iP(hone|ad|od)/.test(ua) && !/[?&]glass=mirror/.test(location.search);
  var NS = "http://www.w3.org/2000/svg", XL = "http://www.w3.org/1999/xlink";
  var SHAPES = [".nv-tabs", ".nv-rg", ".nv-home", ".nv-fm", ".nv-me", ".nv-bag", ".nv-back"];

  /* ---------- lens displacement map for a rounded rect ---------- */
  function lensMap(w, h, r, bezel, zoom) {
    w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"), im = x.createImageData(w, h), d = im.data;
    r = Math.min(r, w / 2, h / 2);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var px = i + 0.5 - w / 2, py = j + 0.5 - h / 2;
      var qx = Math.abs(px) - (w / 2 - r), qy = Math.abs(py) - (h / 2 - r);
      var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      var dist = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r; // signed: < 0 inside
      var dx = 0, dy = 0, t = 1 + dist / bezel;                          // 0 at the bezel's inner edge, 1 at the rim
      if (t > 0) {
        var nx, ny;
        if (qx > 0 && qy > 0) { var L = Math.hypot(ox, oy) || 1; nx = ox / L * Math.sign(px); ny = oy / L * Math.sign(py); }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
        t = Math.min(1, t);
        var k = 1 - Math.sqrt(1 - t * t);                               // circular bezel: steep at the very edge
        dx = -nx * k; dy = -ny * k;
      }
      if (zoom) { dx -= px / (w / 2) * zoom; dy -= py / (h / 2) * zoom; }   // magnify (the moving tab lens)
      var o = (j * w + i) * 4;
      d[o] = 128 + Math.max(-1, Math.min(1, dx)) * 127; d[o + 1] = 128 + Math.max(-1, Math.min(1, dy)) * 127; d[o + 2] = 128; d[o + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  /* filter: light blur, then bend each colour channel a little differently, recombine */
  function lensFilter(id, w, h, url, scale, blur) {
    var f = document.createElementNS(NS, "filter");
    f.setAttribute("id", id);
    ["x", "y"].forEach(function (a) { f.setAttribute(a, "0"); });
    f.setAttribute("width", w); f.setAttribute("height", h);
    f.setAttribute("filterUnits", "userSpaceOnUse"); f.setAttribute("primitiveUnits", "userSpaceOnUse");
    f.setAttribute("color-interpolation-filters", "sRGB");
    var img = document.createElementNS(NS, "feImage");
    img.setAttribute("x", "0"); img.setAttribute("y", "0"); img.setAttribute("width", w); img.setAttribute("height", h);
    img.setAttribute("preserveAspectRatio", "none"); img.setAttribute("result", "map");
    img.setAttribute("href", url); img.setAttributeNS(XL, "xlink:href", url);
    f.appendChild(img);
    var src = "SourceGraphic";
    if (blur) {
      var b = document.createElementNS(NS, "feGaussianBlur"); b.setAttribute("in", "SourceGraphic"); b.setAttribute("stdDeviation", blur); b.setAttribute("result", "soft");
      f.appendChild(b); src = "soft";
    }
    var ch = [["r", 1.1, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["g", 1, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["b", 0.9, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"]];
    ch.forEach(function (c) {
      var dm = document.createElementNS(NS, "feDisplacementMap");
      dm.setAttribute("in", src); dm.setAttribute("in2", "map"); dm.setAttribute("scale", (scale * c[1]).toFixed(1));
      dm.setAttribute("xChannelSelector", "R"); dm.setAttribute("yChannelSelector", "G"); dm.setAttribute("result", "d" + c[0]);
      var cm = document.createElementNS(NS, "feColorMatrix");
      cm.setAttribute("in", "d" + c[0]); cm.setAttribute("type", "matrix"); cm.setAttribute("values", c[2]); cm.setAttribute("result", c[0]);
      f.appendChild(dm); f.appendChild(cm);
    });
    var b1 = document.createElementNS(NS, "feBlend"); b1.setAttribute("in", "r"); b1.setAttribute("in2", "g"); b1.setAttribute("mode", "screen"); b1.setAttribute("result", "rg");
    var b2 = document.createElementNS(NS, "feBlend"); b2.setAttribute("in", "rg"); b2.setAttribute("in2", "b"); b2.setAttribute("mode", "screen");
    f.appendChild(b1); f.appendChild(b2);
    return f;
  }
  function bezelOf(h) { return Math.max(10, Math.min(30, h * 0.46)); }
  function radiusOf(el, rect) { var r = parseFloat(getComputedStyle(el).borderTopLeftRadius); return isNaN(r) ? rect.height / 2 : r; }

  var defs = document.createElementNS(NS, "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.setAttribute("aria-hidden", "true"); defs.setAttribute("data-ph", "skip");
  defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.appendChild(defs);

  /* ================= Chromium: bend the live backdrop ================= */
  if (CHROMIUM) {
    html.classList.add("nv-lens-live");
    var sized = new WeakMap();
    var refresh = function () {
      var all = SHAPES.map(function (s) { return dock.querySelector(s); }).concat([dock.querySelector(".nv-lens")]);
      all.forEach(function (el, n) {
        if (!el) return;
        var isLens = el.classList.contains("nv-lens");
        var glass = isLens || el.classList.contains("nv-glass");
        var rc = el.getBoundingClientRect();
        if (!glass || rc.width < 4 || el.classList.contains("nv-off")) { el.style.backdropFilter = ""; el.style.webkitBackdropFilter = ""; return; }
        var w = Math.round(isLens ? el.offsetWidth : rc.width), h = Math.round(isLens ? el.offsetHeight : rc.height), key = w + "x" + h;
        if (sized.get(el) !== key) {
          sized.set(el, key);
          var id = "nvL" + n, old = defs.querySelector("#" + id);
          old && old.remove();
          var url = lensMap(w, h, radiusOf(el, rc), bezelOf(h) * (isLens ? 1.4 : 1), isLens ? 0.22 : 0).toDataURL();
          defs.appendChild(lensFilter(id, w, h, url, isLens ? 56 : 46, isLens ? 0 : 0.5));
        }
        var v = "url(#nvL" + n + ") " + (isLens ? "saturate(1.3) brightness(" + (html.getAttribute("data-theme") === "light" || (!html.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: light)").matches) ? "1.04" : "1.12") + ")" : "blur(3px) saturate(1.9) brightness(1.03)");
        if (el.style.backdropFilter !== v) el.style.backdropFilter = v;
      });
    };
    var t = 0;
    var soon = function () { clearTimeout(t); t = setTimeout(refresh, 60); };
    dock.addEventListener("transitionend", function (e) { if (/width|height/.test(e.propertyName)) soon(); });
    new MutationObserver(soon).observe(dock, { attributes: true, subtree: true, attributeFilter: ["data-state", "hidden", "class"] });
    window.addEventListener("resize", soon);
    soon(); setTimeout(refresh, 800);
    return;
  }

  /* ================= Safari / iPhone: mirror what's under the bar and bend that ================= */
  html.classList.add("nv-lens-mirror");
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "nv-mirror"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("data-ph", "skip"); // icon swapper must leave it alone
  var fo = document.createElementNS(NS, "foreignObject");
  /* WebKit: absolutely positioned / transformed content inside foreignObject escapes the SVG filter, so the
     copies sit in one grid cell (they may overlap there) and are placed with margins */
  var room = document.createElement("div"); room.className = "nv-mirror-room";
  var content = room;
  fo.appendChild(room); svg.appendChild(fo);
  dock.insertBefore(svg, dock.firstChild);
  var PAD = 0, W = 0, H = 0, picked = [], lastY = -1e9, lastTop = 0, clipKey = "";

  function shapes() {
    var dr = dock.getBoundingClientRect();
    return SHAPES.map(function (s) { return dock.querySelector(s); }).filter(function (el) {
      return el && el.classList.contains("nv-glass") && !el.classList.contains("nv-off");
    }).map(function (el) {
      var r = el.getBoundingClientRect();
      return { el: el, x: r.left - dr.left, y: r.top - dr.top, w: r.width, h: r.height, r: radiusOf(el, r) };
    });
  }
  function rr(s) { // rounded rect path
    var x = s.x, y = s.y, w = s.w, h = s.h, r = Math.min(s.r, w / 2, h / 2);
    return "M" + (x + r) + "," + y + "H" + (x + w - r) + "A" + r + "," + r + " 0 0 1 " + (x + w) + "," + (y + r) + "V" + (y + h - r) + "A" + r + "," + r + " 0 0 1 " + (x + w - r) + "," + (y + h) + "H" + (x + r) + "A" + r + "," + r + " 0 0 1 " + x + "," + (y + h - r) + "V" + (y + r) + "A" + r + "," + r + " 0 0 1 " + (x + r) + "," + y + "Z";
  }
  /* the lens: one map for the whole bar (each shape's bezel at its place), clipped to the shapes */
  function rebuild() {
    var dr = dock.getBoundingClientRect();
    W = Math.round(dr.width); H = Math.round(dr.height);
    if (!W || !H) return;
    var list = shapes(), key = W + "x" + H + "|" + list.map(function (s) { return [s.x, s.y, s.w, s.h].map(Math.round).join(","); }).join(";");
    if (key === clipKey) return;
    clipKey = key;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    fo.setAttribute("width", W); fo.setAttribute("height", H);
    room.style.width = W + "px"; room.style.height = H + "px";
    var big = document.createElement("canvas"); big.width = W; big.height = H;
    var bx = big.getContext("2d"); bx.fillStyle = "rgb(128,128,128)"; bx.fillRect(0, 0, W, H);
    list.forEach(function (s) { bx.drawImage(lensMap(s.w, s.h, s.r, bezelOf(s.h), 0), Math.round(s.x), Math.round(s.y)); });
    var old = defs.querySelector("#nvM"); old && old.remove();
    defs.appendChild(lensFilter("nvM", W, H, big.toDataURL(), 46, 0.5));
    fo.setAttribute("filter", "url(#nvM)");
    svg.style.clipPath = list.length ? "path('" + list.map(rr).join(" ") + "')" : "inset(50%)";
  }
  /* what is under the bar: the small visual blocks (messages, cards, rows) the bar covers */
  function collect() {
    var dr = dock.getBoundingClientRect(), y0 = dr.top - 10, y1 = dr.bottom + 10, found = [];
    if (!dr.width) return;
    for (var y = y0; y <= y1; y += Math.max(8, (y1 - y0) / 3)) for (var x = dr.left + 6; x < dr.right; x += 18) {
      var stack = document.elementsFromPoint(x, y);
      for (var k = 0; k < stack.length; k++) {
        var e = stack[k];
        if (dock.contains(e) || e === document.body || e === html || e.id === "mpd-scrim" || e.closest(".nv-mirror,#mp-dock,.mp-whop-sheet,.fm-sheet,.fm-scrim")) continue;
        if (getComputedStyle(e).position === "fixed") continue;
        var b = e;
        while (b.parentElement && !/^(MAIN|BODY|SECTION)$/.test(b.parentElement.tagName) && !b.parentElement.classList.contains("panel")) {
          var pr = b.parentElement.getBoundingClientRect();
          if (pr.height > 340 || pr.width > innerWidth * 0.98) break;
          b = b.parentElement;
        }
        if (found.indexOf(b) < 0) found.push(b);
        break;
      }
    }
    found = found.filter(function (a) { return !found.some(function (o) { return o !== a && o.contains(a); }); });
    var same = found.length === picked.length && found.every(function (e, i) { return e === picked[i]; });
    if (!same) {
      picked = found;
      var frag = document.createDocumentFragment();
      found.forEach(function (e) {
        var r = e.getBoundingClientRect(), c = e.cloneNode(true), cs = getComputedStyle(e);
        c.removeAttribute("id"); [].forEach.call(c.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
        [].forEach.call(c.querySelectorAll("video,iframe,canvas,script"), function (n) { n.remove(); });
        c.setAttribute("aria-hidden", "true"); c.inert = true;
        var st = c.style;
        c._x = r.left; c._y = r.top + window.scrollY;
        st.position = "static"; st.gridArea = "1 / 1"; st.alignSelf = "start"; st.justifySelf = "start";
        st.width = r.width + "px"; st.height = r.height + "px"; st.minWidth = "0";
        st.margin = "0"; st.boxSizing = "border-box"; st.transform = "none"; st.animation = "none"; st.transition = "none"; st.flex = "none";
        ["color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "borderRadius", "padding", "display", "flexDirection", "alignItems", "justifyContent", "gap", "opacity", "boxShadow", "border", "overflow"].forEach(function (p) { st[p] = cs[p]; });
        if (st.display === "inline" || st.display === "contents") st.display = "block";
        frag.appendChild(c);
      });
      content.replaceChildren(frag);
    }
    lastY = window.scrollY;
  }
  function follow() {
    var dr = dock.getBoundingClientRect();
    for (var c = content.firstElementChild; c; c = c.nextElementSibling) {
      c.style.marginLeft = (c._x - dr.left) + "px"; c.style.marginTop = (c._y - window.scrollY - dr.top) + "px";
    }
    lastTop = dr.top;
  }
  function paintBg() { room.style.background = getComputedStyle(document.body).backgroundColor || "transparent"; }
  var raf = 0, coll = 0;
  function tick() {
    raf = 0;
    if (dock.classList.contains("is-profile-bar") || dock.classList.contains("mpd-away")) return;
    if (Math.abs(window.scrollY - lastY) > 60) collect();
    follow();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }
  function full() { clearTimeout(coll); coll = setTimeout(function () { paintBg(); rebuild(); collect(); follow(); }, 120); }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", full);
  dock.addEventListener("transitionend", function (e) { if (/width|height|left|top/.test(e.propertyName)) full(); });
  new MutationObserver(full).observe(dock, { attributes: true, attributeFilter: ["data-state", "class", "style"] });
  var page = document.querySelector("main.page");
  page && new MutationObserver(function () { clearTimeout(coll); coll = setTimeout(function () { collect(); follow(); }, 250); }).observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "src"] });
  document.addEventListener("mp-theme", full);
  full(); setTimeout(full, 900);
})();
