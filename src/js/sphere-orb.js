/* Sphere power (per dc): the avatar becomes the glowing glass orb from dc's Holo.mp4 reference.
   One hidden <video> (img/powers/sphere-orb.mp4, a seamless 13.5 s loop of the real orb) is decoded once;
   every visible Sphere avatar gets a small <canvas> that paints the current video frame. 20 orbs in chat
   cost one decode. The video only plays while an orb is on screen. Until a frame is ready, with Reduce
   motion, or if the browser refuses autoplay (Low Power Mode), the CSS still frame shows instead.
   It is a clear orb: no colour options (per dc). */
(function () {
  "use strict";
  var SEL = ".chat-msg.pw-sphere .chat-avatar-wrap, .mp-pb-av.pw-sphere .chat-avatar-wrap, .mpd-me.pw-sphere .chat-avatar-wrap";
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
  /* (Sphere is a clear orb with no colour options, per dc)
     Glass: each video frame is turned into white light whose opacity is the frame's brightness (dark glass
     becomes see-through), once, into a shared buffer; every orb canvas then draws that buffer. So the orb
     can be larger than the avatar with no dark band around it, on any background. */
  var BUF = 256, buf = null, bctx = null, LUT = null;
  function glassFrame() {
    if (!buf) {
      buf = document.createElement("canvas"); buf.width = buf.height = BUF;
      bctx = buf.getContext("2d", { willReadFrequently: true });
      // brightness -> opacity, the same curve the CSS lift used (grayscale, contrast 2.4, brightness .6, 85%)
      LUT = new Uint8ClampedArray(256);
      for (var i = 0; i < 256; i++) LUT[i] = Math.max(0, Math.min(1, ((i / 255 - 0.5) * 2.4 + 0.5) * 0.6)) * 0.85 * 255;
    }
    if (!bctx) return false;
    // the filmed orb fills 286 of its 290 px frame: draw a hair larger so its glass edge meets the circle
    bctx.clearRect(0, 0, BUF, BUF);
    bctx.drawImage(video, -BUF * 0.007, -BUF * 0.007, BUF * 1.014, BUF * 1.014);
    var im = bctx.getImageData(0, 0, BUF, BUF), d = im.data;
    for (var k = 0; k < d.length; k += 4) {
      var a = LUT[(d[k] * 54 + d[k + 1] * 183 + d[k + 2] * 19) >> 8];
      d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = a * (d[k + 3] / 255);
    }
    bctx.putImageData(im, 0, 0);
    return true;
  }
  function draw() {
    frameCb = 0; raf = 0;
    if (!video || video.readyState < 2) return schedule();
    if (!glassFrame()) return schedule();
    visible.forEach(function (c) {
      if (!c.isConnected) { visible.delete(c); return; }
      var s = c.width, x = c._ctx || (c._ctx = c.getContext("2d"));
      if (!x) return;
      x.clearRect(0, 0, s, s);
      x.drawImage(buf, 0, 0, s, s);
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
    if (RM.matches) { if (c) c.remove(); return; }
    if (!c) {
      c = document.createElement("canvas"); c.className = "mp-sph-cv"; c.setAttribute("aria-hidden", "true");
      wrap.appendChild(c);
    }
    if (c._sized) return; // already set up (scans are cheap: no layout reads for known orbs)
    c._sized = true;
    var px = Math.min(256, Math.max(48, Math.round((wrap.offsetWidth || 36) * 1.18 * Math.min(3, window.devicePixelRatio || 1))));
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
        if (m.attributeName === "class" ? /pw-sphere/.test(String(m.target.className) + " " + (m.oldValue || "")) : false) return soon();
      } else if (m.addedNodes.length) return soon();
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"], attributeOldValue: true });
  document.addEventListener("visibilitychange", function () { if (document.hidden && playing) { playing = false; video && video.pause(); } else update(); });
  if (RM.addEventListener) RM.addEventListener("change", soon);
  soon();
})();
