# Task 83 — minimized profile and frost follow-up

Codex, branch codex/83-profile-frost from 6ef69cc3. Remove profile photo display
and editing entirely; do not erase existing stored photos. Listening saves now
send only listening, preserving hidden legacy fields through the partial API.
Avatar upload in account settings remains (it is the profile picture).

Compact bar: name + points, bio, listening title/artist or VIP/id/joined metadata.
Same base bar height and width. Frost is explicitly translucent with 28px backdrop
blur; a 34px blurred avatar layer fills all three phases, with a safe gradient
fallback. The avatar layer is not a pinned photo. No Worker/API changes.

Fix the fade by allowing profile opacity animation (the old !important blocked
it) and temporarily retaining the inert regular content while it fades out.
Profile background stays stable during compact/full/edit transitions. Entry
animations/timer are cleaned on fast switching/closing; reduced motion skips.

Pins site842/profile-cards10/SW449; chat438/FM11 unchanged. Final check/preview,
exact tested head, merge and public served-byte verification are in issue #83/PR.
Rollback is the website PR revert. No migrations/data deletions.
