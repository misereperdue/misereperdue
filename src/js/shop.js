function nativeShare(t, e, n) {
  navigator.share
    ? navigator.share({ title: t, text: e, url: n }).catch(function () {})
    : navigator.clipboard && navigator.clipboard.writeText(n).catch(function () {});
}
function shareProduct(t) {
  // Canonical public product page (/p/<handle>), not the in-app hash route.
  var e = t.handle
    ? "https://misereperdue.com/p/" + encodeURIComponent(t.handle)
    : "https://misereperdue.com/shop";
  nativeShare(t.name, t.name + " by MISERY", e);
}
var MPShop = (function () {
  "use strict";
  var __mpShopFromList = !1;
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
  // Stars (per dc): the Shopify "Stars" product (handle stars, variant SKUs
  // STARS-<n>), or an older "<n> Stars" product. Credited to the signed-in
  // account by the Worker's orders/paid webhook via a checkout link.
  function starsPack(t) {
    if (!t) return !1;
    var nm = String(t.name || "").trim();
    return "stars" === t.handle || /^stars$/i.test(nm) || /^\d+\s+stars?$/i.test(nm) ||
      (t.variantList || []).some(function (v) { return /^STARS-\d+$/i.test(v.sku || ""); });
  }
  function cad(v) {
    return "CA$" + (Number(v) || 0).toFixed(2).replace(/\.00$/, "");
  }
  function mpTok() {
    try { return localStorage.getItem("chat_token"); } catch (e) { return null; }
  }
  /* Cart attributes that tie a paid order to the signed-in account: a single-use
   * link from the Worker. Falls back to the username while the Worker without
   * /api/checkout/link is live. Resolves null when signed out. */
  function linkAttrs() {
    var tok = mpTok();
    if (!tok) return Promise.resolve(null);
    var H = { Authorization: "Bearer " + tok };
    return fetch("https://api.misereperdue.com/api/checkout/link", { method: "POST", headers: H })
      .then(function (r) {
        if (401 === r.status) return null;
        if (r.ok) return r.json().then(function (j) { return j && j.link ? [{ key: "link", value: j.link }] : null; });
        if (404 !== r.status) throw new Error("link");
        return fetch("https://api.misereperdue.com/api/me", { headers: H })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { var u = j && j.user && j.user.username; return u ? [{ key: "account", value: u }] : null; });
      });
  }
  function goCheckout(url) {
    var h = new URL(url).hostname;
    if ("shop.misereperdue.com" !== h && !h.endsWith(".myshopify.com") && "checkout.shopify.com" !== h) throw new Error("bad checkout host");
    window.location.href = url;
  }
  function a(t) {
    return (
      !!t &&
      ("misery-v_v-sleeping-mask" === t.handle || "gid://shopify/Product/8161016414310" === t.id)
    );
  }
  var o = ["img/mask-front-light.jpg?v=4", "img/mask-back-light.jpg?v=4"],
    i = "img/vip-card-light.jpg?v=4";
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
      '<div role="button" tabindex="0" class="product-card' +
      (n(t) ? " is-vip" : a(t) ? " is-mask" : "") +
      '" data-product="' +
      l(t.id) +
      '"><div class="tile-wrap' +
      (n(t) ? " is-vip" : a(t) ? " is-mask" : "") +
      '">' +
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

  /* Drop countdown (per dc): one small etched line under the Get the App row (or the Globe tile when that row is hidden)
   * counting to 2027-09-11 00:00 Toronto time: days, hours, minutes and
   * seconds, each in its own small debossed box. Each
   * digit that changes rolls in from above (~300ms); unchanged digits stay
   * still. One setInterval; it stops itself when the line leaves the DOM
   * (grid re-rendered) and removes the line once the time has passed. CSS
   * swaps instantly under prefers-reduced-motion. */
  var CD_END = Date.parse("2027-09-11T00:00:00-04:00");
  var cdTimer = null;
  function cdHTML() {
    if (Date.now() >= CD_END) return "";
    return (
      '<p class="mp-cd" role="timer" aria-label="Countdown to September 11, 2027"><span class="mp-cd-in" aria-hidden="true">' +
      ["d", "h", "m", "s"]
        .map(function (u) {
          return '<span class="mp-cd-box"><span class="mp-cd-n" data-u="' + u + '"></span></span>';
        })
        .join("") +
      "</span></p>"
    );
  }
  /* Checkout gate (per dc): until the drop (CD_END) the bag's Checkout
   * button is disabled and reads "In N days", N using the same day math as
   * the countdown ticker (floor of whole days left). On the final day (N = 0,
   * still before CD_END) it reads "At midnight". From CD_END on it is enabled
   * and reads "Checkout". Refreshed when the bag renders, on tab return, and
   * by one setTimeout armed for the next day rollover (no per-second timer). */
  var coTimer = null, cartCatalogLoading = null;
  function vipOnlyCart() {
    var cart = MP.readCart();
    return cart.length > 0 && cart.every(function (line) {
      var product = MP.PRODUCTS[line.id];
      return product && (n(product) || starsPack(product)) && Number(line.qty) > 0;
    });
  }
  function checkoutLocked() {
    return Date.now() < CD_END && !vipOnlyCart();
  }
  function checkoutGate() {
    if (coTimer) (clearTimeout(coTimer), (coTimer = null));
    var b = document.getElementById("checkout-btn");
    if (!b) return;
    var ms = CD_END - Date.now();
    if (!checkoutLocked()) {
      if (b.classList.contains("is-soon")) {
        b.classList.remove("is-soon");
        b.disabled = !1;
        b.removeAttribute("aria-disabled");
        b.textContent = "Checkout";
      }
      return;
    }
    var d = Math.floor(ms / 864e5);
    b.classList.add("is-soon");
    b.disabled = !0;
    b.setAttribute("aria-disabled", "true");
    b.textContent = d >= 1 ? "In " + d + (1 === d ? " day" : " days") : "At midnight";
    var next = ms - d * 864e5 + 50;
    coTimer = setTimeout(checkoutGate, Math.min(next, 864e5));
  }
  document.addEventListener("visibilitychange", function () {
    document.hidden || checkoutGate();
  });
  function mountCountdown(el) {
    if (cdTimer) (clearInterval(cdTimer), (cdTimer = null));
    if (!el) return;
    var groups = {};
    el.querySelectorAll("[data-u]").forEach(function (b) {
      groups[b.dataset.u] = { el: b, val: "" };
    });
    function pad(n) {
      return n < 10 ? "0" + n : "" + n;
    }
    function cell(ch) {
      return '<span class="mp-cd-c"><b>' + ch + "</b></span>";
    }
    function set(u, v, roll) {
      var g = groups[u];
      if (g.val === v) return;
      if (g.val.length !== v.length) {
        g.el.innerHTML = v.split("").map(cell).join("");
        g.val = v;
        return;
      }
      var cs = g.el.children;
      for (var i = 0; i < v.length; i++) {
        if (v[i] === g.val[i]) continue;
        var c = cs[i];
        while (c.children.length > 1) c.removeChild(c.firstChild);
        var old = c.firstChild;
        if (!roll) {
          old.textContent = v[i];
          continue;
        }
        old.className = "out";
        var nb = document.createElement("b");
        nb.className = "in";
        nb.textContent = v[i];
        c.appendChild(nb);
      }
      g.val = v;
    }
    function tick(roll) {
      if (!el.isConnected) return (clearInterval(cdTimer), (cdTimer = null));
      var ms = CD_END - Date.now();
      if (ms <= 0) {
        clearInterval(cdTimer);
        cdTimer = null;
        el.remove();
        return;
      }
      var t = Math.floor(ms / 1e3);
      set("d", "" + Math.floor(t / 86400), roll);
      set("h", pad(Math.floor((t % 86400) / 3600)), roll);
      set("m", pad(Math.floor((t % 3600) / 60)), roll);
      set("s", pad(t % 60), roll);
    }
    tick(false);
    if (el.isConnected)
      cdTimer = setInterval(function () {
        tick(true);
      }, 1e3);
  }

  /* Misery Globe tile: a wireframe globe (meridians + parallels) drawn on a
   * small canvas, rotating about a tilted axis. Front lines are crisp, back
   * lines faint, so it reads as a sphere. Colour comes from the canvas's CSS
   * `color` (navy on the light photo tile, ice blue on the dark one), so it
   * follows the theme. One frame only under prefers-reduced-motion; pauses
   * when off screen or the tab is hidden; stops itself when the grid is
   * re-rendered (canvas detached). No dependencies. */
  /* Live pins: soft glowing dots on the Globe tile for roughly where members
   * are, by country only. GET /api/globe/pins returns aggregated counts
   * {members:{CC:n}, online:{CC:n}} (no names, no per-user data); each
   * country is drawn at its centroid (static table below, ISO 3166-1
   * alpha-2 -> lat,lon). Size/brightness scale with the member count; online
   * countries get a slow outward ping. Fetched once per 5 min; any failure
   * (404 before the Worker ships, offline, bad JSON) just means no pins. */
  var PIN_CC = "AD42.5,1.6;AE23.4,53.8;AF33.9,67.7;AG17.1,-61.8;AI18.2,-63.1;AL41.2,20.2;AM40.1,45;AN12.2,-69.1;AO-11.2,17.9;AQ-75.3,-0.1;AR-38.4,-63.6;AS-14.3,-170.1;AT47.5,14.6;AU-25.3,133.8;AW12.5,-70;AZ40.1,47.6;BA43.9,17.7;BB13.2,-59.5;BD23.7,90.4;BE50.5,4.5;BF12.2,-1.6;BG42.7,25.5;BH25.9,50.6;BI-3.4,29.9;BJ9.3,2.3;BM32.3,-64.8;BN4.5,114.7;BO-16.3,-63.6;BR-14.2,-51.9;BS25,-77.4;BT27.5,90.4;BV-54.4,3.4;BW-22.3,24.7;BY53.7,28;BZ17.2,-88.5;CA56.1,-106.3;CC-12.2,96.9;CD-4,21.8;CF6.6,20.9;CG-0.2,15.8;CH46.8,8.2;CI7.5,-5.5;CK-21.2,-159.8;CL-35.7,-71.5;CM7.4,12.4;CN35.9,104.2;CO4.6,-74.3;CR9.7,-83.8;CU21.5,-77.8;CV16,-24;CX-10.4,105.7;CY35.1,33.4;CZ49.8,15.5;DE51.2,10.5;DJ11.8,42.6;DK56.3,9.5;DM15.4,-61.4;DO18.7,-70.2;DZ28,1.7;EC-1.8,-78.2;EE58.6,25;EG26.8,30.8;EH24.2,-12.9;ER15.2,39.8;ES40.5,-3.7;ET9.1,40.5;FI61.9,25.7;FJ-16.6,179.4;FK-51.8,-59.5;FM7.4,150.6;FO61.9,-6.9;FR46.2,2.2;GA-0.8,11.6;GB55.4,-3.4;GD12.3,-61.6;GE42.3,43.4;GF3.9,-53.1;GG49.5,-2.6;GH7.9,-1;GI36.1,-5.3;GL71.7,-42.6;GM13.4,-15.3;GN9.9,-9.7;GP17,-62.1;GQ1.7,10.3;GR39.1,21.8;GS-54.4,-36.6;GT15.8,-90.2;GU13.4,144.8;GW11.8,-15.2;GY4.9,-58.9;GZ31.4,34.3;HK22.4,114.1;HM-53.1,73.5;HN15.2,-86.2;HR45.1,15.2;HT19,-72.3;HU47.2,19.5;ID-0.8,113.9;IE53.4,-8.2;IL31,34.9;IM54.2,-4.5;IN20.6,79;IO-6.3,71.9;IQ33.2,43.7;IR32.4,53.7;IS65,-19;IT41.9,12.6;JE49.2,-2.1;JM18.1,-77.3;JO30.6,36.2;JP36.2,138.3;KE-0,37.9;KG41.2,74.8;KH12.6,105;KI-3.4,-168.7;KM-11.9,43.9;KN17.4,-62.8;KP40.3,127.5;KR35.9,127.8;KW29.3,47.5;KY19.5,-80.6;KZ48,66.9;LA19.9,102.5;LB33.9,35.9;LC13.9,-61;LI47.2,9.6;LK7.9,80.8;LR6.4,-9.4;LS-29.6,28.2;LT55.2,23.9;LU49.8,6.1;LV56.9,24.6;LY26.3,17.2;MA31.8,-7.1;MC43.8,7.4;MD47.4,28.4;ME42.7,19.4;MG-18.8,46.9;MH7.1,171.2;MK41.6,21.7;ML17.6,-4;MM21.9,96;MN46.9,103.8;MO22.2,113.5;MP17.3,145.4;MQ14.6,-61;MR21,-10.9;MS16.7,-62.2;MT35.9,14.4;MU-20.3,57.6;MV3.2,73.2;MW-13.3,34.3;MX23.6,-102.6;MY4.2,102;MZ-18.7,35.5;NA-23,18.5;NC-20.9,165.6;NE17.6,8.1;NF-29,168;NG9.1,8.7;NI12.9,-85.2;NL52.1,5.3;NO60.5,8.5;NP28.4,84.1;NR-0.5,166.9;NU-19.1,-169.9;NZ-40.9,174.9;OM21.5,55.9;PA8.5,-80.8;PE-9.2,-75;PF-17.7,-149.4;PG-6.3,144;PH12.9,121.8;PK30.4,69.3;PL51.9,19.1;PM46.9,-56.3;PN-24.7,-127.4;PR18.2,-66.6;PS32,35.2;PT39.4,-8.2;PW7.5,134.6;PY-23.4,-58.4;QA25.4,51.2;RE-21.1,55.5;RO45.9,25;RS44,21;RU61.5,105.3;RW-1.9,29.9;SA23.9,45.1;SB-9.6,160.2;SC-4.7,55.5;SD12.9,30.2;SE60.1,18.6;SG1.4,103.8;SH-24.1,-10;SI46.2,15;SJ77.6,23.7;SK48.7,19.7;SL8.5,-11.8;SM43.9,12.5;SN14.5,-14.5;SO5.2,46.2;SR3.9,-56;ST0.2,6.6;SV13.8,-88.9;SY34.8,39;SZ-26.5,31.5;TC21.7,-71.8;TD15.5,18.7;TF-49.3,69.3;TG8.6,0.8;TH15.9,101;TJ38.9,71.3;TK-9,-171.9;TL-8.9,125.7;TM39,59.6;TN33.9,9.5;TO-21.2,-175.2;TR39,35.2;TT10.7,-61.2;TV-7.1,177.6;TW23.7,121;TZ-6.4,34.9;UA48.4,31.2;UG1.4,32.3;US37.1,-95.7;UY-32.5,-55.8;UZ41.4,64.6;VA41.9,12.5;VC13,-61.3;VE6.4,-66.6;VG18.4,-64.6;VI18.3,-64.9;VN14.1,108.3;VU-15.4,167;WF-13.8,-177.2;WS-13.8,-172.1;XK42.6,20.9;YE15.6,48.5;YT-12.8,45.2;ZA-30.6,22.9;ZM-13.1,27.8;ZW-19,29.2";
  var pinCent = null,
    pins = { at: 0, list: [], max: 1, p: null };
  function pinTable() {
    if (pinCent) return pinCent;
    pinCent = {};
    PIN_CC.split(";").forEach(function (r) {
      var ll = r.slice(2).split(",");
      pinCent[r.slice(0, 2)] = [(+ll[0] * Math.PI) / 180, (+ll[1] * Math.PI) / 180];
    });
    return pinCent;
  }
  function loadPins(done) {
    if (Date.now() - pins.at < 3e5) return done && done();
    if (pins.p) return pins.p.then(done);
    pins.p = fetch("https://api.misereperdue.com/api/globe/pins", { credentials: "omit" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        var tb = pinTable(),
          list = [],
          max = 1,
          mem = (d && d.members) || {},
          onl = (d && d.online) || {};
        Object.keys(mem)
          .concat(Object.keys(onl))
          .forEach(function (cc) {
            var c = tb[cc];
            if (!c || list.some(function (p) { return p.cc === cc; })) return;
            var m = Math.max(+mem[cc] || 0, +onl[cc] || 0),
              o = +onl[cc] || 0;
            if (!(m > 0)) return;
            max = Math.max(max, m);
            // per-country phase so the pulses don't beat in sync
            var ph = ((cc.charCodeAt(0) * 31 + cc.charCodeAt(1)) % 97) / 97;
            list.push({ cc: cc, lat: c[0], lon: c[1], m: m, o: o, ph: ph });
          });
        pins.list = list.slice(0, 250);
        pins.max = max;
      })
      .catch(function () {
        pins.list = [];
      })
      .then(function () {
        pins.at = Date.now();
        pins.p = null;
      });
    return pins.p.then(done);
  }
  var pinSprite = null,
    pinSpriteKey = "";
  function pinGlow(colour, light) {
    var key = colour + light;
    if (pinSprite && pinSpriteKey === key) return pinSprite;
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var x = c.getContext("2d"),
      m = colour.match(/\d+(\.\d+)?/g) || [169, 215, 245],
      rgb = m[0] + "," + m[1] + "," + m[2],
      g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(" + rgb + "," + (light ? 0.55 : 0.9) + ")");
    g.addColorStop(0.35, "rgba(" + rgb + "," + (light ? 0.22 : 0.38) + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    pinSpriteKey = key;
    return (pinSprite = c);
  }

  var globeStop = null;
  function mountGlobe(cv, options) {
    options = options || {};
    if (!options.decorative && globeStop) (globeStop(), (globeStop = null));
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
      var R = options.compact ? Math.min(W,H)*.44 : Math.max(H * 0.95, W * 0.36),
        cx = options.compact ? W/2 : W - R * 0.62,
        cy = options.compact ? H/2 : H * 0.78;
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
      // live pins (front hemisphere only, fading out towards the rim)
      if (!options.decorative && pins.list.length) {
        var light = document.documentElement.getAttribute("data-theme") === "light",
          still = rm && rm.matches,
          spr = pinGlow(colour || "rgb(169,215,245)", light),
          lmax = Math.log(1 + pins.max);
        ctx.save();
        for (var q = 0; q < pins.list.length; q++) {
          var pn = pins.list[q];
          P(pn.lat, pn.lon, pt);
          if (pt[2] < 0.04) continue;
          var fade = Math.min(1, (pt[2] - 0.04) / 0.3),
            s0 = 1.6 + 2.2 * (Math.log(1 + pn.m) / lmax),
            beat = still ? 0.5 : 0.5 + 0.5 * Math.sin(now / 900 + pn.ph * 6.283),
            gr = s0 * (3.6 + 1.6 * beat);
          ctx.globalCompositeOperation = light ? "source-over" : "lighter";
          ctx.globalAlpha = fade * (0.55 + 0.35 * beat);
          ctx.drawImage(spr, pt[0] - gr, pt[1] - gr, gr * 2, gr * 2);
          if (pn.o && !still) {
            // online now: a thin ring easing outwards every ~2.4s
            var k = (now / 2400 + pn.ph) % 1;
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = fade * (1 - k) * 0.7;
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], s0 * (1.4 + 4.5 * k), 0, Math.PI * 2);
            ctx.strokeStyle = light ? rgba(0.9) : "rgba(235,246,255,0.9)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = fade * (pn.o ? 1 : 0.85);
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], s0 * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = light ? rgba(0.95) : "#eef8ff";
          ctx.fill();
        }
        ctx.restore();
      }
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
          if (!cv.isConnected) return stop();
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
    if (!options.decorative) globeStop = stop;
    kick();
    if (!options.decorative) loadPins(function () {
      // redraw once data lands (needed for the single reduced-motion frame)
      running && (cancelAnimationFrame(raf), (raf = 0), kick());
    });
  }
  function y(t) {
    var e = document.querySelector('[data-view="' + t + '"]');
    e && e.click();
  }
  /* Globe tile account state (per dc): signed out it pitches "Sign up";
     signed in it reads "You're already signed up ✓" and the pill becomes "Post",
     which opens the Globe new-thread composer. chat.js fires "mp-auth" (and keeps
     window.MPAuthUser) on every sign-in/out; before that we go by the stored token. */
  var GP_ARROW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="shake"><path d="M18.5 12L4.99997 12"/><path d="M13 18C13 18 19 13.5811 19 12C19 10.4188 13 6 13 6"/></svg>';
  var GP_CHECK =
    '<svg class="gp-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 14L8.5 17.5L19 6.5"/></svg>';
  function gpSignedIn() {
    if (window.MPAuthUser !== undefined) return !!window.MPAuthUser;
    try {
      return !!localStorage.getItem("chat_token");
    } catch (e) {
      return !1;
    }
  }
  function gpAuth() {
    var e = document.querySelector("#shop-grid .globe-promo");
    if (!e) return;
    var on = gpSignedIn();
    gpMe(e, on);
    if (e.getAttribute("data-auth") === (on ? "in" : "out")) return;
    e.setAttribute("data-auth", on ? "in" : "out");
    var l = e.querySelector(".gp-line"),
      a = e.querySelector(".gp-acct:not(.gp-sec)");
    e.querySelectorAll(".gp-sec").forEach(function (b) {
      b.hidden = !on;
    });
    l &&
      (l.innerHTML = on
        ? "You\u2019re already signed up" + GP_CHECK
        : "Sign up to get access to exclusive deals &amp; content");
    a && (a.innerHTML = (on ? "Post" : "Sign up") + GP_ARROW);
    e.setAttribute(
      "aria-label",
      on
        ? "Misery Globe. You\u2019re already signed up"
        : "Misery Globe. Sign up to get access to exclusive deals and content",
    );
  }
  // Signed in (per dc): the user's avatar + active badge sit bottom-right, level
  // with the pill row, built with chat.js's own avatar/badge renderers. Rebuilt
  // only when the user, avatar or badge changes (chat.js re-emits "mp-auth"
  // whenever it redraws its own profile avatar).
  function gpMe(e, on) {
    var m = e.querySelector(".gp-me"),
      u = on && window.MPAuthUser,
      C = window.MPChat;
    if (!m) return;
    if (!u || !C || !C.avatarNode) return ((m.hidden = !0), (m.innerHTML = ""), void (m._k = ""));
    var v = u.hasAvatarImg ? u.avatarV : void 0,
      b = (C.badgeFor && C.badgeFor(u)) || "",
      k = [u.username, v, window._myAvatarDataUrl ? window._myAvatarDataUrl.length : 0, b].join("|");
    m.hidden = !1;
    if (m._k === k) return;
    m._k = k;
    var w = C.avatarNode(u.username, u.avatar, null, v);
    b && w.insertAdjacentHTML("beforeend", b);
    m.innerHTML = "";
    m.appendChild(w);
  }
  // Signed in: the avatar (Profile) / Orders open the same sheets as the profile menu
  // (chat.js exposes them). Post goes to the Globe and presses its "New thread"
  // button once it has rendered, pressing again if the Globe's own first render
  // replaced it, until the composer is up (gives up after ~6 s).
  function gpAct(act) {
    if (!gpSignedIn()) return y("journal");
    /* Avatar (per dc): go to the Globe, then open your profile view there. */
    if ("profile" === act) {
      y("forum");
      var tries = 0;
      /* Start after the route's hashchange has fired: profiles close on navigation. */
      return void setTimeout(function open() {
        var bar = document.querySelector("#forum.on .chat-head");
        if (bar && bar.getClientRects().length && window.MPOpenMyProfileView) return void window.MPOpenMyProfileView();
        ++tries < 40 ? setTimeout(open, 100) : window.MPOpenProfile && window.MPOpenProfile();
      }, 160);
    }
    if ("orders" === act) return window.MPOpenOrders && window.MPOpenOrders();
    y("forum");
    var n = 0;
    (function tap() {
      if (document.getElementById("forum-new-editor")) return;
      var b = document.querySelector("#forum.on #forum-new-top");
      b && b.offsetParent && b.click();
      ++n < 40 && setTimeout(tap, 150);
    })();
  }
  document.addEventListener("mp-auth", gpAuth);
  window.addEventListener("storage", function (e) {
    "chat_token" === e.key && window.MPAuthUser === undefined && gpAuth();
  });
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
            '<div class="product-card globe-promo" role="button" tabindex="0" aria-label="Misery Globe. Sign up to get access to exclusive deals &amp; content"><div class="tile-wrap gp-photo"><canvas class="gp-canvas" aria-hidden="true"></canvas><div class="gp-text"><strong class="gp-title">Misery Globe</strong><span class="gp-line">Sign up to get access to exclusive deals &amp; content</span><div class="gp-acts"><span class="gp-acct" role="button" tabindex="0">Sign up<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-hi="shake"><path d="M18.5 12L4.99997 12"/><path d="M13 18C13 18 19 13.5811 19 12C19 10.4188 13 6 13 6"/></svg></span><span class="gp-acct gp-sec" data-act="orders" role="button" tabindex="0" hidden>Orders</span></div></div><span class="gp-me" data-act="profile" role="button" tabindex="0" aria-label="Your profile" hidden></span></div></div>' +
            '<button type="button" class="a2hs" hidden><span class="a2hs-ico" aria-hidden="true"><img src="/img/app-icon-tint-180.png?v=22" alt="" width="26" height="26" decoding="async"></span><span class="a2hs-t">Get the App</span></button>' +
            cdHTML() +
            e.map(g).join("") +
            (f
              ? '<p class="meta" style="margin-top:10px;font-size:12px">Note: ' + l(f) + "</p>"
              : "")),
          t.querySelectorAll("[data-product]").forEach(function (t) {
            ((t.onclick = function () {
              __mpShopFromList = !0;
              w(t.dataset.product);
            }),
              (t.onkeydown = function (e) {
                ("Enter" !== e.key && " " !== e.key) || (e.preventDefault(), (__mpShopFromList = !0), w(t.dataset.product));
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
              e.querySelectorAll(".gp-acct, .gp-me").forEach(function (n) {
                var go = function () {
                  gpAct(n.getAttribute("data-act"));
                };
                ((n.onclick = function (t) {
                  (t.stopPropagation(), go());
                }),
                  (n.onkeydown = function (t) {
                    ("Enter" !== t.key && " " !== t.key) ||
                      (t.preventDefault(), t.stopPropagation(), go());
                  }));
              });
              gpAuth();
              mountGlobe(e.querySelector(".gp-canvas"));
            }
            mountA2HS(t.querySelector(".a2hs"));
            mountCountdown(t.querySelector(".mp-cd"));
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
      : '<button class="btn accent morph-btn" id="add-bag" type="button"><span class="lbl">Add to bag</span><svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 14L8.5 17.5L19 6.5"/></svg></button>';
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
      var sk = starsPack(i) && i.sizes && i.sizes.length ? starsSizes(i) : null;
      (n(i) &&
        i.sizes &&
        i.sizes.length > 1 &&
        (f = i.sizes.slice().sort(function (t, e) {
          return parseFloat(t) - parseFloat(e);
        })),
        (r = n(i)
          ? vipTerms(i)
          : sk
          ? '<div class="stars-packs" role="group" aria-label="Star packs">' +
            sk.map(function (t, e) {
              return '<button type="button" data-size="' + l(t) + '"' + (0 === e ? ' class="on"' : "") + '><span class="sp-n">' +
                (window.MPStar ? MPStar() : "\u2605") + " " + l(t) + '</span><span class="sp-p">' + cad(i.priceBySize[t]) + "</span></button>";
            }).join("") +
            "</div>" +
            (mpTok() ? "" : '<p class="stars-note">Sign in first so your Stars land on your account.</p>')
          : f
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
          '<div class="vip-3d-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" data-hi="rotate"><circle cx="12" cy="12" r="10"/><path d="M2 12C7.18491 16.8269 16.4642 16.3877 22 12.3556"/><path d="M11.5368 2C6.98945 6.5 6.48414 17 11.9941 22"/></svg><span>Drag to spin</span></div></div>',
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
                      ? '<button type="button" class="car-btn prev" aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"/></svg></button><button type="button" class="car-btn next" aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18"/></svg></button>'
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
        '<div class="forum-head shop-product-head"><button type="button" class="forum-back forum-glass-pill" id="shop-back"><svg class="mp-gl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"/></svg>Back</button></div>' +
        '<article class="article-card">' +
        g +
        "<h1>" +
        l(i.name) +
        '</h1><div class="price">' +
        l(i.priceLabel || (null != i.price ? MP.money(i.price) : "")) +
        "</div>" +
        r +
        '<div id="bag-action"></div><button type="button" class="share-btn" aria-label="Share product"' + (navigator.share ? "" : " hidden") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none;" data-hi="float"><path d="M9.39584 4.5H8.35417C5.40789 4.5 3.93475 4.5 3.01946 5.37868C2.10417 6.25736 2.10417 7.67157 2.10417 10.5V14.5C2.10417 17.3284 2.10417 18.7426 3.01946 19.6213C3.93475 20.5 5.40789 20.5 8.35417 20.5H12.5608C15.5071 20.5 16.9802 20.5 17.8955 19.6213C18.4885 19.052 18.6973 18.2579 18.7708 17"/><path d="M16.1667 7V3.85355C16.1667 3.65829 16.3316 3.5 16.535 3.5C16.6326 3.5 16.7263 3.53725 16.7954 3.60355L21.5275 8.14645C21.7634 8.37282 21.8958 8.67986 21.8958 9C21.8958 9.32014 21.7634 9.62718 21.5275 9.85355L16.7954 14.3964C16.7263 14.4628 16.6326 14.5 16.535 14.5C16.3316 14.5 16.1667 14.3417 16.1667 14.1464V11H13.1157C8.875 11 7.3125 14.5 7.3125 14.5V12C7.3125 9.23858 9.64435 7 12.5208 7H16.1667Z"/></svg>Share</button>' +
        (((v = i.details)
          ? String(v)
              .split(/\n{2,}/)
              .filter(function (t) {
                return t.trim();
              })
              .map(function (t) {
                return '<p class="meta pdesc"><span class="stitch">' + l(t).replace(/\n/g, "<br>") + "</span></p>";
              })
              .join("")
          : "") +
          "</article>")),
        window.MPNav && MPNav.refreshTitle && MPNav.refreshTitle(),
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
      var y = sk ? sk[0] : i.sizes && i.sizes.length ? i.sizes[0] : "one";
      var pe = p.querySelector(".price");
      sk && pe && (pe.textContent = cad(i.priceBySize[y]));
      if (
        (p.querySelectorAll("[data-size]").forEach(function (t) {
          t.onclick = function () {
            ((y = t.dataset.size),
              p.querySelectorAll("[data-size]").forEach(function (t) {
                t.classList.remove("on");
              }),
              t.classList.add("on"),
              sk && pe && (pe.textContent = cad(i.priceBySize[y])),
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
      n(i) ? vipAction(p, i) : B();
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
        if (M && ((t = lazy3d("MPVip3D", "js/vip3d.js?v=8", M)), S)) {
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
        if (x && ((e = lazy3d("MPMask3D", "js/mask3d.js?v=4", x)), L)) {
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

      var backBtn = p.querySelector("#shop-back");
      if (backBtn) {
        backBtn.addEventListener("click", function (e) {
          e.preventDefault();
          var fromList = __mpShopFromList;
          __mpShopFromList = !1;
          var prevHash = "";
          try {
            /* history.back when the previous entry is shop */
            if (fromList && window.history.length > 1) {
              history.back();
              return;
            }
          } catch (err) {}
          if (window.MPNav && MPNav.show) MPNav.show("shop");
          else location.hash = "#shop";
        });
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
  function starsSizes(i) {
    return i.sizes.filter(function (s) { return null != (i.priceBySize || {})[s]; }).sort(function (a, b) {
      return parseFloat(String(a).replace(/,/g, "")) - parseFloat(String(b).replace(/,/g, ""));
    });
  }
  /* VIP (#133): a Seal subscription. First order is the variant price, then the
   * plan's recurring price each month until cancelled in the Seal portal. */
  function vipTerms(i) {
    var later = null != i.planRecurring ? i.planRecurring : 3;
    return '<div class="vip-terms"><p class="vip-terms-price"><b>' + cad(i.price) + "</b> today, then <b>" + cad(later) + "</b>/month</p><ul>" +
      "<li>Renews automatically every month until you cancel.</li>" +
      "<li>Cancel anytime in Manage VIP. You keep VIP until the end of the month you paid for.</li>" +
      "<li>Sign in required. VIP is added to your Mis\u00e8re account.</li></ul></div>";
  }
  function vipAction(p, i) {
    var box = p.querySelector("#bag-action");
    if (!box) return;
    var tok = mpTok();
    function btn(label) {
      box.innerHTML = '<button class="btn accent vip-buy" id="vip-buy" type="button">' + label + '</button><p class="vip-err" id="vip-err" role="alert"></p>';
      return box.querySelector("#vip-buy");
    }
    if (!tok) {
      btn("Sign in to become VIP").onclick = function () { y("journal"); };
      return;
    }
    box.innerHTML = '<button class="btn accent vip-buy" type="button" disabled><span class="btn-spin"></span></button>';
    var H = { Authorization: "Bearer " + tok };
    fetch("https://api.misereperdue.com/api/vip", { headers: H })
      .then(function (r) {
        if (r.ok) return r.json();
        if (401 === r.status) return { signedOut: !0 };
        return fetch("https://api.misereperdue.com/api/me", { headers: H })
          .then(function (r) { return r.ok ? r.json() : { signedOut: 401 === r.status }; })
          .then(function (j) { return j.user ? { vip: !!j.user.member, source: j.user.member ? "manual" : null } : j; });
      })
      .catch(function () { return {}; })
      .then(function (v) {
        if (!box.isConnected) return;
        if (v.signedOut) return void (btn("Sign in to become VIP").onclick = function () { y("journal"); });
        if (v.vip) {
          var when = v.paidThrough ? new Date(v.paidThrough).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" }) : "";
          box.innerHTML = '<div class="vip-status"><p class="vip-status-h">You\u2019re VIP</p><p class="vip-status-s">' +
            ("subscription" === v.source && when ? "Renews around " + l(when) : "VIP is on your account") + "</p>" +
            ("subscription" === v.source
              ? '<a class="btn vip-manage" href="' + l(v.manageUrl || "https://shop.misereperdue.com/a/subscriptions/login") + '" target="_blank" rel="noopener">Manage VIP</a>'
              : "") + "</div>";
          return;
        }
        var b = btn("Become VIP");
        b.onclick = function () { vipCheckout(i, b); };
      });
  }
  function vipCheckout(i, b) {
    var er = document.getElementById("vip-err"),
      vid = MPShopify.variantIdFor(i, null);
    if (!vid || !i.sellingPlanId) return void (er && (er.textContent = "VIP isn't available right now."));
    b.disabled = !0;
    b.innerHTML = '<span class="btn-spin"></span>';
    linkAttrs()
      .then(function (a) {
        if (!a) return void y("journal");
        a.push({ key: "membership", value: "yes" });
        return MPShopify.createCheckout([{ variantId: vid, qty: 1, sellingPlanId: i.sellingPlanId }], a).then(goCheckout);
      })
      .catch(function () {
        b.disabled = !1;
        b.textContent = "Become VIP";
        er && (er.textContent = "Couldn't start checkout. Check your connection and try again.");
      });
  }
  function S() {
    var t = document.getElementById("checkout-btn"),
      e = document.getElementById("checkout-err");
    if (checkoutLocked()) return void checkoutGate();
    (e && (e.textContent = ""),
      window.MPShopify && MPShopify.configured()
        ? (t && ((t.disabled = !0), (t.innerHTML = '<span class="btn-spin"></span>')),
          m()
            .then(function () {
              var t = [],
                e = !1,
                o = !1,
                sp = !1;
              if (
                (MP.readCart().forEach(function (i) {
                  var r = MP.PRODUCTS[i.id];
                  if (r && r.shopify) {
                    var c = MPShopify.variantIdFor(r, i.size),
                      s = parseInt(i.qty, 10) || 0;
                    c &&
                      s > 0 &&
                      (t.push({ variantId: c, qty: n(r) ? 1 : s, sellingPlanId: r.requiresSellingPlan || n(r) ? r.sellingPlanId || void 0 : void 0 }), n(r) && (e = sp = !0), a(r) && (o = !0), starsPack(r) && (o = sp = !0));
                  }
                }),
                !t.length)
              )
                throw new Error("empty");
              return e || o
                ? linkAttrs().then(function (a) {
                    if (sp && !a) throw new Error("stars-signin");
                    a = a || [];
                    e && a.push({ key: "membership", value: "yes" });
                    return MPShopify.createCheckout(t, a);
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
            .catch(function (n) {
              (t && ((t.disabled = !1), (t.textContent = "Checkout")),
                e &&
                  (e.textContent =
                    n && "stars-signin" === n.message
                      ? "Sign in first so your Stars and VIP land on your account."
                      : "Couldn't start checkout. Check your connection and try again."));
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
      // A direct visit to the bag may precede the first catalog load.
      if (n.length && n.some(function (line) { return !MP.PRODUCTS[line.id]; }) && !cartCatalogLoading) {
        cartCatalogLoading = m().then(checkoutGate).finally(function () { cartCatalogLoading = null; });
      }
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
          (o.onclick = S),
          checkoutGate());
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
  /* Product pages: content scrolls UNDER the sky like Chat/Globe (per dc). Back rests just
     under the nav, above the sky, and fades out as it scrolls up into the header band. */
  (function () {
    var fr = 0;
    function fadeBack() {
      fr = 0;
      var head = document.querySelector("#product.on .shop-product-head");
      if (!head) return;
      var rest = parseFloat(getComputedStyle(document.body).paddingTop) || 93,
        o = Math.max(0, Math.min(1, (head.getBoundingClientRect().top - (rest - 30)) / 30));
      head.style.opacity = o >= 1 ? "" : o.toFixed(3);
      head.style.pointerEvents = o < 0.5 ? "none" : "";
    }
    addEventListener("scroll", function () { fr || (fr = requestAnimationFrame(fadeBack)); }, { passive: true });
  })();
  return { mountDecorativeGlobe:function(cv,compact){return mountGlobe(cv,{decorative:true,compact:!!compact});}, renderShop: k, openProduct: w, renderCartPanel: B, updateCartBadge: q };
})();
