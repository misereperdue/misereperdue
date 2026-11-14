# WebKit / iPhone Safari guide

Every iPhone browser is WebKit, and most of this site's users are on iPhone (often as a home-screen PWA). Test anything touch-, scroll-, keyboard-, clipboard- or audio-related in WebKit, not only Chromium.

## Running WebKit in cloud sessions

The "Misère Perdue" cloud environment installs Playwright's WebKit (26.6, build 2359) into `/opt/pw-browsers` beside Chromium via its setup script (`cdn.playwright.dev` is allowlisted). Nothing extra is needed:

```js
const pw = require('playwright');            // or process.env.MP_PLAYWRIGHT
const browser = await pw.webkit.launch();
const ctx = await browser.newContext({ ...pw.devices['iPhone 15 Pro'], serviceWorkers: 'block' });
```

If `require('playwright')` doesn't resolve from the repo, run with `MP_PLAYWRIGHT=/opt/node-tools/node_modules/playwright`. Manual install (same as the setup script):
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node /opt/node-tools/node_modules/playwright/cli.js install webkit && node /opt/node-tools/node_modules/playwright/cli.js install-deps webkit`

Existing WebKit suites: `tools/test-scroll-lock.cjs`, `test-back-x-menus`, `test-dividers`, `test-misery-fm`, `test-music-logo`, `test-notif-bar-restore`, `test-plus-*`, `test-product-under-header`, `test-profile-*` (`grep -l webkit tools/*.cjs`).

## What this does and doesn't prove

It is Linux WebKitGTK-style rendering with an iPhone UA, viewport, DPR and touch. It is the same engine (JS, CSS, DOM, editing, events), so engine bugs reproduce. It does **not** have: the iOS on-screen keyboard (so `visualViewport` never shrinks), rubber-band/momentum scrolling, the native Paste callout, Home-screen standalone mode, Low Power Mode, or iOS audio session rules. Say "WebKit with iPhone emulation", never "verified on iPhone".

## Verified facts (WebKit 26.6, this environment, 2026-11-14)

Clipboard / editing:
- `navigator.clipboard` exists only in a **secure context**. `page.setContent()` / `about:blank` has none; serve over `http://localhost` or route `https://misereperdue.com` as the existing tests do.
- `navigator.clipboard.readText()` without a user gesture → `NotAllowedError`. **With** a real tap it is also `NotAllowedError` here (no native Paste callout exists headless), so tests always exercise the denial path, which is the real-iPhone "Paste wasn't allowed" result.
- `navigator.permissions.query({ name: 'clipboard-read' })` **throws `TypeError`**: WebKit doesn't know that permission name. Always wrap it in try/catch; never gate a feature on its result.
- `contenteditable="plaintext-only"` is supported.
- A real paste works: copy (`execCommand('copy')` from a selected textarea), focus the editor, then press **`Control+V`** (`Meta+V` does nothing on Linux WebKit). Event order: `paste` (clipboardData has text) → `beforeinput` `insertFromPaste` (dataTransfer has text, `data` is null) → `input` `insertFromPaste`. Use this instead of synthetic events when testing paste handling.

Touch / scroll:
- WebKit desktop has no `Touch` constructor; synthesize touch events as `tools/test-scroll-lock.cjs` does (`Event` + `defineProperty('touches')`), or use `page.touchscreen.tap`.
- `scroll` events fire on the next rendering update, which in software rendering under load (WebGL globe, artwork decode) can land well over 150 ms after the scroll. Poll for the expected state; don't assert after a fixed short wait. `test-scroll-lock.cjs`'s "stray scroll not pinned" check (fixed 150 ms) failed 2 of 3 runs on `globe`/`music` for this reason; with an extra 50 ms wait all panels passed in one run.

CSS: `100dvh`, `:has()`, `-webkit-backdrop-filter` all supported. The 2 unprefixed-only `backdrop-filter` rules in `site.css` are intentional (Chromium-only `@supports` gate, and `none`); every other one is paired with the prefix, which iOS < 18 requires.

## iOS Safari rules this codebase depends on (not reproducible headless — reason about them)

- **Do gesture-gated work first, synchronously.** Clipboard reads, `audio.play()`, `AudioContext` creation/`resume()`, fullscreen and `window.open` must start synchronously inside the tap handler (see `chat.js` ~5038 where the AudioContext starts inside the tap). A `fetch` before them loses the gesture.
- **`AudioContext`**: still use `window.AudioContext || window.webkitAudioContext` (done in `chat.js`). Contexts start `suspended`; iOS also suspends them when the app is backgrounded or the ringer/audio session changes, so `resume()` on `visibilitychange`/next tap.
- **Keyboard**: the layout viewport doesn't shrink; `visualViewport.height`/`offsetTop` do, and `position: fixed` stays attached to the layout viewport. That's why bars use `visualViewport` resize/scroll listeners (`chat.js` ~2209, ~4107; `profile-cards.js`). iOS scrolls the page to reveal a focused field even when locked; the scroll lock allows that while `typing()`.
- **Inputs under 16px font-size zoom the page on focus.** The viewport sets `maximum-scale=1, user-scalable=no`, which suppresses it (iOS still allows pinch zoom for accessibility). Keep form fields ≥16px anyway.
- **Scroll chaining / overscroll**: `overscroll-behavior` works on iOS 16+, but locking body scroll still needs a non-passive capture `touchmove` `preventDefault` (as `mpScrollLock` does). Touch listeners on `document`/`window` are passive by default, so pass `{ passive: false }` explicitly.
- **Safe areas**: `viewport-fit=cover` is set; use `env(safe-area-inset-*)` for anything at the screen edges (home indicator, notch, Dynamic Island).
- **Standalone PWA**: detect with `matchMedia('(display-mode: standalone)')` or `navigator.standalone` (both used). Web Push and Badging work only in Home-screen mode on iOS 16.4+, after a user gesture permission request.
- **Service worker / storage**: iOS can evict script-written storage after 7 days without use in Safari (not in Home-screen apps); don't rely on localStorage/Cache surviving.
- **Media**: inline video needs `playsinline` (plus `muted` for autoplay). Hidden or `display:none` media/canvas can be throttled; rAF pauses in background tabs.
- **Hover**: `:hover` sticks after a tap; gate hover styles with `@media (hover: hover)`.

References: webkit.org/blog/10855/async-clipboard-api/ · webkit.org/status · developer.apple.com/documentation/safari-release-notes
