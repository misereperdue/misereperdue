# Native editing paste repair — #116

Agent Codex; codex/116-paste-input. User's latest specific symptom: Pasting does nothing on iPhone Safari.

## Reproduced gap

Previous fallback cancels every beforeinput and intercepts empty ClipboardEvents. It only saves when data is available in the paste event itself. New native-beforeinput test fails against the previous build (no save, timed out after 2.5s) before implementation changes. This reproduces an unsupported delivery path, not the user's physical OS event trace.

The native target also contained the visible instruction as editable text, so a default insertion could mix the link into the label. It now starts empty with a CSS placeholder.

## Implementation / Grok handoff

- Keep the existing native Paste topbar, paste icon, shop/product exclusions and permission-denial behavior.
- Native target uses contenteditable=plaintext-only. Its label is a CSS placeholder, not editable content.
- beforeinput resolves a supported URL from dataTransfer or data when present. Otherwise leave native insertion enabled.
- input reads the resulting plaintext and immediately performs lookup/save. Unsupported data clears back to the placeholder with a visible message; no HTML insertion or separate URL form.
- An empty paste event into the native target no longer blocks browser editing; recognized paste events still save directly.
- Guard detached/busy editor events to prevent stale or duplicate saves and status changes.

## Evidence

- Old native-beforeinput regression fails before the code change.
- Chromium: existing native-access cases and added beforeinput/dataTransfer/input/empty-event editing paths; actual clipboard write + Control+V after forced denied read remains covered.
- WebKit: same new editing-path cases, plus trusted browser-generated editing events via execCommand insertText, including iPhone13 emulation (touch/mobile/user agent). Both synthetic delivery variants and trusted editing integration are explicitly distinguished.
- topbar regression; build chat/site, check, verify, diff --check.

WebKit required user-local Debian runtime libraries in /tmp/mp-webkit-libs because system packages/sudo were unavailable. The user-owned browser launcher includes that library path; no repository dependency or production configuration changes. Its dependency preflight was bypassed after actual launch succeeded with those libraries. This is Linux WebKit with mobile emulation, NOT a physical iPhone Safari OS menu test. Do not claim real-device verification or certainty about the user's actual event sequence.

Frontend only, Worker319 unchanged. Pins chat452/site856/SW466. Verify preview, then after successful production deploy target-purge and byte-check exact pinned assets. Rollback: revert this frontend PR. No data migrations.
