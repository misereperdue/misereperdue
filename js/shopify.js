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
    var sizeSet = {};
    var variantList = [];
    ((n.variants || {}).edges || []).forEach(function (e) {
      var v = e.node || {};
      var sizeVal = null;
      ((v.selectedOptions || [])).forEach(function (o) {
        if (/size/i.test(o.name || "") && o.value && !/default/i.test(o.value)) { sizeSet[o.value] = true; sizeVal = o.value; }
      });
      if (v.id) variantList.push({ id: v.id, size: sizeVal, available: v.availableForSale !== false, qty: v.quantityAvailable });
    });
    var sizes = Object.keys(sizeSet);
    var stockQty = 0, stockTracked = false;
    variantList.forEach(function (vv) { if (vv.qty != null) { stockTracked = true; stockQty += vv.qty; } });
    return {
      id: n.id || n.handle,
      shopify: true,
      name: n.title || "Untitled",
      price: parseFloat(price.amount || "0"),
      priceLabel: money(price.amount, price.currencyCode),
      currency: price.currencyCode || "CAD",
      images: images,
      image: images[0] || "",
      details: (n.description || "").slice(0, 400),
      sizes: sizes.length ? sizes : null,
      variantList: variantList,
      stock: stockTracked ? stockQty : null,
      available: n.availableForSale !== false
    };
  }

  function fetchProducts() {
    var query = "{ products(first: 24) { edges { node { id title handle description " +
      "availableForSale priceRange { minVariantPrice { amount currencyCode } } " +
      "images(first: 8) { edges { node { url altText } } } " +
      "variants(first: 25) { edges { node { id title availableForSale quantityAvailable selectedOptions { name value } } } } } } } } }";
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

  function createCheckout(lines) {
    var query = "mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { field message } } }";
    return fetch("https://" + CONFIG.domain + "/api/2026-01/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": CONFIG.token
      },
      body: JSON.stringify({
        query: query,
        variables: { input: { lines: lines.map(function (l) { return { merchandiseId: l.variantId, quantity: l.qty }; }) } }
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
