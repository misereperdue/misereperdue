/* Misery FM (dc, 2026-11-09): owner-run live radio on every page. No mic, no recording.
   State lives in the chat Durable Object; this module keeps its own small socket (/api/fm/ws) so Shop,
   Globe, product and cart pages light up the top bar the moment the station goes live, without loading chat.
   Every listener derives the same position from startedAt (or pos while paused); iOS needs a tap to start audio.
   Pieces: state + socket, player (2 elements for crossfade, Media Session, heartbeat), top-bar live state + morph,
   chat live bar, listener sheet / owner studio, edit sheet, uploads (ID3/M4A tags, cover, loudness map). */
(function () {
  "use strict";
  var API = "https://api.misereperdue.com", WSU = "wss://api.misereperdue.com/api/fm/ws";
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: !1 };
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var VOLOK = (function () { try { var a = document.createElement("audio"); a.volume = 0.5; return a.volume === 0.5 && !IOS; } catch (e) { return !1; } })();
  var EMO = ["\u{1F525}", "\u2764\uFE0F", "\u{1F62D}", "\u{1F64C}", "\u{1F480}", "\u{1F3B6}"];
  var S = null, off = 0, me = null, meP = null, ws = null, wsT = 0, wsN = 0, hideT = 0, pollT = 0;
  var on = !1, vol = 1, A = [], act = 0, hbT = 0, tickT = 0, tickN = 0, fadeT = 0, actx = null, waves = {}, lastReact = 0, sentE = {};
  var sheet = null, tab = "now", morph = null, hb = null, phT = 0, edit = null, ups = [], drag = null, dirty = !1;
  try { vol = Math.max(0, Math.min(1, +(localStorage.getItem("mp-fm-vol") || 1))); } catch (e) {}

  /* ---------- helpers ---------- */
  function tok() { try { return localStorage.getItem("chat_token") || ""; } catch (e) { return ""; } }
  function dev() { try { return localStorage.getItem("chat_device") || ""; } catch (e) { return ""; } }
  function hdr(isJson) {
    var h = {}, t = tok(), d = dev();
    isJson && (h["Content-Type"] = "application/json");
    t && (h.Authorization = "Bearer " + t);
    d && (h["X-Device-Id"] = d);
    return h;
  }
  function api(p, body) {
    var o = body === void 0 ? { headers: hdr() } : { method: "POST", headers: hdr(!0), body: JSON.stringify(body) };
    return fetch(API + p, o).then(function (r) { return r.json().catch(function () { return { ok: !1, error: "HTTP " + r.status }; }); }, function () { return { ok: !1, error: "Network error" }; });
  }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(s) { s = Math.max(0, Math.floor(+s || 0)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = ("0" + (s % 60)).slice(-2); return h ? h + ":" + ("0" + m).slice(-2) + ":" + x : m + ":" + x; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function live() { return !!(S && S.live && S.list && S.list.length); }
  function owner() { return !!(me && me.owner); }
  function now() { return Date.now() + off; }
  function durOf(t) { return Math.max(1, +(t && t.dur) || 180); }
  function eff(t) { return Math.max(1, durOf(t) - ((S && S.xf) || 0)); }
  function byId(id) { for (var i = 0; S && i < S.list.length; i++) if (S.list[i].id === id) return S.list[i]; return null; }
  function artUrl(t) { return t && t.art ? API + "/api/fm/art/" + encodeURIComponent(t.art) : ""; }
  var EMB = '<svg class="fm-emb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.6 7.6a4.8 4.8 0 0 1 6.8 0M6.1 5.1a8.3 8.3 0 0 1 11.8 0"/><circle cx="12" cy="10.1" r="1.1" fill="currentColor" stroke="none"/><path d="M3.6 13.3c2.4 2.7 5.3 4 8.4 4s6-1.3 8.4-4M7 16.1l-1.2 2.2M10.2 17.2l-.4 2.4M13.8 17.2l.4 2.4M17 16.1l1.2 2.2"/></svg>';
  function E(t) { return t && t.explicit ? '<span class="fm-e" role="img" aria-label="Explicit" title="Explicit">E</span>' : ""; }
  function art(t, cls) {
    cls = "fm-art " + (cls || "");
    if (t && t.art) return '<span class="' + cls + '"><img src="' + esc(artUrl(t)) + '" alt="" decoding="async"></span>';
    var h = hash((t && (t.id + (t.title || ""))) || "fm");
    return '<span class="' + cls + ' fm-gen" style="--h1:' + (h % 360) + ";--h2:" + ((h >>> 9) % 360) + '">' + EMB + "</span>";
  }
  function sub(t) { return [t.artist, t.album, t.year].filter(Boolean).map(esc).join(" · "); }
  var ICO = {
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.6"/>',
    vol: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10"/>', mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    next: '<path d="M6 6v12l8.5-6zM18 6v12"/>', prev: '<path d="M18 6v12L9.5 12zM6 6v12"/>', restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
    shuffle: '<path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M13.1 9.8C13.9 8.2 14.9 7 16.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>',
    repeat: '<path d="M5 11V9a3 3 0 0 1 3-3h11M16 3l3 3-3 3M19 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', back: '<path d="M15 18l-6-6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
    grip: '<path d="M8 7h8M8 12h8M8 17h8"/>', plus: '<path d="M12 5v14M5 12h14"/>', ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 9.5a2 2 0 0 1 4 0"/>',
    next1: '<path d="M4 7h10M4 12h10M4 17h6M17 14v6M14 17h6"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', expand: '<path d="M7 10l5 5 5-5"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', msg: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/>',
    xf: '<path d="M3 17c4 0 5-10 9-10M12 7c4 0 5 10 9 10M3 7c4 0 5 10 9 10M12 17c4 0 5-10 9-10" stroke-width="1.6"/>', send: '<path d="M12 19V5M6 11l6-6 6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[k] + "</svg>"; }

  /* ---------- timeline (same rules as the Worker's fmAdvance / fmStep) ---------- */
  function calc() {
    if (!live()) return null;
    var L = S.list, ix = {}, i = S.idx >= L.length ? 0 : S.idx, up = (S.upNext || []).slice(), el;
    L.forEach(function (t, k) { ix[t.id] = k; });
    if (S.paused) el = S.pos || 0;
    else {
      el = (now() - S.startedAt) / 1e3;
      for (var n = 0; n < 50 && el >= eff(L[i]); n++) {
        if (!up.length || ix[up[0]] == null) { el = Math.min(el, durOf(L[i])); break; }
        el -= eff(L[i]); i = ix[up.shift()];
      }
    }
    var tr = L[i], d = durOf(tr);
    return { i: i, tr: tr, t: Math.max(0, Math.min(el, d)), d: d, up: up.map(function (id) { return L[ix[id]]; }).filter(Boolean), paused: !!S.paused };
  }

  /* ---------- state + socket ---------- */
  function set(fm) {
    if (!fm || !Array.isArray(fm.list)) return;
    if (S && fm.v < S.v && fm.now && S.now && fm.now <= S.now) return;
    S = fm;
    if (fm.now) off = fm.now - Date.now();
    if (!live() && on) listen(!1);
    if (!live() && morph) closeMorph(!0);
    render();
    sync();
  }
  function refresh() { return api("/api/fm/state").then(function (r) { r && r.ok && set(r.fm); }); }
  function connect() {
    if (ws || document.hidden || !window.WebSocket) return;
    try { ws = new WebSocket(WSU); } catch (e) { ws = null; return; }
    ws.onopen = function () { wsN = 0; clearInterval(pollT); pollT = 0; };
    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === "fm") set(m.fm);
      else if (m.t === "fml" && S) { S.listeners = m.n; paint(); }
      else if (m.t === "fmr") { var k = m.e + "|"; if (me && m.u && m.u === me.username) return; if (!m.u && sentE[k] && Date.now() - sentE[k] < 2e3) return; float(m.e); }
    };
    ws.onclose = function () {
      ws = null;
      if (document.hidden && !on) return;
      wsN++;
      clearTimeout(wsT);
      wsT = setTimeout(connect, Math.min(3e4, 1e3 * Math.pow(2, wsN)));
      if (wsN > 2 && !pollT) { refresh(); pollT = setInterval(refresh, 3e4); }
    };
  }
  document.addEventListener("visibilitychange", function () {
    clearTimeout(hideT);
    if (document.hidden) hideT = setTimeout(function () { if (document.hidden && ws && !on) ws.close(); }, 6e4);
    else { connect(); refresh(); }
  });
  function getMe() {
    if (meP) return meP;
    if (!tok()) { me = null; return (meP = Promise.resolve(null)); }
    meP = api("/api/me").then(function (r) { me = (r && r.user) || null; return me; });
    return meP;
  }

  /* ---------- player ---------- */
  function el(k) {
    if (A[k]) return A[k];
    var a = document.createElement("audio");
    a.className = "fm-audio";
    a.preload = "auto";
    a.setAttribute("playsinline", "");
    if (!IOS) a.crossOrigin = "anonymous";
    a._f = 1;
    a.addEventListener("loadedmetadata", function () { var c = calc(); if (A[act] === a && c && c.tr.id === a._id) seek(a, c.t); });
    a.addEventListener("ended", function () { setTimeout(sync, 300); });
    document.body.appendChild(a);
    A[k] = a;
    graph(a);
    return a;
  }
  function graph(a) {
    // Real-time analyser where it is safe (not iOS: routing a media element through Web Audio stops
    // lock-screen playback there). iOS uses the uploaded loudness map instead.
    if (IOS || !actx || a._g) return;
    try { var s = actx.createMediaElementSource(a); a._g = actx.createGain(); s.connect(a._g); a._g.connect(actx._an); } catch (e) {}
  }
  function seek(a, t) { try { if (Math.abs(a.currentTime - t) > 0.25) a.currentTime = t; } catch (e) {} }
  function applyVol() {
    A.forEach(function (a) {
      if (!a) return;
      var v = Math.max(0, Math.min(1, vol * a._f));
      if (a._g) a._g.gain.value = v;
      else if (VOLOK) a.volume = v;
    });
  }
  function fade(a, to, secs, stopAfter) {
    a._fd = { from: a._f, to: to, t0: Date.now(), d: Math.max(0.2, secs) * 1e3, stop: stopAfter };
    if (!fadeT) fadeT = setInterval(function () {
      var any = !1;
      A.forEach(function (x) {
        if (!x || !x._fd) return;
        var f = x._fd, k = Math.min(1, (Date.now() - f.t0) / f.d);
        x._f = f.from + (f.to - f.from) * k;
        if (k >= 1) { x._fd = null; if (f.stop) { x.pause(); x._id = ""; } } else any = !0;
      });
      applyVol();
      if (!any) { clearInterval(fadeT); fadeT = 0; }
    }, 80);
  }
  function sync() {
    var c = calc(), a = A[act];
    if (!on || !c || c.paused) {
      A.forEach(function (x) { x && !x.paused && x.pause(); });
      media(c);
      return;
    }
    if (!a || a._id !== c.tr.id) {
      var old = a, xf = S.xf || 0;
      act = a ? 1 - act : 0;
      a = el(act);
      a._id = c.tr.id;
      a._fd = null;
      if (old && !old.paused && xf > 0 && (VOLOK || old._g)) { fade(old, 0, Math.min(xf, Math.max(0.3, (old.duration || 0) - old.currentTime || xf)), !0); a._f = 0; fade(a, 1, xf); }
      else { if (old) { old.pause(); old._id = ""; } a._f = 1; }
      a.src = API + "/api/fm/audio/" + encodeURIComponent(c.tr.id);
      wave(c.tr);
    } else if (a.readyState > 0 && Math.abs(a.currentTime - c.t) > 1.5 && c.t < c.d - 0.5) seek(a, c.t);
    if (a.paused && c.t < c.d - 0.3) {
      var p = a.play();
      p && p.catch && p.catch(function (e) { if (e && e.name === "NotAllowedError") listen(!1); });
    }
    applyVol();
    media(c);
  }
  function listen(v) {
    v = !!v && live();
    if (v === on) { if (v) sync(); return; }
    on = v;
    clearInterval(hbT); hbT = 0;
    if (on) {
      if (!IOS && !actx && (window.AudioContext || window.webkitAudioContext)) {
        try { actx = new (window.AudioContext || window.webkitAudioContext)(); actx._an = actx.createAnalyser(); actx._an.fftSize = 128; actx._an.smoothingTimeConstant = 0.78; actx._an.connect(actx.destination); A.forEach(function (a) { a && graph(a); }); } catch (e) { actx = null; }
      }
      actx && actx.state === "suspended" && actx.resume();
      sync();
      // iOS unlocks each <audio> on a tap: prime the second element now so crossfades/track changes can start it later.
      var b = el(1 - act), a = A[act];
      if (a && !b._id && !b._primed) { b._primed = 1; b.muted = !0; b.src = a.src; var pb = b.play(); pb && pb.then ? pb.then(function () { b.pause(); b.muted = !1; }, function () { b.muted = !1; }) : (b.muted = !1); }
      api("/api/fm/listen", { on: !0 });
      hbT = setInterval(function () { api("/api/fm/listen", { on: !0 }); }, 3e4);
    } else {
      A.forEach(function (x) { x && x.pause(); });
      api("/api/fm/listen", { on: !1 });
    }
    media(calc());
    render();
  }
  var msKey = "";
  function media(c) {
    if (!("mediaSession" in navigator)) return;
    var m = navigator.mediaSession;
    try {
      if (c && on) {
        var k = c.tr.id + "|" + c.tr.title + "|" + c.tr.artist + "|" + c.tr.art;
        if (k !== msKey && window.MediaMetadata) {
          msKey = k;
          m.metadata = new MediaMetadata({ title: c.tr.title || "Misery FM", artist: c.tr.artist || "Misery FM", album: c.tr.album || "Misery FM · Live",
            artwork: c.tr.art ? [{ src: artUrl(c.tr), sizes: "600x600", type: "image/jpeg" }] : [{ src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }, { src: "/img/icon-512.png", sizes: "512x512", type: "image/png" }] });
        }
        m.playbackState = c.paused ? "paused" : "playing";
        m.setPositionState && m.setPositionState({ duration: c.d, position: Math.min(c.t, c.d), playbackRate: 1 });
      } else m.playbackState = "paused";
    } catch (e) {}
  }
  try {
    var MS = navigator.mediaSession;
    if (MS && MS.setActionHandler) {
      MS.setActionHandler("play", function () { listen(!0); });
      MS.setActionHandler("pause", function () { listen(!1); });
      MS.setActionHandler("nexttrack", function () { owner() && ctl({ action: "skip" }); });
      MS.setActionHandler("previoustrack", function () { owner() && ctl({ action: "prev" }); });
    }
  } catch (e) {}
  function wave(t) {
    if (!t || !t.wave || waves[t.id]) return;
    waves[t.id] = "loading";
    fetch(API + "/api/fm/wave/" + encodeURIComponent(t.id)).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (b) { waves[t.id] = b ? new Uint8Array(b) : null; }, function () { waves[t.id] = null; });
  }

  /* ---------- top bar: dotted ring + "MISERY FM IS LIVE" crossfade, tap to morph ---------- */
  function topBar() {
    var p = q(".panel.on"), h = p && p.querySelector(".chat-head");
    if (h && h.getClientRects().length) return h;
    var n = q(".nav");
    return n && n.getClientRects().length ? n : null;
  }
  function deco() {
    if (morph) return;
    var bar = live() ? topBar() : null;
    if (hb && hb !== bar) undeco(hb);
    if (!bar) return;
    if (!bar._fm) {
      bar._fm = 1;
      if (getComputedStyle(bar).position === "static") { bar.style.position = "relative"; bar._fmPos = 1; }
      var o = document.createElement("span");
      o.className = "fm-hb";
      o.innerHTML = '<svg class="fm-ring" aria-hidden="true" focusable="false"><rect/></svg><span class="fm-hb-in" aria-hidden="true"><span class="fm-hb-logo"></span><span class="fm-hb-is">is live</span></span><span class="fm-hb-np"></span>';
      bar.appendChild(o);
      bar.classList.add("fm-on");
      bar.setAttribute("aria-description", "Misery FM is live. Tap the bar for now playing.");
      bar.addEventListener("click", barTap, !0);
      o.querySelector(".fm-hb-np").addEventListener("click", npTap);
      hb = bar;
    }
    ring(bar);
    if (!bar._fmTy) typo(bar, bar.querySelector(":scope > .fm-hb"));
    if (!phT && !RM.matches) phT = setInterval(function () { hb && !morph && hb.classList.toggle("is-fm"); }, 4e3);
    if (RM.matches && phT) { clearInterval(phT); phT = 0; hb && hb.classList.remove("is-fm"); }
  }
  /* dc (t517u): "is live" uses the top bar's own typography (font, size, weight, case, spacing),
     copied from a real text item in that bar, so it never looks out of place. */
  function typo(bar, o) {
    var src = null;
    bar.querySelectorAll(".chat-title, a, button, h1, h2, span").forEach(function (n) {
      if (src || n.closest(".fm-hb") || !n.getClientRects().length || !/\S/.test(n.textContent) || n.children.length > 2) return;
      src = n;
    });
    // icon-only bars (the main nav) use the site's top bar title style: the chat header title
    src = src || q(".chat-head .chat-title");
    var x = o.querySelector(".fm-hb-in"), cs = src && getComputedStyle(src);
    if (!x || !cs || !parseFloat(cs.fontSize)) return;
    bar._fmTy = 1;
    ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "textTransform", "fontStyle"].forEach(function (k) { x.style[k] = cs[k]; });
    x.style.setProperty("--fm-fs", cs.fontSize);
  }
  /* Dotted outline on the bar's own rounded shape. The rect sits half a stroke inside the edge (never
     clipped), uses the bar's real corner radius, and the dot pitch divides the perimeter exactly, so
     the dots are evenly spaced all the way round with no seam or doubled dot. */
  function ring(bar) {
    var svg = bar.querySelector(":scope > .fm-hb > .fm-ring"), rect = svg && svg.firstChild;
    if (!rect) return;
    var w = bar.offsetWidth, h = bar.offsetHeight;
    if (!w || !h || (svg._w === w && svg._h === h && svg._rm === RM.matches)) return;
    svg._rm = RM.matches;
    svg._w = w; svg._h = h;
    var sw = 1.5, i = sw / 2, rw = w - sw, rh = h - sw, cs = getComputedStyle(bar);
    var rad = Math.max(0, Math.min((parseFloat(cs.borderTopLeftRadius) || h / 2) - i, rh / 2, rw / 2));
    var per = 2 * (rw + rh) - (8 - 2 * Math.PI) * rad, n = Math.max(8, Math.round(per / 6)), pitch = per / n;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", w); svg.setAttribute("height", h);
    rect.setAttribute("x", i); rect.setAttribute("y", i); rect.setAttribute("width", rw); rect.setAttribute("height", rh);
    rect.setAttribute("rx", rad); rect.setAttribute("ry", rad);
    rect.setAttribute("stroke-width", sw);
    rect.style.strokeDasharray = "0 " + pitch.toFixed(4);
    // cover the bar's border box exactly (the overlay is positioned inside the border otherwise)
    var o = svg.parentNode, bt = parseFloat(cs.borderTopWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0;
    o.style.top = o.style.bottom = -bt + "px"; o.style.left = o.style.right = -bl + "px";
    o.style.setProperty("--fm-r", rad + "px");
    o.style.setProperty("--fm-R", (parseFloat(cs.borderTopLeftRadius) || h / 2) + "px");
    if (rect._an) { rect._an.cancel(); rect._an = null; }
    if (!RM.matches && rect.animate) rect._an = rect.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -pitch }], { duration: 1600, iterations: Infinity });
  }
  function undeco(bar) {
    if (!bar) return;
    if (morph === bar) closeMorph(!0);
    bar._fm = 0; bar._fmTy = 0;
    bar.classList.remove("fm-on", "is-fm", "is-np");
    bar.removeAttribute("aria-description");
    var o = bar.querySelector(":scope > .fm-hb");
    o && o.remove();
    if (bar._fmPos) { bar.style.position = ""; bar._fmPos = 0; }
    bar.removeEventListener("click", barTap, !0);
    if (hb === bar) { hb = null; clearInterval(phT); phT = 0; }
  }
  function barTap(e) {
    if (!live()) return;
    var bar = e.currentTarget;
    if (bar.classList.contains("is-np")) return; // the now-playing layer handles its own buttons
    var hit = e.target.closest("button, a, input, select, textarea, [role=button], [role=tab], label");
    if (bar.classList.contains("is-fm") || !hit) {
      e.preventDefault(); e.stopPropagation();
      openMorph(bar);
    }
  }

  /* ---------- morph: the bar keeps its exact shape and size; only its content crossfades
     into now playing (transform + opacity) and back ---------- */
  function morphHTML() {
    var c = calc();
    if (!c) return '<div class="fm-m-in"></div>';
    // dc (t517u): the whole bar is the progress bar; tapping it (anywhere but Listen) returns to the normal bar
    return '<div class="fm-m-in"><span class="fm-m-fill fm-pbar" aria-hidden="true"><i style="transform:scaleX(' + (c.t / c.d).toFixed(4) + ')"></i></span>' +
      '<button type="button" class="fm-m-x" data-a="collapse" aria-label="Back to the top bar">' + ico("back") + "</button>" +
      '<span class="fm-m-np">' + art(c.tr, "fm-m-art") +
      '<span class="fm-m-tx"><span class="fm-m-1"><b class="fm-m-t">' + esc(c.tr.title || "Untitled") + "</b>" + E(c.tr) + '</span><small class="fm-m-a">' + esc(c.tr.artist || (c.paused ? "Paused" : "Misery FM")) + "</small></span></span>" +
      '<button type="button" class="fm-m-l fm-listen' + (on ? " is-on" : "") + '" data-a="listen" aria-pressed="' + on + '" aria-label="' + (on ? "Mute" : "Listen live") + '">' + ico(on ? "mute" : "play") + "</button></div>";
  }
  function openMorph(bar) {
    if (morph || !live()) return;
    bar = bar || hb || topBar();
    if (!bar || !bar._fm) return;
    getMe();
    var np = bar.querySelector(":scope > .fm-hb > .fm-hb-np");
    np.innerHTML = morphHTML();
    np.setAttribute("role", "group");
    np.setAttribute("aria-label", "Misery FM now playing");
    morph = bar;
    // lock the bar's box so nothing about its shape, size or position can move while morphed
    bar.style.width = bar.offsetWidth + "px"; bar.style.height = bar.offsetHeight + "px";
    bar.classList.remove("is-fm");
    bar.classList.add("is-np");
    setTimeout(function () { document.addEventListener("pointerdown", outside, !0); }, 0);
    document.addEventListener("keydown", escKey);
    window.addEventListener("resize", closeMorphNow);
    document.documentElement.classList.add("fm-morphing");
  }
  function npTap(e) {
    if (e.target.closest('[data-a="listen"]')) return onAct(e);
    e.preventDefault(); e.stopPropagation();
    closeMorph();
  }
  function closeMorphNow() { closeMorph(!0); }
  function outside(e) { if (morph && !morph.contains(e.target) && !(sheet && sheet.contains(e.target))) closeMorph(); }
  function escKey(e) { if (e.key === "Escape") { if (edit) closeEdit(); else if (sheet) closeSheet(); else if (morph) closeMorph(); } }
  function closeMorph(instant) {
    if (!morph) return;
    var bar = morph;
    morph = null;
    document.documentElement.classList.remove("fm-morphing");
    document.removeEventListener("pointerdown", outside, !0);
    window.removeEventListener("resize", closeMorphNow);
    bar.classList.remove("is-np");
    var np = bar.querySelector(":scope > .fm-hb > .fm-hb-np"), fin = function () { if (!bar.classList.contains("is-np")) { np && (np.innerHTML = ""); bar.style.width = ""; bar.style.height = ""; } };
    if (instant) fin(); else setTimeout(fin, 380);
    deco();
  }

  /* ---------- chat live bar under the chat header ---------- */
  function chatBar() {
    // dc (t514u): no separate now-playing pill; the live top bar is the only surface
    var c = q("#chat"), bar = c && c.querySelector(".fm-bar");
    bar && bar.remove();
    c && c.classList.remove("chat-has-fm");
  }


  /* ---------- floating reactions (everyone sees them) ---------- */
  function float(e) {
    if (EMO.indexOf(e) < 0) return;
    var box = q(".fm-floats");
    if (!box) { box = document.createElement("div"); box.className = "fm-floats"; box.setAttribute("aria-hidden", "true"); document.body.appendChild(box); }
    if (box.childElementCount > 24) box.firstChild.remove();
    var s = document.createElement("span"), anchor = sheet && q(".fm-reacts", sheet), r = anchor ? anchor.getBoundingClientRect() : null;
    s.className = "fm-float";
    s.textContent = e;
    var x = r ? r.left + Math.random() * r.width : innerWidth - 40 - Math.random() * 60, y = r ? r.top : innerHeight - 120;
    s.style.left = Math.round(x) + "px";
    s.style.top = Math.round(y) + "px";
    s.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 70) + "px");
    s.style.setProperty("--rot", Math.round((Math.random() - 0.5) * 40) + "deg");
    box.appendChild(s);
    setTimeout(function () { s.remove(); }, RM.matches ? 1300 : 2600);
  }
  function react(e) {
    if (Date.now() - lastReact < 650) return;
    lastReact = Date.now();
    sentE[e + "|"] = Date.now();
    float(e);
    api("/api/fm/react", { e: e }).then(function (r) { r && !r.ok && r.error && toast(r.error === "slow down" ? "Easy, one at a time" : r.error); });
  }

  /* ---------- visualizer: analyser (non-iOS) > uploaded loudness map > idle ---------- */
  var vizRaf = 0, vizBars = [];
  function viz() {
    vizRaf = 0;
    var cv = sheet && q(".fm-viz", sheet);
    if (!cv || !cv.isConnected) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight, N = 28;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext("2d"), c = calc(), t = performance.now() / 1e3, lv = [], src = "idle";
    if (on && c && !c.paused && actx && actx._an && actx.state === "running") {
      var fd = new Uint8Array(actx._an.frequencyBinCount);
      actx._an.getByteFrequencyData(fd);
      for (var i = 0; i < N; i++) { var a0 = Math.floor(Math.pow(i / N, 1.6) * (fd.length - 2)), a1 = Math.max(a0 + 1, Math.floor(Math.pow((i + 1) / N, 1.6) * (fd.length - 2))), sm = 0; for (var j = a0; j < a1; j++) sm += fd[j]; lv.push(sm / (a1 - a0) / 255); }
      src = "analyser";
    } else if (c && !c.paused && waves[c.tr.id] && waves[c.tr.id].length) {
      var wv = waves[c.tr.id], pt = c.t * 10, k0 = Math.min(wv.length - 1, Math.floor(pt)), amp = wv[k0] / 255;
      for (var b = 0; b < N; b++) { var wob = 0.55 + 0.45 * Math.sin(b * 1.9 + t * 7.3 + Math.sin(t * 2.1 + b)), tilt = 1 - Math.abs(b - N * 0.35) / N; lv.push(Math.max(0.04, amp * wob * (0.6 + 0.6 * tilt))); }
      src = on ? "map" : "map-idle";
    } else for (var n = 0; n < N; n++) lv.push(0.08 + 0.07 * (1 + Math.sin(t * 1.6 + n * 0.55)) * (c && !c.paused ? 1 : 0.5));
    cv.setAttribute("data-src", src);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    var bw = W / N, col = getComputedStyle(cv).color;
    g.fillStyle = col;
    for (var m = 0; m < N; m++) {
      var v = vizBars[m] = (vizBars[m] || 0) * 0.6 + Math.min(1, lv[m]) * 0.4, bh = Math.max(2, v * H);
      g.globalAlpha = 0.35 + 0.6 * v;
      var x = m * bw + bw * 0.2, w = bw * 0.6, y = H - bh;
      g.beginPath();
      g.roundRect ? g.roundRect(x, y, w, bh, Math.min(w / 2, 3)) : g.rect(x, y, w, bh);
      g.fill();
    }
    g.globalAlpha = 1;
    if (!RM.matches && !document.hidden) vizRaf = requestAnimationFrame(viz);
  }
  function vizStart() { if (!vizRaf) vizRaf = requestAnimationFrame(viz); }

  /* ---------- sheet: listener view + owner studio (Now / Queue / Station) ---------- */
  function when(ts) {
    var d = new Date(ts), t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), td = new Date();
    return (d.toDateString() === td.toDateString() ? "today" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })) + " at " + t;
  }
  function li(t, extra, cls) {
    return '<li class="fm-li ' + (cls || "") + '" data-id="' + esc(t.id) + '">' + art(t, "fm-sm") + '<span class="fm-li-t"><span class="fm-li-1"><b>' + esc(t.title || "Untitled") + "</b>" + E(t) + "</span><small>" + (sub(t) || "&nbsp;") + "</small></span>" + (extra || "") + "</li>";
  }
  function histHTML() {
    var H = (S && S.hist) || [];
    if (!H.length) return "";
    return '<h3 class="fm-h">Recently played</h3><ol class="fm-list fm-hist">' + H.slice(0, 6).map(function (h) {
      var ago = Math.max(1, Math.round((now() - h.at) / 6e4));
      return li(h, '<span class="fm-ago">' + (ago < 60 ? ago + "m" : Math.round(ago / 60) + "h") + "</span>");
    }).join("") + "</ol>";
  }
  /* Compact layout (dc, 2026-11-09: "keep it more compact"): same panel, header, rows and dividers as the + menu's Music picker. */
  function heroHTML(c, o) {
    if (!c) {
      return '<div class="fm-hero is-off"><div class="fm-np"><div class="fm-cover">' + art(null, "fm-big") + '</div><div class="fm-np-tx"><div class="fm-ttl"><b>Off air</b></div><div class="fm-sub">' +
        (S && S.sched ? "Goes live " + esc(when(S.sched)) : "Nothing playing right now") + '</div></div></div><canvas class="fm-viz" aria-hidden="true"></canvas>' +
        (S && S.note ? '<p class="fm-note"><b>DJ</b>' + esc(S.note) + "</p>" : "") + "</div>";
    }
    var t = c.tr;
    return '<div class="fm-hero"><div class="fm-np"><div class="fm-cover">' + art(t, "fm-big") + (c.paused ? '<span class="fm-paused" aria-label="Paused">' + ico("pause") + "</span>" : '<span class="fm-onair" aria-label="Live"><i></i></span>') + "</div>" +
      '<div class="fm-np-tx"><div class="fm-ttl"><b>' + esc(t.title || "Untitled") + "</b>" + E(t) + "</div>" +
      '<div class="fm-sub">' + (sub(t) || "Misery FM") + "</div>" + (t.genre ? '<span class="fm-chip">' + esc(t.genre) + "</span>" : "") + "</div>" +
      (o ? '<button type="button" class="fm-ib" data-a="edit" data-id="' + esc(t.id) + '" aria-label="Edit this song">' + ico("edit") + "</button>" : "") +
      '<button type="button" class="fm-ib fm-listen' + (on ? " is-on" : "") + '" data-a="listen" aria-pressed="' + on + '" aria-label="' + (on ? "Mute" : "Listen live") + '">' + ico(on ? "mute" : "play") + "</button></div>" +
      '<canvas class="fm-viz" aria-hidden="true"></canvas>' +
      '<div class="fm-prog">' + (o ? '<input type="range" class="fm-scrub" min="0" max="' + Math.floor(c.d) + '" step="1" value="' + Math.floor(c.t) + '" aria-label="Seek the station">' : '<span class="fm-pbar fm-pbar-l"><i></i></span>') +
      '<div class="fm-times"><span class="fm-el">' + fmt(c.t) + '</span><span class="fm-rem">-' + fmt(c.d - c.t) + "</span></div></div>" +
      (t.notes ? '<p class="fm-tnote">' + esc(t.notes) + "</p>" : "") +
      (S.note ? '<p class="fm-note"><b>DJ</b>' + esc(S.note) + "</p>" : "") + "</div>";
  }
  function listenHTML() {
    return VOLOK && on ? '<label class="fm-vol">' + ico("vol") + '<input type="range" min="0" max="1" step="0.01" value="' + vol + '" data-a="vol" aria-label="Volume"></label>' : "";
  }
  function nowHTML() {
    var c = calc(), o = owner(), h = heroHTML(c, o);
    if (o) {
      if (c) {
        h += '<div class="fm-tp" role="group" aria-label="Station controls">' +
          '<button type="button" class="fm-ib fm-tog' + (S.shuffle ? " is-on" : "") + '" data-a="shuffle" aria-pressed="' + !!S.shuffle + '" aria-label="Shuffle">' + ico("shuffle") + "</button>" +
          '<button type="button" class="fm-ib fm-lg" data-a="prev" aria-label="Previous">' + ico("prev") + "</button>" +
          '<button type="button" class="fm-ib fm-lg" data-a="restart" aria-label="Restart song">' + ico("restart") + "</button>" +
          '<button type="button" class="fm-pp" data-a="' + (c.paused ? "resume" : "pause") + '" aria-label="' + (c.paused ? "Resume the station" : "Pause the station for everyone") + '">' + ico(c.paused ? "play" : "pause") + "</button>" +
          '<button type="button" class="fm-ib fm-lg" data-a="skip" aria-label="Skip">' + ico("next") + "</button>" +
          '<button type="button" class="fm-ib fm-tog' + (S.repeat !== "off" ? " is-on" : "") + '" data-a="repeat" aria-label="Repeat: ' + S.repeat + '">' + ico("repeat") + (S.repeat === "one" ? '<em class="fm-one">1</em>' : "") + "</button>" +
          '<button type="button" class="fm-tog fm-stop" data-a="stop">Stop</button></div>';
      } else h += '<div class="fm-row"><button type="button" class="fm-btn fm-primary fm-wide" data-a="golive"' + (S && S.list.length ? "" : " disabled") + ">Go Live</button></div>" + (S && S.list.length ? "" : '<p class="fm-hint">Add songs in Queue first.</p>');
    }
    if (c) {
      h += listenHTML();
      h += '<div class="fm-reacts" role="group" aria-label="Send a reaction">' + EMO.map(function (e) { return '<button type="button" data-a="react" data-e="' + e + '" aria-label="React ' + e + '">' + e + "</button>"; }).join("") + "</div>";
      if (c.up.length) h += '<h3 class="fm-h">Up next' + (S.shuffle ? " · shuffled" : "") + '</h3><ol class="fm-list">' + c.up.slice(0, 3).map(function (t) { return li(t, '<span class="fm-dur">' + fmt(t.dur) + "</span>"); }).join("") + "</ol>";
    }
    return h + histHTML();
  }
  function queueHTML() {
    var c = calc(), L = S.list, Q = S.q || [];
    var h = '<div class="fm-upl"><button type="button" class="fm-add" data-a="add">' + ico("plus") + "<span>Add songs</span><small>MP3, M4A, AAC · 25 MB</small></button>" +
      (ups.length ? '<ul class="fm-ups">' + ups.map(function (u) { return '<li class="' + (u.err ? "is-err" : u.done ? "is-done" : "") + '"><span><b>' + esc(u.name) + "</b><small>" + esc(u.st) + '</small></span><span class="fm-upbar"><i style="transform:scaleX(' + (u.p || 0).toFixed(3) + ')"></i></span></li>'; }).join("") + "</ul>" : "") + "</div>";
    if (!L.length) return h + '<p class="fm-empty">No songs yet.</p>';
    var tot = L.reduce(function (s, t) { return s + durOf(t); }, 0);
    h += '<h3 class="fm-h">Library · ' + L.length + (L.length === 1 ? " song" : " songs") + " · " + fmt(tot) + '<small>Drag to reorder</small></h3><ol class="fm-list fm-q">';
    h += L.map(function (t, i) {
      var cur = c && c.i === i, qn = Q.indexOf(t.id);
      return li(t, (qn >= 0 ? '<span class="fm-chip fm-chip-q">Next' + (qn ? " " + (qn + 1) : "") + "</span>" : "") + '<span class="fm-dur">' + fmt(t.dur) + "</span>" +
        '<button type="button" class="fm-ib" data-a="playnow" aria-label="Play ' + esc(t.title) + ' now">' + ico(cur ? "restart" : "play") + "</button>" +
        '<button type="button" class="fm-ib" data-a="playnext" aria-label="Play ' + esc(t.title) + ' next">' + ico("next1") + "</button>" +
        '<button type="button" class="fm-ib" data-a="edit" aria-label="Edit ' + esc(t.title) + '">' + ico("more") + "</button>", cur ? "is-cur" : "")
        .replace('<li class="fm-li', '<li class="fm-li fm-qi').replace(/(<li [^>]*>)/, '$1<button type="button" class="fm-drag" aria-label="Reorder ' + esc(t.title) + ' (arrow keys)">' + ico("grip") + "</button>");
    }).join("");
    return h + "</ol>";
  }
  function pad(n) { return ("0" + n).slice(-2); }
  function localIn(ts) { if (!ts) return ""; var d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  /* dc (t516u): Station reworked into grouped compact rows (icon, label + status, control),
     the same row rhythm and dividers as the + chat menu. */
  function srow(icon, label, sub, ctrl, cls) {
    return '<div class="fm-sr' + (cls ? " " + cls : "") + '"><span class="fm-sr-i">' + ico(icon) + '</span><span class="fm-sr-t"><b>' + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span>" + (ctrl || "") + "</div>";
  }
  function stationHTML() {
    var st = S.stats || {}, c = calc(), lv = live(), up = c && st.since ? fmt((now() - st.since) / 1e3) : "–";
    var air = lv ? '<button type="button" class="fm-pill fm-pill-stop" data-a="stop">Stop</button>' : '<button type="button" class="fm-pill fm-pill-go" data-a="golive"' + (S.list.length ? "" : " disabled") + ">Go Live</button>";
    return '<h3 class="fm-h">Broadcast</h3><div class="fm-grp">' +
      srow("radio", lv ? (c && c.paused ? "Paused" : "On air") : "Off air", lv ? (S.listeners || 0) + " listening · " + up : S.list.length ? S.list.length + (S.list.length === 1 ? " song" : " songs") + " ready" : "Add songs in Queue first", air, lv ? "is-live" : "") +
      srow("xf", "Crossfade", '<span class="fm-xf-v">' + (S.xf || 0) + " s</span>", '<input type="range" class="fm-sr-range" min="0" max="6" step="0.5" value="' + (S.xf || 0) + '" data-a="xf" aria-label="Crossfade seconds">') +
      srow("clock", "Scheduled go-live", S.sched ? "Goes live " + esc(when(S.sched)) : "Not scheduled",
        '<span class="fm-sr-c"><input type="datetime-local" class="fm-sched-in" value="' + localIn(S.sched) + '" aria-label="Go-live time">' +
        '<button type="button" class="fm-sr-b" data-a="sched" aria-label="Schedule">' + ico("check") + "</button>" +
        (S.sched ? '<button type="button" class="fm-sr-b" data-a="schedclr" aria-label="Clear schedule">' + ico("x") + "</button>" : "") + "</span>", "fm-sr-sched") +
      "</div>" +
      '<h3 class="fm-h">DJ note</h3><div class="fm-grp">' +
      '<div class="fm-sr fm-sr-note"><span class="fm-sr-i">' + ico("msg") + '</span><input class="fm-note-in" maxlength="140" enterkeyhint="send" placeholder="Say something to everyone listening" value="' + esc(S.note) + '" aria-label="DJ note for listeners">' +
      '<button type="button" class="fm-sr-b fm-sr-send" data-a="note" aria-label="Post note">' + ico("send") + "</button>" +
      (S.note ? '<button type="button" class="fm-sr-b" data-a="noteclr" aria-label="Clear note">' + ico("x") + "</button>" : "") + "</div></div>" +
      '<h3 class="fm-h">Session</h3><dl class="fm-stats">' +
      [["Listening", S.listeners || 0], ["Peak", st.peak || 0], ["Played", st.played || 0], ["Reactions", st.reacts || 0], ["On air", up], ["Library", S.list.length]].map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  /* Placeholder until the first state arrives (or if the station API is down), so the sheet is never blank. */
  var BLANK = { live: !1, paused: !1, pos: 0, idx: 0, startedAt: 0, v: -1, now: 0, list: [], q: [], upNext: [], hist: [], listeners: 0, shuffle: !1, repeat: "all", xf: 0, note: "", sched: 0, stats: { since: 0, played: 0, peak: 0, reacts: 0 } };
  function renderSheet() {
    if (!sheet) return;
    if (!S) { S = BLANK; try { renderSheet(); } finally { S = null; } return; }
    var ae = document.activeElement, body = q(".fm-sh-body", sheet);
    if (drag || (ae && sheet.contains(ae) && /^(TEXTAREA|SELECT)$|^INPUT$/.test(ae.tagName) && ae.type !== "range" && ae.type !== "file" && !edit)) { dirty = !0; return; }
    dirty = !1;
    if (!owner() && tab !== "now") tab = "now";
    tabsSync();
    var swap = sheet.getAttribute("data-tab") && sheet.getAttribute("data-tab") !== tab, h0 = swap ? sheet.offsetHeight : 0;
    sheet.querySelectorAll(".fm-tab").forEach(function (b) { var s = b.getAttribute("data-tab") === tab; b.classList.toggle("is-on", s); b.setAttribute("aria-selected", s); });
    var st = body.scrollTop;
    body.innerHTML = tab === "queue" ? queueHTML() : tab === "station" ? stationHTML() : nowHTML();
    body.scrollTop = st;
    sheet.setAttribute("data-tab", tab);
    if (swap && !RM.matches && sheet.animate) { var h1 = sheet.offsetHeight; h1 !== h0 && sheet.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 260, easing: "cubic-bezier(.22,.8,.25,1)" }); }
    vizStart();
  }
  function lockScroll(v) {
    var b = document.body, de = document.documentElement;
    if (v) { lockScroll.y = window.scrollY; b.style.top = -lockScroll.y + "px"; de.classList.add("fm-lock"); }
    else { de.classList.remove("fm-lock"); b.style.top = ""; window.scrollTo(0, lockScroll.y || 0); }
  }
  function lcText() {
    var c = calc();
    if (!live()) return S && S.sched ? "Offline · scheduled" : "Offline";
    return (c && c.paused ? "Paused" : '<i class="fm-lc-dot"></i>Live') + " · " + ((S && S.listeners) || 0) + " listening";
  }
  /* Same spot as the + menu panels: above the composer on Chat, bottom-centred elsewhere. */
  function place() {
    if (!sheet) return;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, w = Math.min(360, vw - 24), plus = null;
    document.querySelectorAll(".chat-plus").forEach(function (b) { var r = b.getBoundingClientRect(); if (r.width && r.bottom > 0 && r.top < vh) plus = b; });
    var row = plus && plus.parentNode, r = row && row.getBoundingClientRect(), left, bottom;
    if (r && r.width) { left = Math.max(12, Math.min(r.left, vw - w - 12)); bottom = Math.max(12, vh - r.top + 8); sheet.classList.add("is-anch"); }
    else { left = (vw - w) / 2; bottom = 0; sheet.classList.remove("is-anch"); }
    sheet.style.setProperty("--fm-l", left + "px");
    sheet.style.setProperty("--fm-w", w + "px");
    sheet.style.setProperty("--fm-b", bottom + "px");
    // never grow over the page's top bar (like the Music panel, which stays below the chat header)
    var top = 0;
    document.querySelectorAll(".panel.on .chat-head, .nav").forEach(function (h) { var hr = h.getBoundingClientRect(); if (hr.height && hr.bottom > top && hr.bottom < vh / 2) top = hr.bottom; });
    var room = vh - (bottom || 12) - top - 10 - (bottom ? 0 : (parseFloat(getComputedStyle(sheet).getPropertyValue("--fm-sab")) || 0));
    sheet.style.setProperty("--fm-mh", Math.max(260, Math.min(560, room)) + "px");
  }
  function openSheet(t) {
    if (t) tab = t;
    if (morph) closeMorph(!0);
    if (sheet) { renderSheet(); return; }
    getMe().then(function () {
      if (sheet) return;
      if (!S) refresh();
      var back = document.createElement("div");
      back.className = "fm-scrim";
      sheet = document.createElement("div");
      sheet.className = "fm-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Misery FM");
      sheet._back = back;
      sheet.className = "fm-sheet fm-c fm-root";
      sheet.innerHTML = frameHTML();
      document.body.appendChild(back);
      document.body.appendChild(sheet);
      sheet.addEventListener("scroll", function () { if (sheet.scrollTop) sheet.scrollTop = 0; });
      lockScroll(!0);
      back.addEventListener("click", closeSheet);
      back.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: !1 });
      wire(sheet);
      swipe(sheet);
      document.addEventListener("keydown", escKey);
      renderSheet();
      paint();
      place();
      window.addEventListener("resize", place);
      // grows out of the + button like the other + menu panels
      if (RM.matches) sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      else sheet.animate([{ transform: "scale(.7)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.3,1.25,.5,1)" });
      var cl = q('[data-a="close"]', sheet);
      cl && cl.focus({ preventScroll: !0 });
    });
  }
  /* dc (t516u): the FM menu is a + menu sub-panel. Same header as the Music picker (Back, title, Close),
     with the real Misery FM logo as the title. */
  var SV = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  function frameHTML() {
    return '<div class="chat-pbig-hd fm-sh-hd"><button type="button" class="chat-pbig-btn fm-back" data-a="back" aria-label="Back"><svg ' + SV + '><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<div class="fm-hd-t"><span class="fm-hd-logo" role="img" aria-label="Misery FM"></span><span class="fm-lc" aria-live="polite"></span></div>' +
      '<button type="button" class="chat-pbig-btn fm-x" data-a="close" aria-label="Close"><svg ' + SV + '><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="fm-sh-body"></div>';
  }
  function tabsSync() {
    var tb = q(".fm-tabs", sheet);
    if (owner() && !tb) {
      tb = document.createElement("div"); tb.className = "fm-tabs"; tb.setAttribute("role", "tablist"); tb.setAttribute("aria-label", "Studio");
      tb.innerHTML = [["now", "Now"], ["queue", "Queue"], ["station", "Station"]].map(function (x) { return '<button type="button" role="tab" class="fm-tab" data-a="tab" data-tab="' + x[0] + '">' + x[1] + "</button>"; }).join("");
      q(".fm-sh-hd", sheet).after(tb);
    } else if (!owner() && tb) tb.remove();
  }
  function wire(el) {
    el.addEventListener("click", onAct);
    el.addEventListener("input", onInput);
    el.addEventListener("change", onChange);
    el.addEventListener("focusout", function () { setTimeout(function () { dirty && renderSheet(); }, 0); });
    el.addEventListener("pointerdown", dragStart);
    el.addEventListener("keydown", dragKey);
    el.addEventListener("keydown", noteKey);
  }
  /* Mounted inside the + chat menu: chat.js morphs the menu exactly as for Music / Polls / Globe and
     hands the menu element over. o = { back, close } from chat.js. */
  function mount(m, o) {
    if (sheet && !sheet._mnt) closeSheet();
    if (morph) closeMorph(!0);
    sheet = m; m._mnt = o || {};
    m.classList.add("fm-c", "fm-root", "fm-mnt");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Misery FM");
    m.innerHTML = frameHTML();
    wire(m);
    m._dispose = function () { unmount(m); };
    m._esc = function () { if (edit) { closeEdit(); return !0; } return !1; };
    if (!S) refresh();
    fitMnt();
    renderSheet(); paint();
    window.addEventListener("resize", fitMnt);
    if (!tickT) tickT = setInterval(tick, 1e3);
    getMe().then(function () { sheet === m && renderSheet(); });
  }
  function fitMnt() {
    if (!sheet || !sheet._mnt) return;
    var row = sheet.parentNode, r = row && row.getBoundingClientRect(), top = 0, vh = window.innerHeight;
    document.querySelectorAll(".panel.on .chat-head, .nav").forEach(function (h) { var hr = h.getBoundingClientRect(); if (hr.height && hr.bottom > top && hr.bottom < vh / 2) top = hr.bottom; });
    sheet.style.setProperty("--fm-mh", Math.max(260, Math.min(540, (r ? r.top : vh) - 8 - top - 12)) + "px");
  }
  function unmount(m) {
    if (sheet !== m) return;
    closeEdit(!0);
    sheet = null;
    window.removeEventListener("resize", fitMnt);
  }
  function closeSheet() {
    if (!sheet) return;
    if (sheet._mnt) { var mo = sheet._mnt; unmount(sheet); mo.close && mo.close(); return; }
    var sh = sheet, back = sh._back;
    sheet = null;
    closeEdit(!0);
    document.removeEventListener("keydown", escKey);
    window.removeEventListener("resize", place);
    var an = RM.matches ? sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 }) : sh.animate([{ transform: getComputedStyle(sh).transform === "none" ? "none" : getComputedStyle(sh).transform, opacity: 1 }, { transform: "scale(.7)", opacity: 0 }], { duration: 170, easing: "cubic-bezier(.4,0,.6,1)" });
    an.onfinish = function () { sh.remove(); back.remove(); };
    lockScroll(!1);
  }
  function swipe(sh) {
    var y0 = 0, dy = 0, live2 = !1;
    sh.addEventListener("pointerdown", function (e) {
      if (!e.target.closest(".fm-grab, .fm-sh-hd") || e.target.closest("button")) return;
      live2 = !0; y0 = e.clientY; dy = 0;
      try { sh.setPointerCapture(e.pointerId); } catch (_) {}
    });
    sh.addEventListener("pointermove", function (e) { if (!live2) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = dy ? "translateY(" + dy + "px)" : ""; });
    var end = function () { if (!live2) return; live2 = !1; if (dy > 110) closeSheet(); else { sh.style.transform = ""; } };
    sh.addEventListener("pointerup", end);
    sh.addEventListener("pointercancel", end);
  }

  /* ---------- drag to reorder (touch-friendly handle, arrow keys too) ---------- */
  function dragStart(e) {
    var h = e.target.closest(".fm-drag");
    if (!h || !owner()) return;
    e.preventDefault();
    var row = h.closest("li"), list = row.parentNode, rows = [].slice.call(list.children), from = rows.indexOf(row), r0 = row.getBoundingClientRect();
    var step = rows[1] ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : r0.height;
    drag = { row: row, rows: rows, from: from, to: from, y0: e.clientY, step: step, id: row.getAttribute("data-id") };
    row.classList.add("is-drag");
    try { h.setPointerCapture(e.pointerId); } catch (_) {}
    h.addEventListener("pointermove", dragMove);
    h.addEventListener("pointerup", dragEnd);
    h.addEventListener("pointercancel", dragEnd);
  }
  function dragMove(e) {
    if (!drag) return;
    var dy = e.clientY - drag.y0, to = Math.max(0, Math.min(drag.rows.length - 1, drag.from + Math.round(dy / drag.step)));
    drag.to = to;
    drag.row.style.transform = "translateY(" + dy + "px)";
    drag.rows.forEach(function (r, k) {
      if (r === drag.row) return;
      var s = drag.from < to && k > drag.from && k <= to ? -drag.step : to < drag.from && k >= to && k < drag.from ? drag.step : 0;
      r.style.transform = s ? "translateY(" + s + "px)" : "";
    });
  }
  function dragEnd(e) {
    var h = e.currentTarget;
    h.removeEventListener("pointermove", dragMove);
    h.removeEventListener("pointerup", dragEnd);
    h.removeEventListener("pointercancel", dragEnd);
    if (!drag) return;
    var d = drag;
    drag = null;
    d.rows.forEach(function (r) { r.style.transform = ""; });
    d.row.classList.remove("is-drag");
    if (d.to !== d.from) moveTo(d.id, d.to);
    else if (dirty) renderSheet();
  }
  function moveTo(id, to) {
    var L = S.list, at = L.findIndex(function (t) { return t.id === id; });
    if (at < 0) return;
    var cur = L[S.idx], t = L.splice(at, 1)[0];
    L.splice(to, 0, t);
    S.idx = Math.max(0, L.indexOf(cur));
    renderSheet();
    ctl({ action: "move", id: id, to: to });
  }
  function dragKey(e) {
    var h = e.target.closest && e.target.closest(".fm-drag");
    if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    var id = h.closest("li").getAttribute("data-id"), at = S.list.findIndex(function (t) { return t.id === id; }), to = at + (e.key === "ArrowUp" ? -1 : 1);
    if (to < 0 || to >= S.list.length) return;
    moveTo(id, to);
    var nh = sheet && sheet.querySelector('li[data-id="' + CSS.escape(id) + '"] .fm-drag');
    nh && nh.focus();
  }

  /* ---------- actions ---------- */
  function ctl(body) {
    return api("/api/fm/control", body).then(function (r) { if (r && r.ok) set(r.fm); else toast((r && r.error) || "Something went wrong"); return r; });
  }
  function toast(t) {
    var el2 = q(".fm-toast");
    if (!el2) { el2 = document.createElement("div"); el2.className = "fm-toast"; el2.setAttribute("role", "status"); document.body.appendChild(el2); }
    el2.textContent = t;
    el2.classList.add("is-on");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el2.classList.remove("is-on"); }, 2600);
  }
  function confirmFM(msg, ok, cb, danger) {
    var cf = document.createElement("div");
    cf.className = "fm-cf-back";
    cf.innerHTML = '<div class="fm-cf" role="alertdialog" aria-modal="true" aria-label="' + esc(msg) + '"><p>' + esc(msg) + '</p><div class="fm-row"><button type="button" class="fm-btn" data-c="0">Cancel</button><button type="button" class="fm-btn ' + (danger ? "fm-danger" : "fm-primary") + '" data-c="1">' + esc(ok) + "</button></div></div>";
    document.body.appendChild(cf);
    cf.addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (!b && e.target !== cf) return; e.stopPropagation(); cf.remove(); b && b.getAttribute("data-c") === "1" && cb(); });
    var y = q('[data-c="1"]', cf);
    y && y.focus();
  }
  function onAct(e) {
    var b = e.target.closest("[data-a]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-a"), row = b.closest("[data-id]"), id = b.getAttribute("data-id") || (row && row.getAttribute("data-id"));
    if (a === "vol" || a === "xf" || a === "noop") return;
    e.stopPropagation();
    if (a === "listen") listen(!on);
    else if (a === "sheet") openSheet("now");
    else if (a === "collapse") closeMorph();
    else if (a === "close") closeSheet();
    else if (a === "back") { if (sheet && sheet._mnt && sheet._mnt.back) { var bo = sheet._mnt; unmount(sheet); bo.back(); } else closeSheet(); }
    else if (a === "tab") { tab = b.getAttribute("data-tab"); renderSheet(); }
    else if (a === "react") react(b.getAttribute("data-e"));
    else if (a === "prev" || a === "restart" || a === "skip" || a === "pause" || a === "resume") ctl({ action: a });
    else if (a === "shuffle") ctl({ action: "shuffle", on: !S.shuffle });
    else if (a === "repeat") ctl({ action: "repeat", mode: { all: "one", one: "off", off: "all" }[S.repeat] || "all" });
    else if (a === "golive") confirmFM("Go live now? Everyone on the site will see Misery FM is live.", "Go Live", function () { ctl({ action: "live" }); });
    else if (a === "stop") confirmFM("Stop Misery FM for everyone?", "Stop", function () { ctl({ action: "stop" }); }, !0);
    else if (a === "add") { if (!tok()) toast("Sign in again to add songs"); else picker("audio").click(); }
    else if (a === "playnow") { closeEdit(); ctl({ action: "play", id: id }); }
    else if (a === "playnext") { closeEdit(); ctl({ action: "next", id: id }).then(function (r) { r && r.ok && toast("Plays next"); }); }
    else if (a === "edit") openEdit(id);
    else if (a === "note") { var n = q(".fm-note-in", sheet); ctl({ action: "note", text: n ? n.value : "" }).then(function (r) { r && r.ok && toast("Note posted"); }); }
    else if (a === "noteclr") ctl({ action: "note", text: "" });
    else if (a === "sched") {
      var si = q(".fm-sched-in", sheet), ts = si && si.value ? new Date(si.value).getTime() : 0;
      if (!ts || ts < Date.now()) return toast("Pick a time in the future");
      ctl({ action: "sched", at: ts }).then(function (r) { r && r.ok && toast("Scheduled for " + when(ts)); });
    } else if (a === "schedclr") ctl({ action: "sched", at: 0 });
    else if (a === "edclose") closeEdit();
    else if (a === "edsave") saveEdit();
    else if (a === "cover") { pickFor = edit._id; picker("img").click(); }
    else if (a === "coverdel") ctl({ action: "artdel", id: edit._id }).then(function (r) { r && r.ok && fillEdit(); });
    else if (a === "remove") { var t = byId(id); confirmFM("Remove “" + ((t && t.title) || "this song") + "” from Misery FM?", "Remove", function () { closeEdit(); ctl({ action: "remove", id: id }); }, !0); }
  }
  function onInput(e) {
    var a = e.target.getAttribute("data-a");
    if (a === "vol") { vol = +e.target.value; try { localStorage.setItem("mp-fm-vol", vol); } catch (_) {} applyVol(); }
    else if (a === "xf") { var v = q(".fm-xf-v", sheet); v && (v.textContent = e.target.value + " s"); }
    else if (e.target.classList.contains("fm-scrub")) { e.target._busy = 1; var c = calc(); if (c) { q(".fm-el", sheet).textContent = fmt(+e.target.value); q(".fm-rem", sheet).textContent = "-" + fmt(c.d - e.target.value); } }
  }
  function noteKey(e) { if (e.key === "Enter" && e.target.classList && e.target.classList.contains("fm-note-in")) { e.preventDefault(); var b = q('[data-a="note"]', sheet); b && b.click(); } }
  function onChange(e) {
    var tg = e.target, a = tg.getAttribute("data-a");
    if (a === "xf") ctl({ action: "xf", sec: +tg.value });
    else if (tg.classList.contains("fm-scrub")) { tg._busy = 0; ctl({ action: "seek", pos: +tg.value }); }
  }

  /* ---------- edit sheet (per song) ---------- */
  function openEdit(id) {
    var t = byId(id);
    if (!t || !owner()) return;
    if (!sheet) { openSheet("queue"); setTimeout(function () { openEdit(id); }, 450); return; }
    closeEdit(!0);
    edit = document.createElement("div");
    edit.className = "fm-edit";
    edit.setAttribute("role", "dialog");
    edit.setAttribute("aria-label", "Edit song");
    edit._id = id;
    edit.addEventListener("click", onAct);
    edit.addEventListener("change", onChange);
    sheet.appendChild(edit);
    fillEdit();
    RM.matches ? edit.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }) : edit.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.85,.25,1)" });
    var f = q('[name="title"]', edit);
    f && f.focus({ preventScroll: !0 });
  }
  function fld(n, label, v, attrs) { return '<label class="fm-f"><span>' + label + '</span><input name="' + n + '" value="' + esc(v || "") + '" ' + (attrs || "") + "></label>"; }
  function fillEdit() {
    if (!edit) return;
    var t = byId(edit._id);
    if (!t) return closeEdit();
    var keep = {};
    edit.querySelectorAll("[name]").forEach(function (i) { keep[i.name] = i.type === "checkbox" ? i.checked : i.value; });
    var v = function (k) { return k in keep ? keep[k] : t[k]; };
    edit.innerHTML = '<div class="fm-ed-hd"><b>Edit song</b><button type="button" class="fm-ib" data-a="edclose" aria-label="Close">' + ico("x") + "</button></div>" +
      '<div class="fm-ed-body"><div class="fm-ed-art">' + art(t, "fm-ed-cover") + '<div class="fm-ed-artb"><button type="button" class="fm-btn" data-a="cover">' + (t.art ? "Replace cover" : "Upload cover") + "</button>" +
      (t.art ? '<button type="button" class="fm-btn fm-ghost" data-a="coverdel">Remove cover</button>' : "") + '<small class="fm-hint">Square JPEG/PNG works best.</small></div></div>' +
      fld("title", "Song name", v("title"), 'maxlength="120" autocomplete="off"') + fld("artist", "Artist", v("artist"), 'maxlength="120" autocomplete="off"') + fld("album", "Album", v("album"), 'maxlength="120" autocomplete="off"') +
      '<div class="fm-f2">' + fld("year", "Year", v("year"), 'inputmode="numeric" maxlength="4" pattern="[0-9]*"') + fld("genre", "Genre", v("genre"), 'maxlength="40" autocomplete="off"') + "</div>" +
      '<label class="fm-f"><span>Track notes</span><textarea name="notes" maxlength="280" rows="2" placeholder="Shown to listeners under the song">' + esc(v("notes") || "") + "</textarea></label>" +
      '<label class="fm-sw"><input type="checkbox" name="explicit"' + (v("explicit") ? " checked" : "") + '><span class="fm-sw-k" aria-hidden="true"></span><span>Explicit</span><span class="fm-e" aria-hidden="true">E</span></label>' +
      '<div class="fm-row"><button type="button" class="fm-btn fm-primary fm-wide" data-a="edsave">Save</button></div>' +
      '<div class="fm-row fm-ed-more" data-id="' + esc(t.id) + '"><button type="button" class="fm-btn" data-a="playnow">' + ico("play") + 'Play now</button><button type="button" class="fm-btn" data-a="playnext">' + ico("next1") + 'Play next</button><button type="button" class="fm-btn fm-danger" data-a="remove">Remove</button></div></div>';
  }
  function saveEdit() {
    var b = { action: "edit", id: edit._id };
    edit.querySelectorAll("[name]").forEach(function (i) { b[i.name] = i.type === "checkbox" ? i.checked : i.value; });
    ctl(b).then(function (r) { if (r && r.ok) { toast("Saved"); closeEdit(); } });
  }
  function closeEdit(instant) {
    if (!edit) return;
    var e2 = edit;
    edit = null;
    if (instant || RM.matches) return e2.remove();
    e2.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(16px)" }], { duration: 200 }).onfinish = function () { e2.remove(); };
    setTimeout(function () { dirty && renderSheet(); }, 220);
  }

  /* ---------- tags: ID3v2.3/2.4 (MP3) and MP4 atoms (M4A/AAC) ---------- */
  function txt(b, enc) {
    try {
      if (enc === 0) return new TextDecoder("latin1").decode(b);
      if (enc === 3) return new TextDecoder("utf-8").decode(b);
      if (enc === 1) return new TextDecoder(b[0] === 0xfe ? "utf-16be" : "utf-16le").decode(b[0] === 0xff || b[0] === 0xfe ? b.subarray(2) : b);
      if (enc === 2) return new TextDecoder("utf-16be").decode(b);
    } catch (e) {}
    return "";
  }
  function clean(s) { return String(s || "").replace(/\u0000+$/g, "").split("\u0000")[0].trim(); }
  function id3(u) {
    var o = {};
    if (u[0] !== 0x49 || u[1] !== 0x44 || u[2] !== 0x33) return o;
    var v = u[3], ss = function (p) { return (u[p] << 21) | (u[p + 1] << 14) | (u[p + 2] << 7) | u[p + 3]; }, end = 10 + ss(6), p = 10;
    if (v < 3) return o;
    if (u[5] & 0x40) p += v === 4 ? ss(10) : ((u[10] << 24) | (u[11] << 16) | (u[12] << 8) | u[13]) + 4;
    end = Math.min(end, u.length);
    while (p + 10 < end) {
      var id = String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]), sz = v === 4 ? ss(p + 4) : ((u[p + 4] << 24) | (u[p + 5] << 16) | (u[p + 6] << 8) | u[p + 7]) >>> 0;
      if (!/^[A-Z0-9]{4}$/.test(id) || sz <= 0 || p + 10 + sz > end) break;
      var d = u.subarray(p + 10, p + 10 + sz), enc = d[0];
      if (id === "APIC") {
        var k = 1; while (k < d.length && d[k]) k++;
        var mime = new TextDecoder("latin1").decode(d.subarray(1, k)) || "image/jpeg", pt = d[k + 1]; k += 2;
        if (enc === 1 || enc === 2) { while (k + 1 < d.length && (d[k] || d[k + 1])) k += 2; k += 2; } else { while (k < d.length && d[k]) k++; k++; }
        if (!o.pic || pt === 3) o.pic = new Blob([d.subarray(k)], { type: /png/i.test(mime) ? "image/png" : "image/jpeg" });
      } else if (id === "TXXX") {
        var s = txt(d.subarray(1), enc).split("\u0000").filter(function (x) { return x !== ""; });
        if (s[0] && /ITUNESADVISORY|EXPLICIT/i.test(s[0]) && /^(1|4|explicit|yes|true)$/i.test((s[1] || "").trim())) o.explicit = !0;
      } else if (id.charAt(0) === "T") {
        var val = clean(txt(d.subarray(1), enc));
        if (id === "TIT2") o.title = val; else if (id === "TPE1") o.artist = val; else if (id === "TALB") o.album = val;
        else if (id === "TYER" || id === "TDRC" || id === "TORY") o.year = o.year || (val.match(/\d{4}/) || [""])[0];
        else if (id === "TCON") o.genre = val.replace(/^\(\d+\)/, "").trim() || "";
        else if (id === "TLEN") o.dur = (+val || 0) / 1e3;
      }
      p += 10 + sz;
    }
    return o;
  }
  function mp4(u) {
    var o = {}, dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    var name = function (p) { return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]); };
    function walk(s, e, path) {
      for (var p = s; p + 8 <= e;) {
        var sz = dv.getUint32(p), ty = name(p + 4), h = 8;
        if (sz === 1) { sz = dv.getUint32(p + 12) + dv.getUint32(p + 8) * 4294967296; h = 16; } else if (sz === 0) sz = e - p;
        if (sz < 8 || p + sz > e) break;
        var cs = p + h, ce = p + sz;
        if (ty === "moov" || ty === "udta" || ty === "ilst" || ty === "trak" || ty === "mdia") walk(cs, ce, path + "/" + ty);
        else if (ty === "meta") walk(cs + 4, ce, path + "/meta");
        else if (ty === "mvhd") { var ver = u[cs], ts = dv.getUint32(cs + (ver ? 20 : 12)), du = ver ? dv.getUint32(cs + 24) * 4294967296 + dv.getUint32(cs + 28) : dv.getUint32(cs + 16); if (ts) o.dur = du / ts; }
        else if (/\/ilst$/.test(path)) {
          var dp = cs; if (name(dp + 4) !== "data") { p += sz; continue; }
          var dsz = dv.getUint32(dp), kind = dv.getUint32(dp + 8) & 0xffffff, pl = u.subarray(dp + 16, dp + dsz);
          var str = function () { return clean(new TextDecoder("utf-8").decode(pl)); };
          if (ty === "\u00a9nam") o.title = str(); else if (ty === "\u00a9ART") o.artist = str(); else if (ty === "aART" && !o.artist) o.artist = str();
          else if (ty === "\u00a9alb") o.album = str(); else if (ty === "\u00a9day") o.year = (str().match(/\d{4}/) || [""])[0];
          else if (ty === "\u00a9gen") o.genre = str(); else if (ty === "rtng") o.explicit = pl[0] === 1 || pl[0] === 4;
          else if (ty === "covr" && !o.pic) o.pic = new Blob([pl], { type: kind === 14 ? "image/png" : "image/jpeg" });
        }
        p += sz;
      }
    }
    try { walk(0, u.length, ""); } catch (e) {}
    return o;
  }
  function tags(buf) { var u = new Uint8Array(buf); return u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33 ? id3(u) : name4(u, 4) === "ftyp" ? mp4(u) : {}; }
  function name4(u, p) { return String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]); }
  // Decode once on the owner's phone: exact length + a 10 Hz loudness map the visualizer follows on iOS.
  function analyse(buf) {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return Promise.resolve(null);
    var ctx;
    try { ctx = new C(); } catch (e) { return Promise.resolve(null); }
    return new Promise(function (res) {
      var done = function (v) { try { ctx.close(); } catch (e) {} res(v); };
      try {
        var pr = ctx.decodeAudioData(buf, function (ab) { done(ab); }, function () { done(null); });
        pr && pr.catch && pr.catch(function () { done(null); });
      } catch (e) { done(null); }
    }).then(function (ab) {
      if (!ab) return null;
      var ch = ab.getChannelData(0), ch2 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null, win = Math.floor(ab.sampleRate / 10), n = Math.min(36000, Math.floor(ch.length / win)), rms = new Float32Array(n), mx = 1e-6;
      for (var i = 0; i < n; i++) { var s = 0; for (var j = i * win, e = j + win; j < e; j += 4) { var x = ch2 ? (ch[j] + ch2[j]) / 2 : ch[j]; s += x * x; } rms[i] = Math.sqrt(s / (win / 4)); if (rms[i] > mx) mx = rms[i]; }
      var w = new Uint8Array(n);
      for (var k = 0; k < n; k++) w[k] = Math.round(255 * Math.pow(rms[k] / mx, 0.8));
      return { dur: ab.duration, wave: w };
    });
  }
  function metaDur(f) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(f), a = new Audio(), fin = function (v) { try { URL.revokeObjectURL(u); } catch (e) {} res(v); };
      a.preload = "metadata"; a.onloadedmetadata = function () { fin(isFinite(a.duration) ? a.duration : 0); }; a.onerror = function () { fin(0); };
      setTimeout(function () { fin(0); }, 8e3);
      a.src = u;
    });
  }
  function square(blob, size) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement("canvas");
          cv.width = cv.height = size || 600;
          cv.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) { URL.revokeObjectURL(u); res(b); }, "image/jpeg", 0.88);
        } catch (e) { URL.revokeObjectURL(u); res(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(blob.size <= 3 * 1024 * 1024 && /jpeg|png|webp/.test(blob.type) ? blob : null); };
      img.src = u;
    });
  }
  function xhr(path, body, type, prog) {
    return new Promise(function (res) {
      var x = new XMLHttpRequest(), h = hdr();
      x.open("POST", API + path);
      x.timeout = 5 * 60e3;
      x.ontimeout = function () { res({ ok: !1, error: "Upload timed out. Check your connection" }); };
      for (var k in h) x.setRequestHeader(k, h[k]);
      x.setRequestHeader("Content-Type", type);
      x.upload && (x.upload.onprogress = function (e) { e.lengthComputable && prog && prog(e.loaded / e.total); });
      x.onload = function () { var j; try { j = JSON.parse(x.responseText); } catch (e) { j = { ok: !1, error: "HTTP " + x.status }; } res(j); };
      x.onerror = function () { res({ ok: !1, error: "Network error. Check your connection" }); };
      // ArrayBuffer bodies (not Blob): same bytes, and every engine reports them reliably
      (body && body.arrayBuffer && !(body instanceof ArrayBuffer) ? body.arrayBuffer() : Promise.resolve(body)).then(function (b) { x.send(b); }, function () { res({ ok: !1, error: "Could not read the file" }); });
    });
  }
  function coverUpload(id, file) {
    toast("Uploading cover…");
    return square(file, 600).then(function (b) {
      if (!b) { toast("That image could not be read"); return; }
      return xhr("/api/fm/art?id=" + encodeURIComponent(id), b, b.type || "image/jpeg").then(function (r) { if (r.ok) { set(r.fm); fillEdit(); toast("Cover updated"); } else toast(r.error || "Cover upload failed"); });
    });
  }
  /* File pickers live outside the sheet. iOS hides the page while the Files picker is open; the
     state refresh on return re-renders the sheet, and a picker inside it would be detached, so its
     change event never reached the sheet (dc, 2026-11-09: "adding tracks doesn't work"). */
  var pickFor = "";
  function picker(kind) {
    var id = "fm-pick-" + kind, i = document.getElementById(id);
    if (i) return i;
    i = document.createElement("input");
    i.type = "file"; i.id = id; i.tabIndex = -1; i.setAttribute("aria-hidden", "true");
    i.className = kind === "audio" ? "fm-pick fm-file" : "fm-pick fm-cover-in";
    // audio/* first: iOS Files greys out files that only match a bare extension list
    i.accept = kind === "audio" ? "audio/*,.mp3,.m4a,.aac,.mp4" : "image/*";
    if (kind === "audio") i.multiple = !0;
    i.addEventListener("change", function () {
      var fs = [].slice.call(i.files || []);
      i.value = "";
      if (kind === "audio") { if (fs.length) { tab = "queue"; addFiles(fs); } }
      else if (fs[0] && pickFor) coverUpload(pickFor, fs[0]);
    });
    document.body.appendChild(i);
    return i;
  }
  function within(pr, ms, v) { return Promise.race([pr, new Promise(function (r) { setTimeout(function () { r(v); }, ms); })]); }
  var OKT = { "audio/mpeg": 1, "audio/mp3": 1, "audio/mpeg3": 1, "audio/x-mpeg": 1, "audio/x-mpeg-3": 1, "audio/x-mp3": 1, "audio/mp4": 1, "audio/x-m4a": 1, "audio/m4a": 1, "audio/aac": 1, "audio/x-aac": 1 }, EXT = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", mp4: "audio/mp4" };
  var upBusy = !1, batchN = 0;
  function addFiles(files) {
    [].slice.call(files || []).forEach(function (f) { ups.unshift({ f: f, name: f.name, st: "Waiting…", p: 0 }); });
    ups = ups.slice(0, 30);
    renderSheet();
    pump();
  }
  function upPaint() { if (sheet && tab === "queue" && !drag) { var box = q(".fm-ups", sheet); box ? (box.outerHTML = queueHTML().match(/<ul class="fm-ups">[\s\S]*?<\/ul>/)[0]) : renderSheet(); } }
  function pump() {
    if (upBusy) return;
    var u = ups.filter(function (x) { return x.f && !x.done && !x.err && !x.run; }).pop();
    if (!u) return;
    upBusy = !0; u.run = 1;
    var f = u.f, ext = String(f.name || "").split(".").pop().toLowerCase(), ft = String(f.type || "").toLowerCase(),
      // iOS Files often reports "" or audio/mpeg3 for MP3s: trust the extension, then send a type the Worker accepts
      type = EXT[ext] || (OKT[ft] ? (/mp4|m4a/.test(ft) ? "audio/mp4" : /aac/.test(ft) ? "audio/aac" : "audio/mpeg") : "");
    var fin = function (st, err) {
      u.st = st; u.err = !!err; u.done = !err; u.f = null; upBusy = !1; upPaint();
      if (err) toast((u.name || "Song") + ": " + st);
      else { batchN++; if (!ups.some(function (x) { return x.f && !x.done && !x.err; })) { toast(batchN > 1 ? batchN + " songs added to the queue" : u.name + " added to the queue"); batchN = 0; } }
      pump();
    };
    if (!type) return fin("MP3, M4A or AAC only (this file is " + (ext && ext !== String(f.name) ? "." + ext : f.type || "an unknown type") + ")", 1);
    if (f.size > 25 * 1024 * 1024) return fin("Over 25 MB", 1);
    u.st = "Reading tags…"; upPaint();
    var tg = {}, an = null, raw = null;
    var big = IOS && f.size > 12 * 1024 * 1024;
    within(f.arrayBuffer(), 30e3, null).then(function (buf) {
      if (!buf || !buf.byteLength) throw new Error("the file is empty or could not be read");
      raw = buf;
      try { tg = tags(buf) || {}; } catch (e) { tg = {}; }
      if (tg.dur) return tg.dur;
      u.st = "Measuring…"; upPaint();
      // <audio> metadata can stall on iOS: give it 6 s, then let the server default (180 s) stand
      return within(metaDur(f), 6e3, 0).then(function (d) {
        if (d || big) return d;
        // last resort before upload: decode (copy, since raw is still needed)
        return within(analyse(raw.slice(0)), 20e3, null).then(function (r) { an = r; return r && r.dur; });
      });
    }).then(function (dur) {
      var base = String(f.name || "Untitled").replace(/\.[^.]+$/, "").replace(/_/g, " ").trim() || "Untitled", sp = base.split(/\s+[-–—]\s+/);
      var meta = { title: tg.title || (sp.length > 1 ? sp.slice(1).join(" - ") : base), artist: tg.artist || (sp.length > 1 ? sp[0] : ""), album: tg.album || "", year: tg.year || "", genre: tg.genre || "", explicit: tg.explicit ? "1" : "", dur: Math.round((+dur || 0) * 1e3) / 1e3 };
      var qs = Object.keys(meta).filter(function (k) { return meta[k] !== "" && meta[k] != null; }).map(function (k) { return k + "=" + encodeURIComponent(String(meta[k]).slice(0, 120)); }).join("&");
      u.name = meta.title + (meta.artist ? " · " + meta.artist : "");
      u.st = "Uploading 0%"; upPaint();
      return xhr("/api/fm/upload?" + qs, raw, type, function (p) { u.p = p * 0.92; u.st = "Uploading " + Math.round(p * 100) + "%"; var bar = sheet && sheet.querySelector(".fm-ups li:nth-child(" + (ups.indexOf(u) + 1) + ") .fm-upbar i"); bar ? (bar.style.transform = "scaleX(" + u.p.toFixed(3) + ")", bar.parentNode.previousSibling.lastChild.textContent = u.st) : 0; });
    }).then(function (r) {
      if (!r || !r.ok) return fin(upErr(r), 1);
      set(r.fm);
      var id = r.id, extra = [];
      if (tg.pic) { u.st = "Adding cover…"; upPaint(); extra.push(within(square(tg.pic, 600), 15e3, null).then(function (b) { return b && xhr("/api/fm/art?id=" + id, b, b.type || "image/jpeg"); })); }
      // loudness map for the iOS visualizer: decode after the upload, without copying; skipped for big files on iOS (memory)
      if (!an && !big) extra.push(within(analyse(raw), 25e3, null).then(function (a2) { an = a2; }));
      return Promise.all(extra).then(function (rs) {
        rs.forEach(function (x) { x && x.ok && x.fm && set(x.fm); });
        return an && an.wave && an.wave.length ? xhr("/api/fm/wave?id=" + id, an.wave, "application/octet-stream") : null;
      }).then(function (x) {
        x && x.ok && x.fm && set(x.fm);
        u.p = 1;
        fin("Added" + (tg.pic ? " with cover" : "") + (tg.title ? " · tags read" : ""));
      });
    }).catch(function (e) { fin("Could not add: " + ((e && e.message) || "unreadable file"), 1); });
  }
  function upErr(r) {
    var e = (r && r.error) || "Upload failed";
    return e === "owner only" ? "Not signed in as the station owner. Sign in again." : e;
  }

  /* ---------- render / paint / tick ---------- */
  var lastKey = "";
  function menuPill() {
    document.querySelectorAll(".chat-pmenu-row.chat-misery-fm em").forEach(function (em) { em.textContent = live() ? "LIVE" : ""; em.className = live() ? "chat-fm-pill" : ""; });
  }
  function render() {
    var c = calc();
    lastKey = c ? c.tr.id + "|" + c.paused + "|" + on : "";
    deco();
    chatBar();
    menuPill();
    if (morph) { var inn = q(".fm-m-in", morph); if (inn) inn.outerHTML = morphHTML(); }
    renderSheet();
    if (sheet) { var lc = q(".fm-lc", sheet); lc && (lc.innerHTML = lcText()); }
    if (live() && !tickT) tickT = setInterval(tick, 1e3);
    if (!live() && tickT && !sheet) { clearInterval(tickT); tickT = 0; }
  }
  function paint() {
    var c = calc();
    [morph, sheet].forEach(function (root) {
      if (!root || !c) return;
      var e1 = q(".fm-el", root), e2 = q(".fm-rem", root), sc = q(".fm-scrub", root), pb = q(".fm-pbar i", root);
      if (sc && !sc._busy) { sc.value = Math.floor(c.t); sc.style.setProperty("--p", (c.t / c.d * 100).toFixed(2) + "%"); }
      if (!sc || !sc._busy) { e1 && (e1.textContent = fmt(c.t)); e2 && (e2.textContent = "-" + fmt(c.d - c.t)); }
      if (pb) {
        var pv = c.t / c.d;
        if (pb._v != null && pv < pb._v - 0.002) { pb.style.transition = "none"; void pb.offsetWidth; } else pb.style.transition = "";
        pb._v = pv; pb.style.transform = "scaleX(" + pv.toFixed(4) + ")";
      }
    });
    if (sheet) { var lc = q(".fm-lc", sheet); lc && (lc.innerHTML = lcText()); }
    if (morph) { var ml = q(".fm-lc", morph); ml && (ml.innerHTML = ico("ear") + ((S && S.listeners) || 0)); }
    chatBar();
  }
  function tick() {
    tickN++;
    var c = calc(), k = c ? c.tr.id + "|" + c.paused + "|" + on : "";
    if (k !== lastKey) { render(); sync(); }
    else { paint(); deco(); }
    if (tickN % 5 === 0) sync();
    if (RM.matches && sheet) viz();
    if (c && !c.paused && !S.paused && (now() - S.startedAt) / 1e3 > durOf(c.tr) + 4 && tickN % 10 === 0) refresh();
  }
  window.addEventListener("resize", function () { hb && (q(".fm-ring", hb)._w = 0); deco(); });
  window.addEventListener("hashchange", function () { setTimeout(deco, 60); setTimeout(deco, 400); });
  document.addEventListener("click", function () { setTimeout(deco, 80); }, !0);

  window.MPFM = {
    open: function () { openSheet("now"); },
    mount: mount,
    isLive: live,
    setMe: function (u) { me = u || null; meP = Promise.resolve(me); sheet && renderSheet(); },
    state: function () { return S; },
    _calc: calc
  };
  function init() { connect(); refresh(); }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
