#!/usr/bin/env python3
"""Composite a supersampled Stars still onto the product backdrop and write a crisp JPEG.
Render at SS× (passed in as a larger model PNG), Lanczos-downscale the model, then
draw the pack label at the final size. Quality 92, 4:4:4 — no chroma-subsampled edges.
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def radial(size, c0, c1):
    # ImageMagick radial-gradient: centre c0 -> farthest corner c1
    c0, c1 = np.array(hex_rgb(c0), dtype=np.float32), np.array(hex_rgb(c1), dtype=np.float32)
    ys, xs = np.ogrid[:size, :size]
    cx = cy = (size - 1) / 2.0
    d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    t = (d / d.max())[..., None]
    arr = (c0 * (1 - t) + c1 * t).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--size", type=int, required=True)
    p.add_argument("--model", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--c0", required=True)
    p.add_argument("--c1", required=True)
    p.add_argument("--ink", required=True)
    p.add_argument("--pack", type=int, default=0)
    p.add_argument("--mh", type=int, required=True)
    # Variant mode (cart / Shopify variant photos): no pack label, stack centred on its own bounds.
    p.add_argument("--center", action="store_true")
    p.add_argument("--fill", type=float, default=0.64)
    args = p.parse_args()
    S, MH = args.size, args.mh

    bg = radial(S, args.c0, args.c1)
    model = Image.open(args.model).convert("RGBA")
    # Lanczos downscale of the supersampled render (exact CSS aspect S×MH)
    if model.size != (S, MH) and not args.center:
        model = model.resize((S, MH), Image.Resampling.LANCZOS)
    bg = bg.convert("RGBA")
    if args.center:
        # Centre the visible stack (alpha bounds) in the square, both axes.
        # Crop at full supersampled resolution, then scale so the stack's longest side is FILL of S.
        box = model.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox() or (0, 0) + model.size
        model = model.crop(box)
        k = args.fill * S / max(model.size)
        model = model.resize((max(1, round(model.width * k)), max(1, round(model.height * k))), Image.Resampling.LANCZOS)
        bg.alpha_composite(model, ((S - model.width) // 2, (S - model.height) // 2))
    else:
        y = round(S * 0.02) if args.pack else round((S - MH) / 2)
        bg.alpha_composite(model, (0, y))
    out = bg.convert("RGB")

    if args.pack and not args.center:
        # Match ImageMagick -gravity south -annotate +0+(0.07S) with pointsize 0.075S.
        # On the 1254 stills the ink sat ~98px above the bottom (≈0.078S).
        text = format(args.pack, ",")
        font = ImageFont.truetype(FONT, size=round(S * 0.075))
        draw = ImageDraw.Draw(out)
        # Anchor at bottom-centre, raised 0.07S (IM south +Y moves inward).
        draw.text((S / 2, S - round(S * 0.07)), text, font=font, fill=args.ink, anchor="md")

    # 4:4:4 (subsampling=0) keeps thin chip-edge chroma; quality 92 vs the old 86.
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    out.save(args.out, "JPEG", quality=92, subsampling=0, optimize=True)
    print("wrote", args.out, out.size[0], "x", out.size[1], os.path.getsize(args.out), "B")


if __name__ == "__main__":
    main()
