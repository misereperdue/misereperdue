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

  // Skeleton placeholders + image aspect ratios to prevent layout shift
  try {
    var skelStyle = document.createElement("style");
    skelStyle.textContent = [
      ".forum-skel{padding:12px;display:flex;flex-direction:column;gap:12px;}",
      ".forum-skel-item{background:var(--glass-clear-tint);border:var(--glass-hairline);border-radius:16px;padding:16px;min-height:120px;}",
      ".forum-skel-line{height:14px;border-radius:7px;background:linear-gradient(90deg,rgba(127,127,127,.15) 25%,rgba(127,127,127,.25) 50%,rgba(127,127,127,.15) 75%);background-size:200% 100%;animation:skel-shimmer 1.5s infinite;}",
      ".forum-skel-line.short{width:60%;}",
      ".forum-skel-line.tiny{width:40%;height:10px;}",
      "@keyframes skel-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}",
      ".forum-post-body img{aspect-ratio:16/10;object-fit:cover;width:100%;background:var(--glass-clear-tint);}",
      ".forum-thread img{aspect-ratio:16/10;object-fit:cover;}"
    ].join("");
    document.head.appendChild(skelStyle);
  } catch (e) {}

  function showSkeletons() {
    var root = document.getElementById("forum-root");
    if (!root || root._skelShown) return;
    // Only show if forum is empty (hasn't rendered yet)
    if (root.children.length === 0 || root.textContent.trim() === "") {
      root._skelShown = true;
      var html = '<div class="forum-skel">';
      for (var i = 0; i < 4; i++) {
        html += '<div class="forum-skel-item"><div class="forum-skel-line short"></div><div style="height:8px"></div><div class="forum-skel-line"></div><div style="height:8px"></div><div class="forum-skel-line tiny"></div></div>';
      }
      html += '</div>';
      root.innerHTML = html;
    }
  }
  // Show skeletons when forum panel activates
  try {
    var fPanel = document.getElementById("forum");
    if (fPanel) {
      new MutationObserver(function() {
        if (fPanel.classList.contains("on")) {
          // Reset skeleton flag so they show on re-entry
          var r = document.getElementById("forum-root");
          if (r) r._skelShown = false;
          showSkeletons();
        }
      }).observe(fPanel, { attributes: true, attributeFilter: ["class"] });
    }
  } catch (e) {}
  // Also try on load in case forum is the default view
  setTimeout(showSkeletons, 100);

  // Fix share button visibility in light mode (CSS too large to push, inject here)
  try {
    var style = document.createElement("style");
    style.textContent = ".share-btn{background:var(--glass-clear-tint)!important;border:var(--glass-hairline)!important;color:var(--ink)!important;}";
    document.head.appendChild(style);
  } catch (e) {}


  // Scope chat's scroll-to-latest to ONLY the chat page.
  // The chat code calls scrollToLatest on timers/events that fire on other pages too.
  function isChatPage() {
    // NOT chat if forum, shop, or auth is visible
    if (document.querySelector(".forum-topbar")) return false;
    if (document.querySelector(".chat-auth")) return false;
    // Shop detection: look for shop-specific containers
    if (document.querySelector("[data-shop-view]")) return false;
    return true;
  }
  // Wrap MPChat.scrollToLatest once chat.js has loaded it
  var scrollWrapTries = 0;
  var scrollWrapIv = setInterval(function() {
    if (window.MPChat && MPChat.scrollToLatest && !MPChat.scrollToLatest._scoped) {
      var orig = MPChat.scrollToLatest;
      var wrapped = function() {
        if (!isChatPage()) return;
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
})();
