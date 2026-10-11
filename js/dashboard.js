/* Dashboard (owner analytics) — extracted from chat.js.
   Loads AFTER js/chat.js and uses the window.MPChat bridge. */
(function () {
  var B = window.MPChat || {};
  function api(path, opts) { return B.api(path, opts); }
  function closeMsgPopup() { return B.closeMsgPopup(); }
  function avatarNode(a, b, c, d) { return B.avatarNode(a, b, c, d); }
  function setPaused(p) { return B.setPaused(p); }
  function isChatPaused() { return B.isPaused(); }
  function getMe() { return B.getMe(); }
  function flagEmoji(code) {
    if (!code || code.length !== 2) return "\uD83C\uDF10";
    var s = "";
    for (var i = 0; i < 2; i++) {
      var cp = String(code).toUpperCase().charCodeAt(i);
      if (cp < 65 || cp > 90) return "\uD83C\uDF10";
      s += String.fromCodePoint(0x1F1E6 + (cp - 65));
    }
    return s;
  }

  /* ---------- Analytics Dashboard (owner only) ---------- */
  function openAnalytics() {
    // Owner is already logged in — api() sends the auth token, no secret needed
    api("/api/analytics/stats")
      .then(function(j) {
        if (!j || !j.ok) throw new Error("unauthorized: " + JSON.stringify(j));
        showDashboard(j.stats);
      })
      .catch(function(e) {
        // Fallback: show error in a simple popup (with debug info)
        closeMsgPopup();
        var ov = document.createElement("div");
        ov.className = "msg-popup";
        ov.id = "msg-popup";
        var inner = document.createElement("div");
        inner.className = "msg-popup-inner";
        inner.innerHTML = '<p style="font-size:15px;margin:0 0 8px;">Couldn\'t load analytics.</p><p style="font-size:12px;opacity:.6;margin:0 0 16px;word-break:break-all;">' + String(e.message || e).substring(0, 200) + '</p>';
        var btn = document.createElement("button");
        btn.className = "msg-popup-close";
        btn.textContent = "Close";
        btn.onclick = function() { closeMsgPopup(); };
        inner.appendChild(btn);
        ov.appendChild(inner);
        ov.onclick = function(e) { if (e.target === ov) closeMsgPopup(); };
        document.body.appendChild(ov);
      });
  }
  function showDashboard(stats) {
    closeMsgPopup();
    var ov = document.createElement("div");
    ov.className = "msg-popup";
    ov.id = "msg-popup";
    var inner = document.createElement("div");
    inner.className = "msg-popup-inner dashboard-sheet";
    inner.style.maxWidth = "min(520px, 94vw)";

    // Title + top-level Chat/Forum selector
    var headRow = document.createElement("div");
    headRow.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:16px;";
    var title = document.createElement("h3");
    title.style.cssText = "margin:0;font-size:20px;font-weight:700;";
    title.textContent = "Dashboard";
    headRow.appendChild(title);
    var topNav = document.createElement("div");
    topNav.style.cssText = "position:relative;display:flex;gap:4px;background:var(--glass-clear-tint);border-radius:10px;padding:3px;border:var(--glass-hairline);";
    var topSlider = document.createElement("span");
    topSlider.style.cssText = "position:absolute;top:3px;left:3px;bottom:3px;width:calc(33.333% - 2px);border-radius:7px;background:var(--glass-regular-tint);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.15);transition:transform .3s cubic-bezier(.3,1.3,.4,1);pointer-events:none;";
    topNav.appendChild(topSlider);
    var chatDashBtn = document.createElement("button");
    var forumDashBtn = document.createElement("button");
    var manageDashBtn = document.createElement("button");
    var CHAT_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.1L3 20l1.1-5.1A8.5 8.5 0 1 1 21 11.5z"/></svg>';
    var FORUM_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6z"/><path d="M8 9.5h8"/><path d="M8 12.5h5"/></svg>';
    var GEAR_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    [[CHAT_ICON_SVG, chatDashBtn, "Chat"], [FORUM_ICON_SVG, forumDashBtn, "Forum"], [GEAR_ICON_SVG, manageDashBtn, "Manage"]].forEach(function(pair) {
      var btn = pair[1];
      btn.type = "button";
      btn.innerHTML = pair[0];
      btn.setAttribute("aria-label", pair[2]);
      btn.style.cssText = "position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;padding:6px 18px;border:none;border-radius:7px;cursor:pointer;background:transparent;color:var(--muted);transition:color .25s ease;";
    });
    chatDashBtn.style.color = "var(--ink)";
    topNav.appendChild(chatDashBtn);
    topNav.appendChild(forumDashBtn);
    topNav.appendChild(manageDashBtn);
    headRow.appendChild(topNav);
    inner.appendChild(headRow);

    // Three dashboard sections: Chat (overview), Forum (categories), Manage (users)
    var chatSection = document.createElement("div");
    inner.appendChild(chatSection);

    var forumSection = document.createElement("div");
    forumSection.style.display = "none";
    inner.appendChild(forumSection);

    var manageSection = document.createElement("div");
    manageSection.style.display = "none";
    inner.appendChild(manageSection);

    // Page containers
    var overviewPage = document.createElement("div");
    var managePage = document.createElement("div");
    var forumPage = document.createElement("div");
    chatSection.appendChild(overviewPage);
    forumSection.appendChild(forumPage);
    manageSection.appendChild(managePage);

    function showDashSection(which) {
      var isChat = which === "chat";
      var isForum = which === "forum";
      var isManage = which === "manage";
      chatSection.style.display = isChat ? "" : "none";
      forumSection.style.display = isForum ? "" : "none";
      manageSection.style.display = isManage ? "" : "none";
      topSlider.style.transform = isChat ? "translateX(0)" : isForum ? "translateX(100%)" : "translateX(200%)";
      chatDashBtn.style.color = isChat ? "var(--ink)" : "var(--muted)";
      forumDashBtn.style.color = isForum ? "var(--ink)" : "var(--muted)";
      manageDashBtn.style.color = isManage ? "var(--ink)" : "var(--muted)";
      if (isForum && !forumPage.dataset.loaded) loadForumPage();
      if (isManage && !managePage.dataset.loaded) loadManagePage();
    }
    chatDashBtn.addEventListener("click", function() { showDashSection("chat"); });
    forumDashBtn.addEventListener("click", function() { showDashSection("forum"); });
    manageDashBtn.addEventListener("click", function() { showDashSection("manage"); });

    // Stats row
    var statsRow = document.createElement("div");
    statsRow.style.cssText = "display:flex;gap:12px;margin-bottom:20px;";
    var totalPosts = stats.days.reduce(function(a, d) { return a + (d.forumPosts || 0) + (d.forumReplies || 0); }, 0);
    var metrics = [
      { label: "Views", value: stats.totalViews },
      { label: "Visitors", value: stats.totalVisitors },
      { label: "Posts", value: totalPosts },
      { label: "Users", value: stats.totalNewUsers || 0 }
    ];
    metrics.forEach(function(m) {
      var cell = document.createElement("div");
      cell.style.cssText = "flex:1;text-align:center;";
      cell.innerHTML = '<div style="font-size:24px;font-weight:700;">' + m.value + '</div>' +
        '<div style="font-size:12px;opacity:.6;margin-top:2px;">' + m.label + '</div>';
      statsRow.appendChild(cell);
    });
    overviewPage.appendChild(statsRow);

    // Graph section
    var graphTitle = document.createElement("div");
    graphTitle.style.cssText = "font-size:14px;font-weight:600;margin-bottom:8px;opacity:.8;";
    graphTitle.textContent = "Activity — Last 30 Days";
    overviewPage.appendChild(graphTitle);

    // Metric toggle
    var toggleRow = document.createElement("div");
    toggleRow.style.cssText = "position:relative;display:flex;gap:8px;margin-bottom:12px;";
    var currentMetric = "views";
    var metricBtns = {};
    var metricLabels = { views: "Views", visitors: "Visitors", messages: "Posts", newUsers: "Users" };
    var metricIcons = {
      views: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      visitors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3.2"/><path d="M6.6 18.4a6.4 6.4 0 0 1 10.8 0"/><path d="M15.2 15.8l1.7 1.7 3.1-3.5"/></svg>',
      messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      newUsers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3.2"/><path d="M6.6 18.4a6.4 6.4 0 0 1 10.8 0"/><path d="M18.5 14.5v6M15.5 17.5h6"/></svg>'
    };
    ["views", "visitors", "newUsers", "messages"].forEach(function(metric) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = metricIcons[metric];
      btn.title = metricLabels[metric];
      btn.setAttribute("aria-label", metricLabels[metric]);
      btn.style.cssText = "flex:1;padding:10px 8px;border-radius:10px;border:var(--glass-hairline);background:" +
        (metric === currentMetric ? "rgba(0,122,255,.25)" : "transparent") + ";color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;";
      btn.addEventListener("click", function() {
        currentMetric = metric;
        Object.keys(metricBtns).forEach(function(k) {
          metricBtns[k].style.background = k === metric ? "rgba(0,122,255,.25)" : "transparent";
        });
        drawGraph();
      });
      metricBtns[metric] = btn;
      toggleRow.appendChild(btn);
    });
    overviewPage.appendChild(toggleRow);

    // SVG graph container
    var graphWrap = document.createElement("div");
    graphWrap.style.cssText = "position:relative;height:170px;margin-bottom:20px;background:var(--glass-clear-tint);border:var(--glass-hairline);border-radius:14px;padding:12px;overflow:hidden;";
    overviewPage.appendChild(graphWrap);

    // Legend for the two-shade Posts graph (darker = posts, lighter = replies)
    var graphLegend = document.createElement("div");
    graphLegend.style.cssText = "display:none;font-size:11px;opacity:.6;margin:-12px 0 16px;text-align:center;";
    graphLegend.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#7c3aed;vertical-align:baseline;"></span> Posts <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#a78bfa;vertical-align:baseline;margin-left:10px;"></span> Replies';
    overviewPage.appendChild(graphLegend);

    // Summary line under graph (inserted after usersTitle is created below)
    var graphSummary = document.createElement("div");
    graphSummary.style.cssText = "font-size:12px;opacity:.55;margin:-12px 0 16px;text-align:center;";

    // Metric colors
    var metricColors = {
      views: ["#0a84ff", "#5ac8fa"],
      visitors: ["#30d158", "#a6f3c0"],
      messages: ["#3b82f6", "#bfdbfe"],
      newUsers: ["#ff9f0a", "#ffd60a"]
    };

    function drawGraph() {
      graphWrap.innerHTML = "";
      graphLegend.style.display = (currentMetric === "messages") ? "block" : "none";
      var W = graphWrap.clientWidth - 24 || 300;
      var H = 150;
      var padB = 22, padT = 8;
      var chartH = H - padB - padT;
      var data = stats.days.slice().reverse(); // oldest to newest
      var isPostsMetric = (currentMetric === "messages");
      var values = data.map(function(d) {
        if (isPostsMetric) return (d.forumPosts || 0) + (d.forumReplies || 0);
        return d[currentMetric] || 0;
      });
      var max = Math.max.apply(null, values.concat([1]));
      var total = values.reduce(function(a, b) { return a + b; }, 0);
      var avg = (total / data.length).toFixed(1);
      var peakIdx = values.indexOf(max);
      var colors = metricColors[currentMetric] || metricColors.views;

      // Update summary
      var mLabel = metricLabels[currentMetric];
      graphSummary.textContent = total + " total · " + avg + "/day avg" + (max > 0 ? " · peak " + max + " on " + data[peakIdx].date.slice(5) : "");

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.style.display = "block";
      svg.style.overflow = "visible";
      svg.style.color = "var(--ink)";

      // Defs: gradient
      var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      var grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      grad.setAttribute("id", "barGrad-" + currentMetric);
      grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
      grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
      var s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", colors[0]);
      var s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", colors[1]);
      s2.setAttribute("stop-opacity", ".55");
      grad.appendChild(s1); grad.appendChild(s2);
      defs.appendChild(grad);
      svg.appendChild(defs);

      // Gridlines
      [0.25, 0.5, 0.75, 1].forEach(function(f) {
        var y = padT + chartH * (1 - f);
        var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", 0); ln.setAttribute("x2", W);
        ln.setAttribute("y1", y); ln.setAttribute("y2", y);
        ln.setAttribute("stroke", "currentColor");
        ln.style.opacity = ".12";
        ln.setAttribute("stroke-dasharray", "3,4");
        svg.appendChild(ln);
      });

      var barW = W / data.length;
      var bw = Math.max(2, Math.min(14, barW - 3));

      // Bars with staggered animation (stacked for Posts: darker blue = posts, lighter blue = replies)
      data.forEach(function(d, i) {
        var v = values[i];
        var h = Math.max(v > 0 ? 4 : 2, (v / max) * chartH);
        var x = i * barW + (barW - bw) / 2;
        var y = padT + chartH - h;
        var isPeak = i === peakIdx && max > 0;

        if (isPostsMetric && v > 0) {
          var p = d.forumPosts || 0, r = d.forumReplies || 0, ph = (p / v) * h, rh = h - ph, NS = "http://www.w3.org/2000/svg";
          var tipText = d.date + ": " + p + " post" + (p === 1 ? "" : "s") + " · " + r + " repl" + (r === 1 ? "y" : "ies");
          var rp = document.createElementNS(NS, "rect");
          rp.setAttribute("x", x); rp.setAttribute("y", y + rh); rp.setAttribute("width", bw); rp.setAttribute("height", ph);
          rp.setAttribute("rx", Math.min(4, bw / 2)); rp.setAttribute("fill", "#7c3aed");
          rp.style.transformOrigin = "bottom"; rp.style.transformBox = "fill-box";
          rp.style.animation = "barRise .6s cubic-bezier(.2,.9,.25,1.15) both";
          rp.style.animationDelay = (i * 18) + "ms";
          var tipP = document.createElementNS(NS, "title");
          tipP.textContent = tipText;
          rp.appendChild(tipP);
          svg.appendChild(rp);
          if (r > 0) {
            var rr = document.createElementNS(NS, "rect");
            rr.setAttribute("x", x); rr.setAttribute("y", y); rr.setAttribute("width", bw); rr.setAttribute("height", rh);
            rr.setAttribute("rx", Math.min(4, bw / 2)); rr.setAttribute("fill", "#a78bfa");
            rr.style.transformOrigin = "bottom"; rr.style.transformBox = "fill-box";
            rr.style.animation = "barRise .6s cubic-bezier(.2,.9,.25,1.15) both";
            rr.style.animationDelay = (i * 18) + "ms";
            var tipR = document.createElementNS(NS, "title");
            tipR.textContent = tipText;
            rr.appendChild(tipR);
            svg.appendChild(rr);
          }
          if (isPeak) {
            var plbl = document.createElementNS(NS, "text");
            plbl.setAttribute("x", x + bw / 2);
            plbl.setAttribute("y", y - 5);
            plbl.setAttribute("text-anchor", "middle");
            plbl.setAttribute("font-size", "10");
            plbl.setAttribute("font-weight", "700");
            plbl.setAttribute("fill", "#7c3aed");
            plbl.textContent = v;
            plbl.style.animation = "fadeIn .4s ease both";
            plbl.style.animationDelay = (i * 18 + 400) + "ms";
            svg.appendChild(plbl);
          }
        } else {
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", bw);
        rect.setAttribute("height", h);
        rect.setAttribute("rx", Math.min(4, bw / 2));
        rect.setAttribute("fill", "url(#barGrad-" + currentMetric + ")");
        if (isPeak) {
          rect.setAttribute("stroke", colors[0]);
          rect.setAttribute("stroke-width", "1.5");
        }
        if (v === 0) rect.setAttribute("opacity", ".25");
        rect.style.transformOrigin = "bottom";
        rect.style.transformBox = "fill-box";
        rect.style.animation = "barRise .6s cubic-bezier(.2,.9,.25,1.15) both";
        rect.style.animationDelay = (i * 18) + "ms";
        // Value label on peak bar
        if (isPeak && v > 0) {
          var lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          lbl.setAttribute("x", x + bw / 2);
          lbl.setAttribute("y", y - 5);
          lbl.setAttribute("text-anchor", "middle");
          lbl.setAttribute("font-size", "10");
          lbl.setAttribute("font-weight", "700");
          lbl.setAttribute("fill", colors[0]);
          lbl.textContent = v;
          lbl.style.animation = "fadeIn .4s ease both";
          lbl.style.animationDelay = (i * 18 + 400) + "ms";
          svg.appendChild(lbl);
        }
        // Tooltip
        var titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleEl.textContent = d.date + ": " + v + " " + mLabel.toLowerCase();
        rect.appendChild(titleEl);
        svg.appendChild(rect);
        } // end else (non-stacked)

        // Date labels every 5 days
        if (i % 5 === 0 || i === data.length - 1) {
          var dt = document.createElementNS("http://www.w3.org/2000/svg", "text");
          dt.setAttribute("x", i * barW + barW / 2);
          dt.setAttribute("y", H - 6);
          dt.setAttribute("text-anchor", "middle");
          dt.setAttribute("font-size", "9");
          dt.setAttribute("fill", "currentColor");
          dt.style.opacity = ".45";
          dt.textContent = d.date.slice(5).replace("-", "/");
          svg.appendChild(dt);
        }
      });

      graphWrap.appendChild(svg);
    }
    // Draw after layout
    setTimeout(drawGraph, 50);

    // Newest users section
    var usersTitle = document.createElement("div");
    usersTitle.style.cssText = "font-size:14px;font-weight:600;margin-bottom:8px;opacity:.8;";
    usersTitle.textContent = "Newest Users";
    overviewPage.appendChild(usersTitle);
    var usersWrap = document.createElement("div");
    usersWrap.style.cssText = "margin-bottom:20px;";
    usersWrap.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:12px;">Loading...</div>';
    overviewPage.appendChild(usersWrap);
    overviewPage.insertBefore(graphSummary, usersTitle);
    api("/api/users/recent").then(function(r) {
      if (!r || !r.ok || !r.users) {
        usersWrap.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:12px;">Could not load users.</div>';
        return;
      }
      usersWrap.innerHTML = "";
      r.users.forEach(function(u) {
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:12px;padding:8px 0;border-top:var(--glass-hairline);";
        // Avatar
        var avWrap = document.createElement("div");
        avWrap.style.cssText = "width:36px;height:36px;flex:none;";
        avWrap.appendChild(avatarNode(u.username, u.avatar, "sm", u.hasAvatarImg ? u.avatarV : undefined));
        row.appendChild(avWrap);
        // Name + date
        var info = document.createElement("div");
        info.style.cssText = "flex:1;min-width:0;";
        var nm = document.createElement("div");
        nm.style.cssText = "font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        nm.textContent = u.username;
        info.appendChild(nm);
        var dt = document.createElement("div");
        dt.style.cssText = "font-size:12px;opacity:.5;";
        dt.textContent = "Joined " + new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        info.appendChild(dt);
        row.appendChild(info);
        // Points
        var pts = document.createElement("div");
        pts.style.cssText = "font-size:13px;opacity:.6;flex:none;";
        pts.textContent = "★ " + (u.points || 0);
        row.appendChild(pts);
        usersWrap.appendChild(row);
      });
      if (!r.users.length) {
        usersWrap.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:12px;">No users yet.</div>';
      }
    }).catch(function() {
      usersWrap.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:12px;">Could not load users.</div>';
    });

    // Countries section (visitor countries by activity, last 30 days)
    var countriesTitle = document.createElement("div");
    countriesTitle.style.cssText = "font-size:14px;font-weight:600;margin-bottom:8px;opacity:.8;";
    countriesTitle.textContent = "Countries";
    overviewPage.appendChild(countriesTitle);
    var countriesWrap = document.createElement("div");
    countriesWrap.style.cssText = "margin-bottom:20px;background:var(--glass-clear-tint);border:var(--glass-hairline);border-radius:14px;padding:10px 14px;";
    (function renderCountries() {
      var agg = {};
      (stats.days || []).forEach(function(d) {
        var c = d.countries || {};
        Object.keys(c).forEach(function(k) { agg[k] = (agg[k] || 0) + (c[k] || 0); });
      });
      var rows = Object.keys(agg).map(function(k) { return { code: k, n: agg[k] }; })
        .sort(function(a, b) { return b.n - a.n; }).slice(0, 8);
      if (!rows.length) {
        countriesWrap.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:8px;">No visitor data yet.</div>';
        return;
      }
      var maxN = rows[0].n;
      rows.forEach(function(r) {
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:6px 0;";
        var flag = document.createElement("span");
        flag.style.cssText = "font-size:18px;line-height:1;";
        flag.textContent = flagEmoji(r.code);
        row.appendChild(flag);
        var code = document.createElement("span");
        code.style.cssText = "font-size:13px;font-weight:600;width:32px;";
        code.textContent = r.code;
        row.appendChild(code);
        var bar = document.createElement("div");
        bar.style.cssText = "flex:1;height:6px;border-radius:3px;background:rgba(127,127,127,.18);overflow:hidden;";
        var fill = document.createElement("div");
        fill.style.cssText = "height:100%;width:" + Math.max(5, Math.round(r.n / maxN * 100)) + "%;border-radius:3px;background:linear-gradient(90deg,#0a84ff,#5ac8fa);";
        bar.appendChild(fill);
        row.appendChild(bar);
        var n = document.createElement("span");
        n.style.cssText = "font-size:13px;opacity:.65;min-width:30px;text-align:right;";
        n.textContent = r.n;
        row.appendChild(n);
        countriesWrap.appendChild(row);
      });
    })();
    overviewPage.appendChild(countriesWrap);

    // Action buttons
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;margin-bottom:12px;";

    // Pause/Resume button
    var pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "msg-popup-close";
    pauseBtn.style.cssText = "flex:1;margin:0;background:" + (isChatPaused() ? "rgba(52,199,89,.25)" : "rgba(255,159,10,.25)") + ";";
    pauseBtn.textContent = isChatPaused() ? "Resume Chat" : "Pause Chat";
    pauseBtn.addEventListener("click", function() {
      var endpoint = isChatPaused() ? "/api/chat/unpause" : "/api/chat/pause";
      pauseBtn.disabled = true;
      pauseBtn.textContent = "Working...";
      api(endpoint, { method: "POST" }).then(function(r) {
        if (r && r.ok) {
          setPaused(r.paused);
          pauseBtn.textContent = r.paused ? "Resume Chat" : "Pause Chat";
          pauseBtn.style.background = r.paused ? "rgba(52,199,89,.25)" : "rgba(255,159,10,.25)";
        }
        pauseBtn.disabled = false;
      }).catch(function() {
        pauseBtn.disabled = false;
        pauseBtn.textContent = isChatPaused() ? "Resume Chat" : "Pause Chat";
      });
    });
    btnRow.appendChild(pauseBtn);

    // Clear chat button
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "msg-popup-close";
    clearBtn.style.cssText = "flex:1;margin:0;background:rgba(255,69,58,.2);color:#ff6b6b;";
    clearBtn.textContent = "Clear Chat";
    clearBtn.addEventListener("click", function() {
      if (!confirm("Clear all chat messages? This cannot be undone.")) return;
      clearBtn.disabled = true;
      clearBtn.textContent = "Clearing...";
      api("/api/clear", { method: "POST", body: {} }).then(function(r) {
        if (r && r.ok) {
          closeMsgPopup();
        } else {
          clearBtn.disabled = false;
          clearBtn.textContent = "Clear Chat";
        }
      }).catch(function() {
        clearBtn.disabled = false;
        clearBtn.textContent = "Clear Chat";
      });
    });
    btnRow.appendChild(clearBtn);
    overviewPage.appendChild(btnRow);

    // ===== Manage page =====
    function loadForumPage() {
      forumPage.dataset.loaded = "1";
      forumPage.innerHTML = '<div style="text-align:center;opacity:.5;padding:20px;">Loading…</div>';

      function refresh() {
        delete forumPage.dataset.loaded;
        loadForumPage();
      }

      api("/api/forum/categories").then(function (res) {
        var cats = (res.ok && res.categories) || [];
        forumPage.innerHTML = "";

        // Categories section
        var catTitle = document.createElement("div");
        catTitle.style.cssText = "font-size:14px;font-weight:700;margin-bottom:8px;";
        catTitle.textContent = "Categories";
        forumPage.appendChild(catTitle);

        var catList = document.createElement("div");
        catList.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-bottom:12px;";
        cats.forEach(function (cat) {
          var row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px;border:var(--glass-hairline);border-radius:10px;background:var(--glass-clear-tint);";
          var nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.value = cat.name;
          nameInput.maxLength = 40;
          nameInput.title = "Tap to rename";
          nameInput.style.cssText = "flex:1;min-width:0;background:rgba(128,128,128,.08);border:1px dashed rgba(140,160,255,.45);border-radius:8px;padding:5px 9px;color:var(--ink);font-size:14px;font-weight:600;outline:none;";
          nameInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); clearTimeout(saveTimer); saveName(); nameInput.blur(); }
          });
          // Save as you type (debounced) — blur/change events are too easy
          // to lose on iOS when the sheet closes.
          var saveTimer = null;
          function saveName() {
            var v = nameInput.value.trim();
            if (!v || v === cat.name) return;
            api("/api/forum/categories/" + encodeURIComponent(cat.id), {
              method: "PUT", body: { name: v }
            }).then(function (r) {
              if (r.ok) { cat.name = v; }
              else { alert(r.error || "Rename failed"); }
            });
          }
          nameInput.addEventListener("input", function () {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(saveName, 700);
          });
          nameInput.addEventListener("blur", function () { clearTimeout(saveTimer); saveName(); });
          row.appendChild(nameInput);

          var moBtn = document.createElement("button");
          moBtn.type = "button";
          var visState = cat.ownerOnly ? "private" : (cat.membersOnly ? "members" : "public");
          moBtn.textContent = visState === "private" ? "\uD83D\uDD12 Private" : (visState === "members" ? "\u2B50 VIPs" : "Public");
          moBtn.title = "Visibility: Public \u2192 Private (only you) \u2192 VIPs \u2192 Public";
          moBtn.style.cssText = "font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;border:var(--glass-hairline);cursor:pointer;background:" + (visState === "private" ? "rgba(120,140,255,.25)" : (visState === "members" ? "rgba(255,200,50,.2)" : "transparent")) + ";color:var(--ink);";
          moBtn.addEventListener("click", function () {
            var next = visState === "public" ? { ownerOnly: true, membersOnly: false }
              : visState === "private" ? { ownerOnly: false, membersOnly: true }
              : { ownerOnly: false, membersOnly: false };
            api("/api/forum/categories/" + encodeURIComponent(cat.id), {
              method: "PUT", body: next
            }).then(function (r) { if (r.ok) refresh(); else alert(r.error || "Failed"); });
          });
          row.appendChild(moBtn);

          if (cat.id !== "general") {
            var delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.textContent = "×";
            delBtn.style.cssText = "font-size:16px;background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 6px;";
            delBtn.addEventListener("click", function () {
              if (!confirm("Delete category '" + cat.name + "'? Its threads move to General.")) return;
              api("/api/forum/categories/" + encodeURIComponent(cat.id), { method: "DELETE" })
                .then(function (r) { if (r.ok) refresh(); });
            });
            row.appendChild(delBtn);
          }
          catList.appendChild(row);
        });
        forumPage.appendChild(catList);

        var newCatRow = document.createElement("div");
        newCatRow.style.cssText = "display:flex;gap:8px;margin-bottom:20px;";
        var newCatInput = document.createElement("input");
        newCatInput.type = "text";
        newCatInput.placeholder = "New category name";
        newCatInput.maxLength = 40;
        newCatInput.style.cssText = "flex:1;padding:8px 12px;border-radius:10px;border:var(--glass-hairline);background:var(--glass-clear-tint);color:var(--ink);font-size:14px;";
        var newCatBtn = document.createElement("button");
        newCatBtn.type = "button";
        newCatBtn.textContent = "Add";
        newCatBtn.className = "btn accent";
        newCatBtn.style.cssText = "padding:8px 16px;font-size:14px;";
        newCatBtn.addEventListener("click", function () {
          var v = newCatInput.value.trim();
          if (!v) return;
          newCatBtn.disabled = true;
          api("/api/forum/categories", { method: "POST", body: { name: v } })
            .then(function (r) { if (r.ok) refresh(); else { alert(r.error || "Failed"); newCatBtn.disabled = false; } });
        });
        newCatRow.appendChild(newCatInput);
        newCatRow.appendChild(newCatBtn);
        forumPage.appendChild(newCatRow);

        // Private access: grant/revoke per-user access to private categories
        var privCats = cats.filter(function (x) { return x.ownerOnly; });
        if (privCats.length) {
          var paTitle = document.createElement("div");
          paTitle.style.cssText = "font-size:14px;font-weight:700;margin-bottom:8px;";
          paTitle.textContent = "Private access";
          forumPage.appendChild(paTitle);
          var paNote = document.createElement("div");
          paNote.style.cssText = "font-size:12px;opacity:.55;margin-bottom:10px;";
          paNote.textContent = "Pick a user and a private category, then set whether they can access it. VIPs always have access to the \uD83D\uDCB5 category.";
          forumPage.appendChild(paNote);
          var paRow = document.createElement("div");
          paRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;";
          var selStyle = "flex:1;min-width:120px;padding:8px 10px;border-radius:10px;border:var(--glass-hairline);background:var(--glass-clear-tint);color:var(--ink);font-size:14px;";
          var userSel = document.createElement("select");
          userSel.style.cssText = selStyle;
          var catSel = document.createElement("select");
          catSel.style.cssText = selStyle;
          privCats.forEach(function (pc) {
            var o = document.createElement("option");
            o.value = pc.id; o.textContent = pc.name;
            catSel.appendChild(o);
          });
          var paBtn = document.createElement("button");
          paBtn.type = "button";
          paBtn.style.cssText = "width:100%;padding:10px;border-radius:10px;border:var(--glass-hairline);font-size:13px;font-weight:700;cursor:pointer;";
          var paUsers = [];
          function paCurrent() {
            var u = paUsers.find(function (x) { return x.username === userSel.value; });
            if (!u) return false;
            return (u.catAccess || []).indexOf(catSel.value) >= 0;
          }
          function paPaint() {
            var has = paCurrent();
            paBtn.textContent = has ? "Has access \u2014 tap to revoke" : "No access \u2014 tap to grant";
            paBtn.style.background = has ? "rgba(52,199,89,.22)" : "rgba(255,255,255,.06)";
            paBtn.style.color = "var(--ink)";
          }
          userSel.addEventListener("change", paPaint);
          catSel.addEventListener("change", paPaint);
          paBtn.addEventListener("click", function () {
            var uname = userSel.value, cid = catSel.value;
            if (!uname || !cid) return;
            var next = !paCurrent();
            paBtn.disabled = true;
            api("/api/forum/category-access", { method: "POST", body: { username: uname, categoryId: cid, access: next } })
              .then(function (r) {
                paBtn.disabled = false;
                if (r && r.ok) {
                  var u = paUsers.find(function (x) { return x.username === uname; });
                  if (u) {
                    if (!Array.isArray(u.catAccess)) u.catAccess = [];
                    var ix = u.catAccess.indexOf(cid);
                    if (next && ix < 0) u.catAccess.push(cid);
                    if (!next && ix >= 0) u.catAccess.splice(ix, 1);
                  }
                  paPaint();
                } else alert((r && r.error) || "Failed");
              }).catch(function () { paBtn.disabled = false; alert("Couldn't reach server."); });
          });
          paRow.appendChild(userSel);
          paRow.appendChild(catSel);
          paRow.appendChild(paBtn);
          forumPage.appendChild(paRow);
          api("/api/users").then(function (r2) {
            if (!r2 || !r2.ok) return;
            paUsers = (r2.users || []).filter(function (x) { return !(getMe() && x.username.toLowerCase() === getMe().username.toLowerCase()); });
            paUsers.forEach(function (x) {
              var o = document.createElement("option");
              o.value = x.username; o.textContent = x.username;
              userSel.appendChild(o);
            });
            paPaint();
          }).catch(function () {});
        }

      }).catch(function () {
        forumPage.innerHTML = '<div style="text-align:center;opacity:.5;padding:20px;">Couldn’t load forum data.</div>';
      });
    }

    function loadManagePage() {
      managePage.dataset.loaded = "1";
      managePage.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:20px;">Loading users...</div>';
      api("/api/users").then(function(r) {
        if (!r || !r.ok || !r.users) {
          managePage.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:20px;">Could not load users.</div>';
          return;
        }
        managePage.innerHTML = "";
        var listTitle = document.createElement("div");
        listTitle.style.cssText = "font-size:14px;font-weight:600;margin-bottom:8px;opacity:.8;";
        listTitle.textContent = "All Users (" + r.users.length + ")";
        managePage.appendChild(listTitle);

        r.users.forEach(function(u) {
          var card = document.createElement("div");
          card.style.cssText = "background:var(--glass-clear-tint);border:var(--glass-hairline);border-radius:14px;padding:12px;margin-bottom:10px;";

          // Header: avatar + name + points
          var head = document.createElement("div");
          head.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:10px;";
          var avW = document.createElement("div");
          avW.style.cssText = "width:36px;height:36px;flex:none;";
          avW.appendChild(avatarNode(u.username, u.avatar, "sm", u.hasAvatarImg ? u.avatarV : undefined));
          head.appendChild(avW);
          var nm = document.createElement("div");
          nm.style.cssText = "flex:1;min-width:0;";
          var nmT = document.createElement("input");
          nmT.type = "text";
          nmT.value = u.username;
          nmT.spellcheck = false;
          nmT.autocomplete = "off";
          nmT.style.cssText = "font-size:14px;font-weight:700;background:transparent;border:none;outline:none;color:var(--ink);width:100%;padding:0;";
          if (u.banned) nmT.style.color = "#ff6b6b";
          nmT.setAttribute("aria-label", "Username");
          // Save on blur or Enter
          var origName = u.username;
          function saveName() {
            var nn = nmT.value.trim();
            if (!nn || nn.toLowerCase() === origName.toLowerCase()) { nmT.value = origName; return; }
            if (!/^[a-z0-9_]{3,16}$/i.test(nn)) { alert("Username must be 3-16 chars (letters, numbers, _)"); nmT.value = origName; return; }
            nmT.disabled = true;
            api("/api/user/" + encodeURIComponent(origName) + "/rename", { method: "POST", body: { newUsername: nn } })
              .then(function(rr) {
                nmT.disabled = false;
                if (rr && rr.ok) { origName = nn; nmT.value = nn; }
                else { alert((rr && rr.error) || "Rename failed."); nmT.value = origName; }
              }).catch(function() { nmT.disabled = false; nmT.value = origName; alert("Couldn't reach server."); });
          }
          nmT.addEventListener("blur", saveName);
          nmT.addEventListener("keydown", function(e) { if (e.key === "Enter") nmT.blur(); });
          // Disable editing for self/grim (set after isSelf/isGrim are defined below via closure check)
          nmT.dataset.protected = "check";
          nm.appendChild(nmT);
          if (u.member) {
            var memTag = document.createElement("span");
            memTag.style.cssText = "font-size:11px;color:#ffd60a;font-weight:700;";
            memTag.textContent = " ⭐ VIP";
            nm.appendChild(memTag);
          }
          if (u.banned) {
            var banTag = document.createElement("span");
            banTag.style.cssText = "font-size:11px;color:#ff6b6b;font-weight:600;";
            banTag.textContent = " (banned)";
            nm.appendChild(banTag);
          }
          var pts = document.createElement("div");
          pts.style.cssText = "font-size:12px;opacity:.5;";
          pts.textContent = "★ " + (u.points || 0) + " · Joined " + new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          nm.appendChild(pts);
          head.appendChild(nm);
          card.appendChild(head);

          // Actions grid
          var acts = document.createElement("div");
          acts.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
          var _me = getMe();
          var isSelf = _me && u.username.toLowerCase() === _me.username.toLowerCase();
          var isGrim = u.username.toLowerCase() === "grim";
          if ((isSelf || isGrim) && nmT.dataset.protected === "check") {
            nmT.disabled = true;
            nmT.style.opacity = ".8";
          }

          function mkBtn(label, color, fn) {
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = label;
            b.style.cssText = "flex:1;min-width:70px;padding:8px 6px;border-radius:10px;border:var(--glass-hairline);background:var(--glass-clear-tint);color:" + color + ";font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;";
            b.addEventListener("click", function() { fn(b); });
            acts.appendChild(b);
            return b;
          }

          if (!isSelf && !isGrim) {
            // Clear messages
            mkBtn("Clear", "#ff9f0a", function(btn) {
              if (!confirm("Delete all messages from " + u.username + "?")) return;
              btn.disabled = true;
              api("/api/user/" + encodeURIComponent(u.username) + "/clear-messages", { method: "POST", body: {} })
                .then(function(rr) {
                  btn.disabled = false;
                  alert(rr && rr.ok ? ("Deleted " + (rr.removed || 0) + " messages.") : "Failed.");
                }).catch(function() { btn.disabled = false; alert("Couldn't reach server."); });
            });
            // Ban/Unban
            mkBtn(u.banned ? "Unban" : "Ban", u.banned ? "#34c759" : "#ff6b6b", function(btn) {
              if (!u.banned && !confirm("Ban " + u.username + "?")) return;
              btn.disabled = true;
              api("/api/ban", { method: "POST", body: { username: u.username, banned: !u.banned } })
                .then(function(rr) {
                  if (rr && rr.ok) { loadManagePageRefresh(); }
                  else { alert("Failed."); btn.disabled = false; }
                }).catch(function() { btn.disabled = false; alert("Couldn't reach server."); });
            });
            // Member toggle
            mkBtn(u.member ? "Remove VIP" : "VIP", u.member ? "#8e8e93" : "#ffd60a", function(btn) {
              if (u.member) {
                if (!confirm("Remove VIP status from " + u.username + "?")) return;
                btn.disabled = true;
                api("/api/user/" + encodeURIComponent(u.username) + "/member", {
                  method: "POST", body: { member: false, amount: null }
                }).then(function(rr) {
                    if (rr && rr.ok) { loadManagePageRefresh(); }
                    else { alert("Failed."); btn.disabled = false; }
                  }).catch(function() { btn.disabled = false; alert("Couldn't reach server."); });
                return;
              }
              memberAmountDialog(u.username, function(amount) {
                btn.disabled = true;
                api("/api/user/" + encodeURIComponent(u.username) + "/member", {
                  method: "POST", body: { member: true, amount: amount }
                }).then(function(rr) {
                    if (rr && rr.ok) { loadManagePageRefresh(); }
                    else { alert("Failed."); btn.disabled = false; }
                  }).catch(function() { btn.disabled = false; alert("Couldn't reach server."); });
              });
            });
            // Delete
            mkBtn("Delete", "#ff453a", function(btn) {
              if (!confirm("DELETE " + u.username + " permanently? Their account will be gone.")) return;
              if (!confirm("Are you sure? This cannot be undone.")) return;
              btn.disabled = true;
              api("/api/user/" + encodeURIComponent(u.username), { method: "DELETE" })
                .then(function(rr) {
                  if (rr && rr.ok) { loadManagePageRefresh(); }
                  else { alert((rr && rr.error) || "Delete failed."); btn.disabled = false; }
                }).catch(function() { alert("Couldn't reach server."); btn.disabled = false; });
            });
          } else {
            var note = document.createElement("div");
            note.style.cssText = "font-size:12px;opacity:.4;font-style:italic;";
            note.textContent = isSelf ? "This is you." : "Protected account.";
            acts.appendChild(note);
          }
          card.appendChild(acts);
          managePage.appendChild(card);
        });

        function memberAmountDialog(username, onPick) {
          var back = document.createElement("div");
          back.className = "mp-dialog-back";
          var box = document.createElement("div");
          box.className = "mp-dialog";
          var title = document.createElement("div");
          title.className = "mp-dialog-title";
          title.textContent = "VIP status for " + username;
          box.appendChild(title);
          var segs = document.createElement("div");
          segs.className = "member-segs";
          var picked = 5;
          [5, 10, 15, 20].forEach(function(a, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = "$" + a;
            if (i === 0) b.className = "on";
            b.addEventListener("click", function() {
              picked = a;
              segs.querySelectorAll("button").forEach(function(x) { x.classList.remove("on"); });
              b.classList.add("on");
            });
            segs.appendChild(b);
          });
          box.appendChild(segs);
          var row = document.createElement("div");
          row.className = "mp-dialog-actions";
          var cancel = document.createElement("button");
          cancel.type = "button";
          cancel.className = "mp-dialog-cancel";
          cancel.textContent = "Cancel";
          cancel.addEventListener("click", function() { back.remove(); });
          var grant = document.createElement("button");
          grant.type = "button";
          grant.className = "mp-dialog-grant";
          grant.textContent = "Grant";
          grant.addEventListener("click", function() { back.remove(); onPick(picked); });
          row.appendChild(cancel);
          row.appendChild(grant);
          box.appendChild(row);
          back.appendChild(box);
          back.addEventListener("click", function(e) { if (e.target === back) back.remove(); });
          document.body.appendChild(back);
        }

        function loadManagePageRefresh() {
          delete managePage.dataset.loaded;
          loadManagePage();
        }
        // Make refresh available to buttons
        managePage._refresh = loadManagePageRefresh;


        if (!r.users.length) {
          managePage.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:20px;">No users yet.</div>';
        }
      }).catch(function() {
        managePage.innerHTML = '<div style="font-size:13px;opacity:.5;text-align:center;padding:20px;">Could not load users.</div>';
      });
    }

    // Close button
    var closeBtn = document.createElement("button");
    closeBtn.className = "msg-popup-close";
    closeBtn.textContent = "Close";
    closeBtn.style.marginTop = "4px";
    closeBtn.onclick = function(e) { e.stopPropagation(); closeMsgPopup(); };
    inner.appendChild(closeBtn);

    ov.appendChild(inner);
    ov.onclick = function(e) { if (e.target === ov) closeMsgPopup(); };
    document.body.appendChild(ov);
  }
  // Expose globally for console access
  window.openAnalytics = openAnalytics;
  // Analytics via URL hash (e.g. misereperdue.com/#analytics)
  (function() {
    function checkHash() {
      if (location.hash === "#analytics") {
        history.replaceState(null, "", location.pathname);
        if (window.openAnalytics) window.openAnalytics();
      }
    }
    window.addEventListener("hashchange", checkHash);
    // Check on load too
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", checkHash);
    } else {
      checkHash();
    }
  })();
})();
