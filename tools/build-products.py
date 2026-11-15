#!/usr/bin/env python3
"""Regenerate the static product pages (p/<handle>.html) and shop.html from the
live Shopify Storefront API, with schema.org Product JSON-LD (Google rich
results: price, currency, availability, image, brand). Run: python3 tools/build-products.py
Products no longer in the storefront are reported (their page is not touched)."""
import hashlib, json, html, os, re, subprocess, sys, urllib.request
SITE = "https://misereperdue.com"
API = "https://shop.misereperdue.com/api/2026-01/graphql.json"
TOKEN = "1ea6d8e04d03687ed4547d291ef46026"  # public Storefront token (same as js/shopify.js)
Q = """{ products(first:50){ nodes{ id handle title description availableForSale
  featuredImage{url width height} images(first:5){nodes{url}}
  priceRange{minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode}}
  variants(first:20){nodes{id title availableForSale price{amount currencyCode}}} } } }"""
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = "Misère Perdue (Misery)"  # per dc: every title ends "| Misère Perdue (Misery)"
# Per dc (SEO review): search name + one-sentence description per product. {price} = live lowest price,
# so the copy stays right when prices change. New products fall back to "<title> | BRAND" and a sentence
# built from the Shopify bullets.
SEO = {
    "enraged-beanie": ("Enraged Beanie", "Enraged Beanie", "Fleece beanie with enraged-eyes embroidery and a spray design. SS27 from Misère Perdue. All sales are final."),
    "misery-v_v-sleeping-mask": ("V_V Mask", "V_V Mask", "Plush silk sleeping mask with MISERY eyes embroidery and elastic straps, in a gift box. SS27 from Misère Perdue."),
    "membership": ("VIP Membership", "VIP membership", "Join VIP for early access to Misère Perdue drops, a VIP badge in Misery Globe and Chat, and VIP-only boards. From {price}."),
    "stars": ("Stars", "Stars", "Star packs for Misère Perdue: buy powers and send gifts in Misery Globe and Chat. From {price}."),
}
SHOP_ORDER = ["enraged-beanie", "misery-v_v-sleeping-mask", "membership", "stars"]  # same as the site's shop (shopRank)
RETURN_POLICY = {"@type": "MerchantReturnPolicy", "applicableCountry": "CA",
                 "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted", "url": SITE + "/info"}  # all sales final

def meta_desc(p):
    """<=155 chars: the reviewed copy (SEO), else built from the Shopify '+' bullets."""
    if p["handle"] in SEO:
        lo = p["priceRange"]["minVariantPrice"]
        return SEO[p["handle"]][2].replace("{price}", f"${money(lo['amount'])} {lo['currencyCode']}")
    parts = [x.strip() for x in re.split(r"\s*\+", p["description"]) if x.strip()]
    text = p["title"] + " by Misère Perdue: " + ", ".join(parts)
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
    imgs = (p.get("_share") or []) + ([i["url"] for i in p["images"]["nodes"]] or ([p["featuredImage"]["url"]] if p.get("featuredImage") else []))
    offers = []
    for v in p["variants"]["nodes"]:
        o = {"@type": "Offer", "url": url, "price": money(v["price"]["amount"]),
             "priceCurrency": v["price"]["currencyCode"],
             "availability": "https://schema.org/" + ("InStock" if v["availableForSale"] else "OutOfStock"),
             "itemCondition": "https://schema.org/NewCondition",
             "hasMerchantReturnPolicy": RETURN_POLICY,
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
img{max-width:100%;height:auto;border-radius:8px}
.tag{display:inline-block;padding:4px 10px;border-radius:999px;background:#f4f4f8;font-size:12px;font-weight:700}
.product{margin:0 0 22px}
.product h2{font-size:19px;margin:0 0 4px}
.product h2 a{text-decoration:none;color:#1a1a2e}
.product .price{font-size:inherit;font-weight:700;margin:0}
.product .meta{color:#666;font-size:13px;margin:0}
nav.crumbs{font-size:13px;color:#666;margin:-14px 0 18px}
nav.crumbs a{color:#666}
</style>"""

def share_desc(p):
    """Link-preview text (X, iMessage, Slack...): price first, then the reviewed description (per dc's SEO
    review); products without reviewed copy fall back to the Shopify bullets."""
    if p["handle"] in SEO:
        return meta_desc(p) if "{price}" in SEO[p["handle"]][2] else price_label(p) + " · " + meta_desc(p)
    parts = [x.strip() for x in re.split(r"\s*\+", p["description"]) if x.strip()]
    text = ", ".join(parts)
    text = re.sub(r"\s*(SS\d+\s*)?MISERY \| Misère Perdue\s*$", "", text).strip()
    text = price_label(p) + " · " + text
    if len(text) > 160:
        text = text[:159].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return text

def og_images(images, alt):
    """og:image tags, each followed by its own size (OG attaches size tags to the image before them)."""
    e = html.escape; out = ""
    for u, w, h in images:
        out += f'<meta property="og:image" content="{e(u)}">\n'
        if w: out += f'<meta property="og:image:width" content="{w}">\n<meta property="og:image:height" content="{h}">\n'
        out += f'<meta property="og:image:alt" content="{e(alt)}">\n'
    return out

def ver(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()[:8]

DEFAULT_IMAGES = [(f"{SITE}/img/og/default.jpg?v=1", 1200, 630), (f"{SITE}/img/og/default-square.jpg?v=1", 1200, 1200)]

def head(title, desc, url, image, og_type, ld, image_alt="MISERY closed eyes logo", og_desc=None, extra=""):
    e = html.escape
    images = image if isinstance(image, list) else [(image, None, None)]
    og_desc = og_desc or desc
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico?v=17" sizes="48x48"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=17"><link rel="icon" type="image/png" sizes="96x96" href="/img/favicon-eyes-96.png?v=17"><link rel="icon" type="image/png" sizes="192x192" href="/img/favicon-eyes-192.png?v=17"><link rel="apple-touch-icon" href="/img/app-icon-tint-180.png?v=23">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Mis&egrave;re Perdue (Misery)">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(og_desc)}">
<meta property="og:url" content="{url}">
{og_images(images, image_alt)}
<meta name="twitter:site" content="@misereperdue">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(og_desc)}">
<meta name="twitter:image" content="{e(images[0][0])}">
{extra}<script type="application/ld+json">{ld}</script>
{STYLE}
<script src="/js/emoji.js?v=2" defer></script>
</head>
<body>
<header><a href="/">MIS&Egrave;RE PERDUE</a></header>
<main>
"""

def main():
    prods = sorted(fetch(), key=lambda p: SHOP_ORDER.index(p["handle"]) if p["handle"] in SHOP_ORDER else len(SHOP_ORDER))
    e = html.escape
    items = []
    for p in prods:
        url = f"{SITE}/p/{p['handle']}"
        img = p["featuredImage"]["url"] if p.get("featuredImage") else f"{SITE}/img/og-image.jpg"
        card = os.path.join(ROOT, "img", "og", f"{p['handle']}-p.jpg")  # 1200x630 product-only share card (tools/build-og-products.py)
        # ?v= follows the card's content, so a new product photo refreshes cached share previews
        sq = os.path.join(ROOT, "img", "og", f"{p['handle']}-sq.jpg")
        share = [(f"{SITE}/img/og/{p['handle']}-p.jpg?v={ver(card)}", 1200, 630)] if os.path.exists(card) else [(img, None, None)]
        if os.path.exists(sq): share.append((f"{SITE}/img/og/{p['handle']}-sq.jpg?v={ver(sq)}", 1200, 1200))
        p["_share"] = [u for u, _, _ in share]
        stock = "In stock" if p["availableForSale"] else "Sold out"
        variants = [v["title"] for v in p["variants"]["nodes"] if v["title"] != "Default Title"]
        shop_link = f"{SITE}/#product/" + urllib.request.quote(p["id"], safe="")
        alt = f"{p['title']} by Misère Perdue"
        fi = p.get("featuredImage") or {}
        hattr = f" height=\"{round(720*fi['height']/fi['width'])}\"" if fi.get("width") and fi.get("height") else ""
        body = (f"<nav class=\"crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> &rsaquo; <a href=\"/shop\">Shop</a> &rsaquo; {e(p['title'])}</nav>\n"
                f"<article>\n<h1>{e(p['title'])}</h1>\n"
                f"<p class=\"price\">{price_label(p)}</p>\n<p><span class=\"tag\">{stock}</span></p>\n"
                f"<p class=\"meta\">All sales are final: no returns or exchanges. <a href=\"/info\">Terms</a></p>\n"
                f"<p><img src=\"{e(img)}&width=720\" alt=\"{e(alt)}\" width=\"720\"{hattr} fetchpriority=\"high\" decoding=\"async\"></p>\n"
                f"<div class=\"post\"><p>{e(p['description'])}</p></div>\n"
                + (f"<p class=\"meta\">Options: {e(', '.join(variants))}</p>\n" if variants else "")
                + f"<div class=\"cta\"><a href=\"{shop_link}\">View in the shop on misereperdue.com &rarr;</a></div>\n</article>\n</main>\n</body>\n</html>\n")
        title = f"{(SEO.get(p['handle']) or (p['title'],))[0]} | {BRAND}"
        lo = p["priceRange"]["minVariantPrice"]
        extra = (f'<meta property="product:price:amount" content="{money(lo["amount"])}">\n'
                 f'<meta property="product:price:currency" content="{lo["currencyCode"]}">\n'
                 f'<meta name="twitter:label1" content="Price">\n'
                 f'<meta name="twitter:data1" content="{e(price_label(p))}">\n')
        out = head(title, meta_desc(p), url, share, "product", jsonld(p, url), alt, share_desc(p), extra) + body
        save(os.path.join(ROOT, "p", p["handle"] + ".html"), out)
        items.append((p, url))
        print("wrote p/%s.html  %s  %s" % (p["handle"], price_label(p), stock))
    ld = json.dumps([{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Shop | " + BRAND,
          "url": f"{SITE}/shop", "image": [u for u, _, _ in DEFAULT_IMAGES], "mainEntity": {"@type": "ItemList", "itemListElement": [
              {"@type": "ListItem", "position": i + 1, "url": u, "name": p["title"]} for i, (p, u) in enumerate(items)]}},
          crumbs([("Home", SITE + "/"), ("Shop", SITE + "/shop")])], ensure_ascii=False)
    names = [(SEO.get(p["handle"]) or (None, p["title"]))[1] for p, _ in items]
    listed = ", ".join(names[:-1]) + " and " + names[-1] if len(names) > 1 else "".join(names)
    desc = f"Shop Misère Perdue (Misery): {listed}. Prices in CAD with secure checkout by Shopify."
    def thumb(p):
        fi = p.get("featuredImage") or {}
        return f"<a href=\"/p/{p['handle']}\"><img src=\"{e(fi['url'])}&width=240\" alt=\"{e(p['title'])} by Misère Perdue\" width=\"120\" height=\"120\" loading=\"lazy\" decoding=\"async\" style=\"object-fit:cover\"></a>" if fi.get("url") else ""
    rows = "".join(f"<div class=\"product\">{thumb(p)}<h2><a href=\"/p/{p['handle']}\">{e(p['title'])}</a></h2><div class=\"price\">{price_label(p)}</div><div class=\"meta\">{e(p['description'][:140] + ('…' if len(p['description']) > 140 else ''))}</div></div>\n" for p, _ in items)
    shop = head("Shop | " + BRAND, desc, f"{SITE}/shop", DEFAULT_IMAGES, "website", ld, "Misère Perdue closed eyes") + "<nav class=\"crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> &rsaquo; Shop</nav>\n<h1>Shop</h1>\n" + rows + f"<div class=\"cta\"><a href=\"{SITE}/#shop\">Shop on misereperdue.com &rarr;</a></div>\n</main>\n</body>\n</html>\n"
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
