#!/usr/bin/env python3
"""Build img/misery-stitch.woff2: every glyph drawn as a running stitch.

Source: Relief SingleLine (SIL OFL 1.1, tools/stitch-font/), a single-stroke
(centreline) font. Each stroke is cut into short dashes with small gaps (dash
count fitted per stroke so every stroke starts and ends on a stitch), each dash
is stroked with round caps, and the dashes are filled outlines, so the result
is an ordinary web font: real selectable text that wraps natively.

Needs: fonttools, shapely, brotli  (python -m venv v && v/bin/pip install fonttools shapely brotli)
Usage: python3 tools/build-stitch-font.py [--dash 130 --gap 120 --width 90]
"""
import argparse, math, os, re, html
from fontTools.svgLib.path import parse_path
from fontTools.pens.basePen import BasePen
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import LineString, Point
from shapely.ops import unary_union
from shapely.geometry.polygon import orient

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--dash', type=float, default=130)
ap.add_argument('--gap', type=float, default=120)
ap.add_argument('--width', type=float, default=90)
ap.add_argument('--out', default=os.path.join(ROOT, 'img/misery-stitch.woff2'))
a = ap.parse_args()

src = open(os.path.join(ROOT, 'tools/stitch-font/ReliefSingleLineSVG-Regular.svg'), encoding='utf-8').read()
UPM, ASC, DESC = 1000, 800, -200

class Flat(BasePen):
    def __init__(self):
        super().__init__(None); self.paths = []; self.cur = None
    def _moveTo(self, p):
        self.cur = [p]; self.paths.append(self.cur)
    def _lineTo(self, p): self.cur.append(p)
    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]; n = 16
        for i in range(1, n + 1):
            t = i / n; u = 1 - t
            self.cur.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                             u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]; n = 12
        for i in range(1, n + 1):
            t = i / n; u = 1 - t
            self.cur.append((u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]))
    def _closePath(self):
        if self.cur and self.cur[0] != self.cur[-1]: self.cur.append(self.cur[0])
    def _endPath(self): pass

def dashes(pts):
    ls = LineString(pts)
    L = ls.length
    if L < 1e-6: return [Point(pts[0])]
    D, G = a.dash, a.gap
    if L <= D * 1.25: return [ls]
    n = max(1, round((L + G) / (D + G)))
    s = L / (n * D + (n - 1) * G)          # scale dash+gap to fit exactly
    d, g = D * s, G * s
    out = []
    for i in range(n):
        t0 = i * (d + g); t1 = t0 + d
        seg = substring(ls, t0, min(t1, L))
        out.append(seg)
    return out

from shapely.ops import substring

glyphs = {}
for m in re.finditer(r'<glyph\b([^>]*)/>', src, re.S):
    at = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
    if 'unicode' not in at: continue
    u = html.unescape(at['unicode'])
    if len(u) != 1: continue
    cp = ord(u)
    if not (0x20 <= cp <= 0x24F or 0x2010 <= cp <= 0x203A or cp in (0x20AC, 0x2122, 0x2190, 0x2192)): continue
    glyphs[cp] = (at.get('glyph-name', 'uni%04X' % cp), int(float(at.get('horiz-adv-x', 280))), at.get('d', ''))

order = ['.notdef']; cmap = {}; adv = {'.notdef': 500}; outlines = {}
empty = TTGlyphPen(None); outlines['.notdef'] = empty.glyph()
for cp, (name, w, d) in sorted(glyphs.items()):
    name = re.sub(r'[^A-Za-z0-9_.]', '_', name) or 'uni%04X' % cp
    if name in adv: name = 'uni%04X' % cp
    pen = Flat()
    if d.strip(): parse_path(d, pen)
    pieces = []
    for p in pen.paths:
        if len(p) < 2: continue
        xs = [q[0] for q in p]; ys = [q[1] for q in p]
        span = max(max(xs) - min(xs), max(ys) - min(ys))
        if span < 10: continue                 # zero-length marker strokes in the source
        if span <= 120:                        # i/j dots, periods, colons: one round knot
            pieces.append(Point((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2).buffer(a.width * 0.68, quad_segs=6))
            continue
        for seg in dashes(p):
            pieces.append(seg.buffer(a.width / 2, quad_segs=5, cap_style='round', join_style='round'))
    tp = TTGlyphPen(None)
    if pieces:
        geom = unary_union(pieces)
        polys = getattr(geom, 'geoms', [geom])
        for poly in polys:
            poly = orient(poly.simplify(1.5), sign=-1.0)
            for ring, is_hole in [(poly.exterior, False)] + [(r, True) for r in poly.interiors]:
                c = [(round(x), round(y)) for x, y in list(ring.coords)[:-1]]
                if len(c) < 3: continue
                tp.moveTo(c[0]); [tp.lineTo(q) for q in c[1:]]; tp.closePath()
    outlines[name] = tp.glyph()
    order.append(name); cmap[cp] = name; adv[name] = w + 30   # a little extra tracking for the thicker stitch

fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap)
fb.setupGlyf(outlines)
fb.setupHorizontalMetrics({n: (adv[n], outlines[n].xMin if hasattr(outlines[n], 'xMin') and outlines[n].numberOfContours else 0) for n in order})
fb.setupHorizontalHeader(ascent=ASC + 60, descent=DESC - 60)
fam = 'Misery Stitch'
fb.setupNameTable({'familyName': fam, 'styleName': 'Regular',
    'copyright': 'Copyright 2022 The Relief SingleLine Project Authors (https://github.com/isdat-type/Relief-SingleLine). Stitched derivative for misereperdue.com.',
    'licenseDescription': 'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
    'licenseInfoURL': 'https://openfontlicense.org'})
fb.setupOS2(sTypoAscender=ASC + 60, sTypoDescender=DESC - 60, sTypoLineGap=0, usWinAscent=ASC + 100, usWinDescent=-DESC + 100, sxHeight=545, sCapHeight=680, achVendID='MISR')
fb.setupPost()
fb.font.flavor = 'woff2'
fb.save(a.out)
print('wrote', a.out, os.path.getsize(a.out), 'bytes,', len(cmap), 'chars')
