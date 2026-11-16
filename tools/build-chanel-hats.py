# Usage: python3 tools/build-chanel-hats.py img/hats  (writes PNGs; convert to webp q84)
# Renders the Chanel Tweed and Trapper hats as 4x raster overlays (140x145 hat box -> 560x580).
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
K = 4; W, H = 140 * K, 145 * K
OUT = sys.argv[1]

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

# ---------------------------------------------------------------- Trapper
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

def trapper():
    rnd = random.Random(3)
    top, base_c, hw = 20.0, 80.0, 46.0
    def bottom(x):  # crown hem arches up between the ear lobes
        d = (x - 70) / hw; return base_c - 8 * (1 - d * d) + 5
    def crown_poly():
        pts = []
        for i in range(61):
            a = math.pi * i / 60
            pts.append((70 - hw * math.cos(a), base_c - (base_c - top) * math.sin(a) ** 0.85))
        for i in range(31):
            x = 70 + hw - 2 * hw * i / 30; pts.append((x, bottom(x)))
        return pts
    cm = mask_of(lambda d: d.polygon([P(*p) for p in crown_poly()], fill=255))
    body = layer(); dr = ImageDraw.Draw(body)
    dr.polygon([P(*p) for p in crown_poly()], fill=(10, 10, 12, 255))
    # rib knit: knit columns with V stitches, purl gaps between; columns follow the dome
    ncol = 16; rows = 21
    for c in range(ncol):
        phi = -1.35 + 2.7 * (c + 0.5) / ncol
        for r in range(rows + 2):
            v = (r + 0.5) / rows
            y = top + 2 + v * (base_c + 4 - top)
            sv = min(1, max(0, (base_c - y) / (base_c - top)))
            hwv = hw * math.sqrt(max(0, 1 - sv ** 2.2)) * 1.02
            x = 70 + hwv * math.sin(phi)
            w = 2 * hwv * math.cos(phi) * (2.7 / ncol) * 0.98
            if w < 0.9: continue
            nx, ny = math.sin(phi), -sv
            shade = max(0, 0.15 + 0.55 * (-0.5 * nx - 0.6 * ny + 0.45 * math.cos(phi))) + rnd.uniform(-0.04, 0.04)
            knit_stitch(dr, x, y, w * 0.86, 3.2, shade)
    body = clip(blur(body, 0.12), cm)
    edge = layer(); ImageDraw.Draw(edge).line([P(x, bottom(x)) for x in np.linspace(24, 116, 40)], fill=(5, 5, 6, 255), width=int(2.6 * K))
    # top crown pinch shadow
    shade = layer(); ImageDraw.Draw(shade).ellipse([*P(56, top - 1), *P(84, top + 7)], fill=(0, 0, 0, 120))
    crown = comp(body, clip(blur(shade, 2), cm), clip(edge, cm))
    crown_fz = hairs(900, lambda r: (70 + 46 * math.cos(t := r.uniform(math.pi, math.tau)) * r.uniform(.96, 1.01), base_c + (base_c - top) * math.sin(t) * r.uniform(.96, 1.01)),
                     lambda r: (r.randint(30, 60),) * 3, lw=.3, lmin=.6, lmax=1.8, alpha=(80, 200), seed=4)

    def flap(cx, cy, rot):
        l = layer(); d = ImageDraw.Draw(l)
        m = Image.new("L", (W, H), 0); md = ImageDraw.Draw(m)
        ell = lambda rx, ry: [P(cx + math.cos(t) * rx * math.cos(rot) - math.sin(t) * ry * math.sin(rot), cy + math.cos(t) * rx * math.sin(rot) + math.sin(t) * ry * math.cos(rot)) for t in np.linspace(0, math.tau, 80)]
        md.polygon(ell(16.5, 10.4), fill=255)
        d.polygon(ell(16.5, 10.4), fill=(8, 8, 10, 255))
        ccm = mask_of(lambda dd: [stroke(dd, [(cx + (px - cx) * math.cos(rot) - (py - cy) * math.sin(rot), cy + (px - cx) * math.sin(rot) + (py - cy) * math.cos(rot)) for px, py in p], 2.6, 255) for p in cc_paths(cx, cy, 5.9)])
        cca = np.array(ccm)
        sw, sh = 1.2, 1.1
        for j in range(-12, 13):
            for i in range(-15, 16):
                lx, ly = i * sw, j * sh
                x = cx + lx * math.cos(rot) - ly * math.sin(rot); y = cy + lx * math.sin(rot) + ly * math.cos(rot)
                q = (lx / 16.5) ** 2 + (ly / 10.4) ** 2
                if q > 0.86: continue
                inside = cca[min(H - 1, int(y * K)), min(W - 1, int(x * K))] > 100
                sh_ = max(0, 0.42 - 0.4 * q - 0.2 * ly / 10.2 - 0.1 * lx / 14.5)
                knit_stitch(d, x, y, sw * 1.02, sh * 1.05, sh_, hi=(238 - int(30 * q), 234 - int(30 * q), 226 - int(30 * q)) if inside else None)
        rim = layer(); rd = ImageDraw.Draw(rim); rd.line(ell(15.5, 9.5) + [ell(15.5, 9.5)[0]], fill=(0, 0, 0, 230), width=int(1.3 * K)); rd.line(ell(16.2, 10) + [ell(16.2, 10)[0]], fill=(60, 60, 66, 120), width=int(.5 * K))
        l = comp(blur(l, 0.1), blur(rim, .4)); l = clip(l, m)
        fz = hairs(260, lambda r: (cx + 16.5 * math.cos(t := r.uniform(0, math.tau)) * math.cos(rot) - 10.4 * math.sin(t) * math.sin(rot), cy + 16.5 * math.cos(t) * math.sin(rot) + 10.4 * math.sin(t) * math.cos(rot)),
                   lambda r: (r.randint(28, 55),) * 3, lw=.3, lmin=.5, lmax=1.5, seed=int(cx))
        sh = blur(clip(Image.new("RGBA", (W, H), (0, 0, 0, 150)), m), 1.2).transform((W, H), Image.AFFINE, (1, 0, 0, 0, 1, -1.2 * K))
        return comp(sh, l, fz)


    def lobe(sgn):
        # rounded ear lobe: starts at the side of the crown, bulges outward and hangs below the hem
        base = [(25, 62), (13, 70), (8, 83), (10, 96), (18, 105), (29, 104), (37, 96), (41, 86), (42, 76)]
        pts = [((x if sgn < 0 else 140 - x), y) for x, y in base]
        m = mask_of(lambda d: d.polygon([P(*p) for p in pts], fill=255))
        m = m.filter(ImageFilter.GaussianBlur(1.6 * K)).point(lambda v: 255 if v > 128 else 0)
        l = layer(); d = ImageDraw.Draw(l)
        cx = 25 if sgn < 0 else 115
        d.rectangle([0, 0, W, H], fill=(9, 9, 11, 255))
        for j in range(-2, 22):
            for i in range(-9, 10):
                x = cx + i * 1.95 + (j % 2) * 0; y = 62 + j * 2.25
                # ribs curve round the lobe: rows bow downward toward the bottom
                y += 1.6 * (1 - (i / 9) ** 2) * (j / 20)
                rx = (x - cx) / 14; ry = (y - 86) / 18
                shade = max(0, 0.32 - 0.3 * (rx * -sgn * .6 + ry * .5) - 0.25 * (rx * rx + ry * ry))
                knit_stitch(d, x, y, 1.9, 2.4, shade)
        l = clip(blur(l, .1), m)
        sh = blur(clip(Image.new("RGBA", (W, H), (0, 0, 0, 120)), m), 1.4)
        fz = hairs(300, lambda r: ((p := pts[int(r.random() * len(pts))])[0] + r.uniform(-1, 1), p[1] + r.uniform(-1, 1)), lambda r: (r.randint(25, 50),) * 3, lw=.3, lmin=.5, lmax=1.4, seed=40 + sgn)
        return comp(sh, l, fz)

    def braid(x0, y0, y1):
        l = layer(); d = ImageDraw.Draw(l)
        y = y0; s = 1
        while y < y1:
            for t in (0, 1):
                cx = x0 + s * 0.8
                pts = [P(cx + math.cos(a) * 1.5 * math.cos(s * .7) - math.sin(a) * 2.3 * math.sin(s * .7), y + math.cos(a) * 1.5 * math.sin(s * .7) + math.sin(a) * 2.3 * math.cos(s * .7)) for a in np.linspace(0, math.tau, 14)]
                d.polygon(pts, fill=(8, 8, 10, 255))
                pts = [P(cx - .3 + math.cos(a) * .7, y - .5 + math.sin(a) * 1.3) for a in np.linspace(0, math.tau, 10)]
                d.polygon(pts, fill=(40, 40, 45, 255))
            y += 1.9; s = -s
        return blur(l, .12)

    def pom(cx, cy, r):
        l = layer(); d = ImageDraw.Draw(l)
        d.ellipse([*P(cx - r, cy - r * .95), *P(cx + r, cy + r * .97)], fill=(8, 8, 10, 255))
        prnd = random.Random(int(cx * 7))
        for _ in range(7000):
            a = prnd.uniform(0, math.tau); rr = r * math.sqrt(prnd.random()) * .94
            x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr * .96
            ln = prnd.uniform(.4, 1.2) * (0.5 + rr / r)
            lit = max(0, -0.6 * math.cos(a) * rr / r - 0.7 * math.sin(a) * rr / r + 0.2)
            g = int(6 + 24 * lit * prnd.uniform(.5, 1))
            d.line([P(x, y), P(x + math.cos(a) * ln, y + math.sin(a) * ln)], fill=(g, g, g + 2, prnd.randint(170, 255)), width=max(1, int(.3 * K)))
        return blur(l, .08)

    return comp(braid(20, 101, 127), braid(120, 101, 127), lobe(-1), lobe(1), crown, crown_fz, flap(30, 70, math.radians(-15)), flap(110, 70, math.radians(15)), pom(20, 133, 11), pom(120, 133, 11))

# ---------------------------------------------------------------- Tweed
def tweed():
    rnd = random.Random(11)
    x0, x1, R = 15.0, 125.0, 55.0
    cxh = (x0 + x1) / 2
    top_y = lambda x: 54 + 3 * (1 - ((x - cxh) / R) ** 2)
    bot_y = lambda x: 96 + 7 * (1 - ((x - cxh) / R) ** 2)
    # crown: soft grey mohair, slightly slouched to the right
    def bez(p0, p1, p2, p3, n=24):
        return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0], (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in np.linspace(0, 1, n)]
    # crown: a touch narrower than the cuff, straight-ish sides, broad slouched top that sits higher at the back (right)
    cs = lambda p: (p[0], p[1] if p[1] >= 58 else 58 - (58 - p[1]) * 1.2)  # taller crown, cuff unchanged
    crown_pts = [cs(p) for p in bez((16, 62), (15, 47), (23, 37), (40, 32)) + bez((40, 32), (58, 27), (84, 24), (101, 26)) + bez((101, 26), (117, 28), (126, 40), (124, 62))]
    cm = mask_of(lambda d: d.polygon([P(*p) for p in crown_pts], fill=255))
    cr = layer(); d = ImageDraw.Draw(cr)
    yy, xx = np.mgrid[0:H, 0:W] / K
    nx = np.clip((xx - cxh) / R, -1, 1); ny = np.clip((yy - 40) / 30, -1, 1)
    dist = np.sqrt(((xx - 50) / 64) ** 2 + ((yy - 30) / 42) ** 2); lum = 176 - 58 * dist - 14 * np.clip((yy - 50) / 14, 0, 1)
    g = np.clip(lum, 90, 205).astype(np.uint8)
    cr = Image.fromarray(np.dstack([g, g, (g.astype(int) + 3).clip(0, 255).astype(np.uint8), np.full_like(g, 255)]), "RGBA")
    ribs = layer(); d = ImageDraw.Draw(ribs)
    for i in range(48):
        u = -1 + 2 * (i + .5) / 48
        xb = cxh + R * math.sin(u * 1.45) * .99
        d.line([P(xb, 62), P(cxh + (xb - cxh) * .9 + 2, 39), P(cxh + (xb - cxh) * .66 + 6, 19)], fill=(60, 60, 66, 70), width=int(.9 * K))
        d.line([P(xb + .9, 62), P(cxh + (xb - cxh) * .9 + 2.8, 42)], fill=(230, 230, 235, 40), width=int(.6 * K))
    crease = layer(); cd = ImageDraw.Draw(crease)
    cd.line([P(*p) for p in [cs(p) for p in bez((42, 35), (62, 31), (86, 29), (106, 32))]], fill=(70, 70, 76, 120), width=int(1.6 * K))
    cd.line([P(*p) for p in [cs(p) for p in bez((42, 36.6), (62, 32.6), (86, 30.6), (106, 33.6))]], fill=(215, 215, 220, 80), width=int(1 * K))
    mo = hairs(5000, lambda r: (r.uniform(16, 124), r.uniform(18, 66)), lambda r: (r.randint(150, 230),) * 3, lw=.25, lmin=1, lmax=3.2, alpha=(30, 110), seed=5)
    crown = clip(comp(cr, blur(ribs, .35), blur(crease, 1.1), mo), cm)
    crown_halo = hairs(1600, lambda r: (lambda p: (p[0] + r.uniform(-.6, .6), p[1] + r.uniform(-.6, .6)))(crown_pts[int(r.random() * (len(crown_pts) - 6)) + 3]),
                       lambda r: (r.randint(150, 210),) * 3, lw=.25, lmin=.4, lmax=1.3, alpha=(50, 140), seed=6)

    # cuff texture in flat (arc, v) space, then wrapped round the head
    TW, TH = int(math.pi * R * K), int(52 * K)
    tex = Image.new("RGBA", (TW, TH), (0, 0, 0, 255))
    ta = np.zeros((TH, TW, 3), float)
    v = np.linspace(0, 1, TH)[:, None]
    base = 150 + 100 * np.clip(v * 1.5 - .05, 0, 1) ** .8
    ta[:] = base[..., None]
    tex = Image.fromarray(ta.clip(0, 255).astype(np.uint8)).convert("RGBA")
    td = ImageDraw.Draw(tex)
    S = lambda x, y: (x * K, y * K)
    tw, th = TW / K, TH / K
    # black slubs in rows
    slub = Image.new("RGBA", tex.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(slub)
    yrow = 3.0; row = 0
    while yrow < th:
        x = rnd.uniform(0, 4) + (row % 2) * 3
        while x < tw:
            ln = rnd.uniform(3.5, 7.5); vv = yrow / th
            if rnd.random() < .68 + vv * .32:
                pts = [S(x + ln * t, yrow + rnd.uniform(-.35, .35) + math.sin(t * 3) * .3) for t in np.linspace(0, 1, 6)]
                sd.line(pts, fill=(16, 16, 18, int(215 + 40 * vv)), width=int(rnd.uniform(2.5, 3.4) * K), joint="curve")
            x += ln + rnd.uniform(1.8, 3.2)
        yrow += rnd.uniform(5.2, 6.4); row += 1
    slub = slub.filter(ImageFilter.GaussianBlur(.35 * K))
    # fluffy white yarn: vertical and horizontal mohair bands laid over the slubs
    yarn = Image.new("RGBA", tex.size, (0, 0, 0, 0)); yd = ImageDraw.Draw(yarn)
    x = 2.0
    while x < tw:
        yd.line([S(x + rnd.uniform(-.6, .6), 0), S(x + rnd.uniform(-.8, .8), th / 2), S(x + rnd.uniform(-.6, .6), th)], fill=(252, 252, 252, 235), width=int(rnd.uniform(1.6, 3.6) * K))
        x += rnd.uniform(5, 8.4)
    yrow = 6.0
    while yrow < th:
        yd.line([S(0, yrow), S(tw / 2, yrow + rnd.uniform(-1, 1)), S(tw, yrow)], fill=(250, 250, 250, 110), width=int(rnd.uniform(1.2, 2.2) * K))
        yrow += rnd.uniform(5.4, 6.4)
    yarn = yarn.filter(ImageFilter.GaussianBlur(.6 * K))
    fz = Image.new("RGBA", tex.size, (0, 0, 0, 0)); fd = ImageDraw.Draw(fz)
    for _ in range(9000):
        x, y = rnd.uniform(0, tw), rnd.uniform(0, th); a = rnd.uniform(0, math.tau); ln = rnd.uniform(.8, 3.2)
        c = rnd.choice([(255, 255, 255), (255, 255, 255), (200, 200, 200), (120, 120, 124)])
        fd.line([S(x, y), S(x + math.cos(a) * ln * .5 + rnd.uniform(-.3, .3), y + math.sin(a) * ln * .5), S(x + math.cos(a) * ln, y + math.sin(a) * ln)], fill=c + (rnd.randint(50, 170),), width=max(1, int(.22 * K)))
    gry = Image.new("RGBA", tex.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(gry)
    for _ in range(500):
        x, y = rnd.uniform(0, tw), rnd.uniform(0, th)
        gd.ellipse([*S(x, y), *S(x + rnd.uniform(.8, 1.8), y + rnd.uniform(.6, 1.2))], fill=(110, 110, 114, 120))
    tex = Image.alpha_composite(tex, gry.filter(ImageFilter.GaussianBlur(.3 * K)))
    tex = Image.alpha_composite(tex, slub)
    tex = Image.alpha_composite(tex, yarn)
    tex = Image.alpha_composite(tex, fz)
    T = np.array(tex).astype(float)
    # wrap onto the cylinder
    out = np.zeros((H, W, 4), float)
    xs = xx; ys = yy
    dx = np.clip((xs - cxh) / R, -.999, .999)
    u = np.arcsin(dx)
    tt = top_y(xs); bb = bot_y(xs)
    vv = (ys - tt) / (bb - tt)
    inside = (xs >= x0) & (xs <= x1) & (vv >= 0) & (vv <= 1)
    tx = ((u + math.pi / 2) / math.pi * (TW - 1)).astype(int)
    ty = (vv.clip(0, 1) * (TH - 1)).astype(int)
    samp = T[ty, tx]
    light = (0.72 + 0.3 * np.cos(u - 0.35)) * (0.94 + 0.08 * (1 - vv.clip(0, 1)))
    samp[..., :3] *= light[..., None]
    out[inside] = samp[inside]
    cuff = Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGBA")
    # round the rolled ends: inset mask with soft corners, sides bulging slightly at mid height
    def cuff_outline():
        pts = [(x, top_y(x)) for x in np.linspace(x0 + 6, x1 - 6, 30)]
        pts += bez((x1 - 6, top_y(x1 - 6)), (x1 + 1, top_y(x1)), (x1 + 2, 72), (x1 + 1.5, 78)) + bez((x1 + 1.5, 78), (x1 + 1, 92), (x1 - 1, bot_y(x1) - 1), (x1 - 8, bot_y(x1 - 8)))
        pts += [(x, bot_y(x)) for x in np.linspace(x1 - 8, x0 + 8, 30)]
        pts += bez((x0 + 8, bot_y(x0 + 8)), (x0 + 1, bot_y(x0) - 1), (x0 - 1, 92), (x0 - 1.5, 78)) + bez((x0 - 1.5, 78), (x0 - 2, 72), (x0 - 1, top_y(x0)), (x0 + 6, top_y(x0 + 6)))
        return pts
    om = mask_of(lambda d: d.polygon([P(*p) for p in cuff_outline()], fill=255))
    full = np.array(cuff); src = full.copy()
    # stretch the texture out to the bulge where the outline goes past the wrapped band
    for k in range(1, 3 * K):
        src[:, k:][src[:, k:, 3] == 0] = full[:, :-k][src[:, k:, 3] == 0]
        src[:, :-k][src[:, :-k, 3] == 0] = full[:, k:][src[:, :-k, 3] == 0]
    cuff = Image.fromarray(src, "RGBA"); cuff.putalpha(om)
    edge_dark = blur(clip(Image.new("RGBA", (W, H), (60, 60, 64, 255)), ImageChops.subtract(om, om.filter(ImageFilter.MinFilter(11)))), .8)
    cuff = comp(cuff, Image.blend(layer(), edge_dark, .35))
    cuffm = cuff.getchannel("A")
    # soft fuzzy edges: blur the mask edge, add white hairs radiating out
    cuff.putalpha(cuffm.filter(ImageFilter.GaussianBlur(.5 * K)))
    def edge_pt(r):
        side = r.random()
        if side < .7: x = r.uniform(x0 + 2, x1 - 2); return x, bot_y(x) + r.uniform(-1.5, .5)
        if side < .8: x = r.uniform(x0 + 2, x1 - 2); return x, top_y(x) + r.uniform(-.5, 1.5)
        return (x0 + r.uniform(0, 1.5), r.uniform(60, 98)) if side < .875 else (x1 - r.uniform(0, 1.5), r.uniform(60, 98))
    def edge_ang(r, x, y):
        if y > 90 and x0 + 3 < x < x1 - 3: return math.pi / 2 + r.uniform(-.9, .9)
        if x < x0 + 3: return math.pi + r.uniform(-.9, .9)
        if x > x1 - 3: return r.uniform(-.9, .9)
        return -math.pi / 2 + r.uniform(-.9, .9)
    halo = hairs(2600, edge_pt, lambda r: (r.randint(225, 255),) * 3, lw=.25, lmin=.6, lmax=2.2, alpha=(80, 220), seed=8, angle=edge_ang)
    topfz = hairs(1400, lambda r: ((x := r.uniform(x0, x1)), top_y(x) + r.uniform(-1, 3)), lambda r: (r.randint(110, 170),) * 3, lw=.25, lmin=1, lmax=3, alpha=(80, 200), seed=9)
    # padded black CC
    def ccl(fill, w, off=(0, 0)):
        l = layer(); dd = ImageDraw.Draw(l)
        for p in cc_paths(52, 78, 12.6): stroke(dd, [(a + off[0], b + off[1]) for a, b in p], w, fill)
        return l
    shadow = blur(ccl((0, 0, 0, 150), 5.6, (.6, 1.6)), .9)
    body = ccl((16, 16, 18, 255), 5.4)
    hi = clip(blur(ccl((62, 62, 68, 255), 1.8, (-.7, -1.1)), .9), body.getchannel("A"))
    rim = clip(blur(ccl((0, 0, 0, 255), 1.2, (.6, .9)), .4), body.getchannel("A"))
    cc = comp(shadow, body, rim, hi)
    return comp(crown, crown_halo, cuff, topfz, halo, cc)

def reshape(im, sx, sy, ax=70, ay=104):
    # narrower and taller about the bottom-centre of the cuff (inverse affine for PIL)
    return im.transform((W, H), Image.AFFINE, (1 / sx, 0, ax * K * (1 - 1 / sx), 0, 1 / sy, ay * K * (1 - 1 / sy)), resample=Image.BICUBIC)
reshape(tweed(), .9, 1.0).save(OUT + "/tweed.png"); trapper().save(OUT + "/trapper.png")
