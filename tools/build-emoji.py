#!/usr/bin/env python3
"""Build the self-hosted emoji image set used by js/emoji.js.

    python3 tools/build-emoji.py <path-to-emoji-datasource-SET> <SET> <OUT_NAME>

e.g. (Apple, current):
    npm i --prefix /tmp/emo emoji-datasource-apple@16.0.0
    python3 tools/build-emoji.py /tmp/emo/node_modules/emoji-datasource-apple apple apple-16

Switching sets later (no code changes): build another set the same way, e.g.
    npm i --prefix /tmp/emo emoji-datasource-twitter@16.0.0
    python3 tools/build-emoji.py /tmp/emo/node_modules/emoji-datasource-twitter twitter twemoji-16
then change EMOJI_SET at the top of src/js/emoji.js (or set
<html data-emoji-set="twemoji-16">) and bump its pin.

Output: emoji/<OUT_NAME>/<key>.webp, 64x64 WebP (q90, alpha).
<key> = the emoji's code points in lowercase hex without leading zeros,
joined by "-", with every U+FE0F removed (js/emoji.js builds the same key),
so fully-qualified and unqualified spellings share one file.
Only emoji the set really has art for (has_img_<SET>) are written;
anything missing falls back to the device's own emoji at runtime.
"""
import json, os, sys
from PIL import Image

src, setname, outname = sys.argv[1], sys.argv[2], sys.argv[3]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'emoji', outname)
os.makedirs(out, exist_ok=True)
data = json.load(open(os.path.join(src, 'emoji.json'), encoding='utf8'))
imgdir = os.path.join(src, 'img', setname, '64')

def key(unified):
    return '-'.join(format(int(c, 16), 'x') for c in unified.split('-') if c.upper() != 'FE0F')

entries = []
for e in data:
    entries.append(e)
    entries.extend((e.get('skin_variations') or {}).values())
n = 0
seen = set()
for e in entries:
    if not e.get('has_img_' + setname):
        continue
    k = key(e['unified'])
    if k in seen:
        continue
    seen.add(k)
    dst = os.path.join(out, k + '.webp')
    if not os.path.exists(dst):
        Image.open(os.path.join(imgdir, e['image'])).convert('RGBA').save(dst, 'WEBP', quality=90, alpha_quality=100, method=6)
    n += 1
print(f'{n} images in emoji/{outname}/')
