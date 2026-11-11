# Clipboard Safari follow-up — issue #110

Agent: Codex. Branch: codex/110-clipboard-rework. Frontend only; Worker 319 unchanged.

User evidence: iPhone Safari, Apple Music Copy Link; tapping native Paste returned the bar to normal. Exact sample: https://music.apple.com/ca/album/waves-robin-schulz-remix-radio-edit/1532427204?i=1532427206 . Existing parsing already accepts this and canonicalizes to the CA song with ID 1532427206.

## Changes / Grok handoff

Explicit Paste taps invoke readText immediately in the user gesture, before changing controls. Rich ClipboardItem reads remain available for background reads when permission is already granted, and when readText is unavailable. Do not silently dismiss on empty/unsupported clipboard results. Do not swallow NotAllowedError/SecurityError and wait for a synthetic DOM paste event: report an actionable error, preserve the topbar, allow retry. A legitimate DOM paste may still complete a pending read, but is not required for readText completion. Native Paste selection has no network timeout; the 23-second lookup/save timeout begins after it completes. Original focused buttons stay mounted and are guarded against duplicate actions instead of being disabled/replaced before native access.

Balanced music/checkmark circles, centered copy, softened entrance and success exit, persistent lookup/save progress, visible retry states; reduced motion respected. Outside dismissal still aborts the operation and prevents a pending lookup from saving. Auth and profile/FM ownership guards retained. No URL entry field or extra confirmation phase.

Release pins: chat449, site854, SW463. Keep the existing FM20/profile16 and backend319 pins. After Pages production succeeds, purge the exact new public pinned URLs and compare the delivered bytes with built files. Previous production had stale immutable chat asset bytes despite successful deployment.

## Validation and limits

- check, verify, diff whitespace checks
- clipboard native-access: unsupported permission query, exact Apple album/track link canonicalization, delayed read + focus/visibility changes, denied/empty/nonmusic reads retaining the UI, retry saves exactly once, outside dismiss
- clipboard completion: text/HTML/URI share payloads, actual Chromium HTML ClipboardItem, pending dismissal without save
- clipboard topbar: strict supported link filtering, stable dimensions, lookup/save spinner, profile/FM ownership, shop reparenting, dark/light and reduced motion
- FM countdown + clipboard regression suite

These are Chromium browser tests with account/API traffic mocked; native iPhone Safari's OS Paste control is not available in this environment. Do not claim a real-device Safari end-to-end result. Exact sample link format and flow handling are covered; a physical iPhone check remains necessary if symptoms persist.

Rollback: revert this frontend PR; no data migration or backend rollback.
