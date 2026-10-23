#!/usr/bin/env python3
"""Generate static thread pages + sitemap.xml for Google indexing.

Fetches public forum threads from the live API and writes t/<id>.html plus
sitemap.xml into THIS repo (the directory this script lives in), so it works
from any checkout. Read-only against the API (GET only).

URLs are clean (no .html): Cloudflare Pages serves /t/t29 from t/t29.html and
308-redirects /t/t29.html -> /t/t29, so canonical/og:url/sitemap must use the
clean form or Google sees a redirect for every entry.

Also writes globe.html (/globe, crawlable Misery Globe landing) and sitemap.xml
(/, /shop, /globe, p/*, t/*; no noindex pages; git-based lastmod; product images).
tools/build-products.py runs this automatically after regenerating p/*.

Usage:  python3 build-sitemap.py            # regenerate t/*.html + sitemap.xml
        python3 build-sitemap.py --dry-run  # print what would change
Then review `git diff`, commit, and open a PR (see docs/SITE_GUIDE.md).
"""
import json, re, html, urllib.request, os, sys
from datetime import datetime, timezone

WORKER = "https://api.misereperdue.com"  # misery-chat Worker (custom domain)
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
    return h

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
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mis&egrave;re Perdue">
<meta property="og:title" content="{page_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://misereperdue.com/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="MISERY closed eyes logo">
<meta name="twitter:site" content="@misereperdue">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{page_title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://misereperdue.com/img/og-image.jpg">
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="Mis&egrave;re Perdue">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://misereperdue.com/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="MISERY closed eyes logo">
<meta name="twitter:site" content="@misereperdue">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://misereperdue.com/img/og-image.jpg">
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
</head>
<body>
<header><a href="/">MIS&Egrave;RE PERDUE</a></header>
<main>
"""

def globe_page(threads_out):
    url = f"{SITE}/globe"
    title = "Misery Globe · Fashion & Music Community by Misère Perdue"
    desc = ("Misery Globe is the discussion board run by Misère Perdue, a Toronto "
            "merchandise brand. Talk fashion, music and more.")
    items = sorted(threads_out, key=lambda t: t[3] or 0, reverse=True)
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Misery Globe", "url": url,
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
            "articleBody": text[:2000],
            "comment": comments[:20],
        }], ensure_ascii=False).replace("</", "<\\/")
        threads_out.append((tid, title, author, full.get("createdAt"), desc, len(replies)))

        pt = (f"{title} by Misère Perdue" if "misery globe" in title.lower()
              else f"{title} · Misery Globe")
        if len(pt) > 60: pt = f"{title} · Misery Globe"
        if len(pt) > 60: pt = title[:57].rstrip() + "…"
        page = PAGE.format(
            page_title=html.escape(pt), title=html.escape(title), desc=html.escape(desc, quote=True),
            url=f"{SITE}/t/{tid}", author=html.escape(author),
            date=date_long(full.get("createdAt")), content=content,
            replies_html=replies_html,
            live_url=f"{SITE}/#globe/{tid}", jsonld=jsonld)
        write(os.path.join(tdir, f"{tid}.html"), page)
        t["_lastmod"] = iso(full.get("lastActivity") or full.get("createdAt"))

    write(os.path.join(OUT, "globe.html"), globe_page(threads_out))
    write_sitemap(threads, threads_out)
    print(f"done: {len(seen)} thread pages", flush=True)

if __name__ == "__main__":
    main()
