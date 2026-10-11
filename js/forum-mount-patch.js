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

  // Hide forum loader when threads render
  function checkForumLoaded() {
    var loader = document.getElementById("forum-loader");
    if (!loader || loader.classList.contains("hidden")) return;
    var threads = document.querySelectorAll(".forum-thread");
    if (threads.length > 0) {
      // Wait a beat for images/layout to settle, then fade
      setTimeout(function() {
        loader.classList.add("hidden");
        setTimeout(function() { loader.style.display = "none"; }, 500);
      }, 300);
    }
  }
  setInterval(checkForumLoaded, 500);
  // Show loader when forum panel becomes active
  try {
    var forumPanel = document.getElementById("forum");
    if (forumPanel) {
      var panelObs = new MutationObserver(function() {
        var loader = document.getElementById("forum-loader");
        if (!loader) return;
        if (forumPanel.classList.contains("on")) {
          // Forum activated: show loader until threads render
          if (loader.classList.contains("hidden")) {
            loader.classList.remove("hidden");
            loader.style.display = "";
          }
        }
      });
      panelObs.observe(forumPanel, { attributes: true, attributeFilter: ["class"] });
    }
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
