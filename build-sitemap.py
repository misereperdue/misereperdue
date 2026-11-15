#!/usr/bin/env python3
"""Generate static thread pages + sitemap.xml for Google indexing.

Fetches public forum threads from the live API and writes t/<id>.html plus
sitemap.xml into THIS repo (the directory this script lives in), so it works
from any checkout. Read-only against the API (GET only).

URLs are clean (no .html): Cloudflare Pages serves /t/t29 from t/t29.html and
308-redirects /t/t29.html -> /t/t29, so canonical/og:url/sitemap must use the
clean form or Google sees a redirect for every entry.

Also writes globe.html (/globe, crawlable Misery Globe landing) and sitemap.xml
(/, /shop, /info, /globe, p/*, t/*; no noindex pages; git-based lastmod; product images).
tools/build-products.py runs this automatically after regenerating p/*.

Usage:  python3 build-sitemap.py            # regenerate t/*.html + sitemap.xml
        python3 build-sitemap.py --dry-run  # print what would change
Then review `git diff`, commit, and open a PR (see docs/SITE_GUIDE.md).
"""
import json, re, html, urllib.request, os, sys
from datetime import datetime, timezone

WORKER = "https://api.misereperdue.com"  # misery-chat Worker (custom domain)
# 10.2 MB banner GIF in dc's pinned Misery Globe post (t29) -> poster still
LEGACY_GIF_STILLS = {'mmv91jz19f25554eo1gzkdz': '/img/globe-banner-poster.jpg?v=1'}
SITE = "https://misereperdue.com"
OUT = os.path.dirname(os.path.abspath(__file__))  # repo root
DRY = "--dry-run" in sys.argv

def get(path):
    req = urllib.request.Request(WORKER + path, headers={"User-Agent": "misereperdue-sitemap/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def clean_text(h):
    h = re.sub(r'<div class="mp-locked"[^>]*>[\s\S]*?</div>', ' ', h or "")
    h = re.sub(r'<[^>]*>', ' ', h)
    return re.sub(r'\s+', ' ', h).strip()

def clean_html(h):
    """Keep safe HTML for static pages; replace locked blocks with a note.
    Defense-in-depth: sanitizes independently of the Worker, so a sanitizer
    regression there can't turn t/*.html pages into stored XSS."""
    h = re.sub(r'<div class="mp-locked"[^>]*>[\s\S]*?</div>',
               '<p><em>\U0001F512 Hidden content</em></p>', h or "")
    # Strip dangerous tags (incl. SVG animation elements that can rewrite hrefs)
    h = re.sub(r'</?(script|style|meta|link|base|object|embed|form|button|input|textarea|select|option|animate|set|animateTransform|animateMotion|animateColor|mpath|discard|foreignObject|handler)[^>]*>', '', h, flags=re.I)
    # Strip event handlers
    h = re.sub(r'(^|[\s"\'/])on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', r'\1', h, flags=re.I)
    # Neutralize javascript:/data:/vbscript: URLs in URL attributes
    def _url(m):
        v = m.group(3).strip('\'"')
        dv = re.sub(r'&#(\d+);?', lambda x: chr(int(x.group(1))), v)
        dv = re.sub(r'&#x([0-9a-f]+);?', lambda x: chr(int(x.group(1), 16)), dv, flags=re.I)
        dv = re.sub(r'[\t\n\r\f]', '', dv)
        if re.match(r'\s*(javascript|data|vbscript):', dv, re.I):
            return m.group(1) + m.group(2) + '="#"'
        return m.group(0)
    h = re.sub(r'(\s)(href|src|action|formaction|data|poster|xlink:href|cite|background)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', _url, h, flags=re.I)
    # Strip style attributes and iframe srcdoc
    h = re.sub(r'\sstyle\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', '', h, flags=re.I)
    h = re.sub(r'(<iframe[^>]*?)[\s/]srcdoc\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', r'\1', h, flags=re.I)
    # images need alt text (content images from the forum editor have none)
    h = re.sub(r'<img(?![^>]*\balt=)', '<img alt="Image from a Misery Globe post"', h, flags=re.I)
    # absolute media URLs
    h = h.replace('src="/api/', 'src="' + WORKER + '/api/')
    h = h.replace("src='/api/", "src='" + WORKER + "/api/")
    # heavy legacy GIFs -> still poster on the static pages (same map as forum3.js MP_LEGACY_VID)
    for gif, still in LEGACY_GIF_STILLS.items():
        h = h.replace(WORKER + '/api/media/' + gif, SITE + still)
    return h

SQ_DIR = os.path.join(OUT, "img", "og", "t")

def square_thumb(tid, src):
    """1200x1200 centre crop of a thread thumbnail -> img/og/t/<id>-sq.jpg; returns its URL (None if it fails).
    Rewritten only when the pixels change; ?v= follows the content."""
    try:
        import io, hashlib
        from PIL import Image
        req = urllib.request.Request(src, headers={"User-Agent": "misereperdue-sitemap/1.0"})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
        side = min(im.size); l, t = (im.width - side) // 2, (im.height - side) // 2
        im = im.crop((l, t, l + side, t + side)).resize((1200, 1200), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, "JPEG", quality=86, optimize=True, progressive=True); data = buf.getvalue()
        os.makedirs(SQ_DIR, exist_ok=True)
        path = os.path.join(SQ_DIR, f"{tid}-sq.jpg")
        if not (os.path.exists(path) and open(path, "rb").read() == data):
            print(("would write " if DRY else "wrote ") + os.path.relpath(path, OUT), flush=True)
            if not DRY: open(path, "wb").write(data)
        return f"{SITE}/img/og/t/{tid}-sq.jpg?v={hashlib.md5(data).hexdigest()[:8]}"
    except Exception as e:
        print(f"square thumb {tid}: {e}", flush=True)
        return None

def iso(ts):
    try:
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def date_long(ts):
    try:
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%B %d, %Y")
    except Exception:
        return ""

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page_title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico?v=17" sizes="48x48"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=17"><link rel="icon" type="image/png" sizes="96x96" href="/img/favicon-eyes-96.png?v=17"><link rel="icon" type="image/png" sizes="192x192" href="/img/favicon-eyes-192.png?v=17"><link rel="apple-touch-icon" href="/img/app-icon-tint-180.png?v=23">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mis&egrave;re Perdue (Misery)">
<meta property="og:title" content="{page_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
{og_tags}
<meta name="twitter:site" content="@misereperdue">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{page_title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og_image}">
<script type="application/ld+json">{jsonld}</script>
<style>
body{{font-family:-apple-system,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 18px;line-height:1.65;color:#1a1a2e;background:#fff}}
a{{color:#2b4eff}}
header{{margin-bottom:28px;font-weight:800;letter-spacing:.14em;font-size:13px}}
header a{{text-decoration:none;color:#1a1a2e}}
.meta{{color:#666;font-size:13px;margin:-8px 0 18px}}
.post,.reply-body{{margin:0 0 14px}}
.reply{{border-top:1px solid #eee;padding:14px 0}}
.reply .meta{{margin:0 0 8px}}
.cta{{margin:30px 0;padding:18px;border-radius:14px;background:#f4f4f8;text-align:center}}
.cta a{{font-weight:700;text-decoration:none}}
h1{{font-size:26px;line-height:1.25}}
h2{{font-size:18px;margin-top:28px}}
img{{max-width:100%;border-radius:8px}}
nav.crumbs{{font-size:13px;color:#666;margin:-14px 0 18px}}
nav.crumbs a{{color:#666}}
</style>
<script src="/js/emoji.js?v=2" defer></script>
</head>
<body>
<header><a href="/">MIS&Egrave;RE PERDUE</a></header>
<main>
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/globe">Misery Globe</a></nav>
<article>
<h1>{title}</h1>
<p class="meta">By {author} &middot; {date}</p>
<div class="post">{content}</div>
{replies_html}
<div class="cta"><a href="{live_url}">Join the discussion on misereperdue.com &rarr;</a></div>
</article>
</main>
</body>
</html>
"""

def file_date(path):
    """Last git commit date of a file; today if it has uncommitted changes."""
    try:
        import subprocess
        dirty = subprocess.run(["git", "-C", OUT, "status", "--porcelain", "--", path],
                               capture_output=True, text=True, timeout=10).stdout.strip()
        if dirty:
            return datetime.now(timezone.utc).strftime("%Y-%m-%d")
        import subprocess
        d = subprocess.run(["git", "-C", OUT, "log", "-1", "--format=%cs", "--", path],
                           capture_output=True, text=True, timeout=10).stdout.strip()
        if d:
            return d
    except Exception:
        pass
    return datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc).strftime("%Y-%m-%d")

def write(path, content):
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if old == content:
        return
    print(("would write " if DRY else "wrote ") + os.path.relpath(path, OUT), flush=True)
    if not DRY:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

STATIC_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico?v=17" sizes="48x48"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=17"><link rel="icon" type="image/png" sizes="96x96" href="/img/favicon-eyes-96.png?v=17"><link rel="icon" type="image/png" sizes="192x192" href="/img/favicon-eyes-192.png?v=17"><link rel="apple-touch-icon" href="/img/app-icon-tint-180.png?v=23">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Mis&egrave;re Perdue (Misery)">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://misereperdue.com/img/og/default.jpg?v=1">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Misère Perdue closed eyes">
<meta property="og:image" content="https://misereperdue.com/img/og/default-square.jpg?v=1">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="Misère Perdue closed eyes">
<meta name="twitter:site" content="@misereperdue">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://misereperdue.com/img/og/default.jpg?v=1">
<script type="application/ld+json">{jsonld}</script>
<style>
body{{font-family:-apple-system,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 18px;line-height:1.65;color:#1a1a2e;background:#fff}}
a{{color:#2b4eff}}
header{{margin-bottom:28px;font-weight:800;letter-spacing:.14em;font-size:13px}}
header a{{text-decoration:none;color:#1a1a2e}}
nav.crumbs{{font-size:13px;color:#666;margin:-14px 0 18px}}
nav.crumbs a{{color:#666}}
.meta{{color:#666;font-size:13px;margin:0 0 6px}}
.thread{{margin:0 0 22px}}
.thread h2{{font-size:19px;margin:0 0 4px}}
.thread h2 a{{text-decoration:none;color:#1a1a2e}}
.cta{{margin:30px 0;padding:18px;border-radius:14px;background:#f4f4f8;text-align:center}}
.cta a{{font-weight:700;text-decoration:none}}
h1{{font-size:26px;line-height:1.25}}
</style>
<script src="/js/emoji.js?v=2" defer></script>
</head>
<body>
<header><a href="/">MIS&Egrave;RE PERDUE</a></header>
<main>
"""

EYES = [f"{SITE}/img/og/default.jpg?v=1", f"{SITE}/img/og/default-square.jpg?v=1"]  # wide + square eyes cards

def globe_page(threads_out):
    url = f"{SITE}/globe"
    title = "Globe | Misère Perdue (Misery)"  # per dc
    # per dc: the Globe's line in search (and its sitelink under the home result) leads with this sentence
    desc = ("Discover the best the world has to offer. Misery Globe is the community board of "
            "Misère Perdue (Misery): fashion, music and local finds.")
    items = sorted(threads_out, key=lambda t: t[3] or 0, reverse=True)
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Misery Globe", "url": url, "image": EYES,
           "description": desc, "isPartOf": {"@id": f"{SITE}/#website"},
           "mainEntity": {"@type": "ItemList", "itemListElement": [
               {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/t/{t[0]}", "name": t[1]} for i, t in enumerate(items)]}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
              {"@type": "ListItem", "position": 2, "name": "Misery Globe", "item": url}]}]
    rows = "".join(
        f'<div class="thread"><h2><a href="/t/{t[0]}">{html.escape(t[1])}</a></h2>'
        f'<p class="meta">By {html.escape(t[2])} &middot; {date_long(t[3])}'
        + (f' &middot; {t[5]} repl{"y" if t[5] == 1 else "ies"}' if t[5] else "") + "</p>"
        f'<p>{html.escape(t[4])}</p></div>\n' for t in items)
    return (STATIC_HEAD.format(title=html.escape(title), desc=html.escape(desc), url=url,
                               jsonld=json.dumps(ld, ensure_ascii=False).replace("</", "<\\/"))
            + '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Misery Globe</nav>\n'
            + "<h1>Misery Globe</h1>\n"
            + "<p>Misery Globe is a secure online discussion board run by Misère Perdue, a merchandise brand. "
              "Members discuss fashion, music and more. Posting and chatting earns stars, and VIP members get "
              "exclusive boards and perks (see <a href=\"/p/membership\">VIP</a>).</p>\n"
            + "<h2>Latest public threads</h2>\n" + rows
            + f'<div class="cta"><a href="{SITE}/#globe">Open Misery Globe on misereperdue.com &rarr;</a></div>\n'
            + "</main>\n</body>\n</html>\n")

def chat_page():
    """/chat (per dc): people get the app on the Chat tab (functions/_middleware.js); search engines and
    link previewers read this page."""
    url = f"{SITE}/chat"
    title = "Chat | Misère Perdue (Misery)"
    desc = ("Misery Chat is the live chat of Misère Perdue (Misery). Share songs, show off your powers "
            "and talk fashion and music in real time.")
    ld = [{"@context": "https://schema.org", "@type": "WebPage", "name": "Misery Chat", "url": url, "image": EYES,
           "description": desc, "isPartOf": {"@id": f"{SITE}/#website"}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
              {"@type": "ListItem", "position": 2, "name": "Chat", "item": url}]}]
    return (STATIC_HEAD.format(title=html.escape(title), desc=html.escape(desc), url=url,
                               jsonld=json.dumps(ld, ensure_ascii=False).replace("</", "<\\/"))
            + '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Chat</nav>\n'
            + "<h1>Misery Chat</h1>\n"
            + "<p>Misery Chat is the live chat room of Misère Perdue (Misery). Members share what they're "
              "listening to, send stars, use powers like hats, glow and charms, and talk fashion and music. "
              "VIP members get a VIP badge (see <a href=\"/p/membership\">VIP</a>).</p>\n"
            + f'<div class="cta"><a href="{SITE}/#chat">Open Misery Chat on misereperdue.com &rarr;</a></div>\n'
            + "</main>\n</body>\n</html>\n")

HOME_STYLE = """<style>
body{font-family:-apple-system,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:28px 18px 40px;line-height:1.65;color:#0a1230;background:#fff}
a{color:#2b4eff}
header{margin-bottom:26px;font-weight:800;letter-spacing:.14em;font-size:13px}
header a{text-decoration:none;color:#0a1230}
h1{font-size:30px;line-height:1.2;margin:0 0 10px}
.lede{font-size:17px;margin:0 0 6px}
h2{font-size:20px;margin:34px 0 12px}
.products{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
.product{display:flex;flex-direction:column;gap:6px}
.product img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:#0d1230}
.product a{text-decoration:none;color:#0a1230;font-weight:700}
.product .price{font-weight:600}
.product p{margin:0;color:#555b6e;font-size:13.5px;line-height:1.5}
.thread{margin:0 0 14px}
.thread a{font-weight:700;text-decoration:none;color:#0a1230}
.thread p{margin:2px 0 0;color:#555b6e;font-size:14px}
.cta{display:inline-block;margin-top:6px;font-weight:700;text-decoration:none}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #e6e8ef;font-size:13px;color:#555b6e;display:flex;flex-wrap:wrap;gap:6px 16px}
footer a{color:#555b6e}
</style>"""

def home_page(threads_out):
    """What search engines and link previewers read at / (per dc): people get the app (functions/_middleware.js
    serves this page only to bots). The <head> is copied from index.html so search tags stay identical."""
    src = open(os.path.join(OUT, "index.html"), encoding="utf-8").read()
    hd = src[:src.index("</head>")]
    keep = re.findall(r'<title>[\s\S]*?</title>|<meta (?:name="(?:description|robots|theme-color|twitter:[^"]+)"|property="og:[^"]+")[^>]*>'
                      r'|<link rel="(?:canonical|icon|apple-touch-icon)"[^>]*>|<script type="application/ld\+json">[\s\S]*?</script>', hd)
    e = html.escape
    prods = []
    pdir = os.path.join(OUT, "p")
    order = ["enraged-beanie", "misery-v_v-sleeping-mask", "membership", "stars"]
    for fn in sorted(os.listdir(pdir), key=lambda f: order.index(f[:-5]) if f[:-5] in order else 99):
        if not fn.endswith(".html"):
            continue
        ps = open(os.path.join(pdir, fn), encoding="utf-8").read()
        for blk in re.findall(r'<script type="application/ld\+json">(.*?)</script>', ps, re.S):
            for d in (lambda x: x if isinstance(x, list) else [x])(json.loads(blk)):
                if d.get("@type") != "Product":
                    continue
                offers = d["offers"] if isinstance(d["offers"], list) else [d["offers"]]
                lo = min(float(o["price"]) for o in offers); hi = max(float(o["price"]) for o in offers)
                money = lambda a: ("%d" % a) if a == int(a) else ("%.2f" % a)
                price = f"${money(lo)} CAD" if lo == hi else f"${money(lo)}–{money(hi)} CAD"
                desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', ps).group(1))
                imgs = d.get("image") or []
                # the square product card on our own domain (same look as the share image), else the store photo
                photo = next((u for u in imgs if "-sq.jpg" in u), imgs[0] if imgs else "").replace(SITE + "/", "/")
                prods.append((fn[:-5], d["name"], price, desc, photo))
    cards = "".join(
        f'<div class="product"><a href="/p/{h}"><img src="{e(img)}" alt="{e(n)} by Misère Perdue" width="240" height="240" loading="lazy" decoding="async"></a>'
        f'<a href="/p/{h}">{e(n)}</a><span class="price">{e(pr)}</span><p>{e(ds)}</p></div>\n' for h, n, pr, ds, img in prods)
    latest = sorted(threads_out, key=lambda t: t[3] or 0, reverse=True)[:5]
    threads = "".join(f'<div class="thread"><a href="/t/{t[0]}">{e(t[1])}</a><p>{e(t[4])}</p></div>\n' for t in latest)
    return ("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
            + "\n".join(keep) + "\n" + HOME_STYLE + "\n<script src=\"/js/emoji.js?v=2\" defer></script>\n</head>\n<body>\n"
            + '<header><a href="/">MIS&Egrave;RE PERDUE</a></header>\n<main>\n'
            + "<h1>Misère Perdue (Misery)</h1>\n"
            + '<p class="lede">The official website of merchandise brand Misère Perdue (Misery), and Misery Globe.</p>\n'
            + "<p>Misère Perdue is an independent clothing and merch brand with a community around it: "
              '<a href="/globe">Misery Globe</a>, a discussion board for fashion, music and local finds, and '
              '<a href="/chat">Misery Chat</a>, a live chat where members share songs, send stars and use powers. '
              "All sales are final.</p>\n"
            + '<h2><a href="/shop" style="color:inherit;text-decoration:none">Shop</a></h2>\n<div class="products">\n' + cards + "</div>\n"
            + '<a class="cta" href="/shop">See the shop &rarr;</a>\n'
            + '<h2><a href="/globe" style="color:inherit;text-decoration:none">Misery Globe</a></h2>\n'
            + "<p>Discover the best the world has to offer.</p>\n" + threads
            + '<a class="cta" href="/globe">Open Misery Globe &rarr;</a>\n'
            + '<h2><a href="/chat" style="color:inherit;text-decoration:none">Misery Chat</a></h2>\n'
            + "<p>Chat live with the Misère Perdue community, share what you're listening to and show off your powers.</p>\n"
            + '<a class="cta" href="/chat">Open Misery Chat &rarr;</a>\n'
            + "</main>\n<footer><span>Misère Perdue (Misery)</span>"
              '<a href="https://x.com/misereperdue" rel="me noopener">X @misereperdue</a>'
              '<a href="https://www.instagram.com/misereperdue/" rel="me noopener">Instagram @misereperdue</a>'
              '<a href="/info">Info &amp; Terms</a><span>&copy; 2026</span></footer>\n</body>\n</html>\n')

def write_sitemap(threads, threads_out):
    """Only canonical, indexable 200 URLs. lastmod = last git commit of the page
    (threads: last forum activity). Product images from the page's Product JSON-LD."""
    entries = []
    def add(loc, path, images=()):
        if path and os.path.exists(path):
            src = open(path, encoding="utf-8").read()
            if re.search(r'<meta name="robots" content="[^"]*noindex', src):
                return
        entries.append((loc, file_date(path) if path else iso(None), list(images)))
    add(f"{SITE}/", os.path.join(OUT, "index.html"))
    add(f"{SITE}/shop", os.path.join(OUT, "shop.html"))
    add(f"{SITE}/info", os.path.join(OUT, "info.html"))
    pdir = os.path.join(OUT, "p")
    for fn in sorted(os.listdir(pdir)) if os.path.isdir(pdir) else []:
        if not fn.endswith(".html"):
            continue
        path = os.path.join(pdir, fn)
        imgs = []
        for blk in re.findall(r'<script type="application/ld\+json">(.*?)</script>', open(path, encoding="utf-8").read(), re.S):
            data = json.loads(blk)
            for d in (data if isinstance(data, list) else [data]):
                if d.get("@type") == "Product":
                    im = d.get("image") or []
                    imgs += im if isinstance(im, list) else [im]
        add(f"{SITE}/p/{fn[:-5]}", path, imgs)
    add(f"{SITE}/globe", os.path.join(OUT, "globe.html"))
    add(f"{SITE}/chat", os.path.join(OUT, "chat.html"))
    for t in threads:
        if t.get("_lastmod"):
            entries.append((f"{SITE}/t/{t['id']}", t["_lastmod"], []))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
          'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for loc, lastmod, imgs in entries:
        sm.append(f"  <url>\n    <loc>{html.escape(loc)}</loc>\n    <lastmod>{lastmod}</lastmod>")
        for im in imgs:
            sm.append(f"    <image:image><image:loc>{html.escape(im)}</image:loc></image:image>")
        sm.append("  </url>")
    sm.append("</urlset>")
    write(os.path.join(OUT, "sitemap.xml"), "\n".join(sm) + "\n")
    print(f"sitemap: {len(entries)} URLs", flush=True)

def main():
    data = get("/api/forum/threads")
    threads = [t for t in data.get("threads", [])
               if not t.get("membersOnly") and not t.get("ownerOnly")]
    print(f"found {len(threads)} public threads", flush=True)

    tdir = os.path.join(OUT, "t")
    os.makedirs(tdir, exist_ok=True)

    seen = set()
    threads_out = []
    thread_images = {}
    for t in threads:
        tid = t["id"]
        if tid in seen:
            continue
        seen.add(tid)
        try:
            full = get(f"/api/forum/thread/{tid}")["thread"]
        except Exception as e:
            print(f"skip {tid}: {e}", flush=True)
            continue
        title = full.get("title") or "Untitled"
        author = full.get("author") or "anonymous"
        content = clean_html(full.get("content") or "")
        text = clean_text(full.get("content") or "")
        desc = (text[:154].rsplit(" ", 1)[0] + "…") if len(text) > 155 else text or title
        nrep = len(full.get("replies") or [])
        if len(desc) < 100:  # short posts: add context so the search line isn't thin (per dc's SEO review)
            tail = (f"{nrep} repl{'y' if nrep == 1 else 'ies'} on Misery Globe" if nrep else "On Misery Globe") + "."  # per dc: just "On Misery Globe."
            desc = (desc.rstrip(" .!?…") + ". " if desc and desc != title else "") + tail

        replies = full.get("replies") or []
        replies_html = ""
        comments = []
        if replies:
            parts = [f"<h2>Replies ({len(replies)})</h2>"]
            for r in replies:
                ra = r.get("author") or "anonymous"
                rc = clean_html(r.get("content") or "")
                rt = clean_text(r.get("content") or "")
                parts.append(
                    f'<div class="reply"><p class="meta"><strong>{html.escape(ra)}</strong> &middot; {date_long(r.get("createdAt"))}</p>'
                    f'<div class="reply-body">{rc}</div></div>')
                comments.append({"@type": "Comment",
                                 "author": {"@type": "Person", "name": ra},
                                 "text": rt[:500]})
            replies_html = "\n".join(parts)

        crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Misery Globe", "item": f"{SITE}/globe"},
            {"@type": "ListItem", "position": 3, "name": title, "item": f"{SITE}/t/{tid}"}]}
        jsonld = json.dumps([crumbs, {
            "@context": "https://schema.org",
            "@type": "DiscussionForumPosting",
            "headline": title,
            "url": f"{SITE}/t/{tid}",
            "author": {"@type": "Person", "name": author},
            "datePublished": iso(full.get("createdAt")),
            "image": "__IMAGES__",
            "articleBody": text[:2000],
            "comment": comments[:20],
        }], ensure_ascii=False).replace("</", "<\\/")
        threads_out.append((tid, title, author, full.get("createdAt"), desc, len(replies)))

        # thread question first, then the board (per dc's SEO review); keep under ~60 characters
        head_t = title if len(title) <= 45 else title[:44].rstrip() + "…"
        pt = f"{head_t} | " + ("Misère Perdue (Misery)" if "misery globe" in title.lower() else "Misery Globe")
        # per dc: a thread shares its own thumbnail; threads without one use the white closed-eyes card
        # ...plus a square version wherever wide previews aren't allowed (per dc): a centred crop of the
        # thread's thumbnail, or the square eyes card
        thumb = full.get("thumb") or t.get("thumb")
        images = None
        if thumb and re.fullmatch(r"[A-Za-z0-9_-]{6,64}", str(thumb)):
            sq = square_thumb(tid, f"{WORKER}/api/media/{thumb}")
            images = [(f"{WORKER}/api/media/{thumb}", None, None)] + ([(sq, 1200, 1200)] if sq else [])
            og_alt = f"{title} on Misery Globe"
        if not images:
            images = [(f"{SITE}/img/og/default.jpg?v=1", 1200, 630), (f"{SITE}/img/og/default-square.jpg?v=1", 1200, 1200)]
            og_alt = "Misère Perdue closed eyes"
        og_image = images[0][0]
        og_tags = "".join(f'<meta property="og:image" content="{html.escape(u)}">\n'
                          + (f'<meta property="og:image:width" content="{w}">\n<meta property="og:image:height" content="{h}">\n' if w else "")
                          + f'<meta property="og:image:alt" content="{html.escape(og_alt)}">\n' for u, w, h in images).rstrip("\n")
        thread_images[tid] = [u for u, _, _ in images]
        jsonld = jsonld.replace('"__IMAGES__"', json.dumps(thread_images[tid]))
        page = PAGE.format(og_image=html.escape(og_image), og_tags=og_tags,
            page_title=html.escape(pt), title=html.escape(title), desc=html.escape(desc, quote=True),
            url=f"{SITE}/t/{tid}", author=html.escape(author),
            date=date_long(full.get("createdAt")), content=content,
            replies_html=replies_html,
            live_url=f"{SITE}/#globe/{tid}", jsonld=jsonld)
        write(os.path.join(tdir, f"{tid}.html"), page)
        t["_lastmod"] = iso(full.get("lastActivity") or full.get("createdAt"))

    # threads that are gone or no longer public: remove their static page so search drops them.
    # Only when the thread list loaded and has entries, so a bad API response can't wipe the board.
    if threads and threads_out:
        live = {t[0] for t in threads_out}
        for fn in sorted(os.listdir(tdir)):
            if fn.endswith(".html") and fn[:-5] not in live:
                print(("would remove " if DRY else "removed ") + "t/" + fn, flush=True)
                if not DRY:
                    os.remove(os.path.join(tdir, fn))
        for fn in sorted(os.listdir(SQ_DIR)) if os.path.isdir(SQ_DIR) else []:
            if fn.endswith("-sq.jpg") and fn[:-7] not in {t for t in live if thread_images.get(t, [""])[-1].startswith(f"{SITE}/img/og/t/")}:
                print(("would remove " if DRY else "removed ") + "img/og/t/" + fn, flush=True)
                if not DRY:
                    os.remove(os.path.join(SQ_DIR, fn))
    write(os.path.join(OUT, "globe.html"), globe_page(threads_out))
    write(os.path.join(OUT, "chat.html"), chat_page())
    write(os.path.join(OUT, "home.html"), home_page(threads_out))
    write_sitemap(threads, threads_out)
    print(f"done: {len(seen)} thread pages", flush=True)

if __name__ == "__main__":
    main()
