/* MISERY shop UI — catalog grid, product detail, cart panel, nav badge. */
var MPShop = (function () {
  "use strict";

  var PLACEHOLDER = {
    id: "sample-001",
    name: "Sample 001",
    price: null,
    priceLabel: "Coming soon",
    images: ["images/tee.jpg"],
    image: "images/tee.jpg",
    details: "First sample. Cut, cloth and price still being locked.",
    sizes: null,
    available: false,
    placeholder: true
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function initials(name) {
    var words = String(name || "").trim().split(/\s+/).filter(Boolean);
    var s = words.slice(0, 2).map(function (w) { return w[0]; }).join("");
    return (s || "M").toUpperCase();
  }

  function tileEmoji(name) {
    var n = String(name || "").toLowerCase();
    if (n.indexOf("jersey") !== -1) return "👕";
    if (n.indexOf("mask") !== -1 || n.indexOf("sleeping") !== -1) return "🥽";
    return null;
  }

  function phTile(name, extraStyle) {
    var emoji = tileEmoji(name);
    var cls = "img-ph" + (emoji ? " emoji-tile" : "");
    var inner = emoji ? emoji : esc(initials(name));
    return '<div class="' + cls + '" aria-hidden="true"' + (extraStyle ? ' style="' + extraStyle + '"' : "") + "><span>" + inner + "</span></div>";
  }

  function imgHTML(p, eager) {
    if (p.image) {
      return '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '"' + (eager ? "" : ' loading="lazy"') + ">";
    }
    return phTile(p.name);
  }

  var SHOP_DIAG = "";
  function shopifyList(tried) {
    return MPShopify.fetchProducts().then(function (list) {
      list.forEach(function (p) { MP.PRODUCTS[p.id] = p; });
      return list.length ? list : [PLACEHOLDER];
    }).catch(function (e) {
      SHOP_DIAG = "store unreachable (" + (e && e.message ? e.message : "network") + ")";
      return tried ? [PLACEHOLDER] : shopifyList(true);
    });
  }

  function products() {
    if (window.MPShopify && MPShopify.configured()) { SHOP_DIAG = ""; return shopifyList(false); }
    SHOP_DIAG = window.MPShopify ? "store not configured" : "store module failed to load";
    return Promise.resolve([PLACEHOLDER]);
  }

  function stockPill(p) {
    if (p.available === false) return "";
    var s = p.stock, label, cls = "stock-pill";
    if (s == null) label = "In stock";
    else if (s <= 0) { label = "Sold out"; cls += " out"; }
    else if (s <= 5) { label = "Only " + s + " left"; cls += " low"; }
    else label = s + " in stock";
    return '<span class="' + cls + '">' + label + "</span>";
  }

  function cardHTML(p) {
    return '<button type="button" class="product-card" data-product="' + esc(p.id) + '">' +
      stockPill(p) +
      imgHTML(p) +
      '<div class="product-meta"><strong>' + esc(p.name) + "</strong>" +
      '<span class="meta">' + esc(p.priceLabel || (p.price != null ? MP.money(p.price) : "Coming soon")) + "</span></div>" +
      (p.available === false ? '<span class="tag">Coming soon</span>' : "") +
      "</button>";
  }

  function renderShop() {
    var grid = document.getElementById("shop-grid");
    if (!grid) return;
    grid.innerHTML = '<p class="empty">Loading…</p>';
    products().then(function (list) {
      grid.innerHTML = list.map(cardHTML).join("") +
        (SHOP_DIAG ? '<p class="meta" style="margin-top:10px;font-size:12px">Note: ' + esc(SHOP_DIAG) + " — showing preview.</p>" : "");
      grid.querySelectorAll("[data-product]").forEach(function (el) {
        el.onclick = function () { openProduct(el.dataset.product); };
      });
    });
  }

  function carouselHTML(images, name) {
    var list = (images && images.length ? images : []).filter(Boolean);
    if (!list.length) {
      return '<div class="carousel"><div class="carousel-track">' + phTile(name, "flex:none;width:100%") + "</div></div>";
    }
    var imgs = list.map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="' + esc(name) + (i ? " " + (i + 1) : "") + '"' + (i ? ' loading="lazy"' : "") + ">";
    }).join("");
    var dots = list.length > 1
      ? '<div class="car-dots">' + list.map(function (_, i) {
          return '<span data-dot="' + i + '"' + (i === 0 ? ' class="on"' : "") + "></span>";
        }).join("") + "</div>"
      : "";
    var arrows = list.length > 1
      ? '<button type="button" class="car-btn prev" aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>' +
        '<button type="button" class="car-btn next" aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg></button>'
      : "";
    return '<div class="carousel"><div class="carousel-track">' + imgs + "</div>" + arrows + dots + "</div>";
  }

  function initCarousel(root) {
    var track = root.querySelector(".carousel-track");
    var slides = track ? track.children.length : 0;
    if (!track || slides < 2) return;
    var idx = 0;
    var dots = root.querySelectorAll("[data-dot]");
    function go(i) {
      idx = (i + slides) % slides;
      track.style.transform = "translateX(-" + idx * 100 + "%)";
      dots.forEach(function (d, j) { d.classList.toggle("on", j === idx); });
    }
    root.querySelector(".prev").onclick = function (e) { e.stopPropagation(); go(idx - 1); };
    root.querySelector(".next").onclick = function (e) { e.stopPropagation(); go(idx + 1); };
    dots.forEach(function (d) {
      d.onclick = function () { go(+d.dataset.dot); };
    });
    var x0 = null;
    track.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  function bagQty(id, size) {
    var key = id + ":" + (size || "one");
    var hit = MP.readCart().find(function (i) { return i.key === key; });
    return hit ? hit.qty : 0;
  }

  function actionHTML(p, size) {
    if (p.available === false) return '<span class="pill-soon">Coming soon</span>';
    var q = bagQty(p.id, size);
    if (!q) {
      return '<button class="btn accent morph-btn" id="add-bag" type="button"><span class="lbl">Add to bag</span>' + MPComments.checkSVG() + "</button>";
    }
    return '<div class="in-bag"><span class="in-bag-label">In your bag</span>' +
      '<div class="bag-stepper"><button type="button" data-step="-1" aria-label="Remove one">−</button>' +
      "<span>" + q + "</span>" +
      '<button type="button" data-step="1" aria-label="Add one">+</button></div></div>';
  }

  function bindAction(p, getSize) {
    var box = document.getElementById("bag-action");
    if (!box) return;
    function render() { box.innerHTML = actionHTML(p, getSize()); bind(); }
    function bind() {
      var add = document.getElementById("add-bag");
      if (add) {
        add.onclick = function () {
          MP.addItem(p.id, getSize());
          updateCartBadge();
          add.classList.add("done");
          setTimeout(render, 900);
        };
      }
      box.querySelectorAll("[data-step]").forEach(function (b) {
        b.onclick = function () {
          var key = p.id + ":" + (getSize() || "one");
          var hit = MP.readCart().find(function (i) { return i.key === key; });
          MP.setQty(key, (hit ? hit.qty : 0) + (+b.dataset.step));
          updateCartBadge();
          render();
        };
      });
    }
    render();
  }

  function openProduct(id) {
    var p = MP.PRODUCTS[id] || PLACEHOLDER;
    var view = document.getElementById("postview");
    var sizes = p.sizes && p.sizes.length
      ? '<div class="sizes">' + p.sizes.map(function (s, i) {
          return '<button type="button" data-size="' + esc(s) + '"' + (i === 0 ? ' class="on"' : "") + ">" + esc(s) + "</button>";
        }).join("") + "</div>"
      : '<div style="height:12px"></div>';
    view.innerHTML =
      '<article class="article-card">' +
        carouselHTML(p.images && p.images.length ? p.images : [p.image], p.name) +
        '<div class="kicker">' + (p.shopify ? "Shop" : "Sample") + "</div>" +
        "<h1>" + esc(p.name) + "</h1>" +
        '<div class="price">' + esc(p.priceLabel || (p.price != null ? MP.money(p.price) : "")) + "</div>" +
        (p.details ? '<p class="meta">' + esc(p.details) + "</p>" : "") +
        sizes + '<div id="bag-action"></div>' +
      "</article>";
    initCarousel(view);
    var size = p.sizes && p.sizes.length ? p.sizes[0] : "one";
    function refreshAction() { bindAction(p, function () { return size; }); }
    view.querySelectorAll("[data-size]").forEach(function (b) {
      b.onclick = function () {
        size = b.dataset.size;
        view.querySelectorAll("[data-size]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        refreshAction();
      };
    });
    refreshAction();
    if (window.MPNav) MPNav.showProduct(id);
  }

  function checkout() {
    var btn = document.getElementById("checkout-btn");
    var err = document.getElementById("checkout-err");
    if (err) err.textContent = "";
    if (!window.MPShopify || !MPShopify.configured()) {
      if (err) err.textContent = "Checkout isn't available right now.";
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = "Working…"; }
    products().then(function () {
      var lines = [];
      MP.readCart().forEach(function (i) {
        var p = MP.PRODUCTS[i.id];
        if (!p || !p.shopify) return;
        var vid = MPShopify.variantIdFor(p, i.size);
        if (vid && i.qty > 0) lines.push({ variantId: vid, qty: i.qty });
      });
      if (!lines.length) throw new Error("empty");
      return MPShopify.createCheckout(lines);
    }).then(function (url) {
      window.location.href = url;
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "Checkout"; }
      if (err) err.textContent = "Couldn't start checkout. Check your connection and try again.";
    });
  }

  function renderCartPanel() {
    var box = document.getElementById("cart-lines");
    var totalEl = document.getElementById("cart-total");
    if (!box) return;
    var cart = MP.readCart();
    if (!cart.length) {
      box.innerHTML = '<p class="empty">Bag is empty.</p>';
      if (totalEl) totalEl.textContent = "";
      return;
    }
    var total = 0;
    box.innerHTML = cart.map(function (i) {
      total += i.price * i.qty;
      var sizeMeta = (i.size && i.size !== "one") ? '<div class="meta">' + esc(i.size) + "</div>" : "";
      return '<div class="line">' +
        imgHTML(i, true) +
        "<div class=\"line-mid\"><strong>" + esc(i.name) + "</strong>" + sizeMeta +
        '<div class="qty"><button type="button" data-dec="' + esc(i.key) + '" aria-label="Decrease">−</button>' +
        "<span>" + i.qty + '</span>' +
        '<button type="button" data-inc="' + esc(i.key) + '" aria-label="Increase">+</button></div></div>' +
        "<div><div>" + MP.money(i.price * i.qty) + '</div><button type="button" class="del" data-del="' + esc(i.key) + '">Remove</button></div>' +
        "</div>";
    }).join("");
    if (totalEl) totalEl.textContent = "Total " + MP.money(total);
    box.querySelectorAll("[data-inc]").forEach(function (b) {
      b.onclick = function () {
        var it = MP.readCart().find(function (x) { return x.key === b.dataset.inc; });
        if (it) MP.setQty(it.key, it.qty + 1);
        updateCartBadge(); renderCartPanel();
      };
    });
    box.querySelectorAll("[data-dec]").forEach(function (b) {
      b.onclick = function () {
        var it = MP.readCart().find(function (x) { return x.key === b.dataset.dec; });
        if (it) MP.setQty(it.key, it.qty - 1);
        updateCartBadge(); renderCartPanel();
      };
    });
    box.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { MP.removeItem(b.dataset.del); updateCartBadge(); renderCartPanel(); };
    });
    var co = document.getElementById("checkout-btn");
    if (co) {
      co.style.display = cart.length ? "" : "none";
      co.onclick = checkout;
    }
  }

  function updateCartBadge() {
    var n = MP.cartCount();
    var btn = document.getElementById("cart-btn");
    var badge = document.getElementById("cart-badge");
    if (!btn || !badge) return;
    btn.classList.toggle("hidden", n === 0);
    badge.classList.toggle("hidden", n === 0);
    badge.textContent = n > 99 ? "99+" : String(n);
    if (window.MPNav) { MPNav.refreshSeg(); MPNav.refreshPostBtn(); }
  }

  return {
    renderShop: renderShop,
    openProduct: openProduct,
    renderCartPanel: renderCartPanel,
    updateCartBadge: updateCartBadge,
    PLACEHOLDER: PLACEHOLDER
  };
})();
