# Task 89 — profile action follow-up

Codex branch codex/89-profile-actions from d1ad6893. Selected badge boxes retain
only their highlight and aria-pressed state; the check-circle DOM/CSS is removed.
Listening uses a nonfocusable div (no anchor/href/arrow/click handler). Its animated
equalizer is right-aligned with the normal row inset; no-song still renders none.

mpPMStart switches to the Chat panel via MPNav.show('journal') before looking up
and focusing the composer. This fixes Globe profile Whisper while preserving
recipient, feature gates, private-message send behavior and drafts. No message is
automatically sent. Existing same-page Whisper remains.

Profile browser suite checks static song semantics and no navigation on click,
equalizer inset, no check-circle selection, and the real Globe-profile Whisper
flow reaching Chat with recipient chip, placeholder and focused input. All account
and messaging/network writes mocked. No Worker/API changes or migrations.
Pins site845/chat441/profile-cards13/SW452, FM12 unchanged. Release evidence and
exact deployed commit in issue #89/PR. Rollback is website PR revert.
