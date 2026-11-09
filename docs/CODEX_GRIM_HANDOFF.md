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
