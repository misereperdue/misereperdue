/* MISERY product catalog. Per dc, Shopify is retired. Globe & Chat payments run on Polar; clothing checkout is offline until Stripe. The shop reads the
 * site's own data/catalog.json (same shape the Storefront API returned, so the shop code is unchanged).
 * The global keeps its old name (MPShopify) for the existing callers; MPCatalog is the new alias.
 * There is no cart checkout here: VIP and Stars open Polar checkout from their product pages. Clothing checkout opens soon. */
var MPShopify = (function () {
  "use strict";

  var CONFIG = { source: "/data/catalog.json?v=2" };

  function configured() {
    return true;
  }

  function money(amount, currency) {
    var n = parseFloat(amount);
    return "$" + (isNaN(n) ? amount : n.toFixed(n % 1 ? 2 : 0)) + " " + (currency || "CAD");
  }

  function normalize(edge) {
    var n = edge.node || {};
    var price = (((n.priceRange || {}).minVariantPrice) || {});
    var images = ((n.images || {}).edges || []).map(function (e) { return e.node && e.node.url; }).filter(Boolean);
    var optValues = {};
    var optOrder = [];
    var rawVariants = [];
    ((n.variants || {}).edges || []).forEach(function (e) {
      var v = e.node || {};
      var chosen = {};
      ((v.selectedOptions || [])).forEach(function (o) {
        if (!o.name || !o.value || /default/i.test(o.value)) return;
        if (!optValues[o.name]) { optValues[o.name] = {}; optOrder.push(o.name); }
        optValues[o.name][o.value] = true;
        chosen[o.name] = o.value;
      });
      if (v.id) rawVariants.push({ id: v.id, sku: v.sku || "", opts: chosen, available: v.availableForSale !== false, qty: v.quantityAvailable, price: v.price ? parseFloat(v.price.amount || "0") : null, image: (v.image && v.image.url) || "" });
    });
    var optionName = null;
    for (var oi = 0; oi < optOrder.length; oi++) {
      if (/size/i.test(optOrder[oi])) { optionName = optOrder[oi]; break; }
    }
    if (!optionName) {
      for (var oj = 0; oj < optOrder.length; oj++) {
        if (Object.keys(optValues[optOrder[oj]]).length > 1) { optionName = optOrder[oj]; break; }
      }
    }
    if (!optionName && optOrder.length) optionName = optOrder[0];
    var sizes = optionName ? Object.keys(optValues[optionName]) : [];
    var variantList = rawVariants.map(function (rv) {
      return { id: rv.id, sku: rv.sku, size: optionName ? (rv.opts[optionName] || null) : null, available: rv.available, qty: rv.qty, price: rv.price, image: rv.image };
    });
    // Subscription products (VIP): first selling plan and its recurring price.
    var plan = null, planRecurring = null;
    ((n.sellingPlanGroups || {}).edges || []).some(function (g) {
      var e = (((g.node || {}).sellingPlans || {}).edges || [])[0];
      if (!e || !e.node) return false;
      plan = e.node.id;
      (e.node.priceAdjustments || []).forEach(function (a) {
        var pr = a && a.adjustmentValue && a.adjustmentValue.price;
        if (a && a.orderCount == null && pr) planRecurring = parseFloat(pr.amount);
      });
      return true;
    });
    var stockQty = 0, stockTracked = false;
    variantList.forEach(function (vv) { if (vv.qty != null) { stockTracked = true; stockQty += vv.qty; } });
    return {
      id: n.id || n.handle,
      handle: n.handle || "",
      optionName: optionName,
      shopify: true,
      name: n.title || "Untitled",
      price: parseFloat(price.amount || "0"),
      priceLabel: money(price.amount, price.currencyCode),
      currency: price.currencyCode || "CAD",
      images: images,
      image: images[0] || "",
      details: (function () {
        var html = n.descriptionHtml || "";
        if (!html) return (n.description || "").slice(0, 1000);
        var t = html.replace(/<\/p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
        t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        return t.trim().slice(0, 1000);
      })(),
      sizes: sizes.length ? sizes : null,
      variantList: variantList,
      // Variant photos uploaded in Shopify, by option value (cart shows the chosen variant's photo).
      imageBySize: variantList.reduce(function (m, vv) { if (vv.size != null && vv.image) m[vv.size] = vv.image; return m; }, {}),
      priceBySize: variantList.reduce(function (m, vv) { if (vv.size != null && vv.price != null) m[vv.size] = vv.price; return m; }, {}),
      stock: stockTracked ? stockQty : null,
      available: n.availableForSale !== false,
      requiresSellingPlan: !!n.requiresSellingPlan,
      sellingPlanId: plan,
      planRecurring: planRecurring
    };
  }

  // Catalog nodes -> the Storefront edge shape normalize() reads.
  function asEdge(n) {
    var e = { node: Object.assign({}, n, {
      images: { edges: ((n.images || {}).nodes || []).map(function (i) { return { node: i }; }) },
      variants: { edges: ((n.variants || {}).nodes || []).map(function (v) { return { node: v }; }) }
    }) };
    return e;
  }

  function fetchProducts() {
    return fetch(CONFIG.source, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (d) {
        return ((d && d.products) || []).map(function (n) {
          var p = normalize(asEdge(n));
          if (n.planRecurring != null) p.planRecurring = n.planRecurring;
          if (n.requiresSellingPlan) p.requiresSellingPlan = true;
          p.comingSoon = !!n.comingSoon;
          p.preorder = !!n.preorder;
          p.shipsAt = n.shipsAt || null;
          return p;
        });
      });
  }

  function variantIdFor(p, size) {
    var vs = p.variantList || [];
    var want = size || "one";
    for (var i = 0; i < vs.length; i++) {
      if ((vs[i].size || "one") === want) return vs[i].id;
    }
    return vs.length ? vs[0].id : null;
  }

  // Shopify checkout is retired: nothing in the shop is paid through a cart checkout any more.
  function createCheckout() {
    return Promise.reject(new Error("checkout retired"));
  }

  return { CONFIG: CONFIG, configured: configured, fetchProducts: fetchProducts, money: money, variantIdFor: variantIdFor, createCheckout: createCheckout };
})();
var MPCatalog = MPShopify;
