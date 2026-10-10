/* Liquid Glass engine — vanilla JS implementation of the SDF displacement-map
   glass technique (inspired by samasante/liquid-glass, MIT).
   Refraction is applied to a ::before backdrop layer so children stay crisp.
   Works in Chrome, Safari (iOS), and Firefox. */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var filterCache = {}; // key: "wxh_r" -> filter id
  var svgRoot = null;
  var styleEl = null;

  function ensureSvg() {
    if (svgRoot) return svgRoot;
    svgRoot = document.createElementNS(SVG_NS, "svg");
    svgRoot.setAttribute("width", "0");
    svgRoot.setAttribute("height", "0");
    svgRoot.setAttribute("aria-hidden", "true");
    svgRoot.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
    var defs = document.createElementNS(SVG_NS, "defs");
    defs.setAttribute("id", "lg-defs");
    svgRoot.appendChild(defs);
    document.body.appendChild(svgRoot);
    return svgRoot;
  }

  function ensureStyle() {
    if (styleEl) return styleEl;
    styleEl = document.createElement("style");
    styleEl.setAttribute("id", "lg-dynamic");
    document.head.appendChild(styleEl);
    return styleEl;
  }

  /* Signed distance to a rounded rect centered at origin, half-size (bx, by), radius r. */
  function sdRoundRect(px, py, bx, by, r) {
    var qx = Math.abs(px) - bx + r;
    var qy = Math.abs(py) - by + r;
    var ax = Math.max(qx, 0), ay = Math.max(qy, 0);
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
  }

  /* Generate a displacement map for a WxH rounded rect with radius R.
     R = X displacement, G = Y displacement, B = specular mask.
     Generated at 1/4 res; the browser scales it up smoothly. */
  function generateMap(w, h, r, opts) {
    opts = opts || {};
    var strength = opts.strength != null ? opts.strength : 0.10;
    var depth = opts.depth != null ? opts.depth : 0.40;
    var bendWidth = opts.bendWidth != null ? opts.bendWidth : 0.16;

    var sw = Math.max(8, Math.round(w / 4));
    var sh = Math.max(8, Math.round(h / 4));
    var canvas = document.createElement("canvas");
    canvas.width = sw; canvas.height = sh;
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(sw, sh);
    var data = img.data;

    var minDim = Math.min(w, h);
    var maxShift = Math.max(1, strength * minDim);
    var depthPx = depth * minDim;
    var bx = w / 2, by = h / 2;
    var sx = w / sw, sy = h / sh;
    var norm = 127 / maxShift;

    for (var y = 0; y < sh; y++) {
      for (var x = 0; x < sw; x++) {
        var fx = (x + 0.5) * sx, fy = (y + 0.5) * sy;
        var px = fx - bx, py = fy - by;
        var dist = sdRoundRect(px, py, bx, by, r);
        var idx = (y * sw + x) * 4;
        var dx = 0, dy = 0, spec = 0;

        if (dist < 0) {
          var inside = -dist;
          if (inside < depthPx) {
            var t = inside / depthPx;
            var bend = Math.pow(1 - t, 2.2);
            var e = 1.5;
            var gx = sdRoundRect(px + e, py, bx, by, r) - sdRoundRect(px - e, py, bx, by, r);
            var gy = sdRoundRect(px, py + e, bx, by, r) - sdRoundRect(px, py - e, bx, by, r);
            var gl = Math.hypot(gx, gy) || 1;
            dx = -(gx / gl) * bend * maxShift;
            dy = -(gy / gl) * bend * maxShift;
            var edgeBand = Math.max(2, bendWidth * minDim * 0.5);
            var edgeT = Math.max(0, 1 - inside / edgeBand);
            spec = Math.pow(edgeT, 1.5) * 255;
          }
        }

        data[idx]     = Math.max(0, Math.min(255, 128 + dx * norm));
        data[idx + 1] = Math.max(0, Math.min(255, 128 + dy * norm));
        data[idx + 2] = spec;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }

  /* Create (or reuse) an SVG filter for the given geometry. Returns filter id. */
  function getFilter(w, h, r, opts) {
    var key = Math.round(w) + "x" + Math.round(h) + "_" + Math.round(r);
    if (filterCache[key]) return filterCache[key];

    ensureSvg();
    var defs = svgRoot.querySelector("#lg-defs");
    var fid = "lg" + key.replace(/[^a-z0-9]/gi, "");
    if (document.getElementById(fid)) { filterCache[key] = fid; return fid; }

    var mapUrl = generateMap(w, h, r, opts);

    var filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", fid);
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    var feImg = document.createElementNS(SVG_NS, "feImage");
    feImg.setAttribute("href", mapUrl);
    feImg.setAttribute("x", "0"); feImg.setAttribute("y", "0");
    feImg.setAttribute("width", Math.round(w)); feImg.setAttribute("height", Math.round(h));
    feImg.setAttribute("preserveAspectRatio", "none");
    feImg.setAttribute("result", "map");
    filter.appendChild(feImg);

    var disp = document.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "map");
    disp.setAttribute("scale", "28");
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");
    filter.appendChild(disp);

    defs.appendChild(filter);
    filterCache[key] = fid;
    return fid;
  }

  /* Apply liquid glass to an element via its ::before layer. */
  function applyTo(el, opts) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    // If not laid out yet, retry shortly.
    if (rect.width < 4 || rect.height < 4) {
      setTimeout(function () { applyTo(el, opts); }, 300);
      return;
    }
    var w = rect.width, h = rect.height;
    var cs = window.getComputedStyle(el);
    var brText = cs.borderRadius || "0";
    var br = parseFloat(brText) || 0;
    if (/999|50%/.test(brText)) br = Math.min(w, h) / 2;
    if (br > Math.min(w, h) / 2) br = Math.min(w, h) / 2;

    var fid = getFilter(w, h, br, opts || {});
    el.setAttribute("data-lg", fid);
    el.classList.add("lg-glass");

    // Inject the per-filter ::before rule (once per filter).
    ensureStyle();
    var ruleId = "lg-rule-" + fid;
    if (!document.getElementById(ruleId)) {
      var style = document.createElement("style");
      style.setAttribute("id", ruleId);
      style.textContent = '.lg-glass[data-lg="' + fid + '"]::before{filter:url(#' + fid + ");}";
      document.head.appendChild(style);
    }
  }

  var refreshT = null;
  function refreshAll() {
    document.querySelectorAll(".lg-glass[data-lg]").forEach(function (el) {
      var fid = el.getAttribute("data-lg");
      el.removeAttribute("data-lg");
      // Re-measure and re-apply (filter cache keeps it cheap).
      setTimeout(function () { applyTo(el, {}); }, 50);
    });
  }

  window.LiquidGlass = {
    apply: applyTo,
    refresh: refreshAll,
    init: function () {
      ensureSvg();
      ensureStyle();
      var els = document.querySelectorAll("[data-liquid-glass]");
      els.forEach(function (el) {
        var opts = {};
        try { opts = JSON.parse(el.getAttribute("data-liquid-glass") || "{}"); } catch (e) {}
        // Defer slightly so layout is settled.
        setTimeout(function () { applyTo(el, opts); }, 60);
      });
      window.addEventListener("resize", function () {
        clearTimeout(refreshT);
        refreshT = setTimeout(refreshAll, 400);
      });
    },
    /* Observe for dynamically added glass elements (chat messages, etc.). */
    watch: function () {
      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.hasAttribute && n.hasAttribute("data-liquid-glass")) {
              var opts = {};
              try { opts = JSON.parse(n.getAttribute("data-liquid-glass") || "{}"); } catch (e) {}
              setTimeout(function () { applyTo(n, opts); }, 60);
            }
            if (n.querySelectorAll) {
              n.querySelectorAll("[data-liquid-glass]").forEach(function (el) {
                if (!el.classList.contains("lg-glass")) {
                  var o = {};
                  try { o = JSON.parse(el.getAttribute("data-liquid-glass") || "{}"); } catch (e) {}
                  setTimeout(function () { applyTo(el, o); }, 60);
                }
              });
            }
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.LiquidGlass.init();
      window.LiquidGlass.watch();
    });
  } else {
    window.LiquidGlass.init();
    window.LiquidGlass.watch();
  }
})();
