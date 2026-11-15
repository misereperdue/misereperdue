# Faster reveal on fresh opens (speed pass, follows #214)

The app keeps the page hidden (`html.mp-loading`, body opacity 0) until it is positioned, then fades it in
over 0.5s. What people see as "load time" is therefore the moment `mp-loading` is removed (the reveal), not
DOMContentLoaded or the browser's FCP (Chrome only reports FCP once the fade has finished, ~0.57s later).

## What held the reveal back

1. **A fixed 500ms wait** after DOMContentLoaded on Globe, signed-out Chat and every non-Store route. It exists
   for Safari's async scroll restoration, which only happens on reload / back-forward. The Store already
   skipped it on fresh opens; nothing else did.
2. **`rain.js` startup** (cloud + moon textures, incl. a 41-tap blur) is the single most expensive script on
   the page (~150ms at 4x CPU), and as a deferred script it ran *before* DOMContentLoaded.

## Change (no visual change)

- `js/app.js`: fresh opens (navigation type `navigate`) reveal 60ms after DOMContentLoaded on every route
  except the Store, which still waits for its products (max 500ms). Reload / back-forward keep the 500ms.
- `src/js/rain.js`: textures are built when the page reveals (`mp-loading` removed, 3s fallback). The fade
  hides the first frames; every hook (resize, theme, visibility, reduced motion, `MPRain.flash`) waits for it.

## Evidence (lab, not field data)

Local gzip server (like Cloudflare), Chromium 390x844 DPR2, 4x CPU, 9 Mbps / 60ms RTT, cache off, service
worker blocked, API/Shopify mocked, median of 5 runs:

| Route | Reveal before | Reveal after | DOMContentLoaded before → after |
|---|---|---|---|
| Store | 1.26s | 0.93s | 0.84s → 0.75s |
| Globe | 1.45s | 1.01s | 0.87s → 0.72s |
| Chat (signed out) | 1.50s | 1.05s | 0.91s → 0.79s |

Checks: rain renders on every route/theme (same colour variety), settled screenshots match (max channel
difference 3-4/255 from the footer eyes animation phase), reload still reveals ~510ms after DOMContentLoaded,
`tools/test-app-performance.cjs` passes. Not measured: signed-in chat with long histories, real iPhones.
