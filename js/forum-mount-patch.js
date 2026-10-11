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




})();
