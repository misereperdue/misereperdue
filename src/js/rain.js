/* Header weather (per dc): animated rain, drifting clouds, a faded moon and
 * periodic lightning behind the glass nav pill and the Chat/Globe top bars.
 * One <canvas class="hero-rain"> inside header.hero, drawn with rAF.
 *  - DPR capped at 2, ~80 streaks batched into 3 strokes per frame.
 *  - Clouds: pre-rendered cumulus sprites (3 small WebPs) tinted per mode
 *    and drifted in 3 parallax layers. The moon
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
      rain: "190,214,245",
      rainA: [0.12, 0.22, 0.36],
      mist: "150,150,155",
      moon: [238, 238, 236], moonA: 0.6, halo: "228,228,226", haloA: 0.26, lining: 0.45,
      flash: "255,255,255", flashA: 0.28, bolt: "255,255,255",
    },
    light: {
      sky: ["#b7c3d3", "#cdd6e2", "#dfe5ee"],
      rain: "52,70,104",
      rainA: [0.1, 0.17, 0.26],
      mist: "255,255,255",
      moon: [255, 255, 255], moonA: 0.42, halo: "255,255,255", haloA: 0.18, lining: 0.1,
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
  // Clouds are pre-rendered cumulus sprites (img/cloud-0..2.webp: neutral
  // luminance + alpha, lit from the upper left, ~3x the drawn size), tinted
  // once per mode into canvases and drifted in 3 parallax layers.
  var SPR_SRC = ["img/cloud-0.webp?v=1", "img/cloud-1.webp?v=1", "img/cloud-2.webp?v=1"];
  var sprImgs = [], spr = [], sprReady = 0;
  function tintSprites() {
    if (sprReady < SPR_SRC.length) return;
    var dark = theme() === "dark";
    spr = sprImgs.map(function (im) {
      var w = im.naturalWidth, h = im.naturalHeight, c = document.createElement("canvas");
      c.width = w; c.height = h;
      var g = c.getContext("2d");
      g.drawImage(im, 0, 0);
      var id = g.getImageData(0, 0, w, h), d = id.data, cw = Math.ceil(w / 4), ch = Math.ceil(h / 4), cov = new Float32Array(cw * ch), i, x, y;
      for (i = 0; i < d.length; i += 4) {
        var L = d[i] / 255, v = dark ? 18 + 165 * Math.pow(L, 1.6) : 150 + 105 * L;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = d[i + 3] * (dark ? 0.9 : 0.95);
      }
      for (y = 0; y < ch; y++) for (x = 0; x < cw; x++) cov[y * cw + x] = d[((Math.min(h - 1, y * 4) * w) + Math.min(w - 1, x * 4)) * 4 + 3] / 255;
      g.putImageData(id, 0, 0);
      return { c: c, w: w, h: h, cov: cov, cw: cw, ch: ch };
    });
  }
  SPR_SRC.forEach(function (src, i) {
    var im = new Image();
    im.decoding = "async";
    im.onload = function () { sprReady++; tintSprites(); if (!raf) draw(0); };
    im.src = src;
    sprImgs[i] = im;
  });
  // layers far -> near: [count, height (x H), top (x H), alpha, speed px/s]
  var CL = [[3, 0.36, -0.04, 0.7, 6], [3, 0.5, 0.06, 0.85, 11], [2, 0.64, 0.2, 1, 18]];
  var inst = [];
  (function () {
    var r = rng(41);
    for (var k = 0; k < 3; k++) for (var i = 0; i < CL[k][0]; i++)
      inst.push({ k: k, s: (k * 2 + i) % 3, u: (i + r() * 0.5) / CL[k][0], dy: (r() - 0.5) * 0.12, sc: 0.85 + r() * 0.3, x: 0, y: 0, w: 0, h: 0 });
  })();
  function placeClouds(t) {
    if (!spr.length) return;
    for (var i = 0; i < inst.length; i++) {
      var n = inst[i], L = CL[n.k], sp = spr[n.s];
      n.h = H * L[1] * n.sc; n.w = n.h * sp.w / sp.h;
      var span = W + n.w + 40;
      n.x = ((n.u * span + t * L[4]) % span) - n.w - 20;
      n.y = H * (L[2] + n.dy);
    }
  }
  function drawLayer(c, k, ox, oy, a) {
    if (!spr.length) return;
    for (var i = 0; i < inst.length; i++) {
      var n = inst[i];
      if (n.k !== k) continue;
      c.globalAlpha = CL[k][3] * (a === undefined ? 1 : a);
      c.drawImage(spr[n.s].c, n.x + ox, n.y + oy, n.w, n.h);
    }
    c.globalAlpha = 1;
  }
  function coverAt(px, py) {
    var t = 0;
    for (var i = 0; i < inst.length && spr.length; i++) {
      var n = inst[i], sp = spr[n.s];
      if (px < n.x || px >= n.x + n.w || py < n.y || py >= n.y + n.h) continue;
      var a = sp.cov[Math.floor((py - n.y) / n.h * sp.ch) * sp.cw + Math.floor((px - n.x) / n.w * sp.cw)] * CL[n.k][3];
      t = t + a * (1 - t);
    }
    return t;
  }

  // Crescent moon: lit disc minus an offset disc (tilted), feathered edges,
  // the dark side not drawn apart from an extremely faint earthshine.
  function moonTex(col, alpha) {
    var S = 96, c = document.createElement("canvas");
    c.width = c.height = S;
    var m = c.getContext("2d"), img = m.createImageData(S, S), d = img.data, x, y, p = 0;
    var ang = -0.45, ox = Math.cos(ang) * 0.3, oy = Math.sin(ang) * 0.3; // shadow disc offset (in radii)
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      var dx = ((x + 0.5) / S - 0.5) / 0.42, dy = ((y + 0.5) / S - 0.5) / 0.42; // unit = moon radius
      var dd = Math.sqrt(dx * dx + dy * dy), disc = 1 - sm(Math.min(1, Math.max(0, (dd - 0.9) / 0.14)));
      var sx = dx - ox, sy = dy - oy, sd = Math.sqrt(sx * sx + sy * sy) / 0.92;
      var lit = disc * sm(Math.min(1, Math.max(0, (sd - 0.94) / 0.14)));
      var a = Math.max(lit, disc * 0.05);
      d[p++] = col[0]; d[p++] = col[1]; d[p++] = col[2];
      d[p++] = Math.round(255 * alpha * a);
    }
    m.putImageData(img, 0, 0);
    return c;
  }

  var lb = null, lbx = null;
  var W = 0, H = 0, dpr = 1, pal, moon, moonOver, skyGrad, mistGrad, drops = [];

  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function build() {
    pal = PAL[theme()];
    tintSprites();
    moon = moonTex(pal.moon, pal.moonA);
    moonOver = moonTex(pal.moon, 0.95);
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
    // top right corner, clear of the nav cloud (centre) and above the Chat/Globe
    // top bar (starts ~82px down), so it is never hidden behind a bar
    var r = Math.max(12, Math.min(16, W * 0.038));
    return { x: W - r - 22, y: r + 14, r: r };
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
    placeClouds(t);
    var mp = moonPos(), cover = coverAt(mp.x, mp.y);
    var clear = Math.max(0, 1 - cover * 1.1), breathe = 0.82 + 0.18 * Math.sin(t * 0.9);
    var hr = mp.r * (4.2 + 1.2 * clear), hg = ctx.createRadialGradient(mp.x, mp.y, mp.r * 0.6, mp.x, mp.y, hr);
    var ha = pal.haloA * breathe * (0.45 + 0.55 * clear);
    hg.addColorStop(0, "rgba(" + pal.halo + "," + ha.toFixed(3) + ")");
    hg.addColorStop(0.35, "rgba(" + pal.halo + "," + (ha * 0.35).toFixed(3) + ")");
    hg.addColorStop(1, "rgba(" + pal.halo + ",0)");
    ctx.fillStyle = hg;
    ctx.fillRect(mp.x - hr, mp.y - hr, hr * 2, hr * 2);
    ctx.globalAlpha = 0.75 + 0.25 * clear;
    var mR = mp.r / 0.84;
    ctx.drawImage(moon, mp.x - mR, mp.y - mR, mR * 2, mR * 2);
    ctx.globalAlpha = 1;

    // clouds: each texture spans a tile of (W*scale) and wraps horizontally;
    // a lightning bolt (if any) sits between the far and mid layers
    for (k = 0; k < 3; k++) {
      drawLayer(ctx, k, 0, shake * (k + 1) * 0.5);
      if (k === 0 && bolt && fl > 0.05) drawBolt(fl);
    }

    // moonlight through cloud: backlit glow + silver lining on the clouds
    // around the moon, and a softened crescent on top so it never vanishes
    // (dimmer under thick cloud, brighter as it thins)
    var cv2 = Math.min(1, cover * 1.6);
    if (cv2 > 0.02) {
      var lr = mp.r * 4.5;
      // glow on the cloud around the moon (light mode: a faint cool shade
      // ring instead, since white-on-white glow would not read)
      var bg2 = ctx.createRadialGradient(mp.x, mp.y, mp.r * 0.8, mp.x, mp.y, lr);
      if (theme() === "dark") {
        ctx.globalCompositeOperation = "lighter";
        var ba = pal.haloA * (0.7 + 0.3 * breathe) * cv2;
        bg2.addColorStop(0, "rgba(" + pal.halo + "," + ba.toFixed(3) + ")");
        bg2.addColorStop(0.4, "rgba(" + pal.halo + "," + (ba * 0.35).toFixed(3) + ")");
        bg2.addColorStop(1, "rgba(" + pal.halo + ",0)");
      } else {
        var sa = 0.2 * cv2;
        bg2.addColorStop(0, "rgba(118,132,158," + sa.toFixed(3) + ")");
        bg2.addColorStop(0.35, "rgba(118,132,158," + (sa * 0.45).toFixed(3) + ")");
        bg2.addColorStop(1, "rgba(118,132,158,0)");
      }
      ctx.fillStyle = bg2;
      ctx.fillRect(mp.x - lr, mp.y - lr, lr * 2, lr * 2);
      ctx.globalCompositeOperation = "source-over";
      // silver lining: clouds around the moon re-drawn into a small buffer,
      // feathered with a radial mask, then added on top (no hard edge)
      var la = pal.lining * breathe * cv2;
      if (la > 0.01) {
        var bs = Math.ceil(lr * 2), bx = mp.x - lr, by = mp.y - lr;
        if (!lb) { lb = document.createElement("canvas"); lbx = lb.getContext("2d"); }
        if (lb.width !== Math.ceil(bs * dpr)) { lb.width = lb.height = Math.ceil(bs * dpr); }
        lbx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lbx.globalCompositeOperation = "source-over";
        lbx.clearRect(0, 0, bs, bs);
        for (k = 0; k < 3; k++) drawLayer(lbx, k, -bx, -by);
        lbx.globalCompositeOperation = "destination-in";
        var mg = lbx.createRadialGradient(lr, lr, 0, lr, lr, lr);
        mg.addColorStop(0, "rgba(0,0,0,1)");
        mg.addColorStop(0.45, "rgba(0,0,0,0.55)");
        mg.addColorStop(1, "rgba(0,0,0,0)");
        lbx.fillStyle = mg;
        lbx.fillRect(0, 0, bs, bs);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = la;
        ctx.drawImage(lb, bx, by, bs, bs);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      // the crescent itself, drawn over the clouds: ~0.6-0.7 opacity when
      // fully covered, so it always reads
      ctx.globalAlpha = cv2 * (0.6 + 0.1 * breathe);
      ctx.drawImage(moonOver, mp.x - mR, mp.y - mR, mR * 2, mR * 2);
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
      for (k = 1; k < 3; k++) drawLayer(ctx, k, 0, 0, Math.min(0.5, glow * 1.3));
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
