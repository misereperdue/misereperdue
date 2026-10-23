/* Header weather (per dc): animated rain + drifting clouds behind the glass
 * nav pill and the Chat/Globe top bars. One <canvas class="hero-rain"> inside
 * header.hero, drawn with requestAnimationFrame.
 *  - DPR capped at 2, ~80 streaks batched into 3 strokes per frame.
 *  - Clouds: 3 periodic soft-noise textures generated once (small offscreen
 *    canvases, scaled up smoothly) and scrolled at different speeds.
 *  - Paused when the tab is hidden or the header is offscreen; a single static
 *    frame under prefers-reduced-motion. Low contrast, no sparkle, so nothing
 *    flickers under backdrop-filter glass.
 *  - Re-themes when <html data-theme> changes. */
(function () {
  "use strict";
  var cv = document.querySelector("canvas.hero-rain");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d", { alpha: false });
  if (!ctx) return;
  var root = document.documentElement;
  var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  var PAL = {
    dark: {
      sky: ["#040a1f", "#0a1636", "#0d1b40"],
      cloud: [[44, 62, 108], [60, 84, 138], [84, 110, 166]],
      cloudA: [0.62, 0.55, 0.45],
      rain: "190,214,245",
      rainA: [0.12, 0.22, 0.36],
      mist: "120,150,200",
    },
    light: {
      sky: ["#b7c3d3", "#cdd6e2", "#dfe5ee"],
      cloud: [[150, 163, 182], [176, 188, 205], [236, 240, 246]],
      cloudA: [0.55, 0.55, 0.6],
      rain: "52,70,104",
      rainA: [0.1, 0.17, 0.26],
      mist: "255,255,255",
    },
  };

  // ---- periodic value noise (wraps horizontally so clouds scroll forever) ----
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function cloudTex(seed, w, h, cells, color, alpha, top, bottom) {
    var r = rng(seed), oct = [], o, i, j;
    for (o = 0; o < 4; o++) {
      var cx = cells << o, cy = Math.max(2, Math.round((cells << o) * h / w)) + 1, g = [];
      for (i = 0; i < cx * cy; i++) g.push(r());
      oct.push({ cx: cx, cy: cy, g: g });
    }
    function sm(t) { return t * t * (3 - 2 * t); }
    function val(n, x, y) {
      var fx = x * n.cx, fy = y * (n.cy - 1), x0 = Math.floor(fx), y0 = Math.floor(fy),
        tx = sm(fx - x0), ty = sm(fy - y0), x1 = (x0 + 1) % n.cx, y1 = Math.min(y0 + 1, n.cy - 1);
      x0 %= n.cx;
      var a = n.g[y0 * n.cx + x0], b = n.g[y0 * n.cx + x1], c = n.g[y1 * n.cx + x0], d = n.g[y1 * n.cx + x1];
      return a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty;
    }
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x2 = c.getContext("2d"), img = x2.createImageData(w, h), d = img.data, p = 0;
    for (j = 0; j < h; j++) {
      var yy = j / (h - 1), band = Math.min(1, Math.max(0, (yy - top) / 0.25)) * Math.min(1, Math.max(0, (bottom - yy) / 0.3));
      for (i = 0; i < w; i++) {
        var xx = i / w, n = 0, amp = 0.5;
        for (o = 0; o < 4; o++) { n += val(oct[o], xx, yy) * amp; amp *= 0.5; }
        n = (n / 0.9375 - 0.42) / 0.38;
        n = n < 0 ? 0 : n > 1 ? 1 : sm(n);
        d[p++] = color[0]; d[p++] = color[1]; d[p++] = color[2];
        d[p++] = Math.round(255 * n * alpha * band);
      }
    }
    x2.putImageData(img, 0, 0);
    return c;
  }

  var W = 0, H = 0, dpr = 1, pal, clouds = [], skyGrad, mistGrad, drops = [];
  var LAYERS = [ // far, mid, near
    { speed: 7, scale: 1.0, y: -0.08, h: 0.95 },
    { speed: 13, scale: 1.25, y: -0.02, h: 0.9 },
    { speed: 22, scale: 1.6, y: 0.04, h: 0.85 },
  ];

  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function build() {
    pal = PAL[theme()];
    clouds = [];
    for (var k = 0; k < 3; k++) clouds.push(cloudTex(11 + k * 37, 192, 48, 3 + k, pal.cloud[k], pal.cloudA[k], 0, 0.9 - k * 0.12));
    paint();
  }
  function paint() {
    if (!W) return;
    skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, pal.sky[0]);
    skyGrad.addColorStop(0.55, pal.sky[1]);
    skyGrad.addColorStop(1, pal.sky[2]);
    mistGrad = ctx.createLinearGradient(0, H * 0.45, 0, H);
    mistGrad.addColorStop(0, "rgba(" + pal.mist + ",0)");
    mistGrad.addColorStop(1, "rgba(" + pal.mist + ",0.10)");
  }

  function seedDrops() {
    var n = Math.min(120, Math.round((W * H) / 900)), r = rng(7);
    drops = [];
    for (var i = 0; i < n; i++) {
      var layer = i % 3; // 0 far, 1 mid, 2 near
      drops.push({
        l: layer,
        x: r() * (W + 60) - 30,
        y: r() * H,
        v: (380 + layer * 210) * (0.85 + r() * 0.3), // CSS px / s
        len: (7 + layer * 6) * (0.8 + r() * 0.4),
      });
    }
  }

  function resize() {
    var rc = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(rc.width)), h = Math.max(1, Math.round(rc.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
    W = w; H = h;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    paint();
    seedDrops();
    draw(0);
  }

  var t0 = 0, last = 0, SLANT = 0.2;
  function draw(dt) {
    if (!W) return;
    var t = (t0 += dt), k, i;
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);
    // clouds: each texture spans a tile of (W*scale) and wraps horizontally
    for (k = 0; k < 3; k++) {
      var L = LAYERS[k], tw = Math.max(W, 390) * L.scale, th = H * L.h, y = H * L.y;
      var off = -((t * L.speed) % tw);
      ctx.drawImage(clouds[k], off, y, tw, th);
      ctx.drawImage(clouds[k], off + tw, y, tw, th);
      if (off + 2 * tw < W) ctx.drawImage(clouds[k], off + 2 * tw, y, tw, th);
    }
    // rain: one stroke per depth layer
    ctx.lineCap = "round";
    for (k = 0; k < 3; k++) {
      ctx.beginPath();
      for (i = k; i < drops.length; i += 3) {
        var d = drops[i];
        d.y += d.v * dt;
        d.x += d.v * SLANT * dt;
        if (d.y - d.len > H) { d.y = -Math.random() * 20; d.x = Math.random() * (W + 60) - 60; }
        if (d.x > W + 30) d.x -= W + 60;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * SLANT, d.y - d.len);
      }
      ctx.strokeStyle = "rgba(" + pal.rain + "," + pal.rainA[k] + ")";
      ctx.lineWidth = 0.6 + k * 0.35;
      ctx.stroke();
    }
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
  }

  var raf = 0, visible = true;
  function frame(ts) {
    raf = 0;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    draw(dt);
    schedule();
  }
  function running() { return visible && !document.hidden && !(rm && rm.matches); }
  function schedule() {
    if (!raf && running()) raf = requestAnimationFrame(frame);
    if (!running()) last = 0;
  }

  build();
  resize();
  if (rm && rm.matches) draw(0.6); // static frame with rain mid-fall
  schedule();

  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  else window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", schedule);
  if (rm && rm.addEventListener) rm.addEventListener("change", function () { draw(0.6); schedule(); });
  if (window.IntersectionObserver)
    new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; schedule(); }).observe(cv);
  if (window.MutationObserver)
    new MutationObserver(function () { build(); draw(0); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
