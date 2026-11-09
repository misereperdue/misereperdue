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
