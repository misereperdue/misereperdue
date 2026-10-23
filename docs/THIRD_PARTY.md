# Third-party assets

## Emoji images: `emoji/apple-16/` (used by `js/emoji.js`)

- **Source:** npm `emoji-datasource-apple@16.0.0` (iamcal/emoji-data, Emoji 16.0),
  `img/apple/64/*.png`, converted to 64×64 WebP (q90) by `tools/build-emoji.py`.
  3,783 images, about 7.3 MB.
- **Licence:** the emoji-data package (code and metadata) is MIT
  (© 2013 Cal Henderson). The **images are Apple's artwork, © Apple Inc.**
  The package's README says: "Apple images, Copyright © Apple Inc., are not
  licensed for commercial usage." No licence is granted to us.
- **Decision:** dc (owner) was told Apple holds the copyright and does not
  license the art, and chose to use it site-wide anyway (2026-10-23).
- **Exit plan:** the set is swappable with one value. Open-licensed
  alternatives built the same way:
  - Twemoji: `emoji-datasource-twitter`, graphics CC BY 4.0 (needs attribution,
    e.g. a line in the footer or about page).
  - Noto: `emoji-datasource-google`, Apache 2.0.

  ```
  npm i --prefix /tmp/emo emoji-datasource-twitter@16.0.0
  python3 tools/build-emoji.py /tmp/emo/node_modules/emoji-datasource-twitter twitter twemoji-16
  ```
  Then set `EMOJI_SET = "twemoji-16"` in `src/js/emoji.js`, build, and bump
  the `emoji.js?v=` pins (index.html, sw.js SHELL, static pages) and SW_VERSION.
  With a non-Apple set, Apple devices get the images too (the native skip only
  applies to sets whose name starts with "apple").
