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

  // Reserve space for async forum elements to prevent layout shift
  // Admin buttons (Pin/Delete) appear after /api/me resolves - reserve space now
  try {
    var layoutStyle = document.createElement("style");
    layoutStyle.textContent = [
      ".forum-admin{min-height:34px;}",
      ".forum-thread-row{min-height:80px;}",
      // Prevent avatar pop-in shift
      ".forum-thread-meta img,.forum-thread-meta .avatar{width:24px;height:24px;min-width:24px;min-height:24px;}"
    ].join("");
    document.head.appendChild(layoutStyle);
  } catch (e) {}

  // Dedupe concurrent forum API requests to prevent race-condition re-renders
  // If two /api/forum/threads requests are in-flight, they share the same promise
  try {
    var origFetch = window.fetch;
    var inflight = {};
    window.fetch = function(url, opts) {
      var urlStr = String(url || "");
      // Only dedupe GET requests to forum threads/categories
      if ((!opts || !opts.method || opts.method === "GET") &&
          (urlStr.indexOf("/api/forum/threads") !== -1 || urlStr.indexOf("/api/forum/categories") !== -1)) {
        if (inflight[urlStr]) {
          return inflight[urlStr];
        }
        var p = origFetch.apply(this, arguments);
        inflight[urlStr] = p;
        var cleanup = function() { delete inflight[urlStr]; };
        p.then(cleanup, cleanup);
        return p;
      }
      return origFetch.apply(this, arguments);
    };
  } catch (e) {}


})();
