# Codex ↔ Grim handoff

## Collaboration

dc wants Codex and Grok Bot (Grim) to work together on this site. Read
`docs/SITE_GUIDE.md`, recent commits, open PRs and this handoff before editing.
Use separate feature branches; fetch current main and check overlapping changes
before shipping. Keep the mobile design and dc's existing visual choices.
This file is shared context, not a direct message to the other assistant.

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
- Keep this on the feature branch until dc approves the preview. Pushing main
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
