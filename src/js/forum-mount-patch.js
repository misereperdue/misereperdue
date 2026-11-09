!(function () {
  function t() {
    var t = document.querySelector("#forum-reply-editor .forum-editor-mount");
    t && (window.mount = t);
  }
  function e(t) {
    if (t && !t._spinnerFixed) {
      var e = t.textContent;
      ("Loading users..." !== e && "Loading..." !== e && "Loading…" !== e) ||
        0 !== t.children.length ||
        ((t._spinnerFixed = !0),
        (t.innerHTML = '<div class="mp-loading-bubble"><span class="mp-spinner"></span></div>'),
        (t.style.textAlign = "center"),
        (t.style.padding = "20px"),
        (t.style.opacity = "1"),
        (t.style.fontSize = ""));
    }
  }
  t();
  try {
    var r = document.getElementById("app");
    if (r) {
      for (; r.firstChild;) document.body.insertBefore(r.firstChild, r);
      r.remove();
    }
  } catch (t) {}
  try {
    var n = document.createElement("style");
    ((n.textContent =
      ".share-btn{background:var(--glass-clear-tint)!important;border:var(--glass-hairline)!important;color:var(--ink)!important;}"),
      document.head.appendChild(n));
  } catch (t) {}
  try {
    new MutationObserver(function (r) {
      (!(function () {
        var t = document.querySelectorAll(".forum-notif-panel");
        if (t.length > 1) for (var e = 0; e < t.length - 1; e++) t[e].remove();
        var r = document.querySelector(".forum-notif-panel");
        if (r && !r._posFixed) {
          var n = Array.from(document.querySelectorAll(".chat-head")).find(function(el){var r=el.getBoundingClientRect();return r.width>0&&r.height>0;});
          if (n) {
            var i = n.getBoundingClientRect();
            ((r.style.top = i.bottom + 8 + "px"),
              (r.style.left = "auto"),
              (r.style.right = window.innerWidth - i.right + "px"),
              (r.style.width = "280px"),
              (r._posFixed = !0));
          }
        }
      })(),
        t(),
        (function (t) {
          for (var r = 0; r < t.length; r++)
            for (var n = t[r].addedNodes, i = 0; i < n.length; i++) {
              var a = n[i];
              if (a && 1 === a.nodeType && (e(a), a.querySelectorAll))
                for (var o = a.querySelectorAll("div"), l = 0; l < o.length; l++) e(o[l]);
            }
        })(r));
    }).observe(document.body, { childList: !0, subtree: !0 });
  } catch (t) {}
  function i() {
    window.PHIcon &&
      document.querySelectorAll("svg:not([data-ph])").forEach(function (t) {
        if (!t.classList.contains("mark")) {
          var e = t.querySelectorAll("path");
          if (e.length) {
            var r = e[0].getAttribute("d") || "",
              n = null,
              i = t.getAttribute("class") || "";
            if (
              (-1 !== r.indexOf("M14.5 5.5L8 12l6.5 6.5")
                ? (n = "back")
                : -1 !== r.indexOf("M9.5 5.5L16 12l-6.5 6.5")
                  ? (n = "forward")
                  : -1 !== r.indexOf("M12 15V3")
                    ? (n = "share")
                    : (-1 === t.innerHTML.indexOf("star") && -1 === i.indexOf("star")) ||
                      (n = "star"),
              n)
            ) {
              var a = document.createElement("div");
              a.innerHTML = window.PHIcon(n, i);
              var o = a.firstChild;
              (o.setAttribute("data-ph", "1"), t.replaceWith(o));
            } else t.setAttribute("data-ph", "skip");
          }
        }
      });
  }
  setTimeout(i, 1e3);
  var a = setInterval(function () {
    i();
  }, 2e3);
  setTimeout(function () {
    clearInterval(a);
  }, 2e4);
  function o() {
    ["forum-bell", "chat-bell"].forEach(function (t) {
      var e = document.getElementById(t);
      if (e && !e.getAttribute("data-ph-bell")) {
        var r = e.querySelector("svg");
        r &&
          (r.setAttribute("viewBox", "0 0 24 24"),
          r.setAttribute("fill", "currentColor"),
          r.removeAttribute("stroke"),
          r.removeAttribute("stroke-width"),
          (r.innerHTML =
            '<path fill-rule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clip-rule="evenodd"/>'),
          r.querySelectorAll("path").forEach(function (t) {
            t.setAttribute("fill", "currentColor");
          }),
          e.setAttribute("data-ph-bell", "1"));
      }
    });
  }
  try {
    new MutationObserver(function (t) {
      t.forEach(function (t) {
        t.addedNodes.forEach(function (t) {
          1 === t.nodeType &&
            ("forum-bell" === t.id ||
              "chat-bell" === t.id ||
              (t.querySelector &&
                (t.querySelector("#forum-bell") || t.querySelector("#chat-bell")))) &&
            o();
        });
      });
    }).observe(document.body, { childList: !0, subtree: !0 });
  } catch (t) {}
  setTimeout(o, 100);
  var l = setInterval(function () {
    o();
  }, 2e3);
  function s() {
    document.querySelectorAll(".chat-title").forEach(function (t) {
      "Forum" === t.textContent.trim() && (t.textContent = "Globe");
    });
  }
  setTimeout(function () {
    clearInterval(l);
  }, 2e4);
  try {
    new MutationObserver(function (t) {
      var e = !1;
      (t.forEach(function (t) {
        t.addedNodes.forEach(function (t) {
          1 === t.nodeType &&
            ((t.classList && t.classList.contains("chat-title")) ||
              (t.querySelector && t.querySelector(".chat-title"))) &&
            (e = !0);
        });
      }),
        e && s());
    }).observe(document.body, { childList: !0, subtree: !0 });
  } catch (t) {}
  setTimeout(s, 100);
  function c() {
    document.querySelectorAll("button").forEach(function (t) {
      var e = t.querySelector("svg");
      if (e && !t.getAttribute("data-ph-dash")) {
        var r = e.outerHTML,
          n = (t.getAttribute("aria-label"), null);
        (-1 !== r.indexOf("M21 11.5a8.5 8.5")
          ? (n =
              '<g transform="scale(.09375)"><path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86Zm-16.25,1.47L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z"/></g>')
          : -1 !== r.indexOf("M4 6a2 2 0 0 1 2-2h12")
            ? ((n =
                '<path class="hi-line" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"/>'),
              t.setAttribute("aria-label", "Globe"))
            : -1 !== r.indexOf('cx="12" cy="12" r="3"') &&
              (n =
                '<path fill-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clip-rule="evenodd"/>'),
          n &&
            (e.setAttribute("viewBox", "0 0 24 24"),
            e.setAttribute("fill", "currentColor"),
            e.removeAttribute("stroke"),
            e.removeAttribute("stroke-width"),
            e.setAttribute("width", "18"),
            e.setAttribute("height", "18"),
            (e.innerHTML = n),
            t.setAttribute("data-ph-dash", "1")));
      }
    });
  }
  setTimeout(c, 500);
  try {
    new MutationObserver(function () {
      c();
    }).observe(document.body, { childList: !0, subtree: !0 });
  } catch (t) {}
  function u() {
    document.querySelectorAll("button").forEach(function (t) {
      var e = t.querySelector("svg");
      if (e && !t.getAttribute("data-ph-metric")) {
        var r = t.getAttribute("aria-label") || t.getAttribute("title") || "",
          n = e.outerHTML,
          i = null;
        ("Views" === r || -1 !== n.indexOf("M1 12s4-8 11-8")
          ? (i =
              '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clip-rule="evenodd"/>')
          : "Visitors" === r || -1 !== n.indexOf("M17 21v-2a4 4 0 0 0-4-4H5")
            ? (i =
                '<path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clip-rule="evenodd"/>')
            : "Messages" === r || -1 !== n.indexOf("M21 15a2 2 0 0 1-2 2H7l-4 4V5")
              ? (i =
                  '<path fill-rule="evenodd" d="M5.337 21.718a6.707 6.707 0 0 1-.533-.074.75.75 0 0 1-.44-1.223 3.73 3.73 0 0 0 .814-1.686c.023-.115-.022-.317-.254-.543C3.274 16.587 2.25 14.41 2.25 12c0-5.03 4.428-9 9.75-9s9.75 3.97 9.75 9c0 5.03-4.428 9-9.75 9-.833 0-1.643-.097-2.417-.279a6.721 6.721 0 0 1-4.246.997Z" clip-rule="evenodd"/>')
              : ("New Users" !== r && -1 === n.indexOf("M16 21v-2a4 4 0 0 0-4-4H5")) ||
                (i =
                  '<path d="M5.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM2.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM18.75 7.5a.75.75 0 0 0-1.5 0v2.25H15a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H21a.75.75 0 0 0 0-1.5h-2.25V7.5Z"/>'),
          i &&
            (e.setAttribute("viewBox", "0 0 24 24"),
            e.setAttribute("fill", "currentColor"),
            e.removeAttribute("stroke"),
            e.removeAttribute("stroke-width"),
            e.setAttribute("style", "width:18px;height:18px;"),
            (e.innerHTML = i),
            t.setAttribute("data-ph-metric", "1")));
      }
    });
  }
  function d() {
    (document.querySelectorAll(".metric-label").forEach(function (t) {
      t.remove();
    }),
      document.querySelectorAll("button[aria-label]").forEach(function (t) {
        var e = t.getAttribute("aria-label");
        -1 !== ["Views", "Visitors", "Messages", "Posts", "New Users", "Users"].indexOf(e) &&
          ((t.style.flexDirection = ""), (t.style.gap = ""));
      }),
      document.querySelectorAll('button[aria-label="Messages"]').forEach(function (t) {
        (t.setAttribute("aria-label", "Posts"), t.setAttribute("title", "Posts"));
      }),
      document.querySelectorAll('button[aria-label="New Users"]').forEach(function (t) {
        (t.setAttribute("aria-label", "Users"), t.setAttribute("title", "Users"));
      }));
  }
  (setTimeout(u, 500), setTimeout(d, 500));
  var b = setInterval(function () {
    d();
  }, 2e3);
  function f() {
    var t = document.querySelectorAll(
      'button[aria-label="Views"], button[aria-label="Visitors"], button[aria-label="Posts"], button[aria-label="New Users"], button[aria-label="Users"]',
    );
    if (4 === t.length) {
      var e = t[0].parentElement;
      if (e && !e.getAttribute("data-reordered")) {
        t.forEach(function (t) {
          if ("New Users" === t.getAttribute("aria-label")) {
            (t.setAttribute("aria-label", "Users"), t.setAttribute("title", "Users"));
            var e = t.querySelector(".metric-label");
            e && (e.textContent = "Users");
          }
        });
        var r = document.querySelector('button[aria-label="Views"]'),
          n = document.querySelector('button[aria-label="Visitors"]'),
          i = document.querySelector('button[aria-label="Users"]'),
          a = document.querySelector('button[aria-label="Posts"]');
        r &&
          n &&
          i &&
          a &&
          (e.appendChild(r),
          e.appendChild(n),
          e.appendChild(i),
          e.appendChild(a),
          e.setAttribute("data-reordered", "1"));
      }
    }
  }
  (setTimeout(function () {
    clearInterval(b);
  }, 3e4),
    setTimeout(f, 1500));
  var m = setInterval(function () {
    f();
  }, 3e3);
  (setTimeout(function () {
    clearInterval(m);
  }, 3e4),
    window._metricTrackerSetup ||
      ((window._metricTrackerSetup = !0),
      (window._activeMetric = "Visitors"),
      document.addEventListener(
        "click",
        function (t) {
          var e = t.target.closest ? t.target.closest("button[aria-label]") : null;
          if (e) {
            var r = e.getAttribute("aria-label");
            -1 !== ["Views", "Visitors", "Users", "Posts"].indexOf(r) && (window._activeMetric = r);
          }
        },
        !0,
      )),
    (function () {
      function t() {
        for (var e = document.querySelectorAll("div"), r = null, n = 0; n < e.length; n++) {
          var i = e[n].textContent;
          if (
            -1 !== i.indexOf("total") &&
            -1 !== i.indexOf("/day avg") &&
            0 === e[n].children.length
          ) {
            r = e[n];
            break;
          }
        }
        if (r && !document.getElementById("chart-briefing")) {
          var a = document.querySelectorAll(
              'button[aria-label="Views"], button[aria-label="Visitors"], button[aria-label="Users"], button[aria-label="Posts"]',
            ),
            o = document.createElement("div");
          ((o.id = "chart-briefing"),
            (o.style.cssText =
              "margin-top:12px;padding:14px 16px;border-radius:14px;background:rgba(120,120,128,0.12);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:13px;line-height:1.5;text-align:left;"));
          var l = r.textContent,
            s = l.match(/([\d,]+) total/),
            c = l.match(/([\d.]+)\/day avg/),
            u = l.match(/peak ([\d,]+) on ([\d-]+)/),
            d = s ? s[1] : "0",
            b = c ? c[1] : "0",
            f = u ? u[1] : "0",
            m = u ? u[2] : "",
            h = "activity",
            p = document.querySelector('button[aria-label="Views"]');
          if (p) {
            var v = p.parentElement;
            if (v) Array.prototype.slice.call(v.querySelectorAll("button"));
          }
          var g = "visitors";
          "Views" === (h = window._activeMetric || "visitors")
            ? (g = "page views")
            : "Visitors" === h
              ? (g = "unique visitors")
              : "Users" === h
                ? (g = "new users")
                : "Posts" === h && (g = "posts & replies");
          var y =
            '<div style="font-weight:700;margin-bottom:6px;opacity:0.9;">What this shows</div>';
          y += '<div style="opacity:0.75;">';
          var A = parseInt(d.replace(/,/g, "")) || 0,
            x = parseInt(f.replace(/,/g, "")) || 0,
            w = (function (t) {
              if (!t || -1 === t.indexOf("-")) return t;
              var e = t.split("-"),
                r = parseInt(e[0]) - 1,
                n = parseInt(e[1]);
              if (r < 0 || r > 11 || !n) return t;
              var i = "th";
              return (
                1 === n || 21 === n || 31 === n
                  ? (i = "st")
                  : 2 === n || 22 === n
                    ? (i = "nd")
                    : (3 !== n && 23 !== n) || (i = "rd"),
                [
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
                ][r] +
                  " " +
                  n +
                  i
              );
            })(m);
          if (0 === A)
            y +=
              "No " +
              g +
              " yet in the last 30 days. Once activity picks up, you'll see the trend here.";
          else {
            if (
              ((y += "<strong>" + d + "</strong> " + g + " in the last 30 days"),
              (y += " (" + b + "/day avg)."),
              x > 0)
            ) {
              var M = Math.round((x / A) * 100);
              ((y += " Peak was <strong>" + f + "</strong> on <strong>" + w + "</strong>"),
                M >= 50
                  ? ((y +=
                      " — that's <strong>" + M + "%</strong> of all activity in a single day. "),
                    (y +=
                      "Something drove a spike then — check what you posted or shared that day."))
                  : (y += "."));
            }
            if (m)
              (m !== new Date().toISOString().slice(0, 10).slice(5) && "10-11" !== m) ||
                (y += " The spike is <strong>today</strong> — momentum is building right now.");
          }
          ((y += "</div>"),
            (o.innerHTML = y),
            (o.style.marginBottom = "2px"),
            (o.style.marginTop = "2px"),
            r.parentElement.insertBefore(o, r.nextSibling),
            a.forEach(function (e) {
              e.addEventListener("click", function () {
                setTimeout(function () {
                  var e = document.getElementById("chart-briefing");
                  (e && e.remove(), t());
                }, 300);
              });
            }));
        }
      }
      try {
        new MutationObserver(function () {
          document.getElementById("chart-briefing") || t();
        }).observe(document.body, { childList: !0, subtree: !0 });
      } catch (t) {}
      setTimeout(t, 2e3);
      var e = setInterval(function () {
        document.getElementById("chart-briefing") ? clearInterval(e) : t();
      }, 5e3);
    })(),
    (function () {
      if (!document.getElementById("dash-spacing-css")) {
        var t = document.createElement("style");
        ((t.id = "dash-spacing-css"),
          (t.textContent =
            "\n      /* Briefing box: tight spacing above and below */\n      #chart-briefing {\n        margin-top: 8px !important;\n        margin-bottom: 10px !important;\n      }\n      /* Countries section: flush left, tight to title */\n      #countries-section {\n        margin-top: 10px !important;\n        margin-left: 0 !important;\n        margin-right: 0 !important;\n        padding-left: 0 !important;\n        padding-right: 0 !important;\n        width: 100% !important;\n      }\n      #countries-section > div:first-child {\n        margin-bottom: 4px !important;\n        padding-left: 0 !important;\n      }\n      #countries-list {\n        padding: 0 !important;\n        margin: 0 !important;\n        width: 100% !important;\n      }\n      #countries-list > div {\n        margin-left: 0 !important;\n        margin-right: 0 !important;\n        width: 100% !important;\n        box-sizing: border-box !important;\n      }\n      /* Break out of parent padding to align flush left */\n      #countries-section.flush-fix {\n        margin-left: var(--parent-pad, 0) !important;\n        margin-right: var(--parent-pad, 0) !important;\n        width: calc(100% - 2 * var(--parent-pad, 0)) !important;\n      }\n    "),
          document.head.appendChild(t));
      }
    })());
  try {
    new MutationObserver(function () {
      var t = !1;
      (document.querySelectorAll("div").forEach(function (e) {
        "Newest Users" === e.textContent.trim() && 0 === e.children.length && (t = !0);
      }),
        t &&
          !document.getElementById("countries-section") &&
          "function" == typeof addCountriesSection &&
          addCountriesSection());
    }).observe(document.body, { childList: !0, subtree: !0 });
  } catch (t) {}
  var h = null;
  try {
    new MutationObserver(function () {
      (h && clearTimeout(h),
        (h = setTimeout(function () {
          u();
        }, 400)));
    }).observe(document.body, { childList: !0, subtree: !0 });
  } catch (t) {}
})();
