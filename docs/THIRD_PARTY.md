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
