#!/usr/bin/env python3
"""Build the self-hosted emoji image set used by js/emoji.js.

Current set (per dc, 2026-10-23): Twemoji, SVG, from the maintained
jdecked/twemoji fork (graphics CC BY 4.0, attribution required):

    curl -sL https://codeload.github.com/jdecked/twemoji/tar.gz/refs/tags/v17.0.3 | tar xz -C /tmp
    python3 tools/build-emoji.py --twemoji /tmp/twemoji-17.0.3/assets/svg twemoji-17

Twemoji names its files with the code points in lowercase hex, but keeps
U+FE0F inside ZWJ sequences (1f3f3-fe0f-200d-1f308.svg) and drops it
everywhere else (2764.svg). js/emoji.js drops every U+FE0F from its key, so
the files are written with every "-fe0f" removed (no collisions in 17.0.3;
the script stops if a future release introduces one).

Other sets (emoji-datasource-*, 64x64 PNG -> WebP), e.g. Noto:
    npm i --prefix /tmp/emo emoji-datasource-google@16.0.0
    python3 tools/build-emoji.py /tmp/emo/node_modules/emoji-datasource-google google noto-16

Then change EMOJI_SET (and EXT for the file type) at the top of
src/js/emoji.js, build, bump the emoji.js?v= pins and the SW emoji cache.

Output: emoji/<OUT_NAME>/<key>.<svg|webp>.
<key> = the emoji's code points in lowercase hex without leading zeros,
joined by "-", with every U+FE0F removed (js/emoji.js builds the same key),
so fully-qualified and unqualified spellings share one file.
Anything missing falls back to the device's own emoji at runtime.
"""
import json, os, shutil, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def key(unified):
    return '-'.join(format(int(c, 16), 'x') for c in unified.split('-') if c.upper() != 'FE0F')

if sys.argv[1] == '--twemoji':
    src, outname = sys.argv[2], sys.argv[3]
    out = os.path.join(root, 'emoji', outname)
    os.makedirs(out, exist_ok=True)
    seen = {}
    for f in sorted(os.listdir(src)):
        if not f.endswith('.svg'):
            continue
        k = key(f[:-4])
        if k in seen:
            sys.exit(f'collision: {f} and {seen[k]} both map to {k}')
        seen[k] = f
        shutil.copyfile(os.path.join(src, f), os.path.join(out, k + '.svg'))
    print(f'{len(seen)} images in emoji/{outname}/')
    sys.exit(0)

from PIL import Image
src, setname, outname = sys.argv[1], sys.argv[2], sys.argv[3]
out = os.path.join(root, 'emoji', outname)
os.makedirs(out, exist_ok=True)
data = json.load(open(os.path.join(src, 'emoji.json'), encoding='utf8'))
imgdir = os.path.join(src, 'img', setname, '64')

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
