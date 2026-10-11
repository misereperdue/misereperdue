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

  // Set nav avatar from user's actual avatar
  function updateNavAvatar() {
    var img = document.getElementById("nav-avatar-img");
    if (!img) return;
    var avatarUrl = null;
    try {
      // Try to get from MPChat
      if (window.MPChat && MPChat.me && MPChat.me.avatar) avatarUrl = MPChat.me.avatar;
      // Fallback: find avatar in forum topbar
      if (!avatarUrl) {
        var forumAvatar = document.querySelector("#forum-me img");
        if (forumAvatar) avatarUrl = forumAvatar.src;
      }
      // Fallback: chat header avatar
      if (!avatarUrl) {
        var chatAvatar = document.querySelector(".chat-header-avatar img, #chat-avatar img");
        if (chatAvatar) avatarUrl = chatAvatar.src;
      }
    } catch (e) {}
    if (avatarUrl && img.src !== avatarUrl) img.src = avatarUrl;
  }
  setInterval(updateNavAvatar, 2000);
  updateNavAvatar();

  // Nav avatar opens profile menu
  try {
    var navAvatar = document.getElementById("nav-avatar");
    if (navAvatar && !navAvatar._wired) {
      navAvatar._wired = true;
      navAvatar.addEventListener("click", function(e) {
        e.stopPropagation();
        if (window.MPChat && MPChat.toggleMeMenu) {
          MPChat.toggleMeMenu(navAvatar);
        } else if (window.MPChat && MPChat.openUserSheet) {
          try {
            var me = (MPChat.me && MPChat.me.username) || "dc";
            MPChat.openUserSheet(me);
          } catch (err) {}
        }
      });
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
