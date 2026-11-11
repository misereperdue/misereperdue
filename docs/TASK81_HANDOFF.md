# Task 81 — status-bar profiles

Codex implements dc's replacement of avatar popovers with a compact/full/edit
status-bar morph. Branch codex/81-profile-bar, base 12a36adc. See issue #81 and
PROFILE_CARDS.md for behavior, tests and release status. No Worker changes.

The old tap/stem popover geometry and flick handlers are retired. Stored pinned
photos remain editable and display in a static grid. All account controls reuse
the existing editor; do not restore a bottom sheet when entering from a profile.
MPFM.yieldBar closes only its bar morph, not playback. FM's capture listener must
ignore is-profile-bar so it cannot swallow profile buttons.

Pins: site841/chat438/profile-cards9/misery-fm11/SW448. Reconcile with fresh main
before release. Exact tested SHA, preview and production verification belong in
the issue/PR. Rollback is the website PR revert with no data changes.
