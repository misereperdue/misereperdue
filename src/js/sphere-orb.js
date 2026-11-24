/* Sphere power (per dc): the avatar becomes the glowing glass orb from dc's Holo.mp4 reference.
   One hidden <video> (img/powers/sphere-orb.mp4, a seamless 13.5 s loop of the real orb) is decoded once;
   every visible Sphere avatar gets a small <canvas> that paints the current video frame. 20 orbs in chat
   cost one decode. The video only plays while an orb is on screen. Until a frame is ready, with Reduce
   motion, or if the browser refuses autoplay (Low Power Mode), the CSS still frame shows instead.
   A custom Sphere colour turns the orb's hue (the orb is ~216deg blue); greys make it silver. */
(function () {
  "use strict";
  var ORB_HUE = 216;
  var SEL = ".chat-msg.pw-sphere .chat-avatar-wrap, .mp-pb-av.pw-sphere .chat-avatar-wrap";
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var video = null, playing = false, failed = false, visible = new Set(), io = null, frameCb = 0, raf = 0;

  function getVideo() {
    if (video) return video;
    video = document.createElement("video");
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = "auto";
    ["muted", "playsinline", "webkit-playsinline", "loop", "disablepictureinpicture", "disableremoteplayback"].forEach(function (a) { video.setAttribute(a, ""); });
    video.setAttribute("aria-hidden", "true"); video.tabIndex = -1;
    video.style.cssText = "position:fixed;left:-4px;top:-4px;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1";
    // H.264 where it plays (iPhone/Safari, Chrome), else VP9 WebM (builds without proprietary codecs)
    var mp4 = video.canPlayType('video/mp4; codecs="avc1.4D401E"');
    video.src = mp4 ? "img/powers/sphere-orb.mp4?v=1" : "img/powers/sphere-orb.webm?v=1";
    (document.body || document.documentElement).appendChild(video);
    video.addEventListener("error", function () { failed = true; });
    return video;
  }
  function hexHue(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim()); if (!m) return null;
    var n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
  }
  /* colour: rotate the real orb's hue toward the chosen colour (ice/blues stay as filmed) */
  function tint(wrap) {
    var host = wrap.closest(".pw-sphere"), c = host && host.style.getPropertyValue("--pw-sphere");
    if (host) host._sphC = c || "";
    var hv = hexHue(c), f = "";
    if (hv) {
      if (hv.s < 0.14) f = "saturate(.12) brightness(" + (0.85 + hv.v * 0.3).toFixed(2) + ")";
      else { var d = ((hv.h - ORB_HUE + 540) % 360) - 180; if (Math.abs(d) > 14) f = "hue-rotate(" + Math.round(d) + "deg)"; }
    }
    if (wrap._sphF !== f) { wrap._sphF = f; wrap.style.setProperty("--sph-filter", f || "none"); }
  }

  function draw() {
    frameCb = 0; raf = 0;
    if (!video || video.readyState < 2) return schedule();
    visible.forEach(function (c) {
      if (!c.isConnected) { visible.delete(c); return; }
      var s = c.width, x = c._ctx || (c._ctx = c.getContext("2d"));
      if (!x) return;
      // the filmed orb fills 286 of its 290 px frame: draw a hair larger so its glass edge meets the circle
      x.drawImage(video, -s * 0.007, -s * 0.007, s * 1.014, s * 1.014);
      if (!c._live) { c._live = true; c.classList.add("is-live"); }
    });
    schedule();
  }
  function schedule() {
    if (!visible.size || !playing) return;
    if (video.requestVideoFrameCallback) { if (!frameCb) frameCb = video.requestVideoFrameCallback(draw); }
    else if (!raf) raf = requestAnimationFrame(draw);
  }
  function update() {
    if (RM.matches || failed) return;
    var want = visible.size > 0, v = getVideo();
    if (want && !playing) {
      playing = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () { playing = false; }); // autoplay refused: the still frame stays
      schedule();
    } else if (!want && playing) { playing = false; v.pause(); }
  }

  function attach(wrap) {
    var c = wrap.querySelector(":scope > canvas.mp-sph-cv");
    tint(wrap);
    if (RM.matches) { if (c) c.remove(); return; }
    if (!c) {
      c = document.createElement("canvas"); c.className = "mp-sph-cv"; c.setAttribute("aria-hidden", "true");
      wrap.appendChild(c);
    }
    if (c._sized) return; // already set up (scans are cheap: no layout reads for known orbs)
    c._sized = true;
    var px = Math.min(256, Math.max(48, Math.round((wrap.offsetWidth || 36) * Math.min(3, window.devicePixelRatio || 1))));
    c.width = c.height = px;
    if (io) io.observe(c); else { visible.add(c); update(); }
  }
  function scan() {
    scanT = 0;
    document.querySelectorAll(SEL).forEach(attach);
    // drop canvases whose avatar lost the power
    document.querySelectorAll("canvas.mp-sph-cv").forEach(function (c) {
      if (!c.parentNode || !c.parentNode.matches(SEL)) { if (io) io.unobserve(c); visible.delete(c); c.remove(); }
    });
    update();
  }
  var scanT = 0;
  function soon() { if (!scanT) scanT = requestAnimationFrame(scan); }

  if (window.IntersectionObserver) io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    update();
  }, { rootMargin: "80px" });
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === "attributes") {
        // only the power class flipping, or a Sphere host's colour changing (chat restyles messages constantly)
        if (m.attributeName === "class" ? /pw-sphere/.test(String(m.target.className) + " " + (m.oldValue || "")) : m.target.classList && m.target.classList.contains("pw-sphere") && m.target.style.getPropertyValue("--pw-sphere") !== (m.target._sphC || "")) return soon();
      } else if (m.addedNodes.length) return soon();
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"], attributeOldValue: true });
  document.addEventListener("visibilitychange", function () { if (document.hidden && playing) { playing = false; video && video.pause(); } else update(); });
  if (RM.addEventListener) RM.addEventListener("change", soon);
  soon();
})();
