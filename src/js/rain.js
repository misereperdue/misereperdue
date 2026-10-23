/* Header weather (per dc): animated rain, drifting clouds, a faded moon and
 * periodic lightning behind the glass nav pill and the Chat/Globe top bars.
 * One <canvas class="hero-rain"> inside header.hero, drawn with rAF.
 *  - DPR capped at 2, ~80 streaks batched into 3 strokes per frame.
 *  - Clouds: 3 periodic soft-noise textures generated once (small offscreen
 *    canvases, scaled up smoothly) and scrolled at different speeds. The moon
 *    sits behind them; its halo breathes slowly and brightens where the cloud
 *    cover over it thins.
 *  - Lightning every ~8-20 s: a cloud-lit glow (brightness capped, never a
 *    page-wide white), 2-3 pulses within ~400 ms (<= 3 per second), sometimes
 *    a faint branching bolt between cloud layers; "thunder" is a slight cloud
 *    swell + tiny shake a moment later. No audio.
 *  - Paused when the tab is hidden or the header is offscreen; one static frame
 *    (moon, no lightning) under prefers-reduced-motion.
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
      moon: [222, 234, 250], moonA: 0.62, halo: "170,200,240", haloA: 0.3,
      flash: "205,222,255", flashA: 0.3, bolt: "232,240,255",
    },
    light: {
      sky: ["#b7c3d3", "#cdd6e2", "#dfe5ee"],
      cloud: [[150, 163, 182], [176, 188, 205], [236, 240, 246]],
      cloudA: [0.55, 0.55, 0.6],
      rain: "52,70,104",
      rainA: [0.1, 0.17, 0.26],
      mist: "255,255,255",
      moon: [255, 255, 255], moonA: 0.92, halo: "120,138,166", haloA: 0.22,
      flash: "255,255,255", flashA: 0.16, bolt: "255,255,255",
    },
  };

  // ---- periodic value noise (wraps horizontally so clouds scroll forever) ----
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function sm(t) { return t * t * (3 - 2 * t); }
  function cloudTex(seed, w, h, cells, color, alpha, top, bottom) {
    var r = rng(seed), oct = [], o, i, j;
    for (o = 0; o < 4; o++) {
      var cx = cells << o, cy = Math.max(2, Math.round((cells << o) * h / w)) + 1, g = [];
      for (i = 0; i < cx * cy; i++) g.push(r());
      oct.push({ cx: cx, cy: cy, g: g });
    }
    function val(n, x, y) {
      var fx = x * n.cx, fy = y * (n.cy - 1), x0 = Math.floor(fx), y0 = Math.floor(fy),
        tx = sm(fx - x0), ty = sm(fy - y0), x1 = (x0 + 1) % n.cx, y1 = Math.min(y0 + 1, n.cy - 1);
      x0 %= n.cx;
      var a = n.g[y0 * n.cx + x0], b = n.g[y0 * n.cx + x1], c = n.g[y1 * n.cx + x0], d = n.g[y1 * n.cx + x1];
      return a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty;
    }
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x2 = c.getContext("2d"), img = x2.createImageData(w, h), d = img.data, p = 0, cover = new Float32Array(w * h);
    for (j = 0; j < h; j++) {
      var yy = j / (h - 1), band = Math.min(1, Math.max(0, (yy - top) / 0.25)) * Math.min(1, Math.max(0, (bottom - yy) / 0.3));
      for (i = 0; i < w; i++) {
        var xx = i / w, n = 0, amp = 0.5;
        for (o = 0; o < 4; o++) { n += val(oct[o], xx, yy) * amp; amp *= 0.5; }
        n = (n / 0.9375 - 0.42) / 0.38;
        n = n < 0 ? 0 : n > 1 ? 1 : sm(n);
        var a = n * alpha * band;
        cover[j * w + i] = a;
        d[p++] = color[0]; d[p++] = color[1]; d[p++] = color[2];
        d[p++] = Math.round(255 * a);
      }
    }
    x2.putImageData(img, 0, 0);
    c.cover = cover;
    return c;
  }
  // Moon: a crescent (lit limb, faint maria), drawn once; halo is a live gradient.
  function moonTex(col, alpha) {
    var s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    var m = c.getContext("2d"), img = m.createImageData(s, s), d = img.data, r = rng(5), spots = [], i, x, y, p = 0;
    for (i = 0; i < 7; i++) spots.push([0.25 + r() * 0.5, 0.25 + r() * 0.5, 0.08 + r() * 0.12, 0.1 + r() * 0.12]);
    for (y = 0; y < s; y++) for (x = 0; x < s; x++) {
      var dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, dd = Math.sqrt(dx * dx + dy * dy) / 0.5;
      var edge = 1 - sm(Math.min(1, Math.max(0, (dd - 0.86) / 0.14))), shade = 1 - 0.12 * dd * dd;
      // shadow disc offset up-left carves the crescent
      var ox = dx + 0.17, oy = dy + 0.1, od = Math.sqrt(ox * ox + oy * oy) / 0.45;
      var lit = sm(Math.min(1, Math.max(0, (od - 0.9) / 0.14)));
      for (i = 0; i < spots.length; i++) {
        var sx = (x + 0.5) / s - spots[i][0], sy = (y + 0.5) / s - spots[i][1], q = Math.sqrt(sx * sx + sy * sy) / spots[i][2];
        if (q < 1) shade -= spots[i][3] * 0.6 * (1 - sm(q));
      }
      d[p++] = col[0] * shade; d[p++] = col[1] * shade; d[p++] = col[2] * shade;
      d[p++] = Math.round(255 * alpha * edge * lit);
    }
    m.putImageData(img, 0, 0);
    return c;
  }

  var W = 0, H = 0, dpr = 1, pal, clouds = [], moon, skyGrad, mistGrad, drops = [];
  var LAYERS = [ // far, mid, near
    { speed: 7, scale: 1.0, y: -0.08, h: 0.95 },
    { speed: 13, scale: 1.25, y: -0.02, h: 0.9 },
    { speed: 22, scale: 1.6, y: 0.04, h: 0.85 },
  ];
  var TW = 192, TH = 48;

  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function build() {
    pal = PAL[theme()];
    clouds = [];
    for (var k = 0; k < 3; k++) clouds.push(cloudTex(11 + k * 37, TW, TH, 3 + k, pal.cloud[k], pal.cloudA[k], 0, 0.9 - k * 0.12));
    moon = moonTex(pal.moon, pal.moonA);
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

  // ---- moon placement + cloud cover over it ----
  function moonPos() {
    // upper right, just clear of the centred nav pill so it reads through glass
    var r = Math.max(10, Math.min(16, W * 0.034));
    return { x: Math.min(W - r - 18, W * 0.5 + 118), y: Math.max(r + 8, H * 0.2), r: r };
  }
  function coverAt(k, px, py, off, tw, th, y0) {
    var u = (px - off) / tw; u -= Math.floor(u);
    var v = (py - y0) / th;
    if (v < 0 || v >= 1) return 0;
    return clouds[k].cover[Math.floor(v * TH) * TW + Math.floor(u * TW)];
  }

  // ---- lightning ----
  var flashAt = -1, nextFlash = 6 + Math.random() * 6, pulses = [], bolt = null, flashX = 0;
  function scheduleFlash(t) { nextFlash = t + 8 + Math.random() * 12; }
  function trigger(t) {
    flashAt = t;
    flashX = W * (0.15 + Math.random() * 0.7);
    // 2-3 pulses inside ~400 ms (<= 3 flashes per second); [start, dur, peak]
    pulses = [[0, 0.07, 1], [0.13, 0.06, 0.55]];
    if (Math.random() < 0.6) pulses.push([0.27, 0.11, 0.8]);
    bolt = null;
    if (Math.random() < 0.45) {
      var x = flashX, y = -4, segs = [], br = [], i;
      for (i = 0; i < 9 && y < H * 0.62; i++) {
        var nx = x + (Math.random() - 0.5) * 14, ny = y + 6 + Math.random() * 9;
        segs.push([x, y, nx, ny]);
        if (i > 1 && Math.random() < 0.3) br.push([nx, ny, nx + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 12), ny + 8 + Math.random() * 10]);
        x = nx; y = ny;
      }
      bolt = { segs: segs, br: br };
    }
    scheduleFlash(t);
  }
  function flashLevel(t) {
    if (flashAt < 0) return 0;
    var e = t - flashAt, f = 0;
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i], q = (e - p[0]) / p[1];
      if (q >= 0 && q <= 1) f = Math.max(f, p[2] * (q < 0.25 ? q / 0.25 : 1 - (q - 0.25) / 0.75));
    }
    return f;
  }
  function thunderLevel(t) { // swell ~0.7-1.9 s after the flash
    if (flashAt < 0) return 0;
    var e = t - flashAt - 0.7;
    return e > 0 && e < 1.2 ? Math.sin((e / 1.2) * Math.PI) : 0;
  }

  var t0 = 0, last = 0, SLANT = 0.2;
  function draw(dt) {
    if (!W) return;
    var t = (t0 += dt), k, i, still = rm && rm.matches;
    if (!still && dt > 0 && t >= nextFlash) trigger(t);
    var fl = still ? 0 : flashLevel(t), th = still ? 0 : thunderLevel(t);
    var shake = th ? Math.sin(t * 38) * 0.6 * th : 0;

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // moon + halo (behind clouds); halo breathes and grows where clouds thin
    var mp = moonPos(), offs = [], cover = 0;
    for (k = 0; k < 3; k++) {
      var L = LAYERS[k], tw = Math.max(W, 390) * L.scale;
      offs.push(-((t * L.speed) % tw));
      cover += coverAt(k, mp.x, mp.y, offs[k], tw, H * L.h, H * L.y);
    }
    var clear = Math.max(0, 1 - cover * 1.1), breathe = 0.82 + 0.18 * Math.sin(t * 0.9);
    var hr = mp.r * (4.2 + 1.2 * clear), hg = ctx.createRadialGradient(mp.x, mp.y, mp.r * 0.6, mp.x, mp.y, hr);
    var ha = pal.haloA * breathe * (0.45 + 0.55 * clear);
    hg.addColorStop(0, "rgba(" + pal.halo + "," + ha.toFixed(3) + ")");
    hg.addColorStop(0.35, "rgba(" + pal.halo + "," + (ha * 0.35).toFixed(3) + ")");
    hg.addColorStop(1, "rgba(" + pal.halo + ",0)");
    ctx.fillStyle = hg;
    ctx.fillRect(mp.x - hr, mp.y - hr, hr * 2, hr * 2);
    ctx.globalAlpha = 0.75 + 0.25 * clear;
    ctx.drawImage(moon, mp.x - mp.r, mp.y - mp.r, mp.r * 2, mp.r * 2);
    ctx.globalAlpha = 1;

    // clouds: each texture spans a tile of (W*scale) and wraps horizontally;
    // a lightning bolt (if any) sits between the far and mid layers
    for (k = 0; k < 3; k++) {
      var L2 = LAYERS[k], tw2 = Math.max(W, 390) * L2.scale, th2 = H * L2.h, y = H * L2.y + shake * (k + 1) * 0.5, off = offs[k];
      ctx.drawImage(clouds[k], off, y, tw2, th2);
      ctx.drawImage(clouds[k], off + tw2, y, tw2, th2);
      if (off + 2 * tw2 < W) ctx.drawImage(clouds[k], off + 2 * tw2, y, tw2, th2);
      if (k === 0 && bolt && fl > 0.05) drawBolt(fl);
    }

    // the moon shines through passing cloud: soft glow + crescent re-drawn on top
    var thru = Math.min(1, cover * 1.6);
    if (thru > 0.02) {
      var sg = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, mp.r * 2.6);
      sg.addColorStop(0, "rgba(" + pal.halo + "," + (0.32 * thru * breathe).toFixed(3) + ")");
      sg.addColorStop(1, "rgba(" + pal.halo + ",0)");
      ctx.fillStyle = sg;
      ctx.fillRect(mp.x - mp.r * 2.6, mp.y - mp.r * 2.6, mp.r * 5.2, mp.r * 5.2);
      ctx.globalAlpha = thru * (0.62 + 0.08 * breathe);
      ctx.drawImage(moon, mp.x - mp.r, mp.y - mp.r, mp.r * 2, mp.r * 2);
      ctx.globalAlpha = 1;
    }

    // lightning glow lights the clouds from within; thunder = slight swell
    var glow = fl * pal.flashA + th * 0.05;
    if (glow > 0.004) {
      ctx.globalCompositeOperation = "lighter";
      var gr = ctx.createRadialGradient(flashX, H * 0.25, 0, flashX, H * 0.25, W * 0.6);
      gr.addColorStop(0, "rgba(" + pal.flash + "," + Math.min(0.34, glow).toFixed(3) + ")");
      gr.addColorStop(1, "rgba(" + pal.flash + ",0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.min(0.5, glow * 1.3);
      for (k = 1; k < 3; k++) {
        var L3 = LAYERS[k], tw3 = Math.max(W, 390) * L3.scale;
        ctx.drawImage(clouds[k], offs[k], H * L3.y, tw3, H * L3.h);
        ctx.drawImage(clouds[k], offs[k] + tw3, H * L3.y, tw3, H * L3.h);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
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
      ctx.strokeStyle = "rgba(" + pal.rain + "," + Math.min(0.6, pal.rainA[k] * (1 + fl)) + ")";
      ctx.lineWidth = 0.6 + k * 0.35;
      ctx.stroke();
    }
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
  }
  function drawBolt(fl) {
    var i, s;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i < bolt.segs.length; i++) { s = bolt.segs[i]; ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
    for (i = 0; i < bolt.br.length; i++) { s = bolt.br[i]; ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
    ctx.strokeStyle = "rgba(" + pal.bolt + "," + (0.12 * fl).toFixed(3) + ")";
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(" + pal.bolt + "," + (0.5 * fl).toFixed(3) + ")";
    ctx.lineWidth = 0.9;
    ctx.stroke();
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

  // Preview hook (screenshots/recordings): MPRain.flash() fires a strike now.
  window.MPRain = { flash: function () { if (!(rm && rm.matches)) trigger(t0); } };

  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  else window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", schedule);
  if (rm && rm.addEventListener) rm.addEventListener("change", function () { draw(0.6); schedule(); });
  if (window.IntersectionObserver)
    new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; schedule(); }).observe(cv);
  if (window.MutationObserver)
    new MutationObserver(function () { build(); draw(0); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
