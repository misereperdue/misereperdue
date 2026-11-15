"""Inside (purl side) texture for the Enraged Beanie 3D view.

Reads img/enraged-beanie-tex.jpg (the outside, unwrapped) and finds where the ribbed
squares are versus the textured squares, so the inside checker sits in exactly the same
places: rib squares become purl ridges, textured squares become knit columns. The eyes
show through faintly as floats. Uses the same UV layout, so no code alignment is needed.
Run: python3 tools/beanie/make-inner-texture.py
"""
import numpy as np
from PIL import Image
ROOT = __file__.rsplit('/tools/', 1)[0]
src = np.asarray(Image.open(ROOT + '/img/enraged-beanie-tex.jpg').convert('L'), dtype=float)
H, W = src.shape

def blur(a, r):
    k = 2 * r + 1
    c = np.cumsum(np.cumsum(np.pad(a, ((r + 1, r), (r + 1, r)), mode='wrap' if False else 'edge'), 0), 1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

# ribs = vertical stripes = much more horizontal gradient than vertical gradient
gx = np.abs(np.diff(src, axis=1, append=src[:, -1:]))
gy = np.abs(np.diff(src, axis=0, append=src[-1:, :]))
ratio = blur(gx, 14) / (blur(gy, 14) + 1e-3)
rib = (np.clip((ratio - 0.8) / 1.2, 0, 1) > 0.45).astype(float)
# snap to clean rectangles: the checker rows share boundaries (measured on the outside
# texture as fractions of its height), and each row's columns come from where ribs start/stop
ROWS = [0, .127, .287, .465, .653, .831, 1.0]
ey0, ey1, ex0, ex1 = int(H * .27), int(H * .645), int(W * .345), int(W * .675)
snap = np.zeros_like(rib)
snap[:int(H * ROWS[1])] = 1                       # crown is ribbed on the outside
for a, b in zip(ROWS[1:-1], ROWS[2:]):
    y0, y1 = int(H * a), int(H * b)
    m = y1 - y0
    prof = rib[y0 + m // 6:y1 - m // 6].mean(0) > 0.5
    runs, s0 = [], 0
    for x in range(1, W + 1):
        if x == W or prof[x] != prof[x - 1]:
            runs.append([s0, x, prof[s0]]); s0 = x
    # absorb slivers into their neighbours
    changed = True
    while changed:
        changed = False
        for i, r in enumerate(runs):
            if r[1] - r[0] < 24 and len(runs) > 1:
                j = i - 1 if i > 0 else i + 1
                runs[j][0], runs[j][1] = min(runs[j][0], r[0]), max(runs[j][1], r[1])
                runs.pop(i); changed = True; break
        merged = []
        for r in runs:
            if merged and merged[-1][2] == r[2]: merged[-1][1] = r[1]
            else: merged.append(r)
        runs = merged
    for x0, x1, v in runs: snap[y0:y1, x0:x1] = float(v)
rib = snap
rib[ey0:ey1, ex0:ex1] = 0                         # eye panel: plain knit outside
rib = blur(rib, 2)                                # soft 5px seam between squares

yy, xx = np.mgrid[0:H, 0:W].astype(float)
rng = np.random.default_rng(7)
# purl ridges (inside of rib squares): rows of little bumps
ridge = 0.5 + 0.5 * np.cos(2 * np.pi * (yy + 1.6 * np.sin(2 * np.pi * xx / 9)) / 8)
# knit columns (inside of textured squares): vertical columns of V's
col = 0.5 + 0.5 * np.cos(2 * np.pi * (xx + 2.2 * np.abs(((yy / 9) % 1) - .5) * 2) / 10)
pat = rib * ridge + (1 - rib) * col
tone = 118 + rib * -6 + (1 - rib) * 4             # the two square tones, close like the photos
img = tone + (pat - 0.5) * 34 + rng.normal(0, 5, (H, W))
# eyes: floats seen from inside, faint and soft
ink = np.clip((110 - blur(src, 3)) / 70, 0, 1)
ink[:ey0] = 0; ink[ey1:] = 0; ink[:, :ex0] = 0; ink[:, ex1:] = 0
img -= blur(ink, 4) * 26
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGB').save(ROOT + '/img/enraged-beanie-inner.jpg', quality=82, optimize=True)
print('wrote img/enraged-beanie-inner.jpg', W, H)
