# Clipboard completion and outside dismissal — #103

Agent: Codex. Branch `codex/103-clipboard-completion`.

The previous implementation accepted only a bare URL from readText/text/plain. Shared text, HTML-only clipboard links and URL-list paste payloads could be rejected and show the old copy-link error. The reader now prefers ClipboardItem formats (URI list, plain text, HTML), with legacy readText fallback when the rich API is absent/unsupported. It extracts bounded supported URLs from share text/HTML, decodes entities without creating HTML DOM, canonicalizes full provider track links and supports mobile SoundCloud URLs. Rich data size/item limits and strict provider/track checks remain. No arbitrary metadata hosts are fetched.

Both native clipboard read and paste-event paths feed the same single update operation; no URL input or additional confirmation is rendered. The existing Update your now playing? / checkmark UI stays. Unrelated/unsupported clipboard content still produces a truthful error, not a manual URL phase. Native OS clipboard permissions still apply; a real iPhone reproduction requires the user's exact clipboard payload/device. An optional request for the copied app/link was sent while implementation proceeded.

Pointer-down outside the bubble dismisses it, lets the original tap continue, aborts pending reads/lookups and suppresses reappearance in the same foreground visit. Epoch/auth guards prevent an aborted lookup from writing later. Escape uses the same path. A profile POST already accepted by the server cannot be undone by hiding its UI.

Validation: focused rich-payload suite covers share text, HTML (empty plain text), URI lists, mobile SoundCloud, HTML native paste, actual Chromium ClipboardItem write/read, outside dismissal and outside cancellation during delayed metadata lookup. All complete at most one mocked profile save; no form or extra tap. Actual test clipboard is seeded before reading and cleared afterward; no preexisting clipboard data read. Existing all-provider/permission/native-Paste/countdown tests pass. Native iOS permission UI is not claimed from Chromium.

Pins chat445/SW459; site851/FM18/profile15 unchanged. Worker unchanged at319. Build/check/verify, hosted preview and production hashes recorded in PR. Rollback: revert website PR. Grok: preserve rich clipboard support and stale-request/outside-dismiss guards.
