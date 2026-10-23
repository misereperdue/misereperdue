#!/usr/bin/env python3
"""Product-only share cards (1200x630) for /p/<handle> og:image / twitter:image, per dc:
just the product photo, centered on its own navy, no text. Source = Shopify product photo
(navy background). Run: python3 tools/build-og-products.py  -> img/og/<handle>-p.jpg"""
import io, os, urllib.request
from PIL import Image, ImageChops
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
SRC = {
    "misery-v_v-sleeping-mask": "https://cdn.shopify.com/s/files/1/0735/1589/2838/files/IMG_1654.png?v=1792639540",
    "membership": "https://cdn.shopify.com/s/files/1/0735/1589/2838/files/IMG-1597.png?v=1792287493",
}
MAX_W, MAX_H = 760, 400       # product box: wide margins so X / iMessage crops never cut it
for handle, url in SRC.items():
    im = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read())).convert("RGB")
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
    pad = 40 / s              # keep the photo's own navy around the product so there's no seam
    box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    crop = im.crop(tuple(int(v) for v in box))
    crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
    out = Image.new("RGB", (W, H), bgc)
    px = (W - round((x1 - x0) * s)) // 2 - round((x0 - box[0]) * s)
    py = (0 if bleeds_top else (H - round((y1 - y0) * s)) // 2 - round((y0 - box[1]) * s))
    out.paste(crop, (px, py))
    p = os.path.join(ROOT, "img", "og", f"{handle}-p.jpg")
    out.save(p, quality=90, optimize=True, progressive=True)
    print("wrote", os.path.relpath(p, ROOT), out.size, "bg", "#%02x%02x%02x" % bgc)
