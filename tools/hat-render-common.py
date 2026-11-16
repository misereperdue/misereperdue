# Renders the Chanel Tweed and Trapper hats as 4x raster overlays (140x145 hat box -> 560x580).
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
K = 4; W, H = 140 * K, 145 * K
OUT = sys.argv[1] if len(sys.argv) > 1 else "."

def layer(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))
def P(x, y): return (x * K, y * K)
def comp(*ls):
    base = layer()
    for l in ls: base = Image.alpha_composite(base, l)
    return base
def blur(im, r): return im.filter(ImageFilter.GaussianBlur(r * K))
def mask_of(fn):
    m = Image.new("L", (W, H), 0); fn(ImageDraw.Draw(m)); return m
def clip(im, m):
    a = ImageChops.multiply(im.getchannel("A"), m); im = im.copy(); im.putalpha(a); return im

def cc_paths(cx, cy, R, gap=31):
    d = R * 0.56
    def arc(x, a0, a1, n=60):
        return [(x + R * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + R * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    return [arc(cx + d, gap, 360 - gap), arc(cx - d, 180 + gap, 540 - gap), arc(cx + d, 118, 178, 20)]
def stroke(dr, pts, w, fill):
    q = [P(*p) for p in pts]
    dr.line(q, fill=fill, width=int(w * K), joint="curve")
    r = w * K / 2
    for e in (q[0], q[-1]): dr.ellipse([e[0] - r, e[1] - r, e[0] + r, e[1] + r], fill=fill)

def hairs(n, region, color, lw=0.35, lmin=1.5, lmax=4.5, alpha=(60, 200), seed=1, angle=None):
    rnd = random.Random(seed); l = layer(); dr = ImageDraw.Draw(l)
    for _ in range(n):
        x, y = region(rnd)
        a = angle(rnd, x, y) if angle else rnd.uniform(0, math.tau)
        ln = rnd.uniform(lmin, lmax); bend = rnd.uniform(-0.5, 0.5)
        pts = []
        for t in np.linspace(0, 1, 5):
            aa = a + bend * t
            pts.append(P(x + math.cos(aa) * ln * t, y + math.sin(aa) * ln * t))
        c = color(rnd) if callable(color) else color
        dr.line(pts, fill=c + (rnd.randint(*alpha),), width=max(1, int(lw * K)))
    return l

def knit_stitch(dr, x, y, w, h, shade, base=(14, 14, 16), hi=None):
    # one knit V: two slanted loops, each with a soft highlight
    g = lambda v: tuple(int(max(0, min(255, c))) for c in v)
    col = g([b + 28 * shade for b in base]) if hi is None else hi
    dark = g([c * 0.45 for c in col])
    for s in (-1, 1):
        cx = x + s * w * 0.24
        ang = s * 0.42
        pts = []
        for t in np.linspace(0, math.tau, 18):
            ex, ey = math.cos(t) * w * 0.30, math.sin(t) * h * 0.62
            pts.append(P(cx + ex * math.cos(ang) - ey * math.sin(ang), y + ex * math.sin(ang) + ey * math.cos(ang)))
        dr.polygon(pts, fill=dark)
        pts2 = []
        for t in np.linspace(0, math.tau, 18):
            ex, ey = math.cos(t) * w * 0.2, math.sin(t) * h * 0.45
            pts2.append(P(cx - s * w * 0.03 + ex * math.cos(ang) - ey * math.sin(ang), y - h * 0.08 + ex * math.sin(ang) + ey * math.cos(ang)))
        dr.polygon(pts2, fill=col)

