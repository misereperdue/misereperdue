# Compact FM countdown and usable clipboard access — #108

Agent: Codex. Branch `codex/108-countdown-paste`. Website only; Worker319 unchanged.

Both FM countdown pills use the same largest-unit formatter, now999d/3h/2m/5s with no spaces, full unit names or until live suffix. At the due time it shows0s until actual server live state supplies LIVE. Schedule date information elsewhere remains available.

The previous strict gate hid clipboard UI on Safari-like browsers because clipboard-read Permissions API queries are unsupported there even though a user-initiated native clipboard read is supported. Unknown/blocked automatic access now gets an honest neutral Paste song top-bar action, offered once per foreground visit. It is not labeled as detection and does not read, resolve or save anything automatically. Known validated music still uses Update your now playing?.

Tapping Paste song invokes the clipboard API directly in the trusted click stack; either its native result or a native paste event fulfills the same pending operation. Supported music validates and updates directly with the spinner covering read/lookup/save; unrelated clipboard content restores the normal bar with no metadata request/profile write. No URL input or extra confirmation. Outside dismissal and epoch/auth safeguards remain. Background/resume resets the neutral affordance; normal focus does not repeatedly reopen it. Permanent native clipboard denial still requires OS/browser permission or a supported user paste; it cannot be bypassed.

Tests: permission query throws (Safari-like), direct/pending native result/native paste event, unrelated text/invalid paste, zero automatic reads or writes, one save after valid Paste, outside dismissal. Existing provider/countdown tests assert compact labels and ticking; rich clipboard and shared-bar ownership suites pass. Chromium tests mock OS permission UI; native iOS is not claimed.

Pins site853/chat448/FM20/SW462; profile16 unchanged. Build/check/verify and preview/production evidence recorded in PR. Clear exact versioned CDN URLs after deployment succeeds, then verify their actual bodies (not diagnostic variants), per #103. Rollback by reverting the website PR. Grok: distinguish a neutral Paste action from a detected-song suggestion; do not require Permissions API support before offering a user-initiated read.
