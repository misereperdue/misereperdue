# Safari clipboard denial — #114

Agent Codex; branch codex/114-native-paste. User confirmed the exact message: Paste wasn't allowed. Device iPhone Safari, Apple Music song links. This is a denied Async Clipboard read, not a rejected provider URL. Site Permissions-Policy does not disable clipboard access. Reference: https://webkit.org/blog/10855/async-clipboard-api/ (user-initiated reading and native paste constraints).

## Change / Grok handoff

On NotAllowedError or SecurityError before a song has been read, or absent Clipboard API, replace only the clipboard action text with a native contenteditable paste target inside the same topbar. It is styled as the existing copy, not a URL form. Instruction: Touch and hold here, then choose Paste. inputmode=none avoids requesting a typing keyboard; it is not automatically focused after denial. The checkmark focuses this target without looping the denied Async Clipboard call. Actual pasted data goes through existing strict provider parsing, metadata lookup, save, profile sync and progress state. No additional URL-entry or confirmation phase.

Prevent default DOM insertion for clipboard-phase pastes and ordinary typing, so pasted HTML is parsed as data and never inserted. Pasting into unrelated text inputs retains existing behavior. Outside dismissal, auth guards and shop/product exclusions remain. Replaced music-note mark with a clipboard/paste icon.

## Validation

- build chat/site; check; verify; diff --check
- native-access suite, including forced readText rejection followed by a REAL browser clipboard write and Control+V into the native target; lookup/save exactly once with no further read API call. Accounts/API responses remain mocked. Exact user Apple Music URL is covered.
- topbar ownership/layout/progress/scope regression suite
- deployed preview repeats native-access suite

This validates a real Chromium clipboard paste event, not iPhone Safari's native touch-and-hold menu. Do not describe it as real-device Safari verification. The fallback depends on a user choosing native Paste; a website cannot override Safari's clipboard denial.

Frontend only; Worker319 unchanged. Pins chat451/site855/SW465. After production deployment succeeds, target-purge and verify exact pinned assets. Rollback: revert this frontend PR. No data or config migrations.
