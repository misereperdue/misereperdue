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
    token: "" // <-- paste the Storefront API access token here
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
    ((n.variants || {}).edges || []).forEach(function (e) {
      ((e.node || {}).selectedOptions || []).forEach(function (o) {
        if (/size/i.test(o.name || "") && o.value && !/default/i.test(o.value)) sizeSet[o.value] = true;
      });
    });
    var sizes = Object.keys(sizeSet);
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
      available: n.availableForSale !== false
    };
  }

  function fetchProducts() {
    var query = "{ products(first: 24) { edges { node { id title handle description " +
      "availableForSale priceRange { minVariantPrice { amount currencyCode } } " +
      "images(first: 8) { edges { node { url altText } } } " +
      "variants(first: 25) { edges { node { id title availableForSale selectedOptions { name value } } } } } } } }";
    return fetch("https://" + CONFIG.domain + "/api/2026-01/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": CONFIG.token
      },
      body: JSON.stringify({ query: query })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.errors) throw new Error("shopify");
        var edges = (((d.data || {}).products) || {}).edges || [];
        return edges.map(normalize);
      });
  }

  return { CONFIG: CONFIG, configured: configured, fetchProducts: fetchProducts, money: money };
})();
