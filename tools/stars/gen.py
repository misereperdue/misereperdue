#!/usr/bin/env python3
"""Render Stars product images (hero + per-pack) for light and dark themes.

Usage: gen.py OUTDIR [pack sizes...]
Writes stars-{light,dark}.jpg and stars-<n>-{light,dark}.jpg via rsvg-convert.
"""
import os, subprocess, sys

S = 1254  # matches existing stars-light.jpg
STAR = "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"  # MPStar

THEMES = {
    "light": dict(
        bg="#d8d9dd", bg_hi="#e6e7ea", shadow="#0a1230", shadow_op=0.22,
        face0="#ffffff", face1="#eceef2", side0="#f4f5f7", side1="#c9ccd3",
        rim="#ffffff", rim_dark="#b9bdc6", inlay0="#cfe8f8", inlay1="#7fa9c9",
        inlay_edge="#5f87a6", spec="#ffffff", ink="#0a0f29", ink_op=0.86,
    ),
    "dark": dict(
        bg="#0c1230", bg_hi="#18234f", shadow="#000000", shadow_op=0.55,
        face0="#26335f", face1="#121b3e", side0="#1c2850", side1="#080d24",
        rim="#a9d7f5", rim_dark="#050a1e", inlay0="#c3ddef", inlay1="#93c0e0",
        inlay_edge="#6fa3c8", spec="#ffffff", ink="#f5f5f7", ink_op=0.92,
    ),
}


def defs(t):
    return f"""
<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="70%">
    <stop offset="0" stop-color="{t['bg_hi']}"/><stop offset="1" stop-color="{t['bg']}"/>
  </radialGradient>
  <radialGradient id="face" cx="38%" cy="30%" r="80%">
    <stop offset="0" stop-color="{t['face0']}"/><stop offset="1" stop-color="{t['face1']}"/>
  </radialGradient>
  <linearGradient id="side" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="{t['side1']}"/><stop offset="0.35" stop-color="{t['side0']}"/>
    <stop offset="0.7" stop-color="{t['side0']}"/><stop offset="1" stop-color="{t['side1']}"/>
  </linearGradient>
  <linearGradient id="inlay" x1="0" x2="0.4" y1="0" y2="1">
    <stop offset="0" stop-color="{t['inlay0']}"/><stop offset="1" stop-color="{t['inlay1']}"/>
  </linearGradient>
  <linearGradient id="rimg" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="{t['rim_dark']}" stop-opacity="0.9"/>
    <stop offset="1" stop-color="{t['rim']}" stop-opacity="0.9"/>
  </linearGradient>
  <filter id="soft" filterUnits="userSpaceOnUse" x="-{S}" y="-{S}" width="{3*S}" height="{3*S}"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="soft2" filterUnits="userSpaceOnUse" x="-{S}" y="-{S}" width="{3*S}" height="{3*S}"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="glow" filterUnits="userSpaceOnUse" x="-{S}" y="-{S}" width="{3*S}" height="{3*S}"><feGaussianBlur stdDeviation="12"/></filter>
</defs>"""


def star_inlay(t, cx, cy, size, sy=1.0, dark=False):
    """Debossed star: dark edge offset, inlay fill, top highlight. size = star width px."""
    k = size / 19.4
    tr = lambda dx, dy: f'transform="translate({cx+dx:.1f},{cy+dy:.1f}) scale({k:.4f},{k*sy:.4f}) translate(-12,-11.6)"'
    p = lambda fill, extra="", dx=0, dy=0: (
        f'<path d="{STAR}" fill="{fill}" stroke="{fill}" stroke-width="2.4" stroke-linejoin="round" {extra} {tr(dx,dy)}/>')
    out = []
    if dark:
        out.append(p(t["inlay1"], 'opacity="0.06" filter="url(#glow)"'))
    out.append(p(t["inlay_edge"], dy=-size * 0.018))  # upper inner wall (shadowed)
    out.append(p("url(#inlay)", dy=size * 0.006))
    out.append(p(t["spec"], 'opacity="0.35" filter="url(#soft2)"', dx=-size * 0.06, dy=-size * 0.07 * sy))
    return "\n".join(out)


def coin_flat(t, cx, cy, r, dark):
    """Face-on coin for the hero image."""
    return f"""
<ellipse cx="{cx}" cy="{cy + r*1.02}" rx="{r*0.85}" ry="{r*0.11}" fill="{t['shadow']}" opacity="{t['shadow_op']}" filter="url(#soft)"/>
<circle cx="{cx}" cy="{cy + r*0.045}" r="{r}" fill="url(#side)"/>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#face)"/>
<circle cx="{cx}" cy="{cy}" r="{r*0.86}" fill="none" stroke="url(#rimg)" stroke-width="{r*0.018}"/>
<circle cx="{cx}" cy="{cy + r*0.006}" r="{r*0.86 - r*0.02}" fill="none" stroke="{t['rim']}" stroke-opacity="{0.6 if not dark else 0.18}" stroke-width="{r*0.01}"/>
{star_inlay(t, cx, cy + r*0.02, r*1.05, dark=dark)}
"""


def coin_tilted(t, cx, cy, r, th, dark, sy=0.42):
    """One coin seen at an angle. cy = centre of top face; th = thickness."""
    ry = r * sy
    side = (f'<path d="M{cx-r},{cy} A{r},{ry} 0 0 0 {cx+r},{cy} L{cx+r},{cy+th} '
            f'A{r},{ry} 0 0 1 {cx-r},{cy+th} Z" fill="url(#side)"/>')
    groove = (f'<path d="M{cx-r},{cy+th*0.5} A{r},{ry} 0 0 0 {cx+r},{cy+th*0.5}" fill="none" '
              f'stroke="{t["rim_dark"]}" stroke-opacity="0.35" stroke-width="{max(1.5, th*0.06)}"/>')
    return f"""
{side}{groove}
<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{ry}" fill="url(#face)"/>
<ellipse cx="{cx}" cy="{cy}" rx="{r*0.86}" ry="{ry*0.86}" fill="none" stroke="url(#rimg)" stroke-width="{r*0.016}"/>
{star_inlay(t, cx, cy + ry*0.03, r*1.05, sy=sy, dark=dark)}
"""


def svg_wrap(t, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">'
            f'{defs(t)}<rect width="{S}" height="{S}" fill="url(#bg)"/>{body}</svg>')


def hero(name):
    t = THEMES[name]
    return svg_wrap(t, coin_flat(t, S / 2, S * 0.47, S * 0.30, name == "dark"))


# Coins per pack and how they split into stacks. Must match coinsFor()/STACKS in src/js/stars3d.js.
def coins_for(n):
    return 1 if n <= 100 else 3 if n <= 500 else 6 if n <= 1000 else 21 if n <= 5000 else 32


STACKS = {1: [1], 3: [3], 6: [6], 10: [6, 4], 15: [6, 5, 4], 21: [7, 6, 5, 3], 32: [7, 7, 6, 5, 4, 3]}
# Stack centres in coin radii (x, depth); >= 2.1 apart so neighbouring stacks never touch. Back row first.
SPOTS = {1: [(0, 0)], 2: [(-1.05, -0.35), (1.05, 0.35)], 3: [(-1.1, -0.6), (1.1, -0.6), (0, 1.3)],
         4: [(-1.05, -1.05), (1.05, -1.05), (-1.05, 1.05), (1.05, 1.05)],
         6: [(-2.1, -1.05), (0, -1.05), (2.1, -1.05), (-2.1, 1.05), (0, 1.05), (2.1, 1.05)]}


def pack(name, size):
    t = THEMES[name]
    dark = name == "dark"
    sy = 0.42
    counts = STACKS[coins_for(size)]
    spots = SPOTS[len(counts)]
    r = S * {1: 0.27, 2: 0.19, 3: 0.165, 4: 0.15, 6: 0.112}[len(counts)]
    th = r * 0.15
    ry = r * sy
    stacks = [(spots[i][0] * r, spots[i][1] * r * sy, counts[i]) for i in range(len(counts))]
    # vertical extent of the group, to centre it above the label
    tops = [dy - ry - th * (n - 1) for _, dy, n in stacks]
    bottoms = [dy + ry + th for _, dy, n in stacks]
    span_top, span_bot = min(tops), max(bottoms)
    off = S * 0.44 - (span_top + span_bot) / 2
    body = []
    for x, dy, n in stacks:
        body.append(f'<ellipse cx="{S/2 + x}" cy="{off + dy + th + ry*0.35}" rx="{r*1.05}" ry="{ry*0.8}" '
                    f'fill="{t["shadow"]}" opacity="{t["shadow_op"]}" filter="url(#soft)"/>')
    idx = 0
    for x, dy, n in sorted(stacks, key=lambda s: s[1]):  # back to front
        for k in range(n):
            jitter = ((idx * 37) % 7 - 3) * r * 0.008
            body.append(coin_tilted(t, S / 2 + x + jitter, off + dy - k * th, r, th, dark, sy))
            idx += 1
    body.append(f'<text x="{S/2}" y="{S*0.87}" text-anchor="middle" font-family="DejaVu Sans Mono, Menlo, monospace" '
                f'font-weight="700" font-size="{S*0.085:.0f}" letter-spacing="-3" fill="{t["ink"]}" '
                f'fill-opacity="{t["ink_op"]}">{size:,}</text>')
    return svg_wrap(t, "\n".join(body))


def render(svg, out_jpg):
    png = out_jpg[:-4] + ".png"
    subprocess.run(["rsvg-convert", "-o", png], input=svg.encode(), check=True)
    subprocess.run(["convert", png, "-strip", "-quality", "86", "-sampling-factor", "4:2:0", out_jpg], check=True)
    os.remove(png)


def main():
    out = sys.argv[1]
    sizes = sorted(int(x) for x in sys.argv[2:])
    os.makedirs(out, exist_ok=True)
    for name in THEMES:
        render(hero(name), f"{out}/stars-{name}.jpg")
        for size in sizes:
            render(pack(name, size), f"{out}/stars-{size}-{name}.jpg")


if __name__ == "__main__":
    main()
