#!/usr/bin/env python3
"""Regenerate the static product pages (p/<handle>.html) and shop.html from the
live Shopify Storefront API, with schema.org Product JSON-LD (Google rich
results: price, currency, availability, image, brand). Run: python3 tools/build-products.py
Products no longer in the storefront are reported (their page is not touched)."""
import json, html, os, re, subprocess, sys, urllib.request
SITE = "https://misereperdue.com"
API = "https://shop.misereperdue.com/api/2026-01/graphql.json"
TOKEN = "1ea6d8e04d03687ed4547d291ef46026"  # public Storefront token (same as js/shopify.js)
Q = """{ products(first:50){ nodes{ id handle title description availableForSale
  featuredImage{url width height} images(first:5){nodes{url}}
  priceRange{minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode}}
  variants(first:20){nodes{id title availableForSale price{amount currencyCode}}} } } }"""
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Search titles (<=60 chars). Unknown handles fall back to "<title> | MISERY (Misère Perdue)".
SEO_TITLE = {"misery-v_v-sleeping-mask": "V_V Mask: Silk Sleeping Mask | MISERY (Misère Perdue)",
             "membership": "VIP Membership | MISERY (Misère Perdue)"}

def meta_desc(p):
    """<=155 chars, from the Shopify description ('+' bullet style -> commas)."""
    parts = [x.strip() for x in re.split(r"\s*\+", p["description"]) if x.strip()]
    text = p["title"] + " by MISERY: " + ", ".join(parts)
    text = re.sub(r"\s*MISERY \| Misère Perdue\s*$", "", text).strip()
    if len(text) > 155:
        text = text[:154].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return text

def save(path, content):
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if old != content:
        open(path, "w", encoding="utf-8").write(content)
        print("wrote", os.path.relpath(path, ROOT))

def crumbs(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}

def fetch():
    req = urllib.request.Request(API, data=json.dumps({"query": Q}).encode(), headers={
        "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": TOKEN,
        "Origin": SITE, "User-Agent": "misery-build-products"})
    return json.load(urllib.request.urlopen(req, timeout=30))["data"]["products"]["nodes"]

def money(a):
    a = float(a); return ("%d" % a) if a == int(a) else ("%.2f" % a)

def price_label(p):
    lo, hi = p["priceRange"]["minVariantPrice"], p["priceRange"]["maxVariantPrice"]
    cur = lo["currencyCode"]
    if lo["amount"] == hi["amount"]: return f"${money(lo['amount'])} {cur}"
    return f"${money(lo['amount'])}-{money(hi['amount'])} {cur}"   # same format as the shop tiles

def jsonld(p, url):
    imgs = [i["url"] for i in p["images"]["nodes"]] or ([p["featuredImage"]["url"]] if p.get("featuredImage") else [])
    offers = []
    for v in p["variants"]["nodes"]:
        o = {"@type": "Offer", "url": url, "price": money(v["price"]["amount"]),
             "priceCurrency": v["price"]["currencyCode"],
             "availability": "https://schema.org/" + ("InStock" if v["availableForSale"] else "OutOfStock"),
             "itemCondition": "https://schema.org/NewCondition",
             "seller": {"@type": "Organization", "name": "Misère Perdue"}}
        if v["title"] != "Default Title": o["name"] = f'{p["title"]} {v["title"]}'
        offers.append(o)
    d = {"@context": "https://schema.org", "@type": "Product", "name": p["title"],
         "description": p["description"], "url": url, "image": imgs,
         "productID": p["id"].rsplit("/", 1)[-1],
         "brand": {"@type": "Brand", "name": "MISERY"},
         "offers": offers[0] if len(offers) == 1 else offers}
    bc = crumbs([("Home", SITE + "/"), ("Shop", SITE + "/shop"), (p["title"], url)])
    return json.dumps([d, bc], ensure_ascii=False).replace("</", "<\\/")

STYLE = """<style>
body{font-family:-apple-system,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 18px;line-height:1.65;color:#1a1a2e;background:#fff}
a{color:#2b4eff}
header{margin-bottom:28px;font-weight:800;letter-spacing:.14em;font-size:13px}
header a{text-decoration:none;color:#1a1a2e}
.meta{color:#666;font-size:13px;margin:-8px 0 18px}
.price{font-size:22px;font-weight:700;margin:6px 0 18px}
.post{margin:0 0 14px}
.cta{margin:30px 0;padding:18px;border-radius:14px;background:#f4f4f8;text-align:center}
.cta a{font-weight:700;text-decoration:none}
h1{font-size:26px;line-height:1.25}
img{max-width:100%;border-radius:8px}
.tag{display:inline-block;padding:4px 10px;border-radius:999px;background:#f4f4f8;font-size:12px;font-weight:700}
.product{margin:0 0 22px}
.product h2{font-size:19px;margin:0 0 4px}
.product h2 a{text-decoration:none;color:#1a1a2e}
.product .price{font-size:inherit;font-weight:700;margin:0}
.product .meta{color:#666;font-size:13px;margin:0}
nav.crumbs{font-size:13px;color:#666;margin:-14px 0 18px}
nav.crumbs a{color:#666}
</style>"""

def head(title, desc, url, image, og_type, ld, image_alt="MISERY closed eyes logo"):
    e = html.escape
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Mis&egrave;re Perdue">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{e(image)}">
<meta property="og:image:alt" content="{e(image_alt)}">
<meta name="twitter:site" content="@misereperdue">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(image)}">
<script type="application/ld+json">{ld}</script>
{STYLE}
</head>
<body>
<header><a href="/">MIS&Egrave;RE PERDUE</a></header>
<main>
"""

def main():
    prods = fetch()
    e = html.escape
    items = []
    for p in prods:
        url = f"{SITE}/p/{p['handle']}"
        img = p["featuredImage"]["url"] if p.get("featuredImage") else f"{SITE}/img/og-image.jpg"
        stock = "In stock" if p["availableForSale"] else "Sold out"
        variants = [v["title"] for v in p["variants"]["nodes"] if v["title"] != "Default Title"]
        shop_link = f"{SITE}/#product/" + urllib.request.quote(p["id"], safe="")
        alt = f"{p['title']} by MISERY (Misère Perdue)"
        body = (f"<nav class=\"crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> &rsaquo; <a href=\"/shop\">Shop</a> &rsaquo; {e(p['title'])}</nav>\n"
                f"<article>\n<h1>{e(p['title'])}</h1>\n"
                f"<p class=\"price\">{price_label(p)}</p>\n<p><span class=\"tag\">{stock}</span></p>\n"
                f"<p><img src=\"{e(img)}&width=720\" alt=\"{e(alt)}\" width=\"720\" loading=\"lazy\"></p>\n"
                f"<div class=\"post\"><p>{e(p['description'])}</p></div>\n"
                + (f"<p class=\"meta\">Options: {e(', '.join(variants))}</p>\n" if variants else "")
                + f"<div class=\"cta\"><a href=\"{shop_link}\">View in the shop on misereperdue.com &rarr;</a></div>\n</article>\n</main>\n</body>\n</html>\n")
        title = SEO_TITLE.get(p["handle"]) or f"{p['title']} | MISERY (Misère Perdue)"
        out = head(title, meta_desc(p), url, img, "product", jsonld(p, url), alt) + body
        save(os.path.join(ROOT, "p", p["handle"] + ".html"), out)
        items.append((p, url))
        print("wrote p/%s.html  %s  %s" % (p["handle"], price_label(p), stock))
    ld = json.dumps([{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Shop — Misère Perdue",
          "url": f"{SITE}/shop", "mainEntity": {"@type": "ItemList", "itemListElement": [
              {"@type": "ListItem", "position": i + 1, "url": u, "name": p["title"]} for i, (p, u) in enumerate(items)]}},
          crumbs([("Home", SITE + "/"), ("Shop", SITE + "/shop")])], ensure_ascii=False)
    desc = ("Shop MISERY (Misère Perdue), the Toronto merchandise brand: " + ", ".join(p["title"] for p, _ in items)
            + ". Prices in CAD, checkout by Shopify.")
    rows = "".join(f"<div class=\"product\"><h2><a href=\"/p/{p['handle']}\">{e(p['title'])}</a></h2><div class=\"price\">{price_label(p)}</div><div class=\"meta\">{e(p['description'][:140] + ('…' if len(p['description']) > 140 else ''))}</div></div>\n" for p, _ in items)
    shop = head("Shop MISERY: " + " & ".join(p["title"] for p, _ in items) + " | Misère Perdue", desc, f"{SITE}/shop", f"{SITE}/img/og-image.jpg", "website", ld) + "<nav class=\"crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> &rsaquo; Shop</nav>\n<h1>Shop</h1>\n" + rows + f"<div class=\"cta\"><a href=\"{SITE}/#shop\">Shop on misereperdue.com &rarr;</a></div>\n</main>\n</body>\n</html>\n"
    save(os.path.join(ROOT, "shop.html"), shop)
    live = {p["handle"] for p in prods}
    for f in sorted(os.listdir(os.path.join(ROOT, "p"))):
        if f.endswith(".html") and f[:-5] not in live:
            print("NOT IN STOREFRONT (stale page):", "p/" + f)
    # keep sitemap.xml (+ thread pages, /globe) in sync
    if "--no-sitemap" not in sys.argv:
        subprocess.run([sys.executable, os.path.join(ROOT, "build-sitemap.py")], check=True)

if __name__ == "__main__":
    main()
