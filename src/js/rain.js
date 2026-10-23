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
  // Cloud colours come from the bar cloud recipe in site.css (--cu-fill,
  // --cu-hi, --cu-under) so the header clouds and the glass-bar clouds read
  // as one family; read at init and on every theme change.
  function cssRGBA(name, fb) {
    var v = "";
    try { v = getComputedStyle(root).getPropertyValue(name).trim(); } catch (e) {}
    var m = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/);
    if (!m) return fb;
    var al = m[4] === undefined ? 1 : m[4].indexOf("%") > 0 ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], al];
  }
  function cloudColors(dark) {
    return dark
      ? { fill: cssRGBA("--cu-fill", [186, 186, 190, 0.24]), hi: cssRGBA("--cu-hi", [255, 255, 255, 0.26]), under: cssRGBA("--cu-under", [18, 18, 20, 0.34]) }
      : { fill: cssRGBA("--cu-fill", [255, 255, 255, 0.46]), hi: cssRGBA("--cu-hi", [255, 255, 255, 0.78]), under: cssRGBA("--cu-under", [120, 120, 124, 0.3]) };
  }
  // Soft cumulus, same build as the bar clouds: a union of feathered lobes
  // (solid to 66% of the radius, 0.6 at 84%, clear at 100%) filled with
  // --cu-fill, soft --cu-hi highlights on the upper lobes, and a --cu-under
  // shade from 40% down to the base. Lobes wrap in x so layers scroll forever.
  function cloudTex(seed, w, h, clusters, yBase, rMax, lift, C) {
    var r = rng(seed), i, j, k;
    function cvs() { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
    var cM = cvs(), cU = cvs(), cH = cvs(), gM = cM.getContext("2d"), gU = cU.getContext("2d"), gH = cH.getContext("2d");
    for (i = 0; i < clusters; i++) {
      var cx = r() * w, by = h * (yBase + (r() - 0.5) * 0.16), cw = w * (0.18 + r() * 0.14), n = 6 + Math.floor(r() * 5), top = by, lobes = [];
      for (j = 0; j < n; j++) {
        var u = j / (n - 1), dome = 1 - Math.abs(u - 0.5) * 2;
        var pr = h * rMax * (0.5 + 0.5 * dome) * (0.85 + r() * 0.3);
        var ly = by - pr * (0.2 + 0.5 * dome);
        lobes.push([cx + (u - 0.5) * cw, ly, pr]);
        top = Math.min(top, ly - pr);
      }
      lobes.push([cx, by + h * rMax * 0.25, cw * 0.55]); // flat-ish base
      for (k = -1; k <= 1; k++) {
        var ox = k * w;
        for (j = 0; j < lobes.length; j++) {
          var L = lobes[j], x = L[0] + ox, y = L[1], rr = L[2];
          if (x + rr < 0 || x - rr > w) continue;
          var g = gM.createRadialGradient(x, y, 0, x, y, rr);
          g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.66, "rgba(0,0,0,1)");
          g.addColorStop(0.84, "rgba(0,0,0,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
          gM.fillStyle = g; gM.beginPath(); gM.arc(x, y, rr, 0, 6.2832); gM.fill();
          if (j < lobes.length - 1 && L[1] < by - rr * 0.3) {
            var hg = gH.createRadialGradient(x - rr * 0.1, y - rr * 0.3, 0, x - rr * 0.1, y - rr * 0.3, rr * 0.8);
            hg.addColorStop(0, "rgba(0,0,0,1)"); hg.addColorStop(0.72, "rgba(0,0,0,0)");
            gH.fillStyle = hg; gH.fillRect(x - rr, y - rr * 1.2, rr * 2, rr * 2);
          }
        }
        var bot = by + h * rMax * 0.25 + cw * 0.55 * 0.6, ug = gU.createLinearGradient(0, top, 0, bot);
        ug.addColorStop(0, "rgba(0,0,0,0)"); ug.addColorStop(0.4, "rgba(0,0,0,0)"); ug.addColorStop(1, "rgba(0,0,0,1)");
        gU.fillStyle = ug; gU.fillRect(cx - cw + ox, top, cw * 2, bot - top);
      }
    }
    var M = gM.getImageData(0, 0, w, h).data, U = gU.getImageData(0, 0, w, h).data, Hh = gH.getImageData(0, 0, w, h).data;
    var c = cvs(), g2 = c.getContext("2d"), img = g2.createImageData(w, h), d = img.data, cover = new Float32Array(w * h);
    var F = C.fill, HI = C.hi, UN = C.under;
    for (i = 0, j = 0; i < d.length; i += 4, j++) {
      var m = M[i + 3] / 255;
      if (m < 0.004) continue;
      // premultiplied source-over: fill, then underside shade, then highlight
      var af = F[3] * lift, pr2 = F[0] * af, pg = F[1] * af, pb = F[2] * af, pa = af;
      var au = UN[3] * (U[i + 3] / 255);
      pr2 = UN[0] * au + pr2 * (1 - au); pg = UN[1] * au + pg * (1 - au); pb = UN[2] * au + pb * (1 - au); pa = au + pa * (1 - au);
      var ah = HI[3] * (Hh[i + 3] / 255) * lift;
      pr2 = HI[0] * ah + pr2 * (1 - ah); pg = HI[1] * ah + pg * (1 - ah); pb = HI[2] * ah + pb * (1 - ah); pa = ah + pa * (1 - ah);
      var A = pa * m;
      d[i] = pr2 / pa; d[i + 1] = pg / pa; d[i + 2] = pb / pa; d[i + 3] = Math.round(255 * A);
      cover[j] = A;
    }
    g2.putImageData(img, 0, 0);
    c.cover = cover;
    return c;
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
  var W = 0, H = 0, dpr = 1, pal, clouds = [], moon, skyGrad, mistGrad, drops = [];
  var LAYERS = [ // far, mid, near
    { speed: 7, scale: 1.0, y: -0.08, h: 0.95 },
    { speed: 13, scale: 1.25, y: -0.02, h: 0.9 },
    { speed: 22, scale: 1.6, y: 0.04, h: 0.85 },
  ];
  // [w, h, clusters, base y (0-1), max puff radius (x h)], matched to each layer drawn aspect
  var TEX = [[320, 160, 3, 0.42, 0.2], [320, 112, 3, 0.55, 0.26], [320, 82, 2, 0.66, 0.34]];

  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function build() {
    pal = PAL[theme()];
    clouds = [];
    var C = cloudColors(theme() === "dark");
    for (var k = 0; k < 3; k++) clouds.push(cloudTex(11 + k * 37, TEX[k][0], TEX[k][1], TEX[k][2], TEX[k][3], TEX[k][4], [0.75, 0.9, 1.05][k], C));
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
    var r = Math.max(12, Math.min(18, W * 0.04));
    return { x: Math.min(W - r - 18, W * 0.5 + 118), y: Math.max(r + 8, H * 0.2), r: r };
  }
  function coverAt(k, px, py, off, tw, th, y0) {
    var u = (px - off) / tw; u -= Math.floor(u);
    var v = (py - y0) / th;
    if (v < 0 || v >= 1) return 0;
    var c = clouds[k];
    return c.cover[Math.floor(v * c.height) * c.width + Math.floor(u * c.width)];
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
    var mR = mp.r / 0.84;
    ctx.drawImage(moon, mp.x - mR, mp.y - mR, mR * 2, mR * 2);
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

    // moonlight through cloud: backlit glow + silver lining on the clouds
    // around the moon, and a softened crescent on top so it never vanishes
    // (dimmer under thick cloud, brighter as it thins)
    var cv2 = Math.min(1, cover * 1.4);
    if (cv2 > 0.02) {
      var lr = mp.r * 4.5;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var bg2 = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, lr);
      var ba = pal.haloA * 0.55 * breathe * cv2 * (1 - 0.35 * Math.max(0, cover - 0.7));
      bg2.addColorStop(0, "rgba(" + pal.halo + "," + ba.toFixed(3) + ")");
      bg2.addColorStop(0.5, "rgba(" + pal.halo + "," + (ba * 0.3).toFixed(3) + ")");
      bg2.addColorStop(1, "rgba(" + pal.halo + ",0)");
      ctx.fillStyle = bg2;
      ctx.fillRect(mp.x - lr, mp.y - lr, lr * 2, lr * 2);
      ctx.restore();
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
        for (k = 1; k < 3; k++) {
          var L4 = LAYERS[k], tw4 = Math.max(W, 390) * L4.scale;
          lbx.drawImage(clouds[k], offs[k] - bx, H * L4.y - by, tw4, H * L4.h);
          lbx.drawImage(clouds[k], offs[k] + tw4 - bx, H * L4.y - by, tw4, H * L4.h);
        }
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
      ctx.globalAlpha = (0.3 + 0.25 * breathe) * cv2 * (1 - 0.4 * Math.max(0, cover - 0.6));
      ctx.drawImage(moon, mp.x - mR, mp.y - mR, mR * 2, mR * 2);
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
