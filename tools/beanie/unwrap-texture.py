#!/usr/bin/env python3
"""Rebuild the Enraged Beanie 3D texture + profile from front/back product photos.

python3 tools/beanie/unwrap-texture.py FRONT.jpg BACK.jpg [out_dir]
-> out_dir/enraged-beanie-tex.jpg (2048x1024, u = angle around the head, front at u=0.5)
   out_dir/profile.json (lathe points bottom->top, cuff radius = 1) for PROFILE in src/js/beanie3d.js

How: trace the silhouette per row (pixels that differ from the corner background), treat each row as a circle,
sample the front photo for the front ~120deg and the back photo (mirrored) for the back, fill the edge-on sides
with clean knit from the back photo's centre, blend with smoothsteps, then flatten the baked left/right shading
so three.js lighting shapes the model. Use the light-background photos (easier to segment).
"""
import sys, os, json
import numpy as np
from PIL import Image

front, back = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else '.'
F = np.asarray(Image.open(front).convert('RGB')).astype(np.float32)
B = np.asarray(Image.open(back).convert('RGB')).astype(np.float32)

def rows(im):
    bg = np.median(np.concatenate([im[:20].reshape(-1, 3), im[-20:].reshape(-1, 3)]), axis=0)
    m = np.abs(im - bg).sum(2) > 45
    r = {}
    for y in range(im.shape[0]):
        xs = np.where(m[y])[0]
        if len(xs) > 20: r[y] = (xs.min(), xs.max())
    return r

RF, RB = rows(F), rows(B)
y0, y1 = max(min(RF), min(RB)), min(max(RF), max(RB))
H, W = 1024, 2048

def bil(im, x, y):
    x0 = np.clip(np.floor(x).astype(int), 0, im.shape[1] - 2); yy = np.clip(np.floor(y).astype(int), 0, im.shape[0] - 2)
    fx = (x - x0)[..., None]; fy = (y - yy)[..., None]
    return (im[yy, x0] * (1 - fx) + im[yy, x0 + 1] * fx) * (1 - fy) + (im[yy + 1, x0] * (1 - fx) + im[yy + 1, x0 + 1] * fx) * fy

def rowinfo(R, y):
    yy = int(round(y)); yy = min(max(yy, min(R)), max(R))
    while yy not in R: yy += 1
    l, r = R[yy]; return (l + r) / 2, (r - l) / 2

def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

th = (np.arange(W) + .5) / W * 2 * np.pi - np.pi
A = np.abs(th)
wf = 1 - ss(np.radians(52), np.radians(70), A)
wb = ss(np.radians(110), np.radians(128), A)
ws = np.clip(1 - wf - wb, 0, 1)
phi = np.where(th >= 0, th - np.pi / 2, th + np.pi / 2)
tex = np.zeros((H, W, 3), np.float32)
for j in range(H):
    y = y0 + (y1 - y0) * j / (H - 1)
    cf, rf = rowinfo(RF, y); cb, rb = rowinfo(RB, y); rf *= .985; rb *= .985
    yv = np.full(W, y)
    tex[j] = bil(F, cf + rf * np.sin(th), yv) * wf[:, None] + bil(B, cb - rb * np.sin(th), yv) * wb[:, None] + bil(B, cb - rb * np.sin(phi * .9), yv) * ws[:, None]
g = np.median(tex.mean(2), axis=0)
g = np.convolve(np.concatenate([g[-60:], g, g[:60]]), np.ones(61) / 61, 'same')[60:-60]
g = g / np.median(g[np.abs(th) < 0.6])
tex = np.clip(tex * np.clip(1 / np.clip(g, .55, 1.6), .7, 1.6)[None, :, None], 0, 255)
Image.fromarray(tex.astype(np.uint8)).save(os.path.join(out, 'enraged-beanie-tex.jpg'), quality=86, optimize=True, progressive=True)

rr = {y: (rowinfo(RF, y)[1] + rowinfo(RB, y)[1]) / 2 for y in range(y0, y1 + 1)}
scale = max(rr.values())
pts = [[round(float(rr[y] / scale), 4), round(float((y1 - y) / scale), 4)] for y in list(range(y1, y0 - 1, -6)) + [y0]]
pts[-1][0] = 0.0
json.dump({'pts': pts}, open(os.path.join(out, 'profile.json'), 'w'))
print('wrote texture and', len(pts), 'profile points')
