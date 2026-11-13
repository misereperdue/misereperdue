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
        rim="#a9d7f5", rim_dark="#050a1e", inlay0="#e3f3fd", inlay1="#a9d7f5",
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
  <filter id="glow" filterUnits="userSpaceOnUse" x="-{S}" y="-{S}" width="{3*S}" height="{3*S}"><feGaussianBlur stdDeviation="18"/></filter>
</defs>"""


def star_inlay(t, cx, cy, size, sy=1.0, dark=False):
    """Debossed star: dark edge offset, inlay fill, top highlight. size = star width px."""
    k = size / 19.4
    tr = lambda dx, dy: f'transform="translate({cx+dx:.1f},{cy+dy:.1f}) scale({k:.4f},{k*sy:.4f}) translate(-12,-11.6)"'
    p = lambda fill, extra="", dx=0, dy=0: (
        f'<path d="{STAR}" fill="{fill}" stroke="{fill}" stroke-width="2.4" stroke-linejoin="round" {extra} {tr(dx,dy)}/>')
    out = []
    if dark:
        out.append(p(t["inlay1"], 'opacity="0.55" filter="url(#glow)"'))
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


def stack_counts(n_packs):
    # coins per pack tier, smallest pack = 1 coin
    base = [1, 3, 6, 10, 14, 18]
    return base[:n_packs] if n_packs <= len(base) else [2 * i + 1 for i in range(n_packs)]


def pack(name, size, coins):
    t = THEMES[name]
    dark = name == "dark"
    sy = 0.42
    two = coins > 6
    r = S * (0.23 if two else 0.27)
    th = r * 0.15
    ry = r * sy
    if two:
        back = coins // 2 + coins % 2
        front = coins - back
        stacks = [(S / 2 - r * 0.62, back, 0.0), (S / 2 + r * 0.62, front, r * 0.30)]
    else:
        stacks = [(S / 2, coins, 0.0)]
    tallest = max(n for _, n, _ in stacks)
    # vertically centre the whole group (top face of tallest .. bottom of base) above the label
    group_h = ry * 2 + th * tallest + (r * 0.30 if two else 0)
    top = S * 0.44 - group_h / 2
    base_y = top + ry + th * (tallest - 1)
    body = []
    for x, n, dy in stacks:
        body.append(f'<ellipse cx="{x}" cy="{base_y + dy + th + ry*0.35}" rx="{r*1.05}" ry="{ry*0.8}" '
                    f'fill="{t["shadow"]}" opacity="{t["shadow_op"]}" filter="url(#soft)"/>')
    for x, n, dy in stacks:
        for k in range(n):
            jitter = ((k * 37 + int(x)) % 7 - 3) * r * 0.010
            body.append(coin_tilted(t, x + jitter, base_y + dy - k * th, r, th, dark, sy))
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
        for size, coins in zip(sizes, stack_counts(len(sizes))):
            render(pack(name, size, coins), f"{out}/stars-{size}-{name}.jpg")


if __name__ == "__main__":
    main()
