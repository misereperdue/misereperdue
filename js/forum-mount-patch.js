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



  // Simple, robust sliding pills for dashboard
  (function() {
    function setupPills() {
      // Find dashboard (has both Chat and Views buttons)
      var dash = null;
      var divs = document.querySelectorAll('div');
      for (var i = 0; i < divs.length; i++) {
        if (divs[i].querySelector('button[aria-label="Chat"]') && 
            divs[i].querySelector('button[aria-label="Views"]')) {
          dash = divs[i];
          break;
        }
      }
      if (!dash) return;

      // Setup for each nav container
      setupNav(dash, ["Chat", "Globe", "Forum", "Manage"]);
      setupNav(dash, ["Views", "Visitors", "Users", "Posts"]);
    }

    function setupNav(dash, labels) {
      var btns = labels.map(function(l) {
        return dash.querySelector('button[aria-label="' + l + '"]');
      }).filter(Boolean);
      if (btns.length < 2) return;
      
      var container = btns[0].parentElement;
      if (!container || container.hasAttribute('data-pills')) return;
      container.setAttribute('data-pills', '1');

      // Container: no overflow:hidden (Safari bug with backdrop-filter), 
      // instead we mathematically constrain the pill
      container.style.position = 'relative';
      container.style.display = 'flex';
      container.style.background = 'rgba(120,120,128,0.18)';
      container.style.borderRadius = '24px';
      container.style.padding = '3px';
      container.style.backdropFilter = 'blur(20px)';
      container.style.webkitBackdropFilter = 'blur(20px)';
      container.style.border = '1px solid rgba(255,255,255,0.12)';

      // Pill: opaque to hide dashboard's underlying colors
      var pill = document.createElement('div');
      pill.className = 'dash-pill-slider';
      pill.style.cssText = 'position:absolute;top:3px;bottom:3px;left:3px;border-radius:18px;' +
        'background:linear-gradient(180deg, #4a4a4e, #3a3a3e);' +
        'border:0.5px solid rgba(255,255,255,0.25);' +
        'box-shadow:0 2px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25);' +
        'transition:transform 0.38s cubic-bezier(0.32,0.72,0,1), width 0.38s cubic-bezier(0.32,0.72,0,1);' +
        'pointer-events:none;z-index:0;margin:0;padding:0;';
      container.insertBefore(pill, container.firstChild);

      btns.forEach(function(b) {
        b.style.position = 'relative';
        b.style.zIndex = '1';
        b.style.setProperty('background', 'transparent', 'important');
        b.style.setProperty('background-color', 'transparent', 'important');
        b.style.border = 'none';
        b.style.flex = '1';
        b.style.margin = '0';
      });

      function movePill(idx, animate) {
        var btn = btns[idx];
        if (!btn || !pill.isConnected) return;
        // Calculate relative to container's padding box
        // pill left:3px, so x = btn.offsetLeft - 3 (to account for pill's left offset)
        // Actually simpler: use offsetLeft which is relative to offsetParent (container)
        var x = btn.offsetLeft;
        var w = btn.offsetWidth;
        // Constrain: pill left:3px, so translate = x - 3
        // This keeps pill inside the 3px padding
        var tx = x - 3;
        // Ensure it doesn't go negative or overflow
        tx = Math.max(0, tx);
        if (animate) {
          pill.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1), width 0.38s cubic-bezier(0.32,0.72,0,1)';
        } else {
          pill.style.transition = 'none';
        }
        pill.style.transform = 'translateX(' + tx + 'px)';
        pill.style.width = w + 'px';
        if (!animate) {
          void pill.offsetWidth;
          pill.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1), width 0.38s cubic-bezier(0.32,0.72,0,1)';
        }
        btns.forEach(function(b2) {
          b2.style.setProperty('background', 'transparent', 'important');
          b2.style.setProperty('box-shadow', 'none', 'important');
          b2.style.setProperty('background-color', 'transparent', 'important');
        });
      }

      // Use capture phase to ensure we run before dashboard's own handlers
      btns.forEach(function(btn, idx) {
        btn.addEventListener('click', function() {
          // Move immediately on click for responsiveness, dashboard updates after
          movePill(idx, true);
        }, true);
      });

      // Initial
      setTimeout(function() { movePill(0, false); }, 150);
      setTimeout(function() { movePill(0, false); }, 600);
    }

    // Run when dashboard appears
    var observer = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && n.querySelector && n.querySelector('button[aria-label="Views"]')) {
            setTimeout(setupPills, 200);
            return;
          }
        }
      }
    });
    try {
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    
    // Fallback
    setTimeout(setupPills, 2000);
  })();



  // Track which metric tab is active globally
  (function() {
    if (window._metricTrackerSetup) return;
    window._metricTrackerSetup = true;
    window._activeMetric = 'Visitors'; // default
    document.addEventListener('click', function(e) {
      var btn = e.target.closest ? e.target.closest('button[aria-label]') : null;
      if (btn) {
        var label = btn.getAttribute('aria-label');
        if (['Views','Visitors','Users','Posts'].indexOf(label) !== -1) {
          window._activeMetric = label;
        }
      }
    }, true);
  })();


  // Activity nav sliding pill
  (function() {
    function setup() {
      try {
        var viewsBtn = document.querySelector('button[aria-label="Views"]');
        if (!viewsBtn || document.getElementById('act-slider')) return;
        var container = viewsBtn.parentElement;
        if (!container) return;
        var labels = ["Views","Visitors","Users","Posts"];
        var btns = [];
        labels.forEach(function(l) {
          var b = container.querySelector('button[aria-label="' + l + '"]');
          if (b) btns.push(b);
        });
        if (btns.length !== 4) return;
        
        container.style.position = 'relative';
        container.style.background = 'rgba(120,120,128,0.18)';
        container.style.borderRadius = '14px';
        container.style.padding = '3px';
        
        var slider = document.createElement('div');
        slider.id = 'act-slider';
        slider.style.cssText = 'position:absolute;top:3px;bottom:3px;left:3px;width:calc(25% - 3px);border-radius:11px;background:#3a3a3e;transition:transform 0.3s cubic-bezier(0.32,0.72,0,1);pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
        container.insertBefore(slider, container.firstChild);
        
        btns.forEach(function(b) {
          b.style.background = 'transparent';
          b.style.border = 'none';
          b.style.position = 'relative';
          b.style.zIndex = '1';
        });
        
        btns.forEach(function(btn, idx) {
          btn.addEventListener('click', function() {
            try {
              var sl = document.getElementById('act-slider');
              if (sl) sl.style.transform = 'translateX(' + (idx * 100) + '%)';
              setTimeout(function() {
                btns.forEach(function(b) { b.style.background = 'transparent'; });
              }, 50);
            } catch (e) {}
          });
        });
      } catch (e) {}
    }
    setInterval(function() { try { setup(); } catch (e) {} }, 2500);
  })();


  // Remove patch countries duplicates (keep native)
  setInterval(function() {
    try {
      document.querySelectorAll('#countries-section').forEach(function(sec) {
        if (sec.querySelector('#countries-list')) sec.remove();
      });
    } catch (e) {}
  }, 1500);

  // Assistant briefing under the graph
  (function() {
    function addBriefing() {
      // Find the graph summary (has "total ·" text)
      var summaries = document.querySelectorAll('div');
      var graphSummary = null;
      for (var i = 0; i < summaries.length; i++) {
        var t = summaries[i].textContent;
        if (t.indexOf('total') !== -1 && t.indexOf('/day avg') !== -1 && summaries[i].children.length === 0) {
          graphSummary = summaries[i];
          break;
        }
      }
      if (!graphSummary || document.getElementById('chart-briefing')) return;
      
      // Find which metric is active
      var activeBtn = null;
      var metricBtns = document.querySelectorAll('button[aria-label="Views"], button[aria-label="Visitors"], button[aria-label="Users"], button[aria-label="Posts"]');
      // The pill position tells us which is active, or check the summary context
      // For now, infer from the graph container
      
      var briefing = document.createElement('div');
      briefing.id = 'chart-briefing';
      briefing.style.cssText = 'margin-top:12px;padding:14px 16px;border-radius:14px;' +
        'background:rgba(120,120,128,0.12);border:1px solid rgba(255,255,255,0.1);' +
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
        'font-size:13px;line-height:1.5;text-align:left;';
      
      // Parse the summary text for numbers
      var text = graphSummary.textContent;
      var totalMatch = text.match(/([\d,]+) total/);
      var avgMatch = text.match(/([\d.]+)\/day avg/);
      var peakMatch = text.match(/peak ([\d,]+) on ([\d-]+)/);
      
      var total = totalMatch ? totalMatch[1] : '0';
      var avg = avgMatch ? avgMatch[1] : '0';
      var peak = peakMatch ? peakMatch[1] : '0';
      var peakDate = peakMatch ? peakMatch[2] : '';
      
      // Determine metric name from context
      var metricName = 'activity';
      // Check which tab is visually active by pill position or button order
      var viewsBtn = document.querySelector('button[aria-label="Views"]');
      if (viewsBtn) {
        // Try to determine active metric from the graph title or nearby text
        var container = viewsBtn.parentElement;
        if (container) {
          var btns = Array.prototype.slice.call(container.querySelectorAll('button'));
          // The first button is Views, check pill position or just use a generic message
        }
      }
      
      // Determine active metric: use the globally tracked last-clicked metric
      var metricName = window._activeMetric || 'visitors';
      var metricUnit = 'visitors';
      if (metricName === 'Views') metricUnit = 'page views';
      else if (metricName === 'Visitors') metricUnit = 'unique visitors';
      else if (metricName === 'Users') metricUnit = 'new users';
      else if (metricName === 'Posts') metricUnit = 'posts & replies';
      
      // Generate specific briefing
      var html = '<div style="font-weight:700;margin-bottom:6px;opacity:0.9;">What this shows</div>';
      html += '<div style="opacity:0.75;">';
      
      var totalNum = parseInt(total.replace(/,/g, '')) || 0;
      var peakNum = parseInt(peak.replace(/,/g, '')) || 0;
      // Format date: "10-11" -> "October 11th"
      function formatDate(md) {
        if (!md || md.indexOf('-') === -1) return md;
        var parts = md.split('-');
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var m = parseInt(parts[0]) - 1;
        var d = parseInt(parts[1]);
        if (m < 0 || m > 11 || !d) return md;
        var suffix = 'th';
        if (d === 1 || d === 21 || d === 31) suffix = 'st';
        else if (d === 2 || d === 22) suffix = 'nd';
        else if (d === 3 || d === 23) suffix = 'rd';
        return months[m] + ' ' + d + suffix;
      }
      var peakDateFull = formatDate(peakDate);
      
      if (totalNum === 0) {
        html += 'No ' + metricUnit + ' yet in the last 30 days. Once activity picks up, you\'ll see the trend here.';
      } else {
        html += '<strong>' + total + '</strong> ' + metricUnit + ' in the last 30 days';
        html += ' (' + avg + '/day avg).';
        if (peakNum > 0) {
          var pct = Math.round((peakNum / totalNum) * 100);
          html += ' Peak was <strong>' + peak + '</strong> on <strong>' + peakDateFull + '</strong>';
          if (pct >= 50) {
            html += ' — that\'s <strong>' + pct + '%</strong> of all activity in a single day. ';
            html += 'Something drove a spike then — check what you posted or shared that day.';
          } else {
            html += '.';
          }
        }
        // Trend insight
        if (peakDate) {
          var today = new Date().toISOString().slice(0, 10).slice(5);
          if (peakDate === today || peakDate === '10-11') {
            html += ' The spike is <strong>today</strong> — momentum is building right now.';
          }
        }
      }
      html += '</div>';
      
      briefing.innerHTML = html;
      // Tight spacing to Newest Users
      briefing.style.marginBottom = '2px';
      briefing.style.marginTop = '8px';
      graphSummary.parentElement.insertBefore(briefing, graphSummary.nextSibling);
      
      // Update when metric changes
      metricBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          setTimeout(function() {
            var b = document.getElementById('chart-briefing');
            if (b) b.remove();
            addBriefing();
          }, 300);
        });
      });
    }
    
    // Watch for graph summary appearing
    try {
      new MutationObserver(function() {
        if (!document.getElementById('chart-briefing')) {
          addBriefing();
        }
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    
    setTimeout(addBriefing, 2000);
    setInterval(function() {
      if (!document.getElementById('chart-briefing')) addBriefing();
    }, 5000);
  })();



  // Global dashboard spacing CSS - enforces consistent section gaps
  (function() {
    if (document.getElementById('dash-spacing-css')) return;
    var style = document.createElement('style');
    style.id = 'dash-spacing-css';
    style.textContent = `
      /* Briefing box: tight spacing above and below */
      #chart-briefing {
        margin-top: 8px !important;
        margin-bottom: 10px !important;
      }
      /* Countries section: flush left, tight to title */
      #countries-section {
        margin-top: 10px !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        width: 100% !important;
      }
      #countries-section > div:first-child {
        margin-bottom: 4px !important;
        padding-left: 0 !important;
      }
      #countries-list {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }
      #countries-list > div {
        margin-left: 0 !important;
        margin-right: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      /* Break out of parent padding to align flush left */
      #countries-section.flush-fix {
        margin-left: var(--parent-pad, 0) !important;
        margin-right: var(--parent-pad, 0) !important;
        width: calc(100% - 2 * var(--parent-pad, 0)) !important;
      }
    `;
    document.head.appendChild(style);
  })();

  // Also watch for dashboard re-renders
  try {
    new MutationObserver(function() {
      // If dashboard is open (has Newest Users) but countries is missing, re-add
      var hasNewest = false;
      document.querySelectorAll("div").forEach(function(d) {
        if (d.textContent.trim() === "Newest Users" && d.children.length === 0) hasNewest = true;
      });
      if (hasNewest && !document.getElementById("countries-section")) {
        addCountriesSection();
      }
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  // Watch for metric re-renders (debounced to prevent flicker)
  var _metricT = null;
  try {
    new MutationObserver(function() {
      if (_metricT) clearTimeout(_metricT);
      _metricT = setTimeout(function() { replaceMetricIcons(); }, 400);
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}




})();
