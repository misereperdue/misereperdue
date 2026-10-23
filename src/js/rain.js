/* Header weather + cloud bars (per dc 12:01: every cloud generated with CSS).
 *
 * Clouds: a seeded layout routine places overlapping ellipses ("puffs") like a cumulus
 * (big domes, a body row, a flat wide base and cauliflower detail along the top) and builds
 * them as plain elements; ALL drawing is CSS (site.css "CSS cumulus"): each puff is a
 * border-radius ellipse shaded like a lit sphere (bright cap toward the moon, darker belly)
 * plus its slice of a cloud-wide light/underside gradient, casting a soft occlusion shadow on
 * the puffs behind it; the cloud container is masked to the union of the puffs (1.5px soft
 * edge, flat feathered base) and faded as one group. No images, no canvas for clouds.
 *  - Header (header.hero .wx): navy night / pale overcast sky, a CSS crescent moon with halo,
 *    a back and a front cloud layer drifting at different speeds (CSS animations), the rain
 *    canvas between them, and a second faint copy of the moon + halo above the clouds so it
 *    keeps shining through (dims, never vanishes) and lights the cloud edges around it.
 *  - Bars: every .glassbar (nav, Chat/Globe top bars) gets one cloud (.cb) generated from
 *    the measured size of its contents so every pill/label sits inside the solid core.
 *  - Lightning every ~8-20 s: 2-3 pulses within ~400 ms (<= 3/s); the clouds near the
 *    strike light up from within (filter: brightness via WAAPI), a glow lights the sky
 *    behind the front layer, sometimes a faint bolt on the rain canvas. Visual only.
 *  - prefers-reduced-motion: clouds hold still, no lightning, one static rain frame. */
(function () {
  "use strict";
  var root = document.documentElement;
  var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function still() { return !!(rm && rm.matches); }
  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  // ===================== cumulus layout =====================
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function px(n) { return Math.round(n * 10) / 10 + "px"; }
  function inside(P, x, y, k) {
    for (var i = 0; i < P.length; i++) { var p = P[i], dx = (x - p.x) / (p.rx * k), dy = (y - p.y) / (p.ry * k); if (dx * dx + dy * dy <= 1) return true; }
    return false;
  }
  // free-floating sky cumulus: the same recipe as the bar clouds (so every cloud on the site
  // matches), built around a virtual body box, with its own random hump profile
  function cumulus(seed, W, H) {
    var r = rng(seed * 31 + 7), m = 2;
    var c = { x0: W * (0.16 + r() * 0.04), x1: W * (0.84 - r() * 0.04), y0: H * 0.5, y1: H * 0.74 };
    return barCumulus(seed, W, H, c, m, 2, 0.25 + r() * 0.5);
  }
  // a cloud that must hold a content box (x0,y0)-(x1,y1) (a pill row or a title bar) inside
  // its solid core with margin m. The core is a row of big overlapping lobes painted with the
  // cloud-wide gradient only ("f"), so they merge seamlessly (nothing busy behind icons/text)
  // while the outline stays lumpy; the cumulus structure lives above it: overlapping lit domes
  // of different heights (tallest left of centre, a second hump right, low shoulders at the
  // ends) whose bases tuck behind the core, and
  // rounded billows underneath. Any point of the content stadium not inside the solid core
  // gets its own lobe.
  function barCumulus(seed, W, H, c, m, hi, pk1) {
    var r = rng(seed), i, n, x, y, rr, domes = [], core = [], bot = [];
    var ch = c.y1 - c.y0, cw = c.x1 - c.x0, cy = (c.y0 + c.y1) / 2, R = ch / 2 + m + 2;
    n = Math.max(3, Math.ceil(cw / (R * 1.6)) + 1);
    for (i = 0; i < n; i++) {
      var e = i === 0 || i === n - 1;
      x = c.x0 + R * 0.55 + (cw - R * 1.1) * i / (n - 1) + (r() - 0.5) * 6;
      rr = R * (e ? 1 : 1.04 + r() * 0.1);
      core.push({ x: x, y: cy + 1 + (r() - 0.5) * 2, rx: rr * (e ? 1.05 : 1.35 + r() * 0.2), ry: rr, f: 2 });
    }
    var head = c.y0 - m - hi;
    var pk = pk1 === undefined ? 0.34 : pk1, pk2 = pk > 0.5 ? pk - 0.42 : pk + 0.42;
    var prof = function (u) { return 0.3 + 0.7 * Math.exp(-Math.pow((u - pk) / 0.24, 2)) + 0.45 * Math.exp(-Math.pow((u - pk2) / 0.13, 2)); };
    n = Math.max(3, Math.round(cw / 72));
    for (i = 0; i < n; i++) {
      var u = (i + 0.5) / n + (r() - 0.5) * 0.06;
      x = c.x0 + cw * u;
      var top = c.y0 - m - head * Math.min(1, prof(u) * (0.9 + r() * 0.2));
      rr = (cy - top) / 2 * (0.95 + r() * 0.2);
      domes.push({ x: x, y: top + rr, rx: Math.max(rr * 1.1, cw / n * (0.6 + r() * 0.14)), ry: rr });
    }
    // underside: gently scalloped billows of mixed sizes, not one straight line
    n = Math.max(3, Math.round(cw / 64));
    for (i = 0; i < n; i++) {
      rr = (H - 2 - c.y1) * 0.5 + 7 + r() * 4;
      x = c.x0 + cw * (0.08 + 0.84 * i / (n - 1)) + (r() - 0.5) * 8;
      bot.push({ x: x, y: H - 2 - rr - (i % 2 ? 1 + r() * 2 : 4 + r() * 3) - (i === 0 || i === n - 1 ? 4 : 0), rx: rr * (1.3 + r() * 0.25), ry: rr, f: 2 });
    }
    var P = domes.concat(core, bot), add = [];
    var rad = ch / 2 + m, X0 = c.x0 - m, X1 = c.x1 + m, Y0 = c.y0 - m, Y1 = c.y1 + m;
    for (y = Y0; y <= Y1 + 0.1; y += 3) for (x = X0; x <= X1 + 0.1; x += 3) {
      var ex = x < X0 + rad ? X0 + rad - x : x > X1 - rad ? x - (X1 - rad) : 0, ey = Math.abs(y - (Y0 + Y1) / 2);
      if (ex > 0 && ex * ex + ey * ey > rad * rad) continue;
      if (inside(P.concat(add), x, y, 0.78)) continue;
      rr = R * 0.7;
      add.push({ x: x + (x < (X0 + X1) / 2 ? 3 : -3), y: y + (y < cy ? rr * 0.5 : -rr * 0.4), rx: rr * 1.15, ry: rr, f: 2 });
    }
    // domes in FRONT of the core: their lit tops build the outline and their lower halves fade
    // into the body colour, so no edge shows behind the contents; draw the smaller/lower ones
    // last so each hump overlaps its taller neighbour (crease = its upward occlusion shadow)
    domes.forEach(function (d) { d.d = 1; });
    domes.sort(function (a, b) { return a.y - a.ry - (b.y - b.ry); });
    return core.concat(add, bot, domes);
  }
  // puffs -> elements (back to front) inside a masked container; drawing is all CSS
  function render(el, P, W, H, lx, round) {
    var mi = [round ? "linear-gradient(#000 0 0)" : "linear-gradient(#000 calc(100% - 4px),transparent)"], mp = ["0 0"], ms = ["100% 100%"], html = "";
    var hx = Math.round(50 + (lx || 0) * 18) + "%";
    for (var i = 0; i < P.length; i++) {
      var p = P[i], x = p.x - p.rx, y = p.y - p.ry, w = p.rx * 2, h = p.ry * 2;
      if (p.box) {
        mi.push("linear-gradient(#000 0 0)", "radial-gradient(closest-side,#000 calc(100% - 1.5px),transparent)", "radial-gradient(closest-side,#000 calc(100% - 1.5px),transparent)");
        mp.push(px(x + p.ry) + " " + px(y), px(x) + " " + px(y), px(x + w - h) + " " + px(y));
        ms.push(px(w - h) + " " + px(h), px(h) + " " + px(h), px(h) + " " + px(h));
      } else { mi.push("radial-gradient(closest-side,#000 76%,rgba(0,0,0,.6) 90%,transparent)"); mp.push(px(x) + " " + px(y)); ms.push(px(w) + " " + px(h)); }
      html += '<i class="' + (p.d ? " d" : " g") + '" style="left:' + px(x) + ";top:" + px(y) + ";width:" + px(w) + ";height:" + px(h) +
        ";--sx:" + px(-x) + ";--sy:" + px(-y) + ";--sw:" + Math.round(W) + "px;--sh:" + Math.round(H) + "px;--hx:" + hx + '"></i>';
    }
    el.innerHTML = html;
    var s = el.style;
    s.width = px(W); s.height = px(H);
    s.webkitMaskImage = s.maskImage = mi.join(",");
    s.webkitMaskPosition = s.maskPosition = mp.join(",");
    s.webkitMaskSize = s.maskSize = ms.join(",");
    s.webkitMaskRepeat = s.maskRepeat = "no-repeat";
    s.webkitMaskComposite = "source-in" + new Array(mi.length).join(",source-over");
    s.maskComposite = "intersect" + new Array(mi.length).join(",add");
  }

  // ===================== bar clouds =====================
  var LX = 0.5; // light from the moon, upper right
  var bars = [], ro = window.ResizeObserver ? new ResizeObserver(function (es) { es.forEach(function (e) { fitBar(e.target); }); }) : null;
  function fitBar(bar) {
    if (!bar.isConnected) return;
    var cb = bar.querySelector(":scope > .cb");
    if (!cb) {
      cb = document.createElement("span");
      cb.className = "cb cu";
      cb.setAttribute("aria-hidden", "true");
      bar.insertBefore(cb, bar.firstChild);
      bar.classList.add("cbx");
      if (bars.indexOf(bar) < 0) { bars.push(bar); if (ro) ro.observe(bar); }
    }
    var br = bar.getBoundingClientRect();
    if (!br.width || !br.height) return;
    // content box = union of the visible children (pills / title / buttons)
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var k = bar.children, i = 0; i < k.length; i++) {
      var ch = k[i];
      if (ch === cb || ch.classList.contains("seg") || ch.classList.contains("split")) continue;
      var r = ch.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    if (!isFinite(x0)) return;
    var isNav = bar.classList.contains("nav");
    var EX = 14, ET = 2, EB = 6;
    var W = br.width + EX * 2, H = br.height + ET + EB;
    var c = { x0: x0 - br.left + EX, y0: y0 - br.top + ET, x1: x1 - br.left + EX, y1: y1 - br.top + ET };
    if (!isNav) { // title text: keep the cloud snug to the text rows, not the full padding box
      c.y0 = Math.max(c.y0, ET + 18); c.y1 = Math.min(c.y1, H - 14);
    }
    var key = [Math.round(W), Math.round(H), Math.round(c.x0), Math.round(c.x1), Math.round(c.y0), Math.round(c.y1)].join();
    if (cb.getAttribute("data-k") === key) return;
    cb.setAttribute("data-k", key);
    cb.style.left = -EX + "px"; cb.style.top = -ET + "px";
    render(cb, barCumulus(isNav ? 7 : 19, W, H, c, isNav ? 6 : 7, 2), W, H, LX, true);
  }
  function scanBars(n) {
    var list = (n || document).querySelectorAll ? (n || document).querySelectorAll(".glassbar") : [];
    for (var i = 0; i < list.length; i++) fitBar(list[i]);
    if (n && n.classList && n.classList.contains("glassbar")) fitBar(n);
  }
  scanBars();
  if (window.MutationObserver) new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) for (var j = 0, a = ms[i].addedNodes; j < a.length; j++) if (a[j].nodeType === 1 && !(a[j].classList && a[j].classList.contains("cb"))) scanBars(a[j]);
  }).observe(document.body || root, { childList: true, subtree: true });
  window.addEventListener("load", function () { bars.forEach(fitBar); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { bars.forEach(fitBar); });

  // ===================== header sky =====================
  var hero = document.querySelector("header.hero"), wx = hero && hero.querySelector(".wx");
  var cv = hero && hero.querySelector("canvas.hero-rain");
  var clouds = [];
  function buildSky() {
    if (!wx) return;
    var hr = hero.getBoundingClientRect(), HW = Math.round(hr.width), HH = Math.round(hr.height);
    if (!HW || !HH) return;
    wx.style.setProperty("--wx-w", HW + "px");
    var key = HW + "x" + HH;
    if (wx.getAttribute("data-k") === key) return;
    wx.setAttribute("data-k", key);
    var r = rng(5), L = [[".wx-back", 4, 46, 70, 2.3, 3.1, -0.12, 0.34, 7], [".wx-front", 3, 64, 96, 2.4, 3.2, 0.3, 0.62, 13]];
    clouds = [];
    L.forEach(function (l, li) {
      var host = wx.querySelector(l[0]);
      if (!host) return;
      host.innerHTML = "";
      for (var i = 0; i < l[1]; i++) {
        var h = l[2] + r() * (l[3] - l[2]), w = h * (l[4] + r() * (l[5] - l[4]));
        var el = document.createElement("span");
        el.className = "cu wx-c";
        render(el, cumulus(101 + li * 17 + i * 7, w, h), w, h, LX);
        var dur = (HW + w + 40) / (l[8] * (0.85 + r() * 0.3));
        el.style.top = px(HH * (l[6] + r() * (l[7] - l[6])) - h * 0.2);
        el.style.animationDuration = dur.toFixed(1) + "s";
        el.style.animationDelay = (-dur * ((i + r() * 0.6) / l[1])).toFixed(1) + "s";
        host.appendChild(el);
        clouds.push(el);
      }
    });
  }

  // ---- rain canvas (transparent, between the cloud layers) ----
  var ctx = cv && cv.getContext ? cv.getContext("2d") : null;
  var W = 0, H = 0, dpr = 1, drops = [], RAIN = { dark: ["190,214,245", [0.12, 0.22, 0.36]], light: ["52,70,104", [0.1, 0.17, 0.26]] };
  function seedDrops() {
    var n = Math.min(120, Math.round((W * H) / 900)), r = rng(7);
    drops = [];
    for (var i = 0; i < n; i++) {
      var layer = i % 3;
      drops.push({ l: layer, x: r() * (W + 60) - 30, y: r() * H, v: (380 + layer * 210) * (0.85 + r() * 0.3), len: (7 + layer * 6) * (0.8 + r() * 0.4) });
    }
  }
  function resize() {
    buildSky();
    if (!ctx) return;
    var rc = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(rc.width)), h = Math.max(1, Math.round(rc.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
    W = w; H = h;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedDrops();
    draw(still() ? 0.6 : 0);
  }

  // ---- lightning ----
  var flashAt = -1, nextFlash = 6 + Math.random() * 6, pulses = [], bolt = null, flashX = 0, PULSE_MS = 420;
  function level(e) { // e = seconds since the strike
    var f = 0;
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i], q = (e - p[0]) / p[1];
      if (q >= 0 && q <= 1) f = Math.max(f, p[2] * (q < 0.25 ? q / 0.25 : 1 - (q - 0.25) / 0.75));
    }
    return f;
  }
  function trigger(t) {
    flashAt = t;
    flashX = (W || 390) * (0.15 + Math.random() * 0.7);
    pulses = [[0, 0.07, 1], [0.13, 0.06, 0.55]];
    if (Math.random() < 0.6) pulses.push([0.27, 0.11, 0.8]);
    bolt = null;
    if (Math.random() < 0.45 && H) {
      var x = flashX, y = -4, segs = [], br = [], i;
      for (i = 0; i < 9 && y < H * 0.62; i++) {
        var nx = x + (Math.random() - 0.5) * 14, ny = y + 6 + Math.random() * 9;
        segs.push([x, y, nx, ny]);
        if (i > 1 && Math.random() < 0.3) br.push([nx, ny, nx + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 12), ny + 8 + Math.random() * 10]);
        x = nx; y = ny;
      }
      bolt = { segs: segs, br: br };
    }
    nextFlash = t + 8 + Math.random() * 12;
    lightClouds();
  }
  // light the clouds from inside: brightness keyframes sampled from the pulse curve, peak
  // scaled by distance from the strike; plus the sky glow behind the front layer
  function lightClouds() {
    if (!Element.prototype.animate) return;
    var dark = theme() === "dark", gain = dark ? 1.1 : 0.22, N = 22, i;
    function frames(peak, prop) {
      var out = [];
      for (i = 0; i <= N; i++) {
        var v = level((i / N) * PULSE_MS / 1000) * peak, fr = { offset: i / N };
        if (prop === "o") fr.opacity = v; else fr.filter = "brightness(" + (1 + v).toFixed(3) + ")";
        out.push(fr);
      }
      return out;
    }
    var opts = { duration: PULSE_MS, easing: "linear" };
    var all = clouds.concat(bars.map(function (b) { return b.querySelector(":scope > .cb"); }).filter(Boolean));
    var vw = window.innerWidth || 390;
    all.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.right < 0 || r.left > vw || r.bottom < 0) return;
      var d = Math.abs((r.left + r.right) / 2 - flashX) / vw, near = Math.max(0.3, 1 - d * 1.4);
      var bar = el.classList.contains("cb");
      try { el.animate(frames(gain * near * (bar ? 0.55 : 1), "f"), opts); } catch (e) {}
    });
    var g = wx && wx.querySelector(".wx-flash");
    if (g) { g.style.setProperty("--fx", Math.round(flashX) + "px"); try { g.animate(frames(dark ? 1 : 0.6, "o"), opts); } catch (e) {} }
  }

  var t0 = 0, last = 0, SLANT = 0.2;
  function draw(dt) {
    if (!ctx || !W) return;
    var t = (t0 += dt), k, i, s = still();
    if (!s && dt > 0 && t >= nextFlash) trigger(t);
    var fl = s || flashAt < 0 ? 0 : level(t - flashAt), pal = RAIN[theme()];
    ctx.clearRect(0, 0, W, H);
    if (bolt && fl > 0.05) {
      ctx.lineCap = "round";
      ctx.beginPath();
      for (i = 0; i < bolt.segs.length; i++) { var a = bolt.segs[i]; ctx.moveTo(a[0], a[1]); ctx.lineTo(a[2], a[3]); }
      for (i = 0; i < bolt.br.length; i++) { var b = bolt.br[i]; ctx.moveTo(b[0], b[1]); ctx.lineTo(b[2], b[3]); }
      ctx.strokeStyle = "rgba(255,255,255," + (0.14 * fl).toFixed(3) + ")"; ctx.lineWidth = 3.2; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255," + (0.6 * fl).toFixed(3) + ")"; ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.lineCap = "round";
    for (k = 0; k < 3; k++) {
      ctx.beginPath();
      for (i = k; i < drops.length; i += 3) {
        var d = drops[i];
        d.y += d.v * dt; d.x += d.v * SLANT * dt;
        if (d.y - d.len > H) { d.y = -Math.random() * 20; d.x = Math.random() * (W + 60) - 60; }
        if (d.x > W + 30) d.x -= W + 60;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * SLANT, d.y - d.len);
      }
      ctx.strokeStyle = "rgba(" + pal[0] + "," + Math.min(0.6, pal[1][k] * (1 + fl)) + ")";
      ctx.lineWidth = 0.6 + k * 0.35;
      ctx.stroke();
    }
  }

  var raf = 0, visible = true;
  function frame(ts) {
    raf = 0;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    draw(dt);
    schedule();
  }
  function running() { return visible && !document.hidden && !still(); }
  function schedule() {
    if (!raf && running()) raf = requestAnimationFrame(frame);
    if (!running()) last = 0;
  }

  if (hero) {
    resize();
    schedule();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(hero);
    else window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", schedule);
    if (rm && rm.addEventListener) rm.addEventListener("change", function () { draw(0.6); schedule(); });
    if (window.IntersectionObserver)
      new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; schedule(); }).observe(hero);
    if (window.MutationObserver)
      new MutationObserver(function () { draw(0); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  }
  // Preview hook (screenshots/recordings): MPRain.flash() fires a strike now.
  window.MPRain = { flash: function () { if (!still()) trigger(t0); }, refit: function () { bars.forEach(function (b) { var c = b.querySelector(":scope > .cb"); if (c) c.removeAttribute("data-k"); fitBar(b); }); } };
})();
