// Patch: define global mount for reply handler + fix notification panel position
(function() {
  function updateMount() {
    var m = document.querySelector("#forum-reply-editor .forum-editor-mount");
    if (m) window.mount = m;
  }
  setInterval(updateMount, 500);
  updateMount();

  function fixNotifPanel() {
    var panel = document.querySelector(".forum-notif-panel");
    if (!panel || panel._posFixed) return;
    var topbar = document.querySelector(".forum-topbar");
    if (!topbar) return;
    var r = topbar.getBoundingClientRect();
    panel.style.top = (r.bottom + 8) + "px";
    panel.style.left = "auto";
    panel.style.right = (window.innerWidth - r.right) + "px";
    panel.style.width = "280px";
    panel._posFixed = true;
  }

  function fixLoadingText() {
    var els = document.querySelectorAll("div");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el._spinnerFixed) continue;
      var txt = el.textContent;
      if ((txt === "Loading users..." || txt === "Loading..." || txt === "Loading…") && el.children.length === 0) {
        el._spinnerFixed = true;
        el.innerHTML = '<div class="mp-loading-bubble"><span class="mp-spinner"></span></div>';
        el.style.textAlign = "center";
        el.style.padding = "20px";
        el.style.opacity = "1";
        el.style.fontSize = "";
      }
    }
  }

  // Unwrap #app if it exists (revert structural change)
  try {
    var app = document.getElementById("app");
    if (app) {
      while (app.firstChild) {
        document.body.insertBefore(app.firstChild, app);
      }
      app.remove();
    }
  } catch (e) {}

  // Fix share button visibility in light mode (CSS too large to push, inject here)
  try {
    var style = document.createElement("style");
    style.textContent = ".share-btn{background:var(--glass-clear-tint)!important;border:var(--glass-hairline)!important;color:var(--ink)!important;}";
    document.head.appendChild(style);
  } catch (e) {}


  // Scope chat's scroll-to-latest to ONLY the chat page.
  // The chat code calls scrollToLatest on timers/events that fire on other pages too.
  function isChatPage() {
    // NOT chat if forum panel is active (visible)
    var forumPanel = document.getElementById("forum");
    if (forumPanel && forumPanel.classList.contains("on")) return false;
    // NOT chat if auth is visible
    if (document.querySelector(".chat-auth")) return false;
    // NOT chat if shop panel is active
    var shopPanel = document.getElementById("shop");
    if (shopPanel && shopPanel.classList.contains("on")) return false;
    return true;
  }
  // Wrap MPChat.scrollToLatest once chat.js has loaded it
  var scrollWrapTries = 0;
  var scrollWrapIv = setInterval(function() {
    if (window.MPChat && MPChat.scrollToLatest && !MPChat.scrollToLatest._scoped) {
      var orig = MPChat.scrollToLatest;
      // Track user scroll to prevent scroll-fighting
      var userScrolling = false;
      var scrollTimeout = null;
      window.addEventListener("scroll", function() {
        userScrolling = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() { userScrolling = false; }, 150);
      }, { passive: true });
      var wrapped = function() {
        if (!isChatPage()) return;
        // Don't yank scroll if user is actively scrolling
        if (userScrolling) return;
        // Don't pull down if user scrolled up intentionally
        var h = document.documentElement;
        var atBottom = (h.scrollHeight - window.scrollY - window.innerHeight) < 300;
        if (!atBottom) return;
        return orig.apply(this, arguments);
      };
      wrapped._scoped = true;
      MPChat.scrollToLatest = wrapped;
      clearInterval(scrollWrapIv);
    } else if (++scrollWrapTries > 40) {
      clearInterval(scrollWrapIv);
    }
  }, 250);


  try {
    var obs = new MutationObserver(function() {
      fixNotifPanel();
      fixLoadingText();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  setInterval(function() { fixNotifPanel(); fixLoadingText(); }, 500);

  // Replace JS-rendered icons with Phosphor fill versions
  // Maps old path signatures to Phosphor icon names
  function replaceJSCIcons() {
    if (!window.PHIcon) return;
    document.querySelectorAll("svg:not([data-ph])").forEach(function(svg) {
      // Skip nav icons (already Phosphor)
      if (svg.classList.contains("mark")) return;
      
      var paths = svg.querySelectorAll("path");
      if (!paths.length) return;
      var d = paths[0].getAttribute("d") || "";
      var replacement = null;
      var cls = svg.getAttribute("class") || "";
      
      // Back chevron (shop)
      if (d.indexOf("M14.5 5.5L8 12l6.5 6.5") !== -1) replacement = "back";
      // Forward chevron (shop)
      else if (d.indexOf("M9.5 5.5L16 12l-6.5 6.5") !== -1) replacement = "forward";
      // Share/upload (shop product page)
      else if (d.indexOf("M12 15V3") !== -1) replacement = "share";
      // Star (forum)
      else if (svg.innerHTML.indexOf("star") !== -1 || cls.indexOf("star") !== -1) replacement = "star";
      
      if (replacement) {
        var tmp = document.createElement("div");
        tmp.innerHTML = window.PHIcon(replacement, cls);
        var newSvg = tmp.firstChild;
        newSvg.setAttribute("data-ph", "1");
        svg.replaceWith(newSvg);
      } else {
        // Mark as processed to avoid re-checking
        svg.setAttribute("data-ph", "skip");
      }
    });
  }
  setTimeout(replaceJSCIcons, 1000);
  setInterval(replaceJSCIcons, 2000);

  // Replace notification bell with Phosphor bell-simple (immediate, no flash)
  var BELL_INNER = "<path d=\"M168,224a8,8,0,0,1-8,8H96a8,8,0,1,1,0-16h64A8,8,0,0,1,168,224Zm53.81-48.06C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H208a16,16,0,0,0,13.8-24.06Z\"/>";
  function replaceBell() {
    var bell = document.getElementById("forum-bell");
    if (bell && !bell.getAttribute("data-ph-bell")) {
      var svg = bell.querySelector("svg");
      if (svg) {
        svg.setAttribute("viewBox", "0 0 256 256");
        svg.setAttribute("fill", "currentColor");
        svg.removeAttribute("stroke");
        svg.removeAttribute("stroke-width");
        svg.innerHTML = BELL_INNER;
        svg.querySelectorAll("path").forEach(function(p) {
          p.setAttribute("fill", "currentColor");
        });
        bell.setAttribute("data-ph-bell", "1");
      }
    }
  }
  // Watch for bell being added to DOM (replaces instantly, no flash)
  try {
    new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            if (n.id === "forum-bell" || (n.querySelector && n.querySelector("#forum-bell"))) {
              replaceBell();
            }
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  setTimeout(replaceBell, 100);
  setInterval(replaceBell, 2000);

  // Rename Forum to Globe everywhere (immediate, no flash)
  function renameForumToGlobe() {
    document.querySelectorAll(".chat-title").forEach(function(el) {
      if (el.textContent.trim() === "Forum") {
        el.textContent = "Globe";
      }
    });
  }
  // Watch for title being added (catches it before paint)
  try {
    new MutationObserver(function(muts) {
      var found = false;
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            if (n.classList && n.classList.contains("chat-title")) found = true;
            else if (n.querySelector && n.querySelector(".chat-title")) found = true;
          }
        });
      });
      if (found) renameForumToGlobe();
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  setTimeout(renameForumToGlobe, 100);

  // Replace dashboard tab icons with Phosphor fill
  var DASH_CHAT = "<path d=\"M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86Zm-16.25,1.47L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z\"/>";
  var DASH_GLOBE = "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Z\"/>";
  var DASH_GEAR = "<path d=\"M216,130.16q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.6,107.6,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.29,107.29,0,0,0-26.25-10.86,8,8,0,0,0-7.06,1.48L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.6,107.6,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z\"/>";
  function replaceDashIcons() {
    // Find dashboard tab buttons by their SVG content
    document.querySelectorAll("button").forEach(function(btn) {
      var svg = btn.querySelector("svg");
      if (!svg || btn.getAttribute("data-ph-dash")) return;
      var html = svg.outerHTML;
      var label = btn.getAttribute("aria-label") || "";
      
      var replacement = null;
      // Chat tab (has chat bubble path)
      if (html.indexOf("M21 11.5a8.5 8.5") !== -1) replacement = DASH_CHAT;
      // Forum/Globe tab (has forum path)
      else if (html.indexOf("M4 6a2 2 0 0 1 2-2h12") !== -1) {
        replacement = DASH_GLOBE;
        btn.setAttribute("aria-label", "Globe");
      }
      // Gear tab (has gear path)
      else if (html.indexOf('cx="12" cy="12" r="3"') !== -1) replacement = DASH_GEAR;
      
      if (replacement) {
        svg.setAttribute("viewBox", "0 0 256 256");
        svg.setAttribute("fill", "currentColor");
        svg.removeAttribute("stroke");
        svg.removeAttribute("stroke-width");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.innerHTML = replacement;
        btn.setAttribute("data-ph-dash", "1");
      }
    });
  }
  setTimeout(replaceDashIcons, 500);
  // Watch for dashboard re-renders
  try {
    new MutationObserver(function() { replaceDashIcons(); })
      .observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  // Replace Activity metric tab icons with Phosphor fill
  var METRIC_VIEWS = "<path d=\"M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z\"/>";
  var METRIC_VISITORS = "<path d=\"M230.56,110.68a103.92,103.92,0,1,1-85.24-85.24,8,8,0,0,1-2.64,15.78A88.07,88.07,0,0,0,40,128a87.62,87.62,0,0,0,22.24,58.41A79.71,79.71,0,0,1,84,165.1a4,4,0,0,1,4.84.32,59.8,59.8,0,0,0,78.26,0,4,4,0,0,1,4.84-.32,79.86,79.86,0,0,1,21.79,21.31A87.62,87.62,0,0,0,216,128a88.85,88.85,0,0,0-1.22-14.68,8,8,0,1,1,15.78-2.64ZM84,120a44,44,0,1,0,44-44A44,44,0,0,0,84,120ZM237.66,34.34a8,8,0,0,0-11.32,0L200,60.69,189.66,50.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,237.66,34.34Z\"/>";
  var METRIC_MESSAGES = "<path d=\"M232,128A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Z\"/>";
  var METRIC_NEWUSERS = "<path d=\"M128,76a44,44,0,1,1-44,44A44,44,0,0,1,128,76Zm48-12h16V80a8,8,0,0,0,16,0V64h16a8,8,0,0,0,0-16H208V32a8,8,0,0,0-16,0V48H176a8,8,0,0,0,0,16Zm45.35,40.11a8,8,0,0,0-6.57,9.21A88.85,88.85,0,0,1,216,128a87.62,87.62,0,0,1-22.24,58.41A79.86,79.86,0,0,0,172,165.1a4,4,0,0,0-4.84.32,59.81,59.81,0,0,1-78.27,0A4,4,0,0,0,84,165.1a79.71,79.71,0,0,0-21.79,21.31A88,88,0,0,1,128,40a88.76,88.76,0,0,1,14.68,1.22,8,8,0,0,0,2.64-15.78,103.92,103.92,0,1,0,85.24,85.24A8,8,0,0,0,221.35,104.11Z\"/>";
  function replaceMetricIcons() {
    document.querySelectorAll("button").forEach(function(btn) {
      var svg = btn.querySelector("svg");
      if (!svg || btn.getAttribute("data-ph-metric")) return;
      var label = btn.getAttribute("aria-label") || btn.getAttribute("title") || "";
      var html = svg.outerHTML;
      
      var replacement = null;
      // Match by aria-label or by path signature
      if (label === "Views" || html.indexOf("M1 12s4-8 11-8") !== -1) replacement = METRIC_VIEWS;
      else if (label === "Visitors" || html.indexOf("M17 21v-2a4 4 0 0 0-4-4H5") !== -1) replacement = METRIC_VISITORS;
      else if (label === "Messages" || html.indexOf("M21 15a2 2 0 0 1-2 2H7l-4 4V5") !== -1) replacement = METRIC_MESSAGES;
      else if (label === "New Users" || html.indexOf("M16 21v-2a4 4 0 0 0-4-4H5") !== -1) replacement = METRIC_NEWUSERS;
      
      if (replacement) {
        svg.setAttribute("viewBox", "0 0 256 256");
        svg.setAttribute("fill", "currentColor");
        svg.removeAttribute("stroke");
        svg.removeAttribute("stroke-width");
        svg.setAttribute("style", "width:18px;height:18px;");
        svg.innerHTML = replacement;
        btn.setAttribute("data-ph-metric", "1");
      }
    });
  }
  setTimeout(replaceMetricIcons, 500);
  // Remove metric labels (titles) - icons only
  function removeMetricLabels() {
    document.querySelectorAll(".metric-label").forEach(function(el) { el.remove(); });
    document.querySelectorAll('button[aria-label]').forEach(function(btn) {
      var label = btn.getAttribute("aria-label");
      if (["Views", "Visitors", "Messages", "Posts", "New Users", "Users"].indexOf(label) !== -1) {
        btn.style.flexDirection = "";
        btn.style.gap = "";
      }
    });
    // Rename Messages -> Posts, New Users -> Users (aria only, no visible text)
    document.querySelectorAll('button[aria-label="Messages"]').forEach(function(btn) {
      btn.setAttribute("aria-label", "Posts");
      btn.setAttribute("title", "Posts");
    });
    document.querySelectorAll('button[aria-label="New Users"]').forEach(function(btn) {
      btn.setAttribute("aria-label", "Users");
      btn.setAttribute("title", "Users");
    });
  }
  setTimeout(removeMetricLabels, 500);
  setInterval(removeMetricLabels, 2000);

  // Reorder tabs: Views, Visitors, Users, Posts (move Posts to end, rename New Users)
  function reorderMetricTabs() {
    // Find the toggle row (contains the 4 metric buttons)
    var buttons = document.querySelectorAll('button[aria-label="Views"], button[aria-label="Visitors"], button[aria-label="Posts"], button[aria-label="New Users"], button[aria-label="Users"]');
    if (buttons.length !== 4) return;
    
    var container = buttons[0].parentElement;
    if (!container || container.getAttribute("data-reordered")) return;
    
    // Rename New Users -> Users
    buttons.forEach(function(btn) {
      if (btn.getAttribute("aria-label") === "New Users") {
        btn.setAttribute("aria-label", "Users");
        btn.setAttribute("title", "Users");
        var label = btn.querySelector(".metric-label");
        if (label) label.textContent = "Users";
      }
    });
    
    // Re-query after rename
    var viewsBtn = document.querySelector('button[aria-label="Views"]');
    var visitorsBtn = document.querySelector('button[aria-label="Visitors"]');
    var usersBtn = document.querySelector('button[aria-label="Users"]');
    var postsBtn = document.querySelector('button[aria-label="Posts"]');
    
    if (viewsBtn && visitorsBtn && usersBtn && postsBtn) {
      // Order: Views, Visitors, Users, Posts
      container.appendChild(viewsBtn);
      container.appendChild(visitorsBtn);
      container.appendChild(usersBtn);
      container.appendChild(postsBtn);
      container.setAttribute("data-reordered", "1");
    }
  }
  setTimeout(reorderMetricTabs, 1500);
  setInterval(reorderMetricTabs, 3000);

  // Liquid glass sliding pill for dashboard nav and activity tabs
  // IMPORTANT: Only target elements INSIDE the dashboard modal, never the main site navbar
  function initSlidingPills() {
    // Find the dashboard modal/container (it contains "Dashboard" text)
    var dashboard = null;
    document.querySelectorAll("div").forEach(function(d) {
      if (d.textContent.trim().indexOf("Dashboard") === 0 && d.children.length > 3) {
        // Likely the dashboard container - verify it has the tab buttons
        if (d.querySelector('button[aria-label="Chat"]') && d.querySelector('button[aria-label="Views"]')) {
          dashboard = d;
        }
      }
    });
    if (!dashboard) return;
    
    // Dashboard nav (the 3 tabs: Chat, Globe, Manage) - ONLY inside dashboard
    var chatBtn = dashboard.querySelector('button[aria-label="Chat"]');
    if (chatBtn && chatBtn.parentElement && !chatBtn.parentElement.getAttribute("data-pill")) {
      // Make sure this is NOT the main navbar (main navbar is not inside dashboard)
      var navContainer = chatBtn.parentElement;
      setupSlidingPill(navContainer, 'button[aria-label="Chat"], button[aria-label="Forum"], button[aria-label="Globe"], button[aria-label="Manage"]');
    }
    
    // Activity metric tabs - ONLY inside dashboard
    var viewsBtn = dashboard.querySelector('button[aria-label="Views"]');
    if (viewsBtn && viewsBtn.parentElement && !viewsBtn.parentElement.getAttribute("data-pill")) {
      var metricContainer = viewsBtn.parentElement;
      setupSlidingPill(metricContainer, 'button[aria-label="Views"], button[aria-label="Visitors"], button[aria-label="Users"], button[aria-label="Posts"]');
    }
  }
  
  // Remove any pill effects from the main site navbar (cleanup)
  function cleanupMainNav() {
    // Main navbar is NOT inside dashboard - remove data-pill and restore
    document.querySelectorAll("nav [data-pill], body > div [data-pill]").forEach(function(el) {
      // Check if this is inside the dashboard
      var inDashboard = false;
      var p = el;
      while (p) {
        if (p.textContent && p.textContent.trim().indexOf("Dashboard") === 0) { inDashboard = true; break; }
        p = p.parentElement;
      }
      if (!inDashboard) {
        el.removeAttribute("data-pill");
        var pill = el.querySelector(".sliding-pill");
        if (pill) pill.remove();
        // Restore original styles
        el.style.position = "";
        el.style.background = "";
        el.style.backdropFilter = "";
        el.style.webkitBackdropFilter = "";
        el.style.borderRadius = "";
        el.style.padding = "";
        el.style.border = "";
      }
    });
  }
  setTimeout(cleanupMainNav, 1000);
  setInterval(cleanupMainNav, 3000);
  
  function setupSlidingPill(container, selector) {
    if (!container) return;
    container.setAttribute("data-pill", "1");
    container.style.position = "relative";
    container.style.background = "rgba(127,127,127,0.12)";
    container.style.backdropFilter = "blur(20px) saturate(180%)";
    container.style.webkitBackdropFilter = "blur(20px) saturate(180%)";
    container.style.borderRadius = "20px";
    container.style.padding = "4px";
    container.style.border = "1px solid rgba(255,255,255,0.15)";
    
    // Create the sliding pill
    var pill = document.createElement("div");
    pill.className = "sliding-pill";
    pill.style.cssText = "position:absolute;top:4px;bottom:4px;border-radius:16px;" +
      "background:rgba(255,255,255,0.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);" +
      "border:1px solid rgba(255,255,255,0.25);box-shadow:0 2px 12px rgba(0,0,0,0.15);" +
      "transition:left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1);" +
      "pointer-events:none;z-index:0;";
    container.insertBefore(pill, container.firstChild);
    
    var buttons = Array.prototype.slice.call(container.querySelectorAll(selector));
    buttons.forEach(function(btn) {
      btn.style.position = "relative";
      btn.style.zIndex = "1";
      btn.style.background = "transparent";
      btn.style.border = "none";
      btn.style.borderRadius = "16px";
    });
    
    function movePill() {
      var active = buttons.find(function(b) {
        return b.style.background.indexOf("0,122,255") !== -1 || 
               b.getAttribute("data-active") === "1" ||
               b.classList.contains("active");
      }) || buttons[0];
      
      if (active) {
        pill.style.left = active.offsetLeft + "px";
        pill.style.width = active.offsetWidth + "px";
      }
    }
    
    // Watch for active changes
    buttons.forEach(function(btn) {
      btn.addEventListener("click", function() { setTimeout(movePill, 50); });
    });
    
    setTimeout(movePill, 100);
    // Re-position on resize
    window.addEventListener("resize", movePill);
  }
  
  // Apply pills INSTANTLY when dashboard appears (no flash of old style)
  try {
    new MutationObserver(function(muts) {
      var dashboardAppeared = false;
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            // Check if dashboard was added
            if (n.querySelector) {
              var chatBtn = n.querySelector('button[aria-label="Chat"]');
              var viewsBtn = n.querySelector('button[aria-label="Views"]');
              if (chatBtn && viewsBtn) dashboardAppeared = true;
            }
            // Or if the node itself is part of dashboard
            if (n.getAttribute && (n.getAttribute("aria-label") === "Chat" || n.getAttribute("aria-label") === "Views")) {
              dashboardAppeared = true;
            }
          }
        });
      });
      if (dashboardAppeared) {
        // Run immediately, don't wait
        initSlidingPills();
      }
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  // Fallback: also try on interval for already-open dashboards
  setTimeout(initSlidingPills, 500);
  setInterval(function() {
    if (!document.querySelector('[data-pill]')) initSlidingPills();
  }, 3000);

  // Stacked bars for Posts graph (posts = darker blue, replies = lighter blue)
  function enhancePostsGraph() {
    // Check if Posts tab is active (look for the active pill position or button state)
    var postsBtn = document.querySelector('button[aria-label="Posts"]');
    if (!postsBtn) return;
    
    // Find the graph SVG
    var svg = document.querySelector('svg[width]');
    if (!svg || svg.getAttribute("data-stacked")) return;
    
    // Check if this is the Posts graph by looking at the summary text
    var summary = document.querySelector('div[style*="text-align:center"]');
    if (!summary || summary.textContent.indexOf("total") === -1) return;
    
    // Get the stats data from the dashboard (stored globally or fetch)
    // For now, we'll watch for the data in the page
    // This is a simplified version - the full implementation needs the stats data
    
    // Mark as processed to avoid re-processing
    svg.setAttribute("data-stacked", "1");
  }
  
  // Watch for graph updates
  try {
    new MutationObserver(function() {
      // Only enhance if Posts tab appears to be active
      var activeBtn = document.querySelector('button[aria-label="Posts"]');
      if (activeBtn && activeBtn.style.background.indexOf("0,122,255") !== -1) {
        setTimeout(enhancePostsGraph, 100);
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  } catch (e) {}

  // Add Countries section below Newest Users
  function addCountriesSection() {
    // Find Newest Users section
    var headers = document.querySelectorAll("div");
    var newestHeader = null;
    headers.forEach(function(h) {
      if (h.textContent.trim() === "Newest Users" && h.children.length === 0) {
        newestHeader = h;
      }
    });
    if (!newestHeader) return;
    
    var container = newestHeader.parentElement;
    if (!container || document.getElementById("countries-section")) return;
    
    // Create section
    var section = document.createElement("div");
    section.id = "countries-section";
    section.style.cssText = "margin-top:20px;";
    section.innerHTML = '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">Countries</div>' +
      '<div id="countries-list" style="font-size:13px;opacity:0.7;">Loading...</div>';
    container.appendChild(section);
    
    // Fetch and display using direct fetch with the stored token
    try {
      var chatToken = null;
      try { chatToken = localStorage.getItem("chat_token"); } catch (e) {}
      if (chatToken) {
        fetch("https://misery-chat.freeglory416.workers.dev/api/analytics/stats", {
          headers: { "Authorization": "Bearer " + chatToken, "Content-Type": "application/json" }
        }).then(function(r) { return r.json(); }).then(function(data) {
          var list = document.getElementById("countries-list");
          if (!list) return;
          if (!data || !data.ok || !data.stats || !data.stats.days) {
            list.textContent = "No country data yet.";
            return;
          }
          // Aggregate countries across all days
          var totals = {};
          data.stats.days.forEach(function(day) {
            var countries = day.countries || {};
            Object.keys(countries).forEach(function(c) {
              totals[c] = (totals[c] || 0) + countries[c];
            });
          });
          // Sort by count
          var sorted = Object.keys(totals).sort(function(a, b) { return totals[b] - totals[a]; });
          if (!sorted.length) {
            list.textContent = "No country data yet.";
            return;
          }
          list.style.opacity = "1";
          list.innerHTML = sorted.slice(0, 10).map(function(c) {
            return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(127,127,127,0.1);">' +
              '<span>' + c + '</span><span style="opacity:0.7;">' + totals[c] + '</span></div>';
          }).join("");
        }).catch(function() {
          var list = document.getElementById("countries-list");
          if (list) list.textContent = "No country data yet.";
        });
      } else {
        var list2 = document.getElementById("countries-list");
        if (list2) list2.textContent = "No country data yet.";
      }
    } catch (e) {}
  }
  setTimeout(addCountriesSection, 2000);
  setInterval(function() {
    if (!document.getElementById("countries-section")) addCountriesSection();
  }, 5000);
  // Watch for metric re-renders
  try {
    new MutationObserver(function() { replaceMetricIcons(); })
      .observe(document.body, { childList: true, subtree: true });
  } catch (e) {}




})();
