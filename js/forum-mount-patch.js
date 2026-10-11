// Structural scroll fix: body never scrolls, #app is the scroller.
// Safari can't restore a scroll position that doesn't exist.
(function() {
  // 1. Wrap all body content in #app
  function setupApp() {
    if (document.getElementById("app")) return document.getElementById("app");
    var app = document.createElement("div");
    app.id = "app";
    while (document.body.firstChild) {
      app.appendChild(document.body.firstChild);
    }
    document.body.appendChild(app);
    return app;
  }

  var app = setupApp();

  // 2. Redirect window.scrollTo to #app
  var origScrollTo = window.scrollTo.bind(window);
  window.scrollTo = function(x, y) {
    try {
      if (typeof x === "object" && x !== null) {
        app.scrollTo(x);
      } else {
        app.scrollTo(x || 0, y || 0);
      }
    } catch (e) {
      origScrollTo(x, y);
    }
  };

  // 3. Keep window.scrollY in sync (for reads)
  // Note: can't override window.scrollY directly, but most code uses scrollTo for writing.
  // For reads, code should use app.scrollTop. We patch the common patterns via the existing code.

  // 4. Redirect documentElement.scrollTop writes
  // (Some code sets document.documentElement.scrollTop directly)

  // --- Existing patches below ---

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

  // Expose app for debugging and for code that needs scrollTop
  window.MPApp = app;

  // Override window.scrollY/scrollX to read from #app
  try {
    Object.defineProperty(window, "scrollY", {
      get: function() { return app.scrollTop; },
      configurable: true
    });
    Object.defineProperty(window, "scrollX", {
      get: function() { return app.scrollLeft; },
      configurable: true
    });
    Object.defineProperty(window, "pageYOffset", {
      get: function() { return app.scrollTop; },
      configurable: true
    });
  } catch (e) {}

  try {
    var obs = new MutationObserver(function() {
      fixNotifPanel();
      fixLoadingText();
      // Re-wrap if body gets new direct children (shouldn't happen, but safe)
      if (!document.getElementById("app")) setupApp();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  setInterval(function() { fixNotifPanel(); fixLoadingText(); }, 500);
})();
