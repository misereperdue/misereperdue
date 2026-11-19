/* Owner dashboard (redesign #383, per dc): only the numbers that matter, every admin action in one place.
   Tabs: Overview (status + key stats + recent signups, orders, activity), People (search + per-user
   actions), Forum (categories), Tools (Yell, FM, chat, media); tab bar: Overview / Categories / People / Tools.
   Every request goes through MPChat.api with the owner's session; the Worker checks owner on each
   endpoint, and this file only runs for the owner (the Dashboard pill/hash are owner-only).
   Sections whose endpoint isn't live yet (/api/admin/orders, /api/admin/log) stay hidden. */
!(function () {
  "use strict";
  function M() { return window.MPChat || {}; }
  function api(path, opt) { return M().api(path, opt); }
  function nm(u) { return (window.mpName || function (x) { return String(x == null ? "" : x).replace(/^@+/, "").toLowerCase(); })(u); }
  function at(u) { var n = nm(u); return n ? "@" + n : ""; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { return Math.round(Number(v) || 0).toLocaleString("en-US"); }
  function el(tag, cls, html) { var e = document.createElement(tag); cls && (e.className = cls); html != null && (e.innerHTML = html); return e; }
  function btn(label, cls, fn) { var b = el("button", "dz-btn" + (cls ? " " + cls : "")); b.type = "button"; b.textContent = label; fn && b.addEventListener("click", fn); return b; }
  function ago(ts) {
    var s = Math.max(0, (Date.now() - (Number(ts) || 0)) / 1e3);
    return s < 60 ? "now" : s < 3600 ? Math.floor(s / 60) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : s < 2592e3 ? Math.floor(s / 86400) + "d" : new Date(ts).toLocaleDateString(void 0, { month: "short", day: "numeric" });
  }
  function money(v, cur) {
    try { return new Intl.NumberFormat(void 0, { style: "currency", currency: (cur || "CAD").toUpperCase(), currencyDisplay: "narrowSymbol", maximumFractionDigits: v >= 1e3 ? 0 : 2 }).format(v || 0); }
    catch (e) { return "$" + Math.round(v || 0); }
  }
  function confirmBox(title, msg, ok, danger) {
    return new Promise(function (res) {
      var b = el("div", "mp-dialog-back"), d = el("div", "mp-dialog");
      d.setAttribute("role", "dialog");
      d.innerHTML = '<div class="mp-dialog-title">' + esc(title) + "</div>" + (msg ? '<div class="dz-dlg-msg">' + esc(msg) + "</div>" : "") + '<div class="mp-dialog-actions"></div>';
      var a = d.querySelector(".mp-dialog-actions");
      function done(v) { b.remove(); res(v); }
      var c = el("button", "mp-dialog-cancel"); c.type = "button"; c.textContent = "Cancel"; c.onclick = function () { done(!1); };
      var g = el("button", "mp-dialog-grant" + (danger ? " mp-dialog-danger" : "")); g.type = "button"; g.textContent = ok; g.onclick = function () { done(!0); };
      a.appendChild(c); a.appendChild(g); b.appendChild(d);
      b.addEventListener("click", function (e) { e.target === b && done(!1); });
      document.body.appendChild(b);
    });
  }
  /* Runs an action on a button: spinner text, then the result in the shared status line. */
  function run(b, status, req, okMsg, after) {
    if (b.disabled) return;
    var label = b.textContent;
    b.disabled = !0; b.textContent = "\u2026";
    return Promise.resolve(req()).then(function (j) {
      if (!j || j.ok === !1 || j.error) throw new Error((j && j.error) || "Didn't work");
      status && (status.textContent = typeof okMsg === "function" ? okMsg(j) : okMsg || "Done.");
      after && after(j);
      return j;
    }).catch(function (e) {
      status && (status.textContent = (e && e.message) || "Didn't work");
    }).finally(function () { b.disabled = !1; b.textContent === "\u2026" && (b.textContent = label); });
  }
  function host() { try { return window.MPDashHost ? window.MPDashHost() : null; } catch (e) { return null; } }

  var TITLE = "Mis\u00e8re Perdue \u00b7 Dashboard", prevTitle = null, titleTimer = 0;
  function holdTitle(root) {
    prevTitle == null && (prevTitle = document.title);
    document.title = TITLE;
    clearInterval(titleTimer);
    titleTimer = setInterval(function () {
      if (root.isConnected) return;
      clearInterval(titleTimer);
      document.title === TITLE && prevTitle != null && (document.title = prevTitle);
      prevTitle = null;
    }, 800);
  }

  /* ---------- Overview ---------- */
  function statTile(label, value, sub) {
    var t = el("div", "dz-stat");
    t.innerHTML = '<span class="dz-stat-l">' + esc(label) + '</span><b class="dz-stat-v">' + esc(value) + '</b><span class="dz-stat-s">' + esc(sub || "") + "</span>";
    return t;
  }
  function paintStats(box, s) {
    s = s || {};
    var days = s.days || [], sm = s.summary || {}, today = days[0] || {};
    var sum = function (k, n) { return days.slice(0, n || 30).reduce(function (a, d) { return a + (Number(d[k]) || 0); }, 0); };
    var act7 = sum("active", 7) / 7, new7 = sum("newUsers", 7);
    box.replaceChildren(
      statTile("Members", num(sm.members), new7 ? "+" + num(new7) + " this week" : "none new this week"),
      statTile("VIP", num(sm.vip), sm.members ? Math.round((sm.vip || 0) * 100 / sm.members) + "% of members" : ""),
      statTile("Active today", num(today.active), "7-day avg " + act7.toFixed(1)),
      s.shop && s.shop.connected
        ? statTile("Revenue", money(sum("revenue"), s.shop.currency), num(sum("orders")) + " orders \u00b7 30 days")
        : statTile("Visitors", num(sum("visitors", 7)), num(sum("views", 7)) + " views \u00b7 7 days")
    );
  }
  function liveLine(box, s) {
    var on = typeof window.MPOnlineCount === "number" ? window.MPOnlineCount : (s && s.summary && s.summary.online) || 0;
    box.innerHTML = '<span class="dz-dot' + (on ? " is-on" : "") + '"></span>' + num(on) + " online";
  }
  function section(title, extra) {
    var s = el("section", "dz-card");
    s.innerHTML = '<div class="dz-h"><span>' + esc(title) + "</span>" + (extra || "") + "</div>";
    return s;
  }
  function userRow(u, meta) {
    var r = el("div", "dz-row");
    var av = M().avatarNode ? M().avatarNode(u.username, u.avatar, "sm", u.hasAvatarImg ? u.avatarV : void 0) : el("span", "chat-avatar-wrap");
    r.appendChild(av);
    r.appendChild(el("span", "dz-row-main", '<b>' + esc(nm(u.username)) + "</b><small>" + esc(meta || "") + "</small>"));
    return r;
  }
  function overview(pane, ctx) {
    var top = el("div", "dz-status");
    var live = el("span", "dz-live");
    var chatB = btn("Chat \u2026", "dz-chip");
    var fmB = btn("FM \u2026", "dz-chip");
    top.append(live, chatB, fmB);
    pane.appendChild(top);
    var stats = el("div", "dz-stats");
    pane.appendChild(stats);
    ctx.paint = function (s) { paintStats(stats, s); liveLine(live, s); };
    ctx.paint(ctx.stats);
    var status = el("p", "pow-status"); status.setAttribute("role", "status");
    pane.appendChild(status);
    /* Chat pause toggle */
    function paintChat(p) { chatB.textContent = p ? "Chat paused" : "Chat open"; chatB.classList.toggle("is-warn", !!p); chatB.setAttribute("aria-pressed", String(!!p)); }
    paintChat(M().isPaused ? M().isPaused() : !1);
    chatB.addEventListener("click", function () {
      var p = M().isPaused ? M().isPaused() : !1;
      run(chatB, status, function () { return api(p ? "/api/chat/unpause" : "/api/chat/pause", { method: "POST", body: {} }); },
        p ? "Chat resumed." : "Chat paused.", function (j) { M().setPaused && M().setPaused(!!j.paused); paintChat(!!j.paused); });
    });
    /* misery fm status: tap jumps to Tools */
    api("/api/fm/state").then(function (j) {
      var f = j && j.fm;
      fmB.textContent = !f ? "FM off" : f.live ? (f.paused ? "FM paused" : "FM live \u00b7 " + num(f.listeners)) : "FM off";
      fmB.classList.toggle("is-on", !!(f && f.live && !f.paused));
    }).catch(function () { fmB.textContent = "FM"; });
    fmB.addEventListener("click", function () { ctx.go("fm"); });

    var recent = section("New members", '<button type="button" class="dz-link">All</button>');
    recent.querySelector(".dz-link").onclick = function () { ctx.go("people"); };
    var rl = el("div", "dz-list", '<p class="pow-note">Loading\u2026</p>');
    recent.appendChild(rl);
    pane.appendChild(recent);
    api("/api/users/recent").then(function (j) {
      rl.replaceChildren();
      (j && j.users || []).forEach(function (u) {
        var r = userRow(u, ago(u.createdAt) + (u.points ? " \u00b7 \u2605 " + num(u.points) : ""));
        r.classList.add("is-tap"); r.tabIndex = 0;
        r.onclick = function () { ctx.go("people", u.username); };
        rl.appendChild(r);
      });
      rl.children.length || (rl.innerHTML = '<p class="pow-note">No members yet.</p>');
    }).catch(function () { rl.innerHTML = '<p class="pow-note">Couldn\u2019t load.</p>'; });

    /* Orders + preorders (needs Worker /api/admin/orders; hidden until it's live) */
    var ord = section("Orders");
    ord.hidden = !0;
    pane.appendChild(ord);
    api("/api/admin/orders").then(function (j) {
      if (!j || !j.ok || !Array.isArray(j.orders)) return;
      var t = j.totals || {};
      ord.querySelector(".dz-h").insertAdjacentHTML("beforeend", '<small>' + num(t.paid) + " paid" + (t.refunded ? " \u00b7 " + num(t.refunded) + " refunded" : "") + "</small>");
      var list = el("div", "dz-list");
      j.orders.slice(0, 6).forEach(function (o) {
        var what = o.item || (o.items || []).map(function (i) { return (i.qty > 1 ? i.qty + "\u00d7 " : "") + (i.title || i.name || "Item"); }).join(", ") || "Order";
        var ship = o.address || (o.ship ? [o.ship.name, o.ship.line1, o.ship.city, o.ship.region, o.ship.postal, o.ship.country].filter(Boolean).join(", ") : "");
        var amt = o.total && o.total.amount != null ? money(Number(o.total.amount), o.total.currency) : "";
        var r = el("details", "dz-order" + (o.status === "refunded" ? " is-refunded" : ""));
        r.innerHTML = "<summary><span class=\"dz-row-main\"><b>" + esc(what) + "</b><small>" + esc((o.kind === "preorder" ? "Preorder" : "Order") + " \u00b7 " + ago(o.createdAt) + (o.username ? " \u00b7 " + at(o.username) : "") + (o.status === "refunded" ? " \u00b7 refunded" : "")) +
          "</small></span><span class=\"dz-amt\">" + esc(amt) + "</span></summary>" + '<p class="dz-ship">' + esc(ship || "No shipping address on file.") + "</p>";
        list.appendChild(r);
      });
      list.children.length || (list.innerHTML = '<p class="pow-note">No orders yet.</p>');
      ord.appendChild(list);
      ord.hidden = !1;
    }).catch(function () {});

    /* Recent admin activity (needs Worker /api/admin/log) */
    var log = section("Recent activity");
    log.hidden = !0;
    pane.appendChild(log);
    api("/api/admin/log").then(function (j) {
      if (!j || !j.ok || !Array.isArray(j.entries) || !j.entries.length) return;
      var list = el("div", "dz-list dz-log");
      j.entries.slice(0, 8).forEach(function (e) {
        var who = e.by && e.by !== "owner-secret" ? at(e.by) : e.by || "";
        var what = String(e.action || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
        list.appendChild(el("div", "dz-log-row", "<span>" + esc(what + (e.target ? " " + at(e.target) : "")) + "</span><small>" + esc((who ? who + " \u00b7 " : "") + ago(e.ts)) + "</small>"));
      });
      log.appendChild(list);
      log.hidden = !1;
    }).catch(function () {});
  }

  /* ---------- People ---------- */
  function people(pane, ctx) {
    var bar = el("div", "dz-search");
    var q = el("input", "dz-in");
    q.type = "search"; q.placeholder = "Search members"; q.setAttribute("aria-label", "Search members");
    q.autocapitalize = "none"; q.autocomplete = "off"; q.spellcheck = !1;
    bar.appendChild(q);
    var filt = el("div", "dz-filters");
    var F = "all";
    [["all", "All"], ["vip", "VIP"], ["banned", "Banned"]].forEach(function (f) {
      var b = btn(f[1], "dz-chip" + (f[0] === F ? " is-sel" : ""), function () {
        F = f[0];
        filt.querySelectorAll(".dz-chip").forEach(function (c) { c.classList.toggle("is-sel", c === b); });
        draw();
      });
      filt.appendChild(b);
    });
    bar.appendChild(filt);
    pane.appendChild(bar);
    var count = el("div", "dz-count");
    var list = el("div", "dz-people", '<p class="pow-note">Loading\u2026</p>');
    pane.append(count, list);
    var users = [], cats = [], open = null;
    function load() {
      return Promise.all([api("/api/users"), api("/api/forum/categories").catch(function () { return null; })]).then(function (r) {
        users = (r[0] && r[0].users) || [];
        cats = ((r[1] && r[1].categories) || []).filter(function (c) { return c.ownerOnly; });
        draw();
      }).catch(function () { list.innerHTML = '<p class="pow-note">Couldn\u2019t load members.</p>'; });
    }
    function draw() {
      var s = nm(q.value.trim());
      var shown = users.filter(function (u) {
        return (!s || nm(u.username).indexOf(s) >= 0) && (F === "all" || (F === "vip" ? u.member : u.banned));
      });
      count.textContent = num(shown.length) + (shown.length === 1 ? " member" : " members") + (s || F !== "all" ? " of " + num(users.length) : "");
      list.replaceChildren();
      shown.slice(0, 80).forEach(function (u) { list.appendChild(row(u)); });
      shown.length || (list.innerHTML = '<p class="pow-note">No one matches.</p>');
      shown.length > 80 && list.appendChild(el("p", "pow-note", "Showing 80. Search to narrow it down."));
    }
    function row(u) {
      var wrap = el("div", "dz-person" + (open === nm(u.username) ? " is-open" : ""));
      var head = userRow(u, (u.points ? "\u2605 " + num(u.points) + " \u00b7 " : "") + "joined " + ago(u.createdAt));
      head.classList.add("is-tap");
      head.tabIndex = 0;
      head.setAttribute("role", "button");
      head.setAttribute("aria-expanded", String(open === nm(u.username)));
      var tags = el("span", "dz-tags");
      u.member && tags.appendChild(el("span", "dz-tag", "VIP"));
      u.banned && tags.appendChild(el("span", "dz-tag is-warn", "Banned"));
      head.appendChild(tags);
      function toggle() {
        var me = nm(u.username), was = open === me;
        list.querySelectorAll(".dz-person.is-open").forEach(collapse);
        open = was ? null : me;
        if (!was) {
          wrap.classList.add("is-open"); head.setAttribute("aria-expanded", "true");
          var box = el("div", "dz-acts-box");
          box.appendChild(actions(u));
          wrap.appendChild(box);
          morph(box, !0);
        }
      }
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", function (e) { (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle()); });
      wrap.appendChild(head);
      if (open === nm(u.username)) { var box = el("div", "dz-acts-box"); box.appendChild(actions(u)); wrap.appendChild(box); }
      return wrap;
    }
    /* Bubble dropdown morph (per dc): height 0 <-> content with a fade; instant under reduced motion. */
    var EASE = "cubic-bezier(.32,.72,0,1)";
    function still() { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }
    function morph(box, opening, done) {
      if (still() || !box.animate) return void (done && done());
      var h = box.scrollHeight;
      box.style.overflow = "hidden";
      var a = box.animate(opening ? [{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }] : [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: opening ? 280 : 220, easing: EASE });
      var inner = box.firstChild;
      opening && inner && inner.animate && inner.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: 60, easing: "ease-out", fill: "backwards" });
      a.onfinish = a.oncancel = function () { box.style.overflow = ""; done && done(); };
    }
    function collapse(w) {
      w.classList.remove("is-open");
      var hd = w.querySelector(".dz-row"); hd && hd.setAttribute("aria-expanded", "false");
      var box = w.querySelector(".dz-acts-box");
      box && morph(box, !1, function () { box.remove(); });
    }
    function actions(u) {
      var p = el("div", "dz-acts"), st = el("p", "pow-status");
      st.setAttribute("role", "status");
      var name = function () { return encodeURIComponent(nm(u.username)); };
      /* Stars */
      var sr = el("div", "dz-line");
      sr.appendChild(el("span", "dz-line-l", "Stars"));
      var amt = el("input", "dz-in dz-in-num");
      amt.type = "number"; amt.inputMode = "numeric"; amt.min = "1"; amt.max = "1000"; amt.value = "10"; amt.setAttribute("aria-label", "Stars amount");
      function stars(sign) {
        return function (e) {
          var n = Math.max(1, Math.min(1e3, Math.round(Number(amt.value) || 0)));
          run(e.currentTarget, st, function () { return api("/api/user/stars", { method: "POST", body: { username: u.username, delta: sign * n } }); },
            function (j) { return at(u.username) + " now has \u2605 " + num(j.points) + "."; }, function (j) { u.points = j.points; });
        };
      }
      sr.append(amt, btn("Remove", "", stars(-1)), btn("Add", "is-primary", stars(1)));
      p.appendChild(sr);
      /* Rename */
      var rr = el("div", "dz-line");
      rr.appendChild(el("span", "dz-line-l", "Name"));
      var rn = el("input", "dz-in");
      rn.value = nm(u.username); rn.autocapitalize = "none"; rn.autocomplete = "off"; rn.spellcheck = !1; rn.setAttribute("aria-label", "New username");
      rn.addEventListener("input", function () { var v = rn.value.toLowerCase(); v !== rn.value && (rn.value = v); });
      rr.append(rn, btn("Rename", "", function (e) {
        var v = nm(rn.value.trim());
        if (!v || v === nm(u.username)) return;
        run(e.currentTarget, st, function () { return api("/api/user/" + name() + "/rename", { method: "POST", body: { newUsername: v } }); },
          "Renamed to @" + v + ".", function () { u.username = v; open = v; setTimeout(draw, 900); });
      }));
      p.appendChild(rr);
      /* Main actions */
      var g = el("div", "dz-grid"), dg = el("div", "dz-grid dz-danger");
      g.appendChild(btn("Open profile", "", function (e) { M().openUserSheet && M().openUserSheet({ username: u.username }, e.currentTarget); }));
      g.appendChild(btn(u.member ? "Remove VIP" : "Make VIP", "", function (e) {
        var b = e.currentTarget, mk = !u.member;
        confirmBox(mk ? "Give " + at(u.username) + " VIP?" : "Remove VIP from " + at(u.username) + "?", "", mk ? "Give VIP" : "Remove", !mk).then(function (ok) {
          ok && run(b, st, function () { return api("/api/user/" + name() + "/member", { method: "POST", body: { member: mk, amount: null } }); },
            mk ? "VIP on." : "VIP removed.", function (j) { u.member = !!j.member; setTimeout(draw, 700); });
        });
      }));
      dg.appendChild(btn(u.banned ? "Unban" : "Ban", u.banned ? "" : "is-danger", function (e) {
        var b = e.currentTarget, ban = !u.banned;
        confirmBox(ban ? "Ban " + at(u.username) + "?" : "Unban " + at(u.username) + "?", ban ? "They can't post or sign in until you unban them." : "", ban ? "Ban" : "Unban", ban).then(function (ok) {
          ok && run(b, st, function () { return api("/api/ban", { method: "POST", body: { username: u.username, banned: ban } }); },
            ban ? "Banned." : "Unbanned.", function () { u.banned = ban; setTimeout(draw, 700); });
        });
      }));
      dg.appendChild(btn("Clear messages", "is-danger", function (e) {
        var b = e.currentTarget;
        confirmBox("Delete " + at(u.username) + "'s chat messages?", "This can't be undone.", "Delete", !0).then(function (ok) {
          ok && run(b, st, function () { return api("/api/user/" + name() + "/clear-messages", { method: "POST", body: {} }); },
            function (j) { return "Removed " + num(j.removed) + " messages."; });
        });
      }));
      dg.appendChild(btn("Clear Globe posts", "is-danger", function (e) {
        var b = e.currentTarget;
        confirmBox("Delete " + at(u.username) + "'s Globe posts and replies?", "This can't be undone.", "Delete", !0).then(function (ok) {
          ok && run(b, st, function () { return api("/api/user/" + name() + "/clear-forum", { method: "POST", body: {} }); },
            function (j) { return "Removed " + num(j.threadsRemoved) + " posts and " + num(j.repliesRemoved) + " replies."; });
        });
      }));
      dg.appendChild(btn("Delete account", "is-danger", function (e) {
        var b = e.currentTarget;
        confirmBox("Delete " + at(u.username) + "?", "Their account is removed for good.", "Delete", !0).then(function (ok) {
          ok && run(b, st, function () { return api("/api/user/" + name(), { method: "DELETE" }); },
            "Deleted.", function () { users = users.filter(function (x) { return x !== u; }); open = null; setTimeout(draw, 700); });
        });
      }));
      p.appendChild(g);
      /* Private categories */
      if (cats.length) {
        var ca = el("div", "dz-line dz-wrap");
        ca.appendChild(el("span", "dz-line-l", "Access"));
        cats.forEach(function (c) {
          var has = (u.catAccess || []).indexOf(c.id) >= 0;
          var b = btn(c.name, "dz-chip" + (has ? " is-sel" : ""), function () {
            var give = (u.catAccess || []).indexOf(c.id) < 0;
            run(b, st, function () { return api("/api/forum/category-access", { method: "POST", body: { username: u.username, categoryId: c.id, access: give } }); },
              function (j) { return (j.access ? "Can now see " : "Can no longer see ") + c.name; },
              function (j) {
                u.catAccess = (u.catAccess || []).filter(function (x) { return x !== c.id; });
                j.access && u.catAccess.push(c.id);
                b.classList.toggle("is-sel", !!j.access); b.setAttribute("aria-pressed", String(!!j.access));
              });
          });
          b.setAttribute("aria-pressed", String(has));
          ca.appendChild(b);
        });
        p.appendChild(ca);
      }
      p.appendChild(dg);
      p.appendChild(st);
      return p;
    }
    q.addEventListener("input", draw);
    ctx.focusUser = function (u) { q.value = ""; open = nm(u); users.length && draw(); };
    return load();
  }

  /* ---------- Forum categories ---------- */
  var ACCESS = [["public", "Public"], ["members", "VIP only"], ["private", "Private"]];
  function forum(pane) {
    var card = section("Categories");
    var list = el("div", "dz-list dz-cats", '<p class="pow-note">Loading\u2026</p>');
    var st = el("p", "pow-status"); st.setAttribute("role", "status");
    var add = el("div", "dz-line");
    var nin = el("input", "dz-in"); nin.placeholder = "New category"; nin.setAttribute("aria-label", "New category name"); nin.maxLength = 40;
    var addB = btn("Add", "is-primary", function () {
      var v = nin.value.trim();
      v && run(addB, st, function () { return api("/api/forum/categories", { method: "POST", body: { name: v } }); }, "Added " + v + ".", function () { nin.value = ""; load(); });
    });
    nin.addEventListener("keydown", function (e) { e.key === "Enter" && addB.click(); });
    add.append(nin, addB);
    card.append(list, add, st);
    pane.appendChild(card);
    var cats = [];
    function save(before) {
      var order = cats.map(function (c) { return c.id; });
      return api("/api/forum/categories/reorder", { method: "POST", body: { order: order } }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "Reorder failed");
        st.textContent = "Order saved.";
      }).catch(function (e) { cats = before; draw(); st.textContent = (e && e.message) || "Reorder failed"; });
    }
    function move(i, d) {
      var j = i + d;
      if (j < 0 || j >= cats.length) return;
      var before = cats.slice();
      var c = cats.splice(i, 1)[0]; cats.splice(j, 0, c);
      draw();
      var b = list.querySelector('[data-cat-id="' + CSS.escape(c.id) + '"] .dz-mv[data-d="' + d + '"]');
      b && !b.disabled && b.focus();
      save(before);
    }
    function draw() {
      list.replaceChildren();
      cats.forEach(function (c, i) {
        var r = el("div", "dz-cat");
        r.dataset.catId = c.id;
        var mv = el("span", "dz-mvs");
        [[-1, "Move up", "M6 15l6-6 6 6"], [1, "Move down", "M6 9l6 6 6-6"]].forEach(function (m) {
          var b = el("button", "dz-mv", '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + m[2] + '"/></svg>');
          b.type = "button"; b.dataset.d = m[0]; b.setAttribute("aria-label", m[1] + ": " + c.name);
          b.disabled = (m[0] < 0 && i === 0) || (m[0] > 0 && i === cats.length - 1);
          b.onclick = function () { move(cats.indexOf(c), m[0]); };
          mv.appendChild(b);
        });
        var inp = el("input", "dz-in dz-cat-in");
        inp.value = c.name; inp.maxLength = 40; inp.setAttribute("aria-label", "Rename " + c.name);
        function rename() {
          var v = inp.value.trim();
          if (!v) return void (inp.value = c.name);
          v !== c.name && api("/api/forum/categories/" + encodeURIComponent(c.id), { method: "PUT", body: { name: v } }).then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || "Rename failed");
            c.name = v; st.textContent = "Renamed.";
          }).catch(function (e) { inp.value = c.name; st.textContent = e.message; });
        }
        inp.addEventListener("blur", rename);
        inp.addEventListener("keydown", function (e) { e.key === "Enter" && inp.blur(); });
        var mode = c.ownerOnly ? "private" : c.membersOnly ? "members" : "public";
        var acc = btn(ACCESS.filter(function (a) { return a[0] === mode; })[0][1], "dz-chip" + (mode !== "public" ? " is-sel" : ""), function () {
          var nx = ACCESS[(ACCESS.map(function (a) { return a[0]; }).indexOf(mode) + 1) % 3][0];
          run(acc, st, function () { return api("/api/forum/categories/" + encodeURIComponent(c.id), { method: "PUT", body: { ownerOnly: nx === "private", membersOnly: nx === "members" } }); },
            c.name + " is now " + ACCESS.filter(function (a) { return a[0] === nx; })[0][1].toLowerCase() + ".",
            function () { c.ownerOnly = nx === "private"; c.membersOnly = nx === "members"; draw(); });
        });
        acc.setAttribute("aria-label", "Who can see " + c.name);
        r.append(mv, inp, acc);
        if (c.id !== "general") {
          var del = el("button", "dz-mv dz-del", '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>');
          del.type = "button"; del.setAttribute("aria-label", "Delete " + c.name);
          del.onclick = function () {
            confirmBox("Delete " + c.name + "?", "Its posts move to General.", "Delete", !0).then(function (ok) {
              ok && run(del, st, function () { return api("/api/forum/categories/" + encodeURIComponent(c.id), { method: "DELETE" }); }, "Deleted " + c.name + ".", load);
            });
          };
          r.appendChild(del);
        }
        list.appendChild(r);
      });
      cats.length || (list.innerHTML = '<p class="pow-note">No categories.</p>');
    }
    function load() {
      return api("/api/forum/categories").then(function (j) { cats = (j && j.categories) || []; draw(); })
        .catch(function () { list.innerHTML = '<p class="pow-note">Couldn\u2019t load categories.</p>'; });
    }
    return load();
  }

  /* ---------- Tools ---------- */
  function tools(pane) {
    /* Notification to everyone or one member */
    var nc = section("Yell");
    var tt = el("input", "dz-in"); tt.placeholder = "Title"; tt.maxLength = 100; tt.setAttribute("aria-label", "Notification title");
    var bd = el("textarea", "dz-in dz-ta"); bd.placeholder = "Message"; bd.maxLength = 200; bd.rows = 2; bd.setAttribute("aria-label", "Notification message");
    var to = el("input", "dz-in"); to.placeholder = "To: everyone, or a username"; to.autocapitalize = "none"; to.autocomplete = "off"; to.spellcheck = !1; to.setAttribute("aria-label", "Recipient");
    to.addEventListener("input", function () { var v = to.value.toLowerCase(); v !== to.value && (to.value = v); });
    var nst = el("p", "pow-status"); nst.setAttribute("role", "status");
    var send = btn("Send", "is-primary dz-wide", function () {
      var title = tt.value.trim(), body = bd.value.trim(), who = nm(to.value.trim());
      if (!title || !body) return void (nst.textContent = "Add a title and a message.");
      confirmBox(who ? "Send to @" + who + "?" : "Send to everyone?", title + ": " + body, "Send").then(function (ok) {
        ok && run(send, nst, function () { return api("/api/push/send", { method: "POST", body: { to: who || "all", title: title, body: body } }); },
          function (j) { return "Sent" + (j.sent != null ? " to " + num(j.sent) + " devices" : "") + "."; }, function () { tt.value = bd.value = ""; });
      });
    });
    nc.append(tt, bd, to, send, nst);
    pane.appendChild(nc);

    /* misery fm */
    var fc = section("FM");
    fc.classList.add("dz-fm");
    var fs = el("p", "dz-fm-now", "Loading\u2026");
    var fg = el("div", "dz-grid");
    var fst = el("p", "pow-status"); fst.setAttribute("role", "status");
    fc.append(fs, fg, fst);
    pane.appendChild(fc);
    function fmPaint(f) {
      fg.replaceChildren();
      if (!f) return void (fs.textContent = "Couldn\u2019t load FM.");
      var cur = f.live && f.list && f.list[f.idx];
      fs.innerHTML = f.live ? "<b>" + esc(f.paused ? "Paused" : "Live") + "</b> \u00b7 " + esc(cur ? cur.title + (cur.artist ? " \u2014 " + cur.artist : "") : "") + " \u00b7 " + num(f.listeners) + " listening"
        : "<b>Off air</b> \u00b7 " + num((f.list || []).length) + " songs ready";
      function act(label, a, cls) {
        fg.appendChild(btn(label, cls, function (e) {
          run(e.currentTarget, fst, function () { return api("/api/fm/control", { method: "POST", body: { action: a } }); }, "Done.", function (j) { fmPaint(j.fm); });
        }));
      }
      if (!f.live) act("Go live", "live", "is-primary");
      else {
        f.paused ? act("Resume", "resume", "is-primary") : act("Pause", "pause");
        act("Skip", "skip");
        act("Stop", "stop", "is-danger");
      }
      window.MPFM && MPFM.open && fg.appendChild(btn("Open FM", "", function () { MPFM.open(); }));
    }
    api("/api/fm/state").then(function (j) { fmPaint(j && j.fm); }).catch(function () { fmPaint(null); });

    /* Chat + media */
    var cc = section("Chat & storage");
    var cg = el("div", "dz-grid");
    var cst = el("p", "pow-status"); cst.setAttribute("role", "status");
    var scan = btn("Find unused media", "", function () {
      run(scan, cst, function () { return api("/api/media/cleanup", { method: "POST", body: { confirm: !1 } }); }, function (j) {
        var n = (j.candidates || []).length;
        if (n) {
          confirmBox("Delete " + num(n) + " unused files?", "Uploads no message, post or profile uses anymore.", "Delete", !0).then(function (ok) {
            ok && run(scan, cst, function () { return api("/api/media/cleanup", { method: "POST", body: { confirm: !0 } }); }, function (k) { return "Deleted " + num(k.deleted) + " files."; });
          });
        }
        return n ? num(n) + " unused files found." : "Nothing to clean up.";
      });
    });
    var clear = btn("Clear all chat", "is-danger", function () {
      confirmBox("Clear all chat messages?", "Everyone's messages are deleted. This can't be undone.", "Clear", !0).then(function (ok) {
        ok && run(clear, cst, function () { return api("/api/clear", { method: "POST", body: {} }); }, "Chat cleared.");
      });
    });
    cg.append(scan, clear);
    cc.append(cg, cst);
    pane.appendChild(cc);
  }

  /* ---------- Shell ---------- */
  /* Restored tab bar (per dc), now four tabs with icons that match each page (original drawings, Hugeicons-style stroke). */
  var TABS = [
    ["overview", "Overview", "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:block\" width=\"18\" height=\"18\"><rect x=\"3\" y=\"3\" width=\"7.5\" height=\"9\" rx=\"2\"/><rect x=\"13.5\" y=\"3\" width=\"7.5\" height=\"5.5\" rx=\"2\"/><rect x=\"13.5\" y=\"11.5\" width=\"7.5\" height=\"9.5\" rx=\"2\"/><rect x=\"3\" y=\"15\" width=\"7.5\" height=\"6\" rx=\"2\"/></svg>"],
    ["forum", "Categories", "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:block\" width=\"18\" height=\"18\"><path d=\"M12 3.5L20.5 7.8L12 12.1L3.5 7.8Z\"/><path d=\"M3.5 12L12 16.3L20.5 12\"/><path d=\"M3.5 16.2L12 20.5L20.5 16.2\"/></svg>"],
    ["people", "People", "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:block\" width=\"18\" height=\"18\"><circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20C3.3 16.6 5.9 14.5 9 14.5C12.1 14.5 14.7 16.6 15.5 20\"/><path d=\"M15.5 4.7C17 5.1 18 6.4 18 8C18 9.6 17 10.9 15.5 11.3\"/><path d=\"M17.8 14.8C19.8 15.5 21 17.3 21.5 20\"/></svg>"],
    ["tools", "Tools", "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display:block\" width=\"18\" height=\"18\"><path d=\"M3.5 7H12.5\"/><path d=\"M17.5 7H20.5\"/><circle cx=\"15\" cy=\"7\" r=\"2.5\"/><path d=\"M3.5 17H6.5\"/><path d=\"M11.5 17H20.5\"/><circle cx=\"9\" cy=\"17\" r=\"2.5\"/></svg>"],
  ];

  function build(stats) {
    var h = host();
    if (h === !1) return null;
    var root = el("div", "dz");
    root.setAttribute("data-dz", "1");
    var ctx = { stats: stats, paint: null };
    var seg = el("div", "dash-tabs");
    seg.setAttribute("role", "tablist");
    seg.style.cssText = "position:relative;display:flex;gap:4px;background:rgba(120,120,128,0.12);backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);border-radius:999px;padding:4px;border:var(--glass-hairline);";
    var ind = el("span", "dash-tab-ind");
    ind.style.cssText = "position:absolute;top:3px;bottom:3px;border-radius:999px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),0 2px 8px rgba(0,0,0,0.25);pointer-events:none;left:3px;width:calc(25% - 3px);";
    setTimeout(function () { ind.style.transition = "transform 0.35s cubic-bezier(0.32,0.72,0,1)"; }, 100);
    seg.appendChild(ind);
    var panes = {}, made = {};
    TABS.forEach(function (t) {
      var b = el("button");
      b.type = "button"; b.innerHTML = t[2]; b.setAttribute("aria-label", t[1]); b.setAttribute("role", "tab"); b.dataset.tab = t[0];
      b.style.cssText = "position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;padding:8px 16px;border:none;border-radius:999px;cursor:pointer;background:transparent;color:var(--muted);transition:color .25s ease;";
      b.onclick = function () { ctx.go(t[0]); };
      seg.appendChild(b);
      var p = el("div", "dz-pane");
      p.setAttribute("role", "tabpanel"); p.hidden = !0;
      panes[t[0]] = p;
    });
    root.appendChild(seg);
    TABS.forEach(function (t) { root.appendChild(panes[t[0]]); });
    ctx.go = function (id, user) {
      var toFm = id === "fm";
      toFm && (id = "tools");
      TABS.forEach(function (t, i) {
        var on = t[0] === id, b = seg.querySelector('[data-tab="' + t[0] + '"]');
        b.setAttribute("aria-selected", String(on));
        b.style.color = on ? "var(--ink)" : "var(--muted)";
        panes[t[0]].hidden = !on;
        on && (ind.style.transform = "translateX(" + i * 100 + "%)");
      });
      root.dataset.tab = id;
      if (!made[id]) {
        made[id] = !0;
        ({ overview: overview, forum: forum, people: people, tools: tools })[id](panes[id], ctx);
      }
      user && ctx.focusUser && ctx.focusUser(user);
      if (toFm) {
        var tt = panes.tools.querySelector(".dz-fm");
        tt && setTimeout(function () { tt.scrollIntoView({ block: "start", behavior: "smooth" }); }, 50);
        return;
      }
      var sc = root.closest(".pow-page, .mp-pb-scroll, .msg-popup-inner");
      sc && sc.scrollTop > 0 && root.getBoundingClientRect().top < 0 && root.scrollIntoView({ block: "start" });
    };
    ctx.go("overview");
    holdTitle(root);
    if (h) {
      h.replaceChildren(root);
    } else {
      M().closeMsgPopup && M().closeMsgPopup();
      var d = el("div", "msg-popup"); d.id = "msg-popup";
      var inner = el("div", "msg-popup-inner dz-sheet");
      var head = el("div", "dz-sheet-head", '<h3>Dashboard</h3>');
      var x = el("button", "dz-x", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"/></svg>');
      x.type = "button"; x.setAttribute("aria-label", "Close dashboard");
      x.onclick = function () { M().closeMsgPopup && M().closeMsgPopup(); };
      head.appendChild(x);
      inner.append(head, root);
      d.appendChild(inner);
      d.addEventListener("click", function (e) { e.target === d && M().closeMsgPopup && M().closeMsgPopup(); });
      document.body.appendChild(d);
      M().fadeSheetIn && M().fadeSheetIn(inner);
    }
    root._ctx = ctx;
    return root;
  }
  window.openAnalytics = function () {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem("mp-analytics-cache") || "null"); } catch (e) {}
    var root = build(cached && cached.stats && typeof cached.stats === "object" ? cached.stats : null);
    if (!root) return;
    api("/api/analytics/stats").then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "not allowed");
      try { localStorage.setItem("mp-analytics-cache", JSON.stringify({ ts: Date.now(), stats: j.stats })); } catch (e) {}
      /* Fresh numbers swap into the tiles in place; tabs, forms and scroll stay put. */
      root._ctx.stats = j.stats;
      root.isConnected && root._ctx.paint && root._ctx.paint(j.stats);
    }).catch(function () {
      if (!root.isConnected || (cached && cached.stats)) return;
      root.replaceChildren(el("p", "pow-note", "Couldn\u2019t load the dashboard. Try again soon."));
    });
  };
  (function () {
    function check() {
      "#analytics" === location.hash && (history.replaceState(null, "", location.pathname), window.openAnalytics());
    }
    window.addEventListener("hashchange", check);
    "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", check) : check();
  })();
})();
