# Usage: python3 tools/build-chrome-hats.py <outdir>  (needs tools/hat-render-common.py and tools/fonts/ beside it; fonts are SIL OFL)
# Chrome Hearts hat power renders (cap, blue beanie, star beanie) as 4x overlays for the 140x145 hat box.
# Ornaments and lettering are original (simple four-petal flower, plain serif type); garment shapes, colours and
# materials follow dc's reference photos.
import os, sys
sys.argv = sys.argv[:1] + [sys.argv[1] if len(sys.argv) > 1 else "."]
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "hat-render-common.py")).read())
from PIL import ImageFont
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")  # OFL blackletter faces
GOTHIC = os.path.join(FD, "UnifrakturCook-Bold.ttf"); SWASH = os.path.join(FD, "UnifrakturMaguntia-Book.ttf"); BLOCK = os.path.join(FD, "PirataOne-Regular.ttf")

def bez(p0, p1, p2, p3, n=24):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0], (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in np.linspace(0, 1, n)]

def flower(d, cx, cy, r, fill):
    # original ornament: four rounded petals with a dot centre and small diagonal sparks
    for a in range(4):
        t = a * math.pi / 2
        px, py = cx + math.cos(t) * r * .52, cy + math.sin(t) * r * .52
        pts = [P(px + math.cos(t) * r * .48 * math.cos(u) - math.sin(t) * r * .3 * math.sin(u), py + math.sin(t) * r * .48 * math.cos(u) + math.cos(t) * r * .3 * math.sin(u)) for u in np.linspace(0, math.tau, 20)]
        d.polygon(pts, fill=fill)
    for a in range(4):
        t = math.pi / 4 + a * math.pi / 2
        d.line([P(cx + math.cos(t) * r * .35, cy + math.sin(t) * r * .35), P(cx + math.cos(t) * r * .78, cy + math.sin(t) * r * .78)], fill=fill, width=max(1, int(r * .16 * K)))
    d.ellipse([*P(cx - r * .22, cy - r * .22), *P(cx + r * .22, cy + r * .22)], fill=fill)

def cross_fleury(d, cx, cy, r, fill, rot=0):
    # traditional heraldic cross fleury: slim arms, each ending in three lobes (a pointed centre petal and two
    # side petals splaying outward), drawn from heraldic convention
    def tr(x, y, a):
        ca, sa = math.cos(a), math.sin(a)
        return P(cx + x * ca - y * sa, cy + x * sa + y * ca)
    def leaf(a, bx, by, ang, ln, wd):
        pts = []
        for t in np.linspace(0, 1, 16):
            w = wd * math.sin(math.pi * min(1, t * 1.15)) ** .7 * (1 - t) ** .35
            pts.append((t * ln, w))
        pts += [(x, -y) for x, y in reversed(pts)]
        ca, sa = math.cos(ang), math.sin(ang)
        return [tr(bx + x * ca - y * sa, by + x * sa + y * ca, a) for x, y in pts]
    for k in range(4):
        a = rot + k * math.pi / 2
        d.polygon([tr(x, y, a) for x, y in [(0, -r * .1), (r * .55, -r * .13), (r * .55, r * .13), (0, r * .1)]], fill=fill)
        d.polygon(leaf(a, r * .5, 0, 0, r * .5, r * .17), fill=fill)
        for sgn in (-1, 1):
            d.polygon(leaf(a, r * .52, sgn * r * .06, sgn * .95, r * .4, r * .12), fill=fill)
        d.polygon([tr(x, y, a) for x, y in [(r * .44, -r * .22), (r * .52, -r * .22), (r * .52, r * .22), (r * .44, r * .22)]], fill=fill)
    d.ellipse([*P(cx - r * .17, cy - r * .17), *P(cx + r * .17, cy + r * .17)], fill=fill)

def text(d, cx, cy, s, size, fill, spacing=0, font=None):
    f = ImageFont.truetype(font or GOTHIC, int(size * K))
    w = d.textlength(s, font=f) + spacing * K * (len(s) - 1)
    x = cx * K - w / 2
    for ch in s:
        d.text((x, cy * K), ch, font=f, fill=fill, anchor="lm"); x += d.textlength(ch, font=f) + spacing * K

def rib_dome(pts_outline, base, ncol, rows, top, bot, hw, cx=70, light=28):
    m = mask_of(lambda d: d.polygon([P(*p) for p in pts_outline], fill=255))
    l = layer(); d = ImageDraw.Draw(l)
    d.polygon([P(*p) for p in pts_outline], fill=tuple(int(c * .55) for c in base) + (255,))
    rnd = random.Random(7)
    for c in range(ncol):
        phi = -1.4 + 2.8 * (c + .5) / ncol
        for r in range(rows + 2):
            y = top + (r + .3) * (bot - top) / rows
            sv = min(1, max(0, (bot - y) / (bot - top)))
            hwv = hw * math.sqrt(max(0, 1 - sv ** 2.4)) * 1.03
            x = cx + hwv * math.sin(phi)
            w = 2 * hwv * math.cos(phi) * (2.8 / ncol) * .95
            if w < .8: continue
            shade = max(0, .2 + .6 * (-.5 * math.sin(phi) + .5 * sv + .4 * math.cos(phi))) + rnd.uniform(-.04, .04)
            knit_stitch(d, x, y, w * .9, (bot - top) / rows * 1.1, shade * light / 28, base=base)
    return clip(blur(l, .12), m), m

def rib_cuff(x0, x1, y0, y1, base, motif=None, motif_col=None):
    # folded cuff in vertical rib, wrapped round the head; optional knitted-in motif (mask in hat space)
    l = layer(); d = ImageDraw.Draw(l)
    cxh, R = (x0 + x1) / 2, (x1 - x0) / 2
    sag = lambda x: 3.5 * (1 - ((x - cxh) / R) ** 2)
    outline = [(x, y0 + sag(x) * .5) for x in np.linspace(x0, x1, 30)] + [(x, y1 + sag(x)) for x in np.linspace(x1, x0, 30)]
    m = mask_of(lambda dd: dd.polygon([P(*p) for p in outline], fill=255))
    m = m.filter(ImageFilter.GaussianBlur(1.2 * K)).point(lambda v: 255 if v > 128 else 0)
    d.rectangle([0, 0, W, H], fill=tuple(int(c * .5) for c in base) + (255,))
    ma = np.array(motif) if motif is not None else None
    ncol, nrow = 96, 22
    for c in range(ncol):
        u = -1.45 + 2.9 * (c + .5) / ncol
        x = cxh + R * math.sin(u) * 1.01
        w = R * math.cos(u) * 2.9 / ncol * 1.05
        for r in range(nrow + 1):
            v = (r + .2) / nrow
            y = y0 + v * (y1 - y0) + sag(x) * (.5 + .5 * v)
            shade = max(0, .18 + .3 * math.cos(u - .35) - .12 * v)
            hi = None
            if ma is not None and ma[min(H - 1, int(y * K)), min(W - 1, int(x * K))] > 100:
                hi = tuple(int(cc * (.82 + .18 * shade)) for cc in motif_col)
            knit_stitch(d, x, y, w * .95, (y1 - y0) / nrow * 1.15, shade, base=base, hi=hi)
    fold = layer(); ImageDraw.Draw(fold).line([P(x, y0 + sag(x) * .5 + .6) for x in np.linspace(x0, x1, 30)], fill=(255, 255, 255, 40), width=int(1 * K))
    return comp(clip(blur(l, .1), m), clip(fold, m)), m, outline

def fuzz_edge(pts, col, n=600, seed=3, lmax=1.4):
    return hairs(n, lambda r: ((p := pts[int(r.random() * len(pts))])[0] + r.uniform(-.6, .6), p[1] + r.uniform(-.6, .6)), lambda r: tuple(int(c * r.uniform(.8, 1.1)) for c in col), lw=.28, lmin=.4, lmax=lmax, seed=seed)

def drop(m, a=110, r=1.2, dy=1.2):
    return blur(clip(Image.new("RGBA", (W, H), (0, 0, 0, a)), m), r).transform((W, H), Image.AFFINE, (1, 0, 0, 0, 1, -dy * K))

# ------------------------------------------------------------ blue beanie
def blue():
    base = (138, 158, 210)
    crown_pts = bez((24, 62), (22, 40), (40, 22), (70, 19)) + bez((70, 19), (100, 22), (118, 40), (116, 62))
    crown, cm = rib_dome(crown_pts, base, 38, 24, 19, 66, 47, light=16)
    peak = layer(); ImageDraw.Draw(peak).line([P(*p) for p in bez((64, 20), (67, 26), (69, 30), (70, 34))], fill=(70, 85, 125, 120), width=int(1.2 * K))
    motif = Image.new("L", (W, H), 0); md = ImageDraw.Draw(motif)
    for x in (23, 39, 101, 117): cross_fleury(md, x, 73.6, 9, 255)
    text(md, 61, 73.4, "C", 22, 255, 0, SWASH); text(md, 79, 73.4, "H", 22, 255, 0, SWASH)
    motif = motif.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.5 * K)).point(lambda v: 255 if v > 80 else 0)  # stitch takes the colour where the letter covers enough of it
    cuff, km, outline = rib_cuff(20, 120, 61, 87, base, motif, (246, 244, 236))
    fz = fuzz_edge(crown_pts, (150, 170, 220), 700, 5) 
    return comp(drop(cm, 60), crown, clip(blur(peak, .5), cm), fz, drop(km, 120, 1, 1.4), cuff, fuzz_edge(outline, (150, 170, 220), 500, 6))

# ------------------------------------------------------------ star beanie
def star_pts(cx, cy, R, r, rot=0):
    return [(cx + (R if i % 2 == 0 else r) * math.cos(rot - math.pi / 2 + i * math.pi / 5), cy + (R if i % 2 == 0 else r) * math.sin(rot - math.pi / 2 + i * math.pi / 5)) for i in range(10)]
def stars():
    base = (26, 26, 30)
    crown_pts = bez((24, 62), (22, 38), (42, 21), (70, 21)) + bez((70, 21), (98, 21), (118, 38), (116, 62))
    crown, cm = rib_dome(crown_pts, base, 34, 22, 21, 66, 47, light=22)
    gather = layer(); gd = ImageDraw.Draw(gather)
    for a in np.linspace(-1, 1, 7):
        gd.line([P(70 + a * 4, 22), P(70 + a * 14, 30)], fill=(0, 0, 0, 110), width=int(1 * K))
    tag = layer(); ImageDraw.Draw(tag).rounded_rectangle([*P(67.6, 19.4), *P(72.4, 23)], radius=1 * K, fill=(230, 230, 230, 255))
    cuff, km, outline = rib_cuff(20, 120, 60, 87, base)
    sl = layer(); sd = ImageDraw.Draw(sl)
    shadow = layer(); shd = ImageDraw.Draw(shadow)
    for (cx, cy, rot) in ((53, 75, -.08), (70, 76, .05), (87, 75, .1)):
        pts = star_pts(cx, cy, 13.5, 5.8, rot)
        shd.polygon([P(x + .5, y + 1) for x, y in pts], fill=(0, 0, 0, 150))
        sd.polygon([P(*p) for p in pts], fill=(150, 26, 40, 255))
        inner = star_pts(cx, cy, 11.8, 5, rot)
        for i in range(10):
            a, b = inner[i], inner[(i + 1) % 10]
            for t in np.arange(0, 1, .2):
                sd.line([P(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), P(a[0] + (b[0] - a[0]) * (t + .11), a[1] + (b[1] - a[1]) * (t + .11))], fill=(95, 12, 22, 255), width=max(1, int(.35 * K)))
    felt = hairs(1800, lambda r: (r.uniform(38, 102), r.uniform(62, 88)), lambda r: (r.randint(150, 190), 40, 52), lw=.22, lmin=.3, lmax=.9, alpha=(30, 90), seed=12)
    sm = sl.getchannel("A")
    shade = blur(clip(Image.new("RGBA", (W, H), (255, 255, 255, 30)), sm), .6).transform((W, H), Image.AFFINE, (1, 0, .6 * K, 0, 1, .8 * K))
    st = comp(blur(shadow, .7), sl, clip(felt, sm), shade)
    return comp(drop(cm, 70), crown, clip(blur(gather, .6), cm), tag, fuzz_edge(crown_pts, (55, 55, 60), 600, 7), drop(km, 140, 1, 1.4), cuff, fuzz_edge(outline, (55, 55, 60), 400, 8), st)

# ------------------------------------------------------------ trucker cap
def cap():
    # back mesh side panels, white foam front, black bill, silver top button, red embroidered patch
    mesh_pts = bez((19, 74), (18, 44), (38, 22), (70, 20)) + bez((70, 20), (102, 22), (122, 44), (121, 74))
    mm = mask_of(lambda d: d.polygon([P(*p) for p in mesh_pts], fill=255))
    mesh = layer(); md = ImageDraw.Draw(mesh)
    md.polygon([P(*p) for p in mesh_pts], fill=(22, 22, 25, 255))
    for j in range(0, 60):
        for i in range(0, 120):
            x = 10 + i * 1.15 + (j % 2) * .57; y = 18 + j * 1.0
            md.ellipse([*P(x - .36, y - .3), *P(x + .36, y + .3)], fill=(70, 70, 78, 255))
    mesh = clip(mesh, mm)
    front_pts = bez((30, 74), (27, 42), (46, 17), (70, 16)) + bez((70, 16), (94, 17), (113, 42), (110, 74))
    fm = mask_of(lambda d: d.polygon([P(*p) for p in front_pts], fill=255))
    yy, xx = np.mgrid[0:H, 0:W] / K
    dist = np.sqrt(((xx - 58) / 50) ** 2 + ((yy - 34) / 46) ** 2)
    g = np.clip(252 - 26 * dist ** 1.6, 200, 255)
    foam = Image.fromarray(np.dstack([g, g, g * .995, np.full_like(g, 255)]).astype(np.uint8), "RGBA")
    seam = layer(); sd = ImageDraw.Draw(seam)
    for side in (-1, 1):
        sd.line([P(*p) for p in bez((70 + side * 1.5, 17), (70 + side * 18, 18), (70 + side * 36, 40), (70 + side * 39, 74))], fill=(215, 215, 215, 255), width=int(.5 * K))
    foam = clip(comp(foam, seam), fm)
    # patch
    pl = layer(); pd = ImageDraw.Draw(pl)
    px0, py0, px1, py1 = 44, 36, 96, 66
    red, dred = (176, 30, 52, 255), (120, 14, 32, 255)
    pd.rectangle([*P(px0, py0), *P(px1, py1)], fill=(246, 245, 241, 255))
    pd.rectangle([*P(px0, py0), *P(px1, py1)], outline=red, width=int(1.5 * K))
    pd.rectangle([*P(px0 + 2.2, py0 + 2.2), *P(px1 - 2.2, py1 - 2.2)], outline=red, width=int(.6 * K))
    [text(pd, 70 + o, 41.2, "CHROME HEARTS", 4.2, red, -.05, SWASH) for o in (0, .1)]
    text(pd, 70, 50.8, "CH", 15, red, .8, SWASH); text(pd, 70.25, 50.8, "CH", 15, red, .8, SWASH)
    [text(pd, 70 + o, 61.2, "PARIS", 5, red, .3, SWASH) for o in (0, .1)]
    cross_fleury(pd, 52, 51.4, 5.2, red); cross_fleury(pd, 88, 51.4, 5.2, red)
    pm = mask_of(lambda d: d.rectangle([*P(px0, py0), *P(px1, py1)], fill=255))
    redm = Image.fromarray(((np.array(pl)[..., 0] > 140) & (np.array(pl)[..., 1] < 80)).astype(np.uint8) * 255)
    hatch = layer(); hd = ImageDraw.Draw(hatch)
    for k in range(-60, 140):
        hd.line([P(px0 + k * .7, py0), P(px0 + k * .7 + 8, py1)], fill=(90, 8, 24, 110), width=1)
    emb = comp(blur(clip(Image.new("RGBA", (W, H), (60, 0, 10, 160)), redm), .35).transform((W, H), Image.AFFINE, (1, 0, -.25 * K, 0, 1, -.35 * K)), pl, clip(hatch, redm))
    patch = comp(drop(pm, 60, .8, .8), emb)
    # bill
    bill_pts = bez((18, 76), (40, 69), (100, 69), (122, 76)) + bez((122, 76), (124, 84), (112, 90), (70, 92)) + bez((70, 92), (28, 90), (16, 84), (18, 76))
    bm = mask_of(lambda d: d.polygon([P(*p) for p in bill_pts], fill=255))
    bd = np.clip(48 - 26 * ((yy - 72) / 20) - 8 * np.abs((xx - 70) / 50), 12, 60)
    bill = clip(Image.fromarray(np.dstack([bd, bd, bd * 1.05, np.full_like(bd, 255)]).clip(0, 255).astype(np.uint8), "RGBA"), bm)
    st = layer(); std = ImageDraw.Draw(st)
    for k, o in enumerate((2.2, 4.0, 5.8)):
        pts = [(x, y) for x, y in (bez((21, 78 + o * .4), (28, 89 - o * .1 - 3), (112, 89 - o * .1 - 3), (119, 78 + o * .4), 50))]
        for i in range(0, len(pts) - 1, 2): std.line([P(*pts[i]), P(*pts[i + 1])], fill=(70, 70, 76, 200), width=max(1, int(.3 * K)))
    under = layer(); ImageDraw.Draw(under).line([P(*p) for p in bez((19, 76), (40, 69.5), (100, 69.5), (121, 76))], fill=(0, 0, 0, 200), width=int(1.4 * K))
    bill = comp(bill, clip(st, bm), clip(blur(under, .6), bm))
    btn = button(70, 14.6, 7)
    return comp(drop(mm, 80), mesh, drop(fm, 90, 1.4, 1.2), foam, patch, drop(bm, 140, 1.4, 1.6), bill, blur(btn, .1))

def fblur(a, sig):
    # separable gaussian on a float array (PIL cannot blur float images)
    rad = max(1, int(sig * 3)); x = np.arange(-rad, rad + 1); k = np.exp(-x * x / (2 * sig * sig)); k /= k.sum()
    a = np.apply_along_axis(lambda v: np.convolve(v, k, "same"), 1, a)
    return np.apply_along_axis(lambda v: np.convolve(v, k, "same"), 0, a)

def button(cx, cy, r):
    # silver rivet rendered from a height map: domed bezel, recessed field, raised cross fleury with rounded
    # edges; normals -> diffuse + sharp specular + studio reflection bands + ambient occlusion
    yy, xx = np.mgrid[0:H, 0:W] / K
    ex, ey = (xx - cx) / r, (yy - cy) / (r * .9)
    rr = np.sqrt(ex * ex + ey * ey)
    inside = rr <= 1.0
    h = .55 * np.sqrt(np.clip(1 - rr ** 2, 0, 1))                       # dome
    h += .22 * np.exp(-((rr - .88) / .07) ** 2)                          # bezel lip
    orn = Image.new("L", (W, H), 0); cross_fleury(ImageDraw.Draw(orn), cx, cy, r * .8, 255)
    ob = np.array(orn, dtype=float) / 255.0; om = fblur(ob, .22 * K)
    h += .32 * om
    hs = fblur(h, .1 * K)
    gy, gx = np.gradient(hs * r * K * .55)
    n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-.45, -.6, .66]); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1.0]); Hh = (L + V) / np.linalg.norm(L + V)
    diff = np.clip((n * L).sum(2), 0, 1)
    spec = np.clip((n * Hh).sum(2), 0, 1) ** 60
    refl_y = n[..., 1] * 2.2 + n[..., 0] * .6                           # studio strip reflections on the normal
    env = .55 + .3 * np.cos(refl_y * 3.1) + .25 * np.exp(-((refl_y + .55) / .18) ** 2)
    ao = 1 - .35 * (fblur(ob, .45 * K) - om).clip(0, 1) * 2
    edge = np.clip((1 - rr) * 9, 0, 1)
    g = (70 + 95 * diff + 95 * env + 230 * spec) * ao * (.6 + .4 * edge)
    tint = np.dstack([g * .98, g, g * 1.04])
    a = np.where(inside, 255, 0).astype(np.uint8)
    metal = Image.fromarray(np.dstack([tint.clip(0, 255), a]).astype(np.uint8), "RGBA")
    mm = metal.getchannel("A").filter(ImageFilter.GaussianBlur(.12 * K))
    metal.putalpha(mm)
    shadow = blur(clip(Image.new("RGBA", (W, H), (0, 0, 0, 180)), mm), .7).transform((W, H), Image.AFFINE, (1, 0, -.2 * K, 0, 1, -1.1 * K))
    return comp(shadow, metal)

def reshape(im, sx, sy, ax=70, ay=92, dy=0):
    return im.transform((W, H), Image.AFFINE, (1 / sx, 0, ax * K * (1 - 1 / sx), 0, 1 / sy, ay * K * (1 - 1 / sy) - dy * K / sy), resample=Image.BICUBIC)
for name, fn in (("cap", cap), ("beanie", blue), ("stars", stars)):
    im = fn()
    im.save(OUT + "/chrome-" + name + ".png")
    im.save(OUT + "/chrome-" + name + ".webp", "WEBP", quality=84, method=6, alpha_quality=90)
