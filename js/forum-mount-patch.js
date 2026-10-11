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
  setTimeout(replaceDashIcons, 1000);
  setInterval(replaceDashIcons, 2000);

  // Replace Activity metric tab icons with Phosphor fill
  var METRIC_VIEWS = "<path d=\"M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z\"/>";
  var METRIC_VISITORS = "<path d=\"M164.47,195.63a8,8,0,0,1-6.7,12.37H10.23a8,8,0,0,1-6.7-12.37,95.83,95.83,0,0,1,47.22-37.71,60,60,0,1,1,66.5,0A95.83,95.83,0,0,1,164.47,195.63Zm87.91-.15a95.87,95.87,0,0,0-47.13-37.56A60,60,0,0,0,144.7,54.59a4,4,0,0,0-1.33,6A75.83,75.83,0,0,1,147,150.53a4,4,0,0,0,1.07,5.53,112.32,112.32,0,0,1,29.85,30.83,23.92,23.92,0,0,1,3.65,16.47,4,4,0,0,0,3.95,4.64h60.3a8,8,0,0,0,7.73-5.93A8.22,8.22,0,0,0,252.38,195.48Z\"/>";
  var METRIC_MESSAGES = "<path d=\"M232,128A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Z\"/>";
  var METRIC_NEWUSERS = "<path d=\"M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136ZM144,157.68a68,68,0,1,0-71.9,0c-20.65,6.76-39.23,19.39-54.17,37.17A8,8,0,0,0,24,208H192a8,8,0,0,0,6.13-13.15C183.18,177.07,164.6,164.44,144,157.68Z\"/>";
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
  setTimeout(replaceMetricIcons, 1000);
  setInterval(replaceMetricIcons, 2000);




})();
