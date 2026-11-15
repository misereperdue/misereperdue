#!/usr/bin/env python3
"""Product-only share cards (1200x630) for every store product for /p/<handle> og:image / twitter:image, per dc:
just the product photo, centered on its own navy, no text. Source = the catalog's featured product photo
(navy background, self-hosted under img/products/ since Shopify was retired). Run: python3 tools/build-og-products.py  -> img/og/<handle>-p.jpg"""
import io, os, urllib.request
from PIL import Image, ImageChops
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Every product in the catalog gets its card (per dc: product pages show their product image), from its
# featured image. Runs in the seo-refresh workflow, so new products get a card automatically.
import importlib.util
_spec = importlib.util.spec_from_file_location("bp", os.path.join(ROOT, "tools", "build-products.py"))
_bp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_bp)
SRC = {p["handle"]: p["featuredImage"]["url"] for p in _bp.fetch() if p.get("featuredImage")}

def load(url):
    """Our own images are read from the checkout; anything else is downloaded."""
    if url.startswith(_bp.SITE + "/"):
        return open(os.path.join(ROOT, url[len(_bp.SITE) + 1:].split("?")[0]), "rb").read()
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "misery-build-og"}), timeout=30).read()
# wide card (1200x630) + square card (1200x1200, per dc: a square version wherever wide isn't allowed)
SIZES = [("p", 1200, 630, 760, 400), ("sq", 1200, 1200, 740, 740)]

def card(im, W, H, MAX_W, MAX_H):
    bgc = im.getpixel((3, 3))
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bgc)).convert("L").point(lambda v: 255 if v > 14 else 0)
    x0, y0, x1, y1 = diff.getbbox()
    bleeds_top = y0 == 0      # VIP lanyard runs off the top of the photo: keep it bleeding off the card's top
    if bleeds_top:
        s = (H - 100) / y1    # bottom of the card 100px above the edge, lanyard to the top
        w = (x1 - x0) * s
        if w > MAX_W: s = MAX_W / (x1 - x0)
    else:
        s = min(MAX_W / (x1 - x0), MAX_H / (y1 - y0))
    pad = 40 / s              # keep the photo's own background around the product so there's no seam
    box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    crop = im.crop(tuple(int(v) for v in box))
    crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
    out = Image.new("RGB", (W, H), bgc)
    px = (W - round((x1 - x0) * s)) // 2 - round((x0 - box[0]) * s)
    py = (0 if bleeds_top else (H - round((y1 - y0) * s)) // 2 - round((y0 - box[1]) * s))
    out.paste(crop, (px, py))
    return out, bgc

for handle, url in SRC.items():
    im = Image.open(io.BytesIO(load(url))).convert("RGB")
    for suffix, W, H, MAX_W, MAX_H in SIZES:
        out, bgc = card(im, W, H, MAX_W, MAX_H)
        p = os.path.join(ROOT, "img", "og", f"{handle}-{suffix}.jpg")
        buf = io.BytesIO(); out.save(buf, "JPEG", quality=90, optimize=True, progressive=True)
        if os.path.exists(p) and open(p, "rb").read() == buf.getvalue():
            continue
        open(p, "wb").write(buf.getvalue())
        print("wrote", os.path.relpath(p, ROOT), out.size, "bg", "#%02x%02x%02x" % bgc)
