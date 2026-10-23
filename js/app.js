// App boot (was inline in index.html; moved out so the CSP can drop 'unsafe-inline').
// Module version pins live in index.html <script type="application/json" id="mp-pins">,
// so bumping a module only touches index.html (+ sw.js), not this file.
var MP_PINS = (function () { try { return JSON.parse(document.getElementById("mp-pins").textContent); } catch (e) { return {}; } })();
function MP_PIN(f) { return MP_PINS[f] || f; }

    // Lazy-load non-critical modules (shop, forum, dashboard, icons) after the
    // chat is up. Parallel via Promise.allSettled, except two ordering
    // dependencies: shop.js needs MP (cart.js) + MPShopify (shopify.js) at
    // render time, and forum-mount-patch rewrites forum3's icons, so it
    // loads after forum3.js. Each module renders its view on arrival if
    // the user is already looking at it.
    (function () {
      var PATCH = MP_PIN("js/forum-mount-patch.js");
      function afterLoad(src) {
        try {
          if (src.indexOf("cart.js") >= 0 && window.MPNav) {
            if (MPNav.refreshPostBtn) MPNav.refreshPostBtn();
          }
          if (src.indexOf("forum3.js") >= 0 && window.MPForum) {
            // Plain Globe view (not a deep-linked thread — routeFromHash polls for those)
            var h = location.hash || "#";
            if (h === "#globe" || h === "#global" || h === "#forum") {
              if (MPForum.goHome) MPForum.goHome(); else MPForum.render();
            }
          }
          if (src.indexOf("shop.js") >= 0 && window.MPShop) {
            if (window.current && current.type === "shop" && MPShop.renderShop) MPShop.renderShop();
            if (window.current && current.type === "cart" && MPShop.renderCartPanel) MPShop.renderCartPanel();
          }
        } catch (e) {}
      }
      function loadOne(src, retries) {
        return new Promise(function (resolve) {
          var s = document.createElement("script");
          s.src = src;
          s.async = true;
          s.onload = function () { afterLoad(src); resolve(); };
          s.onerror = function () {
            if (retries < 1) setTimeout(function () { loadOne(src, retries + 1).then(resolve); }, 3000);
            else resolve(); // skip a failed module; chat still works
          };
          document.head.appendChild(s);
        });
      }
      var jobs = [
        MP_PIN("js/dashboard-v2.js"),
        MP_PIN("js/social-logos.js"),
        MP_PIN("js/ph-icons.js")
      ].map(function (src) { return loadOne(src, 0); });
      // Shop chain: shop.js renders with MP + MPShopify.
      jobs.push(Promise.all([
        loadOne(MP_PIN("js/shopify.js"), 0),
        loadOne(MP_PIN("js/cart.js"), 0)
      ]).then(function () { return loadOne(MP_PIN("js/shop.js"), 0); }));
      // vip3d.js / mask3d.js are loaded on demand by shop.js (lazy3d).
      // Forum chain: patch after forum3.js.
      jobs.push(loadOne(MP_PIN("js/forum3.js"), 0).then(function () { return loadOne(PATCH, 0); }));
      if (window.Promise && Promise.allSettled) Promise.allSettled(jobs);
    })();
  

    var nav = document.getElementById("nav");
    var current = { type: "shop", id: "" };
    // Apply crop-hero on initial load too (show() doesn't run on fresh load)
    function applyCropHero() {
      var isAuth = typeof isAuthView === "function" && isAuthView();
      var isShop = current.type === "shop";
      document.body.classList.toggle("crop-hero", isShop || (current.type === "journal" && isAuth));
      document.body.classList.toggle("crop-hero-auth", current.type === "journal" && isAuth);
      document.body.classList.toggle("crop-hero-shop", isShop);
      document.body.classList.toggle("crop-hero-fade", current.type === "product" || current.type === "cart");
    }

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];
      });
    }
    function refreshSeg() {
      requestAnimationFrame(function () {
        var t = current.type === "product" ? "shop" : current.type;
        var btn = nav.querySelector('button[data-view="' + t + '"]') ||
                  nav.querySelector('button[data-view="journal"]');
        if (btn) nav.querySelector(".seg").style.transform = "translateX(" + (btn.offsetLeft - 4) + "px)";
      });
    }
    function refreshPostBtn() {
      var btn = document.getElementById("post-btn");
      var badge = document.getElementById("post-badge");
      var cartBtn = document.getElementById("cart-btn");
      var split = nav.querySelector(".split");
      if (!btn || !window.MP) return;
      var onProduct = current.type === "product";
      var n = MP.cartCount();
      // the bag always lives in the sectioned area; on product pages the sectioned slot becomes the bag
      var bagMode = onProduct && n > 0;
      var showSplit = bagMode || n > 0;
      btn.classList.toggle("bag-mode", bagMode);
      btn.style.display = bagMode ? "grid" : "none";
      if (split) split.style.display = showSplit ? "block" : "none";
      btn.setAttribute("aria-label", "Bag");
      if (badge) {
        badge.classList.toggle("hidden", !bagMode || n === 0);
        badge.textContent = n > 99 ? "99+" : String(n);
      }
      // the sectioned bag replaces the regular cart tab on product pages
      if (cartBtn) cartBtn.classList.toggle("hidden", bagMode ? true : n === 0);
      // Sync the cart count badge here too (not just in shop.js) — view
      // switches otherwise showed the pill with the count still hidden.
      var cartBadge = document.getElementById("cart-badge");
      if (cartBadge) {
        cartBadge.classList.toggle("hidden", bagMode || n === 0);
        cartBadge.textContent = n > 99 ? "99+" : String(n);
      }
    }
    var viewScroll = {};
    var pinState = { until: 0, enteredAt: 0, lastTouchAt: 0, running: false, observer: null };
    ["touchstart", "touchmove", "wheel"].forEach(function (ev) {
      window.addEventListener(ev, function () { pinState.lastTouchAt = Date.now(); }, { passive: true });
    });
    function pinTop(ms) {
      pinState.enteredAt = Date.now();
      pinState.lastTouchAt = 0;
      pinState.until = Date.now() + (ms || 1500);
      // Async DOM changes (content painting in) extend the guard briefly
      if (pinState.observer) pinState.observer.disconnect();
      var panel = document.querySelector(".panel.on");
      if (panel && window.MutationObserver) {
        pinState.observer = new MutationObserver(function () {
          var cap = pinState.enteredAt + 5000;
          pinState.until = Math.min(Date.now() + 500, cap);
        });
        pinState.observer.observe(panel, { childList: true, subtree: true });
        setTimeout(function () { if (pinState.observer) pinState.observer.disconnect(); }, 5200);
      }
      if (pinState.running) return;
      pinState.running = true;
      var step = function () {
        if (Date.now() > pinState.until || pinState.lastTouchAt > pinState.enteredAt) {
          pinState.running = false;
          return;
        }
        if (window.scrollY > 2) window.scrollTo(0, 0);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    window.MPScroll = { pinTop: pinTop };
    function isAuthView() {
      return !!document.querySelector(".chat-auth");
    }
    function assertScroll() {
      // Single-shot scroll positioning. No polling intervals — those caused
      // the jitter by fighting image/font loads. Set once per lifecycle event.
      // Auth view is inside the journal panel but should be at TOP, not bottom.
      if (current.type === "journal" && !isAuthView()) {
        if (window.MPChat && MPChat.scrollToLatest) MPChat.scrollToLatest();
      } else {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
    // Option H: Reveal page once positioned. Runs on load + after view switches.
    // No artificial waits: no splash floor, no message-batch wait.
    // The splash shows for exactly the load time (however fast that is).
    function revealPage() {
      assertScroll();
      // Simultaneous reveal: splash background + content crossfade (0.5s).
      // The logo fades out fast (0.15s, CSS) so it never ghosts over the
      // content. Sequencing (400ms delay) left a blank gap; this doesn't.
      document.documentElement.classList.remove("mp-loading");
      document.documentElement.classList.remove("mp-show-splash");
      try { sessionStorage.removeItem("mp-refreshing"); } catch (e) {}
    }
    // While hidden (mp-loading), Safari may restore scroll async AFTER our
    // reveal timing. Hold scroll at 0 until reveal — invisible since hidden.
    // Keep the loop running even on chat view: the view may switch to
    // Globe/Shop before load fires, and a dead loop can't catch that.
    function holdScrollAtTop() {
      if (!document.documentElement.classList.contains("mp-loading")) return;
      if (!(current.type === "journal" && !isAuthView())) {
        if (window.scrollY > 0) {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      }
      requestAnimationFrame(holdScrollAtTop);
    }
    // Start holding immediately
    requestAnimationFrame(holdScrollAtTop);
    // bfcache restore (back/forward, tab restore): re-assert position
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) {
        // Fresh load: rely on scrollRestoration="manual" — no timed pins
        // (they caused the flash). Chat goes to bottom, others stay at top.
        if (current.type === "journal" && !isAuthView()) {
          setTimeout(assertScroll, 60);
        }
        return;
      }
      // bfcache restore: Safari restores old scroll position. Re-hide,
      // reset to top, then reveal. This is why it worked fresh but broke
      // after browsing for a few minutes.
      if (current.type !== "journal" || isAuthView()) {
        document.documentElement.classList.add("mp-loading");
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        setTimeout(function () {
          window.scrollTo(0, 0);
          document.documentElement.classList.remove("mp-loading");
        }, 100);
      } else {
        if (window.MPChat && MPChat.scrollToLatest) MPChat.scrollToLatest();
      }
    });
    // Reveal on DOMContentLoaded (HTML parsed), NOT window load — load
    // waits for every image/video on the page, which made the splash
    // linger. Images now have reserved boxes (no jump), so they can
    // finish loading after the reveal. applyCropHero stays on load
    // (it needs the hero video metadata).
    window.addEventListener("load", function () { applyCropHero(); });
    document.addEventListener("DOMContentLoaded", function () {
      if (current.type === "journal" && !isAuthView()) {
        setTimeout(revealPage, 60);
      } else {
        // Non-chat + auth: scroll to top first, then reveal.
        // Wait 500ms to let Safari's async restoration fire (and be held
        // at 0 by holdScrollAtTop) before revealing.
        window.scrollTo(0, 0);
        setTimeout(revealPage, 500);
      }
    });
    // Disable bfcache entirely: Safari's scroll restoration is tied to it.
    // With bfcache off, every load is fresh and starts at top.
    window.addEventListener("unload", function () {});
    // Also reset scroll on hide/unload as a backup.
    window.addEventListener("pagehide", function () {
      try { window.scrollTo(0, 0); } catch (e) {}
    });
    window.addEventListener("beforeunload", function () {
      try { window.scrollTo(0, 0); } catch (e) {}
    });
    // If Safari restored to bottom anyway, correct when page becomes visible.
    // Only for non-chat views, and only if user hasn't scrolled.
    // Removed: visibilitychange scroll correction (was another flash source).
    // Relying purely on scrollRestoration="manual" now.
    function show(view, id) {
      // Close the notification tray on view switch: it lives in document.body
      // (not inside a view panel), so a stale one survives tab switches and
      // the bell's toggle then closes it instead of opening a fresh tray.
      document.querySelectorAll(".forum-notif-panel").forEach(function (p) { p.remove(); });
      // Reinforce manual scroll restoration on every view switch
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      // Save scroll position before leaving the current view
      var prevType = current.type === "product" ? "shop" : current.type;
      if (prevType) viewScroll[prevType] = window.scrollY;
      current = { type: view, id: id || "" };
      var reading = view === "product";
      refreshTitle();
      // Restore default site hero when not viewing a product with custom header
      if (view !== "product") restoreHero();
      // Panel switching via class (CSS handles display)
      document.getElementById("journal").classList.toggle("on", view === "journal");
      document.getElementById("shop").classList.toggle("on", view === "shop");
      document.getElementById("product").classList.toggle("on", view === "product");
      document.getElementById("cart").classList.toggle("on", view === "cart");
      document.getElementById("forum").classList.toggle("on", view === "forum");
      nav.classList.toggle("shop", view === "shop");
      nav.classList.toggle("cart", view === "cart");
      nav.classList.toggle("reading", reading);
      // Crop hero fade on shop + auth views (header blocks content)
      applyCropHero();
      nav.querySelectorAll("button").forEach(function (b) {
        var active = b.dataset.view === view ||
          (view === "product" && b.dataset.view === "shop");
        b.classList.toggle("on", active);
      });
      // Predictable scroll, set in the same frame as the panel switch:
      // chat restores its reading position (or jumps to the latest message
      // on a fresh session); every other view starts at the top.
      if (reading) {
        window.scrollTo(0, 0);
        
      } else if (view === "journal" && !isAuthView()) {
        // Chat always lands on the latest message when switching back —
        // restoring the saved scroll put it up at old messages.
        // Auth view stays at top even though it's in the journal panel.
        if (window.MPChat && MPChat.scrollToLatest) {
          MPChat.scrollToLatest();
        } else {
          window.scrollTo(0, document.documentElement.scrollHeight);
        }
      } else {
        window.scrollTo(0, 0);
        
      }
      // Switching back to chat: catch up any messages missed while on
      // another view (WS gaps don't self-heal until a fetch runs).
      if (view === "journal" && window.MPChat && MPChat.catchUp) { var _cu = MPChat.catchUp(); if (_cu && _cu.then) _cu.then(function () { if (window.MPChat && MPChat.scrollToLatest) MPChat.scrollToLatest(); }); }
      if (view === "shop" && window.MPShop) MPShop.renderShop();
      if (view === "cart" && window.MPShop) MPShop.renderCartPanel();
      if (view === "forum" && window.MPForum) {
        if (MPForum.goHome) MPForum.goHome();
        else MPForum.render();
      }
      refreshSeg();
      refreshPostBtn();
      var hash = "#";
      if (view === "shop") hash = "#shop";
      else if (view === "cart") hash = "#cart";
      else if (view === "forum") hash = "#globe";
      else if (view === "journal") hash = "#chat";
      else if (view === "product" && id) hash = "#product/" + id;
      var keepThreadLink = view === "forum" && /^#(thread|globe)\//.test(location.hash || "");
      if (!keepThreadLink && location.hash !== hash) history.pushState(null, "", hash);
    }
    function refreshTitle() {
      // Per view (per dc): "Shop · Misère Perdue", and a product shows its
      // Shopify product name.
      var base = "Misère Perdue";
      var names = { shop: "Shop", journal: "Chat", forum: "Misery Globe", cart: "Cart" };
      var t = base;
      if (current.type === "product") {
        var h = document.querySelector("#product h1");
        if (h && h.textContent) t = base + " · " + h.textContent.trim();
      } else if (names[current.type]) {
        t = base + " · " + names[current.type];
      }
      document.title = t;
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", t);
      var twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute("content", t);
    }
    window.MPNav = {
      show: show,
      refreshSeg: refreshSeg,
      refreshPostBtn: refreshPostBtn,
      refreshTitle: refreshTitle,
      showProduct: function (id) { show("product", id); },
      reopen: function () {
        if (current.type === "product" && current.id) MPShop.openProduct(current.id);
      }
    };

    var X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

    var defaultHeroHTML = null;
    function saveDefaultHero() {
      if (defaultHeroHTML === null) {
        var h = document.querySelector("header.hero");
        if (h) defaultHeroHTML = h.innerHTML;
      }
    }
    function restoreHero() {
      saveDefaultHero();
      var h = document.querySelector("header.hero");
      if (!h || h.getAttribute("data-custom") !== "1") return;
      // Crossfade back to default
      var layer = document.createElement("div");
      layer.className = "hero-cross";
      layer.innerHTML = defaultHeroHTML;
      h.appendChild(layer);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { layer.classList.add("in"); });
      });
      setTimeout(function () {
        h.innerHTML = defaultHeroHTML;
        h.removeAttribute("data-custom");
      }, 950);
    }
    nav.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        show(b.dataset.view);
      };
    });

    function routeFromHash() {
      var h = location.hash || "#";
      var m;
      if ((m = h.match(/^#globe\/(.+)$/)) || (m = h.match(/^#thread\/(.+)$/))) {
        var tid = decodeURIComponent(m[1]);
        show("forum");
        var tryThread = function () {
          if (window.MPForum && MPForum.openThread) { MPForum.openThread(tid); return true; }
          return false;
        };
        if (!tryThread()) {
          var tiv = setInterval(function () { if (tryThread()) clearInterval(tiv); }, 200);
          setTimeout(function () { clearInterval(tiv); }, 8000);
        }
        return true;
      }
      if ((m = h.match(/^#product\/(.+)$/))) {
        var pid = decodeURIComponent(m[1]);
        var tryOpen = function () {
          if (window.MPShop && MPShop.openProduct) { MPShop.openProduct(pid); return true; }
          return false;
        };
        tryOpen();
        // Retry once products load (Shopify fetch is async)
        var iv = setInterval(function () {
          if (tryOpen()) { clearInterval(iv); }
        }, 500);
        setTimeout(function () { clearInterval(iv); }, 8000);
        return true;
      }
      if (h === "#shop") { show("shop"); return true; }
      if (h === "#cart") { show("cart"); return true; }
      if (h === "#globe" || h === "#global" || h === "#forum") { show("forum"); return true; }
      if (h === "#journal" || h === "#chat") { show("journal"); return true; }
      // X return: chat.js already captured the payload at load; swap it for
      // "#chat" in place so the one-time code never stays in history.
      if (h.indexOf("#x_") === 0) { try { history.replaceState(null, "", "#chat"); } catch (e) {} show("journal"); return true; }
      if (h === "#" || h === "") { show("shop"); return true; }
      return false;
    }
    routeFromHash();
    window.addEventListener("hashchange", routeFromHash);

    if (window.MPShop) MPShop.updateCartBadge();
  

(function(){
  var badges = {
    shopify: "images/pay-shopify.png?v=1",
    paypal: "images/pay-paypal.png?v=1",
    visa: "images/pay-visa.png?v=1"
  };
  // Badges only show on the Bag panel: fetch them when it opens, or once
  // the page is idle, instead of competing with the first paint.
  var done = false;
  function go(){ if (done) return; done = true; Object.keys(badges).forEach(load); }
  if (location.hash === "#cart") go();
  else {
    window.addEventListener("hashchange", function(){ if (location.hash === "#cart") go(); });
    document.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest('[data-view="cart"]'); if (b) go(); }, true);
    window.addEventListener("load", function(){ setTimeout(go, 4000); });
  }
  function load(k){
    var el = document.querySelector('img[data-paybadge="' + k + '"]');
    if (el) el.src = badges[k];
  }
})();

if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register(MP_PIN("sw.js")).catch(function () {}); }); }

// Footer links are real URLs for crawlers (static pages); in the app they
// switch views in place instead of leaving for the plain static page.
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("a[data-spa]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  location.hash = a.getAttribute("data-spa");
  window.scrollTo(0, 0);
});
