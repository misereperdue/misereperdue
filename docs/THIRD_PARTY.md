# Third-party assets

## Emoji images: `emoji/twemoji-17/` (used by `js/emoji.js`)

- **Source:** Twemoji, the maintained fork at <https://github.com/jdecked/twemoji>,
  release **v17.0.3**, `assets/svg/*.svg`, copied by `tools/build-emoji.py --twemoji`
  with every `-fe0f` removed from the file names (the key `js/emoji.js` builds).
  4,009 SVGs, about 9.7 MB in the repo (each file ~2.4 KB, ~1 KB over the wire
  compressed); only the emoji actually on screen are fetched.
- **Licence:** graphics © Twitter, Inc and other contributors, licensed under
  **CC BY 4.0** (<https://creativecommons.org/licenses/by/4.0/>). Code is MIT
  (we don't ship it; `js/emoji.js` is our own).
- **Attribution:** the site footer (`.mp-end-credit` in `index.html`) reads
  "Emoji: Twemoji, CC BY 4.0" with links to the project and the licence. It is
  shown wherever the Twemoji images are drawn (non-Apple devices). The images
  are used unmodified.
- **Where used:** non-Apple devices only. iPhone, iPad and Mac keep their native
  Apple emoji (`js/emoji.js` does nothing there).

## History

- 2026-10-23: the first version drew Apple's emoji art (`emoji-datasource-apple`
  16.0.0, `emoji/apple-16/`). Apple's images are not licensed for commercial use,
  so dc switched to Twemoji the same day; the Apple files were removed from the
  repo and the SW emoji cache was renamed (`mp-emoji-v1` → `mp-emoji-v2`) so
  clients drop any cached Apple images.

## Switching sets

`tools/build-emoji.py` also builds `emoji-datasource-*` sets (64×64 WebP), e.g.
Noto (Apache 2.0):

```
npm i --prefix /tmp/emo emoji-datasource-google@16.0.0
python3 tools/build-emoji.py /tmp/emo/node_modules/emoji-datasource-google google noto-16
```

Then set `EMOJI_SET` (and the file extension) in `src/js/emoji.js`, build, bump the
`emoji.js?v=` pins (index.html, sw.js SHELL, static pages and their generators),
the `EMOJI_CACHE` name and SW_VERSION, delete the old set folder, and update the
attribution.

# Misery Stitch (product description font)

`img/misery-stitch.woff2` is a derivative of **Relief SingleLine**
(https://github.com/isdat-type/Relief-SingleLine), Copyright 2022 The Relief
SingleLine Project Authors, licensed under the **SIL Open Font License 1.1**
(full text in `tools/stitch-font/OFL.txt`; the source SVG font is
`tools/stitch-font/ReliefSingleLineSVG-Regular.svg`). It is renamed "Misery
Stitch" and stays under the OFL.

`tools/build-stitch-font.py` cuts every single-line stroke into round-capped
running-stitch dashes (default dash 170, gap 150, stitch width 95 units/1000 em, tuned for 14px;
dots become a single round knot) and writes the web font:

```
python3 -m venv /tmp/fv && /tmp/fv/bin/pip install fonttools shapely brotli
/tmp/fv/bin/python tools/build-stitch-font.py
```

After rebuilding, bump `misery-stitch.woff2?v=` in `src/css/site.css`, build the CSS
and bump its pins.

## Heroicons + heroicons-animated (UI icons)

- Icon shapes: [Heroicons](https://github.com/tailwindlabs/heroicons) v2 (24px solid and outline), © Tailwind Labs, Inc., MIT License.
- Motions (scale, rotate, shake, wiggle, fade, float, rubber-band, ...): [heroicons-animated](https://github.com/heroicons-animated/heroicons-animated) (https://www.heroicons-animated.com), © 2026 Aniket Pawar, MIT License. Ported to plain inline SVG + CSS keyframes (`src/css/site.css`, `js/app.js`, `js/ph-icons.js`).
