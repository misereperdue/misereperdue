function nativeShare(t, e, n) {
  navigator.share
    ? navigator.share({ title: t, text: e, url: n }).catch(function () {})
    : navigator.clipboard && navigator.clipboard.writeText(n).catch(function () {});
}
function shareProduct(t) {
  var e = "https://misereperdue.com/#product-" + encodeURIComponent(t.id || "");
  nativeShare(t.name, "Check out " + t.name + " on Misère Perdue", e);
}
var MPShop = (function () {
  "use strict";
  var t = null,
    e = null;
  // Lazy 3D: the viewer script (and three.js inside it) loads only when a
  // product with a 3D stage is opened. Returns a cleanup fn like mount().
  function lazy3d(name, src, el) {
    var dead = !1, inner = null;
    function go() {
      if (!dead && window[name]) inner = window[name].mount(el);
    }
    if (window[name]) go();
    else {
      var s = document.querySelector('script[data-lazy3d="' + name + '"]');
      if (!s) {
        s = document.createElement("script");
        s.src = src;
        s.async = !0;
        s.setAttribute("data-lazy3d", name);
        s.addEventListener("error", function () {
          s.remove();
        });
        document.head.appendChild(s);
      }
      s.addEventListener("load", go);
    }
    return function () {
      dead = !0;
      inner && (inner(), (inner = null));
    };
  }
  function n(t) {
    return !!t && ("membership" === t.handle || /membership/i.test(t.name || ""));
  }
  function a(t) {
    return (
      !!t &&
      ("misery-v_v-sleeping-mask" === t.handle || "gid://shopify/Product/8161016414310" === t.id)
    );
  }
  var o = ["img/mask-front-light.jpg", "img/mask-back-light.jpg"],
    i = "img/vip-card-light.jpg";
  function r() {
    var t = document.documentElement.getAttribute("data-theme");
    return t
      ? "light" === t
      : !(!window.matchMedia || !matchMedia("(prefers-color-scheme: light)").matches);
  }
  function c(t) {
    return a(t) && r() ? o : n(t) && r() ? [i] : (t.images || []).filter(Boolean);
  }
  function s(t) {
    return a(t) && r() ? o[0] : n(t) && r() ? i : t.image;
  }
  function l(t) {
    return String(null == t ? "" : t).replace(/[&<>"']/g, function (t) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[t];
    });
  }
  function u(t, e) {
    var n = (function (t) {
        var e = String(t || "").toLowerCase();
        return -1 !== e.indexOf("jersey")
          ? "👕"
          : -1 !== e.indexOf("mask") || -1 !== e.indexOf("sleeping")
            ? "🥽"
            : -1 !== e.indexOf("membership") || -1 !== e.indexOf("vip")
              ? "⭐"
              : null;
      })(t),
      a = "img-ph" + (n ? " emoji-tile" : ""),
      o =
        n ||
        l(
          (function (t) {
            return (
              String(t || "")
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(function (t) {
                  return t[0];
                })
                .join("") || "M"
            ).toUpperCase();
          })(t),
        );
    return (
      '<div class="' +
      a +
      '" aria-hidden="true"' +
      (e ? ' style="' + e + '"' : "") +
      "><span>" +
      o +
      "</span></div>"
    );
  }
  function d(t, e) {
    if (!t) return t;
    if (-1 === t.indexOf("cdn.shopify.com")) return t;
    var n = -1 === t.indexOf("?") ? "?" : "&";
    return t + n + "width=" + e;
  }
  function p(t, e) {
    var n = s(t);
    return n
      ? '<img src="' +
          l(d(n, 800)) +
          '" alt="' +
          l(t.name) +
          '" decoding="async" draggable="false"' +
          (e ? "" : ' loading="lazy"') +
          ">"
      : u(t.name);
  }
  var f = "";
  function v() {
    try {
      var t = localStorage.getItem("mp_products_cache_v2");
      if (t) {
        var e = JSON.parse(t);
        if (e && e.length) return e;
      }
    } catch (t) {}
    return null;
  }
  function h(t) {
    return MPShopify.fetchProducts()
      .then(function (e) {
        if (e && e.length) {
          e.forEach(function (t) {
            MP.PRODUCTS[t.id] = t;
          });
          try {
            localStorage.setItem("mp_products_cache_v2", JSON.stringify(e));
          } catch (t) {}
          return e;
        }
        if (!t) return h(!0);
        var n = v();
        return n
          ? (n.forEach(function (t) {
              MP.PRODUCTS[t.id] = t;
            }),
            (f = "showing cached products"),
            n)
          : [];
      })
      .catch(function (e) {
        if (!t) return h(!0);
        var n = v();
        return n
          ? (n.forEach(function (t) {
              MP.PRODUCTS[t.id] = t;
            }),
            (f = "store unreachable, showing cached"),
            n)
          : ((f = "store unreachable (" + (e && e.message ? e.message : "network") + ")"), []);
      });
  }
  function m() {
    return window.MPShopify && MPShopify.configured()
      ? ((f = ""), h(!1))
      : ((f = window.MPShopify ? "store not configured" : "store module failed to load"),
        Promise.resolve([]));
  }
  function g(t) {
    return (
      '<div role="button" tabindex="0" class="product-card" data-product="' +
      l(t.id) +
      '"><div class="tile-wrap">' +
      p(t) +
      '</div><div class="product-meta"><strong>' +
      l(t.name) +
      '</strong><span class="meta">' +
      l(
        (function (t) {
          if (t.priceBySize) {
            var e = Object.keys(t.priceBySize)
              .map(function (e) {
                return t.priceBySize[e];
              })
              .filter(function (t, e, n) {
                return null != t && n.indexOf(t) === e;
              })
              .sort(function (t, e) {
                return t - e;
              });
            if (e.length > 1) return "$" + e[0] + "-" + e[e.length - 1] + " CAD";
          }
          return t.priceLabel || (null != t.price ? MP.money(t.price) : "Coming soon");
        })(t),
      ) +
      "</span></div>" +
      (!1 === t.available ? '<span class="tag">Coming soon</span>' : "") +
      "</div>"
    );
  }

  /* Misery Globe tile: a wireframe globe (meridians + parallels) drawn on a
   * small canvas, rotating about a tilted axis. Front lines are crisp, back
   * lines faint, so it reads as a sphere. Colour comes from the canvas's CSS
   * `color` (navy on the light photo tile, ice blue on the dark one), so it
   * follows the theme. One frame only under prefers-reduced-motion; pauses
   * when off screen or the tab is hidden; stops itself when the grid is
   * re-rendered (canvas detached). No dependencies. */
  var globeStop = null;
  function mountGlobe(cv) {
    if (globeStop) (globeStop(), (globeStop = null));
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var raf = 0,
      visible = true,
      running = true,
      frame = 0,
      colour = "",
      W = 0,
      H = 0,
      dpr = 1;
    var TILT = 0.38,
      PERIOD = 24000,
      t0 = performance.now();
    function size() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
    }
    function rgba(a) {
      var m = colour.match(/\d+(\.\d+)?/g) || [10, 18, 48];
      return "rgba(" + m[0] + "," + m[1] + "," + m[2] + "," + a + ")";
    }
    function draw(now) {
      if (!cv.isConnected) return stop();
      if (frame++ % 60 === 0) colour = getComputedStyle(cv).color;
      size();
      if (W < 8 || H < 8) {
        // hidden panel (display:none): the IntersectionObserver kicks us when it's shown
        raf = 0;
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Big, zoomed-in globe bleeding off the right/bottom edges; text overlays on the left.
      var R = Math.max(H * 0.95, W * 0.36),
        cx = W - R * 0.62,
        cy = H * 0.78;
      // halo behind the globe
      var halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.9);
      halo.addColorStop(0, rgba(0.16));
      halo.addColorStop(1, rgba(0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);
      var rot = rm && rm.matches ? 0.6 : (((now - t0) % PERIOD) / PERIOD) * Math.PI * 2;
      var ct = Math.cos(TILT),
        st = Math.sin(TILT),
        cr = Math.cos(-0.41),
        sr = Math.sin(-0.41);
      // sphere body + soft rim light
      var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, rgba(0.1));
      g.addColorStop(1, rgba(0.02));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      // project lat/lon (radians) -> screen, returns z (towards viewer)
      function P(lat, lon, out) {
        var x = Math.cos(lat) * Math.sin(lon + rot),
          y = Math.sin(lat),
          z = Math.cos(lat) * Math.cos(lon + rot);
        var y2 = y * ct - z * st,
          z2 = y * st + z * ct;
        // axial tilt (~23.5deg, like Earth): roll the projected point in the screen plane
        out[0] = cx + (x * cr - y2 * sr) * R;
        out[1] = cy - (x * sr + y2 * cr) * R;
        out[2] = z2;
      }
      var pt = [0, 0, 0];
      function curve(fn, n, front, alpha, width) {
        ctx.beginPath();
        var pen = false;
        for (var i = 0; i <= n; i++) {
          fn(i / n, pt);
          var on = front ? pt[2] >= 0 : pt[2] < 0;
          if (on) pen ? ctx.lineTo(pt[0], pt[1]) : (ctx.moveTo(pt[0], pt[1]), (pen = true));
          else pen = false;
        }
        ctx.strokeStyle = rgba(alpha);
        ctx.lineWidth = width;
        ctx.stroke();
      }
      var MER = 12,
        PAR = [-60, -30, 0, 30, 60];
      for (var pass = 0; pass < 2; pass++) {
        var front = pass === 1;
        for (var m = 0; m < MER; m++)
          (function (lon) {
            curve(
              function (u, o) {
                P(-Math.PI / 2 + u * Math.PI, lon, o);
              },
              72,
              front,
              front ? 0.7 : 0.14,
              front ? 1.1 : 0.8,
            );
          })((m / MER) * Math.PI * 2);
        for (var k = 0; k < PAR.length; k++)
          (function (lat, eq) {
            curve(
              function (u, o) {
                P(lat, u * Math.PI * 2, o);
              },
              120,
              front,
              front ? (eq ? 0.85 : 0.6) : 0.12,
              front ? (eq ? 1.4 : 1) : 0.8,
            );
          })((PAR[k] * Math.PI) / 180, PAR[k] === 0);
      }
      // outline
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(0.8);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (running && visible && !document.hidden && !(rm && rm.matches))
        raf = requestAnimationFrame(draw);
      else raf = 0;
    }
    function kick() {
      if (!raf && running && visible && !document.hidden) raf = requestAnimationFrame(draw);
    }
    function onVis() {
      document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : kick();
    }
    var io = window.IntersectionObserver
      ? new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          visible ? kick() : (cancelAnimationFrame(raf), (raf = 0));
        })
      : null;
    io && io.observe(cv);
    document.addEventListener("visibilitychange", onVis);
    rm && rm.addEventListener && rm.addEventListener("change", kick);
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      io && io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      rm && rm.removeEventListener && rm.removeEventListener("change", kick);
    }
    globeStop = stop;
    kick();
  }
  function y(t) {
    var e = document.querySelector('[data-view="' + t + '"]');
    e && e.click();
  }
  var b = "";
  function k() {
    var t = document.getElementById("shop-grid");
    if (t) {
      var e = v();
      (e
        ? (e.forEach(function (t) {
            MP.PRODUCTS[t.id] = t;
          }),
          n(e))
        : (t.innerHTML =
            '<div class="lg-spin-wrap"><span class="lg-spin" role="status" aria-label="Loading products"></span></div>'),
        m().then(function (t) {
          t && t.length ? n(t) : e || n(t);
        }));
    }
    function n(e) {
      if (e && e.length) {
        var n = e
          .map(function (t) {
            return t.id + "|" + (s(t) || "") + "|" + (t.price || "") + "|" + c(t).join(",");
          })
          .join(";");
        (n === b && t.querySelector("[data-product]")) ||
          ((b = n),
          (t.innerHTML =
            '<div class="product-card globe-promo" role="button" tabindex="0" aria-label="Misery Globe. Sign up to get access to exclusive deals and content"><div class="tile-wrap gp-photo"><canvas class="gp-canvas" aria-hidden="true"></canvas><div class="gp-text"><strong class="gp-title">Misery Globe</strong><span class="gp-line">Sign up to get access to exclusive deals &amp; content</span><span class="gp-acct" role="button" tabindex="0">Sign up<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div></div></div>' +
            '<button type="button" class="a2hs" hidden><span class="a2hs-ico" aria-hidden="true"><img src="/img/icon-192.png?v=11" alt="" width="26" height="26" decoding="async"></span><span class="a2hs-t">Get the App</span></button>' +
            e.map(g).join("") +
            (f
              ? '<p class="meta" style="margin-top:10px;font-size:12px">Note: ' + l(f) + "</p>"
              : "")),
          t.querySelectorAll("[data-product]").forEach(function (t) {
            ((t.onclick = function () {
              w(t.dataset.product);
            }),
              (t.onkeydown = function (e) {
                ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), w(t.dataset.product));
              }));
          }),
          (function (t) {
            var e = t.querySelector(".globe-promo");
            if (e) {
              ((e.onclick = function () {
                y("forum");
              }),
                (e.onkeydown = function (t) {
                  ("Enter" !== t.key && " " !== t.key) || (t.preventDefault(), y("forum"));
                }));
              var n = e.querySelector(".gp-acct");
              n &&
                ((n.onclick = function (t) {
                  (t.stopPropagation(), y("journal"));
                }),
                (n.onkeydown = function (t) {
                  ("Enter" !== t.key && " " !== t.key) ||
                    (t.preventDefault(), t.stopPropagation(), y("journal"));
                }));
              mountGlobe(e.querySelector(".gp-canvas"));
            }
            mountA2HS(t.querySelector(".a2hs"));
          })(t));
      } else
        t.innerHTML =
          '<p class="meta" style="font-size:15px">Nothing in the shop yet.</p>' +
          (f
            ? '<p class="meta" style="margin-top:10px;font-size:12px">Note: ' + l(f) + "</p>"
            : "");
    }
  }
  // Minimal "Add to Home Screen" row under the Globe tile. Hidden once installed.
  // Chrome/Android: uses the captured install prompt. iOS Safari: tap shows the Share hint.
  var a2hsEvt = null;
  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    a2hsEvt = ev;
  });
  window.addEventListener("appinstalled", function () {
    var b = document.querySelector(".a2hs");
    if (b) b.hidden = true;
  });
  function mountA2HS(b) {
    if (!b) return;
    var installed =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      !!navigator.standalone;
    if (installed) return;
    b.hidden = false;
    var txt = b.querySelector(".a2hs-t");
    b.onclick = function () {
      if (a2hsEvt) {
        a2hsEvt.prompt();
        a2hsEvt.userChoice &&
          a2hsEvt.userChoice.then(function (r) {
            if (r && r.outcome === "accepted") b.hidden = true;
          });
        a2hsEvt = null;
        return;
      }
      var open = b.classList.toggle("is-hint");
      txt.textContent = open ? "Tap Share, then \u201cAdd to Home Screen\u201d" : "Get the App";
    };
  }
  function M(t, e) {
    if (!1 === t.available) return '<span class="pill-soon">Coming soon</span>';
    var n = (function (t, e) {
      var n = t + ":" + (e || "one"),
        a = MP.readCart().find(function (t) {
          return t.key === n;
        });
      return (a && parseInt(a.qty, 10)) || 0;
    })(t.id, e);
    return n
      ? '<div class="in-bag"><span class="in-bag-label">In your bag</span><div class="bag-stepper"><button type="button" data-step="-1" aria-label="Remove one">−</button><span>' +
          n +
          '</span><button type="button" data-step="1" aria-label="Add one">+</button></div></div>'
      : '<button class="btn accent morph-btn" id="add-bag" type="button"><span class="lbl">Add to bag</span><svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11"/></svg></button>';
  }
  function P(t, e) {
    var n = document.getElementById("bag-action");
    function a() {
      ((n.innerHTML = M(t, e())),
        (function () {
          var o = document.getElementById("add-bag");
          o &&
            (o.onclick = function () {
              (window.haptic && window.haptic(20),
                MP.addItem(t.id, e()),
                q(),
                o.classList.add("done"),
                setTimeout(a, 900));
            });
          n.querySelectorAll("[data-step]").forEach(function (n) {
            n.onclick = function () {
              var o = t.id + ":" + (e() || "one"),
                i = MP.readCart().find(function (t) {
                  return t.key === o;
                });
              (MP.setQty(o, (i ? i.qty : 0) + +n.dataset.step), q(), a());
            };
          });
        })());
    }
    n && a();
  }
  function w(o) {
    (t && (t(), (t = null)), e && (e(), (e = null)));
    var i = MP.PRODUCTS[o];
    if (i) {
      var r,
        s = c(i),
        p = document.getElementById("product-view"),
        f = null;
      (n(i) &&
        i.sizes &&
        i.sizes.length > 1 &&
        (f = i.sizes.slice().sort(function (t, e) {
          return parseFloat(t) - parseFloat(e);
        })),
        (r = f
          ? '<div class="member-segs" role="group" aria-label="Membership amount">' +
            f
              .map(function (t, e) {
                return (
                  '<button type="button" data-amt="' +
                  l(t) +
                  '"' +
                  (0 === e ? ' class="on"' : "") +
                  ">$" +
                  l(t) +
                  "</button>"
                );
              })
              .join("") +
            "</div>"
          : i.sizes && i.sizes.length
            ? (i.optionName && !/size/i.test(i.optionName)
                ? '<div class="option-label">' + l(i.optionName) + "</div>"
                : "") +
              '<div class="sizes">' +
              i.sizes
                .map(function (t, e) {
                  return (
                    '<button type="button" data-size="' +
                    l(t) +
                    '"' +
                    (0 === e ? ' class="on"' : "") +
                    ">" +
                    l(t) +
                    "</button>"
                  );
                })
                .join("") +
              "</div>"
            : '<div style="height:12px"></div>'));
      var v,
        h =
          '<div class="vip-3d-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg><span>Drag to spin</span></div></div>',
        g = n(i)
          ? '<div class="vip-3d"><div class="vip-3d-stage"></div>' + h
          : a(i)
            ? '<div class="vip-3d mask-3d"><div class="vip-3d-stage"></div>' + h
            : (function (t, e) {
                var n = (t && t.length ? t : []).filter(Boolean);
                if (!n.length)
                  return (
                    '<div class="carousel"><div class="carousel-track">' +
                    u(e, "flex:none;width:100%") +
                    "</div></div>"
                  );
                var a = n
                    .map(function (t, n) {
                      return (
                        '<img src="' +
                        l(d(t, 1200)) +
                        '" alt="' +
                        l(e) +
                        (n ? " " + (n + 1) : "") +
                        '" decoding="async" draggable="false"' +
                        (n ? ' loading="lazy"' : ' fetchpriority="high"') +
                        ">"
                      );
                    })
                    .join(""),
                  o =
                    n.length > 1
                      ? '<div class="car-dots">' +
                        n
                          .map(function (t, e) {
                            return (
                              '<span data-dot="' +
                              e +
                              '"' +
                              (0 === e ? ' class="on"' : "") +
                              "></span>"
                            );
                          })
                          .join("") +
                        "</div>"
                      : "",
                  i =
                    n.length > 1
                      ? '<button type="button" class="car-btn prev" aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button><button type="button" class="car-btn next" aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg></button>'
                      : "";
                return (
                  '<div class="carousel"><div class="carousel-track">' +
                  a +
                  "</div></div>" +
                  (n.length > 1
                    ? '<div class="carousel-controls">' +
                      o +
                      '<div class="car-nav">' +
                      i +
                      "</div></div>"
                    : "")
                );
              })(s, i.name);
      ((p.innerHTML =
        '<article class="article-card">' +
        g +
        "<h1>" +
        l(i.name) +
        '</h1><div class="price">' +
        l(i.priceLabel || (null != i.price ? MP.money(i.price) : "")) +
        "</div>" +
        r +
        '<div id="bag-action"></div><button type="button" class="share-btn" aria-label="Share product"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>Share</button>' +
        (((v = i.details)
          ? String(v)
              .split(/\n{2,}/)
              .map(function (t) {
                return '<p class="meta">' + l(t).replace(/\n/g, "<br>") + "</p>";
              })
              .join("")
          : "") +
          "</article>")),
        (function (t) {
          var e = t.querySelector(".carousel-track"),
            n = e ? e.children.length : 0;
          if (e && !(n < 2)) {
            var a = 0,
              o = t.querySelectorAll("[data-dot]");
            ((t.querySelector(".prev").onclick = function (t) {
              (t.stopPropagation(), r(a - 1));
            }),
              (t.querySelector(".next").onclick = function (t) {
                (t.stopPropagation(), r(a + 1));
              }),
              o.forEach(function (t) {
                t.onclick = function () {
                  r(+t.dataset.dot);
                };
              }));
            var i = null;
            (e.addEventListener(
              "touchstart",
              function (t) {
                i = t.touches[0].clientX;
              },
              { passive: !0 },
            ),
              e.addEventListener(
                "touchend",
                function (t) {
                  if (null != i) {
                    var e = t.changedTouches[0].clientX - i;
                    (Math.abs(e) > 40 && r(a + (e < 0 ? 1 : -1)), (i = null));
                  }
                },
                { passive: !0 },
              ));
          }
          function r(t) {
            ((a = (t + n) % n),
              (e.style.transform = "translateX(-" + 100 * a + "%)"),
              o.forEach(function (t, e) {
                t.classList.toggle("on", e === a);
              }));
          }
        })(p));
      var y = i.sizes && i.sizes.length ? i.sizes[0] : "one";
      if (
        (p.querySelectorAll("[data-size]").forEach(function (t) {
          t.onclick = function () {
            ((y = t.dataset.size),
              p.querySelectorAll("[data-size]").forEach(function (t) {
                t.classList.remove("on");
              }),
              t.classList.add("on"),
              B());
          };
        }),
        f)
      ) {
        y = f[0];
        var b = p.querySelector(".price");
        p.querySelectorAll("[data-amt]").forEach(function (t) {
          t.onclick = function () {
            ((y = t.dataset.amt),
              p.querySelectorAll("[data-amt]").forEach(function (t) {
                t.classList.remove("on");
              }),
              t.classList.add("on"),
              b &&
                (b.textContent = MP.money(
                  null != (i.priceBySize || {})[y] ? i.priceBySize[y] : parseFloat(y),
                )),
              B());
          };
        });
      }
      B();
      var k = p.querySelector(".share-btn");
      if (
        (k &&
          (k.onclick = function () {
            shareProduct(i);
          }),
        n(i))
      ) {
        var M = p.querySelector(".vip-3d-stage"),
          S = p.querySelector(".vip-3d-hint");
        if (M && ((t = lazy3d("MPVip3D", "js/vip3d.js?v=2", M)), S)) {
          var C = 0,
            E = function () {
              (C && clearTimeout(C),
                (C = setTimeout(function () {
                  S.classList.remove("gone");
                }, 800)));
            };
          (M.addEventListener("pointerdown", function () {
            (C && (clearTimeout(C), (C = 0)), S.classList.add("gone"));
          }),
            window.addEventListener("pointerup", E),
            window.addEventListener("pointercancel", E));
        }
      }
      if (a(i)) {
        var x = p.querySelector(".vip-3d-stage"),
          L = p.querySelector(".vip-3d-hint");
        if (x && ((e = lazy3d("MPMask3D", "js/mask3d.js?v=2", x)), L)) {
          var T = 0,
            z = function () {
              (T && clearTimeout(T),
                (T = setTimeout(function () {
                  L.classList.remove("gone");
                }, 800)));
            };
          (x.addEventListener("pointerdown", function () {
            (T && (clearTimeout(T), (T = 0)), L.classList.add("gone"));
          }),
            window.addEventListener("pointerup", z),
            window.addEventListener("pointercancel", z));
        }
      }
      window.MPNav && MPNav.showProduct(o);
    } else
      m().then(function () {
        MP.PRODUCTS[o] ? w(o) : window.MPNav && MPNav.show("shop");
      });
    function B() {
      P(i, function () {
        return y;
      });
    }
  }
  function S() {
    var t = document.getElementById("checkout-btn"),
      e = document.getElementById("checkout-err");
    (e && (e.textContent = ""),
      window.MPShopify && MPShopify.configured()
        ? (t && ((t.disabled = !0), (t.innerHTML = '<span class="btn-spin"></span>')),
          m()
            .then(function () {
              var t = [],
                e = !1,
                o = !1;
              if (
                (MP.readCart().forEach(function (i) {
                  var r = MP.PRODUCTS[i.id];
                  if (r && r.shopify) {
                    var c = MPShopify.variantIdFor(r, i.size),
                      s = parseInt(i.qty, 10) || 0;
                    c &&
                      s > 0 &&
                      (t.push({ variantId: c, qty: s }), n(r) && (e = !0), a(r) && (o = !0));
                  }
                }),
                !t.length)
              )
                throw new Error("empty");
              return e || o
                ? (function () {
                    var t = null;
                    try {
                      t = localStorage.getItem("chat_token");
                    } catch (t) {}
                    return t
                      ? fetch("https://api.misereperdue.com/api/me", {
                          headers: { Authorization: "Bearer " + t },
                        })
                          .then(function (t) {
                            return t.ok ? t.json() : null;
                          })
                          .then(function (t) {
                            return (t && t.user && t.user.username) || null;
                          })
                          .catch(function () {
                            return null;
                          })
                      : Promise.resolve(null);
                  })().then(function (n) {
                    var a = [];
                    return (
                      e && a.push({ key: "membership", value: "yes" }),
                      n && a.push({ key: "account", value: n }),
                      MPShopify.createCheckout(t, a)
                    );
                  })
                : MPShopify.createCheckout(t);
            })
            .then(function (n) {
              try {
                var a = new URL(n).hostname;
                if (
                  "shop.misereperdue.com" !== a &&
                  !a.endsWith(".myshopify.com") &&
                  "checkout.shopify.com" !== a
                )
                  throw new Error("bad checkout host");
              } catch (n) {
                return (
                  t && ((t.disabled = !1), (t.textContent = "Checkout")),
                  void (
                    e &&
                    (e.textContent =
                      "Couldn't start checkout. Check your connection and try again.")
                  )
                );
              }
              try {
                MP.writeCart([]);
              } catch (t) {}
              window.location.href = n;
            })
            .catch(function () {
              (t && ((t.disabled = !1), (t.textContent = "Checkout")),
                e &&
                  (e.textContent =
                    "Couldn't start checkout. Check your connection and try again."));
            }))
        : e && (e.textContent = "Checkout isn't available right now."));
  }
  var C = null,
    E = !1,
    x = !1,
    L = 0;
  function T(t, e, n) {
    return (
      '<div class="trow' +
      (n ? " grand" : "") +
      '"><span>' +
      t +
      "</span><span>" +
      e +
      "</span></div>"
    );
  }
  function z(t) {
    var e = document.getElementById("cart-total");
    if (e)
      if (((L = t), t)) {
        var a,
          o = T("Subtotal", MP.money(t));
        if (x)
          if (C) {
            var i = C.code,
              r = l(C.name),
              c = "CA" === i ? Math.round(0.13 * t) : 0,
              s = T("CA" === i ? "HST (est.)" : "Taxes", MP.money(c));
            if (
              ((a = !1),
              MP.readCart().forEach(function (t) {
                var e = MP.PRODUCTS[t.id];
                (e && n(e)) || (a = !0);
              }),
              a)
            )
              if ("CA" === i) {
                var u = t >= 75 ? 0 : 12;
                ((o += T("Shipping to " + r + " (Standard)", u ? MP.money(u) : "Free")),
                  (o += s),
                  (o += T("Total", MP.money(t + u + c), !0)),
                  (o +=
                    '<div class="tnote">' +
                    (u ? "Free Standard shipping on orders $75+. " : "") +
                    "Express ($20) available at checkout. Final taxes calculated at checkout.</div>"));
              } else
                ((o += T("Shipping", "Canada only")),
                  (o += s),
                  (o += T("Total", MP.money(t), !0)),
                  (o +=
                    '<div class="tnote">Physical items currently ship within Canada only.</div>'));
            else
              ((o += T("Shipping", "—")),
                (o += s),
                (o += T("Total", MP.money(t + c), !0)),
                (o += '<div class="tnote">Digital items — nothing to ship.</div>'));
          } else
            ((o += T("Shipping", "At checkout") + T("Taxes", "At checkout")),
              (o += T("Total", MP.money(t), !0)),
              (o += '<div class="tnote">Shipping &amp; taxes calculated at checkout.</div>'));
        else
          ((o += T("Shipping", "…") + T("Taxes", "…")),
            (o += T("Total", MP.money(t), !0)),
            (o += '<div class="tnote">Estimating shipping &amp; taxes…</div>'));
        ((e.innerHTML = o),
          (function () {
            if (!E) {
              E = !0;
              try {
                var t = new AbortController(),
                  e = setTimeout(function () {
                    t.abort();
                  }, 6e3);
                fetch("https://ipapi.co/json/", { signal: t.signal })
                  .then(function (t) {
                    return t.ok ? t.json() : null;
                  })
                  .then(function (t) {
                    (clearTimeout(e),
                      t &&
                        t.country_code &&
                        (C = { code: t.country_code, name: t.country_name || t.country_code }),
                      n());
                  })
                  .catch(function () {
                    (clearTimeout(e), n());
                  });
              } catch (t) {
                n();
              }
            }
            function n() {
              ((x = !0), z(L));
            }
          })());
      } else e.innerHTML = "";
  }
  function B() {
    var t = document.getElementById("cart-lines"),
      e = document.getElementById("cart-total");
    if (t) {
      var n = MP.readCart();
      if (!n.length) return ((t.innerHTML = '<p class="empty">Bag is empty.</p>'), void z(0));
      var a = 0;
      ((t.innerHTML = n
        .map(function (t) {
          var e = MP.PRODUCTS[t.id],
            n =
              e && e.priceBySize && t.size && null != e.priceBySize[t.size]
                ? e.priceBySize[t.size]
                : t.price,
            o = parseInt(t.qty, 10) || 0;
          a += n * o;
          var i = t.size && "one" !== t.size ? '<div class="meta">' + l(t.size) + "</div>" : "";
          return (
            '<div class="line">' +
            p(e || t, !0) +
            '<div class="line-mid"><strong>' +
            l(t.name) +
            "</strong>" +
            i +
            '<div class="qty"><button type="button" data-dec="' +
            l(t.key) +
            '" aria-label="Decrease">−</button><span>' +
            o +
            '</span><button type="button" data-inc="' +
            l(t.key) +
            '" aria-label="Increase">+</button></div></div><div><div>' +
            MP.money(n * o) +
            '</div><button type="button" class="del" data-del="' +
            l(t.key) +
            '">Remove</button></div></div>'
          );
        })
        .join("")),
        e && z(a),
        t.querySelectorAll("[data-inc]").forEach(function (t) {
          t.onclick = function () {
            var e = MP.readCart().find(function (e) {
              return e.key === t.dataset.inc;
            });
            (e && MP.setQty(e.key, e.qty + 1), q(), B());
          };
        }),
        t.querySelectorAll("[data-dec]").forEach(function (t) {
          t.onclick = function () {
            var e = MP.readCart().find(function (e) {
              return e.key === t.dataset.dec;
            });
            (e && MP.setQty(e.key, e.qty - 1), q(), B());
          };
        }),
        t.querySelectorAll("[data-del]").forEach(function (t) {
          t.onclick = function () {
            (MP.removeItem(t.dataset.del), q(), B());
          };
        }));
      var o = document.getElementById("checkout-btn"),
        i = document.getElementById("checkout-row");
      if (o) {
        var r = !!n.length;
        ((o.style.display = r ? "" : "none"),
          i && (i.style.display = r ? "" : "none"),
          (o.onclick = S));
      }
    }
  }
  function q() {
    var t = MP.cartCount(),
      e = document.getElementById("cart-btn"),
      n = document.getElementById("cart-badge");
    e &&
      n &&
      (e.classList.toggle("hidden", 0 === t),
      n.classList.toggle("hidden", 0 === t),
      (n.textContent = t > 99 ? "99+" : String(t)),
      window.MPNav && (MPNav.refreshSeg(), MPNav.refreshPostBtn()));
  }
  if (window.matchMedia) {
    var I = matchMedia("(prefers-color-scheme: dark)"),
      j = function () {
        ((b = ""), k(), B());
        var t = document.getElementById("product");
        t && t.classList.contains("on") && window.MPNav && MPNav.reopen && MPNav.reopen();
      };
    I.addEventListener ? I.addEventListener("change", j) : I.addListener && I.addListener(j);
  }
  return { renderShop: k, openProduct: w, renderCartPanel: B, updateCartBadge: q };
})();
