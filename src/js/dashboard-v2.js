!(function () {
  var e = window.MPChat || {};
  function mpName(u) { return (window.mpName || function (x) { return String(x == null ? "" : x).replace(/^@+/, "").toLowerCase(); })(u); }
  function mpAt(u) { var n = mpName(u); return n ? "@" + n : ""; }

  function t(t, n) {
    return e.api(t, n);
  }
  function n() {
    return e.closeMsgPopup();
  }
  function a(t, n, a, r) {
    return e.avatarNode(t, n, a, r);
  }
  function r() {
    return e.isPaused();
  }
  function i() {
    return e.getMe();
  }
  function o(e) {
    e = Math.round(Number(e) || 0);
    for (var t = String(Math.abs(e)), n = ""; t.length > 3;)
      ((n = "," + t.slice(-3) + n), (t = t.slice(0, -3)));
    return (e < 0 ? "-" : "") + t + n;
  }
  function s(e, t) {
    var n = o(t);
    ((e.innerHTML = ""),
      (e.className = "easyui-anim-num"),
      e.setAttribute("aria-label", n),
      n.split("").forEach(function (t) {
        if (t >= "0" && t <= "9") {
          var n = document.createElement("span");
          n.className = "anim-digit-col";
          var a = document.createElement("span");
          a.className = "anim-digit-strip";
          for (var r = 0; r <= 9; r++) {
            var i = document.createElement("span");
            ((i.className = "anim-digit"), (i.textContent = String(r)), a.appendChild(i));
          }
          (n.appendChild(a), e.appendChild(n));
        } else {
          var o = document.createElement("span");
          ((o.className = "anim-digit-static"), (o.textContent = t), e.appendChild(o));
        }
      }),
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          !(function (e, t) {
            var n,
              a,
              r = o(t),
              i = e.querySelectorAll(".anim-digit-col"),
              s = 0;
            for (n = 0; n < r.length; n++)
              if ((a = r.charAt(n)) >= "0" && a <= "9") {
                var d = i[s++] && i[s - 1].querySelector(".anim-digit-strip");
                d && (d.style.transform = "translateY(-" + 10 * parseInt(a, 10) + "%)");
              }
          })(e, t);
        });
      }));
  }
  function buildDashboard(o, quiet) {
    n();
    var d = document.createElement("div");
    ((d.className = "msg-popup"), (d.id = "msg-popup"), (d.style.animation = "none"));
    var l = document.createElement("div");
    (l.className = "msg-popup-inner dashboard-sheet");
    ["pointerdown", "focusin", "keydown"].forEach(function (event) {
      l.addEventListener(event, function () { l.dataset.interacted = "1"; }, { once: true });
    });
    var __dw = document.createElement("div");
    __dw.className = "dashboard-sheet-wrap";
    var __dp = document.createElement("div");
    __dp.className = "dashboard-sheet-blur";
    __dp.setAttribute("aria-hidden", "true");
    __dw.appendChild(__dp);
    __dw.appendChild(l);
    var c = document.createElement("div");
    c.style.cssText =
      "display:flex;flex-direction:column;align-items:stretch;gap:12px;margin-bottom:16px;";
    var p = document.createElement("div");
    p.style.cssText = "display:flex;align-items:center;justify-content:space-between;";
    var u = document.createElement("div");
    u.style.cssText = "display:flex;align-items:center;gap:10px;";
    var m = document.createElement("h3");
    ((m.style.cssText = "margin:0;font-size:20px;font-weight:700;"),
      (m.textContent = "Dashboard"),
      u.appendChild(m));
    var v = document.createElement("span");
    ((v.className = "easyui-live-badge dashboard-online-badge"),
      (v.innerHTML = '<span class="live-dot"></span><span class="live-num">…</span>'),
      (v.hidden = !0),
      u.appendChild(v),
      (function e(t) {
        var n = "number" == typeof window.MPOnlineCount ? window.MPOnlineCount : null,
          a = v.querySelector(".live-num");
        null !== n && a
          ? ((a.textContent = n), (v.hidden = !(n > 0)))
          : t < 10 &&
            a &&
            setTimeout(function () {
              e(t + 1);
            }, 500);
      })(0),
      p.appendChild(u));
    var x = document.createElement("button");
    ((x.type = "button"),
      x.setAttribute("aria-label", "Close dashboard"),
      (x.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" data-hi="fade"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>'),
      (x.style.cssText =
        "width:32px;height:32px;flex:none;border-radius:999px;border:1px solid var(--stroke);background:var(--fill);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"),
      x.addEventListener("click", function () {
        n();
      }),
      p.appendChild(x),
      c.appendChild(p));
    var f = document.createElement("div");
    f.style.cssText =
      "position:relative;display:flex;gap:4px;background:rgba(120,120,128,0.12);backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);border-radius:999px;padding:4px;border:var(--glass-hairline);";
    var h = document.createElement("span");
    ((h.style.cssText =
      "position:absolute;top:3px;bottom:3px;border-radius:999px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),0 2px 8px rgba(0,0,0,0.25);pointer-events:none;left:3px;width:calc(33.333% - 3px);"),
      f.appendChild(h),
      setTimeout(function () {
        h.style.transition = "transform 0.35s cubic-bezier(0.32,0.72,0,1)";
      }, 100));
    var g = document.createElement("button"),
      b = document.createElement("button"),
      y = document.createElement("button");
    ([
      [
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="18" height="18" data-hi="rotate"><path d="M12 21.5C17.2467 21.5 21.5 17.2467 21.5 12C21.5 6.75329 17.2467 2.5 12 2.5C6.75329 2.5 2.5 6.75329 2.5 12C2.5 13.3377 2.66372 14.5604 3.1189 15.6954C3.81756 17.4374 3.68195 18.9241 2.5 20.5C3.86146 21.1644 5.86811 21.1419 7 20.0725C8.45323 20.9748 10.1636 21.5 12 21.5Z" stroke-linecap="square"/><path d="M12.2 12.0002H12M7.69961 11.9999H7.49961M16.6996 11.9999H16.4996M12.4 12.0002C12.4 12.2212 12.2209 12.4002 12 12.4002C11.7791 12.4002 11.6 12.2212 11.6 12.0002C11.6 11.7793 11.7791 11.6002 12 11.6002C12.2209 11.6002 12.4 11.7793 12.4 12.0002ZM7.89961 11.9999C7.89961 12.2208 7.72052 12.3999 7.49961 12.3999C7.2787 12.3999 7.09961 12.2208 7.09961 11.9999C7.09961 11.7789 7.2787 11.5999 7.49961 11.5999C7.72052 11.5999 7.89961 11.7789 7.89961 11.9999ZM16.8996 11.9999C16.8996 12.2208 16.7205 12.3999 16.4996 12.3999C16.2787 12.3999 16.0996 12.2208 16.0996 11.9999C16.0996 11.7789 16.2787 11.5999 16.4996 11.5999C16.7205 11.5999 16.8996 11.7789 16.8996 11.9999Z"/></svg>',
        g,
        "Chat",
      ],
      [
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="18" height="18" data-hi="scale"><circle cx="12" cy="12" r="10"/><path d="M8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2C12 2 8 6 8 12Z"/><path d="M21 15H3"/><path d="M21 9H3"/></svg>',
        b,
        "Forum",
      ],
      [
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block" width="18" height="18" data-hi="rotate"><path d="M3.95631 10.5829L3.03254 9.07084C2.74505 8.60024 2.7389 8.00978 3.01652 7.5333L3.63533 6.47124C3.90953 6.00064 4.41721 5.71571 4.96162 5.7269L6.69131 5.76245C6.92616 5.76728 7.15379 5.68727 7.34333 5.54846C7.79531 5.21745 8.28334 4.93276 8.80042 4.70139C9.01191 4.60675 9.19222 4.45165 9.30469 4.24903L10.1203 2.77965C10.3847 2.30328 10.8865 2.00781 11.4312 2.00781H12.6937C13.2384 2.00781 13.7403 2.30329 14.0047 2.77966L14.8202 4.24902C14.9327 4.45165 15.113 4.60675 15.3245 4.70139C15.8416 4.93274 16.3296 5.2174 16.7815 5.54838C16.9711 5.68718 17.1987 5.76718 17.4336 5.76235L19.1634 5.72676C19.7078 5.71557 20.2155 6.00049 20.4897 6.47111L21.1085 7.53314C21.3862 8.00963 21.38 8.60009 21.0925 9.07068L20.1687 10.5828C20.0481 10.7803 20.002 11.0134 20.0235 11.2439C20.0707 11.7486 20.0707 12.267 20.0235 12.7717C20.002 13.0022 20.0481 13.2353 20.1687 13.4329L21.0924 14.9448C21.3799 15.4154 21.3861 16.0058 21.1084 16.4823L20.4896 17.5444C20.2154 18.015 19.7077 18.2999 19.1633 18.2887L17.4338 18.2531C17.1989 18.2483 16.9713 18.3283 16.7817 18.4671C16.3297 18.7982 15.8416 19.0829 15.3245 19.3142C15.113 19.4089 14.9327 19.564 14.8202 19.7666L14.0047 21.236C13.7403 21.7123 13.2384 22.0078 12.6937 22.0078H11.4312C10.8866 22.0078 10.3847 21.7123 10.1203 21.236L9.30468 19.7665C9.19222 19.5639 9.01191 19.4088 8.80042 19.3142C8.28329 19.0828 7.79519 18.798 7.34316 18.467C7.15362 18.3282 6.92597 18.2482 6.69111 18.253L4.96175 18.2886C4.41733 18.2998 3.90963 18.0148 3.63543 17.5442L3.01663 16.4822C2.739 16.0057 2.74515 15.4152 3.03264 14.9446L3.95631 13.4327C4.07699 13.2351 4.12309 13.002 4.10154 12.7715C4.05437 12.267 4.05438 11.7486 4.10154 11.244C4.12308 11.0135 4.07699 10.7805 3.95631 10.5829Z"/><circle cx="12.0625" cy="12.0078" r="3.5"/></svg>',
        y,
        "Manage",
      ],
    ].forEach(function (e) {
      var t = e[1];
      ((t.type = "button"),
        (t.innerHTML = e[0]),
        t.setAttribute("aria-label", e[2]),
        (t.style.cssText =
          "position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;padding:8px 16px;border:none;border-radius:999px;cursor:pointer;background:transparent;color:var(--muted);transition:color .25s ease;"));
    }),
      (g.style.color = "var(--ink)"),
      f.appendChild(g),
      f.appendChild(b),
      f.appendChild(y),
      c.appendChild(f),
      l.appendChild(c));
    var C = document.createElement("div");
    l.appendChild(C);
    var E = document.createElement("div");
    ((E.style.display = "none"), (E.style.minHeight = "300px"), l.appendChild(E));
    var w = document.createElement("div");
    ((w.style.display = "none"), (w.style.minHeight = "300px"), l.appendChild(w));
    var k = document.createElement("div"),
      T = document.createElement("div"),
      A = document.createElement("div");
    function L(e) {
      var t = "chat" === e,
        n = "forum" === e,
        a = "manage" === e;
      ((C.style.display = t ? "" : "none"),
        (E.style.display = n ? "" : "none"),
        (w.style.display = a ? "" : "none"),
        (h.style.transform = t ? "translateX(0)" : n ? "translateX(100%)" : "translateX(200%)"),
        (g.style.color = t ? "var(--ink)" : "var(--muted)"),
        (b.style.color = n ? "var(--ink)" : "var(--muted)"),
        (y.style.color = a ? "var(--ink)" : "var(--muted)"),
        n && !A.dataset.loaded && se(),
        a && !T.dataset.loaded && le());
    }
    (C.appendChild(k),
      E.appendChild(A),
      w.appendChild(T),
      g.addEventListener("click", function () {
        L("chat");
      }),
      b.addEventListener("click", function () {
        L("forum");
      }),
      y.addEventListener("click", function () {
        L("manage");
      }),
      setTimeout(function () {
        (A.dataset.loaded || se(), T.dataset.loaded || le());
      }, 500));

    /* ---- Dashboard v2 (needs the globe-pins-stats Worker; every piece is
       skipped when the server doesn't send its field, so the old Worker
       renders exactly as before) ---- */
    /* One-line labels: shrink the font (max -> min px, 0.5px steps) until
       the text fits its box; ellipsis only if it still doesn't fit at min. */
    var __fitEls = [];
    function __fitText(el, max, min) {
      if (!el) return;
      el.style.whiteSpace = "nowrap";
      el.style.overflow = "hidden";
      el.style.textOverflow = "ellipsis";
      for (var fs = max; ; fs -= 0.5) {
        el.style.fontSize = fs + "px";
        if (fs <= min || !el.clientWidth || el.scrollWidth <= el.clientWidth + 0.5) break;
      }
    }
    function __fitLater(el, max, min) {
      __fitEls.push([el, max, min]);
      requestAnimationFrame(function () {
        __fitText(el, max, min);
      });
    }
    window.addEventListener("resize", function () {
      __fitEls.forEach(function (f) {
        __fitText(f[0], f[1], f[2]);
      });
    });
    function __val(d, key) {
      return key === "posts" ? (d.forumPosts || 0) + (d.forumReplies || 0) : d[key] || 0;
    }
    function __spark(vals, color) {
      var ns = "http://www.w3.org/2000/svg",
        w = 100,
        h = 22,
        mx = Math.max.apply(null, vals.concat([1])),
        svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "display:block;width:100%;height:18px;margin-top:6px;overflow:visible;";
      if (!vals.length) return svg;
      var pts = vals.map(function (v, i) {
          return [
            (i / Math.max(1, vals.length - 1)) * w,
            h - 2 - (v / mx) * (h - 4),
          ];
        }),
        d = pts
          .map(function (q, i) {
            return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
          })
          .join(" "),
        area = document.createElementNS(ns, "path");
      area.setAttribute("d", d + " L " + w + " " + h + " L 0 " + h + " Z");
      area.setAttribute("fill", color);
      area.setAttribute("fill-opacity", ".14");
      svg.appendChild(area);
      var line = document.createElementNS(ns, "path");
      line.setAttribute("d", d);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "1.6");
      line.setAttribute("stroke-linejoin", "round");
      line.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(line);
      return svg;
    }
    function __delta(cur, prev) {
      if (typeof prev !== "number") return null;
      var el = document.createElement("div");
      el.style.cssText = "font-size:10px;font-weight:700;margin-top:3px;white-space:nowrap;";
      if (!prev && !cur) return ((el.textContent = "–"), (el.style.color = "var(--muted)"), el);
      if (!prev) return ((el.textContent = "new"), (el.style.color = "#30d158"), el);
      var pc = Math.round(((cur - prev) / prev) * 100);
      el.textContent = (pc > 0 ? "▲ " : pc < 0 ? "▼ " : "") + Math.abs(pc) + "%";
      el.style.color = pc > 0 ? "#30d158" : pc < 0 ? "#ff453a" : "var(--muted)";
      return el;
    }
    var __SC = {
      views: "#0a84ff",
      visitors: "#30d158",
      posts: "#3b82f6",
      newUsers: "#ff9f0a",
      active: "#bf5af2",
      globeViews: "#64d2ff",
      cartAdds: "#ff375f",
      orders: "#30d158",
      revenue: "#ffd60a",
    };
    function __series(key) {
      return (o.days || [])
        .slice()
        .reverse()
        .map(function (d) {
          return __val(d, key);
        });
    }
    function __tileExtras(tile, key, cur, prev) {
      tile.appendChild(__spark(__series(key), __SC[key] || "#0a84ff"));
      var dl = __delta(cur, prev);
      dl && tile.appendChild(dl);
    }
    function __tile(row, label, value, key, prev, fmt) {
      var t = document.createElement("div");
      t.style.cssText =
        "flex:1 1 0;min-width:0;text-align:center;padding:10px 4px;border-radius:16px;background:var(--glass-clear-tint);border:var(--glass-hairline);";
      var n = document.createElement("div");
      n.style.cssText = "font-size:18px;font-weight:700;white-space:nowrap;letter-spacing:-0.02em;";
      t.appendChild(n);
      var a = document.createElement("div");
      a.style.cssText = "font-size:12px;color:var(--muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      a.textContent = label;
      t.appendChild(a);
      __fitLater(a, 12, 9);
      key && __tileExtras(t, key, value, prev);
      row.appendChild(t);
      fmt ? ((n.className = "easyui-anim-num"), (n.textContent = fmt(value))) : s(n, value);
      return t;
    }
    function __row() {
      var r = document.createElement("div");
      r.style.cssText = "display:flex;gap:8px;margin-bottom:12px;";
      return r;
    }
    function __cap(txt) {
      var c = document.createElement("div");
      c.className = "dash-caption";
      c.style.cssText = "margin:-4px 0 12px;";
      c.textContent = txt;
      return c;
    }
    function __since(key) {
      var d = o.since && o.since[key];
      return d ? new Date(d + "T12:00:00Z").toLocaleDateString(void 0, { month: "short", day: "numeric" }) : "";
    }
    function __overview(parent) {
      parent = parent || k;
      var sm = o.summary;
      if (!sm) return;
      var days = o.days || [],
        today = days[0] || {},
        act7 = days.slice(0, 7).reduce(function (a, d) {
          return a + (d.active || 0);
        }, 0);
      var r = __row();
      r.className = (r.className ? r.className + " " : "") + "dash-mini-row";
      __tile(r, "Members", sm.members || 0);
      __tile(r, "VIP", sm.vip || 0);
      __tile(r, "Active today", today.active || 0, "active", null);
      parent.appendChild(r);
      var st = __since("active");
      parent.appendChild(
        __cap(
          "Active · 7-day avg " +
            (act7 / 7).toFixed(1) +
            (st ? " · since " + st : ""),
        ),
      );
    }
    function __shop(parent) {
      parent = parent || k;
      if (!(o.v >= 2)) return;
      var con = o.shop && o.shop.connected,
        pv = o.prev || {},
        days = o.days || [],
        tot = function (key) {
          return days.reduce(function (a, d) {
            return a + __val(d, key);
          }, 0);
        },
        cur = (o.shop && o.shop.currency) || "CAD",
        money = function (v) {
          try {
            return new Intl.NumberFormat(void 0, {
              style: "currency",
              currency: cur,
              currencyDisplay: "narrowSymbol",
              notation: v >= 1e4 ? "compact" : "standard",
              maximumFractionDigits: v >= 1e4 ? 1 : 0,
            }).format(v);
          } catch (e) {
            return "$" + Math.round(v);
          }
        };
      var r = __row();
      if (con) {
        var ord = tot("orders"),
          rev = Math.round(tot("revenue") * 100) / 100;
        __tile(r, "Orders", ord, "orders", pv.orders);
        __tile(r, "Revenue", rev, "revenue", pv.revenue, money);
      }
      __tile(r, "Cart adds", tot("cartAdds"), "cartAdds", pv.cartAdds);
      __tile(r, "Globe views", tot("globeViews"), "globeViews", pv.globeViews);
      parent.appendChild(r);
      var a = __since("cartAdds"),
        g = __since("globeViews");
      parent.appendChild(
        __cap(
          "Last 30 days" +
            (con
              ? " · orders exclude test and cancelled"
              : o.shop && o.shop.error
                ? " · Shopify error: " + o.shop.error
                : " · orders show once Shopify is connected") +
            (a || g ? " · since " + (a || g) : ""),
        ),
      );
    }
    function __flag(e) {
      if (!e || 2 !== e.length) return "🌐";
      for (var t = "", n = 0; n < 2; n++) {
        var a = String(e).toUpperCase().charCodeAt(n);
        if (a < 65 || a > 90) return "🌐";
        t += String.fromCodePoint(a - 65 + 127462);
      }
      return t;
    }
    function __countries(box, label) {
      var vis = {};
      (o.days || []).forEach(function (t) {
        var n = t.countries || {};
        Object.keys(n).forEach(function (t) {
          vis[t] = (vis[t] || 0) + (n[t] || 0);
        });
      });
      var mem = (o.summary && o.summary.memberCountries) || null,
        mode = "visitors";
      function draw() {
        var src = mode === "members" ? mem : vis,
          all = Object.keys(src || {})
            .map(function (t) {
              return { code: t, n: src[t] };
            })
            .sort(function (e, t) {
              return t.n - e.n;
            }),
          list = all.slice(0, 5);
        box.innerHTML = "";
        if (!list.length) {
          box.innerHTML =
            '<div class="dash-empty">' + (mode === "members" ? "No member countries yet." : "No visitor data yet.") + "</div>";
          return;
        }
        var top = list[0].n;
        list.forEach(function (e) {
          var t = document.createElement("div");
          t.style.cssText = "display:flex;align-items:center;gap:12px;padding:8px 0;";
          var a = document.createElement("span");
          a.style.cssText = "font-size:18px;line-height:1;";
          a.textContent = __flag(e.code);
          t.appendChild(a);
          var r = document.createElement("span");
          r.style.cssText = "font-size:13px;font-weight:600;width:32px;";
          r.textContent = e.code;
          t.appendChild(r);
          var i = document.createElement("div");
          i.style.cssText = "flex:1;height:6px;border-radius:3px;background:rgba(127,127,127,.18);overflow:hidden;";
          var b = document.createElement("div");
          b.style.cssText =
            "height:100%;width:" +
            Math.max(5, Math.round((e.n / top) * 100)) +
            "%;border-radius:3px;background:" +
            (mode === "members" ? "linear-gradient(90deg,#bf5af2,#e4b8fb)" : "linear-gradient(90deg,#0a84ff,#5ac8fa)") +
            ";";
          i.appendChild(b);
          t.appendChild(i);
          var c = document.createElement("span");
          c.style.cssText = "font-size:13px;color:var(--muted);min-width:30px;text-align:right;";
          c.textContent = e.n;
          t.appendChild(c);
          box.appendChild(t);
        });
        if (all.length > 5) {
          var more = document.createElement("div");
          more.className = "dash-empty";
          more.style.padding = "4px 0 8px";
          more.textContent = all.length + " countries in total";
          box.appendChild(more);
        }
      }
      if (mem && Object.keys(mem).length && label) {
        label.style.cssText = "display:flex;align-items:center;justify-content:space-between;";
        label.textContent = "";
        var tx = document.createElement("span");
        tx.textContent = "Countries";
        label.appendChild(tx);
        var seg = document.createElement("span");
        seg.style.cssText =
          "display:inline-flex;gap:2px;padding:2px;border-radius:999px;background:rgba(120,120,128,0.12);border:var(--glass-hairline);text-transform:none;letter-spacing:0;";
        [
          ["visitors", "Visitors"],
          ["members", "Members"],
        ].forEach(function (m) {
          var bt = document.createElement("button");
          bt.type = "button";
          bt.textContent = m[1];
          bt.dataset.mode = m[0];
          bt.style.cssText =
            "border:none;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;cursor:pointer;background:transparent;color:var(--muted);";
          bt.addEventListener("click", function () {
            mode = m[0];
            paint();
            draw();
          });
          seg.appendChild(bt);
        });
        function paint() {
          Array.prototype.forEach.call(seg.children, function (b) {
            var on = b.dataset.mode === mode;
            b.style.background = on ? "var(--glass-clear-tint)" : "transparent";
            b.style.color = on ? "var(--ink)" : "var(--muted)";
          });
        }
        paint();
        label.appendChild(seg);
      }
      draw();
    }
    /* Always-expanded section (per dc: no dropdowns — show all data at once) */
    function __sec(title) {
      var sec = document.createElement("section");
      sec.className = "dash-sec is-open";
      var hd = document.createElement("div");
      hd.className = "dash-sec-hd dash-sec-hd-static";
      var tx = document.createElement("span");
      tx.textContent = title;
      hd.appendChild(tx);
      var body = document.createElement("div");
      body.className = "dash-sec-body";
      sec.appendChild(hd);
      sec.appendChild(body);
      return { root: sec, body: body };
    }
    var z = o.days.reduce(function (e, t) {
      return e + (t.forumPosts || 0) + (t.forumReplies || 0);
    }, 0);
    var __pv = o.prev || null;
    var __today = (o.days && o.days[0]) || {};
    var __salesTot = (o.days || []).reduce(function (a, d) { return a + (__val(d, "revenue") || 0); }, 0);
    var __salesFmt = (function (v) {
      try {
        return new Intl.NumberFormat(void 0, {
          style: "currency",
          currency: (o.shop && o.shop.currency) || "CAD",
          currencyDisplay: "narrowSymbol",
          notation: v >= 1e4 ? "compact" : "standard",
          maximumFractionDigits: v >= 1e4 ? 1 : 0,
        }).format(v);
      } catch (e) {
        return "$" + Math.round(v);
      }
    })(__salesTot);
    var __online = "number" == typeof window.MPOnlineCount ? window.MPOnlineCount : null;
    /* Headline stats (per dc): online, today's visitors, messages, signups, sales */
    var __hero = document.createElement("div");
    __hero.className = "dash-hero";
    [
      { label: "Online", value: __online != null ? __online : "—", raw: __online != null },
      { label: "Visitors today", value: __today.visitors || 0, raw: !0 },
      { label: "Messages", value: z, raw: !0, sub: "30 days" },
      { label: "Signups", value: o.totalNewUsers || 0, raw: !0, sub: "30 days" },
      { label: "Sales", value: __salesFmt, raw: !1, sub: "30 days" },
    ].forEach(function (e) {
      var t = document.createElement("div");
      t.className = "dash-hero-tile";
      var n = document.createElement("div");
      n.className = "dash-hero-num";
      t.appendChild(n);
      var a = document.createElement("div");
      a.className = "dash-hero-lbl";
      a.textContent = e.label;
      t.appendChild(a);
      if (e.sub) {
        var u = document.createElement("div");
        u.className = "dash-hero-sub";
        u.textContent = e.sub;
        t.appendChild(u);
      }
      __hero.appendChild(t);
      e.raw && typeof e.value === "number" ? s(n, e.value) : (n.textContent = String(e.value));
    });
    k.appendChild(__hero);
    var __tc = document.createElement("div");
    __tc.className = "dash-caption dash-caption-tight";
    __tc.textContent = "Overview" + (o.prev ? " · vs prior 30 days in Activity" : "");
    k.appendChild(__tc);
    var __mem = __sec("Members");
    k.appendChild(__mem.root);
    __overview(__mem.body);
    /* Views/Visitors 30d totals remain reachable via the Activity metric menu */
    var S = "views",
      P = {
        views: "Views",
        visitors: "Visitors",
        messages: "Posts",
        newUsers: "Users",
        active: "Active members",
        globeViews: "Globe views",
        cartAdds: "Cart adds",
        orders: "Orders",
        revenue: "Revenue",
      },
      N = [
        { id: "views", label: "Views" },
        { id: "visitors", label: "Visitors" },
        { id: "messages", label: "Posts" },
        { id: "newUsers", label: "Users" },
      ].concat(
        o.v >= 2
          ? [
              { id: "active", label: "Active members" },
              { id: "globeViews", label: "Globe views" },
              { id: "cartAdds", label: "Cart adds" },
            ].concat(
              o.shop && o.shop.connected
                ? [
                    { id: "orders", label: "Orders" },
                    { id: "revenue", label: "Revenue" },
                  ]
                : [],
            )
          : [],
      ),
      H = [
        { id: "24h", label: "Last 24 hours", days: 1 },
        { id: "7d", label: "Last 7 days", days: 7 },
        {
          id: "30d",
          label: "Last 30 days",
          days: 30,
        } /* C-M11: 12m/all removed — server returns exactly 30 days */,
      ],
      I = H[1],
      O = document.createElement("div");
    O.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";
    var F = document.createElement("button");
    ((F.type = "button"),
      (F.className = "dash-pill"));
    var U = document.createElement("span");
    U.textContent = "Activity";
    var R = document.createElement("span");
    function D() {
      U.textContent = P[S] + " · " + I.label;
      requestAnimationFrame(__fitPill);
    }
    function __fitPill() {
      __fitText(U, 14, 10);
    }
    ((R.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none" width="12" height="12" data-hi="float"><path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/></svg>'),
      F.appendChild(U),
      F.appendChild(R),
      D());
    var Z = document.createElement("div");
    function q(e) {
      var t = document.createElement("div");
      ((t.textContent = e),
        (t.style.cssText =
          "font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.5;padding:8px 12px 4px;"),
        Z.appendChild(t));
    }
    function V(e, t, n) {
      var a = document.createElement("button");
      return (
        (a.type = "button"),
        (a.textContent = e),
        (a.style.cssText =
          "display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:transparent;color:var(--ink);font-size:13px;font-weight:500;border-radius:9px;cursor:pointer;"),
        t && ((a.style.background = "var(--glass-clear-tint)"), (a.style.fontWeight = "700")),
        a.addEventListener("click", function () {
          (n(), (Z.style.display = "none"), D(), J(), $());
        }),
        Z.appendChild(a),
        a
      );
    }
    Z.style.cssText =
      "position:absolute;z-index:50;min-width:180px;margin-top:6px;border-radius:14px;padding:6px;background:var(--sheet-bg);border:var(--sheet-border);box-shadow:var(--sheet-shadow);backdrop-filter:var(--sheet-blur);-webkit-backdrop-filter:var(--sheet-blur);display:none;max-height:320px;overflow-y:auto;";
    var B = [],
      j = [];
    function J() {
      (B.forEach(function (e) {
        var t = e._id === S;
        ((e.style.background = t ? "var(--glass-clear-tint)" : "transparent"),
          (e.style.fontWeight = t ? "700" : "500"));
      }),
        j.forEach(function (e) {
          var t = e._id === I.id;
          ((e.style.background = t ? "var(--glass-clear-tint)" : "transparent"),
            (e.style.fontWeight = t ? "700" : "500"));
        }));
    }
    (q("Metric"),
      N.forEach(function (e) {
        var t = V(e.label, e.id === S, function () {
          S = e.id;
        });
        ((t._id = e.id), B.push(t));
      }),
      q("Time Period"),
      H.forEach(function (e) {
        var t = V(e.label, e.id === I.id, function () {
          I = e;
        });
        ((t._id = e.id), j.push(t));
      }));
    var W = document.createElement("div");
    ((W.style.cssText = "position:relative;display:inline-block;min-width:0;flex:0 1 auto;"),
      (F.style.maxWidth = "100%"),
      (U.style.minWidth = "0"),
      (R.style.flex = "none"),
      W.appendChild(F),
      W.appendChild(Z),
      O.appendChild(W),
      F.addEventListener("click", function (e) {
        (e.stopPropagation(),
          (Z.style.display = "none" !== Z.style.display && Z.style.display ? "none" : "block"));
      }),
      document.addEventListener("click", function (e) {
        W.contains(e.target) || (Z.style.display = "none");
      }),
      k.appendChild(O));
    var Y = document.createElement("div");
    ((Y.className = "dash-month"), (Y.style.display = "none"), O.appendChild(Y));
    var _ = document.createElement("div");
    ((_.className = "dash-chart"),
      (_.style.cssText =
      "position:relative;height:240px;margin:0 0 8px;background:var(--glass-clear-tint);border:0;border-radius:18px;padding:14px;overflow:hidden;"),
      k.appendChild(_));
    var __utc = document.createElement("div");
    ((__utc.className = "dash-caption"), (__utc.style.cssText = "margin:-4px 0 6px;"),
      (__utc.textContent = "Days are UTC"),
      k.appendChild(__utc));
    /* C-M11: day buckets are UTC (server toISOString) */ var G = document.createElement("div");
    G.className = "dash-caption";
    var X = {
      views: ["#0a84ff", "#5ac8fa"],
      visitors: ["#30d158", "#a6f3c0"],
      messages: ["#3b82f6", "#bfdbfe"],
      newUsers: ["#ff9f0a", "#ffd60a"],
      active: ["#bf5af2", "#e4b8fb"],
      globeViews: ["#64d2ff", "#c4eeff"],
      cartAdds: ["#ff375f", "#ffb3c1"],
      orders: ["#30d158", "#a6f3c0"],
      revenue: ["#ffd60a", "#fff0a6"],
    };
    function Q(e) {
      if (!e.length) return "";
      if (1 === e.length) return "M " + e[0].x.toFixed(1) + " " + e[0].y.toFixed(1);
      var t,
        n = "M " + e[0].x.toFixed(1) + " " + e[0].y.toFixed(1);
      for (t = 0; t < e.length - 1; t++) {
        var a = e[Math.max(0, t - 1)],
          r = e[t],
          i = e[t + 1],
          o = e[Math.min(e.length - 1, t + 2)],
          s = r.x + (i.x - a.x) / 6,
          d = r.y + (i.y - a.y) / 6,
          l = i.x - (o.x - r.x) / 6,
          c = i.y - (o.y - r.y) / 6,
          p = Math.min(r.y, i.y),
          u = Math.max(r.y, i.y);
        ((d = Math.max(p, Math.min(u, d))),
          (c = Math.max(p, Math.min(u, c))),
          (n +=
            " C " +
            s.toFixed(1) +
            " " +
            d.toFixed(1) +
            " " +
            l.toFixed(1) +
            " " +
            c.toFixed(1) +
            " " +
            i.x.toFixed(1) +
            " " +
            i.y.toFixed(1)));
      }
      return n;
    }
    function $() {
      _.innerHTML = "";
      requestAnimationFrame(__fitPill);
      // The legacy "What this shows" note (forum-mount-patch.js) only knows
      // Views/Visitors/Users/Posts: hide it for the newer metrics.
      var __cb = document.getElementById("chart-briefing");
      __cb && (__cb.style.display = P[S] && ["views", "visitors", "messages", "newUsers"].indexOf(S) < 0 ? "none" : "");
      var __lt = "light" === document.documentElement.getAttribute("data-theme");
      function __dm(a) {
        return (__lt ? "rgba(0,0,0," : "rgba(255,255,255,") + a + ")";
      }
      var e,
        t = "http://www.w3.org/2000/svg",
        n = _.clientWidth - 32 || 300,
        a = 230,
        r = 14,
        i = 14,
        s = n - r - 14,
        d = a - i - 30,
        l = o.days.slice().reverse(),
        c = null,
        p = !1;
      if (0 === I.days) e = l;
      else if (I.days >= 365) {
        p = !0;
        var u = {};
        (l.forEach(function (e) {
          var t = e.date.slice(0, 7);
          (u[t] ||
            (u[t] = {
              date: t + "-01",
              views: 0,
              visitors: 0,
              messages: 0,
              newUsers: 0,
              forumPosts: 0,
              forumReplies: 0,
            }),
            (u[t].views += e.views || 0),
            (u[t].visitors += e.visitors || 0),
            (u[t].messages += e.messages || 0),
            (u[t].newUsers += e.newUsers || 0),
            (u[t].forumPosts += e.forumPosts || 0),
            (u[t].forumReplies += e.forumReplies || 0));
        }),
          (e = Object.keys(u)
            .sort()
            .map(function (e) {
              return u[e];
            })));
      } else {
        e = l.slice(-I.days);
        var m = l.length - I.days,
          v = Math.max(0, m - I.days);
        m - v >= 7 && (c = l.slice(v, m));
      }
      var x = "messages" === S;
      function f(e) {
        return x ? (e.forumPosts || 0) + (e.forumReplies || 0) : e[S] || 0;
      }
      var h = e.map(f),
        g = c ? c.map(f) : null,
        b = Math.max.apply(
          null,
          h
            .concat(g || [])
            .concat(
              "messages" === S
                ? e.map(function (t) {
                    return t.messages || 0;
                  })
                : [],
            )
            .concat([1]),
        ),
        y = h.every(function (e) {
          return 0 === e;
        }),
        C = h.reduce(function (e, t) {
          return e + t;
        }, 0),
        E = (C / Math.max(1, e.length)).toFixed(1),
        w = h.indexOf(b),
        k = (X[S] || X.views)[0],
        T = P[S];
      function A(e) {
        e = Math.round(Number(e) || 0);
        for (var t = String(Math.abs(e)), n = ""; t.length > 3;)
          ((n = "," + t.slice(-3) + n), (t = t.slice(0, -3)));
        return (e < 0 ? "-" : "") + t + n;
      }
      var L = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ],
        M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      function z() {
        if (!e.length) return "";
        var t = e[0].date,
          n = e[e.length - 1].date,
          a = t.slice(0, 4),
          r = parseInt(t.slice(5, 7), 10),
          i = n.slice(0, 4),
          o = parseInt(n.slice(5, 7), 10);
        return a === i && r === o
          ? L[r - 1] + " " + a
          : M[r - 1] + " " + a + " - " + M[o - 1] + " " + i;
      }
      var N = z();
      if (
        (N ? ((Y.textContent = N), (Y.style.display = "")) : (Y.style.display = "none"),
        (G.textContent =
          A(C) +
          " total · " +
          E +
          "/day avg" +
          (b > 0 && !y ? " · peak " + b : "") +
          ("messages" === S ? " · dashed = Chat messages" : "")),
        y || !e.length)
      ) {
        var H = document.createElement("div");
        return (
          (H.style.cssText =
            "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:" +
            __dm(".4") +
            ";"),
          (H.innerHTML =
            '<div style="font-size:13px;font-weight:600;">No activity in this range</div><div style="font-size:11px;opacity:.7;">Try a different time range or metric</div>'),
          void _.appendChild(H)
        );
      }
      if (1 === e.length) {
        var O = document.createElement("div");
        O.style.cssText =
          "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;";
        var F = document.createElement("div");
        ((F.style.cssText = "font-size:44px;font-weight:800;color:" + k + ";line-height:1;"),
          (F.textContent = A(h[0])),
          O.appendChild(F));
        var U = document.createElement("div");
        return (
          (U.style.cssText = "font-size:12px;font-weight:600;color:" + __dm(".45") + ";"),
          (U.textContent = T + " · " + re(e[0].date.slice(8, 10))),
          O.appendChild(U),
          void _.appendChild(O)
        );
      }
      function R(e) {
        return e.map(function (t, n) {
          return {
            x: r + (1 === e.length ? s / 2 : (n / (e.length - 1)) * s),
            y: i + d - (t / b) * d,
            v: t,
          };
        });
      }
      var D = R(h),
        Z = g ? R(g) : null,
        q = document.createElementNS(t, "svg");
      (q.setAttribute("viewBox", "0 0 " + n + " " + a),
        q.setAttribute("width", "100%"),
        q.setAttribute("height", a),
        (q.style.display = "block"),
        (q.style.overflow = "hidden"));
      var V = document.createElementNS(t, "defs"),
        B = document.createElementNS(t, "linearGradient");
      (B.setAttribute("id", "areaGrad-" + S),
        B.setAttribute("x1", "0"),
        B.setAttribute("y1", "0"),
        B.setAttribute("x2", "0"),
        B.setAttribute("y2", "1"));
      var j = document.createElementNS(t, "stop");
      (j.setAttribute("offset", "0%"),
        j.setAttribute("stop-color", k),
        j.setAttribute("stop-opacity", ".35"));
      var J = document.createElementNS(t, "stop");
      (J.setAttribute("offset", "100%"),
        J.setAttribute("stop-color", k),
        J.setAttribute("stop-opacity", "0"),
        B.appendChild(j),
        B.appendChild(J),
        V.appendChild(B),
        q.appendChild(V));
      var W = i + d,
        $ = Q(D);
      if (D.length) {
        var K = document.createElementNS(t, "path");
        (K.setAttribute(
          "d",
          $ +
            " L " +
            D[D.length - 1].x.toFixed(1) +
            " " +
            W +
            " L " +
            D[0].x.toFixed(1) +
            " " +
            W +
            " Z",
        ),
          K.setAttribute("fill", "url(#areaGrad-" + S + ")"),
          (K.style.animation = "fadeIn .8s ease both"),
          q.appendChild(K));
      }
      if (Z && Z.length > 1) {
        var ee = document.createElementNS(t, "path");
        (ee.setAttribute("d", Q(Z)),
          ee.setAttribute("fill", "none"),
          ee.setAttribute("stroke", __dm(".3")),
          ee.setAttribute("stroke-width", "1.5"),
          ee.setAttribute("stroke-dasharray", "2,5"),
          ee.setAttribute("stroke-linecap", "round"),
          q.appendChild(ee));
      }
      var te = document.createElementNS(t, "path");
      (te.setAttribute("d", $),
        te.setAttribute("fill", "none"),
        te.setAttribute("stroke", k),
        te.setAttribute("stroke-width", "2.5"),
        te.setAttribute("stroke-linecap", "round"),
        te.setAttribute("stroke-linejoin", "round"),
        q.appendChild(te));
      try {
        var ne = te.getTotalLength();
        ((te.style.strokeDasharray = String(ne)),
          (te.style.strokeDashoffset = String(ne)),
          te.getBoundingClientRect(),
          (te.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)"),
          (te.style.strokeDashoffset = "0"));
      } catch (e) {}
      /* C-M11: Chat-messages series alongside Posts */ if ("messages" === S) {
        var __cm = e.map(function (t) {
            return t.messages || 0;
          }),
          __cD = R(__cm),
          __cP = document.createElementNS(t, "path");
        (__cP.setAttribute("d", Q(__cD)),
          __cP.setAttribute("fill", "none"),
          __cP.setAttribute("stroke", "#ff9f0a"),
          __cP.setAttribute("stroke-width", "2"),
          __cP.setAttribute("stroke-dasharray", "5,4"),
          __cP.setAttribute("stroke-linecap", "round"),
          q.appendChild(__cP));
      }
      var ae = D.length <= 14;
      function re(e) {
        var t = ["th", "st", "nd", "rd"],
          n = (e = parseInt(e, 10)) % 100;
        return e + (t[(n - 20) % 10] || t[n] || t[0]);
      }
      D.forEach(function (n, a) {
        if (ae || a === w) {
          var r = document.createElementNS(t, "circle");
          (r.setAttribute("cx", n.x.toFixed(1)),
            r.setAttribute("cy", n.y.toFixed(1)),
            r.setAttribute("r", "3.5"),
            r.setAttribute("fill", __lt ? "#ffffff" : "#0c0d12"),
            r.setAttribute("stroke", k),
            r.setAttribute("stroke-width", "2.5"),
            (r.style.animation = "fadeIn .4s ease both"),
            (r.style.animationDelay = 200 + 40 * a + "ms"));
          var i = document.createElementNS(t, "title");
          ((i.textContent = e[a].date + ": " + n.v + " " + T.toLowerCase()),
            r.appendChild(i),
            q.appendChild(r));
        }
      });
      var ie,
        oe,
        se = Math.min(7, e.length);
      for (ie = 0; ie < se; ie++) {
        oe = Math.round((ie * (e.length - 1)) / Math.max(1, se - 1));
        var de = document.createElementNS(t, "text");
        (de.setAttribute("x", D[oe].x.toFixed(1)),
          de.setAttribute("y", a - 8),
          de.setAttribute("text-anchor", "middle"),
          de.setAttribute("font-size", "10"),
          de.setAttribute("font-weight", "600"),
          de.setAttribute("fill", __dm(".38")));
        var le = e[oe].date;
        ((de.textContent = p
          ? le.slice(5, 7).replace(/^0/, "") + "/" + le.slice(2, 4)
          : re(le.slice(8, 10))),
          q.appendChild(de));
      }
      _.appendChild(q);
    }
    function K() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          ($(), setTimeout($, 300));
        });
      });
    }
    (K(), window.addEventListener("resize", $));
    var __nu = __sec("Newest signups");
    k.appendChild(__nu.root);
    k.insertBefore(G, __nu.root);
    var ee = document.createElement("div");
    ee.hidden = !0;
    var te = document.createElement("div");
    ((te.className = "dash-box dash-box-quiet"),
      (te.innerHTML = '<div class="dash-empty">Loading...</div>'),
      __nu.body.appendChild(te),
      t("/api/users/recent")
        .then(function (e) {
          e && e.ok && e.users
            ? ((te.innerHTML = ""),
              e.users.forEach(function (e) {
                var t = document.createElement("div");
                t.style.cssText =
                  "display:flex;align-items:center;gap:12px;padding:10px 0;";
                t.className = "dash-urow";
                var n = document.createElement("div");
                ((n.style.cssText = "width:36px;height:36px;flex:none;"),
                  n.appendChild(a(e.username, e.avatar, "sm", e.hasAvatarImg ? e.avatarV : void 0)),
                  t.appendChild(n));
                var r = document.createElement("div");
                r.style.cssText = "flex:1;min-width:0;";
                var i = document.createElement("div");
                ((i.style.cssText =
                  "font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"),
                  (i.textContent = mpName(e.username)),
                  r.appendChild(i));
                var o = document.createElement("div");
                ((o.style.cssText = "font-size:12px;color:var(--muted);"),
                  (o.textContent =
                    "Joined " +
                    new Date(e.createdAt).toLocaleDateString(void 0, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })),
                  r.appendChild(o),
                  t.appendChild(r));
                var s = document.createElement("div");
                ((s.style.cssText = "font-size:13px;color:var(--muted);flex:none;"),
                  (s.textContent = "★ " + (e.points || 0)),
                  t.appendChild(s),
                  te.appendChild(t));
              }),
              e.users.length ||
                (te.innerHTML =
                  '<div class="dash-empty">No users yet.</div>'))
            : (te.innerHTML =
                '<div class="dash-empty">Could not load users.</div>');
        })
        .catch(function () {
          te.innerHTML =
            '<div class="dash-empty">Could not load users.</div>';
        }));
    var __co = __sec("Countries");
    k.appendChild(__co.root);
    var ne = document.createElement("div");
    ne.className = "dash-sec-tools";
    __co.body.appendChild(ne);
    var ae = document.createElement("div");
    ((ae.className = "dash-box dash-box-quiet"),
      (ae.style.padding = "2px 4px 6px"),
      __countries(ae, ne),
      /* __countries writes "Countries" + Visitors/Members toggle into ne; drop the duplicate title */
      (function () {
        var first = ne.firstChild;
        if (first && first.nodeType === 1 && first.tagName === "SPAN" && /countries/i.test(first.textContent || ""))
          first.remove();
        if (!ne.childNodes.length) ne.hidden = !0;
      })(),
      __co.body.appendChild(ae));
    var __sh = __sec("Shop");
    k.appendChild(__sh.root);
    __shop(__sh.body);
    var re = document.createElement("div");
    re.className = "dash-actions";
    var ie = document.createElement("button");
    ((ie.type = "button"),
      (ie.className = "dash-btn " + (r() ? "t-green f-green" : "t-orange f-orange")),
      (ie.textContent = r() ? "Resume Chat" : "Pause Chat"),
      ie.addEventListener("click", function () {
        var n = r() ? "/api/chat/unpause" : "/api/chat/pause";
        ((ie.disabled = !0),
          (ie.textContent = "Working..."),
          t(n, { method: "POST" })
            .then(function (t) {
              var n;
              (t &&
                t.ok &&
                ((n = t.paused),
                e.setPaused(n),
                (ie.textContent = t.paused ? "Resume Chat" : "Pause Chat"),
                (ie.className = "dash-btn " + (t.paused ? "t-green f-green" : "t-orange f-orange"))),
                (ie.disabled = !1));
            })
            .catch(function () {
              ((ie.disabled = !1), (ie.textContent = r() ? "Resume Chat" : "Pause Chat"));
            }));
      }),
      re.appendChild(ie));
    var oe = document.createElement("button");
    function se() {
      function e() {
        (delete A.dataset.loaded, se());
      }
      function n(list) {
        var drag = null, saving = false;
        function order() { return Array.from(list.children).map(function (row) { return row.dataset.catId; }); }
        function restore(ids) {
          ids.forEach(function (id) {
            var row = Array.from(list.children).find(function (row) { return row.dataset.catId === id; });
            if (row) list.appendChild(row);
          });
        }
        function save(before) {
          var after = order();
          if (after.join("|") === before.join("|")) return;
          saving = true;
          list.setAttribute("aria-busy", "true");
          t("/api/forum/categories/reorder", { method:"POST", body:{ order:after } })
            .then(function (result) { if (!result.ok) throw new Error(result.error || "Reorder failed"); })
            .catch(function (error) { restore(before); alert(error.message || "Reorder failed"); })
            .finally(function () { saving = false; list.removeAttribute("aria-busy"); });
        }
        function finish(event) {
          if (!drag || event.pointerId !== drag.id) return;
          var current = drag; drag = null;
          document.removeEventListener("pointermove", move, true);
          document.removeEventListener("pointerup", finish, true);
          document.removeEventListener("pointercancel", finish, true);
          current.row.style.transform = "";
          current.row.style.position = "";
          current.row.style.zIndex = "";
          current.row.style.boxShadow = "";
          current.grip.style.cursor = "grab";
          current.row.classList.remove("is-dragging");
          if (event.type === "pointercancel") restore(current.before);
          else save(current.before);
        }
        function move(event) {
          if (!drag || event.pointerId !== drag.id) return;
          event.preventDefault();
          var row = drag.row, desiredTop = event.clientY - drag.offset;
          // Compare viewport coordinates throughout, including when the sheet
          // is scrolled. Reapply translation immediately after moving the DOM.
          row.style.transform = "";
          var next = Array.from(list.children).find(function (other) {
            if (other === row) return false;
            var box = other.getBoundingClientRect();
            return event.clientY < box.top + box.height / 2;
          });
          if (next) { if (row.nextElementSibling !== next) list.insertBefore(row, next); }
          else if (row !== list.lastElementChild) list.appendChild(row);
          row.style.transform = "translateY(" + (desiredTop - row.getBoundingClientRect().top) + "px)";
        }
        Array.from(list.children).forEach(function (row) {
          var grip = row.querySelector(".cat-grip");
          if (!grip) return;
          grip.setAttribute("role", "button"); grip.tabIndex = 0;
          grip.setAttribute("aria-label", "Reorder " + row.querySelector("input").value);
          grip.addEventListener("pointerdown", function (event) {
            if (drag || saving || (event.pointerType === "mouse" && event.button !== 0)) return;
            event.preventDefault();
            drag = { id:event.pointerId, row:row, grip:grip, before:order(), offset:event.clientY-row.getBoundingClientRect().top };
            row.style.position = "relative"; row.style.zIndex = "50";
            row.style.boxShadow = "0 12px 28px rgba(0,0,0,.25)";
            row.classList.add("is-dragging"); grip.style.cursor = "grabbing";
            document.addEventListener("pointermove", move, { capture:true, passive:false });
            document.addEventListener("pointerup", finish, true);
            document.addEventListener("pointercancel", finish, true);
          });
          grip.addEventListener("keydown", function (event) {
            if (saving || drag || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            var before = order(), sibling = event.key === "ArrowUp" ? row.previousElementSibling : row.nextElementSibling;
            if (!sibling) return;
            list.insertBefore(row, event.key === "ArrowUp" ? sibling : sibling.nextElementSibling);
            grip.focus({ preventScroll:true }); save(before);
          });
        });
      }
      ((A.dataset.loaded = "1"),
        (A.innerHTML = '<div class="dash-empty">Loading…</div>'),
        t("/api/forum/categories")
          .then(function (a) {
            var r = (a.ok && a.categories) || [];
            A.innerHTML = "";
            var o = document.createElement("div");
            ((o.className = "dash-label"),
              (o.textContent = "Categories"),
              A.appendChild(o));
            var s = document.createElement("div");
            ((s.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"),
              r.forEach(function (n) {
                var a = document.createElement("div");
                (a.setAttribute("data-cat-id", n.id),
                  (a.style.cssText =
                    "display:flex;align-items:center;gap:6px;padding:6px 8px 6px 4px;border:var(--glass-hairline);border-radius:14px;background:var(--glass-clear-tint);"));
                var r = document.createElement("div");
                ((r.className = "cat-grip"),
                  (r.title = "Drag to reorder"),
                  (r.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="16"><path d="M16 6C16 6.55228 15.5523 7 15 7C14.4477 7 14 6.55228 14 6C14 5.44772 14.4477 5 15 5C15.5523 5 16 5.44772 16 6Z"/><path d="M10 6C10 6.55228 9.55228 7 9 7C8.44772 7 8 6.55228 8 6C8 5.44772 8.44772 5 9 5C9.55228 5 10 5.44772 10 6Z"/><path d="M16 18C16 18.5523 15.5523 19 15 19C14.4477 19 14 18.5523 14 18C14 17.4477 14.4477 17 15 17C15.5523 17 16 17.4477 16 18Z"/><path d="M16 12C16 12.5523 15.5523 13 15 13C14.4477 13 14 12.5523 14 12C14 11.4477 14.4477 11 15 11C15.5523 11 16 11.4477 16 12Z"/><path d="M10 18C10 18.5523 9.55228 19 9 19C8.44772 19 8 18.5523 8 18C8 17.4477 8.44772 17 9 17C9.55228 17 10 17.4477 10 18Z"/><path d="M10 12C10 12.5523 9.55228 13 9 13C8.44772 13 8 12.5523 8 12C8 11.4477 8.44772 11 9 11C9.55228 11 10 11.4477 10 12Z"/></svg>'),
                  (r.style.cssText =
                    "flex:none;display:flex;align-items:center;justify-content:center;width:24px;height:36px;cursor:grab;touch-action:none;color:var(--muted);-webkit-user-select:none;user-select:none;"),
                  a.appendChild(r));
                var i = document.createElement("input");
                ((i.type = "text"),
                  (i.value = n.name),
                  (i.maxLength = 40),
                  (i.title = "Tap to rename"),
                  (i.className = "dash-input"),
                  (i.style.cssText = "flex:1;height:36px;border-radius:10px;font-weight:600;"),
                  i.addEventListener("keydown", function (e) {
                    "Enter" === e.key && (e.preventDefault(), clearTimeout(o), d(), i.blur());
                  }));
                var o = null;
                function d() {
                  var e = i.value.trim();
                  e &&
                    e !== n.name &&
                    t("/api/forum/categories/" + encodeURIComponent(n.id), {
                      method: "PUT",
                      body: { name: e },
                    }).then(function (t) {
                      t.ok ? (n.name = e) : alert(t.error || "Rename failed");
                    });
                }
                (i.addEventListener("input", function () {
                  (clearTimeout(o), (o = setTimeout(d, 700)));
                }),
                  i.addEventListener("blur", function () {
                    (clearTimeout(o), d());
                  }),
                  a.appendChild(i));
                var l = document.createElement("button");
                l.type = "button";
                var c = n.ownerOnly ? "private" : n.membersOnly ? "members" : "public";
                if (
                  ((l.textContent =
                    "private" === c ? "🔒 Private" : "members" === c ? "⭐ VIPs" : "Public"),
                  (l.title = "Visibility: Public → Private (only you) → VIPs → Public"),
                  (l.className = "dash-vis"),
                  (l.style.cssText =
                    "background:" +
                    ("private" === c
                      ? "rgba(120,140,255,.25)"
                      : "members" === c
                        ? "rgba(255,200,50,.2)"
                        : "transparent") +
                    ";"),
                  l.addEventListener("click", function () {
                    var a =
                      "public" === c
                        ? { ownerOnly: !0, membersOnly: !1 }
                        : "private" === c
                          ? { ownerOnly: !1, membersOnly: !0 }
                          : { ownerOnly: !1, membersOnly: !1 };
                    t("/api/forum/categories/" + encodeURIComponent(n.id), {
                      method: "PUT",
                      body: a,
                    }).then(function (t) {
                      t.ok ? e() : alert(t.error || "Failed");
                    });
                  }),
                  a.appendChild(l),
                  "general" === n.id &&
                    (function () {
                      var __sp = document.createElement("span");
                      ((__sp.className = "dash-x"), (__sp.style.visibility = "hidden"), a.appendChild(__sp));
                    })(),
                  "general" !== n.id)
                ) {
                  var p = document.createElement("button");
                  ((p.type = "button"),
                    (p.innerHTML = '<svg class="mp-x-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.9991 19L5 5.00098"/><path d="M19 5L5.00092 18.999"/></svg>'),
                    (p.className = "dash-x"),
                    p.setAttribute("aria-label", "Delete category"),
                    p.addEventListener("click", function () {
                      confirm("Delete category '" + n.name + "'? Its threads move to General.") &&
                        t("/api/forum/categories/" + encodeURIComponent(n.id), {
                          method: "DELETE",
                        }).then(function (t) {
                          t.ok && e();
                        });
                    }),
                    a.appendChild(p));
                }
                s.appendChild(a);
              }),
              n(s),
              A.appendChild(s));
            var d = document.createElement("div");
            d.style.cssText = "display:flex;gap:8px;margin-bottom:20px;";
            var l = document.createElement("input");
            ((l.type = "text"),
              (l.placeholder = "New category name"),
              (l.maxLength = 40),
              (l.className = "dash-input"),
              (l.style.flex = "1"));
            var c = document.createElement("button");
            ((c.type = "button"),
              (c.textContent = "Add"),
              (c.className = "dash-btn accent"),
              c.addEventListener("click", function () {
                var n = l.value.trim();
                n &&
                  ((c.disabled = !0),
                  t("/api/forum/categories", { method: "POST", body: { name: n } }).then(
                    function (t) {
                      t.ok ? e() : (alert(t.error || "Failed"), (c.disabled = !1));
                    },
                  ));
              }),
              d.appendChild(l),
              d.appendChild(c),
              A.appendChild(d));
            var p = r.filter(function (e) {
              return e.ownerOnly;
            });
            if (p.length) {
              var u = document.createElement("div");
              ((u.className = "dash-label"),
                (u.textContent = "Private access"),
                A.appendChild(u));
              var m = document.createElement("div");
              ((m.style.cssText = "font-size:12px;color:var(--muted);margin:-2px 0 10px;"),
                (m.textContent =
                  "Pick a user and a private category, then set whether they can access it. VIPs always have access to the 💵 category."),
                A.appendChild(m));
              var v = document.createElement("div");
              v.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;";
              var x =
                  "flex:1;min-width:120px;",
                f = document.createElement("select");
              f.style.cssText = x;
              var h = document.createElement("select");
              ((h.style.cssText = x),
                p.forEach(function (e) {
                  var t = document.createElement("option");
                  ((t.value = e.id), (t.textContent = e.name), h.appendChild(t));
                }));
              var g = document.createElement("button");
              ((g.type = "button"),
                (g.className = "dash-btn"),
                (g.style.cssText = "width:100%;"));
              var b = [];
              function y() {
                var e = b.find(function (e) {
                  return e.username === f.value;
                });
                return !!e && (e.catAccess || []).indexOf(h.value) >= 0;
              }
              function C() {
                var e = y();
                ((g.textContent = e ? "Has access — tap to revoke" : "No access — tap to grant"),
                  (g.className = e ? "dash-btn t-green f-green" : "dash-btn"));
              }
              (f.addEventListener("change", C),
                h.addEventListener("change", C),
                g.addEventListener("click", function () {
                  var e = f.value,
                    n = h.value;
                  if (e && n) {
                    var a = !y();
                    ((g.disabled = !0),
                      t("/api/forum/category-access", {
                        method: "POST",
                        body: { username: e, categoryId: n, access: a },
                      })
                        .then(function (t) {
                          if (((g.disabled = !1), t && t.ok)) {
                            var r = b.find(function (t) {
                              return t.username === e;
                            });
                            if (r) {
                              Array.isArray(r.catAccess) || (r.catAccess = []);
                              var i = r.catAccess.indexOf(n);
                              (a && i < 0 && r.catAccess.push(n),
                                !a && i >= 0 && r.catAccess.splice(i, 1));
                            }
                            C();
                          } else alert((t && t.error) || "Failed");
                        })
                        .catch(function () {
                          ((g.disabled = !1), alert("Couldn't reach server."));
                        }));
                  }
                }),
                v.appendChild(f),
                v.appendChild(h),
                v.appendChild(g),
                A.appendChild(v),
                t("/api/users")
                  .then(function (e) {
                    e &&
                      e.ok &&
                      ((b = (e.users || []).filter(function (e) {
                        return !(i() && e.username.toLowerCase() === i().username.toLowerCase());
                      })).forEach(function (e) {
                        var t = document.createElement("option");
                        ((t.value = e.username), (t.textContent = mpName(e.username)), f.appendChild(t));
                      }),
                      C());
                  })
                  .catch(function () {}));
            }
          })
          .catch(function () {
            A.innerHTML =
              '<div class="dash-empty">Couldn’t load forum data.</div>';
          }));
    }
    function de(e, n) {
      var r = document.querySelector(".dash-avatar-picker");
      r && r.remove();
      var i = document.createElement("div");
      i.className = "dash-avatar-picker";
      var o = n.getBoundingClientRect(),
        s = Math.max(8, Math.min(o.left, window.innerWidth - 328)),
        d = o.bottom + 8;
      (d + 200 > window.innerHeight && (d = Math.max(8, o.top - 208)),
        (i.style.cssText =
          "position:fixed;left:" +
          s +
          "px;top:" +
          d +
          "px;z-index:9999;background:var(--sheet-bg);border:var(--sheet-border);box-shadow:var(--sheet-shadow);backdrop-filter:var(--sheet-blur);-webkit-backdrop-filter:var(--sheet-blur);border-radius:14px;padding:12px;width:min(240px,80vw);color:var(--ink);"));
      var l = document.createElement("div");
      ((l.style.cssText =
        "font-size:13px;font-weight:700;margin-bottom:12px;color:var(--ink);text-align:center;"),
        (l.textContent = "Avatar for " + e),
        i.appendChild(l));
      var c = document.createElement("input");
      ((c.type = "file"), (c.accept = "image/*"), (c.style.display = "none"));
      var p = document.createElement("button");
      ((p.type = "button"),
        (p.textContent = "Upload photo"),
        (p.className = "dash-btn"),
        (p.style.cssText = "width:100%;margin-bottom:8px;"),
        p.addEventListener("click", function () {
          c.click();
        }),
        i.appendChild(p),
        i.appendChild(c));
      var u = document.createElement("button");
      ((u.type = "button"),
        (u.textContent = "Reset to default"),
        (u.className = "dash-btn"),
        (u.style.cssText = "width:100%;margin-bottom:12px;"),
        u.addEventListener("click", function () {
          t("/api/user/" + encodeURIComponent(e) + "/avatar", {
            method: "POST",
            body: { reset: !0 },
          })
            .then(function (t) {
              t && t.ok
                ? ((n.innerHTML = ""), n.appendChild(a(e, "", "sm", void 0)), i.remove())
                : alert((t && t.error) || "Couldn't reset avatar.");
            })
            .catch(function () {
              alert("Couldn't reach server.");
            });
        }),
        i.appendChild(u),
        c.addEventListener("change", function () {
          var r = c.files && c.files[0];
          if (r) {
            /* S-L25: validate type + size before processing */ if (
              !r.type ||
              0 !== r.type.indexOf("image/")
            )
              return alert("Please choose an image file.");
            if (r.size > 5 * 1024 * 1024) return alert("Image must be 5 MB or smaller.");
            var o = new FileReader();
            ((o.onerror = function () {
              alert("Couldn't read that file.");
            }),
              (o.onload = function () {
                var r = new Image();
                ((r.onerror = function () {
                  alert("Couldn't load that image. Try a different file.");
                }),
                  (r.onload = function () {
                    var o = 256,
                      s = document.createElement("canvas");
                    ((s.width = o), (s.height = o));
                    var d = s.getContext("2d"),
                      l = Math.min(r.width, r.height),
                      c = (r.width - l) / 2,
                      p = (r.height - l) / 2;
                    d.drawImage(r, c, p, l, l, 0, 0, o, o);
                    var u = s.toDataURL("image/jpeg", 0.85);
                    t("/api/user/" + encodeURIComponent(e) + "/avatar", {
                      method: "POST",
                      body: { image: u },
                    })
                      .then(function (t) {
                        t && t.ok
                          ? ((n.innerHTML = ""),
                            n.appendChild(a(e, "", "sm", Date.now())),
                            i.remove())
                          : alert((t && t.error) || "Couldn't upload avatar.");
                      })
                      .catch(function () {
                        alert("Couldn't reach server.");
                      });
                  }),
                  (r.src = o.result));
              }),
              o.readAsDataURL(r));
          }
        }));
      var m = document.createElement("button");
      ((m.type = "button"),
        (m.textContent = "Cancel"),
        (m.className = "dash-btn"),
        (m.style.cssText = "width:100%;"),
        m.addEventListener("click", function () {
          i.remove();
        }),
        i.appendChild(m),
        document.body.appendChild(i),
        setTimeout(function () {
          document.addEventListener("click", function e(t) {
            i.contains(t.target) ||
              t.target === n ||
              n.contains(t.target) ||
              (i.remove(), document.removeEventListener("click", e));
          });
        }, 10));
    }
    function le() {
      /* C-L10: re-fetch user list before ban/delete/rename; use the fresh record, not the card snapshot */ function __fresh(
        u,
        fn,
      ) {
        t("/api/users")
          .then(function (r) {
            var f =
              r &&
              r.ok &&
              (r.users || []).filter(function (x) {
                return x.username.toLowerCase() === u.toLowerCase();
              })[0];
            fn(f || null);
          })
          .catch(function () {
            fn(null);
          });
      }
      ((T.dataset.loaded = "1"),
        (T.innerHTML =
          '<div class="dash-empty">Loading users...</div>'),
        t("/api/users")
          .then(function (e) {
            if (e && e.ok && e.users) {
              T.innerHTML = "";
              var n = document.createElement("div");
              ((n.className = "dash-label"),
                (n.textContent = "Stars"),
                T.appendChild(n));
              var r = document.createElement("div");
              r.style.cssText =
                "background:var(--glass-clear-tint);border:var(--glass-hairline);border-radius:14px;padding:12px;margin-bottom:20px;display:flex;flex-direction:column;gap:8px;";
              var o = document.createElement("select");
              ((o.style.cssText = "width:100%;"),
                e.users.forEach(function (e) {
                  var t = document.createElement("option");
                  ((t.value = e.username),
                    (t.textContent = mpName(e.username) + " (★ " + (e.points || 0) + ")"),
                    t.setAttribute("data-stars", e.points || 0),
                    o.appendChild(t));
                }));
              var s = document.createElement("input");
              ((s.type = "number"),
                (s.min = "1"),
                (s.value = "1"),
                s.setAttribute("aria-label", "Amount"));
              var d = document.createElement("button");
              ((d.type = "button"), (d.textContent = "Add"));
              var l = document.createElement("button");
              ((l.type = "button"),
                (l.textContent = "Remove"),
                d.addEventListener("click", function () {
                  u(1);
                }),
                l.addEventListener("click", function () {
                  u(-1);
                }),
                r.appendChild(o));
              var c = document.createElement("div");
              ((c.style.cssText = "display:flex;gap:8px;align-items:center;"),
                (s.className = "dash-input"),
                (s.style.cssText = "width:64px;flex:none;text-align:center;"),
                (d.className = "dash-btn"),
                (d.style.flex = "1"),
                (l.className = "dash-btn t-red"),
                (l.style.flex = "1"),
                c.appendChild(s),
                c.appendChild(d),
                c.appendChild(l),
                r.appendChild(o),
                r.appendChild(c),
                T.appendChild(r));
              var p = document.createElement("div");
              ((p.className = "dash-label"),
                (p.textContent = "All Users (" + e.users.length + ")"),
                T.appendChild(p),
                e.users.forEach(function (e) {
                  var n = document.createElement("div");
                  ((n.style.cssText =
                    "background:var(--glass-clear-tint);border:var(--glass-hairline);border-radius:14px;padding:12px;margin-bottom:10px;"),
                    n.setAttribute("data-usercard", e.username.toLowerCase()));
                  var r = document.createElement("div");
                  r.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:10px;";
                  var o = document.createElement("div");
                  ((o.style.cssText =
                    "width:36px;height:36px;flex:none;cursor:pointer;position:relative;"),
                    o.setAttribute("role", "button"),
                    o.setAttribute("aria-label", "Change avatar for " + e.username),
                    o.setAttribute("title", "Change avatar"),
                    o.appendChild(
                      a(e.username, e.avatar, "sm", e.hasAvatarImg ? e.avatarV : void 0),
                    ),
                    o.addEventListener("click", function () {
                      de(e.username, o);
                    }),
                    r.appendChild(o));
                  var s = document.createElement("div");
                  s.style.cssText = "flex:1;min-width:0;";
                  var d = document.createElement("input");
                  ((d.type = "text"),
                    (d.value = e.username),
                    (d.spellcheck = !1),
                    (d.autocomplete = "off"),
                    (d.style.cssText =
                      "font-size:16px;font-weight:700;background:transparent;border:none;outline:none;color:var(--ink);width:100%;padding:0;"),
                    e.banned && d.classList.add("dash-tag-ban"),
                    d.setAttribute("aria-label", "Username"));
                  var l = e.username;
                  function c() {
                    var e = d.value.trim();
                    if (e && e.toLowerCase() !== l.toLowerCase()) {
                      if (!/^[a-z0-9_]{3,16}$/i.test(e))
                        return (
                          alert("Username must be 3-16 chars (letters, numbers, _)"),
                          void (d.value = l)
                        );
                      ((d.disabled = !0),
                        __fresh(l, function (__f) {
                          if (!__f) {
                            ((d.disabled = !1),
                              (d.value = l),
                              alert("That user changed — refreshing list."),
                              v());
                            return;
                          }
                          t("/api/user/" + encodeURIComponent(__f.username) + "/rename", {
                            method: "POST",
                            body: { newUsername: e },
                          })
                            .then(function (t) {
                              ((d.disabled = !1),
                                t && t.ok
                                  ? ((l = e), (d.value = e), v())
                                  : (alert((t && t.error) || "Rename failed."), (d.value = l)));
                            })
                            .catch(function () {
                              ((d.disabled = !1), (d.value = l), alert("Couldn't reach server."));
                            });
                        }));
                    } else d.value = l;
                  }
                  if (
                    (d.addEventListener("blur", c),
                    d.addEventListener("keydown", function (e) {
                      "Enter" === e.key && d.blur();
                    }),
                    (d.dataset.protected = "check"),
                    s.appendChild(d),
                    e.member)
                  ) {
                    var p = document.createElement("span");
                    ((p.className = "dash-tag-vip"),
                      (p.textContent = " ⭐ VIP"),
                      s.appendChild(p));
                  }
                  if (e.banned) {
                    var u = document.createElement("span");
                    ((u.className = "dash-tag-ban"),
                      (u.textContent = " (banned)"),
                      s.appendChild(u));
                  }
                  var x = document.createElement("div");
                  ((x.style.cssText = "font-size:12px;color:var(--muted);"),
                    x.setAttribute("data-stars-display", ""));
                  var f = document.createElement("span");
                  ((f.textContent = "★ " + (e.points || 0)),
                    f.setAttribute("data-stars-display", ""),
                    x.appendChild(f),
                    x.appendChild(
                      document.createTextNode(
                        " · Joined " +
                          new Date(e.createdAt).toLocaleDateString(void 0, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }),
                      ),
                    ),
                    s.appendChild(x),
                    r.appendChild(s),
                    n.appendChild(r));
                  var h = document.createElement("div");
                  h.className = "dash-ubtns";
                  var g = i(),
                    b = g && e.username.toLowerCase() === g.username.toLowerCase(),
                    y = "grim" === e.username.toLowerCase();
                  function C(e, t, n) {
                    var a = document.createElement("button");
                    return (
                      (a.type = "button"),
                      (a.textContent = e),
                      (a.className = "dash-btn " + t),
                      a.addEventListener("click", function () {
                        n(a);
                      }),
                      h.appendChild(a),
                      a
                    );
                  }
                  if (
                    ((b || y) &&
                      "check" === d.dataset.protected &&
                      ((d.disabled = !0), (d.style.opacity = ".8")),
                    C("Clear", "t-orange", function (n) {
                      confirm("Delete all messages from " + e.username + "?") &&
                        ((n.disabled = !0),
                        t("/api/user/" + encodeURIComponent(e.username) + "/clear-messages", {
                          method: "POST",
                          body: {},
                        })
                          .then(function (e) {
                            ((n.disabled = !1),
                              alert(
                                e && e.ok
                                  ? "Deleted " + (e.removed || 0) + " messages."
                                  : "Failed.",
                              ));
                          })
                          .catch(function () {
                            ((n.disabled = !1), alert("Couldn't reach server."));
                          }));
                    }),
                    b || y)
                  ) {
                    var E = document.createElement("div");
                    ((E.style.cssText = "font-size:12px;color:var(--muted);font-style:italic;margin-bottom:6px;"),
                      (E.textContent = b ? "This is you." : "Bot account."),
                      n.insertBefore(E, r));
                  } else
                    (C(e.banned ? "Unban" : "Ban", e.banned ? "t-green" : "t-red", function (n) {
                      __fresh(e.username, function (__f) {
                        if (!__f) {
                          (alert("That user changed — refreshing list."), v());
                          return;
                        }
                        var __b = !!__f.banned;
                        (__b || confirm("Ban " + __f.username + "?")) &&
                          ((n.disabled = !0),
                          t("/api/ban", {
                            method: "POST",
                            body: { username: __f.username, banned: !__b },
                          })
                            .then(function (e) {
                              e && e.ok ? v() : (alert("Failed."), (n.disabled = !1));
                            })
                            .catch(function () {
                              ((n.disabled = !1), alert("Couldn't reach server."));
                            }));
                      });
                    }),
                      C(
                        e.member ? "Remove VIP" : "VIP",
                        e.member ? "t-gray" : "t-yellow",
                        function (n) {
                          if (e.member) {
                            if (!confirm("Remove VIP status from " + e.username + "?")) return;
                            return (
                              (n.disabled = !0),
                              void t("/api/user/" + encodeURIComponent(e.username) + "/member", {
                                method: "POST",
                                body: { member: !1, amount: null },
                              })
                                .then(function (e) {
                                  e && e.ok ? v() : (alert("Failed."), (n.disabled = !1));
                                })
                                .catch(function () {
                                  ((n.disabled = !1), alert("Couldn't reach server."));
                                })
                            );
                          }
                          m(e.username, function (a) {
                            ((n.disabled = !0),
                              t("/api/user/" + encodeURIComponent(e.username) + "/member", {
                                method: "POST",
                                body: { member: !0, amount: a },
                              })
                                .then(function (e) {
                                  e && e.ok ? v() : (alert("Failed."), (n.disabled = !1));
                                })
                                .catch(function () {
                                  ((n.disabled = !1), alert("Couldn't reach server."));
                                }));
                          });
                        },
                      ),
                      C("Delete", "t-red", function (n) {
                        __fresh(e.username, function (__f) {
                          if (!__f) {
                            (alert("That user changed — refreshing list."), v());
                            return;
                          }
                          confirm(
                            "DELETE " + __f.username + " permanently? Their account will be gone.",
                          ) &&
                            confirm("Are you sure? This cannot be undone.") &&
                            ((n.disabled = !0),
                            t("/api/user/" + encodeURIComponent(__f.username), { method: "DELETE" })
                              .then(function (e) {
                                e && e.ok
                                  ? v()
                                  : (alert((e && e.error) || "Delete failed."), (n.disabled = !1));
                              })
                              .catch(function () {
                                (alert("Couldn't reach server."), (n.disabled = !1));
                              }));
                        });
                      }));
                  (n.appendChild(h), T.appendChild(n));
                }),
                (T._refresh = v),
                e.users.length ||
                  (T.innerHTML =
                    '<div class="dash-empty">No users yet.</div>'));
            } else
              T.innerHTML =
                '<div class="dash-empty">Could not load users.</div>';
            function u(e) {
              var n = o.value,
                a = Math.max(1, parseInt(s.value, 10) || 1) * e;
              t("/api/user/stars", { method: "POST", body: { username: n, delta: a } })
                .then(function (e) {
                  if (e && e.ok) {
                    var t = o.querySelector('option[value="' + CSS.escape(n) + '"]'),
                      r = Math.max(0, (parseInt(t.getAttribute("data-stars"), 10) || 0) + a);
                    (t.setAttribute("data-stars", r), (t.textContent = n + " (★ " + r + ")"));
                    for (var i = T.querySelectorAll("[data-usercard]"), s = 0; s < i.length; s++)
                      if (i[s].getAttribute("data-usercard") === n.toLowerCase()) {
                        var d = i[s].querySelector("[data-stars-display]");
                        d && (d.textContent = "★ " + r);
                      }
                  } else alert((e && e.error) || "Failed to update stars.");
                })
                .catch(function () {
                  alert("Couldn't reach server.");
                });
            }
            function m(e, t) {
              var n = document.createElement("div");
              n.className = "mp-dialog-back";
              var a = document.createElement("div");
              a.className = "mp-dialog";
              var r = document.createElement("div");
              ((r.className = "mp-dialog-title"),
                (r.textContent = "VIP status for " + e),
                a.appendChild(r));
              var i = document.createElement("div");
              i.className = "member-segs";
              var o = 5;
              ([5, 10, 15, 20].forEach(function (e, t) {
                var n = document.createElement("button");
                ((n.type = "button"),
                  (n.textContent = "$" + e),
                  0 === t && (n.className = "on"),
                  n.addEventListener("click", function () {
                    ((o = e),
                      i.querySelectorAll("button").forEach(function (e) {
                        e.classList.remove("on");
                      }),
                      n.classList.add("on"));
                  }),
                  i.appendChild(n));
              }),
                a.appendChild(i));
              var s = document.createElement("div");
              s.className = "mp-dialog-actions";
              var d = document.createElement("button");
              ((d.type = "button"),
                (d.className = "mp-dialog-cancel"),
                (d.textContent = "Cancel"),
                d.addEventListener("click", function () {
                  n.remove();
                }));
              var l = document.createElement("button");
              ((l.type = "button"),
                (l.className = "mp-dialog-grant"),
                (l.textContent = "Grant"),
                l.addEventListener("click", function () {
                  (n.remove(), t(o));
                }),
                s.appendChild(d),
                s.appendChild(l),
                a.appendChild(s),
                n.appendChild(a),
                n.addEventListener("click", function (e) {
                  e.target === n && n.remove();
                }),
                document.body.appendChild(n));
            }
            function v() {
              (delete T.dataset.loaded, le());
            }
          })
          .catch(function () {
            T.innerHTML =
              '<div class="dash-empty">Could not load users.</div>';
          }));
    }
    ((oe.type = "button"),
      (oe.className = "dash-btn t-red f-red"),
      (oe.textContent = "Clear Chat"),
      oe.addEventListener("click", function () {
        /* B-M1: in-page dialog instead of confirm() */ var __b = document.createElement("div");
        __b.className = "mp-dialog-back";
        var __d = document.createElement("div");
        __d.className = "mp-dialog";
        var __t = document.createElement("div");
        ((__t.className = "mp-dialog-title"),
          (__t.textContent = "Clear all chat messages?"),
          __d.appendChild(__t));
        var __m = document.createElement("div");
        ((__m.style.cssText = "font-size:13px;opacity:.7;margin-bottom:12px;"),
          (__m.textContent = "This cannot be undone."),
          __d.appendChild(__m));
        var __a = document.createElement("div");
        __a.className = "mp-dialog-actions";
        var __c = document.createElement("button");
        ((__c.type = "button"),
          (__c.className = "mp-dialog-cancel"),
          (__c.textContent = "Cancel"),
          __c.addEventListener("click", function () {
            __b.remove();
          }));
        var __g = document.createElement("button");
        ((__g.type = "button"),
          (__g.className = "mp-dialog-grant mp-dialog-danger"),
          (__g.textContent = "Clear"),
          __g.addEventListener("click", function () {
            (__b.remove(),
              (oe.disabled = !0),
              (oe.textContent = "Clearing..."),
              t("/api/clear", { method: "POST", body: {} })
                .then(function (e) {
                  e && e.ok ? n() : ((oe.disabled = !1), (oe.textContent = "Clear Chat"));
                })
                .catch(function () {
                  ((oe.disabled = !1), (oe.textContent = "Clear Chat"));
                }));
          }),
          __a.appendChild(__c),
          __a.appendChild(__g),
          __d.appendChild(__a),
          __b.appendChild(__d),
          __b.addEventListener("click", function (e) {
            e.target === __b && __b.remove();
          }),
          document.body.appendChild(__b));
      }),
      re.appendChild(oe),
      k.appendChild(re));
    var ce = document.createElement("button");
    ((ce.className = "msg-popup-close"),
      (ce.textContent = "Close"),
      
      (ce.onclick = function (e) {
        (e.stopPropagation(), n());
      }),
      l.appendChild(ce),
      d.appendChild(__dw),
      (d.onclick = function (e) {
        e.target === d && n();
      }),
      document.body.appendChild(d),
      quiet || (e.fadeSheetIn && e.fadeSheetIn(l)));
  }
  ((window.openAnalytics = function () {
    n();
    var _cached = null;
    try {
      _cached = JSON.parse(localStorage.getItem("mp-analytics-cache") || "null");
    } catch (e) {
      _cached = null;
    }
    var _openedAt = Date.now();
    if (_cached && _cached.stats && typeof _cached.stats === "object") {
      try {
        buildDashboard(_cached.stats);
      } catch (e) {
        _cached = null;
      }
    }
    t("/api/analytics/stats")
      .then(function (o) {
        if (!o || !o.ok) throw new Error("unauthorized: " + JSON.stringify(o));
        try {
          localStorage.setItem(
            "mp-analytics-cache",
            JSON.stringify({ ts: Date.now(), stats: o.stats }),
          );
        } catch (e) {}
        // First open (no cache yet): build from the fresh stats.
        var sh = document.querySelector(".dashboard-sheet");
        if (!sh) return buildDashboard(o.stats);
        /* The sheet was drawn from the cached copy: swap in the fresh numbers
           (quietly, same tab + scroll) so it never shows stale data, unless
           dc is already mid-action (a dialog/picker open or a while later). */
        if (
          _cached &&
          JSON.stringify(_cached.stats) !== JSON.stringify(o.stats) &&
          Date.now() - _openedAt < 8000 &&
          !sh.dataset.interacted &&
          !document.querySelector(".mp-dialog-back, .dash-avatar-picker")
        ) {
          var st = sh.scrollTop,
            tab = null;
          sh.querySelectorAll('button[aria-label="Chat"],button[aria-label="Forum"],button[aria-label="Manage"]').forEach(function (b) {
            b.style.color === "var(--ink)" && (tab = b.getAttribute("aria-label"));
          });
          buildDashboard(o.stats, !0);
          var nsh = document.querySelector(".dashboard-sheet");
          if (nsh) {
            tab && tab !== "Chat" && (nsh.querySelector('button[aria-label="' + tab + '"]') || { click: function () {} }).click();
            nsh.scrollTop = st;
          }
        }
      })
      .catch(function (e) {
        if (document.querySelector(".dashboard-sheet")) return;
        n();
        var t = document.createElement("div");
        ((t.className = "msg-popup"), (t.id = "msg-popup"));
        var a = document.createElement("div");
        ((a.className = "msg-popup-inner"),
          (a.innerHTML =
            '<p style="font-size:15px;margin:0 0 8px;">Couldn\'t load analytics.</p>'));
        var r = document.createElement("p");
        ((r.style.cssText = "font-size:12px;opacity:.6;margin:0 0 16px;word-break:break-all;"),
          (r.textContent = String(e.message || e).substring(0, 200)),
          a.appendChild(r));
        var i = document.createElement("button");
        ((i.className = "msg-popup-close"),
          (i.textContent = "Close"),
          (i.onclick = function () {
            n();
          }),
          a.appendChild(i),
          t.appendChild(a),
          (t.onclick = function (e) {
            e.target === t && n();
          }),
          document.body.appendChild(t));
      });
  }),
    (function () {
      function e() {
        "#analytics" === location.hash &&
          (history.replaceState(null, "", location.pathname),
          window.openAnalytics && window.openAnalytics());
      }
      (window.addEventListener("hashchange", e),
        "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", e) : e());
    })());
})();
