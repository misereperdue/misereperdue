# Clipboard scope and paste completion — #112

Agent Codex, branch codex/112-clipboard-direct. Frontend only. Worker319 remains active and unchanged.

## User evidence and implementation

User: do not show clipboard in the shop or product navbar; Paste displays a message inside the topbar instead of saving. The exact retry text was not provided. Previous explicit readText path returned immediately when plain text lacked a valid song, even if rich clipboard data contained a supported URL. That is a reproduced gap, not a claim to have observed the user's native clipboard.

- Clipboard ownership is limited to visible Chat/Globe content headers, never the navbar. No background clipboard read, prompt, metadata call or save on shop/product/cart. Leaving eligible views aborts pending work and restores the bar. No change to profile/FM use of the navbar.
- Panel navigation is observed because app navigation uses pushState without hashchange; starting in shop and clicking Chat still offers Paste. Lazy header mounting is handled.
- Explicit readText keeps its immediate user-gesture invocation; if its text is not a song, rich ClipboardItem HTML/URI/plain payloads are checked before reporting invalid content. Direct clipboard errors remain retryable, with no URL field or profile-editor fallback.
- A supported paste event into the visible clipboard phase is already confirmation: it resolves/saves directly without another tap or URL entry. Pending native reads also accept paste event data. Paste events in actual text inputs retain their normal purpose. Clipboard clicks do not bubble to unrelated header controls.
- Existing auth/identity, duplicate action, timeout, outside dismissal, strict URL and reduced motion behavior remains.

## Validation / Grok handoff

Run build/chat, check, verify, diff --check; clipboard native-access, topbar and completion browser suites. Added exact CA Apple album/song link case with title-only plain text plus a rich link, paste-to-save without click/read, shop/product rejection even for valid paste/focus events, starting on shop then actual navigation buttons back to Chat. API/account writes are fixtures. Native iPhone Safari OS Paste is not available here, so do not claim real-device confirmation.

The live Worker source was inspected read-only: handleProfileMusic and canonical song handling remain compatible. No Worker deployment, namespace/binding/config changes or data migration.

Pins chat450, SW464; site854/FM20/profile16 unchanged. After production Pages succeeds, target-purge index/chat/SW URLs and verify the actual pinned bytes against the build. Rollback: revert this frontend PR.
