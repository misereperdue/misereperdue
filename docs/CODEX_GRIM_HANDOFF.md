# Codex ↔ Grim handoff

## Collaboration

dc wants Codex and Grok Bot (Grim) to work together on this site. Read
`docs/SITE_GUIDE.md`, recent commits, open PRs and this handoff before editing.
Use separate feature branches; fetch current main and check overlapping changes
before shipping. Keep the mobile design and dc's existing visual choices.
This file is shared context, not a direct message to the other assistant.

## Standing merge and deployment permission — 2026-11-09

dc explicitly authorized: “You may merge and deploy changes once checks pass
automatically.” For changes dc requests, use a feature branch/PR, complete the
relevant checks and preview verification, then merge and verify production
without asking dc to approve the merge again. Respect any later request to
pause, review first, or keep work local. This permission covers release of
requested work; it does not expand the requested scope. Tool-level approval
controls still apply.

## 2026-11-09 — Misery FM live top bar, t514u (Grim)

- **Pill and dot removed:** the separate chat now-playing pill (`.fm-bar`) is gone (`chatBar()` only
  cleans up old nodes), and so are the red corner dot and the "IS LIVE" dot.
- **Morph stays inside the bar:** `openMorph()` locks the bar's width and height inline, adds `.is-np`,
  crossfades the bar's own children out and `.fm-hb-np` in (transform+opacity; reduced motion = opacity only).
  The now-playing layer has back, cover+title/artist+E (opens the full sheet), Listen, and a 2px progress line.
  The bar's box (left/top/width/height/radius) is asserted unchanged in tests.
- **Dotted outline:** `ring()` sizes the overlay to the bar's border box (negative border insets) and
  draws an SVG rect half a stroke inside the edge with the bar's computed radius. The dash pitch is
  perimeter/round(perimeter/6), so the dots divide the outline evenly. The dots drift via WAAPI, and are
  static under reduced motion.
- **Opening it:** tap the bar while it shows MISERY FM IS LIVE, or tap any non-interactive part of it
  (e.g. the Chat/Globe title).

## 2026-11-09 — Misery FM compact layout (Grim)

dc: "Keep it more compact instead of the new card look." The FM sheet is now a + menu style panel
(`.fm-sheet.fm-c`) using the Music picker's exact metrics.
- **Panel:** width min(360px, 100vw−24px), padding 16/13/13, radius 20, gap 11. The header has a 17px
  "Misery FM" title, a 10px live/listener subtitle and a 30px round close button.
- **Rows and labels:** 9px red uppercase section labels; rows use the + menu divider gradient.
- **Placement:** above the composer on Chat (`place()` anchors to `.chat-plus`'s row), bottom-centred on other
  pages, and never taller than the space below the top bar (`--fm-mh`). It grows out of the + button
  (scale+opacity; reduced motion = opacity).
- **Now tab:** a now-playing row (50px cover with a live/paused dot, title/artist/E, edit, 36px Listen), an 18px
  visualizer strip, a 3px progress/scrub line, the DJ note, a 32px icon transport (shuffle, prev, restart,
  pause 40px, skip, repeat, Stop pill), reactions, then Up Next and Recently played (40px art rows).
- **Owner tabs:** a small segmented control. Queue is a pill "Add songs" with dense 46px rows; Station has
  compact fields and a 3×2 stats grid. Every feature and test hook (`data-a`, class names) is unchanged.

## 2026-11-09 17:00 ET — dc: Grim keeps shipping live (override of PR #51 rule 8)

dc decided at 4:55 PM ET on Nov 9: Grim keeps shipping his requests live (merge plus Pages/Worker deploy
once checks pass) without asking first, even after PR #51's AGENTS.md lands. This overrides rule 8
("no production deployments/merges without explicit approval") for Grim only. Everything else in AGENTS.md
still applies: task branches off fresh main, rebase and re-test before merging, and never clobber
the other agent's pin bumps.

## 2026-11-09 — Misery FM: iOS "adding tracks doesn't work" (Grim)

- **Root cause:** the `<input type=file>` was inside the re-rendered sheet body. On iOS the page goes
  hidden while the Files picker is open. On return the state refresh/broadcast re-rendered the sheet,
  replacing the input, so `change` fired on a detached node and never reached the sheet's delegated
  listener. The picked song was silently dropped: no upload row, no error.
  `setInputFiles` in Playwright is instant, which is why the old test missed it.
- **Fix:** pickers are persistent `#fm-pick-audio` / `#fm-pick-img` inputs on `<body>` with their own
  listeners. `accept="audio/*,.mp3,.m4a,.aac,.mp4"`.
  - **Types:** the extension is trusted over `file.type`, since iOS gives `""` or `audio/mpeg3`. The type is
    normalised to audio/mpeg|mp4|aac for the Worker.
  - **Duration:** comes from tags, else `<audio>` metadata (6 s timeout), else a decode (20 s timeout), else
    the server's 180 s default.
  - **Upload first:** raw bytes go up first, and the waveform decode happens afterwards (skipped for files
    over 12 MB on iOS, for memory).
  - **Errors:** the XHR has a 5 min timeout, and every failure shows a toast (wrong type, lost owner session,
    network, timeout).
- **Test:** `tools/test-misery-fm.cjs` opens the real file chooser, forces hidden→visible plus a
  state broadcast, then delivers files: a real MP3 with an empty type and a stalled `<audio>`, an M4A as
  audio/x-m4a, an MP3 as audio/mpeg3, a WAV (refused) and a non-owner token (refused).
  Fixtures: `tools/fixtures/fm-real.*`.

## 2026-11-09 — Misery FM v2: studio, listener sheet, live top bar (Grim, Worker 2348f56d)

dc ([pt501u]): make the FM menu far richer for him and for listeners. The Worker deploy was approved,
and all 15 bindings were kept. See `worker/misery-chat/src/README.md` for the server routes.

- **Client** is now its own file: `src/js/misery-fm.js` → `js/misery-fm.js` (pinned in
  index.html after chat.js, and in the SW SHELL). It exposes `window.MPFM = {open,isLive,setMe,state}`.
  chat.js only opens it from the + menu row and passes `hello` to `MPFM.setMe`; the old
  `fm*` code in chat.js is gone.
- **Every page (Shop, Globe, Chat, product, cart) when live:** the visible top bar (`.chat-head` in
  the active panel, else `.nav`) gets `.fm-on`, an animated dotted SVG ring (`.fm-ring`) and
  a 4 s crossfade to "[emblem] MISERY FM • IS LIVE". Tapping it FLIP-morphs the bar into a
  now-playing card (`.fm-morph`: cover, title/artist with E badge, progress, Listen, Studio/Open, X).
  The status comes from `/api/fm/ws`, not chat. Static shop.html/globe.html are untouched.
- **Sheet** (`.fm-sheet`, --sheet-* glass plus a `--fm-veil` tint): hero cover (tag art or generated),
  visualizer (analyser on desktop; the 10 Hz loudness map on iOS), progress, reactions, Up Next,
  Recently played, DJ note. Owner tabs: Now (transport, seek, shuffle/repeat, Go Live/Stop),
  Queue (uploads with ID3/M4A tag reading, progress, drag reorder, play now/next, edit),
  Station (note, scheduled go-live, crossfade 0–6 s, stats).
- **Edit sheet** per song: title, artist, album, cover replace/remove, explicit, year, genre, notes.
- **iOS caveats:** the audio is not routed through Web Audio (that would stop lock-screen play), so
  there is no live analyser; `volume` is read-only, so the slider is hidden and crossfade
  can't fade (it hard-switches at the same point). ID3 v2.2 is not parsed. Durations come from the client.
- **Overrides:** generic `.nav svg`/`.nav button` rules beat the FM ring, so `.fm-on .fm-hb svg.fm-ring`
  uses `!important`, and the dot is a `span[role=button]`. The `.fm-sheet` is `overflow:clip` plus scroll
  reset, so focusing inputs can't shift the edit layer.
- **Tests:** `tools/test-misery-fm.cjs` evals the real Worker fm code with mocked R2/DO in the
  browser. It runs owner dark+light, listener dark+light and reduced motion, and covers every
  control, sync after pause/seek, and every page type live/off. Screenshots go to `/tmp/mp-misery-fm/`.

## 2026-11-09 — Misery FM: owner-run live radio (Grim, PR #50, Worker version 4e07045e)

dc approved the Worker deploy and R2. **No mic or recording**: dc uploads audio files
and everyone in chat hears the same track at the same moment.

- **Worker** (`misery-chat`, version `4e07045e-40a8-402b-a40d-9160e542baa5`). New binding
  `FM_BUCKET` → R2 bucket `misery-fm`. All 14 earlier bindings were kept (`keep_bindings`).
  The code excerpts and a Node test are in `worker/misery-chat/src/` (see its README).
  The full Worker source is still **not** in this public repo.
  - The ChatRoom DO key `fm` stores `{live, idx, startedAt, list:[{id,title,artist,dur,type,size,at}], v}`.
  - Every change broadcasts `{t:"fm", fm}` on the chat WebSocket. The DO alarm fires at
    track end + 250 ms, advances, and re-broadcasts. The playlist loops.
  - `GET /api/fm/state` is public: `{ok, fm:{live, idx, startedAt, v, now, list}}`.
  - `POST /api/fm/upload?title=&artist=&dur=` is owner only. The raw file is the body,
    and its Content-Type must be mp3/m4a/aac. Max 25 MB, max 200 songs.
    Metadata goes in the query string, so CORS needs no custom headers.
  - `POST /api/fm/control {action, id?, dir?}` is owner only. Actions: `live`, `stop`,
    `skip`, `play`, `move` and `remove`. `remove` deletes the R2 object too.
  - `GET|HEAD /api/fm/audio/<id>` is public, in the top-level fetch. It supports Range
    (206) and is served immutable with ACAO `*`.
- **Client** (`src/js/chat.js`, the `fm*` functions before `mpMusicForm`):
  - Each client works out the current track and offset locally from `startedAt`.
    The server clock comes from `fm.now`.
  - One shared `<audio>` element. It seeks on `loadedmetadata`, resyncs every 5 s
    when drift is over 1.5 s, and refetches state on `visibilitychange`.
  - Media Session metadata is set, including play/pause handlers.
  - The live bar `.chat-fm-bar` sits fixed under `.chat-head`. It has a LIVE pill,
    the title and artist, and Listen/Mute. iOS needs that tap before audio starts.
    The chat fade line uses the bar's bottom while it shows.
  - **+ menu → Misery FM row:** the LIVE pill shows while on air.
    - Owner panel: Go Live / Stop, Skip and Add songs (multiple files), plus playlist rows
      with play/stop-this, up, down and remove.
    - Listener panel: now playing, plus Listen live / Mute, or "Off air".
  - On upload, the title and artist come from the filename (`Artist - Title.mp3`), and the
    duration comes from the browser's `loadedmetadata` (if it can't be read, it is 0 and the
    server uses 180 s). ID3 tags are not read.
- **Tests:**
  - `tools/test-misery-fm.cjs`: WebKit iPhone 14, owner dark/light and listener dark. A silent
    240 s WAV is served for audio. It covers the seek to about 30 s, Skip, move and upload
    (query and type), and WS off-air hiding the bar.
  - `node worker/misery-chat/src/test-fm.mjs`: owner gating, 415, upload, live, auto-advance,
    alarm, skip, move, remove, stop and Range.
  - `tools/test-music-picker.cjs` now expects "Off air" instead of "Coming soon".
- **Pins:** chat 426, site.css 821, SW 427.
- **Caveats:**
  - Sync is approximate: about the network latency, and within 1.5 s after a resync.
  - iOS may pause audio when the page is in the background for a long time. Coming back
    resyncs.
  - Durations are trusted from the owner's browser.
  - The 25 MB limit counts per file.
  - Unused R2 objects are removed only through the panel's remove button.

## 2026-11-09 — Deezer-led music search via the Worker (Grim, PR #49, Worker version 8369411d)

- **Worker `GET /api/music/search?q=`** on `misery-chat`, handled in the
  top-level fetch, not the DO. dc approved this.
  1. Calls Deezer's public search (`api.deezer.com/search`, no key, 25 hits).
  2. Maps each hit to an Apple track using iTunes CA+US search results for
     the query, matched on normalized title + primary artist. Duration within
     3s scores higher; more than 10s apart is rejected. Explicitness counts too.
  3. For top hits still unmatched: one iTunes search on "artist title".
  4. For the top 5 still unmatched: Apple Music's public web search page
     (song ids only), then `itunes lookup?id=`. This is how Future's "SOME
     MORE" (1407069165) is found. iTunes has no ISRC lookup.
  - Response is `{ok, src:"deezer", tracks}` in Deezer's order. Unmatched
    Deezer hits are dropped, because a card needs an Apple id/link.
  - Cached 10 min in `caches.default` per lowercased query.
  - Uncached searches are limited to 40/min per IP (in memory, per isolate).
    Over the limit, it asks the DO `POST /__internal/owner-exempt`
    (`X-Internal: music`; public `/__internal/*` stays 404) and never limits
    dc's devices/networks.
- Deployed by API upload with `keep_bindings`. All 14 bindings were kept (DO
  CHAT_ROOM, AI, SHOPIFY_CLIENT_ID, 11 secrets), compatibility date
  2024-01-01, observability on. The Worker source is **not** in this public
  repo; download it from Cloudflare (`workers/scripts/misery-chat/content/v2`)
  before editing.
- **Client (`mpMusicSearch`):** the Worker call runs in parallel with the
  iTunes CA+US searches, with a 4.5s timeout. If it returns tracks, they lead
  (covers/karaoke after the rest unless asked), then the iTunes ranking fills
  in, deduped. Any Worker failure, 429 or timeout means the iTunes-only path
  runs exactly as before.
- Test: `tools/test-music-rank.cjs` runs two passes. Pass 1 makes the Worker
  fail and checks the 18 iTunes-ranked queries. Pass 2 replays
  `tools/fixtures/music-deezer.json` and checks 6 Deezer-led queries.

## 2026-11-09 — artist+title search, tap-anchored profile popover (Grim, PRs #46–#48)

- **#46 artist + title in either order:** `mpMusicSearch` splits the query into
  an artist part and a title part. The artist part is a leading or trailing run
  of words that exactly matches a returned primary artist (`future`,
  `the weeknd`). Scoring:

  | Case | Points |
  |---|---|
  | Primary artist matches and the title words are in the title | +12 |
  | Primary artist matches, no such pair exists, and the query isn't itself a full title | +10 |

  When the pair is missing, one extra request fetches that artist's top 200
  songs (`lookup?id=<artistId>&entity=song`, cached per artist) and merges
  title matches. Parody and "originally by" results are demoted.

  Known gap: Future's "SOME MORE" (BEASTMODE 2, trackId 1407069165) can be
  looked up by id, but the public iTunes Search API never returns it. dc
  approved a Deezer-backed search through the Worker to fix this (next).
  Four queries were added to `tools/test-music-rank.cjs`; the fixtures now
  keep `artistId`.
- **#47/#48 tap-anchored profile popover:** the mini profile popover now opens
  at the finger (default since #48).
  - The tap point comes from `touchend` changedTouches, `pointerup` or `click`.
    It's ignored if older than 1.5s or more than 16px outside the tapped
    element; then the element's center is used.
  - The stem tip sits at the tap x, just past the element, never more than
    28px from the finger.
  - The card is clamped to `visualViewport` minus all four
    `env(safe-area-inset-*)` and a 10px margin. It flips above/below by fit,
    then by more room.
  - After placement it measures its real rect and corrects for any
    transformed or offset containing block.
  - No ResizeObserver and no global pointerdown tracker. Those were the
    riskiest parts of #29, which broke on dc's iPhone (never reproduced in
    emulation).
  - **Escape hatch:** `?pop=0` stores `localStorage["mp-pop"]="0"` and brings
    back the old centered popover in that browser/PWA. `?pop=2` clears it.
    `<html data-pop="2">` marks the new path.
  - Test: `tools/test-profile-pop2.cjs` (WebKit iPhone 14, real touch): on by
    default, the escape hatch persists, 18 edge/corner taps, scrolled chat
    avatars, dark and light.

## 2026-11-09 — cart fade, music search, iOS catalog outage, ranking (Grim, PRs #39–#44)

- **#39 cart/bag fade:** checkout and bag lists fade under the sky with the
  same eased mask as product pages (#35), dark and light. Checked in WebKit at
  scroll 0/30/80/200.
- **#40 music search (CA + US):** `mpMusicSearch` asks both the `ca` and `us`
  storefronts (limit 50 each) at once and merges them by Apple's best position
  (US +0.5). One storefront failing still shows the other; only both failing
  shows "Couldn't reach the catalog". Results are deduped by title|artist|explicit.
  The "Choose a song to share." helper under the empty state is gone.
- **#41 iOS outage from #40 (SW 418), fixed:** #40 added `media=music`.
  For a Mobile Safari user agent, Apple answers any `media=music` search with
  a **301 to `musics://…`**. CORS refuses that redirect, so every search, and
  the song lookups behind now-playing cards, failed on iPhone. Desktop
  browsers get a 200, so tests and curl looked fine. **Never add a `media`
  param.** `entity=song` alone is enough. `tools/test-music-picker.cjs` and
  `tools/test-music-rank.cjs` mock Apple's 301 for any `media` param.
- **#42/#44 stale chat.js on the edge:** twice, the new `js/chat.js?v=N` link was
  cached at Cloudflare's edge with the *previous* build. Those files are
  `immutable` for a year, so a pin can be stuck with old code. Cause: a local
  iPhone-WebKit test served the branch's files but left the service worker on.
  The SW's precache fetches go around Playwright's routes, so it fetched the
  new pins from the live site before merge. **Run local-file browser tests with
  `serviceWorkers:'block'`.** After a release, check the pinned link has the new
  code (`curl …/js/chat.js?v=N | grep <new string>`). If it doesn't, bump the
  pin again; don't reuse it.
- **#43 ranking:** in `mpMusicSearch` `score()`. Points:

  | Rule | Points |
  |---|---|
  | Query word in the title before any parenthesis | +5 |
  | Query word in the full title (incl. parentheses) | +4 |
  | Query word in the artist | +5 |
  | Query word in the album | +1 |
  | Words hit both title and artist | +3 |
  | Every query word is in the primary artist (text before &/,/x/feat/with) | +8 if the whole name, +4 if partial |
  | The whole title was asked for | +4 (still typing it: +2) |
  | Karaoke/cover/tribute/instrumental/lullaby/kidz bop/rendition… | −8 |
  | Remix/mix/version/live/acoustic/slowed/session/edit… after the title | −4 |
  | The primary artist appears 6+ times in the raw CA+US results (the original) | +3 |

  The two penalties don't apply when the query has that word, so
  "blinding lights remix" shows remixes. Ties fall back to Apple's position.
  Test: `tools/test-music-rank.cjs` replays 14 queries offline from
  `tools/fixtures/music-rank.json`, which holds the recorded CA/US searches and
  album lookups trimmed to the fields ranking needs. `MP_RECORD=1` re-records
  from the real API, and an unrecorded request fails the test. `MP_TABLE=1`
  prints the top 3 per query.

## 2026-11-09 — afternoon fixes: popover revert, product header, pill stretch, recent songs, crossfade (Grim, PRs #31–#38)

- **CI note:** `pull_request` runs of `check.yml` fail before any job starts
  ("workflow file issue"), even after the repo went public again; push runs on
  main pass. Until that's understood, Grim runs the same workflow by
  `gh workflow run check.yml --ref <branch>` on the PR head and merges only after
  it and Cloudflare Pages pass. The repo was briefly private today; no note or
  commit here explains why.
- **#31 revert of #29 (popover tap anchoring):** dc said the profile popover
  stopped working on his iPhone. WebKit iPhone emulation couldn't reproduce it,
  so #29 was reverted to the last known-good popover. A redo (anchored at the
  tap point) is queued but needs validation on a real device first.
  `tools/test-profile-tap-touch.cjs` taps with real touch events in WebKit.
- **#32 product Back not sticky:** Back scrolls with the page and rests 17px
  under the nav.
- **#33 product content under the sky:** the #23 rule lifting `.page` above
  `.hero` now applies to the Shop grid only. On product pages the content goes
  under the sky like Chat/Globe; Back (z 28) stays above the sky at rest and
  fades over 30px as it rises (`shop.js`). Test: `tools/test-product-under-header.cjs`.
- **#35 gradual fade (dark):** the dark sky on product pages gets the same eased
  64px mask as the light sky (nav bottom to sky bottom), so content fades out
  instead of cutting off hard.
- **#34 Globe pull, pill rubber stretch:** `--cat-pull` (0..1) on
  `.forum-pull-body` scales pills from the top (up to 1.2 tall, 0.95 wide),
  per-pill `--k`/`--kd` for a centre-out stagger, labels wrapped in
  `.forum-cat-in` and counter-scaled, overshoot spring back. Reduced motion is static.
- **#36/#38 recent songs:** when the search is empty the picker shows
  `localStorage["mp-music-recent-v1:<user>"]` (newest first, deduped by
  trackId, max 10, recorded on pick) under RECENT, plus the Apple Music footer
  (#38). With none: "No recently played songs" with the waveform. Test:
  `tools/test-music-recent.cjs`.
- **#37 now-listening crossfade:** 450ms opacity/transform with
  cubic-bezier(.4,0,.2,1). The incoming side starts at once and the outgoing
  side 60ms later, with a 2px slide. `will-change` applies only while `.is-xf`
  is set (cleared at 560ms), and the film frame is keyed and composited before
  the fade-in. Hold durations unchanged. Test: `tools/test-np-crossfade.cjs`.
- vip3d: the membership card only *looked* fixed while scrolling because that
  page can scroll ~65px. No vip3d change.

## 2026-11-09 — dc's six fixes (Grim, PRs #25–#30)

1. **Product Back vs nav (#25)**: `#product .shop-product-head` is sticky at
   safe-area + 93px under the nav (z 3). `tools/test-shop-header-spacing.cjs`
   checks scrolls 40/120/400.
2. **Stale favicon/app icon (#26)**: live files matched the repo; staleness is
   client caching. Bumped favicon `?v=17`, apple-touch/manifest `?v=23`, added
   root `apple-touch-icon(-precomposed).png` (were 404), added icon links to
   globe/shop/offline/p/t pages and the product/sitemap templates. iOS home
   screen icons only refresh on remove + re-add. Email avatar: BIMI record has
   no `a=` (no VMC/CMC), so Gmail/Apple Mail won't show it; options are a
   VMC/CMC or a Google Account profile photo for dc@. No DNS changed.
3. **Drag to spin pill (#27)**: one shared `.vip-3d-hint` placement (top/right
   12px, 6px 10px, 11px) for every viewer. vip3d camera fit untouched, no
   image trims. Test: `tools/test-spin-hint.cjs`.
4. **Globe pills pull (#28)**: `.forum-cats` removed from the pull-start
   exclusions in `forum3.js`; the pills move with the list, the top bar stays.
   Test: `tools/test-globe-cats-pull.cjs`.
5. **Profile mini popover (#29)**: anchors to the last tap inside the anchor
   (1.5s window, else anchor centre); flips above/below by room; 12px
   horizontal clamp; stem `--ax` clamped 18px in from the corners with
   adaptive stem corners; ResizeObserver re-places to stop jitter. Navy cover,
   padding and the grow-from-tip animation kept. Test:
   `tools/test-profile-popover.cjs` (7 edge cases).
6. **Owner delete X (#30)**: thin rounded-stroke X (1.6 stroke, 19px), soft red
   glow on hover/focus-visible and on touch press (`is-press` via pointer
   events; sticky hover suppressed under `hover:none`). Owner guard and the
   delete behaviour unchanged. Test: `tools/test-owner-delete-x.cjs`.

All tests use local assets with mocked APIs/WebSockets. No Worker, DNS or
secret changes.

## 2026-11-09 — transparent Apple Music films, looping footer icon, live EQ (Grim)

Branch: `grim/music-logo-loop-transparent`. Finishes dc's request Codex ran out
of usage on (no partial Codex branch existed).

- Translucent box cause: `.chat-np-am{mix-blend-mode:screen}` over a video.
  iOS composites video in its own layer, so the blend is unreliable and the
  film's near-black frame shows as a translucent rectangle (worse mid-fade).
- Fix: both official films (embed wordmark, picker icon) are now drawn into a
  small canvas and luma-keyed to real alpha (black → transparent, colour
  un-premultiplied, 6% edge feather). Works the same on iOS Safari/PWA, Chrome
  and Firefox with the existing H.264 MP4s; no HEVC-alpha encoder exists on
  Linux. Blend mode removed. When the text colour is dark (light theme, no
  album gradient) the key renders a hue-kept dark version, re-keyed on theme
  change. If canvas keying fails, the old video/still remain visible.
- Footer icon: new `official-icon-loop.mp4` (0–0.96s glass-icon part of the
  same film, ping-pong, 112px, seamless) loops while the picker is open and
  visible; pauses when hidden (IntersectionObserver, compact keyboard layout),
  page hidden, or closed. Not restarted by typing. Reduced motion: keyed still
  `official-icon-still.webp`. Embed wordmark lifecycle (play once, hold) unchanged.
- Idle waveform: five bars animate (staggered scaleY EQ); static under reduced motion.
- Tests: `tools/test-music-logo.cjs` (MP_BROWSER=webkit|chromium) checks no
  blend/background/shadow/backdrop on the mark chain, compares screenshots with
  and without the canvas where the logo is transparent (≤4 levels), keyed video
  frames, loop attribute/playing, no restart while typing, pause on close, EQ
  animation and reduced motion. Existing `test-music-picker.cjs` passes.
- Pins: site811, chat410, SW402. No Worker changes.

## 2026-11-09 — shop content beneath navigation

- Earlier shared-header change raised decorative sky to z27 and pushed Shop
  content to y156. That hid product Back at y93 while leaving an 80px gap
  beneath the navigation on the grid.
- Shop now begins 16px beneath the nav; Shop/Product content sits above the
  decorative sky and below navigation. Sky heights/fades remain shared with
  Chat; Chat/Globe scroll occlusion and Bag spacing are unchanged.
- Added catalog-backed browser regression checks for actual promo/actions,
  product Back hit testing, return navigation and scrolling nav layering,
  across both phone sizes and desktop, light/dark. No real catalog/cart writes.
- Pins: site810, SW401. Music JS remains409.

## 2026-11-09 — compact music attribution

- Replaced the large central Powered by/logo stack with a quiet horizontal
  footer: official animated icon at 36px, Powered by and Apple Music beside it,
  separated from the search area by a subtle hairline. Removed ambient glow.
- Footer persists through search/results; idle state has a small waveform.
  Official video lifecycle and reduced motion fallback preserved. Compact
  keyboard layout hides attribution so search/results remain usable.
- Pins: site809, chat409, SW400. Music browser checks cover footer bounds.

## 2026-11-09 — actual header height consistency

- Previous header fix covered width only. Removed route-specific sky crops:
  light Shop/Bag used a 40px solid sky and 90px fade while Chat used 90px
  and a 156px canvas; dark Shop/Bag also faded out much earlier.
- Every main route now uses Chat's existing sky height, canvas and fade, with
  safe-area offsets preserved. The shared sky now sits below the chrome but
  above scrolling content; removed Globe’s extra opaque underlay that hid its
  sky early. Shop/Bag first content sits below the shared 156px fade.
- tools/test-header-height.cjs asserts full hero/canvas/fade/nav geometry and
  masks across actual Chat/Globe/Shop/Bag/product routes, plus Chat/Globe titlebar
  height and position. Covers both phone sizes and desktop in both themes.
- Pins: site808, SW398. No JavaScript or backend behavior changes.

## 2026-11-09 — music picker finesse

- One official branding video per picker: retain playback position across state
  changes, pause behind results, and hold the final frame once complete. Start
  and final posters match the recropped 224px film. Never restart while typing.
  Reduced motion and blocked autoplay retain an official still.
- Refined header hierarchy, search field, empty-state spacing, larger tighter
  branding, subtle ambient glow, and simpler song rows with clearer metadata.
- Existing no-autofocus, exact-ID embeds, drop-to-bar, Cancel/Send and retry flows
  retained. Browser suite includes branding DOM continuity through state changes.
- Pins: site807, chat407, SW397. Asset derivation in SOURCE.md. No backend changes.

## 2026-11-09 — shared headers and picker/layout redesign

Branch: `codex/header-picker-layout`.

- Fixed nav width at 247px on every route, reserving cart space; flex tabs stay
  at least 44px. Chat/Globe title bars share the same 760px/viewport-minus-32 rule.
- Music picker: compact 340px idle layout, expands to 460px for results, pill
  search, artwork-led cards, clearer add controls and aligned header. Retains
  official branding, no autofocus, keyboard sizing and exact-ID sharing.
- Chat Globe canvas now fills the embed background (no standalone icon), keeps
  thumbnails/text above it, and retains lazy renderer readiness and no pins.
- Shared Globe/music drop animates container bounds without scaling text or art;
  includes a visual Send seat to avoid a landing layout shift. Mobile picks wait
  for keyboard dismissal and use an epoch guard so cancellation/navigation wins.
- Reply-target bubble has consistent typography, sizing and inset cancel control.
  Notification tray uses the same menu background, border and blur tokens.
- Validation: site/build verification and mocked music/reply/layout suites across
  both phone sizes/themes. Tests cover landing geometry, background globe bounds,
  fixed header lengths through cart/product routes, notification glass equality,
  and reply cancellation. No real account writes. Hosted checks at release.
- Pins: site806, chat406, SW396. No Worker changes.

## 2026-11-09 — music branding, cart rhythm and embedded globe

- Preserve official artist casing in music composer previews (override the
  username-only lowercase style using the is-music card class).
- Remove Apple Music text beneath search; keep result counts/error status.
  Add Powered by above the official icon film; remove its circular frame.
- Balance cart separation by compensating the flex gaps around the divider.
- Globe chat embeds use an independently rotating compact canvas globe via the
  existing decorative shop renderer; no pins fetched/drawn. Thumbnails retained.
- Pins: site805, chat405, shop108, SW395. Build/site and mocked browser checks;
  no backend changes or real account writes. Notes for Grim.

## 2026-11-09 — music/reaction/pull refinements

- Hide featured-artist suffixes in embed and composer titles only; retain exact
  catalog titles and song IDs for search/sharing. Music no longer autofocuses.
- Owner-only delete button separated from reactions; uses existing owner-guarded
  POST /api/delete, removes the message only after success. No Worker changes.
- Picker center uses the official icon excerpt (asset SOURCE.md), plays once,
  holds its last frame; reduced motion uses its poster. FM menu title removed.
- Pull uses a clean chevron/plus handoff and separated label fades; return animates
  progress with the body instead of snapping. Header underlay fades at both edges.
- Pins: site804, chat404, forum1176, SW394. Checks and mocked browser tests cover
  owner/nonowner, shortened titles, no autofocus, playback and existing flows.

## 2026-11-09 — Globe / music interaction polish

Branch: `codex/globe-music-polish`.

- Pull cue: remove underline, ease the chevron-to-plus interpolation, crossfade
  labels continuously with the finger, and soften return instead of a pop.
- Replies: consistent 8px spacing at every nesting depth. Globe content gets a
  stacking boundary and fixed header underlay to prevent painting over chrome.
- Only the pinned post titled exactly Misery Globe (verified public thread t29)
  gets the shop's moving canvas globe. Exposed an independent decorative mount
  on MPShop that neither fetches nor draws live location pins; other pinned and
  unpinned cards keep their backgrounds. Existing thumbnail remains visible.
- Misery FM is enabled as a menu action, morphing to its logo and the requested
  “Listen to music live with others. Coming soon.” copy. Back/Close retained.
- All picker morphs resize the container rather than stretching the contents.
  Music uses a filled double-note silhouette, round empty-state icon and direct
  search copy. Loading embeds use balanced placeholder bars and softer shimmer.
- Selecting a song now drops it into the existing Globe-style composer preview.
  Cancel/Send live in the bar, typed draft is preserved, and sends reuse their
  CID on retry. Music metadata/URL travel with the shared preview state; Globe
  sending remains separate. Fixed accessibility of the settled preview Send.
- Tests: tools/test-music-picker.cjs updated for drop/cancel/send/retry, FM,
  skeleton, keyboard and existing picker navigation; tools/test-globe-polish.cjs
  covers targeted canvas animation, finger feedback, reply rhythm and header
  stacking. Both run 390×844 and 360×780 in light/dark; reduced motion included
  in music suite. All writes mocked. Existing live-reply regression also run.
- Pins: site 803, chat 403, forum3 1175, shop 107, SW 393. No backend changes.

## 2026-11-09 — Chat Apple Music picker

Branch: `codex/apple-music-picker`.

- New red circular Music action in the Chat + menu, available to signed-in users
  without a VIP restriction. Uses the same menu morph as Globe/Poll. Search,
  artwork/artist/album/duration rows, selected red check, and Send song footer
  share the site's glass, spacing and light/dark styling. Reduced motion honored.
- Uses the existing public Apple/iTunes Search API, CA storefront, with debounce,
  cancellation, deduplication and relevance ordering. If no full title/artist
  match appears, inspect up to two relevant albums via lookup: Apple's search
  sometimes omits an explicit song version despite a valid lookup. Album lookups
  cache in memory. Live API verified using Frank Ocean / Nights.
- Share the selected song's exact Apple Music URL through the existing /api/send
  endpoint. Keep typed chat text and attachments intact; preserve private-chat
  target. Reuse the message CID on retry; failures keep the selection available.
- Recipients resolve the same song ID, not fuzzy title/artist search, into the
  existing music card/official animation. Cache exact metadata locally. Suppress
  duplicate server link previews when successful, restore them on lookup failure.
  Music cards support Enter to open Apple Music. Old +song messages still work.
- Picker anchors to visualViewport when the search keyboard opens; compact
  scrolling layout for short space. Close/back/outside/+ toggle/navigation clean
  up searches and viewport listeners. Menu close now uses its original handler,
  preventing leaked listeners and stale callbacks affecting a reopened menu.
- Checks: build/site/source verification; tools/test-music-picker.cjs at 390×844
  and 360×780 in both themes, including non-VIP/reduced motion. Covers incoming
  and outgoing exact IDs, generic-preview fallback, safe text/deduplication,
  sending/retry/CID/draft preservation, empty/error/retry, search races/closure,
  album versions, keyboard bounds, Back/Globe and toggling/navigation. API and
  WebSocket traffic mocked; no real chat posts. Real Apple catalog data and
  artwork inspected separately. Hosted preview/production verified at release.
- Pins: site 802, chat 402, SW 392. No Worker or CSP changes; no new credentials.

## 2026-11-09 — smaller pull label, VIP media and category sorting

Branch: `codex/vip-category-fixes`.

- Pull-to-post label reduced from 11.5px to 10px; etched uppercase styling,
  spacing, chevron and 44px touch target retained.
- VIP tile uses cover fitting rather than letterboxing the source image inside
  a differently colored background. Existing theme-specific images preserved.
- VIP 3D stage is square (81.5px shorter at 390px viewport), with responsive
  camera framing centered on the card + lanyard. Hint moves to upper right;
  model remains the same size and fully visible. Mask viewer is unchanged.
- Category dragging now uses viewport coordinates and document pointer handlers,
  recomputes translation immediately after reordering, tracks the active pointer,
  restores the original order on cancellation, and skips saves for unchanged order.
  Saves serialize; failures restore the previous order. Grips support arrow keys.
- Cached stats no longer replace a dashboard after the user starts interacting,
  avoiding destruction of a category drag/edit during the initial refresh.
- Regression test: `node tools/test-dashboard-categories.cjs` covers both drag
  directions, pointer alignment, cancellation, failed-save rollback, keyboard,
  real mouse reordering and preserving the editor during refresh in both themes
  at 390×844 / 360×780. APIs mocked: no real category/account writes.
- Validation also includes site/build checks, pull cue and actual WebGL viewer
  phone checks/screenshots; hosted preview/production checked during release.
- Pins: site 801, shop 106, dashboard 62, lazy VIP viewer 8, SW 391.
  No Worker changes.

## 2026-11-09 — etched uppercase pull-to-post cue

Branch: `codex/etched-pull-cue`.

- Matched the chevron optically to the label with rounded 1.4px SVG strokes.
- Uppercase PULL TO POST / RELEASE TO POST, 11.5px semibold lettering with .12em
  tracking and a subtle inset highlight/shadow tuned for both themes.
- Removed the extra 10px top margin and 8px vertical padding. Cue stays a 44px
  touch target, follows the category rail without an extra gap, and leaves 12px
  before the first post. Fixed topbar positioning is preserved.
- Validation: source/build/site checks; phone screenshots at 390×844 and 360×780
  in both themes, layout bounds and simulated touch pull confirming plus morph
  and armed state. No page errors or account writes. Hosted release checks follow.
- Pins: site 800, forum3 1174, SW 390. No backend changes.

## 2026-11-09 — Apple Music playback glitch

Branch: `codex/music-animation-playback`.

- The 1.835s official excerpt was looping during the 2.5s logo slot, visibly
  jumping from its finished wordmark back to the opening refraction. Disable
  looping: play once and hold the final frame until crossfading back to text.
- Preload the small clip, keep text visible while starting playback, and reveal
  video only after a decoded frame. Autoplay rejection/slow startup uses the
  official final still. Epoch guards discard pending playback after leaving view.
- Corrected transition hint cleanup (it previously removed `is-xf` immediately
  after adding it). Still poster now uses the clean final film frame, query v2.
- Validation: build/source verification, site checks; phone browser checks of
  full timed playback in both themes, final-frame hold/no loop, text return,
  and blocked-autoplay still fallback. APIs mocked; hosted release checks follow.
- Pins: site 799, chat 401, SW 389. No backend changes.

## 2026-11-09 — action circles, shallow chevron and faded moon

Branch: `codex/menu-circles-soft-moon`.

- Chat + menu: 36px circular badges around existing action icons. Media uses
  black in light mode/white in dark, Globe navy/ice blue, Poll purple (including
  the locked VIP option). Misery FM and its divider retain their existing design.
- Pull-to-post: shallower curved chevron, rounded 3.2px strokes; quadratic paths
  interpolate into the same plus, retaining the pull threshold and reduced motion.
- Weather: lower moon opacity in both palettes and bake an 8px Gaussian alpha
  blur once into a padded texture. No per-frame filters or canvas-filter support
  dependency; padding preserves the moon's size and prevents hard texture edges.
- Validation: build verification/site checks, phone screenshots and browser
  checks at 390×844 and 360×780 in both themes, without page errors. Mocked APIs;
  hosted preview and production checked during release. No backend changes.
- Pins: site 798, forum3 1173, rain 24, SW 388.

## 2026-11-09 — official Apple animation and overlay repairs

Branch: `codex/official-music-overlays`.

- Replaced the local glass imitation with the actual Apple Music launch film's
  wordmark excerpt. Source and derivation are in `assets/apple-music/SOURCE.md`.
  Local muted MP4 (~36KB), still poster, and screen blending retain the official
  animation without a black rectangle. Existing crossfade and reduced-motion
  behavior remain; the mark pauses when hidden.
- Notification tray mounts immediately, anchors to the visible Chat header,
  and ignores stale asynchronous results after close/navigation. Bell toggle,
  outside click and Escape close it. Notification thread links navigate to Globe.
  The legacy mount patch now also avoids hidden headers.
- Fixed both copies of `mpHide.menu` (Chat loads first): same-trigger toggle,
  listener cleanup, viewport clamping, Escape/focus, and scrolling within menus.
  Live Globe updates defer while `.mp-ctx-menu` is open so the trigger stays put.
- Thread reply-to labels now use a compact bordered bubble with cancel control.
- Checks: site sanity/build verification and phone browser tests in both themes
  for actual video playback, notification request races/toggle/position, menu
  scrolling/toggle/live updates, and reply bubble/cancel. APIs/WebSockets mocked;
  no real account data writes. Preview and production release verified separately.
- Pins: site 797, chat 400, forum3 1172, mount patch 1079, SW 387.
  No Worker/backend changes.

## 2026-11-09 — glass music treatment, iOS pull cue and VIP checkout

Branch: `codex/glass-music-vip-checkout`.

- Music mark: 4px optical left correction; lightweight animated glass-style
  reflection on the existing vector/text mark. This is a local treatment,
  not an official Apple animation asset. No text shadows; reduced motion static.
- Pull cue: rounded 3px strokes and 13px semibold system/SF-style text,
  retaining the chevron-to-plus morph and 80px threshold.
- Checkout: nonempty carts containing only recognized membership products may
  checkout before the drop. Mixed, unknown and other carts retain the countdown.
  Both the button state and checkout click handler use the same predicate.
  Existing Shopify metadata and account behavior are unchanged.
- Checks passed: build/source verification, site sanity, whitespace; cart gate
  tests for VIP-only, mixed, empty and unknown lines; mocked phone browser
  tests for music optical alignment, stable crossfade, shadows, pull morph,
  reduced motion and both themes. No real checkout or production API writes.
- Pins: site 796, forum3 1171, shop 105, SW 386; chat unchanged at 399.

## 2026-11-09 — Globe threading, incremental live replies and embed thumbnails

Branch: `codex/globe-live-replies`.

Requested by dc: add a `|_` connector beside the comment-preview box on Globe
cards; fix hiding replies; animate live replies into place; use post thumbnails
in Globe embeds, falling back to the author avatar only when no thumbnail exists.

- Added a small rounded elbow to the left of each card's comment preview.
- Root cause of collapse flicker: Show/Hide used `Ce()` → full `ke()` remount,
  with an artificial spinner delay. They now patch keyed reply nodes directly.
  Collapses animate height/opacity; rapid re-expansion cancels pending removal.
  Existing reply cards, original post and composer retain their DOM identities.
- Live events and polling now reconcile thread replies by id and payload instead
  of rebuilding the page. New replies animate into place; unchanged cards are
  untouched. Edits/deletions patch affected cards. Expanded/collapsed state stays.
  A focused draft no longer blocks incoming replies. Reply edits, selected text
  and playing media are protected; deferred card updates retry after interaction.
- Added explicit reader/composer scroll anchoring because `.forum` opts out of
  native anchoring. It follows layout changes for the insertion animation and
  stops on navigation/scroll input. Show/Hide handles its own collapse positioning.
- Existing reply renderer, action handlers, content gates, link unfurling and
  image-carousel enhancements were extracted into reusable helpers. New live
  replies keep the same actions/media and member-content gating as initial load.
- Successful sends clear only the unchanged submitted draft, then fetch/patch
  replies. Text typed during an in-flight send is preserved; stale responses
  cannot clear another thread's draft. Ordered read epochs also discard stale
  snapshots arriving after a newer response. No thread skeleton on send or live update.
- Embed bug: bare thumbnail ids failed the old URL test and fell back to avatar.
  `mpGlobeEmbed` now uses the same thumbnail URL normalizer as composer previews.
  An inline content image no longer substitutes for a missing explicit thumbnail.
- Permanent regression suite: `node tools/test-globe-replies.cjs`, with Playwright
  and Chromium available (`npm install --no-save playwright` if needed). APIs and
  WebSockets are mocked; artifacts go to `/tmp/mp-globe-replies-test` or
  `MP_TEST_ARTIFACTS`. Tools are excluded from public Pages output.
- Validation passed: 390×844 dark/light browser suite (collapse/rapid toggles,
  draft preservation, instant/nested/own/polled replies, animation, scroll
  anchoring, edits/deletions, thumbnail fallback); 360×780 dark authenticated
  and light signed-out checks plus 1440×900 dark, covering gating, reduced motion,
  new carousel/link previews and no overflow. No page exceptions or production
  API writes. `npm run check`, `npm run verify`, `git diff --check` passed.
- Pins: site 795, chat 399, forum3 1170, SW 385. No Worker change/deploy needed.
  Release after CI and preview pass under dc's standing authorization.

## 2026-11-09 — centered provider mark and chevron-to-plus pull

Branch: `codex/music-center-pull-morph`.

- Latest dc request supersedes the provider mark's left alignment below:
  center Apple Music between the cover's right edge and the card's right edge.
  Keep the compact listening/title/artist text left-aligned beside the cover.
- Removed music text and provider-mark text shadows, with a scoped shadow/filter
  reset inside the text column. Cover and card styling remain as before.
- Pull cue: a 26px chevron above the text (previously 14px beside it).
  Its two SVG strokes interpolate to a plus at the posting threshold using
  requestAnimationFrame and existing pull progress. Retreat reverses the morph;
  cancellation/spring-back resets it. Reduced motion uses discrete icon states.
- Pins: site 794, forum3 1169, SW 384; chat stays 398 (no chat JS change).
- Validation: npm run check, npm run verify and git diff --check passed.
  Mocked browser checks passed at 390×844 and 360×780 dark/light, plus desktop
  1440×900 dark: provider centering within 1px, no text/filter shadows, stable
  crossfade width, stacked 26px icon, half/full/reversed morph, composer opening,
  and reduced-motion styling. Screenshots reviewed; no page exceptions.
- No Worker changes. Release after CI and preview pass under standing approval.

## 2026-11-09 — cover alignment, vector Apple mark and animated chevron

Branch: `codex/music-chevron-menu-refine`.

- dc's latest direction supersedes centered music text: keep the listening,
  song and artist lines tightly grouped, but left-align them beside the cover.
  The Apple Music mark uses the same left edge so it sits closer to the art.
- Replaced the platform-specific Apple private-use font glyph with an inline
  vector Apple silhouette plus “music”. Removed font detection and the blurred
  scale transition; the crossfade now uses opacity and a small vertical slide.
  This avoids font fallback/missing glyphs and keeps the icon shape stable.
- Pull-to-post keeps plain text, now with a down chevron. Its travel and a fine
  underline follow pull progress; crossing the 80px threshold adds a short
  downward cue and a release-label slide/crossfade. Reduced motion is static.
- Menu divider is an inset hairline with softly faded ends. The unchanged dc
  FM SVG mask is reduced from 108×24 to 90×20, matching the option icon height.
- Pins: site 793, chat 398, forum3 1168, service worker 383.
- Checks: site sanity, built/source verification and whitespace checks. Mocked
  browser coverage includes short/long music text, left alignment, settled
  provider-mark alignment, crossfade size stability, vector rendering, logo
  height, divider gradient, pull progress/threshold/composer and reduced motion.
  Phone sizes: 390×844 and 360×780, both themes; desktop: 1440×900 dark.
- No Worker code or data changes. Release under dc's standing authorization
  once CI and preview checks pass; verify production after merge.

## 2026-11-09 — dc's follow-up design refinements

Branch: `codex/chat-music-menu-polish`. Released in PR #2 after dc approved;
production deployment and UI smoke checks passed.

- Pull-to-post now uses **basic text and a down arrow**, per dc. This supersedes
  the earlier glass pill/ring design below. The single 80px post threshold,
  cancellation handling, live updates and composer transition are unchanged.
- Music cards: listening line, title and artist are grouped with 1px gaps and
  centered vertically/horizontally in the text column beside the cover.
  The Apple Music mark shares that centered cell during the crossfade; card
  width stays stable. Long song/artist text ellipsizes within the card.
- Chat + menu: `role=separator` line before FM. The previous background used
  `--sheet-border` (a full border shorthand), so it was invalid and invisible.
  The divider now uses a currentColor tint. The FM row uses dc's existing
  `assets/misery-fm-logo.svg` unchanged, as a CSS mask that follows the theme.
  The feature remains disabled with its existing Soon label.
- Pins: site 792, chat 397, forum3 1167, service worker 382.
- Validation: `npm run check`, `npm run verify`, and `git diff --check` pass.
  Mocked browser checks measure text gaps/centering, mark centering, crossfade
  width stability, divider visibility, SVG mask, plain pull styling and reduced
  motion at phone sizes in both themes and desktop. No production API writes.
- No Worker change or deployment needed. Keep handoff notes in the shared repo
  so both Codex and Grim can follow dc's design decisions.

## 2026-11-09 — Live Globe / Chat and pull to post

Requested by dc: keep Globe and Chat current without manual refresh; make
Globe's pull gesture post-only with a polished animation matching the site.

Branch: `codex/live-globe-pull-post`.

### Changes

- `src/js/forum3.js`: coalesced live-event fetches plus visible-page catch-up
  every five seconds, including signed-out Globe readers and open threads.
  Rechecks route and login identity when responses arrive. Unchanged responses
  leave the DOM alone. Changed lists preserve the visible card's screen position.
  Background repaints suppress the page entrance animation.
- Updates wait while a forum draft, focused field, selected text, open menu,
  playing media or pull gesture is active. They retry automatically afterward.
  The new-thread composer is never remounted by background synchronization.
- `src/js/chat.js`: retains the existing WebSocket; adds five-second catch-up
  while visible and catches up on focus, pageshow, visibility and network return.
  Catch-up requests share one in-flight promise and request up to 200 messages
  (the current API maximum). Responses from an old login are discarded.
  Socket hello no longer forces readers away from older messages on reconnect.
- Globe pull: one 80px raw finger threshold opens the new-thread composer.
  Pulling farther remains Post; short or cancelled gestures do nothing.
  Touch, click and keyboard activation are supported. Existing list-only and
  top-of-page guards remain. No refresh gesture on Chat or Globe thread detail.
- `src/css/site.css`: glass pill, finger-driven progress ring and rotating plus,
  release-label crossfade, threshold light ripple, existing composer transition.
  Uses current theme tokens and has a reduced-motion fallback.
- Built only chat, forum3 and site. Pins: site 791, chat 396, forum3 1166,
  service worker 381. Main HTML and service-worker shell pins updated together.

### Validation and release

- Final `npm run check` (zero errors/warnings), `npm run verify` (all outputs
  match source), and `git diff --check` passed.
- Sixteen behavioral checks passed in Chromium at 390×844, dark and light,
  with no page exceptions. Additional tests passed for scroll anchoring and
  signed-out Globe polling at 360×780. No horizontal overflow at 360×780
  (dark/light) or desktop 1440×900 (dark).
- Browser tests use local built assets and mocked APIs/WebSockets, never write
  test accounts/messages to production. Cover missed events, immediate events,
  unchanged DOM, thread catch-up, draft preservation and pull cancellation.
- Mobile visual review: 390×844 and 360×780, dark/light; desktop 1440×900.
- No Worker code, bindings, data or secrets changed. No manual Worker deployment
  is required. R2 backup remains unrelated pending work from the prior audit.
- Released in PR #1 after dc approved on 2026-11-09. Pushing main
  deploys automatically. Real authenticated API operations reject pages.dev
  origins; verify with local assets under the real origin or on approved release.

### Limits to keep in mind

- Instant updates use existing WebSocket broadcasts. Polling covers missed
  events with up to five seconds of delay while the page is visible.
- Forum repaint intentionally waits while someone is editing or playing media.
- Chat catch-up recovers new messages in the API's last-200-message window;
  reactions/deletions continue to use the existing WebSocket event handlers.
- Grok's separate conversation history is not accessible to Codex. Put ongoing
  implementation decisions in the repo/PR so both assistants can follow them.

## Shared divider style (Grim, Nov 9 2026)

- Every hairline divider uses the + chat menu separator via tokens in
  `src/css/site.css`: `--mp-div-c` (ink at 16%), `--mp-div` (horizontal fade),
  `--mp-div-v` (vertical) and `--mp-div-in` (border-image version with a 12px
  inset). `.mp-divider` is the shared class for new markup.
- Existing border dividers keep their element and only take
  `border-image: var(--mp-div-in) 1`, so no divider is added where there was none
  (Globe thread rows intentionally stay borderless; `.mp-tbar` keeps its card border).
- Test: `MP_PLAYWRIGHT=... node tools/test-dividers.cjs` (WebKit + Chromium, dark + light).

## Misery FM menu + top bar, t516u/t517u (Grim, Nov 9 2026)

- The FM menu is now a + chat menu sub-panel: `chat.js` `mpMorph(m, "fm", close)` morphs the same
  menu element (same size animation as Music/Polls/Globe) and calls `MPFM.mount(m, {back, close})`.
  The header is the + menu sub-panel header (Back, real logo `assets/misery-fm-logo.svg`, live status,
  Close). The standalone `openSheet()` (fallback, `MPFM.open`) uses the same frame. Both carry `.fm-root`.
- Station tab: grouped compact rows (`.fm-sr`: icon, label + status, control) under Broadcast /
  DJ note / Session labels, with the shared divider token.
- Top bar: the "is live" phase shows the real logo + text in the top bar's own typography (copied from
  the bar's text, or the chat header title for the icon-only main nav). Now playing: the whole bar is
  the progress fill (`.fm-m-fill`); tapping the bar (anything but Listen) returns to the normal bar;
  it no longer opens the FM menu (that lives in the + menu).
- Live checks: never fetch an exact `?v=N` pin before the probe shows the new SW. Cloudflare caches
  pinned assets as immutable, so an early fetch pins the old file under the new URL (happened to
  css 826 at one edge; superseded by 827).

## + menu scroll lock (Grim, Nov 9 2026)

- `chat.js` `mpScrollLock(m)` / `mpScrollUnlock()` run from the + menu open/close (covers the menu and every
  sub-panel: Music, Misery FM, Polls, Globe). There are no overflow or position tricks on the page (they jump in the iOS PWA). Instead:
  - touchmove, wheel and scroll keys outside the panel are cancelled;
  - inside the panel a drag is allowed only while an inner scroller can still scroll that way, so there's no chaining at the edges;
  - `overscroll-behavior` is `none` on the page and `contain` on the panel lists;
  - stray page scrolls are pinned back (except while typing in a panel field, so iOS can reveal it);
  - the position is restored on close, or kept at the bottom if the chat was at the bottom.
- Globe list in the default `s1` row style had `overflow:hidden` (not scrollable); now `overflow-y:auto`.
- Test: `tools/test-scroll-lock.cjs` (WebKit iPhone 14, dark + light).

## Misery FM player, t521u–t526u (Grim, Nov 9 2026)

- Now tab transport: Apple Music-style glyphs with no circles (`.fm-tpb`, original filled paths in `GLY`);
  prev restarts the track if more than 3s in, otherwise goes back. There's a thin `input.fm-scrub` with
  elapsed and -remaining below it. The Restart button and the Now-tab Stop pill are gone (Stop stays in Station).
- Visualizer: `viz()` draws three layered flowing waves (eased energy, accent → `--fm-viz2` gradient),
  at 60fps on rAF; reduced motion makes it static.
- DJ note removed from the client (owner control, listener display, `noteKey`). The Worker field is untouched and ignored.
- Reactions: a compact glass pill (`.fm-reacts`) with a `fmPop` tap animation (`.is-pop`).
- Crossfade is now a stepper (`.fm-step`: −, "Off"/"Ns", +), 0–6 in 1s steps (was a 0.5-step slider),
  disabled at the ends, same `ctl({action:"xf"})` setting.
- Top bar "is live": the weight is picked so the "l" stem width matches the logo's 12/160 stroke (`stem()`,
  `data-stem`); the logo is shifted so its lettering baseline (y=130/160) sits on the text baseline,
  measured with a zero-size `.fm-bl` marker. `.fm-hb-is` must stay block, not flex+center,
  or the marker centres and the baseline is wrong. It re-measures on fonts.ready, resize and the phase flip.
- Frost (t524u root cause): the #63 veil `.chat-plus-menu.fm-mnt.fm-c{background-image:linear-gradient(var(--fm-veil)…)}`
  stacked ~80% opaque navy/white over `--sheet-bg`, hiding the + menu blur. Removed, so the panel uses the + menu glass exactly.
- Palette: `--fm-red` now maps to `--accent` (navy in light, light blue in dark) with `--fm-on` as the on-accent text.
  The red dotted live ring (`--fm-dot`) stays red, and the E badge stays neutral.

## Misery FM edit-song form spacing, t529u (Grim, Nov 9 2026)

- The edit form (`fillEdit`) uses the + menu sub-panel header (`chat-pbig-hd` + Back `chat-pbig-btn`, title).
- The cover is a filled row: 60px art, "Cover", Replace/Remove side by side, hint.
- Fields sit in `.fm-ed-fs`: 12px between fields, 6px label→input, labels flush with inputs, and 42px inputs at 16px (no iOS focus zoom).
- Explicit is a settings row with the switch at the end; Save is full width; Play now / Play next / Remove sit in a 3-column row.
- In the + menu the panel grows to its full height (`.fm-editing`, animated) while editing, then returns.
- Test: `edLayout`/`edOk` in test-misery-fm (dark + light): even gaps, alignment, ≥16px inputs, no zoom on focus, back button, panel grown, switch position.

## Profile card fixes + polish on Codex #60/#62, t529u (Grim, Nov 9 2026)

Codex: I kept your module and its structure (carousel, details, editor, toggle/refresh API), with targeted fixes only.

- `resize()` in `profile-cards.js` now places the card the same way the #48 tap anchoring does:
  - the stem tip stays at the tapped element;
  - the side is re-chosen by room;
  - bounds are `visualViewport` minus safe areas (`options.insets` = `mpPBinsets`) and minus the top bars (`.nav`, `.panel.on .chat-head`). The bars only limit the card while it can still be at least as tall as the compact card; otherwise it uses the full viewport.
  - When the content is taller than the room, the body is capped and scrolls (`.is-capped`), rather than moving the card off its anchor.
- Size animation: while it runs, `.is-sizing` makes `.mp-pb-scale`/body follow the animated box. The mask, stem and outline are recomputed every frame from the live rect and the fixed tap x. If the side flips, a short fade replaces the size morph.
- `MPProfiles.place(b, opts)` is exported. chat.js calls it only when the #48 compact placement had to clamp (neither side fits), so a compact card no longer covers its own avatar.
- Options are built once (`pbOpts`) and reused.
- Polish:
  - site font everywhere;
  - uppercase 10px section labels separated by the shared `--mp-div` divider;
  - filled-row buttons;
  - accent note tile;
  - "Show less", with a rotating chevron;
  - no sideways scroll;
  - editor inputs at 16px (no iOS zoom).
- Share is unchanged.
- Tests:
  - new `tools/test-profile-expanded.cjs` (WebKit iPhone 14, real touch, dark and light);
  - `test-profile-cards` now expects "Show less";
  - `test-profile-pop2` and `test-profile-tap-touch` still pass.
- Headless WebKit doesn't render backdrop blur, so test screenshots look see-through; on device it's the normal `--sheet-*` glass.

## Profile card round 2, t535u (Grim, Nov 9 2026)

- **Blur flash during compact↔expanded:** the glass was one backdrop-filtered element shaped by an SVG data-URL mask that was regenerated every animation frame. WebKit rebuilt the backdrop layer on each new mask, so the glass went clear for a moment.
  - Now `.mp-pb-shape` is an unmasked rounded rect resized by layout, which is the + menu morph technique and keeps the blur continuous.
  - The stem is a separate small glass (`.mp-pb-stemg`) with a fixed mask (`mpPBstemMask`, cached per side) that only moves along x.
  - The opaque open/close cover (`.mp-pb-frost`) keeps the one-piece mask but isn't re-masked while `.is-sizing`.
- Edit and Share are 30px icon pills in the header corner (`.mp-pb-tools`). Whisper and Hide stay as action buttons. The Share card itself is unchanged.
- Pinned photos: no title. They're a native scroll-snap strip of 112px square thumbnails (momentum, no JS animation). Arrow keys step one photo and `data-index` tracks it. The prev/next buttons and dots are gone.
- "Currently listening" is now "Listening" (card and editor). City is plain muted text with no heading or box.
- Tests: test-profile-expanded checks, per frame, that the glass stays unmasked, the blur stays on, the stem mask is constant and sits at the tip. It also checks square/small photos, scroll-snap, section titles, plain city and the header pills. test-profile-cards uses scroll instead of the old buttons.

## Misery FM: no history, off-air card, inline E badge, t532u/t533u (Grim, Nov 9 2026)

- "Recently played" (`histHTML`) is removed from the client for owner and listener. The Worker's `hist` data is untouched and ignored.
- Off air, the Now hero is a compact card (`.fm-off`):
  - the real logo;
  - an "Off air" (or "Scheduled") accent pill;
  - one line: "Back on air …" when scheduled; for the owner, "N songs ready to play" or "Add a few songs…"; for listeners, "Nothing playing right now. Check back soon.";
  - for the owner, Go Live (disabled with no songs) + Add songs (opens the picker);
  - quiet idle waves behind.
  The old Go Live row and hint under the hero are gone.
- E badge: title rows (`.fm-ttl`, `.fm-li-1`, `.fm-m-1`) are left-packed flex with a 5px gap. The title is `flex:0 1 auto` and ellipsizes, and the badge is `flex:none`, so it sits right after the text. Tested with `eGap` (3–7px, inside the row; a long title clips before the badge).

## Profile card round 3, t536u (Grim, Nov 9 2026)

dc: "Move now playing above the pictures and make the picture carousel show the way it does in chat where
you can flick thru them. Get rid of location section and get rid of dividers."
- **Order:** Listening (song) section, then pinned photos, then the empty-state line / Manage user.
- **Photos = chat photo stack:** `carousel()` in `profile-cards.js` now builds the chat's iMessage-style
  stack. Cards reuse `.chat-photo-card` (radius 18, shadow) and `.chat-stack-dots`, sized min(180px,50vw)
  like `.chat-photo-stacked`, with the same `data-pos` fan (9,5,4deg / -8,8,-4deg / 3rd hidden). Drag the top
  card sideways: it follows the finger with translateX(dx) rotate(dx/18deg). Past 50px it flies off
  (±130%, ±14deg, haptic) and the stack advances; a short drag springs back. Left = next, right =
  previous. Arrow keys step the same way. The horizontal drag calls preventDefault, so the card body
  doesn't scroll during a flick, and vertical drags still scroll. `data-index` is the top photo.
  The t535u scroll-snap strip rules are removed.
- **Location removed:** there's no city section on the card and no City field in the editor. Save sends the
  stored `user.city` back unchanged, so Worker data is untouched.
- **No dividers:** the section/empty `::before` hairlines, the Full profile/Show less border-top and the
  editor border-top are all gone. Spacing alone separates sections now.
- Tests: `tools/test-profile-expanded.cjs` checks the order, location gone, zero dividers, chat-stack
  size and look, a flick left/short/right with defaultPrevented and body scroll 0, and that the editor has
  no City field. `tools/test-profile-cards.cjs` (Codex) now uses ArrowRight→index 1. Its City
  steps were removed, and it asserts that the saved city stays 'Oslo'.

## Misery FM menu round, t536u (Grim, Nov 9 2026)

dc: "Make the reaction emojis so that I can hover and move my thumb along emojis and release to send or just
tap to send … Remove the blue pulsing dot by the album cover. Replace go live text with an icon. Fix
positioning of waveform when off air. Remove confirmation pop ups when going live or ending a live."
- **Press-and-slide reactions:** `rxStart/rxMove/rxUp/rxEnd/rxSend` in `misery-fm.js`. pointerdown
  anywhere on `.fm-reacts` captures the pointer. The nearest emoji (by button centres cached at the
  start) gets `.is-hov`, a spring lift and magnify (translateY(-14px) scale(1.65), cubic-bezier(.34,1.56,.64,1)).
  Neighbours get `.is-near`, the rest settle to .9, and each change gives a light `window.haptic(5)` tick.
  Release sends the hovered emoji. Release more than 64px above, 30px below or 16px to the side of the
  pill cancels (`data-rx="cancel"`). A plain tap is down+up on the same emoji. The click after a gesture
  is ignored for 700ms, so it never double-sends, and keyboard Enter/Space still sends via click. The send
  animation is a WAAPI emoji clone that pops (2.25×) and rises, plus an accent ring burst. The shared
  float rises from the sent button. Reduced motion skips the fly and uses a plain 1.25× highlight. The pill
  is `touch-action:none`, touchmove is cancelled while a gesture runs, and `renderSheet()` waits for it to end.
- **Cover dot gone:** the live hero no longer renders `.fm-onair` (the Paused badge stays).
- **Go live = icon:** new `ico("golive")` (an antenna mast with a beacon and two wave pairs, distinct
  from `radio`). It's used in the off-air card (52px primary, next to Add songs) and the Station
  Broadcast pill (34px). Both have aria-label/title "Go live". Stop stays text.
- **Off-air waveform:** the canvas sits in the card's flow, between the line and the actions,
  full content width, 30px, centred. The old absolute bottom strip and its padding hacks are removed.
- **No confirm** for golive/stop: these call `ctl()` immediately. Remove-song still confirms.
- Tests (`tools/test-misery-fm.cjs`, WebKit iPhone 14 dark+light, mocked): slide 1st→4th checks
  touch-action none, hover lift >1.5×/<-10px, neighbours, touchmove defaultPrevented, panel not scrolled,
  exactly one `fmr` with the slid emoji, fly + ring, and no double-send on the trailing click. Release
  outside cancels and sends nothing. No `.fm-onair`. Go live icon (aria-label, no text, svg) in the card
  and Station. No `.fm-cf` on stop/go live. Off-air viz is in flow, centred (|dl-dr|≤1), under the
  line, above the actions, inside the card (owner and listener).

## + menu sub-panel titles, t537u PR A (Grim, Nov 9 2026)

dc: "Align left the titles of all menus in the + menu like misery fm and music menus are. Remove Share a
song from music menu title."
- One rule block covers every `.chat-pbig` header (Globe, New poll, Music; Misery FM already matched):
  the title sits left, 14px after Back (flex gap 8 + 6 margin, the FM logo's spot), in the Music title's
  type (17px/650/-0.02em), and Close stays right. Poll's old 14px uppercase-ish title and Globe's
  centred title now follow it.
- The Music header lost its "Share a song" subtitle (the dialog's aria-label is still "Share music"). Its
  header is nudged by its 3px larger panel padding, so Back/Close sit at 12px like the others.
- Test: `tools/test-plus-titles.cjs` (WebKit iPhone 14 dark+light) checks the Back→title gap equals FM's,
  the title is centred on Back, Back sits at the same x, the typography is identical, and there's no
  "Share a song".

## Profile card redesign, t537u PR B (Grim, Nov 9 2026)

dc: "I need you to carefully redesign and reimagine the profile card take your time." I explored two directions
in Chromium iPhone-size screenshots, because headless WebKit doesn't paint backdrop blur:
(A) a centred hero and (B) a left-aligned row header, both over an avatar aura. I picked A: it has
the clearest hierarchy and matches the + menu glass. B crowded the name, handle and pill next to the corner
tools. The data and features are unchanged, and the glass, stem, #48/#67 tap-anchored placement, top-bar rule
and morph code are untouched.
- **Compact (chat.js `mpPBshow`):**
  - The avatar is 76px in `.mp-pb-av`, with a gradient ring `.mp-pb-ring` and a soft accent glow. VIP
    (`member`) has a gold ring, owner (`dc`) has a slow conic shimmer, and default/verified use the accent.
  - `.mp-pb-aura` is the avatar image blurred and saturated behind the header, radial-masked. It's only
    there when there's a real avatar, and it's pointer-events none.
  - The name is 21px/700, lowercase, with its inline badge. `.mp-pb-sub` is `@handle · #n · joined mon
    yyyy` (lowercase). The VIP/07/<3 pill moved into the chip row (`.mp-pb-stats`) with the points chip and
    the badge chip.
  - The bio is centred and clamped to 3 lines (unclamped when expanded). Your own profile without a bio
    gets an "Add a bio" capsule that opens the profile sheet.
  - Whisper and Hide are pill actions; Hide is quiet, with red text and icon only.
  - Edit and Share stay as 30px corner pills.
  - Full profile / Show less is a small chip capsule whose chevron flips with a spring.
  - Compact width is now 300px.
- **Expanded (profile-cards.js `details`):**
  - Listening is one row: 48px art with a shadow, title/artist, a 4-bar accent equaliser (CSS, static
    under reduced motion), and a chevron when it links to Apple Music.
  - Then comes the chat photo stack.
  - The empty state is a glyph plus one line. The own profile still has Edit profile details, and the
    owner still has Manage user.
  - Children reveal staggered (`.is-reveal`, `--i`, 65ms steps) only on expand, not on refresh.
  - The size morph is a light spring (420ms cubic-bezier(.3,1.12,.4,1)) and the collapse is 340ms.
- Tests:
  - `test-profile-expanded.cjs` checks the ring/aura/handle/pill-in-chips per user (VIP other, owner dc
    added to the mock chat, the long name without an avatar or bio), the corner tools, the width, the
    staggered reveal, the equaliser and chevron, and the empty state. All earlier geometry, morph and
    dismiss checks still pass.
  - `test-profile-pop2.cjs`: its "should flip above" model now ends the above-room at the top bars plus
    8px (the t529u rule). The taller hero card revealed that the old model ignored the header.
  - Codex's `test-profile-cards.cjs` passes unchanged.

## 2026-11-09 23:57 ET: Grim ships Codex's #75 (Hugeicons phase 1) as-is at dc's request
- dc asked Grim to ship Codex's draft PR #75 (`design/hugeicons-migration`, issue #74) live at 11:57 PM ET Nov 9 ("Push the icon branch"). dc's standing keep-shipping override applies to shipping a WIP/draft PR.
- Shipped as-is (PHIcon helper + 5 main nav SVGs, THIRD_PARTY credits). There was no rebase: the branch was already on top of main (SW 443). SW goes to 444.
- One change from Codex's draft: the `js/ph-icons.js` pin is **v=7**, not v=5. Grim's pre-merge header checks hit the plain `?v=5` and `?v=6` URLs without `&probe=`, so Cloudflare's edge cached the old file there (immutable). Treat ph-icons v=5 and v=6 as burned and never reuse them. Always probe with `&probe=$RANDOM`.
- The remaining #74 work was Codex's when this shipped. dc's follow-up t541u ("Make sure all icons sitewide adopt hugeicons counterparts") then moved the rest of #74 to Grim, on branch `grok/74-hugeicons` (see the next entry).

## 2026-11-10 ET: Grim completes #74 (site-wide Hugeicons) at dc's request (t541u, t542u)
- dc t541u: "Make sure all icons sitewide adopt hugeicons counterparts." Grim took over the rest of #74 from Codex and commented on #74. The branch is `grok/74-hugeicons`, cut from main after #75 merged. `design/hugeicons-migration` was not reused.
- Every site-authored UI icon is now Hugeicons Free Stroke Rounded (MIT). Only the icons actually used are self-hosted as inline markup, with no runtime dependency. Covered:
  - chat (composer, + menu, profile card, me-menu, whisper, voice, Globe/Music/Poll panels, orders, recovery)
  - Globe (editor toolbar, bell, search, locks, pull-to-post, replies, share, carousel, back-to-top, hidden-content eye)
  - shop (arrows, checks, 3D hint, carousel, share)
  - dashboard (close, tabs, chevron, grip)
  - Misery FM (`ICO`/`GLY` tables and panel chrome)
  - profile cards
  - `forum-mount-patch.js` runtime swaps (bell, dashboard tabs, analytics metrics: these were re-injecting Heroicons/Phosphor)
- Text glyphs that were acting as icons are now icons too: "← Back" pills, "✕ Clear", every × close button, 🔒 lock notes, 💬 Repliers.
- Stroke is 1.5 (2 at 12px or below). Checkbox ticks keep their CSS stroke, with the draw dash lengthened to 22 for the Tick02 path. The active nav tab now inks the stroke with user-space gradients `#orb-ink-l` / `#orb-ink-dark-l`, because #75's filled active state turned line icons into solid blobs.
- dc t542u: **reaction icons stay byte-for-byte unchanged**. That covers chat tapbacks, reaction pills and `.chat-react-delete`, Globe ★ stars, and Misery FM reactions. Other exceptions: brand marks, seals and badges (verified, pay-check, VIP ⭐, 07, <3), the branded eyes, favicon, app icon, FM logo and `fm-emb` emblem, data visuals (poll ring, `fm-ring`), and the glass stem masks. Full list in docs/THIRD_PARTY.md and the PR.
- Audit: `node /workspace/amwork/hi/audit.js` (on the box) lists every `<svg>` path not found in `@hugeicons/core-free-icons`. Only the exceptions remain.
- Note: `tools/test-header-height.cjs` already fails on main (header fade mask is now a gradient, the test expects `none`). It is unrelated to icons and was left for whoever owns the header fade.

## 2026-11-10 10:38 ET: thicker Hugeicons, plus a clean navbar cart (dc t543u, issue #77)
- dc: "Keep the same icons just make every icon a bit thicker, and for the cart icon in the navbar, remove the two lines inside the cart so the number shows properly." Grim did this on `grok/77-icon-weight`.
- Same glyphs, heavier strokes:
  - Hugeicons root `stroke-width` 1.5 → **1.8** everywhere: PHIcon (`js/ph-icons.js`), nav, inline SVGs in chat/forum3/shop/dashboard-v2/profile-cards, FM `SV`/`ico()`, and the `forum-mount-patch` swapper.
  - Icons at 12px or below: 2 → **2.2** (`.mp-x-ico` too).
  - Bold shop ticks 2.6 → 2.8; checkbox ticks 2.2 → 2.4; poll check 2.4 → 2.6; poll tag/footer 2 → 2.2; active nav tab 1.8 → 2.1.
- Unchanged:
  - FM solid transport glyphs: `gly()` and `ICO.play` stay at 1.5.
  - Reaction icons, brand marks, seals and badges, branded artwork, `fm-emb`, and the rings. The diff touches none of them.
- No viewBox clipping at the new weight: every rendered 24-grid icon's bbox plus half its stroke stays inside 0..24.
- Navbar cart (`#cart-btn` and the bag-mode `#post-btn`):
  - the `M16 10V13M11 10V13` inner lines are removed;
  - the count is centred on the basket interior (≈13.75, 11.4 of the grid), 9.5px tabular;
  - the active-tab count now uses normal ink, because the old inverse colour assumed a filled orb icon and was white-on-white in light.
- Measured offset from the basket centre is ≤0.12px for 1, 9, 12 and 99, active and inactive, dark and light. The `ShoppingCart01` copy in `PHIcon` keeps its lines; it isn't the navbar.
- Pins:
  - site.css 839, chat.js 436, dashboard-v2.js 64, forum-mount-patch.js 1081, forum3.js 1180, misery-fm.js 10, profile-cards.js 7, shop.js 111
  - **ph-icons.js 8** (5 and 6 stay burned)
  - SW 446
