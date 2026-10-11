/* MISERY headless Shopify — the shop page pulls its catalog from Shopify's
 * Storefront API. If the token below isn't set, the shop falls back to the
 * local placeholder instead of breaking.
 *
 * Setup (do once in Shopify Admin):
 *  1. Settings > Apps and sales channels > Develop apps > Create an app
 *     (name it "misereperdue-headless").
 *  2. Configuration > Storefront API > enable it. Scopes needed:
 *     unauthenticated_read_product_listings, unauthenticated_read_product_inventory
 *     (product info only — no checkout scopes needed for a catalog pull).
 *  3. Install the app, copy the "Storefront API access token".
 *  4. Paste it as TOKEN below via github.com (never in chat), push, done.
 *     The shop page goes live with your real products on the next deploy.
 */
var MPShopify = (function () {
  "use strict";

  var CONFIG = {
    domain: "shop.misereperdue.com", // your shop domain works for the Storefront API
    token: "1ea6d8e04d03687ed4547d291ef46026" // Storefront API public token (public by design)
  };

  function configured() {
    return !!(CONFIG.domain && CONFIG.token);
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
      if (v.id) rawVariants.push({ id: v.id, opts: chosen, available: v.availableForSale !== false, qty: v.quantityAvailable, price: v.price ? parseFloat(v.price.amount || "0") : null });
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
      return { id: rv.id, size: optionName ? (rv.opts[optionName] || null) : null, available: rv.available, qty: rv.qty, price: rv.price };
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
      details: (n.description || "").slice(0, 1000),
      sizes: sizes.length ? sizes : null,
      variantList: variantList,
      priceBySize: variantList.reduce(function (m, vv) { if (vv.size != null && vv.price != null) m[vv.size] = vv.price; return m; }, {}),
      stock: stockTracked ? stockQty : null,
      available: n.availableForSale !== false
    };
  }

  function fetchProducts() {
    var query = "{ products(first: 24) { edges { node { id title handle description " +
      "availableForSale priceRange { minVariantPrice { amount currencyCode } } " +
      "images(first: 8) { edges { node { url altText } } } " +
      "variants(first: 25) { edges { node { id title availableForSale quantityAvailable price { amount currencyCode } selectedOptions { name value } } } } } } } }";
    return fetch("https://" + CONFIG.domain + "/api/2026-01/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": CONFIG.token
      },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (d) {
        if (d.errors && !d.data) throw new Error("api: " + ((d.errors[0] || {}).message || "unknown"));
        var edges = (((d.data || {}).products) || {}).edges || [];
        return edges.map(normalize);
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

  function createCheckout(lines, attributes) {
    var query = "mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { field message } } }";
    var input = { lines: lines.map(function (l) { return { merchandiseId: l.variantId, quantity: l.qty }; }) };
    if (attributes && attributes.length) input.attributes = attributes;
    return fetch("https://" + CONFIG.domain + "/api/2026-01/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": CONFIG.token
      },
      body: JSON.stringify({
        query: query,
        variables: { input: input }
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var cc = ((d.data || {}).cartCreate) || {};
        var errs = cc.userErrors || [];
        if (d.errors || errs.length || !cc.cart || !cc.cart.checkoutUrl) throw new Error("checkout");
        return cc.cart.checkoutUrl;
      });
  }

  return { CONFIG: CONFIG, configured: configured, fetchProducts: fetchProducts, money: money, variantIdFor: variantIdFor, createCheckout: createCheckout };
})();
