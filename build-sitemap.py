#!/usr/bin/env python3
"""Generate static thread pages + sitemap.xml for Google indexing.
Fetches public forum threads and writes t/<id>.html + sitemap.xml.
Run via cron; only changed files are pushed.
"""
import json, re, html, urllib.request, os, sys
from datetime import datetime, timezone

WORKER = "https://misery-chat.freeglory416.workers.dev"
SITE = "https://misereperdue.com"
OUT = os.path.expanduser("~/workspace/site-study")

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
<title>Mis&egrave;re Perdue</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mis&egrave;re Perdue">
<meta property="og:title" content="Mis&egrave;re Perdue">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://misereperdue.com/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Mis&egrave;re Perdue">
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
</style>
</head>
<body>
<header><a href="/">MIS&Egrave;RE PERDUE</a></header>
<main>
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

def main():
    data = get("/api/forum/threads")
    threads = [t for t in data.get("threads", [])
               if not t.get("membersOnly") and not t.get("ownerOnly")]
    print(f"found {len(threads)} public threads", flush=True)

    tdir = os.path.join(OUT, "t")
    os.makedirs(tdir, exist_ok=True)

    urls = [("https://misereperdue.com/", iso(None), "daily", "1.0")]
    seen = set()
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
        desc = (text[:155] + "…") if len(text) > 155 else text or title

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

        jsonld = json.dumps({
            "@context": "https://schema.org",
            "@type": "DiscussionForumPosting",
            "headline": title,
            "author": {"@type": "Person", "name": author},
            "datePublished": iso(full.get("createdAt")),
            "articleBody": text[:2000],
            "comment": comments[:20],
        })

        page = PAGE.format(
            title=html.escape(title), desc=html.escape(desc, quote=True),
            url=f"{SITE}/t/{tid}.html", author=html.escape(author),
            date=date_long(full.get("createdAt")), content=content,
            replies_html=replies_html,
            live_url=f"{SITE}/#thread/{tid}", jsonld=jsonld)
        with open(os.path.join(tdir, f"{tid}.html"), "w") as f:
            f.write(page)
        urls.append((f"{SITE}/t/{tid}.html",
                     iso(full.get("lastActivity") or full.get("createdAt")),
                     "weekly", "0.8"))

    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, freq, pri in urls:
        sm.append(f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{lastmod}</lastmod>\n"
                  f"    <changefreq>{freq}</changefreq>\n    <priority>{pri}</priority>\n  </url>")
    sm.append("</urlset>")
    with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
        f.write("\n".join(sm) + "\n")
    print(f"wrote {len(urls)-1} thread pages + sitemap", flush=True)

if __name__ == "__main__":
    main()
