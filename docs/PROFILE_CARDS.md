# Expandable profile cards — Codex task #58

The existing compact profile remains the entry point. Full profile is a filled
bubble with no divider. It grows that same card from 280px to at most 340px and
caps content height at 560px/the available viewport. Only the card scrolls.

Design (t537u): centred hero — ringed avatar (accent / VIP gold / owner shimmer) over a soft aura of the
avatar, lowercase name + badge, @handle · #n · joined, chips (badge pill, points, badges), bio, pill actions.

Expanded sections: an explicitly user-picked song (Listening row with a small equaliser), then up to three
pinned photos shown as the chat photo stack (flick the top photo sideways, arrow
keys). No location section or dividers (t536u). Empty fields are optional. Edit →
Expanded profile supports image upload, reordering/removal, song search/clear,
explicit save and error retry; a stored city is preserved but no longer edited or shown.

Implementation is in `src/js/profile-cards.js`, loaded before chat, with narrow
hooks into the existing authenticated API, music catalog, popover glass mask and
profile editor. Legacy owner badge/ban tools remain available as Manage user.
No FM implementation is touched. Shared pins must be rebased against main before
release. The earlier music waveform/alpha work is stashed and is not part of this
task; Grim has already handled the music changes separately.

Backend: linked misery-worker#18 / #17. Deploy its narrowly patched live Worker
first, preserving all live FM source/settings/bindings; never upload stale Worker
main wholesale. Fields: city, profilePhotos, listening (optional empty defaults).
No migrations. Website works with old missing fields, but saving needs backend.

Validation: `npm run check`, `npm run verify`, `git diff --check`, and
`MP_PROFILE_ENGINES=chromium node tools/test-profile-cards.cjs`. All writes are
mocked. Includes phones 390x844/360x780 in both themes, desktop, growth/bounds,
photo buttons/keyboard/swipe, scroll/collapse, safe text, upload, song search,
failed save/retry and persisted reopen. WebKit is also supported by the suite;
this environment lacks required GTK4/other libraries to launch the installed
WebKit binary, so Chromium phone emulation is the current verification limit.

Rollback: revert website PR; backend fields may remain harmlessly in user rows.
Backend rollback uses the recorded previous live Worker version, no data purge.

Publication follow-up: Pages reported successful profile deployments while the
public module path returned 404 and root still served the prior shell. A fresh
middleware bundle adds X-MP-Release: profile-cards-431 for public verification;
nonce/CSP, streamed HTML body, asset routing and application code are unchanged.
