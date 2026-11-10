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

## Hugeicons Free (all site-authored UI icons)

- Icon shapes: [Hugeicons Free](https://github.com/hugeicons/hugeicons) (`@hugeicons/core-free-icons` 4.4.0), Stroke Rounded, © Hugeicons, MIT License. The full MIT notice is below.
- Only the icons actually used are self-hosted, as inline SVG markup in `js/ph-icons.js` (`PHIcon` API kept), `index.html`, `src/js/{chat,forum3,shop,dashboard-v2,misery-fm,profile-cards,forum-mount-patch}.js`. There is no runtime dependency and no CDN.
- Look: 24px grid, `stroke-width` 1.8 (2.2 for icons rendered at 12px or below; the active nav tab 2.1; set by dc t543u, raised from Hugeicons' default 1.5), round caps and joins, `currentColor`. The active main-nav tab inks its stroke with the orb gradient (`#orb-ink-l`/`#orb-ink-dark-l`).
- Subset (#74, Grim): Add01, ArrowDataTransferHorizontal, ArrowDown01, ArrowDown02, ArrowLeft01, ArrowRight01, ArrowRight02, ArrowUp01, ArrowUp02, At, Backward02, BubbleChat, Cancel01, ChartHistogram, Clock01, DragDropVertical, Ear, Film02, Forward02, Globe02, Hashtag, Heading01, Image01, ImageAdd02, LeftToRightListBullet, LeftToRightListNumber, Link01, LiveStreaming02, Logout01, Menu01, Message01, MessageLock01, MessageMultiple01, Mic01, MinusSign, MoreHorizontal, MusicNote03, MusicNoteSquare01, Next, Notification01, Package, Pause, PencilEdit01, Play, Playlist03, Previous, QuoteDown, RadioTower, Refresh, Repeat, Search01, Settings01, Share01, Shuffle, SourceCode, SquareLock02, SquareUnlock02, TextAlignCenter, TextAlignLeft, TextAlignRight, TextBold, TextItalic, TextStrikethrough, TextUnderline, ThreeDRotate, Tick02, TradeUp, Unavailable, User, ViewOffSlash, VolumeHigh, VolumeMute02, plus #75's nav/PHIcon set (ShoppingBag01, ShoppingCart01 (the navbar copy drops its two inner lines so the count fits, dc t543u), BubbleChat, Globe02, PencilEdit01, ArrowLeft01/Right01, Cancel01, Add01, Search01, Notification01, Star, Favourite, Share01, Tick01, MoreHorizontal) and forum-mount-patch's runtime swaps (View, UserGroup, Message01, UserAdd01, Settings01).
- Not converted, on purpose (see #74 / dc t542u): every reaction icon (chat tapback/reaction pills and the reaction-menu delete ×, Globe ★ stars, Misery FM reactions); brand marks (X, social logos, Apple Music, payment badges); the verified / payment-accepted seals and VIP ⭐ / 07 / <3 badge marks; the branded eyes, favicon/app icons, the Misery FM logo and its station emblem (`fm-emb`); data visuals (poll progress ring, FM ring); user-authored and picker emoji; typographic glyphs inside sentences ("Saved ✓", "×2").

```
MIT License

Copyright (c) 2025 Hugeicons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## heroicons-animated (icon motions only)

- Heroicons shapes are no longer referenced (fully replaced by Hugeicons in #74). The `data-hi` motion names are still used:
- Motions (scale, rotate, shake, wiggle, fade, float, rubber-band, ...): [heroicons-animated](https://github.com/heroicons-animated/heroicons-animated) (https://www.heroicons-animated.com), © 2026 Aniket Pawar, MIT License. Ported to plain inline SVG + CSS keyframes (`src/css/site.css`, `js/app.js`, `js/ph-icons.js`).
